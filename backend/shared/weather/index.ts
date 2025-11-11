// Weather utilities exports
export * from './types';
export * from './safety';
export * from './weatherapi-provider';
export * from './faa-provider';

import { WeatherProvider } from './types';
import { WeatherAPIProvider } from './weatherapi-provider';
import { FAAProvider } from './faa-provider';

/**
 * Get weather provider based on environment configuration
 */
export function getWeatherProvider(providerType: string, apiKey?: string): WeatherProvider {
  switch (providerType.toLowerCase()) {
    case 'faa':
      return new FAAProvider();
    case 'weatherapi':
    default:
      if (!apiKey) {
        throw new Error('WeatherAPI.com requires an API key');
      }
      return new WeatherAPIProvider(apiKey);
  }
}

