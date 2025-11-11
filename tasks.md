# Flight Schedule Pro - Complete Cursor AI Development Guide

## 🎯 Project Overview for AI

**What we're building**: An AWS-hosted web application that automatically detects bad weather conditions for flight lessons and uses AI to suggest 3 optimized rescheduling options.

**Tech Stack**:
- **Frontend**: React 18 + TypeScript + Next.js 14 (static export) → AWS S3 + CloudFront
- **Backend**: AWS Lambda (TypeScript Node.js 20) + API Gateway (REST)
- **Database**: AWS RDS PostgreSQL with Prisma ORM
- **Cache**: AWS ElastiCache Redis
- **AI**: Vercel AI SDK (npm library) calling OpenAI GPT-4
- **Weather**: WeatherAPI.com (primary), FAA Aviation Weather (fallback)
- **Auth**: AWS Cognito User Pools
- **Email**: AWS SES
- **Infrastructure**: AWS CDK (TypeScript)
- **Scheduler**: AWS EventBridge (hourly cron job)

**Success Criteria**:
1. ✅ Weather conflicts auto-detected hourly via EventBridge
2. ✅ Emails sent to students and instructors via AWS SES
3. ✅ AI generates exactly 3 reschedule options using Vercel AI SDK with Zod schemas
4. ✅ Database logs all actions in RDS PostgreSQL
5. ✅ Dashboard shows live weather alerts and flight statuses
6. ✅ Training level logic (EARLY_STUDENT vs PRIVATE_PILOT vs INSTRUMENT_RATED) with different weather minimums

---

## 📋 IMPLEMENTATION PHASES

This guide is organized into 5 days of development:

- **Day 1**: Project setup, database, infrastructure foundation
- **Day 2**: AWS infrastructure deployment (RDS, Cognito, etc.)
- **Day 3**: Backend Lambda functions (weather, AI, CRUD)
- **Day 4**: API Gateway and frontend integration
- **Day 5**: Dashboard, deployment, testing

Each task has:
- **Context**: Why we're doing this
- **What Cursor should do**: Exact steps and code
- **Success Check**: How to verify it worked

---

## 📦 IMPORTANT NOTES FOR CURSOR

1. **Read the PRD first** - All requirements come from the attached PRD
2. **Follow the order** - Tasks build on each other
3. **Test after each task** - Use the Success Check to verify
4. **Copy code exactly** - These are production-ready implementations
5. **AWS Credentials** - User must configure AWS CLI before deploying
6. **API Keys** - User needs WeatherAPI.com and OpenAI API keys
7. **File Locations** - All paths are relative to project root

---
## 🚀 COMPLETE TASK BREAKDOWN

### Prerequisites (Before Starting)

**TASK 0: Verify Tools Installed** ✅
- Node.js 20+
- AWS CLI v2
- AWS CDK
- Docker (for Lambda layers)

```bash
node --version  # Should be v20.x.x
aws --version
cdk --version
docker --version
```

---

## DAY 1: FOUNDATION

### TASK 1.1: Initialize Project ✅
Create mono repo structure with workspaces for frontend, backend, infrastructure.

### TASK 1.2: Setup Frontend (Next.js) ✅
- Install Next.js 14 with TypeScript
- Configure for static export
- Add TailwindCSS with aviation theme
- Install dependencies: react-query, date-fns, cognito-identity-js

### TASK 1.3: Setup Backend ✅
- Initialize Prisma
- Create tsconfig
- Setup workspace

### TASK 1.4: Create Prisma Schema ✅
Complete 7-table database schema matching PRD exactly:
- School, Student, Instructor, Aircraft, Flight, WeatherCheck, RescheduleRequest

### TASK 1.5: Create Seed Script ✅
Realistic test data for development

### TASK 1.6: Initialize AWS CDK ✅
Setup infrastructure as code project

---

## DAY 2: AWS INFRASTRUCTURE

