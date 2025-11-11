# Product Requirements Document: Flight Schedule Pro AI Rescheduler (MVP)

## Executive Summary

**Product**: AI-Powered Weather Cancellation & Rescheduling System  
**Organization**: Flight Schedule Pro (Gauntlet AI Project)  
**Timeline**: 3-5 days MVP  
**Primary Goal**: Automatically detect weather conflicts and use AI to generate intelligent rescheduling options

---

## 1. Product Vision

### Problem Statement
Flight schools lose significant revenue to weather cancellations. The manual rescheduling process is time-consuming and often results in training delays and student frustration.

### Solution
An intelligent system that:
1. Monitors weather conditions at flight departure airports
2. Automatically detects when weather violates safety minimums for student training level
3. Uses AI to generate 3 optimized rescheduling options
4. Sends notifications to students and instructors
5. Tracks all cancellations and reschedules for analysis

### Success Metrics (From Project Document)
- ✅ Weather conflicts automatically detected
- ✅ Notifications sent to affected students and instructors
- ✅ AI suggests 3 optimal rescheduling times
- ✅ Database updates bookings and logs all actions
- ✅ Dashboard displays live weather alerts and flight statuses
- ✅ AI considers student training level for weather minimums

---

## 2. Technical Stack (100% Specification Compliant)

### Required Components (Per Original Spec):

**Frontend**:
- React 18 with TypeScript
- Next.js 14 (static export for AWS deployment)
- TailwindCSS (aviation theme)
- shadcn/ui components
- TanStack Query (server state)
- date-fns (date handling)

**Backend/AI**:
- TypeScript Lambda functions
- Vercel AI SDK (npm library - spec requirement)
- OpenAI GPT-4 model
- Zod schema validation

**Cloud** (AWS - Alternative to Azure per spec):
- **Compute**: AWS Lambda (Node.js 20)
- **API**: AWS API Gateway (REST)
- **Database**: AWS RDS PostgreSQL
- **Cache**: AWS ElastiCache Redis
- **Storage**: AWS S3
- **CDN**: AWS CloudFront
- **Auth**: AWS Cognito User Pools
- **Email**: AWS SES (Simple Email Service)
- **Secrets**: AWS Secrets Manager
- **Monitoring**: AWS CloudWatch
- **Scheduler**: AWS EventBridge
- **IaC**: AWS CDK (TypeScript)

**APIs** (Per spec):
- **Primary Weather**: WeatherAPI.com (1M calls/month free)
- **Fallback Weather**: FAA Aviation Weather (unlimited free)
- **AI**: OpenAI API (via Vercel AI SDK library)

---

## 3. Architecture Overview

### High-Level Flow:
```
User (Browser)
    ↓
AWS CloudFront CDN
    ↓
AWS S3 (Static React App)
    ↓
AWS Cognito (Authentication)
    ↓
AWS API Gateway (REST API)
    ↓
AWS Lambda Functions
    ├─ Weather Check (WeatherAPI.com/FAA)
    ├─ AI Reschedule (Vercel AI SDK → OpenAI)
    └─ Flights CRUD
    ↓
AWS RDS PostgreSQL + ElastiCache Redis
    ↓
AWS SES (Email Notifications)
```

### Background Jobs:
```
AWS EventBridge (Hourly Cron)
    ↓
AWS Lambda (Weather Check Job)
    ↓
Check all flights → Detect conflicts → Trigger AI → Send emails
```

---

## 4. Weather Data Integration

### Primary Provider: WeatherAPI.com (Spec Requirement)

**Why WeatherAPI.com:**
- ✅ Meets original specification requirement
- ✅ 1 million API calls/month (free tier)
- ✅ Simple JSON response format
- ✅ Global airport coverage
- ✅ Current conditions + 3-day forecast
- ✅ No METAR parsing required

**API Example:**
```bash
GET https://api.weatherapi.com/v1/current.json?key=API_KEY&q=KAUS

Response:
{
  "current": {
    "vis_miles": 10.0,
    "wind_mph": 8.1,
    "wind_degree": 180,
    "wind_gust_mph": 12.0,
    "condition": {
      "text": "Clear",
      "code": 1000
    }
  }
}
```

**Data Mapping:**
- Visibility: `vis_miles` → Statute miles
- Wind Speed: `wind_mph` × 0.868976 → Knots
- Wind Direction: `wind_degree` → Degrees
- Conditions: `condition.text` → String description

### Fallback Provider: FAA Aviation Weather

**Why Include FAA:**
- ✅ Unlimited free access (government service)
- ✅ Official aviation data (what pilots actually use)
- ✅ METAR/TAF industry standard format
- ✅ Most accurate for airport-specific conditions

