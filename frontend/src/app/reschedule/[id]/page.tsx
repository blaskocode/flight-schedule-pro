'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth/AuthGuard';
import RescheduleOptionsCard from '@/components/reschedule/RescheduleOptionsCard';
import InstructorApprovalCard from '@/components/reschedule/InstructorApprovalCard';
import { api } from '@/lib/api-client';
import { signOut } from '@/lib/auth';

interface RescheduleRequest {
  id: string;
  suggestions: Array<{
    slot: string;
    priority: number;
    reasoning: string;
    weatherForecast: string;
    confidence: string;
  }>;
  status: string;
  expiresAt: string;
  selectedOption?: number | null;
  flightId: string;
}

export default function ReschedulePage() {
  return (
    <AuthGuard>
      <RescheduleContent />
    </AuthGuard>
  );
}

function RescheduleContent() {
  const params = useParams();
  const router = useRouter();
  const rescheduleRequestId = params.id as string;

  const [request, setRequest] = useState<RescheduleRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (rescheduleRequestId) {
      loadRequest();
    }
  }, [rescheduleRequestId]);

  async function loadRequest() {
    try {
      setLoading(true);
      // Fetch all flights to find the one with this reschedule request
      const flightsResponse = await api.getFlights();
      const flight = flightsResponse.flights.find(
        (f) => f.rescheduleRequests?.some((r: any) => r.id === rescheduleRequestId)
      );

      if (!flight || !flight.rescheduleRequests || flight.rescheduleRequests.length === 0) {
        setError('Reschedule request not found');
        return;
      }

      // The reschedule request data structure from the API
      // Note: In production, we'd have a dedicated GET endpoint for reschedule requests
      // For now, we'll need to reconstruct from what we have
      const rescheduleRequestData = flight.rescheduleRequests[0] as any;
      
      // If we have suggestions in the response, use them; otherwise we'll need to fetch
      // For MVP, we'll show a message if data is incomplete
      setRequest({
        id: rescheduleRequestId,
        suggestions: rescheduleRequestData.suggestions || [],
        status: rescheduleRequestData.status || 'PENDING_STUDENT',
        expiresAt: rescheduleRequestData.expiresAt || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        selectedOption: rescheduleRequestData.selectedOption ?? null,
        flightId: flight.id,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load reschedule request');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-aviation-sky-600 border-r-transparent"></div>
          <p className="mt-4 text-aviation-cloud-600">Loading reschedule options...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-aviation-cloud-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-aviation-sky-700 mb-4">Error</h2>
          <p className="text-aviation-cloud-600 mb-4">{error || 'Reschedule request not found'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-aviation-sky-600 text-white rounded-md hover:bg-aviation-sky-700"
          >
            Back to Dashboard
          </button>
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
              <h1 className="text-2xl font-bold text-aviation-sky-700">Reschedule Options</h1>
              <p className="text-sm text-aviation-cloud-600">AI-generated rescheduling suggestions</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-sm font-medium text-aviation-cloud-700 hover:text-aviation-cloud-900"
              >
                Dashboard
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-aviation-cloud-700 hover:text-aviation-cloud-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RescheduleOptionsCard
          request={request}
          onUpdate={loadRequest}
        />
        <InstructorApprovalCard
          request={request}
          onUpdate={loadRequest}
        />
      </main>
    </div>
  );
}