### TASK 2.1: Configure AWS ✅
- AWS credentials
- CDK bootstrap

### TASK 2.2: Deploy Database Stack ✅
- VPC with public/private subnets
- RDS PostgreSQL
- ElastiCache Redis
- Security groups

### TASK 2.3: Run Migrations ✅
- Connect to RDS
- Run Prisma migrate
- Seed database
- **Status**: Complete - implemented via Lambda functions with VPC access

### TASK 2.4: Deploy Auth Stack ✅
- Cognito User Pool
- User Pool Client
- Identity Pool

### TASK 2.5: Update Frontend Env ✅
Add Cognito credentials to .env.local

---

## DAY 3: BACKEND FUNCTIONS

### TASK 3.1: Create Lambda Layer ✅
Shared dependencies: Prisma, AWS SDK, Vercel AI SDK, Zod

### TASK 3.2: Weather Utilities ✅
- Provider interface
- Safety logic with training levels
- WeatherAPI.com provider
- FAA fallback provider

### TASK 3.3: AI Utilities ✅
- Zod schemas for structured output
- Prompt builder
- 3 suggestions guaranteed

### TASK 3.4: Weather Check Lambda ✅
Check weather for specific flight

### TASK 3.5: AI Reschedule Lambda ✅
Generate 3 options using Vercel AI SDK

### TASK 3.6: Hourly Job Lambda ✅
Check all flights in next 24h

### TASK 3.7: Flight CRUD Lambdas ✅
Get/create flight endpoints

### TASK 3.8: Email Notification System (AWS SES) ✅
- Email templates (weather cancellation, reschedule options, confirmations)
- SES client wrapper
- Template rendering with dynamic data

### TASK 3.9: Reschedule Confirmation Workflow ✅
- Student selection endpoint
- Instructor approval endpoint
- New flight creation on approval
- Status updates and notifications

---

## DAY 4: API & FRONTEND

### TASK 4.1: API Gateway Stack ✅
- Lambda integrations
- Cognito authorizer
- CORS configuration
- Routes: /flights, /weather/check, /reschedule/generate, /reschedule/select, /reschedule/approve

### TASK 4.2: EventBridge Scheduler ✅
Hourly cron job for weather checks

### TASK 4.3: Frontend Auth ✅
- Cognito integration
- Login/signup pages
- Auth guard component

### TASK 4.4: API Client ✅
Centralized fetch with auth tokens

### TASK 4.5: Dashboard Page ✅
Display flights with weather status
- ✅ Flight list with weather status badges
- ✅ Manual weather check button per flight
- ✅ **Book Flight button and modal form** (NEW - Added December 2024)
- ✅ **Active Weather Alerts section** showing all unsafe flights (NEW - Added December 2024)
- ✅ Reschedule request status indicators
- ✅ Generate/view reschedule options buttons

### TASK 4.6: Reschedule Selection UI ✅
- Display 3 AI-generated options
- Student selection interface
- Instructor approval interface
- Status tracking

---

## DAY 5: DEPLOYMENT & POLISH

### TASK 5.1: Frontend Stack ✅
- S3 bucket for static hosting
- CloudFront distribution
- Error handling for SPA routing
- **Status**: Complete - Frontend stack deployed with S3 and CloudFront, SPA routing configured

### TASK 5.2: Deployment Scripts ✅
Automated deployment for all stacks
- **Status**: Complete - Created 5 deployment scripts:
  - `deploy-all.sh` - Deploy all AWS stacks
  - `deploy-frontend.sh` - Build and deploy frontend
  - `migrate-db.sh` - Run database migrations
  - `seed-db.sh` - Seed database
  - `get-env-vars.sh` - Get environment variables

### TASK 5.3: Documentation ✅
- README
- Deployment guide
- API documentation
- **Status**: Complete - Updated README with Quick Start, created API_DOCUMENTATION.md

### TASK 5.4: End-to-End Testing ✅
Verify all success criteria
- **Status**: Complete - Created E2E_TESTING.md with comprehensive testing guide covering all 20 success criteria

