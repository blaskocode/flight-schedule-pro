'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import AuthGuard from '@/components/auth/AuthGuard';
import { api, Flight, Student, Instructor, Aircraft, School } from '@/lib/api-client';
import { signOut } from '@/lib/auth';
import FlightDetailsModal from '@/components/flights/FlightDetailsModal';
import WeatherBriefingModal from '@/components/flights/WeatherBriefingModal';

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
  const [showBookFlight, setShowBookFlight] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [showFlightDetails, setShowFlightDetails] = useState(false);
  const [showWeatherBriefing, setShowWeatherBriefing] = useState(false);

  useEffect(() => {
    loadFlights();
  }, []);

  async function loadFlights() {
    try {
      setLoading(true);
      setError('');
      const response = await api.getFlights();
      // Handle empty flights array gracefully - this is not an error
      setFlights(response.flights || []);
    } catch (err: any) {
      // Only show error if it's not an empty result
      const errorMessage = err.message || 'Failed to load flights';
      // Check if it's a network/CORS error vs. a real API error
      if (errorMessage.includes('Network error') || errorMessage.includes('CORS error')) {
        setError(errorMessage);
      } else {
        // For other errors, still show them but allow empty state to show if flights array is empty
        setError(errorMessage);
        setFlights([]); // Set empty array so empty state can show
      }
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
          <div className="flex gap-2">
            <button
              onClick={() => setShowBookFlight(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
            >
              + Book Flight
            </button>
            <button
              onClick={loadFlights}
              className="px-4 py-2 bg-aviation-sky-600 text-white rounded-md hover:bg-aviation-sky-700 text-sm font-medium"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Active Weather Alerts Section */}
        {flights.length > 0 && (() => {
          const unsafeFlights = flights.filter(flight => {
            const latestCheck = flight.weatherChecks?.[0];
            return latestCheck && latestCheck.result === 'UNSAFE' && flight.status === 'SCHEDULED';
          });
          
          if (unsafeFlights.length > 0) {
            return (
              <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🔴</span>
                  <h3 className="text-xl font-bold text-red-900">Active Weather Alerts</h3>
                </div>
                <div className="space-y-3">
                  {unsafeFlights.map((flight) => {
                    const latestCheck = flight.weatherChecks?.[0];
                    return (
                      <div key={flight.id} className="bg-white rounded-lg p-4 border border-red-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-red-900 mb-1">
                              {format(new Date(flight.scheduledStart), 'EEEE, MMMM d, yyyy \'at\' h:mm a')} - High Risk
                            </p>
                            {latestCheck && (
                              <div className="text-sm text-red-700 space-y-1">
                                {latestCheck.visibility < 10 && (
                                  <p>⛅ Visibility: {latestCheck.visibility} SM (Required: 10 SM)</p>
                                )}
                                {latestCheck.windSpeed > 15 && (
                                  <p>💨 Winds: {latestCheck.windSpeed}kt (Limit: 15kt)</p>
                                )}
                                {latestCheck.ceiling && latestCheck.ceiling < 3000 && (
                                  <p>☁️ Ceiling: {latestCheck.ceiling} ft (Required: 3000 ft)</p>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              const requestId = flight.rescheduleRequests?.[0]?.id;
                              if (requestId) {
                                router.push(`/reschedule/${requestId}`);
                              } else {
                                // Generate reschedule options
                                api.generateRescheduleOptions(flight.id)
                                  .then(() => {
                                    alert('Reschedule options generated! Check your email or refresh the page.');
                                    loadFlights();
                                  })
                                  .catch((err: any) => {
                                    alert(err.message || 'Failed to generate reschedule options');
                                  });
                              }
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium whitespace-nowrap"
                          >
                            {flight.rescheduleRequests && flight.rescheduleRequests.length > 0
                              ? 'View Reschedule Options →'
                              : 'Generate Reschedule Options →'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          return null;
        })()}

        {error && (
          <div className="mb-4 rounded bg-red-50 border border-red-200 p-4 text-red-800">
            {error}
          </div>
        )}

        {flights.length === 0 && !error ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">✈️</div>
              <h3 className="text-xl font-semibold text-aviation-cloud-900 mb-2">No flights booked yet!</h3>
              <p className="text-aviation-cloud-600">
                Once you have scheduled flights, they will appear here.
              </p>
            </div>
          </div>
        ) : flights.length === 0 && error ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-aviation-cloud-900 mb-2">Unable to load flights</h3>
              <p className="text-aviation-cloud-600 mb-4">{error}</p>
              <button
                onClick={loadFlights}
                className="px-4 py-2 bg-aviation-sky-600 text-white rounded-md hover:bg-aviation-sky-700 text-sm font-medium"
              >
                Try Again
              </button>
            </div>
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedFlight(flight);
                          setShowFlightDetails(true);
                        }}
                        className="px-3 py-2 bg-aviation-cloud-600 text-white rounded-md hover:bg-aviation-cloud-700 text-sm font-medium"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFlight(flight);
                          setShowWeatherBriefing(true);
                        }}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        Weather Briefing
                      </button>
                      <button
                        onClick={() => handleCheckWeather(flight.id)}
                        disabled={checkingWeather === flight.id}
                        className="px-3 py-2 bg-aviation-sky-600 text-white rounded-md hover:bg-aviation-sky-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {checkingWeather === flight.id ? 'Checking...' : 'Check Weather'}
                      </button>
                    </div>
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

        {/* Book Flight Modal */}
        {showBookFlight && (
          <BookFlightModal
            onClose={() => setShowBookFlight(false)}
            onSuccess={() => {
              setShowBookFlight(false);
              loadFlights();
            }}
          />
        )}

        {/* Flight Details Modal */}
        {showFlightDetails && selectedFlight && (
          <FlightDetailsModal
            flight={selectedFlight}
            onClose={() => {
              setShowFlightDetails(false);
              setSelectedFlight(null);
            }}
          />
        )}

        {/* Weather Briefing Modal */}
        {showWeatherBriefing && selectedFlight && (
          <WeatherBriefingModal
            flightId={selectedFlight.id}
            onClose={() => {
              setShowWeatherBriefing(false);
              setSelectedFlight(null);
            }}
          />
        )}
      </main>
    </div>
  );
}

// Book Flight Modal Component
function BookFlightModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    schoolId: '',
    studentId: '',
    instructorId: '',
    aircraftId: '',
    scheduledStart: '',
    scheduledEnd: '',
    departureAirport: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);

  useEffect(() => {
    loadResources();
  }, []);

  async function loadResources() {
    try {
      setLoadingResources(true);
      const [studentsRes, instructorsRes, aircraftRes, schoolsRes] = await Promise.all([
        api.getStudents(),
        api.getInstructors(),
        api.getAircraft(),
        api.getSchools(),
      ]);
      setStudents(studentsRes.students);
      setInstructors(instructorsRes.instructors);
      setAircraft(aircraftRes.aircraft);
      setSchools(schoolsRes.schools);
    } catch (err: any) {
      console.error('Error loading resources:', err);
    } finally {
      setLoadingResources(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.schoolId || !formData.studentId || !formData.instructorId || 
          !formData.aircraftId || !formData.scheduledStart || !formData.scheduledEnd || 
          !formData.departureAirport) {
        throw new Error('All fields are required');
      }

      // Validate dates
      const startDate = new Date(formData.scheduledStart);
      const endDate = new Date(formData.scheduledEnd);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }
      if (endDate <= startDate) {
        throw new Error('End time must be after start time');
      }

      await api.createFlight({
        ...formData,
        scheduledStart: startDate.toISOString(),
        scheduledEnd: endDate.toISOString(),
      });

      alert('Flight booked successfully!');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to book flight');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-aviation-cloud-900">Book New Flight</h2>
            <button
              onClick={onClose}
              className="text-aviation-cloud-500 hover:text-aviation-cloud-700 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded bg-red-50 border border-red-200 p-3 text-red-800">
              {error}
            </div>
          )}

          {loadingResources ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-aviation-sky-600 border-r-transparent"></div>
              <p className="mt-4 text-aviation-cloud-600">Loading resources...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-aviation-cloud-700 mb-1">
                  School <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.schoolId}
                  onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                  className="w-full px-3 py-2 border border-aviation-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-aviation-sky-500"
                  required
                >
                  <option value="">Select a school</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name} ({school.airportCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-aviation-cloud-700 mb-1">
                  Student <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-aviation-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-aviation-sky-500"
                  required
                >
                  <option value="">Select a student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} ({student.trainingLevel.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-aviation-cloud-700 mb-1">
                  Instructor <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.instructorId}
                  onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
                  className="w-full px-3 py-2 border border-aviation-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-aviation-sky-500"
                  required
                >
                  <option value="">Select an instructor</option>
                  {instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.firstName} {instructor.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-aviation-cloud-700 mb-1">
                  Aircraft <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.aircraftId}
                  onChange={(e) => setFormData({ ...formData, aircraftId: e.target.value })}
                  className="w-full px-3 py-2 border border-aviation-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-aviation-sky-500"
                  required
                >
                  <option value="">Select an aircraft</option>
                  {aircraft.map((ac) => (
                    <option key={ac.id} value={ac.id}>
                      {ac.model} ({ac.tailNumber})
                    </option>
                  ))}
                </select>
              </div>

            <div>
              <label className="block text-sm font-medium text-aviation-cloud-700 mb-1">
                Departure Airport <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.departureAirport}
                onChange={(e) => setFormData({ ...formData, departureAirport: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-aviation-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-aviation-sky-500"
                placeholder="e.g., KAUS"
                required
                maxLength={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-aviation-cloud-700 mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledStart}
                  onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                  className="w-full px-3 py-2 border border-aviation-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-aviation-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-aviation-cloud-700 mb-1">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledEnd}
                  onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                  className="w-full px-3 py-2 border border-aviation-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-aviation-sky-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-aviation-cloud-300 text-aviation-cloud-700 rounded-md hover:bg-aviation-cloud-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-aviation-sky-600 text-white rounded-md hover:bg-aviation-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Booking...' : 'Book Flight'}
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}

