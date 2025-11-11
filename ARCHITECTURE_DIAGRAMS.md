# Flight Schedule Pro - Architecture Diagrams

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph "User Layer"
        U1[Student Browser]
        U2[Instructor Browser]
        U3[Admin Browser]
    end

    subgraph "CDN & Frontend"
        CF[AWS CloudFront CDN]
        S3[AWS S3 Static Hosting]
        FE[Next.js 14 React App<br/>TypeScript + TailwindCSS]
    end

    subgraph "Authentication"
        COG[AWS Cognito<br/>User Pools]
    end

    subgraph "API Layer"
        APIG[AWS API Gateway<br/>REST API]
        AUTH[Cognito Authorizer]
    end

    subgraph "Compute Layer"
        L1[Weather Check Lambda<br/>Node.js 20]
        L2[AI Reschedule Lambda<br/>Vercel AI SDK]
        L3[Flight CRUD Lambda]
        L4[Hourly Job Lambda]
        LAYER[Shared Lambda Layer<br/>Prisma + AI SDK + Zod]
    end

    subgraph "External APIs"
        WA[WeatherAPI.com<br/>Primary Weather]
        FAA[FAA Aviation Weather<br/>Fallback]
        OAI[OpenAI GPT-4<br/>via Vercel AI SDK]
    end

    subgraph "Data Layer"
        VPC[AWS VPC<br/>Private Subnets]
        RDS[(AWS RDS PostgreSQL<br/>7 Tables)]
        REDIS[(AWS ElastiCache Redis<br/>Caching)]
        SEC[AWS Secrets Manager<br/>DB Credentials + API Keys]
    end

    subgraph "Background Jobs"
        EB[AWS EventBridge<br/>Hourly Cron]
    end

    subgraph "Notifications"
        SES[AWS SES<br/>Email Service]
    end

    subgraph "Monitoring"
        CW[AWS CloudWatch<br/>Logs & Metrics]
    end

    U1 --> CF
    U2 --> CF
    U3 --> CF
    CF --> S3
    S3 --> FE
    
    FE --> COG
    FE --> APIG
    
    APIG --> AUTH
    AUTH --> COG
    
    APIG --> L1
    APIG --> L2
    APIG --> L3
    
    L1 -.-> LAYER
    L2 -.-> LAYER
    L3 -.-> LAYER
    L4 -.-> LAYER
    
    L1 --> WA
    L1 --> FAA
    L2 --> OAI
    
    EB --> L4
    
    L1 --> VPC
    L2 --> VPC
    L3 --> VPC
    L4 --> VPC
    
    VPC --> RDS
    VPC --> REDIS
    
    L1 --> SEC
    L2 --> SEC
    L4 --> SEC
    
    L4 --> SES
    L2 --> SES
    
    L1 --> CW
    L2 --> CW
    L3 --> CW
    L4 --> CW
    APIG --> CW

    style FE fill:#0ea5e9
    style RDS fill:#f97316
    style L2 fill:#10b981
    style OAI fill:#10b981
    style EB fill:#8b5cf6
