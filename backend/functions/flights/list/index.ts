import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { prisma } from '../../../shared/db';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get query parameters
    const queryParams = event.queryStringParameters || {};
    const studentId = queryParams.studentId;
    const instructorId = queryParams.instructorId;
    const status = queryParams.status;

    // Build where clause
    const where: any = {};
    if (studentId) {
      where.studentId = studentId;
    }
    if (instructorId) {
      where.instructorId = instructorId;
    }
    if (status) {
      where.status = status;
    }

    // Query flights
    const flights = await prisma.flight.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            trainingLevel: true,
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
        weatherChecks: {
          take: 1,
          orderBy: { checkTime: 'desc' },
          select: {
            id: true,
            result: true,
            checkTime: true,
            visibility: true,
            ceiling: true,
            windSpeed: true,
            conditions: true,
          },
        },
        rescheduleRequests: {
          where: {
            status: {
              in: ['PENDING_STUDENT', 'PENDING_INSTRUCTOR'],
            },
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: {
        scheduledStart: 'asc',
      },
      take: 100, // Limit results
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        flights,
        count: flights.length,
      }),
    };
  } catch (error) {
    console.error('Error listing flights:', error);
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

