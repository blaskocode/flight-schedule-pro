# System Patterns: Flight Schedule Pro

## Architecture Overview

### High-Level Architecture

```
User Browser
    ↓
CloudFront CDN → S3 (Static Next.js App)
    ↓
Cognito Authentication
    ↓
API Gateway (REST API)
    ↓
Lambda Functions (Node.js 20)
    ├─ Weather Check
    ├─ AI Reschedule (Vercel AI SDK)
    ├─ Flight CRUD
    └─ Hourly Job
    ↓
RDS PostgreSQL + ElastiCache Redis
    ↓
AWS SES (Email Notifications)
```

### Background Processing

```
EventBridge (Hourly Cron)
    ↓
Hourly Job Lambda
    ↓
Check all flights → Detect conflicts → Trigger AI → Send emails
```

## Key Design Patterns

### 1. Serverless Architecture

**Pattern**: All compute via AWS Lambda (no EC2 instances)

**Rationale**:
- Auto-scaling
- Pay-per-use pricing
- No server management
- Fast cold starts with Node.js 20

**Implementation**:
- Lambda functions in private VPC subnets
- Shared Lambda layer for dependencies (Prisma, AWS SDK, Vercel AI SDK)
- API Gateway for HTTP routing
- EventBridge for scheduled jobs

### 2. Infrastructure as Code

**Pattern**: AWS CDK (TypeScript) for all infrastructure

**Rationale**:
- Version controlled infrastructure
- Type-safe resource definitions
- Reusable stacks
- Easy deployment and rollback

**Structure**:
- 5 CDK stacks: Database, Auth, API, Scheduler, Frontend
- Stack dependencies managed explicitly
- Environment-specific configurations

### 3. Database-First Design

**Pattern**: Prisma ORM with PostgreSQL

**Rationale**:
- Type-safe database queries
- Automatic migrations
- Schema as single source of truth
- Excellent TypeScript integration

**Schema Structure**:
- 7 normalized tables
- Foreign key relationships
- Indexes on frequently queried columns
- JSON fields for flexible data (availability, suggestions)

### 4. Structured AI Output

**Pattern**: Vercel AI SDK with Zod schemas

**Rationale**:
- Guaranteed structure (exactly 3 suggestions)
- Type safety (TypeScript knows exact shape)
- No JSON parsing errors
- Automatic validation

**Implementation**:
```typescript
const rescheduleSchema = z.object({
  suggestions: z.array(
    z.object({
      slot: z.string(),
      priority: z.number().int().min(1).max(3),
      reasoning: z.string(),
      weatherForecast: z.string(),
      confidence: z.enum(['high', 'medium', 'low']),
    })
  ).length(3), // Exactly 3 options
});
```

### 5. Training Level Safety Logic

**Pattern**: Strategy pattern for weather minimums

**Rationale**:
- Different minimums for different experience levels
- Centralized safety logic
- Easy to extend with new training levels

**Implementation**:
```typescript
function getWeatherMinimums(trainingLevel: TrainingLevel) {
  switch (trainingLevel) {
    case 'EARLY_STUDENT': // 0-20 hours
      return { visibility: 10, ceiling: 3000, maxWind: 10 };
    case 'PRIVATE_PILOT': // Licensed VFR
      return { visibility: 3, ceiling: 1000, maxWind: 15 };
    case 'INSTRUMENT_RATED': // Licensed IFR
      return { visibility: 0, ceiling: 0, maxWind: 25 };
  }
}
```

### 6. Two-Step Approval Workflow

**Pattern**: State machine with database transactions

**States**:
- `PENDING_STUDENT`: AI generated options, waiting for student
- `PENDING_INSTRUCTOR`: Student selected, waiting for instructor
- `ACCEPTED`: Both parties confirmed, new flight created
- `REJECTED`: Instructor rejected selection
- `EXPIRED`: 48 hours passed without student action

**Transaction Safety**:
- Database transactions ensure atomicity
- Row-level locking prevents race conditions
- Status updates are idempotent

### 7. Email Template System

**Pattern**: Template functions returning HTML + text

**Rationale**:
- Reusable email templates
- Consistent branding
- Easy to update styling
- Both HTML and plain text versions

**Templates**:
1. Weather cancellation email
2. Reschedule options email (with 3 AI suggestions)
3. Instructor approval request
4. Confirmation email (student + instructor versions)
5. Rejection notification

### 8. Weather Provider Abstraction

**Pattern**: Provider interface with fallback

**Rationale**:
- Primary: WeatherAPI.com (simple, reliable)
- Fallback: FAA Aviation Weather (unlimited, official)
- Easy to add more providers
- Environment variable toggle