---

## 🔑 CRITICAL CODE SNIPPETS

### Prisma Schema (Complete)
```prisma
// See full schema in tasklist - includes:
// - School (airport, timezone, weatherProvider)
// - Student (trainingLevel, totalHours, availability)
// - Instructor (availability)
// - Aircraft (tailNumber, model)
// - Flight (scheduledStart, status, departureAirport)
// - WeatherCheck (visibility, ceiling, windSpeed, result, reasons)
// - RescheduleRequest (suggestions JSON, status, expiresAt)
```

### Weather Safety Logic
```typescript
function getWeatherMinimums(trainingLevel: TrainingLevel) {
  switch (trainingLevel) {
    case 'EARLY_STUDENT':
      return { visibility: 10, ceiling: 3000, maxWind: 10 };
    case 'PRIVATE_PILOT':
      return { visibility: 3, ceiling: 1000, maxWind: 15 };
    case 'INSTRUMENT_RATED':
      return { visibility: 0, ceiling: 0, maxWind: 25 };
  }
}
```

### AI Integration (Vercel AI SDK)
```typescript
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';

const { object } = await generateObject({
  model: openai('gpt-4'),
  schema: rescheduleResponseSchema, // Zod schema
  prompt: buildReschedulePrompt(context),
});
// Returns exactly 3 suggestions, fully typed!
```

### CDK Database Stack
```typescript
// RDS PostgreSQL
const dbInstance = new rds.DatabaseInstance(this, 'DB', {
  engine: rds.DatabaseInstanceEngine.postgres({
    version: rds.PostgresEngineVersion.VER_15_4,
  }),
  vpc: this.vpc,
  credentials: rds.Credentials.fromSecret(dbSecret),
  // ... configuration
});
```

### Lambda Function Example
```typescript
export const handler = async (event: APIGatewayProxyEvent) => {
  const prisma = new PrismaClient();
  // ... logic
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  };
};
```

---

## 📋 DEPLOYMENT COMMANDS

```bash
# Bootstrap CDK (once per account/region)
cd infrastructure
cdk bootstrap

# Deploy all stacks
export WEATHER_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
cdk deploy --all --require-approval never

# Run migrations
cd ../backend
npx prisma migrate deploy
npm run db:seed

# Build and deploy frontend
cd ../frontend
npm run build
aws s3 sync out/ s3://bucket-name/
aws cloudfront create-invalidation --distribution-id ID --paths "/*"
```

---

## ✅ SUCCESS CRITERIA CHECKLIST

Before marking complete, verify:

### Infrastructure
- [ ] All 5 CDK stacks deployed
- [ ] RDS accessible and seeded
- [ ] Cognito User Pool configured
- [ ] API Gateway working
- [ ] Lambda functions deployed
- [ ] EventBridge rule created
- [ ] CloudFront serving frontend

### Functionality
- [ ] User can sign up and login
- [ ] Dashboard shows flights
- [ ] Weather check returns SAFE/UNSAFE
- [ ] AI generates exactly 3 options
- [ ] Hourly job runs automatically
- [ ] Training level minimums enforced

### Code Quality
- [ ] All TypeScript compiles
- [ ] No console errors
- [ ] Prisma schema matches PRD
- [ ] Environment variables configured
- [ ] Documentation complete

---

## 🎯 KEY ARCHITECTURE DECISIONS

1. **Why Vercel AI SDK**: Provides structured output with Zod, eliminating JSON parsing errors
2. **Why AWS CDK**: Infrastructure as code, type-safe, reusable stacks
3. **Why Prisma**: Type-safe database queries, migrations, easy schema evolution
4. **Why EventBridge**: Managed cron service, no server maintenance
5. **Why Static Export**: Fast load times, easy CloudFront caching, no SSR needed

---

## 🚨 COMMON PITFALLS TO AVOID

