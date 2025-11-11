'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { api, RescheduleSuggestion } from '@/lib/api-client';

interface RescheduleRequest {
  id: string;
  suggestions: RescheduleSuggestion[];
  status: string;
  expiresAt: string;
  selectedOption?: number | null;
}

interface RescheduleOptionsCardProps {
  request: RescheduleRequest;
  onUpdate?: () => void;
}

export default function RescheduleOptionsCard({ request, onUpdate }: RescheduleOptionsCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    request.selectedOption ?? null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelect = async (index: number) => {
    if (request.status !== 'PENDING_STUDENT') {
      return; // Can't change selection
    }

    setLoading(true);
    setError('');

    try {
      await api.selectRescheduleOption({
        rescheduleRequestId: request.id,
        selectedOption: index,
      });
      setSelectedIndex(index);
      if (onUpdate) {
        onUpdate();
      }
      alert('Selection sent to instructor for approval!');
    } catch (err: any) {
      setError(err.message || 'Failed to select option');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors: { [key: string]: string } = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-blue-100 text-blue-800',
      low: 'bg-purple-100 text-purple-800',
    };
    return colors[confidence.toLowerCase()] || colors.medium;
  };

  const getPriorityColor = (priority: number) => {
    const colors: { [key: number]: string } = {
      1: 'border-green-500 bg-green-50',
      2: 'border-blue-500 bg-blue-50',
      3: 'border-purple-500 bg-purple-50',
    };
    return colors[priority] || colors[2];
  };

  const getStatusBadge = () => {
    const statusColors: { [key: string]: string } = {
      PENDING_STUDENT: 'bg-yellow-100 text-yellow-800',
      PENDING_INSTRUCTOR: 'bg-blue-100 text-blue-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      EXPIRED: 'bg-gray-100 text-gray-800',
    };
    return statusColors[request.status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-aviation-sky-700">
            🤖 AI Reschedule Options
          </h3>
          <p className="text-sm text-aviation-cloud-600">
            Select your preferred time slot
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge()}`}>
          {request.status.replace('_', ' ')}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {request.suggestions.map((suggestion, index) => (
          <div
            key={index}
            className={`border-2 rounded-lg p-4 ${getPriorityColor(suggestion.priority)} ${
              selectedIndex === index ? 'ring-2 ring-aviation-sky-500' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="font-bold text-lg">Option {index + 1}</span>
                <span className="ml-2 text-sm text-aviation-cloud-600">
                  Priority {suggestion.priority}
                </span>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getConfidenceBadge(suggestion.confidence)}`}>
                {suggestion.confidence.toUpperCase()} CONFIDENCE
              </span>
            </div>

            <div className="mb-3">
              <p className="text-2xl font-bold text-aviation-cloud-900">
                📅 {format(new Date(suggestion.slot), 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-xl text-aviation-cloud-700">
                🕐 {format(new Date(suggestion.slot), 'h:mm a')}
              </p>
            </div>

            <div className="mb-3">
              <p className="text-sm font-semibold text-aviation-cloud-700 mb-1">
                Why this works:
              </p>
              <p className="text-aviation-cloud-600">{suggestion.reasoning}</p>
            </div>

            <div className="mb-3">
              <p className="text-sm font-semibold text-aviation-cloud-700 mb-1">
                Weather Forecast:
              </p>
              <p className="text-aviation-cloud-600">{suggestion.weatherForecast}</p>
            </div>

            {request.status === 'PENDING_STUDENT' && (
              <button
                onClick={() => handleSelect(index)}
                disabled={loading}
                className={`w-full py-2 px-4 rounded font-semibold ${
                  selectedIndex === index
                    ? 'bg-aviation-sky-600 text-white'
                    : 'bg-white border-2 border-aviation-sky-600 text-aviation-sky-600 hover:bg-aviation-sky-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {selectedIndex === index ? '✓ Selected' : 'Select This Time'}
              </button>
            )}

            {selectedIndex === index && request.status === 'PENDING_INSTRUCTOR' && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                <p className="text-blue-800 text-sm">
                  ⏳ Waiting for instructor approval...
                </p>
              </div>
            )}

            {selectedIndex === index && request.status === 'ACCEPTED' && (
              <div className="bg-green-50 border border-green-200 p-3 rounded">
                <p className="text-green-800 text-sm font-semibold">
                  ✓ Approved! Flight rescheduled.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-800">
          ⏰ <strong>Expires:</strong> {format(new Date(request.expiresAt), 'MMMM d, yyyy \'at\' h:mm a')}
        </p>
      </div>
    </div>
  );
}

