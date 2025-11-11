# Fix CORS and Deploy Frontend Changes

## Issues Identified

1. **CORS Error**: API Gateway is blocking requests from CloudFront origin
2. **502 Bad Gateway**: Lambda functions may be failing or not returning proper CORS headers
3. **Frontend Changes Not Visible**: New features (Book Flight, Weather Alerts) need to be rebuilt and deployed

## Solution Steps

### Step 1: Fix CORS in Lambda Functions ✅

I've updated the Lambda functions to return proper CORS headers:
- ✅ `backend/functions/flights/list/index.ts` - Added CORS headers
- ✅ `backend/functions/flights/create/index.ts` - Added CORS headers

### Step 2: Update API Gateway CORS Configuration ✅ DONE

The API Gateway needs to know your CloudFront URL. I've already deployed it with:

```bash
cd infrastructure
cdk deploy FlightSchedulePro-Api --context frontendOrigin="https://db62n67tl6hkc.cloudfront.net" --require-approval never
```

✅ **API stack deployed successfully!** The CORS configuration now includes your CloudFront origin.

### Step 3: Rebuild and Deploy Frontend

The frontend changes (Book Flight button, Weather Alerts section) need to be built and deployed:

```bash
# Build the frontend
cd frontend
npm run build

# Deploy to S3 and invalidate CloudFront cache
cd ..
./scripts/deploy-frontend.sh
```

### Step 4: Redeploy Lambda Functions

After updating the Lambda code, you need to redeploy:

```bash
cd infrastructure
cdk deploy FlightSchedulePro-Api --require-approval never
```

## Quick Fix Command Sequence

✅ **Step 1 & 4 DONE**: API stack deployed with CORS fixes

Run these remaining commands:

```bash
# 2. Rebuild frontend (to include new Book Flight and Weather Alerts features)
cd frontend
npm run build
cd ..

# 3. Deploy frontend to S3/CloudFront
./scripts/deploy-frontend.sh
```

**Note**: The API stack has already been deployed with:
- ✅ CORS headers in Lambda functions
- ✅ CORS configuration with your CloudFront origin
- ✅ Updated Lambda code with proper error handling

## Verification

After deployment:

1. **Check CORS**: Open browser console, the CORS error should be gone
2. **Check Features**: 
   - You should see "+ Book Flight" button in dashboard
   - You should see "🔴 Active Weather Alerts" section if there are unsafe flights
3. **Check API**: Try loading flights - should work without 502 errors

## Troubleshooting

### If CORS still fails:

1. Check CloudFront URL matches exactly (including `https://`)
2. Verify API Gateway CORS configuration in AWS Console
3. Check Lambda function logs in CloudWatch for errors

### If 502 errors persist:

1. Check Lambda function logs in CloudWatch
2. Verify database connection (Lambda needs VPC access)
3. Check Lambda timeout settings (may need to increase)

### If frontend changes don't appear:

1. Clear browser cache (hard refresh: Cmd+Shift+R or Ctrl+Shift+R)
2. Verify CloudFront cache invalidation completed
3. Check that `frontend/out/` directory has the new files

## Notes

- CORS headers are now included in all Lambda responses
- The `getCorsHeaders()` helper function reads the origin from request headers
- API Gateway preflight OPTIONS requests are handled automatically
- Frontend must be rebuilt after code changes (Next.js static export)