1. **Database Connection**: Lambda must be in VPC to access RDS
2. **Cognito Tokens**: Use ID token (not access token) for authorization
3. **Next.js Export**: Must set `output: 'export'` in next.config.js
4. **Lambda Layer**: Must be in `nodejs/node_modules/` directory
5. **CloudFront Caching**: Invalidate cache after frontend deployment
6. **Environment Variables**: Set in Lambda AND pass to generateObject calls
7. **Prisma Generate**: Run after every schema change

---

## 📚 REFERENCE DOCUMENTATION

- **PRD**: Complete product requirements (see attached file)
- **Vercel AI SDK**: https://sdk.vercel.ai/docs
- **Prisma**: https://www.prisma.io/docs
- **AWS CDK**: https://docs.aws.amazon.com/cdk/
- **Next.js**: https://nextjs.org/docs
- **WeatherAPI**: https://www.weatherapi.com/docs/
- **Cognito**: https://docs.aws.amazon.com/cognito/

---

## 🔧 DETAILED TASK IMPLEMENTATIONS (New Tasks)

### TASK 3.8: Email Notification System - DETAILED IMPLEMENTATION

**Context**: Send professional emails via AWS SES for weather cancellations, reschedule options, and confirmations.

**Files to Create**:

#### 1. `backend/shared/email/ses-client.ts`
```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

export interface EmailParams {
  to: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
}

export async function sendEmail(params: EmailParams): Promise<void> {
  const command = new SendEmailCommand({
    Source: process.env.FROM_EMAIL || 'noreply@flightschedulepro.com',
    Destination: {
      ToAddresses: params.to,
    },
    Message: {
      Subject: {
        Data: params.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: params.htmlBody,
          Charset: 'UTF-8',
        },
        Text: {
          Data: params.textBody,
          Charset: 'UTF-8',
        },
      },
    },
  });

  await sesClient.send(command);
}
```

#### 2. `backend/shared/email/templates.ts`
```typescript
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
```

**Update Lambda functions to use email templates**:

In `backend/functions/jobs/hourly-weather-check.ts`, add after flight cancellation:
```typescript
import { sendEmail } from '../../shared/email/ses-client';
import { weatherCancellationEmail } from '../../shared/email/templates';

// After cancelling flight
const emailData = weatherCancellationEmail({
  studentName: `${flight.student.firstName} ${flight.student.lastName}`,
  flightDate: flight.scheduledStart,
  instructor: `${flight.instructor.firstName} ${flight.instructor.lastName}`,
  aircraft: `${flight.aircraft.model} (${flight.aircraft.tailNumber})`,
  reasons: safetyResult.reasons,
  departureAirport: flight.departureAirport,
});

await sendEmail({
  to: [flight.student.email],
  ...emailData,
});
```

In `backend/functions/reschedule/generate-options.ts`, add after creating request:
```typescript
import { rescheduleOptionsEmail } from '../../shared/email/templates';

const emailData = rescheduleOptionsEmail({
  studentName: `${flight.student.firstName} ${flight.student.lastName}`,
  originalFlightDate: flight.scheduledStart,
  suggestions: object.suggestions,
  rescheduleRequestId: rescheduleRequest.id,
  expiresAt: rescheduleRequest.expiresAt,
});

await sendEmail({
  to: [flight.student.email],
  ...emailData,
});
```

**Success Check**: 
- Email templates compile without errors
- SES client successfully sends test email
- Weather cancellation triggers email
- AI reschedule triggers email with 3 options

---

### TASK 3.9: Reschedule Confirmation Workflow - DETAILED IMPLEMENTATION

**Context**: Implement two-step workflow: student selects option → instructor approves → new flight created.

**Files to Create**:

