'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { api, WeatherBriefing } from '@/lib/api-client';

interface WeatherBriefingModalProps {
  flightId: string;
  onClose: () => void;
}

export default function WeatherBriefingModal({ flightId, onClose }: WeatherBriefingModalProps) {
  const [briefing, setBriefing] = useState<WeatherBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBriefing();
  }, [flightId]);

  async function loadBriefing() {
    try {
      setLoading(true);
      setError('');
      const data = await api.getWeatherBriefing(flightId);
      setBriefing(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load weather briefing');
    } finally {
      setLoading(false);
    }
  }

  const getTrainingLevelMinimums = (level: string) => {
    switch (level) {
      case 'EARLY_STUDENT':
        return { visibility: 10, ceiling: 3000, maxWind: 10 };
      case 'PRIVATE_PILOT':
        return { visibility: 3, ceiling: 1000, maxWind: 15 };
      case 'INSTRUMENT_RATED':
        return { visibility: 0, ceiling: 0, maxWind: 25 };
      default:
        return { visibility: 10, ceiling: 3000, maxWind: 10 };
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-aviation-cloud-900">Weather Briefing</h2>
            <button
              onClick={onClose}
              className="text-aviation-cloud-500 hover:text-aviation-cloud-700 text-2xl"
            >
              ×
            </button>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-aviation-sky-600 border-r-transparent"></div>
              <p className="mt-4 text-aviation-cloud-600">Loading weather briefing...</p>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded bg-red-50 border border-red-200 p-3 text-red-800">
              {error}
            </div>
          )}

          {briefing && !loading && (
            <div className="space-y-6">
              {/* Flight Information */}
              <div>
                <h3 className="text-lg font-semibold text-aviation-cloud-900 mb-3">Flight Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-aviation-cloud-700">Scheduled Time</p>
                    <p className="text-aviation-cloud-900">
                      {format(new Date(briefing.flight.scheduledStart), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-aviation-cloud-700">Departure Airport</p>
                    <p className="text-aviation-cloud-900">{briefing.flight.departureAirport}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-aviation-cloud-700">Student</p>
                    <p className="text-aviation-cloud-900">{briefing.flight.student.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-aviation-cloud-700">Training Level</p>
                    <p className="text-aviation-cloud-900">{briefing.flight.student.trainingLevel.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>

              {/* Current Weather */}
              <div>
                <h3 className="text-lg font-semibold text-aviation-cloud-900 mb-3">Current Weather Conditions</h3>
                <div className="p-4 bg-aviation-cloud-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-aviation-cloud-700">Visibility</p>
                      <p className="text-aviation-cloud-900 text-lg font-semibold">
                        {briefing.currentWeather.visibility} SM
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-aviation-cloud-700">Ceiling</p>
                      <p className="text-aviation-cloud-900 text-lg font-semibold">
                        {briefing.currentWeather.ceiling ? `${briefing.currentWeather.ceiling} ft` : 'Unlimited'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-aviation-cloud-700">Wind Speed</p>
                      <p className="text-aviation-cloud-900 text-lg font-semibold">
                        {briefing.currentWeather.windSpeed} kt
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-aviation-cloud-700">Conditions</p>
                      <p className="text-aviation-cloud-900 text-lg font-semibold">
                        {briefing.currentWeather.conditions}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-aviation-cloud-700">Provider</p>
                      <p className="text-aviation-cloud-900">{briefing.currentWeather.provider.toUpperCase()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Safety Assessment */}
              <div>
                <h3 className="text-lg font-semibold text-aviation-cloud-900 mb-3">Safety Assessment</h3>
                <div className={`p-4 rounded-lg ${
                  briefing.safety.safe ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-2xl ${briefing.safety.safe ? 'text-green-600' : 'text-red-600'}`}>
                      {briefing.safety.safe ? '✓' : '⚠'}
                    </span>
                    <span className={`text-lg font-semibold ${
                      briefing.safety.safe ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {briefing.safety.safe ? 'SAFE TO FLY' : 'UNSAFE - DO NOT FLY'}
                    </span>
                  </div>
                  {briefing.safety.reasons.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Reasons:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {briefing.safety.reasons.map((reason, idx) => (
                          <li key={idx} className="text-sm">{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Training Level Minimums */}
              <div>
                <h3 className="text-lg font-semibold text-aviation-cloud-900 mb-3">Training Level Minimums</h3>
                <div className="p-4 bg-aviation-cloud-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-aviation-cloud-700">Visibility Required</p>
                      <p className="text-aviation-cloud-900 font-semibold">
                        {briefing.safety.minimums.visibility} SM
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-aviation-cloud-700">Ceiling Required</p>
                      <p className="text-aviation-cloud-900 font-semibold">
                        {briefing.safety.minimums.ceiling > 0 ? `${briefing.safety.minimums.ceiling} ft` : 'No minimum'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-aviation-cloud-700">Max Wind Speed</p>
                      <p className="text-aviation-cloud-900 font-semibold">
                        {briefing.safety.minimums.maxWind} kt
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Historical Weather Checks */}
              {briefing.historicalChecks && briefing.historicalChecks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-aviation-cloud-900 mb-3">Historical Weather Checks</h3>
                  <div className="space-y-2">
                    {briefing.historicalChecks.map((check) => (
                      <div key={check.id} className="p-3 bg-aviation-cloud-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-aviation-cloud-700">
                              {format(new Date(check.checkTime), 'MMM d, yyyy h:mm a')}
                            </p>
                            <p className="text-sm text-aviation-cloud-600">
                              Visibility: {check.visibility} SM | Ceiling: {check.ceiling ? `${check.ceiling} ft` : 'N/A'} | Wind: {check.windSpeed} kt
                            </p>
                            <p className="text-sm text-aviation-cloud-600">Conditions: {check.conditions}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            check.result === 'SAFE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {check.result}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-aviation-sky-600 text-white rounded-md hover:bg-aviation-sky-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

