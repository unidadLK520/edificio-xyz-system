// packages/database/src/index.ts
// Instancia y exportación de Prisma Client

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaDbUrl?: string;
};

// Si cambia DATABASE_URL en tiempo de ejecución (ej. al editar .env),
// desconectamos la instancia en caché y creamos una nueva conexión automáticamente.
if (globalForPrisma.prisma && globalForPrisma.prismaDbUrl !== process.env.DATABASE_URL) {
  globalForPrisma.prisma.$disconnect().catch(() => {});
  delete globalForPrisma.prisma;
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaDbUrl = process.env.DATABASE_URL;
}

export * from '@prisma/client';
