import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PrismaClient, WeatherSafety } from '@prisma/client';
import { getWeatherProvider, checkWeatherSafety } from '../../../shared/weather';
import { prisma } from '../../../shared/db';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { flightId } = body;

    if (!flightId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
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
      },
    });

    if (!flight) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
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

    // Save weather check to database
    const weatherCheck = await prisma.weatherCheck.create({
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

    // If unsafe, update flight status
    if (!safetyResult.safe) {
      await prisma.flight.update({
        where: { id: flightId },
        data: { status: 'WEATHER_CANCELLED' },
      });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        weather: {
          visibility: weather.visibility,
          ceiling: weather.ceiling,
          windSpeed: weather.windSpeed,
          conditions: weather.conditions,
        },
        safety: {
          safe: safetyResult.safe,
          reasons: safetyResult.reasons,
          minimums: safetyResult.minimums,
        },
        weatherCheck: {
          id: weatherCheck.id,
          result: weatherCheck.result,
          checkTime: weatherCheck.checkTime,
        },
        flightStatus: !safetyResult.safe ? 'WEATHER_CANCELLED' : flight.status,
      }),
    };
  } catch (error) {
    console.error('Error checking weather:', error);
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

