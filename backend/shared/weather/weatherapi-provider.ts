import { WeatherProvider, WeatherData } from './types';

export class WeatherAPIProvider implements WeatherProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getCurrentWeather(airportCode: string): Promise<WeatherData> {
    try {
      // WeatherAPI.com uses airport code directly
      const url = `https://api.weatherapi.com/v1/current.json?key=${this.apiKey}&q=${airportCode}&aqi=no`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`WeatherAPI.com error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Convert WeatherAPI.com response to our format
      const visibility = data.current.vis_miles || 10; // Default to 10 if missing
      
      // Calculate ceiling from cloud base (if available)
      let ceiling: number | null = null;
      if (data.current.cloud && data.current.cloud > 0) {
        // WeatherAPI doesn't provide exact ceiling, estimate from cloud cover
        // For MVP, we'll use a conservative estimate
        ceiling = data.current.cloud * 100; // Rough estimate
      }

      // Wind speed in knots (WeatherAPI provides in mph, convert)
      const windSpeed = data.current.wind_mph ? Math.round(data.current.wind_mph * 0.868976) : 0;

      // Conditions description
      const conditions = data.current.condition?.text || 'Clear';

      return {
        visibility,
        ceiling,
        windSpeed,
        conditions,
        rawData: JSON.stringify(data),
      };
    } catch (error) {
      throw new Error(`WeatherAPI.com fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

