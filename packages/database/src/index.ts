// packages/database/src/index.ts
// Instancia y exportación de Prisma Client con soporte para conmutación dinámica (Failover)

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prismaRawInstance?: PrismaClient;
  prismaDbUrl?: string;
  prismaQueryInterceptor?: ((execute: () => Promise<any>) => Promise<any>) | null;
};

function createDefaultClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

if (!globalForPrisma.prismaRawInstance) {
  globalForPrisma.prismaRawInstance = createDefaultClient();
  globalForPrisma.prismaDbUrl = process.env.DATABASE_URL;
}

export function setPrismaClient(client: PrismaClient): void {
  globalForPrisma.prismaRawInstance = client;
}

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prismaRawInstance) {
    globalForPrisma.prismaRawInstance = createDefaultClient();
  }
  return globalForPrisma.prismaRawInstance;
}

export function setPrismaQueryInterceptor(
  interceptor: ((execute: () => Promise<any>) => Promise<any>) | null
): void {
  globalForPrisma.prismaQueryInterceptor = interceptor;
}

export function getPrismaQueryInterceptor(): ((execute: () => Promise<any>) => Promise<any>) | null {
  return globalForPrisma.prismaQueryInterceptor || null;
}

/**
 * Envoltorio para operaciones que devuelven un PrismaPromise.
 * Preserva Symbol.toStringTag === 'PrismaPromise' y propiedades internas como requestTransaction
 * para que prisma.$transaction([ ...array ]) reconozca las promesas como Prisma Client promises válidas,
 * al tiempo que difiere la ejecución e intercepta cuando se invoca .then(), .catch() o .finally().
 */
function wrapPrismaPromise(origPromise: any, execute: () => Promise<any>, getInterceptor: () => any) {
  return new Proxy(origPromise, {
    get(target, prop, receiver) {
      if (prop === Symbol.toStringTag) {
        return 'PrismaPromise';
      }
      if (prop === 'then') {
        return function (onFulfilled?: any, onRejected?: any) {
          const interceptor = getInterceptor();
          const p = interceptor ? interceptor(execute) : execute();
          return p.then(onFulfilled, onRejected);
        };
      }
      if (prop === 'catch') {
        return function (onRejected?: any) {
          const interceptor = getInterceptor();
          const p = interceptor ? interceptor(execute) : execute();
          return p.catch(onRejected);
        };
      }
      if (prop === 'finally') {
        return function (onFinally?: any) {
          const interceptor = getInterceptor();
          const p = interceptor ? interceptor(execute) : execute();
          return p.finally(onFinally);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

// Proxy transparente para interceptar todas las operaciones de Prisma Client
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, client);

    // Métodos directos del cliente ($queryRaw, $executeRaw, $transaction, $connect, etc.)
    if (typeof value === 'function') {
      return function (...args: any[]) {
        const execute = () => {
          const freshClient = getPrismaClient();
          const freshFn = Reflect.get(freshClient, prop, freshClient);
          return freshFn.apply(freshClient, args);
        };

        // $transaction, $connect, $disconnect ejecutan inmediatamente: nunca pre-ejecutar
        if (prop === '$transaction' || prop === '$connect' || prop === '$disconnect') {
          const interceptor = getPrismaQueryInterceptor();
          return interceptor ? interceptor(execute) : execute();
        }

        // Métodos raw que devuelven un PrismaPromise perezoso ($queryRaw, $executeRaw)
        const freshClient = getPrismaClient();
        const freshFn = Reflect.get(freshClient, prop, freshClient);
        const orig = freshFn.apply(freshClient, args);

        if (
          orig &&
          typeof orig === 'object' &&
          typeof orig.then === 'function' &&
          orig[Symbol.toStringTag] === 'PrismaPromise'
        ) {
          return wrapPrismaPromise(orig, execute, getPrismaQueryInterceptor);
        }

        const interceptor = getPrismaQueryInterceptor();
        return interceptor ? interceptor(execute) : execute();
      };
    }

    // Delegados de modelos (usuario, expensa, departamento, sesion, etc.)
    if (value && typeof value === 'object') {
      return new Proxy(value, {
        get(mTarget, mProp, mReceiver) {
          const mVal = Reflect.get(mTarget, mProp, mTarget);
          if (typeof mVal === 'function') {
            return function (...mArgs: any[]) {
              const freshClient = getPrismaClient();
              const freshDelegate = Reflect.get(freshClient, prop, freshClient);
              const freshMethod = Reflect.get(freshDelegate, mProp, freshDelegate);
              const orig = freshMethod.apply(freshDelegate, mArgs);

              if (orig && typeof orig === 'object' && typeof orig.then === 'function') {
                const execute = () => {
                  const c = getPrismaClient();
                  const d = Reflect.get(c, prop, c);
                  const m = Reflect.get(d, mProp, d);
                  return m.apply(d, mArgs);
                };
                return wrapPrismaPromise(orig, execute, getPrismaQueryInterceptor);
              }
              return orig;
            };
          }
          return mVal;
        },
      });
    }

    return value;
  },
});

export * from '@prisma/client';
