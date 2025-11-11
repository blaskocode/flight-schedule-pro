# Technical Context: Flight Schedule Pro

## Technology Stack

### Frontend Stack

**Core Framework**:
- **React 18**: UI library
- **TypeScript**: Type safety
- **Next.js 14**: Framework with static export capability
- **TailwindCSS**: Utility-first CSS with custom aviation theme

**State Management**:
- **TanStack Query (React Query)**: Server state management
- **React Context**: Client-side auth state

**Date Handling**:
- **date-fns**: Date formatting and manipulation

**Authentication**:
- **amazon-cognito-identity-js**: Cognito SDK for browser
- **@aws-sdk/client-cognito-identity-provider**: Additional Cognito utilities

**Deployment**:
- **AWS S3**: Static file hosting
- **AWS CloudFront**: CDN distribution
- **Static Export**: Next.js `output: 'export'` mode

### Backend Stack

**Runtime**:
- **Node.js 20**: Lambda runtime
- **TypeScript**: Type safety throughout

**Database**:
- **Prisma ORM**: Type-safe database client
- **PostgreSQL 15.4**: RDS database engine
- **Prisma Client**: Generated type-safe queries

**Caching**:
- **Redis 7**: ElastiCache for session data
- **ioredis**: Redis client library

**AI Integration**:
- **Vercel AI SDK** (`ai` package): Structured output library
- **@ai-sdk/openai**: OpenAI provider for Vercel AI SDK
- **OpenAI GPT-4**: AI model for reschedule generation
- **Zod**: Schema validation for AI output

**Weather Integration**:
- **WeatherAPI.com**: Primary weather provider (1M calls/month free)
- **FAA Aviation Weather**: Fallback provider (unlimited free)
- **metar-taf-parser**: METAR parsing library (for FAA fallback)

**Email**:
- **AWS SES**: Email delivery service
- **@aws-sdk/client-ses**: SES client library

**Secrets**:
- **AWS Secrets Manager**: Secure credential storage
- **@aws-sdk/client-secrets-manager**: Secrets client

### Infrastructure Stack

**Infrastructure as Code**:
- **AWS CDK (TypeScript)**: Infrastructure definition
- **CloudFormation**: Generated deployment templates

**Compute**:
- **AWS Lambda**: Serverless functions (Node.js 20)
- **Lambda Layers**: Shared dependencies (Prisma, AWS SDK, Vercel AI SDK)

**API**:
- **AWS API Gateway**: REST API with Cognito authorizer
- **CORS**: Configured for frontend domain

**Database**:
- **AWS RDS PostgreSQL**: Managed database (t3.micro for dev)
- **AWS ElastiCache Redis**: Managed cache (t4g.micro for dev)

**Storage**:
- **AWS S3**: Static website hosting
- **S3 Bucket Deployment**: CDK construct for automatic deployment

**CDN**:
- **AWS CloudFront**: Global content delivery
- **Origin Access Identity**: Secure S3 access

**Authentication**:
- **AWS Cognito User Pools**: User authentication
- **Cognito User Pool Client**: Frontend integration
- **JWT Tokens**: Authorization tokens

**Scheduling**:
- **AWS EventBridge**: Hourly cron job trigger

**Monitoring**:
- **AWS CloudWatch**: Logs and metrics
- **CloudWatch Logs**: Lambda function logs
- **CloudWatch Metrics**: Performance monitoring

**Networking**:
- **AWS VPC**: Virtual private cloud
- **Public Subnets**: NAT Gateway for Lambda internet access
- **Private Subnets**: Lambda functions
- **Isolated Subnets**: RDS and Redis (no internet)
- **Security Groups**: Network access control
- **NAT Gateway**: Outbound internet for Lambda (optional: use VPC endpoints to save $32/month)

## Development Tools

### Required Tools

```bash
# Node.js 20+
node --version  # Should be v20.x.x

# AWS CLI v2
aws --version

# AWS CDK
cdk --version

# Docker (for Lambda layer builds)
docker --version
```

### Package Managers

- **npm**: Primary package manager
- **Workspaces**: Monorepo structure (frontend, backend, infrastructure)

### Build Tools

- **TypeScript Compiler**: Type checking and compilation
- **Next.js Build**: Static export generation
- **Prisma Generate**: Database client generation
- **CDK Synth**: CloudFormation template generation

## Environment Configuration

### Local Development

