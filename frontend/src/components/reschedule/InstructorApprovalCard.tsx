'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { api, RescheduleSuggestion } from '@/lib/api-client';

interface RescheduleRequest {
  id: string;
  suggestions: RescheduleSuggestion[];
  status: string;
  selectedOption?: number | null;
  flightId: string;
}

interface InstructorApprovalCardProps {
  request: RescheduleRequest;
  onUpdate?: () => void;
}

export default function InstructorApprovalCard({ request, onUpdate }: InstructorApprovalCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApprove = async (approved: boolean) => {
    setLoading(true);
    setError('');

    try {
      await api.approveReschedule({
        rescheduleRequestId: request.id,
        approved,
      });
      if (onUpdate) {
        onUpdate();
      }
      if (approved) {
        alert('Reschedule approved! New flight created.');
      } else {
        alert('Reschedule rejected. Student will be notified.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process approval');
    } finally {
      setLoading(false);
    }
  };

  if (request.status !== 'PENDING_INSTRUCTOR' || request.selectedOption === null || request.selectedOption === undefined) {
    return null;
  }

  const selectedSuggestion = request.suggestions[request.selectedOption];

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-aviation-sky-700">
            ⏳ Pending Approval
          </h3>
          <p className="text-sm text-aviation-cloud-600">
            Student has selected a reschedule time
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          AWAITING YOUR APPROVAL
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="border-2 border-blue-500 bg-blue-50 rounded-lg p-4 mb-4">
        <div className="mb-3">
          <p className="text-2xl font-bold text-aviation-cloud-900">
            📅 {format(new Date(selectedSuggestion.slot), 'EEEE, MMMM d, yyyy')}
          </p>
          <p className="text-xl text-aviation-cloud-700">
            🕐 {format(new Date(selectedSuggestion.slot), 'h:mm a')}
          </p>
        </div>

        <div className="mb-3">
          <p className="text-sm font-semibold text-aviation-cloud-700 mb-1">
            AI Reasoning:
          </p>
          <p className="text-aviation-cloud-600">{selectedSuggestion.reasoning}</p>
        </div>

        <div className="mb-3">
          <p className="text-sm font-semibold text-aviation-cloud-700 mb-1">
            Weather Forecast:
          </p>
          <p className="text-aviation-cloud-600">{selectedSuggestion.weatherForecast}</p>
        </div>

        <div className="mb-3">
          <p className="text-sm font-semibold text-aviation-cloud-700 mb-1">
            Confidence:
          </p>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            selectedSuggestion.confidence.toLowerCase() === 'high' ? 'bg-green-100 text-green-800' :
            selectedSuggestion.confidence.toLowerCase() === 'medium' ? 'bg-blue-100 text-blue-800' :
            'bg-purple-100 text-purple-800'
          }`}>
            {selectedSuggestion.confidence.toUpperCase()} CONFIDENCE
          </span>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => handleApprove(true)}
          disabled={loading}
          className="flex-1 py-3 px-4 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✓ Approve
        </button>
        <button
          onClick={() => handleApprove(false)}
          disabled={loading}
          className="flex-1 py-3 px-4 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✗ Reject
        </button>
      </div>
    </div>
  );
}

