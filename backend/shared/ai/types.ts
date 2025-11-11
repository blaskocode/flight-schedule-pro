import { TrainingLevel } from '@prisma/client';

export interface RescheduleContext {
  canceledFlight: {
    id: string;
    student: {
      name: string;
      trainingLevel: TrainingLevel;
      totalHours: number;
    };
    instructor: {
      name: string;
    };
    aircraft: {
      tailNumber: string;
      model: string;
    };
    originalTime: string; // ISO 8601
    weatherReason: string;
    departureAirport: string;
  };
  constraints: {
    studentAvailability: string[]; // e.g., ["Mon 9am-5pm", "Wed 2pm-6pm"]
    instructorAvailability: string[];
    aircraftAvailability: string[];
  };
  school: {
    timezone: string;
    airportCode: string;
  };
}

export interface RescheduleSuggestion {
  slot: string; // ISO 8601 datetime
  priority: number; // 1, 2, or 3
  reasoning: string; // Clear explanation
  weatherForecast: string; // Brief forecast summary
  confidence: 'high' | 'medium' | 'low';
  instructorAvailable: boolean;
  aircraftAvailable: boolean;
}

export interface RescheduleResponse {
  suggestions: [RescheduleSuggestion, RescheduleSuggestion, RescheduleSuggestion]; // Exactly 3
}