**Implementation**:
```typescript
const weatherProvider = process.env.WEATHER_PROVIDER === 'faa'
  ? new FAAProvider()
  : new WeatherAPIProvider();
```

### 9. Static Frontend Export

**Pattern**: Next.js static export to S3/CloudFront

**Rationale**:
- Fast load times (CDN caching)
- No SSR needed (all data via API)
- Simple deployment (just upload files)
- Cost effective (S3 + CloudFront)

**Configuration**:
- `output: 'export'` in next.config.js
- All API calls to API Gateway
- Client-side authentication with Cognito

### 10. Security Patterns

**Authentication**:
- AWS Cognito User Pools
- JWT tokens for API authorization
- Cognito authorizer on API Gateway

**Network Security**:
- RDS in isolated subnet (no internet)
- Lambda in private subnet with NAT Gateway
- Security groups restrict traffic
- VPC endpoints for AWS services (optional, saves NAT costs)

**Data Security**:
- Secrets in AWS Secrets Manager (not env vars)
- RDS encryption at rest
- HTTPS only (CloudFront redirects HTTP)
- No hardcoded credentials

## Component Relationships

### Frontend Components

- **AuthGuard**: Protects routes, redirects to login
- **Dashboard**: Main flight list with weather status
- **RescheduleOptionsCard**: Displays 3 AI options for selection
- **API Client**: Centralized fetch with auth tokens

### Backend Functions

- **Weather Check**: Fetches weather, evaluates safety, logs to DB
- **AI Reschedule**: Generates 3 options using Vercel AI SDK
- **Hourly Job**: Batch processes all upcoming flights
- **Select Option**: Student selection endpoint
- **Approve Reschedule**: Instructor approval endpoint

### Shared Utilities

- **Prisma Client**: Singleton pattern for Lambda reuse
- **Weather Providers**: Abstracted weather fetching
- **Safety Logic**: Training level minimums
- **Email Templates**: HTML email generation
- **SES Client**: Email sending wrapper

## Data Flow Patterns

### Weather Check Flow

1. Lambda receives flight ID
2. Fetch flight with student data
3. Get weather from provider
4. Apply safety logic based on training level
5. Create WeatherCheck record
6. If unsafe: Update flight status, trigger AI reschedule
7. Return result to API Gateway

### AI Reschedule Flow

1. Lambda receives cancelled flight ID
2. Fetch full context (student, instructor, aircraft, availability)
3. Build detailed prompt with constraints
4. Call Vercel AI SDK with Zod schema
5. Receive exactly 3 validated suggestions
6. Create RescheduleRequest with suggestions
7. Send email with options to student
8. Return request ID

### Reschedule Approval Flow

1. Student selects option (0, 1, or 2)
2. Update RescheduleRequest: selectedOption, status=PENDING_INSTRUCTOR
3. Send approval email to instructor
4. Instructor approves/rejects
5. If approved: Transaction creates new flight, updates old flight, updates request
6. Send confirmation emails to both parties

## Error Handling Patterns

### Lambda Error Handling

- Try-catch blocks around all operations
- Return proper HTTP status codes
- Log errors to CloudWatch
- Never expose internal errors to users

### Database Error Handling

- Prisma handles connection pooling
- Retry logic for transient failures
- Transaction rollback on errors
- Validation errors return 400, not 500

### API Error Responses

```typescript
{
  statusCode: 400 | 401 | 404 | 500,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    error: 'User-friendly message',
    message: 'Detailed error (dev only)',
  }),
}
```

## Performance Patterns

### Caching Strategy

- Redis for session data and frequently accessed data
- CloudFront for static assets (long TTL)
- API Gateway caching for GET requests (optional)

### Database Optimization

- Indexes on: scheduledStart, status, flightId, email
- Connection pooling via Prisma
- Read replicas for scale (future)

### Lambda Optimization

- Shared layer reduces bundle size
- Singleton Prisma client (reuse connections)
- Right-sized memory (512MB default, 1024MB for AI)
- Provisioned concurrency for critical functions (optional)

## Deployment Patterns

### CDK Stack Deployment Order

1. Database Stack (VPC, RDS, Redis)
2. Secrets Stack (API keys)
3. Auth Stack (Cognito)
4. API Stack (depends on Database + Secrets)
5. Frontend Stack (depends on API + Auth)

### Migration Strategy

- Prisma migrations run after database deployment
- Seed script populates test data
- Zero-downtime migrations (additive changes only)

### Frontend Deployment

- Build Next.js static export
- Upload to S3 via CDK
- Invalidate CloudFront cache
- Automatic via CDK deployment