```

---

## 2. Database Schema Diagram

```mermaid
erDiagram
    School ||--o{ Student : "has"
    School ||--o{ Instructor : "has"
    School ||--o{ Aircraft : "has"
    School ||--o{ Flight : "schedules"
    
    Student ||--o{ Flight : "attends"
    Student ||--o{ RescheduleRequest : "receives"
    
    Instructor ||--o{ Flight : "teaches"
    
    Aircraft ||--o{ Flight : "used in"
    
    Flight ||--o{ WeatherCheck : "has"
    Flight ||--o{ RescheduleRequest : "generates"
    
    School {
        string id PK
        string name
        string airportCode
        string timezone
        string weatherProvider
        datetime createdAt
    }
    
    Student {
        string id PK
        string schoolId FK
        string email UK
        string firstName
        string lastName
        string phone
        string cognitoId UK
        enum trainingLevel
        float totalHours
        json availability
        datetime createdAt
    }
    
    Instructor {
        string id PK
        string schoolId FK
        string email UK
        string firstName
        string lastName
        string phone
        string cognitoId UK
        json availability
        datetime createdAt
    }
    
    Aircraft {
        string id PK
        string schoolId FK
        string tailNumber UK
        string model
        boolean available
        datetime createdAt
    }
    
    Flight {
        string id PK
        string schoolId FK
        string studentId FK
        string instructorId FK
        string aircraftId FK
        datetime scheduledStart
        datetime scheduledEnd
        string departureAirport
        enum status
        datetime createdAt
        datetime updatedAt
    }
    
    WeatherCheck {
        string id PK
        string flightId FK
        datetime checkTime
        string location
        float visibility
        int ceiling
        int windSpeed
        string conditions
        enum result
        json reasons
        string provider
        enum studentTrainingLevel
        float requiredVisibility
        int requiredCeiling
        int maxWindSpeed
        string rawData
        datetime createdAt
    }
    
    RescheduleRequest {
        string id PK
        string flightId FK
        string studentId FK
        json suggestions
        enum status
        int selectedOption
        datetime studentConfirmedAt
        datetime instructorConfirmedAt
        string newFlightId
        datetime expiresAt
        datetime createdAt
        datetime updatedAt
    }
```

---

## 3. Weather Cancellation & AI Reschedule Workflow (COMPLETE)

```mermaid
sequenceDiagram
    participant EB as EventBridge<br/>(Hourly Cron)
    participant HJ as Hourly Job Lambda
    participant DB as PostgreSQL
    participant WP as Weather Provider<br/>(API.com/FAA)
    participant SL as Safety Logic
    participant AI as AI Lambda<br/>(Vercel AI SDK)
    participant OAI as OpenAI GPT-4
    participant SES as AWS SES Email
    participant STU as Student Email
    participant INS as Instructor Email

    Note over EB,INS: Every Hour (00:00)
    
    EB->>HJ: Trigger Cron Job
    HJ->>DB: Query flights in next 24h<br/>WHERE status=SCHEDULED
    DB-->>HJ: Return upcoming flights list
    
    loop For each flight
        HJ->>WP: GET /weather?airport=KAUS
        WP-->>HJ: Current conditions:<br/>vis, ceiling, wind
        
        HJ->>DB: Get student training level
        DB-->>HJ: EARLY_STUDENT
        
        HJ->>SL: Check safety(conditions, level)
        SL-->>HJ: UNSAFE: Visibility too low
        
        HJ->>DB: INSERT WeatherCheck<br/>result=UNSAFE
        HJ->>DB: UPDATE Flight<br/>status=WEATHER_CANCELLED
        
        Note over HJ,SES: Send Cancellation Email
        
        HJ->>SES: weatherCancellationEmail(data)
        SES->>STU: 📧 Flight Cancelled<br/>Weather Unsafe<br/>Reasons listed
        SES->>INS: 📧 Flight Cancelled<br/>Notification
        
        Note over HJ,AI: Flight Cancelled - Trigger AI
        
        HJ->>AI: Trigger reschedule(flightId)
        AI->>DB: Get flight context:<br/>student, instructor, aircraft
        DB-->>AI: Full context with availability
        
        AI->>AI: Build detailed prompt<br/>with constraints
        
        AI->>OAI: generateObject(<br/>  model: gpt-4,<br/>  schema: Zod,<br/>  prompt<br/>)
        OAI-->>AI: {suggestions: [3 options]}<br/>Structured & typed
        
        AI->>DB: INSERT RescheduleRequest<br/>suggestions JSON<br/>status=PENDING_STUDENT<br/>expiresAt=+48h
        
        Note over AI,SES: Send Reschedule Options
        
        AI->>SES: rescheduleOptionsEmail(data)
        SES->>STU: 📧 3 AI Reschedule Options<br/>Priority ranked<br/>Weather forecasts<br/>Reasoning for each<br/>Expires in 48h
        SES->>INS: 📧 Reschedule in Progress<br/>Notification
        
        AI-->>HJ: Reschedule created
    end
    
    HJ-->>EB: Job complete: X cancelled

    Note over STU,INS: Students receive beautiful emails with 3 AI-generated options
```

---

## 4. Manual Weather Check Flow

```mermaid
sequenceDiagram
    participant U as User Browser
    participant CF as CloudFront
    participant FE as React Frontend
    participant APIG as API Gateway
    participant AUTH as Cognito Authorizer
    participant WL as Weather Lambda
    participant WP as Weather Provider
    participant SL as Safety Logic
    participant DB as PostgreSQL

    U->>CF: Click "Check Weather"
    CF->>FE: Serve React App
    
    FE->>FE: Get JWT token from<br/>Cognito session
    
    FE->>APIG: POST /weather/check<br/>Authorization: Bearer token<br/>{flightId: "abc123"}
    
    APIG->>AUTH: Validate JWT token
    AUTH->>AUTH: Verify with Cognito
    AUTH-->>APIG: ✓ Valid user
    
    APIG->>WL: Invoke Lambda(event)
    
    WL->>DB: SELECT flight with student
    DB-->>WL: Flight + student data
    
    WL->>WP: GET /current.json?q=KAUS
    WP-->>WL: {vis_miles: 8.0, wind_mph: 12}
    
    WL->>SL: checkSafety(<br/>  conditions,<br/>  EARLY_STUDENT<br/>)
    SL-->>WL: {<br/>  isSafe: false,<br/>  reasons: ["Wind too high"]<br/>}
    
    WL->>DB: INSERT WeatherCheck<br/>result=UNSAFE
    
    alt Flight is UNSAFE
        WL->>DB: UPDATE Flight<br/>status=WEATHER_CANCELLED
    end
    
    WL-->>APIG: {<br/>  result: "UNSAFE",<br/>  reasons: [...],<br/>  conditions: {...}<br/>}
    
    APIG-->>FE: 200 OK + JSON
    
    FE->>FE: Update UI:<br/>Show red alert
    FE-->>U: Display "⚠️ Unsafe to Fly"

    Note over U,DB: User sees real-time weather status
```

---

## 5. Complete Reschedule Selection & Confirmation Flow

```mermaid
sequenceDiagram
    participant STU as Student Browser
    participant FE as React Frontend
    participant APIG as API Gateway
    participant SEL as Select Lambda
    participant APP as Approve Lambda
    participant DB as PostgreSQL
    participant SES as AWS SES
    participant INS as Instructor Email
    participantSTU_EMAIL as Student Email

    Note over STU,STU_EMAIL: Student receives email with 3 AI options

    STU->>FE: Login to dashboard
    FE->>APIG: GET /reschedule/requests?studentId=xyz
    APIG->>SEL: Fetch pending requests
    SEL->>DB: SELECT from RescheduleRequest<br/>WHERE status=PENDING_STUDENT
    DB-->>SEL: Request with 3 suggestions
    SEL-->>FE: Return requests + suggestions
    
    FE-->>STU: Display 3 time slot options:<br/>━━━━━━━━━━━━━━━━━━━━━<br/>Option 1: Tomorrow 2pm (Priority 1) ⭐<br/>  High Confidence • Good Weather<br/>  "Best availability match"<br/><br/>Option 2: Wed 10am (Priority 2)<br/>  Medium Confidence • Fair Weather<br/>  "Alternative time slot"<br/><br/>Option 3: Thu 3pm (Priority 3)<br/>  Medium Confidence • Good Weather<br/>  "Backup option"<br/>━━━━━━━━━━━━━━━━━━━━━
    
    STU->>FE: Click "Select Option 1"
    
    FE->>APIG: POST /reschedule/select<br/>{<br/>  requestId: "abc",<br/>  selectedOption: 0<br/>}
    
    APIG->>SEL: Process selection
    
    SEL->>DB: BEGIN TRANSACTION
    SEL->>DB: UPDATE RescheduleRequest<br/>SET selectedOption=0,<br/>status=PENDING_INSTRUCTOR,<br/>studentConfirmedAt=NOW()
    
    SEL->>SES: 📧 Email instructor:<br/>"Student ${name} selected Tomorrow 2pm"<br/>[Approve Button] [Reject Button]
    SES->>INS: Instructor receives email
    
    SEL->>DB: COMMIT TRANSACTION
    
    SEL-->>FE: {status: "Pending instructor approval"}
    
    FE-->>STU: ✓ "Selection sent to instructor!<br/>⏳ Waiting for approval..."
    
    Note over INS: Instructor receives email<br/>with selection details
    
    INS->>INS: Reviews time slot<br/>Clicks [Approve] button
    
    INS->>APIG: POST /reschedule/approve<br/>{<br/>  requestId: "abc",<br/>  approved: true<br/>}
    
    APIG->>APP: Process approval
    
    APP->>DB: BEGIN TRANSACTION
    
    APP->>DB: Get original flight details
    DB-->>APP: Flight + duration
    
    APP->>DB: INSERT new Flight<br/>scheduledStart: Tomorrow 2pm<br/>scheduledEnd: Tomorrow 4pm<br/>status: SCHEDULED
    DB-->>APP: New flight ID: "xyz789"
    
    APP->>DB: UPDATE old Flight<br/>status=RESCHEDULED
    
    APP->>DB: UPDATE RescheduleRequest<br/>status=ACCEPTED,<br/>instructorConfirmedAt=NOW(),<br/>newFlightId="xyz789"
    
    APP->>DB: COMMIT TRANSACTION
    
    Note over APP,SES: Send Confirmations
    
    APP->>SES: 📧 confirmationEmail(student):<br/>"✓ Flight Rescheduled!"<br/>New time: Tomorrow 2pm<br/>Instructor: John Smith<br/>Aircraft: C172 (N12345)<br/>See you at the airport!
    
    APP->>SES: 📧 confirmationEmail(instructor):<br/>"✓ Flight Confirmed!"<br/>Student: Jane Doe<br/>Tomorrow 2pm<br/>Aircraft: C172 (N12345)
    
    SES->>STU_EMAIL: Student receives confirmation
    SES->>INS: Instructor receives confirmation
    
    APP-->>APIG: {status: "success", newFlightId: "xyz789"}
    
    APIG-->>FE: Success response
    
    FE->>FE: Refresh dashboard
    FE-->>STU: Show new flight in calendar<br/>✓ Rescheduled successfully!

    Note over STU,INST_EMAIL: Both parties have confirmed flight<br/>Weather monitoring resumes automatically
```

---

## 6. AWS CDK Deployment Flow

```mermaid
graph LR
    subgraph "Developer Machine"
        DEV[Developer]
        CLI[AWS CLI<br/>Configured]
        CDK[AWS CDK CLI]
        CODE[CDK TypeScript Code]
    end

    subgraph "CDK Synthesis"
        SYNTH[cdk synth]
        CFT[CloudFormation<br/>Templates]
    end

    subgraph "AWS Account"
        CFN[CloudFormation Service]
        
        subgraph "Stack 1: Database"
            VPC[VPC]
            RDS[RDS PostgreSQL]
            REDIS[ElastiCache Redis]
            SG[Security Groups]
        end
        
        subgraph "Stack 2: Auth"
            COG[Cognito User Pool]
            CLIENT[User Pool Client]
            IDPOOL[Identity Pool]
        end
        
        subgraph "Stack 3: API"
            APIG[API Gateway]
            L1[Lambda Functions]
            LAYER[Lambda Layers]
        end
        
        subgraph "Stack 4: Scheduler"
            EB[EventBridge Rule]
            L2[Hourly Job Lambda]
        end
        
        subgraph "Stack 5: Frontend"
            S3[S3 Bucket]
            CF[CloudFront]
        end
    end

    DEV --> CLI
    DEV --> CDK
    CDK --> CODE
    CODE --> SYNTH
    SYNTH --> CFT
    
    CFT --> CFN
    
    CFN --> VPC
    CFN --> RDS
    CFN --> REDIS
    CFN --> SG
    
    CFN --> COG
    CFN --> CLIENT
    CFN --> IDPOOL
    
    CFN --> APIG
    CFN --> L1
    CFN --> LAYER
    
    CFN --> EB
    CFN --> L2
    
    CFN --> S3
    CFN --> CF

    style CODE fill:#0ea5e9
    style CFN fill:#f97316
    style RDS fill:#10b981
```

---

## 7. Training Level Safety Logic

```mermaid
graph TD
    START[Weather Conditions<br/>vis, ceiling, wind]
    
    GET_LEVEL[Get Student<br/>Training Level]
    
    START --> GET_LEVEL
    
    GET_LEVEL --> EARLY{EARLY_STUDENT<br/>0-20 hours}
    GET_LEVEL --> PRIVATE{PRIVATE_PILOT<br/>Licensed VFR}
    GET_LEVEL --> INSTRUMENT{INSTRUMENT_RATED<br/>Licensed IFR}
    
    EARLY --> CHECK_E[Check Minimums:<br/>Vis ≥ 10 SM<br/>Ceiling ≥ 3000 ft<br/>Wind ≤ 10 kt]
    
    PRIVATE --> CHECK_P[Check Minimums:<br/>Vis ≥ 3 SM<br/>Ceiling ≥ 1000 ft<br/>Wind ≤ 15 kt]
    
    INSTRUMENT --> CHECK_I[Check Minimums:<br/>Vis ≥ 0 SM (IMC OK)<br/>Ceiling ≥ 0 ft<br/>Wind ≤ 25 kt]
    
    CHECK_E --> EVAL_E{All conditions<br/>met?}
    CHECK_P --> EVAL_P{All conditions<br/>met?}
    CHECK_I --> EVAL_I{All conditions<br/>met?}
    
    EVAL_E -->|Yes| SAFE_E[SAFE ✓]
    EVAL_E -->|No| UNSAFE_E[UNSAFE ✗<br/>Reason: Low vis/ceiling<br/>or high wind]
    
    EVAL_P -->|Yes| SAFE_P[SAFE ✓]
    EVAL_P -->|No| UNSAFE_P[UNSAFE ✗<br/>Reason: Below VFR mins]
    
    EVAL_I -->|Yes| SAFE_I[SAFE ✓]
    EVAL_I -->|No| UNSAFE_I[UNSAFE ✗<br/>Reason: Wind too high]
    
    SAFE_E --> LOG[Log to WeatherCheck<br/>result = SAFE]
    SAFE_P --> LOG
    SAFE_I --> LOG
    
    UNSAFE_E --> CANCEL[Log to WeatherCheck<br/>result = UNSAFE<br/>Update Flight status<br/>Trigger AI Reschedule]
    UNSAFE_P --> CANCEL
    UNSAFE_I --> CANCEL
    
    LOG --> END[Continue Flight]
    CANCEL --> END[Flight Cancelled]

    style SAFE_E fill:#10b981
    style SAFE_P fill:#10b981
    style SAFE_I fill:#10b981
    style UNSAFE_E fill:#ef4444
    style UNSAFE_P fill:#ef4444
    style UNSAFE_I fill:#ef4444
```

---

## 8. Data Flow Architecture

```mermaid
graph LR
    subgraph "Data Sources"
        WA[WeatherAPI.com<br/>Real-time Weather]
        FAA[FAA METAR<br/>Aviation Data]
        USER[User Input<br/>Flights & Preferences]
    end

    subgraph "Ingestion Layer"
        WL[Weather Lambda]
        FL[Flight Lambda]
        AL[AI Lambda]
    end

    subgraph "Processing"
        SL[Safety Logic<br/>Training Level Check]
        AI[AI Processing<br/>Vercel AI SDK + GPT-4]
        VAL[Validation<br/>Zod Schemas]
    end

    subgraph "Storage"
        PG[(PostgreSQL<br/>Persistent Data)]
        REDIS[(Redis Cache<br/>Session Data)]
    end

    subgraph "Output"
        DASH[Dashboard<br/>Real-time View]
        EMAIL[Email Notifications<br/>AWS SES]
        LOGS[CloudWatch Logs<br/>Audit Trail]
    end

    WA --> WL
    FAA --> WL
    USER --> FL
    
    WL --> SL
    SL --> PG
    
    FL --> VAL
    VAL --> PG
    
    PG --> AL
    AL --> AI
    AI --> PG
    
    PG --> DASH
    PG --> EMAIL
    PG --> LOGS
    
    SL --> EMAIL
    AI --> EMAIL
    
    WL --> LOGS
    FL --> LOGS
    AL --> LOGS

    style PG fill:#f97316
    style AI fill:#10b981
    style DASH fill:#0ea5e9
```

---

## 9. Task Execution Timeline

```mermaid
gantt
    title Flight Schedule Pro - 5 Day Implementation
    dateFormat  YYYY-MM-DD
    section Day 1 Foundation
    Initialize Project           :d1t1, 2025-01-01, 2h
    Setup Frontend (Next.js)     :d1t2, after d1t1, 3h
    Setup Backend (Prisma)       :d1t3, after d1t2, 2h
    Create Database Schema       :d1t4, after d1t3, 2h
    Create Seed Script           :d1t5, after d1t4, 1h
    Initialize AWS CDK           :d1t6, after d1t5, 2h

    section Day 2 Infrastructure
    Configure AWS Credentials    :d2t1, 2025-01-02, 1h
    Deploy Database Stack        :d2t2, after d2t1, 3h
    Run Migrations & Seed        :d2t3, after d2t2, 1h
    Deploy Auth Stack (Cognito)  :d2t4, after d2t3, 2h
    Update Frontend Env          :d2t5, after d2t4, 1h

    section Day 3 Backend
    Create Lambda Layer          :d3t1, 2025-01-03, 2h
    Weather Utilities            :d3t2, after d3t1, 3h
    AI Utilities (Vercel SDK)    :d3t3, after d3t2, 2h
    Weather Check Lambda         :d3t4, after d3t3, 2h
    AI Reschedule Lambda         :d3t5, after d3t4, 2h
    Hourly Job Lambda            :d3t6, after d3t5, 2h
    Flight CRUD Lambdas          :d3t7, after d3t6, 2h

    section Day 4 API & Frontend
    API Gateway Stack            :d4t1, 2025-01-04, 3h
    EventBridge Scheduler        :d4t2, after d4t1, 2h
    Frontend Auth Components     :d4t3, after d4t2, 3h
    API Client                   :d4t4, after d4t3, 1h
    Dashboard Page               :d4t5, after d4t4, 3h

    section Day 5 Deploy & Test
    Frontend Stack (S3/CF)       :d5t1, 2025-01-05, 2h
    Deployment Scripts           :d5t2, after d5t1, 2h
    Documentation                :d5t3, after d5t2, 2h
    End-to-End Testing           :d5t4, after d5t3, 4h
    Demo Preparation             :milestone, after d5t4, 0d
```

---

## 10. Component Interaction Map

```mermaid
graph TB
    subgraph "Frontend Components"
        LOGIN[Login Page<br/>Cognito Auth]
        SIGNUP[Signup Page<br/>User Registration]
        DASH[Dashboard<br/>Flight List + Status]
        GUARD[Auth Guard<br/>Route Protection]
        API_CLIENT[API Client<br/>Authenticated Fetch]
    end

    subgraph "API Endpoints"
        EP1[GET /flights<br/>List flights]
        EP2[POST /flights<br/>Create flight]
        EP3[POST /weather/check<br/>Check conditions]
        EP4[POST /reschedule/generate<br/>AI suggestions]
    end

    subgraph "Lambda Functions"
        GET_FL[Get Flights<br/>Query + Filter]
        CREATE_FL[Create Flight<br/>Validation + Insert]
        WEATHER[Weather Check<br/>Provider + Safety]
        AI_RESCHEDULE[AI Reschedule<br/>Vercel SDK + GPT-4]
        HOURLY[Hourly Job<br/>Batch Processing]
    end

    subgraph "Shared Logic"
        PRISMA[Prisma Client<br/>Type-safe queries]
        WEATHER_PROVIDER[Weather Providers<br/>API.com + FAA]
        SAFETY[Safety Logic<br/>Training Minimums]
        AI_PROMPT[AI Prompt Builder<br/>Context Assembly]
        ZOD[Zod Schemas<br/>Validation]
    end

    subgraph "Database"
        DB[(PostgreSQL<br/>7 Tables)]
    end

    LOGIN --> GUARD
    SIGNUP --> GUARD
    GUARD --> DASH
    DASH --> API_CLIENT
    
    API_CLIENT --> EP1
    API_CLIENT --> EP2
    API_CLIENT --> EP3
    API_CLIENT --> EP4
    
    EP1 --> GET_FL
    EP2 --> CREATE_FL
    EP3 --> WEATHER
    EP4 --> AI_RESCHEDULE
    
    GET_FL --> PRISMA
    CREATE_FL --> PRISMA
    WEATHER --> PRISMA
    AI_RESCHEDULE --> PRISMA
    HOURLY --> PRISMA
    
    WEATHER --> WEATHER_PROVIDER
    WEATHER --> SAFETY
    
    AI_RESCHEDULE --> AI_PROMPT
    AI_RESCHEDULE --> ZOD
    
    PRISMA --> DB

    style DASH fill:#0ea5e9
    style AI_RESCHEDULE fill:#10b981
    style DB fill:#f97316
```

---

## Usage Notes

These diagrams visualize:
1. **System Architecture**: Complete AWS infrastructure
2. **Database Schema**: All 7 tables with relationships
3. **Weather Workflow**: Automatic cancellation, AI rescheduling, and email notifications
4. **Manual Check**: User-initiated weather verification
5. **Reschedule Selection**: Complete student selection → instructor approval workflow
6. **CDK Deployment**: Infrastructure as code flow
7. **Safety Logic**: Training level decision tree
8. **Data Flow**: Information movement through system
9. **Timeline**: 5-day implementation schedule
10. **Component Map**: Frontend-to-backend interactions
11. **Email Notifications**: Complete email flow architecture (NEW)
12. **System Data Flow**: Updated with email communications (NEW)

Copy any diagram code into a Mermaid-compatible viewer or markdown renderer to see the visual representation.

---

## 11. Email Notification Architecture (NEW)

```mermaid
graph TB
    subgraph "Trigger Events"
        E1[Weather Cancellation]
        E2[AI Reschedule Complete]
        E3[Student Selection]
        E4[Instructor Approval]
        E5[Instructor Rejection]
    end

    subgraph "Email Service Layer"
        TEMPLATE[Email Templates<br/>templates.ts]
        CLIENT[SES Client<br/>ses-client.ts]
    end

    subgraph "Email Templates"
        T1[Weather Cancellation Email<br/>- Flight details<br/>- Weather reasons<br/>- Next steps]
        T2[Reschedule Options Email<br/>- 3 AI suggestions<br/>- Priority rankings<br/>- Weather forecasts<br/>- Expiry time]
        T3[Confirmation Email<br/>- New flight details<br/>- Both parties<br/>- Calendar ready]
        T4[Instructor Approval Request<br/>- Student selection<br/>- Approve/Reject buttons]
        T5[Rejection Notification<br/>- Alternative options<br/>- Re-selection link]
    end

    subgraph "AWS SES"
        SES[AWS Simple Email Service]
        QUEUE[Email Queue]
        SEND[Email Delivery]
    end

    subgraph "Recipients"
        STU[Student Email]
        INS[Instructor Email]
    end

    E1 --> TEMPLATE
    E2 --> TEMPLATE
    E3 --> TEMPLATE
    E4 --> TEMPLATE
    E5 --> TEMPLATE

    TEMPLATE --> T1
    TEMPLATE --> T2
    TEMPLATE --> T3
    TEMPLATE --> T4
    TEMPLATE --> T5

    T1 --> CLIENT
    T2 --> CLIENT
    T3 --> CLIENT
    T4 --> CLIENT
    T5 --> CLIENT

    CLIENT --> SES
    SES --> QUEUE
    QUEUE --> SEND

    SEND --> STU
    SEND --> INS

    style TEMPLATE fill:#0ea5e9
    style SES fill:#f97316
    style T2 fill:#10b981
```

**Email Flow Details:**

1. **Weather Cancellation** → Student + Instructor
   - Subject: "Flight Cancelled - Weather Conditions Unsafe"
   - Contains: Reasons, flight details, next steps
   
2. **AI Reschedule Complete** → Student
   - Subject: "3 Reschedule Options Available - AI Selected"
   - Contains: 3 prioritized options with reasoning, weather forecasts
   - Call-to-action: Select preferred time
   
3. **Student Selection** → Instructor
   - Subject: "Flight Reschedule - Awaiting Your Approval"
   - Contains: Selected time, student name, approve/reject buttons
   
4. **Instructor Approval** → Student + Instructor
   - Subject: "✓ Flight Rescheduled Successfully"
   - Contains: New flight details, confirmation
   
5. **Instructor Rejection** → Student
   - Subject: "Reschedule Time Not Available"
   - Contains: Alternative options link

---

## 12. Complete System Data Flow (UPDATED)

```mermaid
graph LR
    subgraph "Data Sources"
        WA[WeatherAPI.com<br/>Real-time Weather]
        FAA[FAA METAR<br/>Aviation Data]
        USER[User Input<br/>Flights & Preferences]
    end

    subgraph "Ingestion Layer"
        WL[Weather Lambda]
        FL[Flight Lambda]
        AL[AI Lambda]
    end

    subgraph "Processing"
        SL[Safety Logic<br/>Training Level Check]
        AI[AI Processing<br/>Vercel AI SDK + GPT-4]
        VAL[Validation<br/>Zod Schemas]
    end

    subgraph "Storage"
        PG[(PostgreSQL<br/>Persistent Data)]
        REDIS[(Redis Cache<br/>Session Data)]
    end

    subgraph "Communication"
        EMAIL[Email Service<br/>AWS SES]
        TEMPLATES[HTML/Text Templates]
    end

    subgraph "Output"
        DASH[Dashboard<br/>Real-time View]
        INBOX[User Email<br/>Gmail/Outlook]
        LOGS[CloudWatch Logs<br/>Audit Trail]
    end

    WA --> WL
    FAA --> WL
    USER --> FL
    
    WL --> SL
    SL --> PG
    
    FL --> VAL
    VAL --> PG
    
    PG --> AL
    AL --> AI
    AI --> PG
    
    PG --> TEMPLATES
    TEMPLATES --> EMAIL
    EMAIL --> INBOX
    
    PG --> DASH
    
    WL --> LOGS
    FL --> LOGS
    AL --> LOGS
    EMAIL --> LOGS

    style PG fill:#f97316
    style AI fill:#10b981
    style DASH fill:#0ea5e9
    style EMAIL fill:#8b5cf6
```

