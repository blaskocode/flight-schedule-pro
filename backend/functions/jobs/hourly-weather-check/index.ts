import { EventBridgeEvent } from 'aws-lambda';
import { PrismaClient, FlightStatus, WeatherSafety } from '@prisma/client';
import { prisma } from '../../../shared/db';
import { getWeatherProvider, checkWeatherSafety } from '../../../shared/weather';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { rescheduleResponseSchema, buildReschedulePrompt } from '../../../shared/ai';
import { RescheduleContext } from '../../../shared/ai/types';
import { sendEmail, weatherCancellationEmail, rescheduleOptionsEmail } from '../../../shared/email';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export const handler = async (
  event: EventBridgeEvent<'Scheduled Event', {}>
): Promise<void> => {
  console.log('Hourly weather check job started');

  try {
    // Get current time and 24 hours from now
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Query all scheduled flights in the next 24 hours
    const upcomingFlights = await prisma.flight.findMany({
      where: {
        status: FlightStatus.SCHEDULED,
        scheduledStart: {
          gte: now,
          lte: next24Hours,
        },
      },
      include: {
        student: true,
        instructor: true,
        aircraft: true,
        school: true,
      },
    });

    console.log(`Found ${upcomingFlights.length} flights to check`);

    // Get weather provider configuration
    const weatherProviderType = process.env.WEATHER_PROVIDER || 'weatherapi';
    
    // Fetch API keys from Secrets Manager
    const secretsClient = new SecretsManagerClient({});
    let weatherApiKey: string | undefined;
    let openaiApiKey: string | undefined;

    if (process.env.WEATHER_API_SECRET_ARN) {
      const weatherSecret = await secretsClient.send(
        new GetSecretValueCommand({ SecretId: process.env.WEATHER_API_SECRET_ARN })
      );
      const weatherSecretData = JSON.parse(weatherSecret.SecretString || '{}');
      weatherApiKey = weatherSecretData.apiKey;
    }

    if (process.env.OPENAI_SECRET_ARN) {
      const openaiSecret = await secretsClient.send(
        new GetSecretValueCommand({ SecretId: process.env.OPENAI_SECRET_ARN })
      );
      const openaiSecretData = JSON.parse(openaiSecret.SecretString || '{}');
      openaiApiKey = openaiSecretData.apiKey;
    }

    if (!openaiApiKey) {
      console.error('OpenAI API key not configured');
      return;
    }

    // Process each flight
    for (const flight of upcomingFlights) {
      try {
        console.log(`Checking weather for flight ${flight.id}`);

        // Get weather provider
        const weatherProvider = getWeatherProvider(weatherProviderType, weatherApiKey);

        // Fetch current weather
        let weather;
        let provider = weatherProviderType;
        try {
          weather = await weatherProvider.getCurrentWeather(flight.departureAirport);
        } catch (error) {
          // Fallback to FAA if WeatherAPI fails
          if (weatherProviderType === 'weatherapi') {
            console.warn(`WeatherAPI failed for ${flight.departureAirport}, falling back to FAA:`, error);
            const faaProvider = getWeatherProvider('faa');
            weather = await faaProvider.getCurrentWeather(flight.departureAirport);
            provider = 'faa';
          } else {
            throw error;
          }
        }

        // Check safety
        const safetyResult = checkWeatherSafety(weather, flight.student.trainingLevel);

        // Save weather check
        await prisma.weatherCheck.create({
          data: {
            flightId: flight.id,
            location: flight.departureAirport,
            visibility: weather.visibility,
            ceiling: weather.ceiling,
            windSpeed: weather.windSpeed,
            conditions: weather.conditions,
            result: safetyResult.safe ? WeatherSafety.SAFE : WeatherSafety.UNSAFE,
            reasons: safetyResult.reasons,
            provider,
            studentTrainingLevel: flight.student.trainingLevel,
            requiredVisibility: safetyResult.minimums.visibility,
            requiredCeiling: safetyResult.minimums.ceiling,
            maxWindSpeed: safetyResult.minimums.maxWind,
          },
        });

        // If unsafe, cancel flight and trigger AI reschedule
        if (!safetyResult.safe) {
          console.log(`Flight ${flight.id} is unsafe, cancelling and generating reschedule options`);

          // Update flight status
          await prisma.flight.update({
            where: { id: flight.id },
            data: { status: FlightStatus.WEATHER_CANCELLED },
          });

          // Send cancellation email
          const cancellationEmailData = weatherCancellationEmail({
            studentName: `${flight.student.firstName} ${flight.student.lastName}`,
            flightDate: flight.scheduledStart,
            instructor: `${flight.instructor.firstName} ${flight.instructor.lastName}`,
            aircraft: `${flight.aircraft.model} (${flight.aircraft.tailNumber})`,
            reasons: safetyResult.reasons,
            departureAirport: flight.departureAirport,
          });

          await sendEmail({
            to: [flight.student.email],
            ...cancellationEmailData,
          });

          // Generate AI reschedule options
          const rescheduleRequestId = await generateRescheduleOptions(flight, safetyResult.reasons, openaiApiKey);
          
          if (rescheduleRequestId) {
            // Send reschedule options email
            const rescheduleRequest = await prisma.rescheduleRequest.findUnique({
              where: { id: rescheduleRequestId },
            });
            
            if (rescheduleRequest) {
              const optionsEmailData = rescheduleOptionsEmail({
                studentName: `${flight.student.firstName} ${flight.student.lastName}`,
                originalFlightDate: flight.scheduledStart,
                suggestions: rescheduleRequest.suggestions as any,
                rescheduleRequestId: rescheduleRequest.id,
                expiresAt: rescheduleRequest.expiresAt,
              });

              await sendEmail({
                to: [flight.student.email],
                ...optionsEmailData,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error processing flight ${flight.id}:`, error);
        // Continue with next flight
      }
    }

    console.log('Hourly weather check job completed');
  } catch (error) {
    console.error('Error in hourly weather check job:', error);
    throw error;
  }
};

async function generateRescheduleOptions(
  flight: any,
  weatherReasons: string[],
  openaiApiKey: string
): Promise<string | null> {
  try {
    // Format availability
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

    // Build context
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
        weatherReason: `Weather conditions: ${weatherReasons.join(', ')}`,
        departureAirport: flight.departureAirport,
      },
      constraints: {
        studentAvailability: formatAvailability(flight.student.availability),
        instructorAvailability: formatAvailability(flight.instructor.availability),
        aircraftAvailability: ['Available during school hours'],
      },
      school: {
        timezone: flight.school.timezone,
        airportCode: flight.school.airportCode,
      },
    };

    // Generate options
    const prompt = buildReschedulePrompt(context);
    const { object } = await generateObject({
      model: openai('gpt-4', {
        apiKey: openaiApiKey,
      }),
      schema: rescheduleResponseSchema,
      prompt,
    });

    // Create reschedule request
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const rescheduleRequest = await prisma.rescheduleRequest.create({
      data: {
        flightId: flight.id,
        studentId: flight.studentId,
        suggestions: object.suggestions,
        status: 'PENDING_STUDENT',
        expiresAt,
      },
    });

    console.log(`Generated reschedule options for flight ${flight.id}`);
    return rescheduleRequest.id;
  } catch (error) {
    console.error(`Error generating reschedule options for flight ${flight.id}:`, error);
    // Don't throw - we don't want to fail the entire job
    return null;
  }
}

