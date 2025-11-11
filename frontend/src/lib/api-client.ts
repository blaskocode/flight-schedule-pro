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
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
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
    return response.json();
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
};

