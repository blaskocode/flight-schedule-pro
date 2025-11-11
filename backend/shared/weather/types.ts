import { TrainingLevel } from '@prisma/client';

export interface WeatherData {
  visibility: number; // Statute miles
  ceiling: number | null; // Feet AGL (null if clear)
  windSpeed: number; // Knots
  conditions: string; // "Clear", "Rain", etc.
  rawData?: string; // Raw response from provider
}

export interface WeatherSafetyResult {
  safe: boolean;
  reasons: string[];
  minimums: {
    visibility: number;
    ceiling: number;
    maxWind: number;
  };
}

export interface WeatherProvider {
  getCurrentWeather(airportCode: string): Promise<WeatherData>;
}

