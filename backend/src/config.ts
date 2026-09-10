// backend/src/config.ts
// Centraliza y valida todas las variables de entorno necesarias para el API

const jwtSecretEnv = process.env.JWT_SECRET;

if (!jwtSecretEnv) {
  throw new Error(
    'JWT_SECRET no está definido. Configura la variable de entorno antes de iniciar el servidor.'
  );
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: new TextEncoder().encode(jwtSecretEnv),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  sessionIdleTimeoutMinutes: parseFloat(process.env.SESSION_IDLE_TIMEOUT_MINUTES || '30'),
} as const;