**Provider Selection:**
```typescript
// Environment variable controls provider
const WEATHER_PROVIDER = process.env.WEATHER_PROVIDER || 'weatherapi';

// Factory pattern
const weatherProvider = WEATHER_PROVIDER === 'faa' 
  ? new FAAProvider()
  : new WeatherAPIProvider();
```

**Default**: WeatherAPI.com (meets spec)  
**Optional**: Toggle to FAA via environment variable

---

## 5. AI Integration (Vercel AI SDK)

### Why Vercel AI SDK (Spec Requirement):

**IMPORTANT**: The Vercel AI SDK is **just an npm package** - a TypeScript library that works in any Node.js environment including AWS Lambda. It is **NOT** the Vercel platform/hosting.

**Benefits over raw OpenAI SDK:**
- ✅ Structured output with Zod schemas (no JSON parsing errors)
- ✅ Automatic type safety (TypeScript knows exact structure)
- ✅ Built-in retry logic for transient failures
- ✅ Better error handling
- ✅ Streaming support (future enhancement)
- ✅ Provider-agnostic (can switch from OpenAI to Anthropic easily)

### Implementation:

**Installation:**
```bash
npm install ai @ai-sdk/openai zod
```

**Usage in AWS Lambda:**
```typescript
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Define schema for structured output
const rescheduleSchema = z.object({
  suggestions: z.array(
    z.object({
      slot: z.string().describe('ISO 8601 datetime'),
      priority: z.number().int().min(1).max(3),
      reasoning: z.string().describe('Clear explanation'),
      weatherForecast: z.string(),
      confidence: z.enum(['high', 'medium', 'low']),
    })
  ).length(3),
});

// Generate suggestions in Lambda function
export const handler = async (event) => {
  const { object } = await generateObject({
    model: openai('gpt-4'),
    schema: rescheduleSchema,
    prompt: buildPrompt(context),
  });
  
  // object.suggestions is fully typed and validated!
  // No JSON parsing errors possible
  return { statusCode: 200, body: JSON.stringify(object) };
};
```

**Lambda Compatibility:**
- ✅ Pure TypeScript library (no platform dependencies)
- ✅ Works in Lambda, EC2, ECS, or any Node.js environment
- ✅ Makes standard HTTPS requests to OpenAI API
- ✅ No cold start impact
- ✅ Bundle size: +1MB (negligible)

---

## 6. Core Features (MVP)

### 6.1 Weather Monitoring System

#### Automatic Weather Checking
- **Frequency**: Hourly via AWS EventBridge cron job
- **Manual Trigger**: Button in dashboard triggers immediate check
- **Data Source**: WeatherAPI.com (primary), FAA (fallback)
- **Scope**: Departure airport only (simplified for MVP)

#### Weather Safety Logic

**Training Level Based Minimums:**
```typescript
function getWeatherMinimums(trainingLevel: TrainingLevel) {
  switch (trainingLevel) {
    case 'EARLY_STUDENT': // 0-20 hours
      return {
        visibility: 10,    // statute miles
        ceiling: 3000,     // feet AGL
        maxWind: 10,       // knots
      };
    
    case 'PRIVATE_PILOT':
      return {
        visibility: 3,
        ceiling: 1000,
        maxWind: 15,
      };
    
    case 'INSTRUMENT_RATED':
      return {
        visibility: 0,     // IMC acceptable
        ceiling: 0,
        maxWind: 25,
      };
  }
}
```

**Safety Check Process:**
1. Fetch current weather from WeatherAPI.com
2. Get minimums for student's training level
3. Compare actual conditions to minimums
4. Return SAFE or UNSAFE with reasons
5. Save WeatherCheck record to RDS PostgreSQL
6. If UNSAFE: Trigger AI reschedule Lambda

### 6.2 AI-Powered Rescheduling

#### Input Context:
```typescript
interface RescheduleContext {
  canceledFlight: {
    id: string;
    student: {
      name: string;
      trainingLevel: 'EARLY_STUDENT' | 'PRIVATE_PILOT' | 'INSTRUMENT_RATED';
      totalHours: number;
    };
    instructor: { name: string };
    aircraft: { tailNumber: string; model: string };
    originalTime: string;
    weatherReason: string;
  };
  constraints: {
    studentAvailability: string[]; // e.g., ["Mon 9am-5pm", "Wed 2pm-6pm"]
    instructorAvailability: string[];
    aircraftAvailability: string[];
  };
}
```

