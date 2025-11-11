import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { prisma } from '../../../shared/db';
import { FlightStatus } from '@prisma/client';

// Helper function to get CORS headers
// When allowCredentials is true, we must return the exact origin (not wildcard)
const CLOUDFRONT_ORIGIN = 'https://db62n67tl6hkc.cloudfront.net';

function getCorsHeaders(event: APIGatewayProxyEvent) {
  // Get origin from request headers, validate against allowed origins
  const requestOrigin = event.headers.Origin || event.headers.origin;
  // Use CloudFront origin (must match API Gateway CORS config)
  const allowedOrigin = requestOrigin === CLOUDFRONT_ORIGIN ? requestOrigin : CLOUDFRONT_ORIGIN;
  
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const {
      schoolId,
      studentId,
      instructorId,
      aircraftId,
      scheduledStart,
      scheduledEnd,
      departureAirport,
    } = body;

    // Validate required fields
    if (
      !schoolId ||
      !studentId ||
      !instructorId ||
      !aircraftId ||
      !scheduledStart ||
      !scheduledEnd ||
      !departureAirport
    ) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
          error: 'Missing required fields',
          required: [
            'schoolId',
            'studentId',
            'instructorId',
            'aircraftId',
            'scheduledStart',
            'scheduledEnd',
            'departureAirport',
          ],
        }),
      };
    }

    // Validate dates
    const startDate = new Date(scheduledStart);
    const endDate = new Date(scheduledEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ error: 'Invalid date format' }),
      };
    }

    if (endDate <= startDate) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
          error: 'scheduledEnd must be after scheduledStart',
        }),
      };
    }

    // Verify related entities exist
    const [school, student, instructor, aircraft] = await Promise.all([
      prisma.school.findUnique({ where: { id: schoolId } }),
      prisma.student.findUnique({ where: { id: studentId } }),
      prisma.instructor.findUnique({ where: { id: instructorId } }),
      prisma.aircraft.findUnique({ where: { id: aircraftId } }),
    ]);

    if (!school || !student || !instructor || !aircraft) {
      return {
        statusCode: 404,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
          error: 'One or more related entities not found',
        }),
      };
    }

    // Create flight
    const flight = await prisma.flight.create({
      data: {
        schoolId,
        studentId,
        instructorId,
        aircraftId,
        scheduledStart: startDate,
        scheduledEnd: endDate,
        departureAirport,
        status: FlightStatus.SCHEDULED,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        aircraft: {
          select: {
            id: true,
            tailNumber: true,
            model: true,
          },
        },
        school: {
          select: {
            id: true,
            name: true,
            airportCode: true,
          },
        },
      },
    });

    return {
      statusCode: 201,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        message: 'Flight created successfully',
        flight,
      }),
    };
  } catch (error) {
    console.error('Error creating flight:', error);
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

