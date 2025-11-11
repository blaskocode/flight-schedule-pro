# Flight Schedule Pro - API Documentation

## Base URL

The API base URL is provided as a CloudFormation output after deploying the API stack:

```bash
aws cloudformation describe-stacks \
  --stack-name FlightSchedulePro-Api \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text
```

## Authentication

All endpoints (except admin endpoints) require authentication via AWS Cognito. Include the ID token in the Authorization header:

```
Authorization: Bearer <cognito-id-token>
```

### Getting a Token

1. Sign up or log in via the frontend
2. The frontend automatically includes the token in API requests
3. For testing, use AWS Cognito SDK or CLI to get tokens

## Endpoints

### Flights

#### List Flights
```
GET /flights
```

**Response:**
```json
{
  "flights": [
    {
      "id": "uuid",
      "scheduledStart": "2024-12-15T10:00:00Z",
      "scheduledEnd": "2024-12-15T12:00:00Z",
      "status": "SCHEDULED",
      "departureAirport": "KORD",
      "student": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "trainingLevel": "PRIVATE_PILOT"
      },
      "instructor": {
        "id": "uuid",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@example.com"
      },
      "aircraft": {
        "id": "uuid",
        "tailNumber": "N123AB",
        "model": "Cessna 172"
      },
      "latestWeatherCheck": {
        "id": "uuid",
        "result": "SAFE",
        "visibility": 10,
        "ceiling": 5000,
        "windSpeed": 8,
        "conditions": "Clear skies"
      }
    }
  ]
}
```

#### Create Flight
```
POST /flights
```

**Request Body:**
```json
{
  "studentId": "uuid",
  "instructorId": "uuid",
  "aircraftId": "uuid",
  "scheduledStart": "2024-12-20T10:00:00Z",
  "scheduledEnd": "2024-12-20T12:00:00Z",
  "departureAirport": "KORD"
}
```

**Response:**
```json
{
  "flight": {
    "id": "uuid",
    "scheduledStart": "2024-12-20T10:00:00Z",
    "scheduledEnd": "2024-12-20T12:00:00Z",
    "status": "SCHEDULED",
    "departureAirport": "KORD",
    "studentId": "uuid",
    "instructorId": "uuid",
    "aircraftId": "uuid"
  }
}
```

### Weather

#### Check Weather for Flight
```
POST /weather/check
```

**Request Body:**
```json
{
  "flightId": "uuid"
}
```

**Response:**
```json
{
  "weatherCheck": {
    "id": "uuid",
    "flightId": "uuid",
    "result": "UNSAFE",
    "visibility": 2,
    "ceiling": 500,
    "windSpeed": 20,
    "conditions": "Low visibility and ceiling",
    "reasons": [
      "Visibility below minimum (2 SM < 3 SM required)",
      "Ceiling below minimum (500 ft < 1000 ft required)"
    ],
    "checkedAt": "2024-12-15T08:00:00Z"
  }
}
```

**Result Values:**
- `SAFE`: Weather conditions meet training level minimums
- `UNSAFE`: Weather conditions do not meet minimums

### Reschedule

#### Generate Reschedule Options
```
POST /reschedule/generate
```

**Request Body:**
```json
{
  "flightId": "uuid"
}
```

**Response:**
```json
{
  "rescheduleRequest": {
    "id": "uuid",
    "flightId": "uuid",
    "status": "PENDING_STUDENT",
    "suggestions": [
      {
        "slot": "2024-12-16T10:00:00Z",
        "priority": 1,
        "reasoning": "Optimal weather forecast, instructor and aircraft available",
        "weatherForecast": "Clear skies, 10 SM visibility, 5000 ft ceiling",
        "confidence": "high",
        "instructorAvailable": true,
        "aircraftAvailable": true
      },
      {
        "slot": "2024-12-17T14:00:00Z",
        "priority": 2,
        "reasoning": "Good weather, slight wind increase expected",
        "weatherForecast": "Partly cloudy, 8 SM visibility, 3000 ft ceiling",
        "confidence": "medium",
        "instructorAvailable": true,
        "aircraftAvailable": true
      },
      {
        "slot": "2024-12-18T09:00:00Z",
        "priority": 3,
        "reasoning": "Acceptable conditions, earlier time slot",
        "weatherForecast": "Clear, 6 SM visibility, 2000 ft ceiling",
        "confidence": "low",
        "instructorAvailable": true,
        "aircraftAvailable": true
      }
    ],
    "expiresAt": "2024-12-17T08:00:00Z",
    "createdAt": "2024-12-15T08:00:00Z"
  }
}
```

**Status Values:**
- `PENDING_STUDENT`: Waiting for student to select an option
- `PENDING_INSTRUCTOR`: Student selected, waiting for instructor approval
- `ACCEPTED`: Instructor approved, new flight created
- `REJECTED`: Instructor rejected the selected time
- `EXPIRED`: Request expired (48 hours)

#### Select Reschedule Option
```
POST /reschedule/select
```

**Request Body:**
```json
{
  "rescheduleRequestId": "uuid",
  "selectedOption": 0
}
```

**Note:** `selectedOption` must be 0, 1, or 2 (corresponding to the three suggestions).

**Response:**
```json
{
  "message": "Selection recorded. Instructor notified.",
  "request": {
    "id": "uuid",
    "status": "PENDING_INSTRUCTOR",
    "selectedOption": 0,
    "studentConfirmedAt": "2024-12-15T09:00:00Z"
  }
}
```

#### Approve Reschedule
```
POST /reschedule/approve
```

**Request Body:**
```json
{
  "rescheduleRequestId": "uuid",
  "approved": true
}
```

**Response (Approved):**
```json
{
  "message": "Flight rescheduled successfully",
  "newFlight": {
    "id": "uuid",
    "scheduledStart": "2024-12-16T10:00:00Z",
    "scheduledEnd": "2024-12-16T12:00:00Z",
    "status": "SCHEDULED",
    "departureAirport": "KORD"
  }
}
```

**Response (Rejected):**
```json
{
  "message": "Reschedule rejected"
}
```

### Admin (Requires Admin Authentication)

#### Run Migrations
```
POST /admin/migrate
```

**Response:**
```json
{
  "message": "Migrations completed successfully"
}
```

#### Seed Database
```
POST /admin/seed
```

**Response:**
```json
{
  "message": "Database seeded successfully",
  "counts": {
    "schools": 1,
    "students": 3,
    "instructors": 2,
    "aircraft": 3,
    "flights": 4
  }
}
```

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (missing or invalid token)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

## Rate Limiting

Currently, no rate limiting is implemented. For production, consider:
- API Gateway throttling
- Lambda concurrency limits
- CloudFront rate limiting

## Training Level Weather Minimums

Weather safety checks use different minimums based on student training level:

### EARLY_STUDENT
- Visibility: 10 SM minimum
- Ceiling: 3000 ft minimum
- Wind Speed: 10 knots maximum

### PRIVATE_PILOT
- Visibility: 3 SM minimum
- Ceiling: 1000 ft minimum
- Wind Speed: 15 knots maximum

### INSTRUMENT_RATED
- Visibility: 0 SM (IFR capable)
- Ceiling: 0 ft (IFR capable)
- Wind Speed: 25 knots maximum

## Webhooks / EventBridge

The system automatically checks weather for all flights in the next 24 hours every hour via AWS EventBridge. When unsafe weather is detected:

1. Flight status is updated to `CANCELLED`
2. Email notification is sent to student
3. Reschedule options are automatically generated
4. Email with 3 options is sent to student

No manual API calls are needed for this workflow.