#### 1. `backend/functions/reschedule/select-option.ts`
```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from '../../shared/email/ses-client';

const prisma = new PrismaClient();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { rescheduleRequestId, selectedOption } = body;

    if (!rescheduleRequestId || selectedOption === undefined) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'rescheduleRequestId and selectedOption required' }),
      };
    }

    // Validate option is 0, 1, or 2
    if (selectedOption < 0 || selectedOption > 2) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'selectedOption must be 0, 1, or 2' }),
      };
    }

    // Get reschedule request
    const request = await prisma.rescheduleRequest.findUnique({
      where: { id: rescheduleRequestId },
      include: {
        flight: {
          include: {
            student: true,
            instructor: true,
            aircraft: true,
          },
        },
      },
    });

    if (!request) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Reschedule request not found' }),
      };
    }

    // Check if expired
    if (new Date() > request.expiresAt) {
      await prisma.rescheduleRequest.update({
        where: { id: rescheduleRequestId },
        data: { status: 'EXPIRED' },
      });
      
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Reschedule request has expired' }),
      };
    }

    // Update request with student selection
    const updatedRequest = await prisma.rescheduleRequest.update({
      where: { id: rescheduleRequestId },
      data: {
        selectedOption,
        studentConfirmedAt: new Date(),
        status: 'PENDING_INSTRUCTOR',
      },
    });

    // Send email to instructor
    const suggestions = request.suggestions as any[];
    const selectedSlot = suggestions[selectedOption];

    await sendEmail({
      to: [request.flight.instructor.email],
      subject: `Flight Reschedule - Awaiting Your Approval`,
      htmlBody: `
        <h2>Student Selected Reschedule Time</h2>
        <p>${request.flight.student.firstName} ${request.flight.student.lastName} has selected a new time for their cancelled flight.</p>
        <div style="background: #f0fdf4; padding: 20px; margin: 20px 0;">
          <strong>Selected Time:</strong><br/>
          ${new Date(selectedSlot.slot).toLocaleString()}<br/><br/>
          <strong>Reason:</strong> ${selectedSlot.reasoning}
        </div>
        <p><a href="https://app.flightschedulepro.com/approve/${rescheduleRequestId}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none;">Approve This Time</a></p>
      `,
      textBody: `
Student Selected Reschedule Time

${request.flight.student.firstName} ${request.flight.student.lastName} has selected: ${new Date(selectedSlot.slot).toLocaleString()}

Approve at: https://app.flightschedulepro.com/approve/${rescheduleRequestId}
      `,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Selection recorded. Instructor notified.',
        request: updatedRequest,
      }),
    };
  } catch (error) {
    console.error('Error selecting option:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
```

