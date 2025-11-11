import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../../shared/db';
import { rescheduleResponseSchema, buildReschedulePrompt } from '../../../shared/ai';
import { RescheduleContext } from '../../../shared/ai/types';
import { format, addDays } from 'date-fns';
import { getCorsHeaders } from '../../../shared/cors';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const prisma = await getPrismaClient();
    const body = JSON.parse(event.body || '{}');
    const { flightId } = body;

    if (!flightId) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ error: 'flightId is required' }),
      };
    }

    // Get OpenAI API key from Secrets Manager
    const openaiSecretArn = process.env.OPENAI_SECRET_ARN;
    if (!openaiSecretArn) {
      return {
        statusCode: 500,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ error: 'OpenAI secret ARN not configured' }),
      };
    }

    const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
    const secretsClient = new SecretsManagerClient({});
    const secretResponse = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: openaiSecretArn })
    );
    const secret = JSON.parse(secretResponse.SecretString || '{}');
    const openaiApiKey = secret.apiKey;
    
    if (!openaiApiKey) {
      return {
        statusCode: 500,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ error: 'OpenAI API key not found in secret' }),
      };
    }

    // Get flight with all related data
    const flight = await prisma.flight.findUnique({
      where: { id: flightId },
      include: {
        student: true,
        instructor: true,
        aircraft: true,
        school: true,
      },
    });

    if (!flight) {
      return {
        statusCode: 404,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ error: 'Flight not found' }),
      };
    }

    // Get the most recent weather check for cancellation reason
    const latestWeatherCheck = await prisma.weatherCheck.findFirst({
      where: { flightId: flight.id },
      orderBy: { checkTime: 'desc' },
    });

    const weatherReason = latestWeatherCheck
      ? `Weather conditions: ${latestWeatherCheck.reasons.join(', ')}`
      : 'Weather conditions unsafe';

    // Build availability strings from JSON
    const formatAvailability = (availability: any): string[] => {
      if (!availability || typeof availability !== 'object') {
        return [];
      }
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const result: string[] = [];
      for (const day of days) {
        if (availability[day] && Array.isArray(availability[day])) {
          const dayName = day.charAt(0).toUpperCase() + day.slice(1);
          availability[day].forEach((slot: string) => {
            result.push(`${dayName} ${slot}`);
          });
        }
      }
      return result;
    };

    // Build reschedule context
    const context: RescheduleContext = {
      canceledFlight: {
        id: flight.id,
        student: {
          name: `${flight.student.firstName} ${flight.student.lastName}`,
          trainingLevel: flight.student.trainingLevel,
          totalHours: flight.student.totalHours,
        },
        instructor: {
          name: `${flight.instructor.firstName} ${flight.instructor.lastName}`,
        },
        aircraft: {
          tailNumber: flight.aircraft.tailNumber,
          model: flight.aircraft.model,
        },
        originalTime: flight.scheduledStart.toISOString(),
        weatherReason,
        departureAirport: flight.departureAirport,
      },
      constraints: {
        studentAvailability: formatAvailability(flight.student.availability),
        instructorAvailability: formatAvailability(flight.instructor.availability),
        aircraftAvailability: ['Available during school hours'], // Simplified for MVP
      },
      school: {
        timezone: flight.school.timezone,
        airportCode: flight.school.airportCode,
      },
    };

    // Build prompt
    const prompt = buildReschedulePrompt(context);

    // Generate reschedule options using Vercel AI SDK
    const { object } = await generateObject({
      model: openai('gpt-4', {
        apiKey: openaiApiKey,
      }),
      schema: rescheduleResponseSchema,
      prompt,
    });

    // Create reschedule request in database
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours expiration

    const rescheduleRequest = await prisma.rescheduleRequest.create({
      data: {
        flightId: flight.id,
        studentId: flight.studentId,
        suggestions: object.suggestions,
        status: 'PENDING_STUDENT',
        expiresAt,
      },
    });

    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        message: 'Reschedule options generated successfully',
        rescheduleRequest: {
          id: rescheduleRequest.id,
          suggestions: object.suggestions,
          status: rescheduleRequest.status,
          expiresAt: rescheduleRequest.expiresAt,
        },
      }),
    };
  } catch (error) {
    console.error('Error generating reschedule options:', error);
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

