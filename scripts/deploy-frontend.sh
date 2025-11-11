#!/bin/bash
# Deploy Frontend to S3 and CloudFront
# Usage: ./scripts/deploy-frontend.sh [distribution-id]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Deploying Frontend${NC}"

# Auto-fetch environment variables if not set
if [ -z "$NEXT_PUBLIC_API_URL" ]; then
  echo -e "${YELLOW}⚠️  NEXT_PUBLIC_API_URL not set, fetching from CloudFormation...${NC}"
  export NEXT_PUBLIC_API_URL=$(aws cloudformation describe-stacks \
    --stack-name FlightSchedulePro-Api \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text 2>/dev/null || echo "")
  
  if [ -z "$NEXT_PUBLIC_API_URL" ]; then
    echo -e "${RED}❌ Error: Could not get API URL. Is the API stack deployed?${NC}"
    exit 1
  fi
fi

if [ -z "$NEXT_PUBLIC_USER_POOL_ID" ]; then
  echo -e "${YELLOW}⚠️  NEXT_PUBLIC_USER_POOL_ID not set, fetching from CloudFormation...${NC}"
  export NEXT_PUBLIC_USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name FlightSchedulePro-Auth \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text 2>/dev/null || echo "")
  
  if [ -z "$NEXT_PUBLIC_USER_POOL_ID" ]; then
    echo -e "${RED}❌ Error: Could not get User Pool ID. Is the Auth stack deployed?${NC}"
    exit 1
  fi
fi

if [ -z "$NEXT_PUBLIC_USER_POOL_CLIENT_ID" ]; then
  echo -e "${YELLOW}⚠️  NEXT_PUBLIC_USER_POOL_CLIENT_ID not set, fetching from CloudFormation...${NC}"
  export NEXT_PUBLIC_USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name FlightSchedulePro-Auth \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
    --output text 2>/dev/null || echo "")
  
  if [ -z "$NEXT_PUBLIC_USER_POOL_CLIENT_ID" ]; then
    echo -e "${RED}❌ Error: Could not get User Pool Client ID. Is the Auth stack deployed?${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}✓ Environment variables configured${NC}"

# Get S3 bucket name from CloudFormation
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name FlightSchedulePro-Frontend \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text 2>/dev/null || echo "")

if [ -z "$BUCKET_NAME" ]; then
  echo -e "${YELLOW}⚠️  Frontend stack not deployed. Deploying now...${NC}"
  cd infrastructure
  cdk deploy FlightSchedulePro-Frontend --require-approval never
  cd ..
  
  BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name FlightSchedulePro-Frontend \
    --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
    --output text)
fi

echo -e "${GREEN}✓ Using S3 bucket: ${BUCKET_NAME}${NC}"

# Get CloudFront distribution ID
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name FlightSchedulePro-Frontend \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
  --output text 2>/dev/null || echo "")

if [ -z "$DISTRIBUTION_ID" ]; then
  echo -e "${RED}❌ Error: Could not get CloudFront distribution ID${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Using CloudFront distribution: ${DISTRIBUTION_ID}${NC}"

# Build frontend
echo -e "${YELLOW}📦 Building frontend...${NC}"
cd frontend

# Export environment variables for Next.js build
export NEXT_PUBLIC_API_URL
export NEXT_PUBLIC_USER_POOL_ID
export NEXT_PUBLIC_USER_POOL_CLIENT_ID

npm run build

if [ ! -d "out" ]; then
  echo -e "${RED}❌ Error: Build output directory 'out' not found${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Build complete${NC}"

# Sync to S3
echo -e "${YELLOW}📤 Uploading to S3...${NC}"
aws s3 sync out/ s3://${BUCKET_NAME}/ --delete

echo -e "${GREEN}✓ Upload complete${NC}"

# Invalidate CloudFront cache
echo -e "${YELLOW}🔄 Invalidating CloudFront cache...${NC}"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo -e "${GREEN}✓ Cache invalidation created: ${INVALIDATION_ID}${NC}"
echo -e "${YELLOW}⏳ Cache invalidation may take 5-15 minutes to complete${NC}"

# Get CloudFront URL
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
  --stack-name FlightSchedulePro-Frontend \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionUrl`].OutputValue' \
  --output text)

echo ""
echo -e "${GREEN}✅ Frontend deployed successfully!${NC}"
echo -e "${GREEN}🌐 URL: ${CLOUDFRONT_URL}${NC}"
echo ""
echo -e "${YELLOW}Note: It may take a few minutes for changes to propagate through CloudFront${NC}"

cd ..