#### 2. `backend/functions/reschedule/approve-reschedule.ts`
```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from '../../shared/email/ses-client';
import { confirmationEmail } from '../../shared/email/templates';

const prisma = new PrismaClient();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { rescheduleRequestId, approved } = body;

    if (!rescheduleRequestId || approved === undefined) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'rescheduleRequestId and approved required' }),
      };
    }

    // Get reschedule request
    const request = await prisma.rescheduleRequest.findUnique({
      where: { id: rescheduleRequestId },
      include: {
        flight: {
          include: {
            student: true,
            instructor: true,
            aircraft: true,
            school: true,
          },
        },
      },
    });

    if (!request) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Reschedule request not found' }),
      };
    }

    if (!approved) {
      // Instructor rejected
      await prisma.rescheduleRequest.update({
        where: { id: rescheduleRequestId },
        data: {
          status: 'REJECTED',
          instructorConfirmedAt: new Date(),
        },
      });

      // Notify student
      await sendEmail({
        to: [request.flight.student.email],
        subject: 'Reschedule Time Not Available',
        htmlBody: `<p>Unfortunately, your selected time is no longer available. Please select another option from the original email.</p>`,
        textBody: 'Your selected time is no longer available. Please select another option.',
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Reschedule rejected' }),
      };
    }

    // Instructor approved - Create new flight
    const suggestions = request.suggestions as any[];
    const selectedSlot = suggestions[request.selectedOption!];
    const newStartTime = new Date(selectedSlot.slot);
    const duration = request.flight.scheduledEnd.getTime() - request.flight.scheduledStart.getTime();
    const newEndTime = new Date(newStartTime.getTime() + duration);

    // Transaction: Create new flight, update old flight, update request
    const result = await prisma.$transaction(async (tx) => {
      // Create new flight
      const newFlight = await tx.flight.create({
        data: {
          schoolId: request.flight.schoolId,
          studentId: request.flight.studentId,
          instructorId: request.flight.instructorId,
          aircraftId: request.flight.aircraftId,
          scheduledStart: newStartTime,
          scheduledEnd: newEndTime,
          departureAirport: request.flight.departureAirport,
          status: 'SCHEDULED',
        },
      });

      // Update old flight status
      await tx.flight.update({
        where: { id: request.flightId },
        data: { status: 'RESCHEDULED' },
      });

      // Update reschedule request
      await tx.rescheduleRequest.update({
        where: { id: rescheduleRequestId },
        data: {
          status: 'ACCEPTED',
          instructorConfirmedAt: new Date(),
          newFlightId: newFlight.id,
        },
      });

      return newFlight;
    });

    // Send confirmation emails to both parties
    const studentEmailData = confirmationEmail({
      recipientName: `${request.flight.student.firstName} ${request.flight.student.lastName}`,
      isStudent: true,
      newFlightDate: newStartTime,
      instructor: `${request.flight.instructor.firstName} ${request.flight.instructor.lastName}`,
      student: `${request.flight.student.firstName} ${request.flight.student.lastName}`,
      aircraft: `${request.flight.aircraft.model} (${request.flight.aircraft.tailNumber})`,
      departureAirport: request.flight.departureAirport,
    });

    const instructorEmailData = confirmationEmail({
      recipientName: `${request.flight.instructor.firstName} ${request.flight.instructor.lastName}`,
      isStudent: false,
      newFlightDate: newStartTime,
      instructor: `${request.flight.instructor.firstName} ${request.flight.instructor.lastName}`,
      student: `${request.flight.student.firstName} ${request.flight.student.lastName}`,
      aircraft: `${request.flight.aircraft.model} (${request.flight.aircraft.tailNumber})`,
      departureAirport: request.flight.departureAirport,
    });

    await Promise.all([
      sendEmail({
        to: [request.flight.student.email],
        ...studentEmailData,
      }),
      sendEmail({
        to: [request.flight.instructor.email],
        ...instructorEmailData,
      }),
    ]);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Flight rescheduled successfully',
        newFlight: result,
      }),
    };
  } catch (error) {
    console.error('Error approving reschedule:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
```

**Success Check**:
- Student can select one of 3 options
- Instructor receives approval email
- Instructor can approve/reject
- New flight created on approval
- Both parties receive confirmation
- Original flight marked as RESCHEDULED

---

### TASK 4.6: Reschedule Selection UI - DETAILED IMPLEMENTATION

**Context**: Build React components for students to view and select AI options, and instructors to approve.

