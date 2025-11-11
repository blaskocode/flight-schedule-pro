#!/bin/bash
# Run database migrations via Lambda function
# Usage: ./scripts/migrate-db.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🗄️  Running Database Migrations${NC}"

# Get API URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name FlightSchedulePro-Api \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text 2>/dev/null || echo "")

if [ -z "$API_URL" ]; then
  echo -e "${RED}❌ Error: API stack not deployed${NC}"
  echo "Deploy the API stack first: cd infrastructure && cdk deploy FlightSchedulePro-Api"
  exit 1
fi

# Get Cognito token (requires user to be logged in)
echo -e "${YELLOW}⚠️  Note: This requires admin authentication${NC}"
echo -e "${YELLOW}   You may need to call the API directly with Cognito credentials${NC}"

# Call migrate endpoint
echo -e "${YELLOW}📤 Calling migrate endpoint...${NC}"

RESPONSE=$(curl -s -X POST "${API_URL}/admin/migrate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${COGNITO_TOKEN:-}" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Migrations completed successfully${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo -e "${RED}❌ Migration failed (HTTP $HTTP_CODE)${NC}"
  echo "$BODY"
  exit 1
fi

echo ""
echo -e "${YELLOW}Note: If you get authentication errors, you may need to:${NC}"
echo "1. Get a Cognito ID token"
echo "2. Set COGNITO_TOKEN environment variable"
echo "3. Or call the endpoint directly from the AWS Console Lambda function"