**Backend**:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/flightschedule"
REDIS_URL="redis://localhost:6379"
OPENAI_API_KEY="sk-your-key"
WEATHER_API_KEY="your-key"
WEATHER_PROVIDER="weatherapi"  # or "faa"
```

**Frontend**:
```bash
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
NEXT_PUBLIC_USER_POOL_ID="us-east-1_xxxxx"
NEXT_PUBLIC_USER_POOL_CLIENT_ID="xxxxxxxxxxxxx"
NEXT_PUBLIC_AWS_REGION="us-east-1"
```

### Production (AWS)

**Lambda Environment Variables** (set by CDK):
```bash
DATABASE_URL="postgresql://postgres:{{secret}}@rds-endpoint:5432/flightschedule"
REDIS_ENDPOINT="redis-endpoint.cache.amazonaws.com"
REDIS_PORT="6379"
OPENAI_SECRET_ARN="arn:aws:secretsmanager:..."
WEATHER_API_KEY="{{resolve:secretsmanager:...}}"
```

**Frontend Build-Time Variables** (in `.env.production`):
```bash
NEXT_PUBLIC_API_URL="https://xxx.execute-api.us-east-1.amazonaws.com/prod"
NEXT_PUBLIC_USER_POOL_ID="us-east-1_xxxxx"
NEXT_PUBLIC_USER_POOL_CLIENT_ID="xxxxxxxxxxxxx"
NEXT_PUBLIC_AWS_REGION="us-east-1"
```

## Key Dependencies

### Frontend Dependencies

```json
{
  "next": "14.x",
  "react": "18.x",
  "react-dom": "18.x",
  "typescript": "^5.x",
  "tailwindcss": "^3.x",
  "@tanstack/react-query": "^5.x",
  "date-fns": "^2.x",
  "amazon-cognito-identity-js": "^6.x",
  "@aws-sdk/client-cognito-identity-provider": "^3.x"
}
```

### Backend Dependencies (Lambda Layer)

```json
{
  "@prisma/client": "^5.x",
  "prisma": "^5.x",
  "@aws-sdk/client-ses": "^3.x",
  "@aws-sdk/client-secrets-manager": "^3.x",
  "ai": "^3.x",
  "@ai-sdk/openai": "^1.x",
  "zod": "^3.x",
  "ioredis": "^5.x",
  "metar-taf-parser": "^1.x"
}
```

### Infrastructure Dependencies

```json
{
  "aws-cdk-lib": "^2.x",
  "constructs": "^10.x",
  "typescript": "^5.x"
}
```

## API Keys & External Services

### Required API Keys

1. **OpenAI API Key**
   - Stored in AWS Secrets Manager
   - Used by AI Reschedule Lambda
   - Model: GPT-4

2. **WeatherAPI.com Key**
   - Stored in AWS Secrets Manager
   - Used by Weather Check Lambda
   - Free tier: 1M calls/month

3. **FAA Aviation Weather**
   - No API key required
   - Public government service
   - Used as fallback provider

### AWS Service Limits

**Free Tier Eligible**:
- RDS: 750 hours/month t3.micro
- ElastiCache: 750 hours/month t4g.micro
- Lambda: 1M requests/month
- API Gateway: 1M requests/month
- S3: 5GB storage
- CloudFront: 1TB transfer
- Cognito: 50K MAU
- SES: 62K emails/month

## Database Schema

### Prisma Configuration

```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-1.0.x"]  // Lambda compatibility
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Tables (7 total)

1. **School**: Flight school information
2. **Student**: Student profiles with training levels
3. **Instructor**: Instructor profiles
4. **Aircraft**: Aircraft inventory
5. **Flight**: Scheduled flights with status
6. **WeatherCheck**: Weather safety assessments
7. **RescheduleRequest**: AI reschedule options and workflow state

## Deployment Architecture

### CDK Stacks (5 total)

1. **DatabaseStack**: VPC, RDS, ElastiCache, Security Groups
2. **SecretsStack**: Secrets Manager for API keys
3. **AuthStack**: Cognito User Pool and Client
4. **ApiStack**: API Gateway, Lambda functions, EventBridge
5. **FrontendStack**: S3 bucket, CloudFront distribution

### Deployment Order

1. Database Stack (takes ~15 minutes for RDS)
2. Secrets Stack
3. Auth Stack
4. Run Prisma migrations
5. API Stack
6. Frontend Stack

## Development Workflow

### Local Development

1. Start local Postgres (Docker)
2. Start local Redis (Docker)
3. Run Prisma migrations
4. Seed database
5. Start Next.js dev server
6. Use local API endpoints or mock data

### Testing

- **Unit Tests**: Jest for Lambda functions
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Playwright for frontend flows

### Deployment

- **Manual**: Run `./scripts/deploy-all.sh`
- **CI/CD**: GitHub Actions workflow (`.github/workflows/deploy.yml`)
- **Incremental**: Update individual stacks as needed

## Performance Considerations

### Lambda Optimization

- **Memory**: 512MB default, 1024MB for AI functions
- **Timeout**: 30 seconds (5 minutes for hourly job)
- **Cold Starts**: Minimized with shared layer and singleton patterns
- **Connection Reuse**: Prisma client singleton

### Database Optimization

- **Indexes**: On frequently queried columns
- **Connection Pooling**: Prisma handles automatically
- **Read Replicas**: For scale (future enhancement)

### Frontend Optimization

- **Static Export**: Pre-rendered pages
- **CDN Caching**: CloudFront with long TTLs
- **Code Splitting**: Next.js automatic
- **Image Optimization**: Unoptimized for static export (use CloudFront)

## Security Considerations

### Authentication

- Cognito User Pools with JWT tokens
- API Gateway Cognito authorizer
- No API keys in frontend code

### Network Security

- VPC isolation for database
- Security groups restrict access
- HTTPS only (CloudFront redirects HTTP)

### Data Security

- Secrets in Secrets Manager (not environment variables)
- RDS encryption at rest
- No hardcoded credentials
- Input validation on all endpoints

### Compliance

- Audit trail in database (all actions logged)
- CloudWatch logs for debugging
- Secrets rotation capability

## Cost Optimization

### Development/Testing

- **Estimated**: ~$35-40/month
- Use free tier services
- Stop RDS when not in use (saves ~$15/month)

### Production

- **Estimated**: ~$150-250/month (moderate usage)
- Right-size Lambda memory
- Use CloudFront caching
- Consider VPC endpoints instead of NAT Gateway (saves $32/month)

## Monitoring & Debugging

### CloudWatch

- Lambda function logs
- API Gateway logs
- Custom metrics
- Alarms for errors

### Local Debugging

- `aws logs tail` for Lambda logs
- Prisma Studio for database inspection
- Next.js dev server with hot reload

