import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getPrismaClient } from '../../../shared/db';
import { getWeatherProvider, checkWeatherSafety } from '../../../shared/weather';
import { getCorsHeaders } from '../../../shared/cors';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const prisma = await getPrismaClient();
    const flightId = event.pathParameters?.flightId;
    
    if (!flightId) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ error: 'flightId is required' }),
      };
    }

    // Get flight with related data
    const flight = await prisma.flight.findUnique({
      where: { id: flightId },
      include: {
        student: true,
        instructor: true,
        aircraft: true,
        school: true,
        weatherChecks: {
          orderBy: { checkTime: 'desc' },
          take: 5, // Last 5 checks
        },
      },
    });

    if (!flight) {
      return {
        statusCode: 404,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ error: 'Flight not found' }),
      };
    }

    // Get weather provider
    const providerType = flight.school.weatherProvider || process.env.WEATHER_PROVIDER || 'weatherapi';
    const weatherApiKey = process.env.WEATHER_API_KEY;
    const weatherProvider = getWeatherProvider(providerType, weatherApiKey);

    // Fetch current weather
    let weather;
    let provider = providerType;
    try {
      weather = await weatherProvider.getCurrentWeather(flight.departureAirport);
    } catch (error) {
      // Fallback to FAA if WeatherAPI fails
      if (providerType === 'weatherapi') {
        console.warn('WeatherAPI failed, falling back to FAA:', error);
        const faaProvider = getWeatherProvider('faa');
        weather = await faaProvider.getCurrentWeather(flight.departureAirport);
        provider = 'faa';
      } else {
        throw error;
      }
    }

    // Check safety based on student training level
    const safetyResult = checkWeatherSafety(weather, flight.student.trainingLevel);

    // Get training level minimums
    const getTrainingLevelMinimums = (level: string) => {
      switch (level) {
        case 'EARLY_STUDENT':
          return { visibility: 10, ceiling: 3000, maxWind: 10 };
        case 'PRIVATE_PILOT':
          return { visibility: 3, ceiling: 1000, maxWind: 15 };
        case 'INSTRUMENT_RATED':
          return { visibility: 0, ceiling: 0, maxWind: 25 };
        default:
          return { visibility: 10, ceiling: 3000, maxWind: 10 };
      }
    };

    const minimums = getTrainingLevelMinimums(flight.student.trainingLevel);

    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        flight: {
          id: flight.id,
          scheduledStart: flight.scheduledStart,
          departureAirport: flight.departureAirport,
          student: {
            name: `${flight.student.firstName} ${flight.student.lastName}`,
            trainingLevel: flight.student.trainingLevel,
          },
        },
        currentWeather: {
          visibility: weather.visibility,
          ceiling: weather.ceiling,
          windSpeed: weather.windSpeed,
          conditions: weather.conditions,
          provider,
        },
        safety: {
          safe: safetyResult.safe,
          reasons: safetyResult.reasons,
          minimums,
        },
        historicalChecks: flight.weatherChecks.map(check => ({
          id: check.id,
          checkTime: check.checkTime,
          result: check.result,
          visibility: check.visibility,
          ceiling: check.ceiling,
          windSpeed: check.windSpeed,
          conditions: check.conditions,
        })),
      }),
    };
  } catch (error) {
    console.error('Error getting weather briefing:', error);
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

