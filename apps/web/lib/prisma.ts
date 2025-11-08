import type { PrismaClient } from '@prisma/client';

type PrismaClientFactory = () => PrismaClient;

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
  prismaFactory?: PrismaClientFactory;
};

function createPrismaFallback(): PrismaClient {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(
          'Prisma client is unavailable. Ensure `prisma generate` has been run before using database features.'
        );
      },
    }
  ) as PrismaClient;
}

function instantiatePrisma(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  if (globalForPrisma.prismaFactory) {
    const client = globalForPrisma.prismaFactory();
    globalForPrisma.prisma = client;
    return client;
  }

  try {
    const { PrismaClient: Prisma } = require('@prisma/client') as {
      PrismaClient: new (...args: any[]) => PrismaClient;
    };
    const client = new Prisma({
      log: ['error', 'warn'],
    });
    globalForPrisma.prisma = client;
    return client;
  } catch (error) {
    console.warn('[Prisma] Falling back to no-op client during build', error);
    const fallback = createPrismaFallback();
    globalForPrisma.prisma = fallback;
    return fallback;
  }
}

export const prisma = instantiatePrisma();
