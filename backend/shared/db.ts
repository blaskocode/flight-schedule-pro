import { PrismaClient } from '@prisma/client';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Prisma Client singleton for Lambda reuse
// Lambda containers are reused, so we can cache the client
let prismaInstance: PrismaClient | null = null;
let databaseUrlPromise: Promise<string> | null = null;

/**
 * Construct DATABASE_URL from Secrets Manager
 * This is called lazily when the Prisma client is first accessed
 */
async function getDatabaseUrl(): Promise<string> {
  if (databaseUrlPromise) {
    return databaseUrlPromise;
  }

  databaseUrlPromise = (async () => {
    // If DATABASE_URL is already set (e.g., in local development), use it
    if (process.env.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }

    // Get database credentials from Secrets Manager
    const secretArn = process.env.DATABASE_SECRET_ARN;
    const host = process.env.DATABASE_HOST;
    const database = process.env.DATABASE_NAME || 'flightschedule';
    const user = process.env.DATABASE_USER || 'postgres';

    if (!secretArn || !host) {
      throw new Error('Database configuration missing: DATABASE_SECRET_ARN and DATABASE_HOST must be set');
    }

    const secretsClient = new SecretsManagerClient({ 
      region: process.env.AWS_REGION || 'us-east-1' 
    });
    const command = new GetSecretValueCommand({ SecretId: secretArn });
    const response = await secretsClient.send(command);
    
    const secret = JSON.parse(response.SecretString || '{}');
    const password = secret.password || '';
    
    // URL encode password to handle special characters
    const encodedPassword = encodeURIComponent(password);
    const databaseUrl = `postgresql://${user}:${encodedPassword}@${host}:5432/${database}`;
    
    return databaseUrl;
  })();

  return databaseUrlPromise;
}

/**
 * Get or create Prisma Client singleton
 * Constructs DATABASE_URL from Secrets Manager if needed
 */
export async function getPrismaClient(): Promise<PrismaClient> {
  if (!prismaInstance) {
    const databaseUrl = await getDatabaseUrl();
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prismaInstance;
}


