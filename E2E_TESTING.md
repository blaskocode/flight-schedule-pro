# End-to-End Testing Guide

This guide provides step-by-step procedures to verify all success criteria for Flight Schedule Pro.

## Prerequisites

1. All stacks deployed (`./scripts/deploy-all.sh`)
2. Database migrated and seeded (`./scripts/migrate-db.sh` and `./scripts/seed-db.sh`)
3. Frontend deployed (`./scripts/deploy-frontend.sh`)
4. Test user account created in Cognito

## Test Environment Setup

### 1. Get Stack Outputs

```bash
# Get API URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name FlightSchedulePro-Api \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

# Get Frontend URL
FRONTEND_URL=$(aws cloudformation describe-stacks \
  --stack-name FlightSchedulePro-Frontend \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionUrl`].OutputValue' \
  --output text)

# Get Cognito User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name FlightSchedulePro-Auth \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

echo "API URL: $API_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "User Pool ID: $USER_POOL_ID"
```

### 2. Create Test User

```bash
# Create test user via AWS CLI
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username testuser \
  --user-attributes Name=email,Value=test@example.com Name=email_verified,Value=true \
  --temporary-password TempPass123! \
  --message-action SUPPRESS

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username testuser \
  --password TestPass123! \
  --permanent
```

## Success Criteria Checklist

### ✅ Infrastructure Tests

#### Test 1: All Stacks Deployed
```bash
# Verify all stacks exist
aws cloudformation describe-stacks --stack-name FlightSchedulePro-Database
aws cloudformation describe-stacks --stack-name FlightSchedulePro-Secrets
aws cloudformation describe-stacks --stack-name FlightSchedulePro-Auth
aws cloudformation describe-stacks --stack-name FlightSchedulePro-Api
aws cloudformation describe-stacks --stack-name FlightSchedulePro-Frontend
```

**Expected**: All stacks show `StackStatus: CREATE_COMPLETE` or `UPDATE_COMPLETE`

#### Test 2: RDS Accessible and Seeded
```bash
# Check database connection (via Lambda)
curl -X POST "${API_URL}/admin/migrate" \
  -H "Authorization: Bearer ${TOKEN}"

# Verify seed data
curl -X POST "${API_URL}/admin/seed" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected**: Migrations and seeding complete successfully

#### Test 3: Cognito User Pool Configured
```bash
# List users
aws cognito-idp list-users --user-pool-id $USER_POOL_ID
```

**Expected**: User pool exists and can list users

#### Test 4: API Gateway Working
```bash
# Test API endpoint (should return 401 without auth, which is expected)
curl "${API_URL}/flights"
```

**Expected**: Returns 401 Unauthorized (proves API is accessible)

#### Test 5: Lambda Functions Deployed
```bash
# List Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `FlightSchedulePro`)].FunctionName'
```

**Expected**: All Lambda functions listed (7+ functions)

#### Test 6: EventBridge Rule Created
```bash
# List EventBridge rules
aws events list-rules --name-prefix FlightSchedulePro
```

**Expected**: Hourly weather check rule exists

#### Test 7: CloudFront Serving Frontend
```bash
# Test CloudFront URL
curl -I "$FRONTEND_URL"
```

**Expected**: Returns 200 OK with HTML content

### ✅ Functionality Tests

#### Test 8: User Can Sign Up and Login

**Manual Test:**
1. Navigate to `$FRONTEND_URL`
2. Click "Sign Up"
3. Create new account
4. Verify email (if required)
5. Log in with credentials

**Expected**: User successfully signs up and logs in

#### Test 9: Dashboard Shows Flights

**Manual Test:**
1. Log in to dashboard
2. View flights list

**API Test:**
```bash
# Get flights (requires auth token)
curl "${API_URL}/flights" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected**: 
- Dashboard displays flights
- API returns JSON with flights array
- Each flight shows student, instructor, aircraft, time

#### Test 10: Weather Check Returns SAFE/UNSAFE

**API Test:**
```bash
# Get a flight ID first
FLIGHT_ID=$(curl -s "${API_URL}/flights" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r '.flights[0].id')

