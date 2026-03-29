import { PrismaMariaDb } from '@prisma/adapter-mariadb';

type PrismaLogLevel = 'error' | 'warn' | 'info' | 'query';

export function createPrismaClientOptions(
  log: PrismaLogLevel[] = ['error', 'warn'],
) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to initialize Prisma.');
  }

  return {
    adapter: new PrismaMariaDb(databaseUrl),
    log,
  };
}
