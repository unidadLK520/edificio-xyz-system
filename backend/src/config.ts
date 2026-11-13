// backend/src/config.ts
// Centraliza y valida todas las variables de entorno necesarias para el API

const jwtSecretEnv = process.env.JWT_SECRET;

if (!jwtSecretEnv) {
  throw new Error(
    'JWT_SECRET no está definido. Configura la variable de entorno antes de iniciar el servidor.'
  );
}

export const isDev = (process.env.NODE_ENV || 'development') === 'development';
export const config = {
  // ...
  corsOrigin: isDev ? 'http://localhost:3000' : process.env.CORS_ORIGIN || 'https://edificio-xyz-system-frontend.vercel.app',
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: isDev,
  jwtSecret: new TextEncoder().encode(jwtSecretEnv),
  sessionIdleTimeoutMinutes: parseFloat(process.env.SESSION_IDLE_TIMEOUT_MINUTES || '30'),
  moraCron: process.env.MORA_CRON || '0 1 * * *',
  moraCronEnabled: process.env.MORA_CRON_ENABLED === 'true',
  moraCronTimezone: 'America/La_Paz',
  storageUploadDir: process.env.STORAGE_UPLOAD_DIR || './uploads',
  storageMaxFileSizeMb: parseFloat(process.env.STORAGE_MAX_FILE_SIZE_MB || '10'),
  storagePublicUrl: process.env.STORAGE_PUBLIC_URL || 'http://localhost:4000/uploads',
} as const;