# Check weather
curl -X POST "${API_URL}/weather/check" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"flightId\": \"${FLIGHT_ID}\"}"
```

**Expected**: 
- Returns weather check with `result: "SAFE"` or `"UNSAFE"`
- Includes visibility, ceiling, windSpeed, conditions
- Includes reasons array if UNSAFE

#### Test 11: AI Generates Exactly 3 Options

**API Test:**
```bash
# Generate reschedule options
curl -X POST "${API_URL}/reschedule/generate" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"flightId\": \"${FLIGHT_ID}\"}"
```

**Expected**:
- Returns reschedule request with exactly 3 suggestions
- Each suggestion has: slot, priority, reasoning, weatherForecast, confidence
- Priorities are 1, 2, 3
- Confidences are "high", "medium", or "low"

#### Test 12: Hourly Job Runs Automatically

**Manual Test:**
1. Wait for next hour (or trigger manually via EventBridge)
2. Check CloudWatch Logs for hourly-weather-check function
3. Verify flights were checked

**CloudWatch Test:**
```bash
# Get function name
FUNCTION_NAME=$(aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `hourly-weather-check`)].FunctionName' \
  --output text)

# View recent logs
aws logs tail "/aws/lambda/${FUNCTION_NAME}" --since 1h
```

**Expected**: 
- Function executes every hour
- Logs show weather checks for flights in next 24h
- Unsafe flights are cancelled and emails sent

#### Test 13: Training Level Minimums Enforced

**Test EARLY_STUDENT:**
- Create flight with EARLY_STUDENT
- Weather check with visibility < 10 SM should return UNSAFE
- Weather check with ceiling < 3000 ft should return UNSAFE

**Test PRIVATE_PILOT:**
- Create flight with PRIVATE_PILOT
- Weather check with visibility < 3 SM should return UNSAFE
- Weather check with ceiling < 1000 ft should return UNSAFE

**Test INSTRUMENT_RATED:**
- Create flight with INSTRUMENT_RATED
- Weather check should allow lower visibility/ceiling
- Only wind speed > 25 knots should be UNSAFE

#### Test 14: Email Notifications Sent

**Manual Test:**
1. Trigger weather cancellation (unsafe weather detected)
2. Check email inbox for cancellation notification
3. Verify reschedule options email received
4. Select option and verify instructor notification
5. Approve and verify confirmation emails

**SES Test:**
```bash
# Check SES sending statistics
aws ses get-send-statistics
```

**Expected**: 
- Emails sent for weather cancellation
- Emails sent with 3 reschedule options
- Emails sent for instructor approval request
- Confirmation emails sent to both parties

#### Test 15: Reschedule Workflow Complete

**End-to-End Test:**
1. Create flight scheduled for tomorrow
2. Manually trigger weather check (or wait for hourly job)
3. If unsafe, verify cancellation email
4. Verify reschedule options email with 3 options
5. Select option via API or frontend
6. Verify instructor receives approval email
7. Approve via API or frontend
8. Verify new flight created
9. Verify original flight marked as RESCHEDULED
10. Verify confirmation emails sent

**API Test:**
```bash
# 1. Select option
curl -X POST "${API_URL}/reschedule/select" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"rescheduleRequestId\": \"${REQUEST_ID}\", \"selectedOption\": 0}"

# 2. Approve
curl -X POST "${API_URL}/reschedule/approve" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"rescheduleRequestId\": \"${REQUEST_ID}\", \"approved\": true}"
```

**Expected**: 
- Complete workflow executes successfully
- All status transitions correct
- New flight created with correct details
- All parties notified

### ✅ Code Quality Tests

#### Test 16: All TypeScript Compiles
```bash
# Frontend
cd frontend && npm run build

# Backend (check each function)
cd backend/functions/flights/list && npm run build

