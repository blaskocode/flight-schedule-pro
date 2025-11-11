import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getPrismaClient } from '../../../shared/db';
import { sendEmail } from '../../../shared/email/ses-client';
import { getCorsHeaders } from '../../../shared/cors';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const prisma = await getPrismaClient();
    const body = JSON.parse(event.body || '{}');
    const { rescheduleRequestId, selectedOption } = body;

    if (!rescheduleRequestId || selectedOption === undefined) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ error: 'rescheduleRequestId and selectedOption required' }),
      };
    }

    // Validate option is 0, 1, or 2
    if (selectedOption < 0 || selectedOption > 2) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ error: 'selectedOption must be 0, 1, or 2' }),
      };
    }

    // Get reschedule request
    const request = await prisma.rescheduleRequest.findUnique({
      where: { id: rescheduleRequestId },
      include: {
        flight: {
          include: {
            student: true,
            instructor: true,
            aircraft: true,
          },
        },
      },
    });

    if (!request) {
      return {
        statusCode: 404,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ error: 'Reschedule request not found' }),
      };
    }

    // Check if expired
    if (new Date() > request.expiresAt) {
      await prisma.rescheduleRequest.update({
        where: { id: rescheduleRequestId },
        data: { status: 'EXPIRED' },
      });
      
      return {
        statusCode: 400,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ error: 'Reschedule request has expired' }),
      };
    }

    // Update request with student selection
    const updatedRequest = await prisma.rescheduleRequest.update({
      where: { id: rescheduleRequestId },
      data: {
        selectedOption,
        studentConfirmedAt: new Date(),
        status: 'PENDING_INSTRUCTOR',
      },
    });

    // Send email to instructor
    const suggestions = request.suggestions as any[];
    const selectedSlot = suggestions[selectedOption];

    await sendEmail({
      to: [request.flight.instructor.email],
      subject: `Flight Reschedule - Awaiting Your Approval`,
      htmlBody: `
        <h2>Student Selected Reschedule Time</h2>
        <p>${request.flight.student.firstName} ${request.flight.student.lastName} has selected a new time for their cancelled flight.</p>
        <div style="background: #f0fdf4; padding: 20px; margin: 20px 0;">
          <strong>Selected Time:</strong><br/>
          ${new Date(selectedSlot.slot).toLocaleString()}<br/><br/>
          <strong>Reason:</strong> ${selectedSlot.reasoning}
        </div>
        <p><a href="https://app.flightschedulepro.com/approve/${rescheduleRequestId}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none;">Approve This Time</a></p>
      `,
      textBody: `
Student Selected Reschedule Time

${request.flight.student.firstName} ${request.flight.student.lastName} has selected: ${new Date(selectedSlot.slot).toLocaleString()}

Approve at: https://app.flightschedulepro.com/approve/${rescheduleRequestId}
      `,
    });

    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        message: 'Selection recorded. Instructor notified.',
        request: updatedRequest,
      }),
    };
  } catch (error) {
    console.error('Error selecting option:', error);
    return {
      statusCode: 500,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

