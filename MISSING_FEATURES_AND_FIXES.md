# Missing Features and CORS Fix Plan

## Critical Issue: CORS Still Failing

**Problem**: Even though Lambda functions have CORS headers, API Gateway isn't passing them through correctly.

**Root Cause**: API Gateway needs explicit CORS configuration on each method, and Lambda integration might be stripping headers.

**Solution**: Need to ensure API Gateway CORS is properly configured AND Lambda returns headers correctly.

## Missing Features from PRD

### 1. Dashboard UI Features (PRD Section 6.5)

#### Student Dashboard Missing:
- ❌ **"View Details" button** - Should show full flight details modal
- ❌ **"Weather Briefing" button** - Should show detailed weather forecast
- ❌ **Route information** - Currently only shows departure airport, should show "KAUS → KHYI → KAUS"
- ❌ **Weather percentage/confidence** - Should show "Potential Issues (70%)" or similar
- ❌ **Weather forecast summary** - Should show forecasted conditions, not just current

#### Admin Dashboard Missing (Entire Section):
- ❌ **Weather Impact Statistics** - Total flights, cancellations, reschedule rate, revenue protected
- ❌ **Upcoming Flights List** - Next 48 hours with weather status
- ❌ **Manual Weather Refresh** button (global, refreshes all flights)
- ❌ **Export Report** functionality

### 2. Book Flight Form Issues

**Current Problems**:
- ❌ Manual ID entry (should have dropdowns)
- ❌ No API endpoints to fetch students, instructors, aircraft
- ❌ No validation of availability
- ❌ No user-friendly interface

**Needed**:
- ✅ API endpoints: GET /students, GET /instructors, GET /aircraft
- ✅ Dropdown selects instead of text inputs
- ✅ Availability checking before booking
- ✅ Better error messages

### 3. Weather Display Enhancements

**Missing**:
- ❌ Weather forecast (not just current conditions)
- ❌ Weather percentage/risk level
- ❌ Detailed weather briefing view
- ❌ Historical weather checks

## Implementation Plan

### Phase 1: Fix CORS (CRITICAL)

1. **Check API Gateway CORS Configuration**
   - Verify OPTIONS method exists for each endpoint
   - Ensure CORS headers are in integration responses
   - Test preflight requests

2. **Fix Lambda Response Headers**
   - Ensure all Lambda functions return CORS headers
   - Handle OPTIONS requests in Lambda (if needed)
   - Test with actual CloudFront origin

3. **Verify Deployment**
   - Redeploy API stack
   - Test from browser console
   - Check CloudWatch logs

### Phase 2: Add Missing API Endpoints

1. **Create Resource List Endpoints**:
   - `GET /students` - List all students
   - `GET /instructors` - List all instructors  
   - `GET /aircraft` - List all aircraft
   - `GET /schools` - List all schools

2. **Create Weather Endpoints**:
   - `GET /weather/forecast/:airport` - Get weather forecast
   - `GET /weather/briefing/:flightId` - Get detailed weather briefing

3. **Create Admin Endpoints**:
   - `GET /admin/stats` - Get weather impact statistics
   - `GET /admin/flights/upcoming` - Get upcoming flights (48h)
   - `POST /admin/weather/refresh-all` - Refresh all flight weather

### Phase 3: Enhance Dashboard UI

1. **Flight Card Enhancements**:
   - Add "View Details" button → Modal with full flight info
   - Add "Weather Briefing" button → Modal with detailed forecast
   - Show route information (if available in data)
   - Show weather confidence/percentage

2. **Book Flight Form Improvements**:
   - Replace text inputs with dropdowns
   - Fetch students/instructors/aircraft from API
   - Add availability checking
   - Better validation and error messages

3. **Add Admin Dashboard** (if user is admin):
   - Weather Impact statistics card
   - Upcoming flights list
   - Manual refresh button
   - Export report button

### Phase 4: Weather Display Enhancements

1. **Weather Forecast Display**:
   - Show forecast for flight time (not just current)
   - Display weather confidence/risk percentage
   - Show historical weather checks

2. **Weather Briefing Modal**:
   - Detailed forecast breakdown
   - Training level minimums comparison
   - Safety assessment
   - Recommendations

## Priority Order

1. **URGENT**: Fix CORS - Nothing works without this
2. **HIGH**: Add resource list endpoints (students, instructors, aircraft)
3. **HIGH**: Improve Book Flight form with dropdowns
4. **MEDIUM**: Add "View Details" and "Weather Briefing" buttons
5. **MEDIUM**: Add weather forecast display
6. **LOW**: Admin dashboard (can be added later)

## Files to Create/Modify

### Backend (Lambda Functions):
- `backend/functions/students/list/index.ts` - NEW
- `backend/functions/instructors/list/index.ts` - NEW
- `backend/functions/aircraft/list/index.ts` - NEW
- `backend/functions/weather/forecast/index.ts` - NEW
- `backend/functions/weather/briefing/index.ts` - NEW
- `backend/functions/admin/stats/index.ts` - NEW
- `backend/functions/flights/list/index.ts` - UPDATE (fix CORS)
- `backend/functions/flights/create/index.ts` - UPDATE (fix CORS)

### Frontend:
- `frontend/src/app/dashboard/page.tsx` - UPDATE (add missing features)
- `frontend/src/components/flights/FlightDetailsModal.tsx` - NEW
- `frontend/src/components/flights/WeatherBriefingModal.tsx` - NEW
- `frontend/src/components/admin/AdminDashboard.tsx` - NEW
- `frontend/src/lib/api-client.ts` - UPDATE (add new endpoints)

### Infrastructure:
- `infrastructure/lib/api-stack.ts` - UPDATE (add new routes, fix CORS)

