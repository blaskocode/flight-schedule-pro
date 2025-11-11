'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import AuthGuard from '@/components/auth/AuthGuard';
import { api, Flight } from '@/lib/api-client';
import { signOut } from '@/lib/auth';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const router = useRouter();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingWeather, setCheckingWeather] = useState<string | null>(null);

  useEffect(() => {
    loadFlights();
  }, []);

  async function loadFlights() {
    try {
      setLoading(true);
      const response = await api.getFlights();
      setFlights(response.flights);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load flights');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckWeather(flightId: string) {
    try {
      setCheckingWeather(flightId);
      await api.checkWeather(flightId);
      // Reload flights to get updated weather status
      await loadFlights();
    } catch (err: any) {
      alert(err.message || 'Failed to check weather');
    } finally {
      setCheckingWeather(null);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-green-100 text-green-800';
      case 'WEATHER_CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'RESCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getWeatherBadge = (result: string) => {
    if (result === 'SAFE') {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">✓ SAFE</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">⚠ UNSAFE</span>;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-aviation-sky-600 border-r-transparent"></div>
          <p className="mt-4 text-aviation-cloud-600">Loading flights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-aviation-cloud-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-aviation-cloud-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-aviation-sky-700">Flight Schedule Pro</h1>
              <p className="text-sm text-aviation-cloud-600">AI-Powered Weather Monitoring</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-aviation-cloud-700 hover:text-aviation-cloud-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-aviation-cloud-900">My Flights</h2>
          <button
            onClick={loadFlights}
            className="px-4 py-2 bg-aviation-sky-600 text-white rounded-md hover:bg-aviation-sky-700 text-sm font-medium"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-50 border border-red-200 p-4 text-red-800">
            {error}
          </div>
        )}

        {flights.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-aviation-cloud-600">No flights found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {flights.map((flight) => {
              const latestWeatherCheck = flight.weatherChecks?.[0];
              const hasRescheduleRequest = flight.rescheduleRequests && flight.rescheduleRequests.length > 0;

              return (
                <div
                  key={flight.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-aviation-cloud-900">
                          {format(new Date(flight.scheduledStart), 'EEEE, MMMM d, yyyy')}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(flight.status)}`}>
                          {flight.status.replace('_', ' ')}
                        </span>
                        {latestWeatherCheck && getWeatherBadge(latestWeatherCheck.result)}
                      </div>
                      <p className="text-lg text-aviation-cloud-700">
                        🕐 {format(new Date(flight.scheduledStart), 'h:mm a')} - {format(new Date(flight.scheduledEnd), 'h:mm a')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCheckWeather(flight.id)}
                      disabled={checkingWeather === flight.id}
                      className="px-4 py-2 bg-aviation-sky-600 text-white rounded-md hover:bg-aviation-sky-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {checkingWeather === flight.id ? 'Checking...' : 'Check Weather'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-semibold text-aviation-cloud-700 mb-1">Student</p>
                      <p className="text-aviation-cloud-900">
                        {flight.student?.firstName} {flight.student?.lastName}
                      </p>
                      <p className="text-xs text-aviation-cloud-500">
                        {flight.student?.trainingLevel?.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-aviation-cloud-700 mb-1">Instructor</p>
                      <p className="text-aviation-cloud-900">
                        {flight.instructor?.firstName} {flight.instructor?.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-aviation-cloud-700 mb-1">Aircraft</p>
                      <p className="text-aviation-cloud-900">
                        {flight.aircraft?.model} ({flight.aircraft?.tailNumber})
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-aviation-cloud-700 mb-1">Departure</p>
                      <p className="text-aviation-cloud-900">{flight.departureAirport}</p>
                    </div>
                  </div>

                  {latestWeatherCheck && (
                    <div className="mt-4 p-4 bg-aviation-cloud-50 rounded-lg">
                      <p className="text-sm font-semibold text-aviation-cloud-700 mb-2">
                        Latest Weather Check ({format(new Date(latestWeatherCheck.checkTime), 'MMM d, h:mm a')})
                      </p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-aviation-cloud-600">Visibility:</span>{' '}
                          <span className="font-semibold">{latestWeatherCheck.visibility} SM</span>
                        </div>
                        <div>
                          <span className="text-aviation-cloud-600">Ceiling:</span>{' '}
                          <span className="font-semibold">
                            {latestWeatherCheck.ceiling ? `${latestWeatherCheck.ceiling} ft` : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-aviation-cloud-600">Wind:</span>{' '}
                          <span className="font-semibold">{latestWeatherCheck.windSpeed} kt</span>
                        </div>
                        <div className="col-span-3">
                          <span className="text-aviation-cloud-600">Conditions:</span>{' '}
                          <span className="font-semibold">{latestWeatherCheck.conditions}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {hasRescheduleRequest && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm font-semibold text-yellow-800 mb-1">
                        Reschedule Request Pending
                      </p>
                      <p className="text-xs text-yellow-700">
                        {flight.rescheduleRequests?.[0]?.status?.replace('_', ' ')}
                      </p>
                    </div>
                  )}

                  {flight.status === 'WEATHER_CANCELLED' && !hasRescheduleRequest && (
                    <div className="mt-4">
                      <button
                        onClick={async () => {
                          try {
                            const response = await api.generateRescheduleOptions(flight.id);
                            alert('Reschedule options generated! Check your email or refresh the page.');
                            await loadFlights();
                          } catch (err: any) {
                            alert(err.message || 'Failed to generate reschedule options');
                          }
                        }}
                        className="px-4 py-2 bg-aviation-sky-600 text-white rounded-md hover:bg-aviation-sky-700 text-sm font-medium"
                      >
                        Generate Reschedule Options
                      </button>
                    </div>
                  )}

                  {hasRescheduleRequest && (
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          const requestId = flight.rescheduleRequests?.[0]?.id;
                          if (requestId) {
                            router.push(`/reschedule/${requestId}`);
                          }
                        }}
                        className="px-4 py-2 bg-aviation-sky-600 text-white rounded-md hover:bg-aviation-sky-700 text-sm font-medium"
                      >
                        View Reschedule Options
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