#### `frontend/components/reschedule/RescheduleOptionsCard.tsx`
```typescript
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { api } from '@/lib/api-client';

interface Suggestion {
  slot: string;
  priority: number;
  reasoning: string;
  weatherForecast: string;
  confidence: 'high' | 'medium' | 'low';
  instructorAvailable: boolean;
  aircraftAvailable: boolean;
}

interface RescheduleRequest {
  id: string;
  suggestions: Suggestion[];
  status: string;
  expiresAt: string;
  selectedOption?: number;
}

export default function RescheduleOptionsCard({ request }: { request: RescheduleRequest }) {
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
      await api.selectRescheduleOption(request.id, index);
      setSelectedIndex(index);
      alert('Selection sent to instructor for approval!');
    } catch (err: any) {
      setError(err.message || 'Failed to select option');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-blue-100 text-blue-800',
      low: 'bg-purple-100 text-purple-800',
    };
    return colors[confidence as keyof typeof colors] || colors.medium;
  };

  const getPriorityColor = (priority: number) => {
    const colors = {
      1: 'border-green-500 bg-green-50',
      2: 'border-blue-500 bg-blue-50',
      3: 'border-purple-500 bg-purple-50',
    };
    return colors[priority as keyof typeof colors] || colors[2];
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
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          request.status === 'PENDING_STUDENT' ? 'bg-yellow-100 text-yellow-800' :
          request.status === 'PENDING_INSTRUCTOR' ? 'bg-blue-100 text-blue-800' :
          request.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
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

            <div className="flex items-center space-x-4 text-sm mb-3">
              <span className={`flex items-center ${suggestion.instructorAvailable ? 'text-green-600' : 'text-red-600'}`}>
                {suggestion.instructorAvailable ? '✓' : '✗'} Instructor Available
              </span>
              <span className={`flex items-center ${suggestion.aircraftAvailable ? 'text-green-600' : 'text-red-600'}`}>
                {suggestion.aircraftAvailable ? '✓' : '✗'} Aircraft Available
              </span>
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
```

#### Update `frontend/lib/api-client.ts`:
```typescript
export const api = {
  // ... existing methods ...
  
  // Reschedule
  generateRescheduleOptions: (flightId: string) =>
    fetchWithAuth('/reschedule/generate', {
      method: 'POST',
      body: JSON.stringify({ flightId }),
    }),
  
  getRescheduleRequests: (studentId?: string) => {
    const query = studentId ? `?studentId=${studentId}` : '';
    return fetchWithAuth(`/reschedule/requests${query}`);
  },
  
  selectRescheduleOption: (rescheduleRequestId: string, selectedOption: number) =>
    fetchWithAuth('/reschedule/select', {
      method: 'POST',
      body: JSON.stringify({ rescheduleRequestId, selectedOption }),
    }),
  
  approveReschedule: (rescheduleRequestId: string, approved: boolean) =>
    fetchWithAuth('/reschedule/approve', {
      method: 'POST',
      body: JSON.stringify({ rescheduleRequestId, approved }),
    }),
};
```

#### Create `frontend/app/reschedule/page.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import RescheduleOptionsCard from '@/components/reschedule/RescheduleOptionsCard';
import { api } from '@/lib/api-client';

export default function ReschedulePage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await api.getRescheduleRequests();
      setRequests(data.requests);
    } catch (error) {
      console.error('Error loading reschedule requests:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-aviation-sky-50 to-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-aviation-cloud-900 mb-2">
            Reschedule Requests
          </h1>
          <p className="text-aviation-cloud-600 mb-8">
            Review and select your preferred reschedule options
          </p>

          {loading && <p>Loading...</p>}

          {!loading && requests.length === 0 && (
            <p className="text-aviation-cloud-500">No pending reschedule requests</p>
          )}

          {requests.map((request: any) => (
            <RescheduleOptionsCard key={request.id} request={request} />
          ))}
        </div>
      </div>
    </AuthGuard>
  );
}
```

**Success Check**:
- Reschedule page displays pending requests
- Student can view all 3 AI options
- Student can select preferred time
- Selection sends notification to instructor
- Status updates reflect workflow progress
- Confirmation shown when complete

---

## 🎉 PROJECT COMPLETE!

When all tasks are done, you will have:
- ✅ Fully deployed AWS application
- ✅ Automatic hourly weather monitoring
- ✅ AI-powered rescheduling (3 options each time)
- ✅ User authentication with Cognito
- ✅ Beautiful React dashboard
- ✅ Complete audit trail in PostgreSQL
- ✅ Production-ready infrastructure

The application will automatically check weather every hour, cancel unsafe flights, generate AI reschedule options, and notify users - all without manual intervention!

---

**For detailed step-by-step code for each task, refer to the original incomplete tasklist.md which contains all the complete code examples. This guide provides the high-level structure and key decisions.**

