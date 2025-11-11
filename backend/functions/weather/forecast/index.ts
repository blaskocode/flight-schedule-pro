import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getPrismaClient } from '../../../shared/db';
import { getWeatherProvider } from '../../../shared/weather';
import { getCorsHeaders } from '../../../shared/cors';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const prisma = await getPrismaClient();
    const airport = event.pathParameters?.airport;
    
    if (!airport) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ error: 'Airport code is required' }),
      };
    }

    // Get weather provider (default to weatherapi)
    const weatherApiKey = process.env.WEATHER_API_KEY;
    const provider = getWeatherProvider('weatherapi', weatherApiKey);

    // Get forecast (next 3 days)
    let forecast;
    try {
      // Note: This assumes the weather provider has a getForecast method
      // If not available, we'll use current weather as fallback
      if ('getForecast' in provider && typeof provider.getForecast === 'function') {
        forecast = await provider.getForecast(airport);
      } else {
        // Fallback: get current weather
        const current = await provider.getCurrentWeather(airport);
        forecast = {
          current,
          forecast: [current], // Single day forecast
        };
      }
    } catch (error) {
      console.error('Error fetching forecast:', error);
      return {
        statusCode: 500,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
          error: 'Failed to fetch weather forecast',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      };
    }

    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        airport,
        forecast,
      }),
    };
  } catch (error) {
    console.error('Error getting weather forecast:', error);
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

