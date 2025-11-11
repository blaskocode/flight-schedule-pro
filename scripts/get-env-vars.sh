#!/bin/bash
# Get environment variables for frontend deployment
# Usage: ./scripts/get-env-vars.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}📋 Getting Environment Variables${NC}"
echo ""

# Get API URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name FlightSchedulePro-Api \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text 2>/dev/null || echo "NOT_DEPLOYED")

# Get User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name FlightSchedulePro-Auth \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text 2>/dev/null || echo "NOT_DEPLOYED")

# Get User Pool Client ID
USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name FlightSchedulePro-Auth \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text 2>/dev/null || echo "NOT_DEPLOYED")

echo -e "${YELLOW}Add these to your environment or .env.local:${NC}"
echo ""
echo "export NEXT_PUBLIC_API_URL=\"${API_URL}\""
echo "export NEXT_PUBLIC_USER_POOL_ID=\"${USER_POOL_ID}\""
echo "export NEXT_PUBLIC_USER_POOL_CLIENT_ID=\"${USER_POOL_CLIENT_ID}\""
echo ""
echo -e "${YELLOW}Or create frontend/.env.local with:${NC}"
echo ""
echo "NEXT_PUBLIC_API_URL=${API_URL}"
echo "NEXT_PUBLIC_USER_POOL_ID=${USER_POOL_ID}"
echo "NEXT_PUBLIC_USER_POOL_CLIENT_ID=${USER_POOL_CLIENT_ID}"
echo ""

