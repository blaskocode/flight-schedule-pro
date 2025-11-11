import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { prisma } from '../../../shared/db';
import { sendEmail } from '../../../shared/email/ses-client';
import { confirmationEmail } from '../../../shared/email/templates';
import { FlightStatus } from '@prisma/client';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { rescheduleRequestId, approved } = body;

    if (!rescheduleRequestId || approved === undefined) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'rescheduleRequestId and approved required' }),
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
            school: true,
          },
        },
      },
    });

    if (!request) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Reschedule request not found' }),
      };
    }

    if (!approved) {
      // Instructor rejected
      await prisma.rescheduleRequest.update({
        where: { id: rescheduleRequestId },
        data: {
          status: 'REJECTED',
          instructorConfirmedAt: new Date(),
        },
      });

      // Notify student
      await sendEmail({
        to: [request.flight.student.email],
        subject: 'Reschedule Time Not Available',
        htmlBody: `<p>Unfortunately, your selected time is no longer available. Please select another option from the original email.</p>`,
        textBody: 'Your selected time is no longer available. Please select another option.',
      });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Reschedule rejected' }),
      };
    }

    // Instructor approved - Create new flight
    const suggestions = request.suggestions as any[];
    const selectedSlot = suggestions[request.selectedOption!];
    const newStartTime = new Date(selectedSlot.slot);
    const duration = request.flight.scheduledEnd.getTime() - request.flight.scheduledStart.getTime();
    const newEndTime = new Date(newStartTime.getTime() + duration);

    // Transaction: Create new flight, update old flight, update request
    const result = await prisma.$transaction(async (tx) => {
      // Create new flight
      const newFlight = await tx.flight.create({
        data: {
          schoolId: request.flight.schoolId,
          studentId: request.flight.studentId,
          instructorId: request.flight.instructorId,
          aircraftId: request.flight.aircraftId,
          scheduledStart: newStartTime,
          scheduledEnd: newEndTime,
          departureAirport: request.flight.departureAirport,
          status: FlightStatus.SCHEDULED,
        },
      });

      // Update old flight status
      await tx.flight.update({
        where: { id: request.flightId },
        data: { status: FlightStatus.RESCHEDULED },
      });

      // Update reschedule request
      await tx.rescheduleRequest.update({
        where: { id: rescheduleRequestId },
        data: {
          status: 'ACCEPTED',
          instructorConfirmedAt: new Date(),
          newFlightId: newFlight.id,
        },
      });

      return newFlight;
    });

    // Send confirmation emails to both parties
    const studentEmailData = confirmationEmail({
      recipientName: `${request.flight.student.firstName} ${request.flight.student.lastName}`,
      isStudent: true,
      newFlightDate: newStartTime,
      instructor: `${request.flight.instructor.firstName} ${request.flight.instructor.lastName}`,
      student: `${request.flight.student.firstName} ${request.flight.student.lastName}`,
      aircraft: `${request.flight.aircraft.model} (${request.flight.aircraft.tailNumber})`,
      departureAirport: request.flight.departureAirport,
    });

    const instructorEmailData = confirmationEmail({
      recipientName: `${request.flight.instructor.firstName} ${request.flight.instructor.lastName}`,
      isStudent: false,
      newFlightDate: newStartTime,
      instructor: `${request.flight.instructor.firstName} ${request.flight.instructor.lastName}`,
      student: `${request.flight.student.firstName} ${request.flight.student.lastName}`,
      aircraft: `${request.flight.aircraft.model} (${request.flight.aircraft.tailNumber})`,
      departureAirport: request.flight.departureAirport,
    });

    await Promise.all([
      sendEmail({
        to: [request.flight.student.email],
        ...studentEmailData,
      }),
      sendEmail({
        to: [request.flight.instructor.email],
        ...instructorEmailData,
      }),
    ]);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Flight rescheduled successfully',
        newFlight: result,
      }),
    };
  } catch (error) {
    console.error('Error approving reschedule:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

