import { TrainingLevel } from '@prisma/client';
import { WeatherData, WeatherSafetyResult } from './types';

export function getWeatherMinimums(trainingLevel: TrainingLevel): {
  visibility: number;
  ceiling: number;
  maxWind: number;
} {
  switch (trainingLevel) {
    case 'EARLY_STUDENT': // 0-20 hours
      return {
        visibility: 10, // statute miles
        ceiling: 3000, // feet AGL
        maxWind: 10, // knots
      };
    case 'PRIVATE_PILOT': // Licensed VFR
      return {
        visibility: 3,
        ceiling: 1000,
        maxWind: 15,
      };
    case 'INSTRUMENT_RATED': // Licensed IFR
      return {
        visibility: 0, // IMC acceptable
        ceiling: 0,
        maxWind: 25,
      };
  }
}

export function checkWeatherSafety(
  weather: WeatherData,
  trainingLevel: TrainingLevel
): WeatherSafetyResult {
  const minimums = getWeatherMinimums(trainingLevel);
  const reasons: string[] = [];

  // Check visibility
  if (weather.visibility < minimums.visibility) {
    reasons.push(
      `Visibility ${weather.visibility}SM below ${minimums.visibility}SM minimum`
    );
  }

  // Check ceiling (only if there is a ceiling requirement and we have ceiling data)
  if (minimums.ceiling > 0 && weather.ceiling !== null) {
    if (weather.ceiling < minimums.ceiling) {
      reasons.push(
        `Ceiling ${weather.ceiling}ft below ${minimums.ceiling}ft minimum`
      );
    }
  }

  // Check wind speed
  if (weather.windSpeed > minimums.maxWind) {
    reasons.push(
      `Wind ${weather.windSpeed}kt exceeds ${minimums.maxWind}kt maximum`
    );
  }

  return {
    safe: reasons.length === 0,
    reasons,
    minimums,
  };
}