#### Zod Schema (Ensures Structure):
```typescript
const rescheduleSchema = z.object({
  suggestions: z.array(
    z.object({
      slot: z.string().describe('ISO 8601 datetime string'),
      priority: z.number().int().min(1).max(3),
      reasoning: z.string().describe('Bullet points explaining why optimal'),
      weatherForecast: z.string().describe('Brief forecast summary'),
      confidence: z.enum(['high', 'medium', 'low']),
    })
  ).length(3).describe('Exactly 3 options, ordered by priority'),
});
```

#### AI Output (Guaranteed by Zod):
```json
{
  "suggestions": [
    {
      "slot": "2025-11-09T14:00:00Z",
      "priority": 1,
      "reasoning": "• Same instructor available\n• Only 1 day delay\n• Clear weather forecast",
      "weatherForecast": "Clear skies, winds 8kt",
      "confidence": "high"
    },
    {
      "slot": "2025-11-10T10:00:00Z",
      "priority": 2,
      "reasoning": "• Same instructor\n• 2 day delay\n• Partly cloudy, winds 6kt",
      "weatherForecast": "Partly cloudy, winds 6kt",
      "confidence": "high"
    },
    {
      "slot": "2025-11-09T16:00:00Z",
      "priority": 3,
      "reasoning": "• Only 1 day delay\n• Different instructor (Sarah - 12yr experience)\n• Clear conditions",
      "weatherForecast": "Clear skies, winds 7kt",
      "confidence": "medium"
    }
  ]
}
```

#### Validation:
Before presenting to user:
1. ✅ Verify instructor actually available (database query)
2. ✅ Verify aircraft actually available
3. ✅ Check weather forecast for suggested time
4. ✅ Ensure no double-bookings (database transaction)
5. ✅ Respect 30-minute buffer between flights

### 6.3 Notification System (AWS SES)

#### Email Types:
1. **Weather Conflict Alert** - Sent when unsafe weather detected
2. **Reschedule Suggestions** - Contains 3 AI-generated options
3. **Confirmation Receipt** - Sent when both parties confirm

#### Email Example:
```
From: Flight Schedule Pro <noreply@flightschedulepro.com>
To: student@email.com
Subject: Weather Alert - Flight Nov 8 @ 2:00 PM Needs Rescheduling

Hi Alice,

Unfortunately, weather conditions aren't safe for your lesson:

📅 Original: Saturday, Nov 8 @ 2:00 PM
✈️ Aircraft: Cessna 172 (N12345)
👨‍✈️ Instructor: John Smith

⚠️ Weather Issue:
• Visibility: 2 statute miles (minimum required: 10 SM)
• Winds: 18 knots gusting 25 knots (maximum allowed: 10 kt)

Here are 3 alternative times:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Option 1: Sunday, Nov 9 @ 2:00 PM ⭐ RECOMMENDED
✓ Same instructor (John Smith)
✓ Same time slot
✓ Only 1 day delay
✓ Weather: Clear skies, winds 8kt
[Select Option 1] → https://app.com/reschedule/123?option=0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Option 2: Monday, Nov 10 @ 10:00 AM
✓ Same instructor
✓ Your preferred morning time window
✓ Weather: Partly cloudy, winds 6kt
[Select Option 2] → https://app.com/reschedule/123?option=1

Option 3: Sunday, Nov 9 @ 4:00 PM
✓ Only 1 day delay
✗ Different instructor (Sarah Johnson - 12 years experience)
✓ Weather: Clear skies, winds 7kt
[Select Option 3] → https://app.com/reschedule/123?option=2

[None of these work? Request more options]

Your training progress: Last flight was 5 days ago - you're on track!

Blue skies,
Flight Schedule Pro
```

#### AWS SES Setup:
- Verify sender email address (for sandbox)
- Request production access (for unlimited sending)
- Configure SPF/DKIM records
- Free tier: 62,000 emails/month

### 6.4 Two-Step Confirmation Workflow

**Process:**
1. Weather conflict detected → AI generates suggestions
2. Email sent to **student** with 3 options
3. Student clicks option → Temporarily locks time slot (2 hours)
4. Email sent to **instructor** for confirmation
5. Instructor confirms → New flight created in database
6. Both parties receive confirmation email
7. Old flight marked as RESCHEDULED

**Expiration:**
- Reschedule request expires after 48 hours if no student action
- Temporary slot lock releases after 2 hours if no instructor confirmation

**Race Condition Prevention:**
- Database transactions with row-level locking
- Check availability at every step
- Optimistic locking pattern

### 6.5 Dashboard UI (React + TypeScript)

