'use client';

import { format } from 'date-fns';
import { Flight } from '@/lib/api-client';

interface FlightDetailsModalProps {
  flight: Flight;
  onClose: () => void;
}

export default function FlightDetailsModal({ flight, onClose }: FlightDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-aviation-cloud-900">Flight Details</h2>
            <button
              onClick={onClose}
              className="text-aviation-cloud-500 hover:text-aviation-cloud-700 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Flight Information */}
            <div>
              <h3 className="text-lg font-semibold text-aviation-cloud-900 mb-3">Flight Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-aviation-cloud-700">Date & Time</p>
                  <p className="text-aviation-cloud-900">
                    {format(new Date(flight.scheduledStart), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-aviation-cloud-600 text-sm">
                    {format(new Date(flight.scheduledStart), 'h:mm a')} - {format(new Date(flight.scheduledEnd), 'h:mm a')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-aviation-cloud-700">Status</p>
                  <p className="text-aviation-cloud-900">{flight.status.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-aviation-cloud-700">Departure Airport</p>
                  <p className="text-aviation-cloud-900">{flight.departureAirport}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-aviation-cloud-700">Flight ID</p>
                  <p className="text-aviation-cloud-900 font-mono text-sm">{flight.id}</p>
                </div>
              </div>
            </div>

            {/* Student Information */}
            {flight.student && (
              <div>
                <h3 className="text-lg font-semibold text-aviation-cloud-900 mb-3">Student</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-aviation-cloud-700">Name</p>
                    <p className="text-aviation-cloud-900">
                      {flight.student.firstName} {flight.student.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-aviation-cloud-700">Email</p>
                    <p className="text-aviation-cloud-900">{flight.student.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-aviation-cloud-700">Training Level</p>
                    <p className="text-aviation-cloud-900">{flight.student.trainingLevel.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Instructor Information */}
            {flight.instructor && (
              <div>
                <h3 className="text-lg font-semibold text-aviation-cloud-900 mb-3">Instructor</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-aviation-cloud-700">Name</p>
                    <p className="text-aviation-cloud-900">
                      {flight.instructor.firstName} {flight.instructor.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-aviation-cloud-700">Email</p>
                    <p className="text-aviation-cloud-900">{flight.instructor.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Aircraft Information */}
            {flight.aircraft && (
              <div>
                <h3 className="text-lg font-semibold text-aviation-cloud-900 mb-3">Aircraft</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-aviation-cloud-700">Model</p>
                    <p className="text-aviation-cloud-900">{flight.aircraft.model}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-aviation-cloud-700">Tail Number</p>
                    <p className="text-aviation-cloud-900">{flight.aircraft.tailNumber}</p>
                  </div>
                </div>
              </div>
            )}

            {/* School Information */}
            {flight.school && (
              <div>
                <h3 className="text-lg font-semibold text-aviation-cloud-900 mb-3">School</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-aviation-cloud-700">Name</p>
                    <p className="text-aviation-cloud-900">{flight.school.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-aviation-cloud-700">Airport Code</p>
                    <p className="text-aviation-cloud-900">{flight.school.airportCode}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Weather Checks */}
            {flight.weatherChecks && flight.weatherChecks.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-aviation-cloud-900 mb-3">Weather Checks</h3>
                <div className="space-y-2">
                  {flight.weatherChecks.map((check) => (
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

