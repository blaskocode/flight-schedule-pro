#!/bin/bash
# Deploy all AWS stacks
# Usage: ./scripts/deploy-all.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Deploying All Stacks${NC}"

# Check AWS credentials
if ! aws sts get-caller-identity &>/dev/null; then
  echo -e "${RED}❌ Error: AWS credentials not configured${NC}"
  echo "Run: aws configure"
  exit 1
fi

# Check for required environment variables
if [ -z "$WEATHER_API_KEY" ]; then
  echo -e "${YELLOW}⚠️  Warning: WEATHER_API_KEY not set${NC}"
  echo "Weather API calls will fail. Set it with: export WEATHER_API_KEY=your-key"
fi

if [ -z "$OPENAI_API_KEY" ]; then
  echo -e "${YELLOW}⚠️  Warning: OPENAI_API_KEY not set${NC}"
  echo "AI rescheduling will fail. Set it with: export OPENAI_API_KEY=your-key"
fi

cd infrastructure

# Bootstrap CDK if needed
echo -e "${YELLOW}📦 Checking CDK bootstrap...${NC}"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_REGION:-us-east-1}

if ! aws cloudformation describe-stacks --stack-name CDKToolkit &>/dev/null; then
  echo -e "${YELLOW}⚠️  CDK not bootstrapped. Bootstrapping now...${NC}"
  cdk bootstrap aws://${ACCOUNT}/${REGION}
fi

# Deploy stacks in order
echo -e "${GREEN}📦 Deploying Database Stack...${NC}"
cdk deploy FlightSchedulePro-Database --require-approval never

echo -e "${GREEN}📦 Deploying Secrets Stack...${NC}"
cdk deploy FlightSchedulePro-Secrets --require-approval never

echo -e "${GREEN}📦 Deploying Auth Stack...${NC}"
cdk deploy FlightSchedulePro-Auth --require-approval never

echo -e "${GREEN}📦 Deploying API Stack...${NC}"
cdk deploy FlightSchedulePro-Api --require-approval never

echo -e "${GREEN}📦 Deploying Frontend Stack...${NC}"
cdk deploy FlightSchedulePro-Frontend --require-approval never

cd ..

echo ""
echo -e "${GREEN}✅ All stacks deployed successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run database migrations: ./scripts/migrate-db.sh"
echo "2. Seed database: ./scripts/seed-db.sh"
echo "3. Deploy frontend: ./scripts/deploy-frontend.sh"
echo ""
echo -e "${YELLOW}Get stack outputs:${NC}"
echo "  aws cloudformation describe-stacks --stack-name FlightSchedulePro-Api --query 'Stacks[0].Outputs'"
echo "  aws cloudformation describe-stacks --stack-name FlightSchedulePro-Auth --query 'Stacks[0].Outputs'"
echo "  aws cloudformation describe-stacks --stack-name FlightSchedulePro-Frontend --query 'Stacks[0].Outputs'"