#### Student Dashboard:
```
┌─────────────────────────────────────────────────────┐
│  My Upcoming Flights                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ Wed, Nov 13 @ 2:00 PM                         │ │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│  │ ✈️  C172-234  |  👨‍✈️  John Smith              │ │
│  │ 📍  KAUS → KHYI → KAUS                        │ │
│  │                                               │ │
│  │ Weather: ⚠️  Potential Issues (70%)           │ │
│  │ Winds forecast: 15kt (your limit: 10kt)      │ │
│  │                                               │ │
│  │ [View Details]  [Weather Briefing]           │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ Sat, Nov 16 @ 9:00 AM                         │ │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│  │ ✈️  C172-456  |  👨‍✈️  John Smith              │ │
│  │ 📍  KAUS                                      │ │
│  │                                               │ │
│  │ Weather: ✓  Clear Conditions                  │ │
│  │ Visibility: 10SM, Winds: 8kt, Clear skies    │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  🔴 Active Weather Alerts                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Flight Tomorrow 2:00 PM - High Risk                │
│  ⛅ Visibility: 2 SM (Required: 10 SM)              │
│  💨 Winds: 18kt gusting 25kt (Limit: 10kt)         │
│                                                     │
│  [View AI Reschedule Options →]                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Admin Dashboard:
```
┌─────────────────────────────────────────────────────┐
│  Weather Impact (Last 30 Days)                      │
├─────────────────────────────────────────────────────┤
│  Total Flights: 120                                 │
│  Weather Cancellations: 8 (6.7%)                    │
│  Successfully Rescheduled: 7 (87.5%)                │
│  Average Reschedule Time: 14 hours                  │
│  Revenue Protected: $9,800                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Upcoming Flights (Next 48 Hours)                   │
├─────────────────────────────────────────────────────┤
│  Today, 2:00 PM - Alice Brown                       │
│    C172-234, John Smith                             │
│    ✓ Weather: Clear                                 │
│                                                     │
│  Today, 4:00 PM - David Lee                         │
│    PA28-789, Sarah Johnson                          │
│    ⚠️ Weather: Marginal (winds 12kt)                │
│                                                     │
│  Tomorrow, 9:00 AM - Emma Wilson                    │
│    C172-456, John Smith                             │
│    🔴 Weather: Unsafe (visibility 2SM)              │
│    AI rescheduling in progress...                   │
│                                                     │
│  [Manual Weather Refresh]  [Export Report]         │
└─────────────────────────────────────────────────────┘
```

---

## 7. Database Schema (7 Tables - Simplified)

```prisma
// PostgreSQL database via AWS RDS

model School {
  id              String    @id @default(cuid())
  name            String
  airportCode     String    // "KAUS"
  timezone        String    // "America/Chicago"
  weatherProvider String    @default("weatherapi") // "weatherapi" or "faa"
  createdAt       DateTime  @default(now())
  
  students    Student[]
  instructors Instructor[]
  aircraft    Aircraft[]
  flights     Flight[]
}

enum TrainingLevel {
  EARLY_STUDENT      // 0-20 hours
  PRIVATE_PILOT      // Licensed VFR
  INSTRUMENT_RATED   // Licensed IFR
}

model Student {
  id            String        @id @default(cuid())
  schoolId      String
  email         String        @unique
  firstName     String
  lastName      String
  cognitoId     String        @unique  // AWS Cognito User ID
  trainingLevel TrainingLevel @default(EARLY_STUDENT)
  totalHours    Float         @default(0)
  availability  Json          // Weekly schedule
  createdAt     DateTime      @default(now())
  
  school              School              @relation(fields: [schoolId], references: [id])
  flights             Flight[]
  rescheduleRequests  RescheduleRequest[]
}

model Instructor {
  id           String   @id @default(cuid())
  schoolId     String
  email        String   @unique
  firstName    String
  lastName     String
  cognitoId    String   @unique
  availability Json     // Weekly schedule
  createdAt    DateTime @default(now())
  
  school  School   @relation(fields: [schoolId], references: [id])
  flights Flight[]
}

model Aircraft {
  id          String   @id @default(cuid())
  schoolId    String
  tailNumber  String   @unique  // "N12345"
  model       String              // "Cessna 172"
  available   Boolean  @default(true)
  createdAt   DateTime @default(now())
  
  school  School   @relation(fields: [schoolId], references: [id])
  flights Flight[]
}

enum FlightStatus {
  SCHEDULED
  COMPLETED
  WEATHER_CANCELLED
  RESCHEDULED
}

