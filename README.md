# Flight Schedule Pro - AI Rescheduler

AWS-hosted web application that automatically detects bad weather conditions for flight lessons and uses AI to suggest 3 optimized rescheduling options.

## Project Structure

```
flight-schedule-pro/
├── frontend/              # Next.js static export
├── backend/               # Lambda functions + Prisma
│   ├── functions/         # Lambda handlers
│   ├── shared/           # Utilities
│   └── prisma/           # Schema + migrations
├── infrastructure/        # AWS CDK
└── scripts/              # Deployment scripts
```

## Tech Stack

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

## Getting Started

### Prerequisites

- Node.js 20+
- AWS CLI v2
- AWS CDK
- Docker (for Lambda layers)

### Installation

```bash
# Install root dependencies
npm install

# Install workspace dependencies
npm install --workspace=frontend
npm install --workspace=backend
npm install --workspace=infrastructure
```

## Quick Start

### 1. Configure AWS

```bash
# Configure AWS credentials
aws configure

# Set required API keys
export WEATHER_API_KEY="your-weather-api-key"
export OPENAI_API_KEY="your-openai-api-key"
```

### 2. Deploy Infrastructure

```bash
# Deploy all AWS stacks
./scripts/deploy-all.sh
```

This deploys:
- Database (RDS PostgreSQL, ElastiCache Redis)
- Secrets (API keys)
- Auth (Cognito User Pool)
- API (API Gateway, Lambda functions, EventBridge)
- Frontend (S3, CloudFront)

### 3. Initialize Database

```bash
# Run migrations
./scripts/migrate-db.sh

# Seed with test data
./scripts/seed-db.sh
```

### 4. Deploy Frontend

```bash
# Get environment variables
./scripts/get-env-vars.sh

# Set environment variables (or add to frontend/.env.local)
export NEXT_PUBLIC_API_URL="https://your-api-id.execute-api.us-east-1.amazonaws.com/prod"
export NEXT_PUBLIC_USER_POOL_ID="us-east-1_xxxxx"
export NEXT_PUBLIC_USER_POOL_CLIENT_ID="xxxxx"

# Deploy frontend
./scripts/deploy-frontend.sh
```

### 5. Access Application

The CloudFront URL will be displayed after deployment, or get it with:

```bash
aws cloudformation describe-stacks \
  --stack-name FlightSchedulePro-Frontend \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionUrl`].OutputValue' \
  --output text
```

## Development

See `tasks.md` for complete implementation guide.

## Deployment Scripts

All deployment scripts are in the `scripts/` directory:

- `deploy-all.sh` - Deploy all AWS stacks
- `deploy-frontend.sh` - Build and deploy frontend to S3/CloudFront
- `migrate-db.sh` - Run database migrations
- `seed-db.sh` - Seed database with test data
- `get-env-vars.sh` - Get environment variables for frontend

## Documentation

- `DEPLOYMENT_SUMMARY.md` - **Quick start deployment guide** ⭐
- `PROJECT_COMPLETION_CHECKLIST.md` - **Pre-deployment verification checklist** ✅
- `PRD.md` - Product requirements
- `tasks.md` - Complete task breakdown (5-day implementation guide)
- `ARCHITECTURE_DIAGRAMS.md` - System architecture diagrams
- `AWS_deployment_guide.md` - Detailed deployment instructions
- `API_DOCUMENTATION.md` - Complete API reference
- `E2E_TESTING.md` - End-to-end testing guide

## Testing

See `E2E_TESTING.md` for complete testing procedures.

## Project Status

✅ **100% Complete**: All 30 tasks across 5 days finished  
- ✅ Day 1: Foundation (Project setup, database, infrastructure)
- ✅ Day 2: AWS Infrastructure (RDS, Cognito, etc.)
- ✅ Day 3: Backend Functions (Weather, AI, CRUD)
- ✅ Day 4: API Gateway and Frontend Integration
- ✅ Day 5: Deployment & Polish (Scripts, Documentation, Testing)

**Ready for deployment!** 

📖 **Start Here**: `DEPLOYMENT_SUMMARY.md` - Quick deployment guide  
✅ **Verify First**: `PROJECT_COMPLETION_CHECKLIST.md` - Pre-deployment checklist  
📋 **Full Summary**: `FINAL_SUMMARY.md` - Complete project overview

## License

UNLICENSED

