import { PrismaClient } from '@prisma/client';

// Prisma Client singleton for Lambda reuse
// Lambda containers are reused, so we can cache the client
let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prisma;
}

// Export singleton instance
export const prisma = getPrismaClient();

