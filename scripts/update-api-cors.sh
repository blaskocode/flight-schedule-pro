#!/bin/bash
# Update API Gateway CORS configuration with CloudFront origin
# Usage: ./scripts/update-api-cors.sh [cloudfront-url]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get CloudFront URL from argument or fetch from CloudFormation
if [ -n "$1" ]; then
  CLOUDFRONT_URL="$1"
else
  echo -e "${YELLOW}⚠️  CloudFront URL not provided, fetching from CloudFormation...${NC}"
  CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name FlightSchedulePro-Frontend \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionUrl`].OutputValue' \
    --output text 2>/dev/null || echo "")
  
  if [ -z "$CLOUDFRONT_URL" ]; then
    echo -e "${RED}❌ Error: Could not get CloudFront URL. Please provide it as an argument:${NC}"
    echo -e "${YELLOW}   ./scripts/update-api-cors.sh https://your-cloudfront-url.cloudfront.net${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}✓ Using CloudFront URL: ${CLOUDFRONT_URL}${NC}"

# Deploy API stack with the CloudFront origin
echo -e "${YELLOW}🚀 Deploying API stack with CORS configuration...${NC}"
cd infrastructure
cdk deploy FlightSchedulePro-Api --context frontendOrigin="${CLOUDFRONT_URL}" --require-approval never

echo ""
echo -e "${GREEN}✅ API Gateway CORS configuration updated!${NC}"
echo -e "${GREEN}🌐 Frontend origin: ${CLOUDFRONT_URL}${NC}"
echo ""
echo -e "${YELLOW}Note: It may take a few minutes for the changes to propagate${NC}"

cd ..
