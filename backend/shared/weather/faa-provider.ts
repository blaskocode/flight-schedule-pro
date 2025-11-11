import { WeatherProvider, WeatherData } from './types';
import { parseMETAR } from 'metar-taf-parser';

export class FAAProvider implements WeatherProvider {
  async getCurrentWeather(airportCode: string): Promise<WeatherData> {
    try {
      // FAA Aviation Weather METAR endpoint
      const url = `https://aviationweather.gov/cgi-bin/data/metar.php?ids=${airportCode}&format=raw`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`FAA Aviation Weather error: ${response.status} ${response.statusText}`);
      }

      const rawMetar = await response.text().then(text => text.trim());

      if (!rawMetar || rawMetar.includes('No data')) {
        throw new Error(`No METAR data available for ${airportCode}`);
      }

      // Parse METAR string
      const parsed = parseMETAR(rawMetar);

      // Convert METAR to our format
      // Visibility: METAR provides in meters or statute miles
      let visibility = 10; // Default
      if (parsed.visibility) {
        if (parsed.visibility.unit === 'SM') {
          visibility = parsed.visibility.value;
        } else if (parsed.visibility.unit === 'M') {
          // Convert meters to statute miles
          visibility = parsed.visibility.value * 0.000621371;
        }
      }

      // Ceiling: First cloud layer that is broken (BKN) or overcast (OVC) below 3000ft
      let ceiling: number | null = null;
      if (parsed.clouds && parsed.clouds.length > 0) {
        for (const cloud of parsed.clouds) {
          if ((cloud.code === 'BKN' || cloud.code === 'OVC') && cloud.altitude) {
            ceiling = cloud.altitude;
            break;
          }
        }
      }

      // Wind speed: Convert from m/s to knots if needed
      let windSpeed = 0;
      if (parsed.wind) {
        windSpeed = parsed.wind.speed || 0;
        // If unit is m/s, convert to knots
        if (parsed.wind.unit === 'MPS') {
          windSpeed = windSpeed * 1.94384;
        }
        windSpeed = Math.round(windSpeed);
      }

      // Conditions: Weather phenomena
      let conditions = 'Clear';
      if (parsed.weather && parsed.weather.length > 0) {
        conditions = parsed.weather.map(w => w.description || w.code).join(', ');
      }

      return {
        visibility,
        ceiling,
        windSpeed,
        conditions,
        rawData: rawMetar,
      };
    } catch (error) {
      throw new Error(`FAA Aviation Weather fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