model Flight {
  id               String       @id @default(cuid())
  schoolId         String
  studentId        String
  instructorId     String
  aircraftId       String
  scheduledStart   DateTime
  scheduledEnd     DateTime
  departureAirport String       // "KAUS"
  status           FlightStatus @default(SCHEDULED)
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  
  school             School              @relation(fields: [schoolId], references: [id])
  student            Student             @relation(fields: [studentId], references: [id])
  instructor         Instructor          @relation(fields: [instructorId], references: [id])
  aircraft           Aircraft            @relation(fields: [aircraftId], references: [id])
  weatherChecks      WeatherCheck[]
  rescheduleRequests RescheduleRequest[]
  
  @@index([scheduledStart])
  @@index([status])
}

enum WeatherSafety {
  SAFE
  UNSAFE
}

model WeatherCheck {
  id          String        @id @default(cuid())
  flightId    String
  checkTime   DateTime      @default(now())
  location    String        // Airport code
  visibility  Float         // Statute miles
  ceiling     Int?          // Feet AGL
  windSpeed   Int           // Knots
  conditions  String        // "Clear", "Rain", etc.
  result      WeatherSafety
  reasons     Json          // Array of strings
  provider    String        // "weatherapi" or "faa"
  
  studentTrainingLevel TrainingLevel
  requiredVisibility   Float
  requiredCeiling      Int
  maxWindSpeed         Int
  
  createdAt DateTime @default(now())
  
  flight Flight @relation(fields: [flightId], references: [id])
  
  @@index([flightId])
  @@index([checkTime])
}

enum RescheduleStatus {
  PENDING_STUDENT
  PENDING_INSTRUCTOR
  ACCEPTED
  REJECTED
  EXPIRED
}

model RescheduleRequest {
  id                    String           @id @default(cuid())
  flightId              String
  studentId             String
  suggestions           Json             // Array of 3 AI options
  status                RescheduleStatus @default(PENDING_STUDENT)
  selectedOption        Int?             // 0, 1, or 2
  studentConfirmedAt    DateTime?
  instructorConfirmedAt DateTime?
  newFlightId           String?
  expiresAt             DateTime         // 48 hours
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt
  
  flight  Flight  @relation(fields: [flightId], references: [id])
  student Student @relation(fields: [studentId], references: [id])
  
  @@index([status])
  @@index([flightId])
  @@index([expiresAt])
}
```

---

## 8. MVP Implementation Timeline (5 Days)

### Day 1: Infrastructure & Database (8h)
- AWS CDK setup + bootstrap
- Deploy RDS PostgreSQL
- Deploy ElastiCache Redis
- Deploy Cognito User Pool
- Create Prisma schema
- Run migrations
- Seed test data

### Day 2: Weather & AI Services (9h)
- WeatherAPI.com integration
- FAA fallback provider
- Provider toggle implementation
- **Vercel AI SDK integration**
- AI reschedule Lambda with Zod schema
- Weather check Lambda
- EventBridge hourly cron

### Day 3: Frontend & Auth (8h)
- Next.js setup + aviation theme
- AWS Cognito integration
- Login/signup pages
- Dashboard components
- API client (calls API Gateway)
- Deploy to S3 + CloudFront

### Day 4: Workflow & Deploy (8h)
- Reschedule selection API
- Reschedule confirmation API
- Two-step workflow UI
- AWS SES email templates
- End-to-end testing

### Day 5: Polish & Demo (8h)
- Bug fixes
- UI polish
- Demo video recording
- Documentation
- Final deployment

---

## 9. Success Criteria Verification

| # | Criteria | Implementation | Status |
|---|----------|----------------|--------|
| 1 | Auto-detect weather conflicts | EventBridge + WeatherAPI.com + Lambda | ✅ |
| 2 | Send notifications | AWS SES to students + instructors | ✅ |
| 3 | AI suggests 3 options | Vercel AI SDK + Zod schema guarantees 3 | ✅ |
| 4 | Database logs actions | RDS PostgreSQL + audit tables | ✅ |
| 5 | Dashboard shows alerts | React components + real-time data | ✅ |
| 6 | Training level logic | 3 levels with different minimums | ✅ |

---

## 10. Out of Scope (Future Phases)

**Not in MVP:**
- Full 40-lesson syllabus system
- Student progress tracking (beyond total hours)
- Instructor currency management
- Advanced maintenance scheduling
- Multi-school support
- In-app notifications (email only for MVP)
- SMS notifications
- Mobile app
- Route waypoint checking (departure only for MVP)
- Discovery flights

**Can be added in Phase 2/3 if needed**

---

## Document Metadata
- **Version**: 3.0 (AWS Native - Zero Vercel Platform References)
- **Last Updated**: November 10, 2025
- **Infrastructure**: 100% AWS
- **AI Library**: Vercel AI SDK (npm package)
- **Specification Compliance**: ✅ 100%
- **Status**: Ready for Implementation