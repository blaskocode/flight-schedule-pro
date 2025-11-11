'use client';

import { getIdToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  console.warn('NEXT_PUBLIC_API_URL is not set');
}

interface ApiError {
  error: string;
  message?: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('API URL not configured');
  }

  let token: string;
  try {
    token = await getIdToken();
  } catch (error) {
    throw new Error('Not authenticated. Please sign in.');
  }

  // Normalize URL: remove trailing slash from base URL and ensure endpoint starts with /
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;
  
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch (error) {
    // Network error (CORS, connection failed, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server. Please check your connection and try again.');
    }
    throw error;
  }

  if (!response.ok) {
    // Check for CORS errors specifically
    if (response.status === 0 || (response.status >= 200 && response.status < 300 && !response.headers.get('content-type'))) {
      throw new Error('CORS error: The server is not allowing requests from this origin. Please contact support.');
    }

    let errorMessage = `API error: ${response.statusText}`;
    try {
      const errorData: ApiError = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // If response is not JSON, use status text
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    return data;
  }
  return {} as T;
}

// Flight types
export interface Flight {
  id: string;
  schoolId: string;
  studentId: string;
  instructorId: string;
  aircraftId: string;
  scheduledStart: string;
  scheduledEnd: string;
  departureAirport: string;
  status: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    trainingLevel: string;
  };
  instructor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  aircraft?: {
    id: string;
    tailNumber: string;
    model: string;
  };
  school?: {
    id: string;
    name: string;
    airportCode: string;
  };
  weatherChecks?: Array<{
    id: string;
    result: string;
    checkTime: string;
    visibility: number;
    ceiling: number | null;
    windSpeed: number;
    conditions: string;
  }>;
  rescheduleRequests?: Array<{
    id: string;
    status: string;
  }>;
}

export interface FlightsResponse {
  flights: Flight[];
  count: number;
}

export interface CreateFlightData {
  schoolId: string;
  studentId: string;
  instructorId: string;
  aircraftId: string;
  scheduledStart: string;
  scheduledEnd: string;
  departureAirport: string;
}

export interface WeatherCheckResponse {
  weather: {
    visibility: number;
    ceiling: number | null;
    windSpeed: number;
    conditions: string;
  };
  safety: {
    safe: boolean;
    reasons: string[];
    minimums: {
      visibility: number;
      ceiling: number;
      maxWind: number;
    };
  };
  weatherCheck: {
    id: string;
    result: string;
    checkTime: string;
  };
  flightStatus: string;
}

export interface RescheduleSuggestion {
  slot: string;
  priority: number;
  reasoning: string;
  weatherForecast: string;
  confidence: string;
}

export interface RescheduleRequest {
  id: string;
  suggestions: RescheduleSuggestion[];
  status: string;
  expiresAt: string;
}

export interface GenerateRescheduleResponse {
  message: string;
  rescheduleRequest: RescheduleRequest;
}

export interface SelectRescheduleData {
  rescheduleRequestId: string;
  selectedOption: number;
}

export interface ApproveRescheduleData {
  rescheduleRequestId: string;
  approved: boolean;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  trainingLevel: string;
  totalHours: number;
}

export interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Aircraft {
  id: string;
  tailNumber: string;
  model: string;
}

export interface School {
  id: string;
  name: string;
  airportCode: string;
  timezone: string;
}

export interface WeatherBriefing {
  flight: {
    id: string;
    scheduledStart: string;
    departureAirport: string;
    student: {
      name: string;
      trainingLevel: string;
    };
  };
  currentWeather: {
    visibility: number;
    ceiling: number | null;
    windSpeed: number;
    conditions: string;
    provider: string;
  };
  safety: {
    safe: boolean;
    reasons: string[];
    minimums: {
      visibility: number;
      ceiling: number;
      maxWind: number;
    };
  };
  historicalChecks: Array<{
    id: string;
    checkTime: string;
    result: string;
    visibility: number;
    ceiling: number | null;
    windSpeed: number;
    conditions: string;
  }>;
}

export const api = {
  // Flights
  async getFlights(params?: {
    studentId?: string;
    instructorId?: string;
    status?: string;
  }): Promise<FlightsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.studentId) queryParams.append('studentId', params.studentId);
    if (params?.instructorId) queryParams.append('instructorId', params.instructorId);
    if (params?.status) queryParams.append('status', params.status);

    const queryString = queryParams.toString();
    const endpoint = `/flights${queryString ? `?${queryString}` : ''}`;
    return apiRequest<FlightsResponse>(endpoint, { method: 'GET' });
  },

  async createFlight(data: CreateFlightData): Promise<{ message: string; flight: Flight }> {
    return apiRequest<{ message: string; flight: Flight }>('/flights', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Weather
  async checkWeather(flightId: string): Promise<WeatherCheckResponse> {
    return apiRequest<WeatherCheckResponse>('/weather/check', {
      method: 'POST',
      body: JSON.stringify({ flightId }),
    });
  },

  // Reschedule
  async generateRescheduleOptions(flightId: string): Promise<GenerateRescheduleResponse> {
    return apiRequest<GenerateRescheduleResponse>('/reschedule/generate', {
      method: 'POST',
      body: JSON.stringify({ flightId }),
    });
  },

  async selectRescheduleOption(
    data: SelectRescheduleData
  ): Promise<{ message: string; request: RescheduleRequest }> {
    return apiRequest<{ message: string; request: RescheduleRequest }>('/reschedule/select', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async approveReschedule(
    data: ApproveRescheduleData
  ): Promise<{ message: string; newFlight?: Flight }> {
    return apiRequest<{ message: string; newFlight?: Flight }>('/reschedule/approve', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Resource lists
  async getStudents(): Promise<{ students: Student[]; count: number }> {
    return apiRequest<{ students: Student[]; count: number }>('/students', { method: 'GET' });
  },

  async getInstructors(): Promise<{ instructors: Instructor[]; count: number }> {
    return apiRequest<{ instructors: Instructor[]; count: number }>('/instructors', { method: 'GET' });
  },

  async getAircraft(): Promise<{ aircraft: Aircraft[]; count: number }> {
    return apiRequest<{ aircraft: Aircraft[]; count: number }>('/aircraft', { method: 'GET' });
  },

  async getSchools(): Promise<{ schools: School[]; count: number }> {
    return apiRequest<{ schools: School[]; count: number }>('/schools', { method: 'GET' });
  },

  // Weather
  async getWeatherForecast(airport: string): Promise<{ airport: string; forecast: any }> {
    return apiRequest<{ airport: string; forecast: any }>(`/weather/forecast/${airport}`, {
      method: 'GET',
    });
  },

  async getWeatherBriefing(flightId: string): Promise<WeatherBriefing> {
    return apiRequest<WeatherBriefing>(`/weather/briefing/${flightId}`, { method: 'GET' });
  },
};

