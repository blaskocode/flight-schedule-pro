import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get database credentials from Secrets Manager
    const secretArn = process.env.DATABASE_SECRET_ARN;
    const host = process.env.DATABASE_HOST;
    const database = process.env.DATABASE_NAME || 'flightschedule';
    const user = process.env.DATABASE_USER || 'postgres';

    if (!secretArn || !host) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Database configuration missing' }),
      };
    }

    const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const response = await secretsClient.send(command);
    
    const secret = JSON.parse(response.SecretString || '{}');
    const password = secret.password || '';
    
    // URL encode password to handle special characters
    const encodedPassword = encodeURIComponent(password);
    const databaseUrl = `postgresql://${user}:${encodedPassword}@${host}:5432/${database}`;

    // Set DATABASE_URL for Prisma
    process.env.DATABASE_URL = databaseUrl;

    // Use Prisma's programmatic API to push schema
    // This doesn't require migration files or Prisma CLI
    console.log('Pushing Prisma schema to database...');
    
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    try {
      // Check if all required tables exist
      const requiredTables = ['School', 'Student', 'Instructor', 'Aircraft', 'Flight', 'WeatherCheck', 'RescheduleRequest'];
      let allTablesExist = true;
      
      for (const table of requiredTables) {
        try {
          await prisma.$queryRawUnsafe(`SELECT 1 FROM "${table}" LIMIT 1`);
        } catch (e: any) {
          allTablesExist = false;
          console.log(`Table ${table} does not exist, will create schema...`);
          break;
        }
      }
      
      if (allTablesExist) {
        console.log('All database tables already exist');
        await prisma.$disconnect();
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Database schema already exists and is up to date',
          }),
        };
      }
      
      console.log('Some tables missing, creating complete schema...');

      // Use Prisma's db push to create schema (for initial setup)
      // Note: This requires Prisma CLI, so we'll use raw SQL instead
      console.log('Creating database schema using raw SQL...');
      
      // Create ENUM types first (must be done separately)
      try {
        await prisma.$executeRawUnsafe(`CREATE TYPE "TrainingLevel" AS ENUM ('EARLY_STUDENT', 'PRIVATE_PILOT', 'INSTRUMENT_RATED');`);
      } catch (e: any) {
        if (!e.message.includes('already exists')) throw e;
      }

      try {
        await prisma.$executeRawUnsafe(`CREATE TYPE "FlightStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'WEATHER_CANCELLED', 'RESCHEDULED');`);
      } catch (e: any) {
        if (!e.message.includes('already exists')) throw e;
      }

      try {
        await prisma.$executeRawUnsafe(`CREATE TYPE "WeatherSafety" AS ENUM ('SAFE', 'UNSAFE');`);
      } catch (e: any) {
        if (!e.message.includes('already exists')) throw e;
      }

      try {
        await prisma.$executeRawUnsafe(`CREATE TYPE "RescheduleStatus" AS ENUM ('PENDING_STUDENT', 'PENDING_INSTRUCTOR', 'ACCEPTED', 'REJECTED', 'EXPIRED');`);
      } catch (e: any) {
        if (!e.message.includes('already exists')) throw e;
      }
      
      // Create tables using raw SQL based on schema (each statement separate)
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "School" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "airportCode" TEXT NOT NULL, "timezone" TEXT NOT NULL, "weatherProvider" TEXT NOT NULL DEFAULT 'weatherapi', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "School_pkey" PRIMARY KEY ("id"));`);

      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Student" ("id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "email" TEXT NOT NULL, "firstName" TEXT NOT NULL, "lastName" TEXT NOT NULL, "cognitoId" TEXT NOT NULL, "trainingLevel" "TrainingLevel" NOT NULL DEFAULT 'EARLY_STUDENT', "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0, "availability" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Student_pkey" PRIMARY KEY ("id"), CONSTRAINT "Student_email_key" UNIQUE ("email"), CONSTRAINT "Student_cognitoId_key" UNIQUE ("cognitoId"));`);

      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Student_email_idx" ON "Student"("email");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Student_cognitoId_idx" ON "Student"("cognitoId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Student_schoolId_idx" ON "Student"("schoolId");`);

      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Instructor" ("id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "email" TEXT NOT NULL, "firstName" TEXT NOT NULL, "lastName" TEXT NOT NULL, "cognitoId" TEXT NOT NULL, "availability" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Instructor_pkey" PRIMARY KEY ("id"), CONSTRAINT "Instructor_email_key" UNIQUE ("email"), CONSTRAINT "Instructor_cognitoId_key" UNIQUE ("cognitoId"));`);

      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Instructor_email_idx" ON "Instructor"("email");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Instructor_schoolId_idx" ON "Instructor"("schoolId");`);

      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Aircraft" ("id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "tailNumber" TEXT NOT NULL, "model" TEXT NOT NULL, "available" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Aircraft_pkey" PRIMARY KEY ("id"), CONSTRAINT "Aircraft_tailNumber_key" UNIQUE ("tailNumber"));`);

      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Aircraft_tailNumber_idx" ON "Aircraft"("tailNumber");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Aircraft_schoolId_idx" ON "Aircraft"("schoolId");`);

      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Flight" ("id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "studentId" TEXT NOT NULL, "instructorId" TEXT NOT NULL, "aircraftId" TEXT NOT NULL, "scheduledStart" TIMESTAMP(3) NOT NULL, "scheduledEnd" TIMESTAMP(3) NOT NULL, "departureAirport" TEXT NOT NULL, "status" "FlightStatus" NOT NULL DEFAULT 'SCHEDULED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Flight_pkey" PRIMARY KEY ("id"));`);

      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Flight_scheduledStart_idx" ON "Flight"("scheduledStart");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Flight_status_idx" ON "Flight"("status");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Flight_studentId_idx" ON "Flight"("studentId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Flight_schoolId_idx" ON "Flight"("schoolId");`);

      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "WeatherCheck" ("id" TEXT NOT NULL, "flightId" TEXT NOT NULL, "checkTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "location" TEXT NOT NULL, "visibility" DOUBLE PRECISION NOT NULL, "ceiling" INTEGER, "windSpeed" INTEGER NOT NULL, "conditions" TEXT NOT NULL, "result" "WeatherSafety" NOT NULL, "reasons" JSONB NOT NULL, "provider" TEXT NOT NULL, "studentTrainingLevel" "TrainingLevel" NOT NULL, "requiredVisibility" DOUBLE PRECISION NOT NULL, "requiredCeiling" INTEGER NOT NULL, "maxWindSpeed" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "WeatherCheck_pkey" PRIMARY KEY ("id"));`);

      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "WeatherCheck_flightId_idx" ON "WeatherCheck"("flightId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "WeatherCheck_checkTime_idx" ON "WeatherCheck"("checkTime");`);

      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "RescheduleRequest" ("id" TEXT NOT NULL, "flightId" TEXT NOT NULL, "studentId" TEXT NOT NULL, "suggestions" JSONB NOT NULL, "status" "RescheduleStatus" NOT NULL DEFAULT 'PENDING_STUDENT', "selectedOption" INTEGER, "studentConfirmedAt" TIMESTAMP(3), "instructorConfirmedAt" TIMESTAMP(3), "newFlightId" TEXT, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "RescheduleRequest_pkey" PRIMARY KEY ("id"));`);

      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RescheduleRequest_status_idx" ON "RescheduleRequest"("status");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RescheduleRequest_flightId_idx" ON "RescheduleRequest"("flightId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RescheduleRequest_expiresAt_idx" ON "RescheduleRequest"("expiresAt");`);

      // Add foreign keys (each constraint separately)
      try {
        await prisma.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Student_schoolId_fkey') THEN ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`);
      } catch (e: any) {
        if (!e.message.includes('already exists')) console.warn('FK constraint may already exist:', e.message);
      }

      try {
        await prisma.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Instructor_schoolId_fkey') THEN ALTER TABLE "Instructor" ADD CONSTRAINT "Instructor_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`);
      } catch (e: any) {
        if (!e.message.includes('already exists')) console.warn('FK constraint may already exist:', e.message);
      }

      try {
        await prisma.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Aircraft_schoolId_fkey') THEN ALTER TABLE "Aircraft" ADD CONSTRAINT "Aircraft_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`);
      } catch (e: any) {
        if (!e.message.includes('already exists')) console.warn('FK constraint may already exist:', e.message);
      }

      try {
        await prisma.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Flight_schoolId_fkey') THEN ALTER TABLE "Flight" ADD CONSTRAINT "Flight_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`);
        await prisma.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Flight_studentId_fkey') THEN ALTER TABLE "Flight" ADD CONSTRAINT "Flight_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`);
        await prisma.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Flight_instructorId_fkey') THEN ALTER TABLE "Flight" ADD CONSTRAINT "Flight_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`);
        await prisma.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Flight_aircraftId_fkey') THEN ALTER TABLE "Flight" ADD CONSTRAINT "Flight_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`);
      } catch (e: any) {
        if (!e.message.includes('already exists')) console.warn('FK constraint may already exist:', e.message);
      }

      try {
        await prisma.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WeatherCheck_flightId_fkey') THEN ALTER TABLE "WeatherCheck" ADD CONSTRAINT "WeatherCheck_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`);
      } catch (e: any) {
        if (!e.message.includes('already exists')) console.warn('FK constraint may already exist:', e.message);
      }

      try {
        await prisma.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RescheduleRequest_flightId_fkey') THEN ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`);
        await prisma.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RescheduleRequest_studentId_fkey') THEN ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`);
      } catch (e: any) {
        if (!e.message.includes('already exists')) console.warn('FK constraint may already exist:', e.message);
      }

      await prisma.$disconnect();

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Database schema created successfully',
        }),
      };
    } catch (error: any) {
      await prisma.$disconnect();
      console.error('Error creating schema:', error);
      
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Failed to create database schema',
          message: error.message,
        }),
      };
    }
  } catch (error) {
    console.error('Error running migrations:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

