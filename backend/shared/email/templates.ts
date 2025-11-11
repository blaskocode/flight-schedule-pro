import { format } from 'date-fns';

export interface WeatherCancellationEmailData {
  studentName: string;
  flightDate: Date;
  instructor: string;
  aircraft: string;
  reasons: string[];
  departureAirport: string;
}

export function weatherCancellationEmail(data: WeatherCancellationEmailData) {
  const subject = `Flight Cancelled - Weather Conditions Unsafe`;
  
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0284c7; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f8fafc; }
    .alert { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
    .reasons { background: white; padding: 15px; margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Flight Cancelled - Weather</h1>
    </div>
    <div class="content">
      <p>Hi ${data.studentName},</p>
      
      <p>Unfortunately, your scheduled flight has been cancelled due to unsafe weather conditions.</p>
      
      <div class="alert">
        <strong>Flight Details:</strong><br/>
        Date & Time: ${format(data.flightDate, 'EEEE, MMMM d, yyyy \'at\' h:mm a')}<br/>
        Instructor: ${data.instructor}<br/>
        Aircraft: ${data.aircraft}<br/>
        Departure: ${data.departureAirport}
      </div>
      
      <div class="reasons">
        <strong>Weather Conditions:</strong>
        <ul>
          ${data.reasons.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>
      
      <p><strong>Good news!</strong> Our AI system is generating optimal reschedule options for you. You'll receive another email shortly with 3 suggested times.</p>
      
      <p>Safety is always our top priority. Thank you for your understanding.</p>
    </div>
    <div class="footer">
      Flight Schedule Pro - AI-Powered Weather Rescheduling
    </div>
  </div>
</body>
</html>
  `;

  const textBody = `
Flight Cancelled - Weather Conditions Unsafe

Hi ${data.studentName},

Your scheduled flight has been cancelled due to unsafe weather conditions.

Flight Details:
- Date & Time: ${format(data.flightDate, 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
- Instructor: ${data.instructor}
- Aircraft: ${data.aircraft}
- Departure: ${data.departureAirport}

Weather Conditions:
${data.reasons.map(r => `- ${r}`).join('\n')}

Our AI system is generating optimal reschedule options. You'll receive another email shortly with 3 suggested times.

Safety is always our top priority.

- Flight Schedule Pro
  `;

  return { subject, htmlBody, textBody };
}

export interface RescheduleOptionsEmailData {
  studentName: string;
  originalFlightDate: Date;
  suggestions: Array<{
    slot: string;
    priority: number;
    reasoning: string;
    weatherForecast: string;
    confidence: string;
  }>;
  rescheduleRequestId: string;
  expiresAt: Date;
}

export function rescheduleOptionsEmail(data: RescheduleOptionsEmailData) {
  const subject = `3 Reschedule Options Available - AI Selected`;
  
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .option { background: #f0fdf4; border: 2px solid #10b981; padding: 15px; margin: 15px 0; border-radius: 8px; }
    .option.priority-1 { border-color: #10b981; background: #f0fdf4; }
    .option.priority-2 { border-color: #3b82f6; background: #eff6ff; }
    .option.priority-3 { border-color: #8b5cf6; background: #f5f3ff; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .badge.high { background: #10b981; color: white; }
    .badge.medium { background: #3b82f6; color: white; }
    .badge.low { background: #8b5cf6; color: white; }
    .button { background: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 5px; }
    .expires { background: #fef3c7; padding: 10px; margin: 20px 0; border-left: 4px solid #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 AI Reschedule Options Ready</h1>
    </div>
    <div class="content">
      <p>Hi ${data.studentName},</p>
      
      <p>Our AI has analyzed your availability, instructor schedules, aircraft availability, and weather forecasts to suggest the best reschedule options:</p>
      
      ${data.suggestions.map((s, i) => `
        <div class="option priority-${s.priority}">
          <div>
            <strong>Option ${i + 1} - Priority ${s.priority}</strong>
            <span class="badge ${s.confidence}">${s.confidence.toUpperCase()} CONFIDENCE</span>
          </div>
          <p><strong>📅 ${format(new Date(s.slot), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}</strong></p>
          <p><strong>Why this works:</strong> ${s.reasoning}</p>
          <p><strong>Weather Forecast:</strong> ${s.weatherForecast}</p>
        </div>
      `).join('')}
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://app.flightschedulepro.com/reschedule/${data.rescheduleRequestId}" class="button">
          Select Your Preferred Time
        </a>
      </div>
      
      <div class="expires">
        ⏰ <strong>Please respond by ${format(data.expiresAt, 'MMMM d \'at\' h:mm a')}</strong>
        <br/>These options will expire in 48 hours.
      </div>
      
      <p>Once you select an option, we'll send it to your instructor for final confirmation.</p>
    </div>
  </div>
</body>
</html>
  `;

  const textBody = `
AI Reschedule Options Ready

Hi ${data.studentName},

Our AI has analyzed schedules and weather to suggest the best reschedule options:

${data.suggestions.map((s, i) => `
OPTION ${i + 1} - PRIORITY ${s.priority} (${s.confidence.toUpperCase()} CONFIDENCE)
📅 ${format(new Date(s.slot), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}

Why this works: ${s.reasoning}
Weather Forecast: ${s.weatherForecast}
`).join('\n---\n')}

Select your preferred time: https://app.flightschedulepro.com/reschedule/${data.rescheduleRequestId}

⏰ Please respond by ${format(data.expiresAt, 'MMMM d \'at\' h:mm a')}
These options expire in 48 hours.

- Flight Schedule Pro
  `;

  return { subject, htmlBody, textBody };
}

export interface ConfirmationEmailData {
  recipientName: string;
  isStudent: boolean;
  newFlightDate: Date;
  instructor: string;
  student: string;
  aircraft: string;
  departureAirport: string;
}

export function confirmationEmail(data: ConfirmationEmailData) {
  const subject = `✓ Flight Rescheduled Successfully`;
  
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; }
    .success { background: #f0fdf4; border: 2px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
    .details { background: white; padding: 15px; margin: 20px 0; border: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Flight Confirmed</h1>
    </div>
    <div class="success">
      <h2 style="color: #10b981; margin: 0;">Rescheduling Complete!</h2>
      <p>Your flight has been successfully rescheduled.</p>
    </div>
    <div class="details">
      <strong>New Flight Details:</strong><br/>
      📅 ${format(data.newFlightDate, 'EEEE, MMMM d, yyyy \'at\' h:mm a')}<br/>
      👨‍✈️ Instructor: ${data.instructor}<br/>
      👨‍🎓 Student: ${data.student}<br/>
      ✈️ Aircraft: ${data.aircraft}<br/>
      🛫 Departure: ${data.departureAirport}
    </div>
    <p>See you at the airport! We'll continue monitoring weather conditions and notify you of any changes.</p>
  </div>
</body>
</html>
  `;

  const textBody = `
✓ Flight Rescheduled Successfully

Hi ${data.recipientName},

Your flight has been successfully rescheduled!

New Flight Details:
📅 ${format(data.newFlightDate, 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
👨‍✈️ Instructor: ${data.instructor}
👨‍🎓 Student: ${data.student}
✈️ Aircraft: ${data.aircraft}
🛫 Departure: ${data.departureAirport}

See you at the airport!

- Flight Schedule Pro
  `;

  return { subject, htmlBody, textBody };
}

