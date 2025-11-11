import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { PrismaClient, TrainingLevel, FlightStatus } from '@prisma/client';

async function seedDatabase(prisma: PrismaClient) {
  console.log('🌱 Seeding database...');

  // Check if data already exists
  const existingSchool = await prisma.school.findFirst();
  if (existingSchool) {
    console.log('Database already seeded');
    return { message: 'Database already contains data' };
  }

  // Create School
  const school = await prisma.school.create({
    data: {
      name: 'Austin Flight Academy',
      airportCode: 'KAUS',
      timezone: 'America/Chicago',
      weatherProvider: 'weatherapi',
    },
  });
  console.log('✅ Created school:', school.name);

  // Create Students
  const students = await Promise.all([
    prisma.student.create({
      data: {
        schoolId: school.id,
        email: 'david.lee@example.com',
        firstName: 'David',
        lastName: 'Lee',
        cognitoId: 'cognito-student-1',
        trainingLevel: TrainingLevel.EARLY_STUDENT,
        totalHours: 12.5,
        availability: {
          monday: ['09:00-12:00', '14:00-17:00'],
          tuesday: ['09:00-12:00', '14:00-17:00'],
          wednesday: ['09:00-12:00'],
          thursday: ['09:00-12:00', '14:00-17:00'],
          friday: ['09:00-12:00'],
          saturday: ['08:00-12:00'],
          sunday: [],
        },
      },
    }),
    prisma.student.create({
      data: {
        schoolId: school.id,
        email: 'emma.wilson@example.com',
        firstName: 'Emma',
        lastName: 'Wilson',
        cognitoId: 'cognito-student-2',
        trainingLevel: TrainingLevel.PRIVATE_PILOT,
        totalHours: 45.0,
        availability: {
          monday: ['10:00-14:00'],
          tuesday: ['10:00-14:00'],
          wednesday: ['10:00-14:00'],
          thursday: ['10:00-14:00'],
          friday: ['10:00-14:00'],
          saturday: ['08:00-16:00'],
          sunday: ['08:00-16:00'],
        },
      },
    }),
    prisma.student.create({
      data: {
        schoolId: school.id,
        email: 'michael.chen@example.com',
        firstName: 'Michael',
        lastName: 'Chen',
        cognitoId: 'cognito-student-3',
        trainingLevel: TrainingLevel.INSTRUMENT_RATED,
        totalHours: 250.0,
        availability: {
          monday: ['08:00-18:00'],
          tuesday: ['08:00-18:00'],
          wednesday: ['08:00-18:00'],
          thursday: ['08:00-18:00'],
          friday: ['08:00-18:00'],
          saturday: ['08:00-18:00'],
          sunday: ['08:00-18:00'],
        },
      },
    }),
  ]);
  console.log('✅ Created', students.length, 'students');

  // Create Instructors
  const instructors = await Promise.all([
    prisma.instructor.create({
      data: {
        schoolId: school.id,
        email: 'john.smith@example.com',
        firstName: 'John',
        lastName: 'Smith',
        cognitoId: 'cognito-instructor-1',
        availability: {
          monday: ['08:00-17:00'],
          tuesday: ['08:00-17:00'],
          wednesday: ['08:00-17:00'],
          thursday: ['08:00-17:00'],
          friday: ['08:00-17:00'],
          saturday: ['08:00-12:00'],
          sunday: [],
        },
      },
    }),
    prisma.instructor.create({
      data: {
        schoolId: school.id,
        email: 'sarah.johnson@example.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        cognitoId: 'cognito-instructor-2',
        availability: {
          monday: ['10:00-18:00'],
          tuesday: ['10:00-18:00'],
          wednesday: ['10:00-18:00'],
          thursday: ['10:00-18:00'],
          friday: ['10:00-18:00'],
          saturday: ['08:00-16:00'],
          sunday: ['08:00-16:00'],
        },
      },
    }),
  ]);
  console.log('✅ Created', instructors.length, 'instructors');

  // Create Aircraft
  const aircraft = await Promise.all([
    prisma.aircraft.create({
      data: {
        schoolId: school.id,
        tailNumber: 'N17234',
        model: 'Cessna 172',
        available: true,
      },
    }),
    prisma.aircraft.create({
      data: {
        schoolId: school.id,
        tailNumber: 'N45678',
        model: 'Cessna 172',
        available: true,
      },
    }),
    prisma.aircraft.create({
      data: {
        schoolId: school.id,
        tailNumber: 'N78901',
        model: 'Piper PA-28',
        available: true,
      },
    }),
  ]);
  console.log('✅ Created', aircraft.length, 'aircraft');

  // Create Flights
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(14, 0, 0, 0);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(10, 0, 0, 0);

  const flights = await Promise.all([
    prisma.flight.create({
      data: {
        schoolId: school.id,
        studentId: students[0].id,
        instructorId: instructors[0].id,
        aircraftId: aircraft[0].id,
        scheduledStart: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        scheduledEnd: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        departureAirport: 'KAUS',
        status: FlightStatus.COMPLETED,
      },
    }),
    prisma.flight.create({
      data: {
        schoolId: school.id,
        studentId: students[0].id,
        instructorId: instructors[0].id,
        aircraftId: aircraft[0].id,
        scheduledStart: tomorrow,
        scheduledEnd: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
        departureAirport: 'KAUS',
        status: FlightStatus.SCHEDULED,
      },
    }),
    prisma.flight.create({
      data: {
        schoolId: school.id,
        studentId: students[1].id,
        instructorId: instructors[1].id,
        aircraftId: aircraft[1].id,
        scheduledStart: dayAfter,
        scheduledEnd: new Date(dayAfter.getTime() + 2 * 60 * 60 * 1000),
        departureAirport: 'KAUS',
        status: FlightStatus.SCHEDULED,
      },
    }),
    prisma.flight.create({
      data: {
        schoolId: school.id,
        studentId: students[2].id,
        instructorId: instructors[0].id,
        aircraftId: aircraft[2].id,
        scheduledStart: nextWeek,
        scheduledEnd: new Date(nextWeek.getTime() + 3 * 60 * 60 * 1000),
        departureAirport: 'KAUS',
        status: FlightStatus.SCHEDULED,
      },
    }),
  ]);
  console.log('✅ Created', flights.length, 'flights');

  return {
    message: 'Database seeded successfully',
    counts: {
      schools: 1,
      students: students.length,
      instructors: instructors.length,
      aircraft: aircraft.length,
      flights: flights.length,
    },
  };
}

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

    // Create Prisma client with the database URL
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    try {
      const result = await seedDatabase(prisma);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      };
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Error seeding database:', error);
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