# Infrastructure
cd infrastructure && npm run build
```

**Expected**: No TypeScript compilation errors

#### Test 17: No Console Errors

**Manual Test:**
1. Open browser DevTools
2. Navigate through application
3. Check Console tab

**Expected**: No JavaScript errors in console

#### Test 18: Prisma Schema Matches PRD

**Manual Review:**
1. Compare `backend/prisma/schema.prisma` with PRD requirements
2. Verify all 7 tables exist
3. Verify all required fields present

**Expected**: Schema matches PRD exactly

#### Test 19: Environment Variables Configured

```bash
# Check Lambda environment variables
aws lambda get-function-configuration \
  --function-name <function-name> \
  --query 'Environment.Variables'
```

**Expected**: 
- DATABASE_SECRET_ARN set
- REDIS_ENDPOINT set
- OPENAI_API_KEY set (in Secrets Manager)
- WEATHER_API_KEY set (in Secrets Manager)

#### Test 20: Documentation Complete

**Check Files:**
- [x] README.md
- [x] PRD.md
- [x] tasks.md
- [x] ARCHITECTURE_DIAGRAMS.md
- [x] AWS_deployment_guide.md
- [x] API_DOCUMENTATION.md
- [x] E2E_TESTING.md (this file)

**Expected**: All documentation files present and complete

## Automated Testing Script

Create a test script to run all API tests:

```bash
#!/bin/bash
# scripts/test-api.sh

set -e

API_URL=$1
TOKEN=$2

if [ -z "$API_URL" ] || [ -z "$TOKEN" ]; then
  echo "Usage: ./scripts/test-api.sh <API_URL> <COGNITO_TOKEN>"
  exit 1
fi

echo "Testing API endpoints..."

# Test flights list
echo "Testing GET /flights..."
curl -s "${API_URL}/flights" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

# Test weather check
echo "Testing POST /weather/check..."
FLIGHT_ID=$(curl -s "${API_URL}/flights" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r '.flights[0].id')

curl -s -X POST "${API_URL}/weather/check" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"flightId\": \"${FLIGHT_ID}\"}" | jq '.'

echo "✅ API tests complete"
```

## Performance Tests

### Response Time Targets

- API Gateway: < 1 second
- Lambda cold start: < 3 seconds
- Lambda warm: < 500ms
- Frontend load: < 2 seconds
- Weather check: < 5 seconds
- AI reschedule generation: < 30 seconds

### Load Testing

```bash
# Simple load test with Apache Bench
ab -n 100 -c 10 -H "Authorization: Bearer ${TOKEN}" \
  "${API_URL}/flights"
```

## Security Tests

### Test 1: Authentication Required
```bash
# Should return 401
curl "${API_URL}/flights"
```

### Test 2: Invalid Token Rejected
```bash
# Should return 401
curl "${API_URL}/flights" \
  -H "Authorization: Bearer invalid-token"
```

### Test 3: CORS Configuration
```bash
# Check CORS headers
curl -I -X OPTIONS "${API_URL}/flights" \
  -H "Origin: ${FRONTEND_URL}" \
  -H "Access-Control-Request-Method: GET"
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Token expired or invalid
   - Solution: Get new token from Cognito

2. **500 Internal Server Error**: Check CloudWatch Logs
   ```bash
   aws logs tail /aws/lambda/<function-name> --follow
   ```

3. **Database Connection Error**: Check VPC configuration
   - Verify Lambda is in VPC
   - Verify security groups allow access

4. **Frontend Not Loading**: Check CloudFront cache
   - Invalidate cache: `./scripts/deploy-frontend.sh`

## Test Report Template

After completing all tests, document results:

```markdown
# Test Report - [Date]

## Infrastructure: ✅ / 7
- [x] All stacks deployed
- [x] RDS accessible
- [x] Cognito configured
- [x] API Gateway working
- [x] Lambda functions deployed
- [x] EventBridge rule created
- [x] CloudFront serving frontend

## Functionality: ✅ / 8
- [x] User signup/login
- [x] Dashboard shows flights
- [x] Weather check works
- [x] AI generates 3 options
- [x] Hourly job runs
- [x] Training levels enforced
- [x] Email notifications sent
- [x] Reschedule workflow complete

## Code Quality: ✅ / 5
- [x] TypeScript compiles
- [x] No console errors
- [x] Schema matches PRD
- [x] Environment variables set
- [x] Documentation complete

**Overall: ✅ 20/20 Tests Passing**
```

