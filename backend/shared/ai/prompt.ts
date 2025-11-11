import { RescheduleContext } from './types';
import { format } from 'date-fns';

/**
 * Build detailed prompt for AI reschedule generation
 */
export function buildReschedulePrompt(context: RescheduleContext): string {
  const { canceledFlight, constraints, school } = context;

  return `You are an expert flight scheduling assistant for a flight training school. A flight lesson has been cancelled due to unsafe weather conditions, and you need to suggest exactly 3 optimal reschedule times.

CANCELLED FLIGHT DETAILS:
- Student: ${canceledFlight.student.name} (${canceledFlight.student.trainingLevel}, ${canceledFlight.student.totalHours} total hours)
- Instructor: ${canceledFlight.instructor.name}
- Aircraft: ${canceledFlight.aircraft.model} (${canceledFlight.aircraft.tailNumber})
- Original Time: ${format(new Date(canceledFlight.originalTime), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
- Departure Airport: ${canceledFlight.departureAirport} (${school.airportCode})
- Weather Reason: ${canceledFlight.weatherReason}
- School Timezone: ${school.timezone}

AVAILABILITY CONSTRAINTS:
Student Available:
${constraints.studentAvailability.map((slot) => `  - ${slot}`).join('\n')}

Instructor Available:
${constraints.instructorAvailability.map((slot) => `  - ${slot}`).join('\n')}

Aircraft Available:
${constraints.aircraftAvailability.map((slot) => `  - ${slot}`).join('\n')}

REQUIREMENTS:
1. Generate exactly 3 reschedule options
2. Prioritize options that:
   - Minimize delay from original flight time
   - Match student's training level requirements
   - Have favorable weather forecasts
   - Use the same instructor when possible
   - Use the same aircraft when possible
3. Each option must:
   - Be within the next 14 days
   - Fall within ALL availability windows (student, instructor, AND aircraft)
   - Include a realistic weather forecast based on typical conditions for the time/date
   - Have a clear reasoning explanation
   - Be assigned a priority (1 = best, 2 = good, 3 = acceptable)
   - Include confidence level (high/medium/low)

OUTPUT FORMAT:
Return exactly 3 suggestions as a JSON array, ordered by priority (1 = best option).
Each suggestion must include:
- slot: ISO 8601 datetime string
- priority: 1, 2, or 3
- reasoning: 2-3 sentence explanation with bullet points
- weatherForecast: Brief forecast (e.g., "Clear skies, winds 8kt" or "Partly cloudy, winds 12kt")
- confidence: "high", "medium", or "low"
- instructorAvailable: true/false
- aircraftAvailable: true/false

IMPORTANT: 
- All 3 options must be valid and within availability windows
- Priority 1 should be the best overall option
- Priority 2 should be a good alternative
- Priority 3 should be acceptable but may have some compromises
- Use realistic weather forecasts based on the time of day and season
- Consider that ${canceledFlight.student.trainingLevel} students have specific weather minimums`;
}

