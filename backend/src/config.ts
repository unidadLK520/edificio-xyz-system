// backend/src/config.ts
// Centraliza y valida todas las variables de entorno necesarias para el API

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: new TextEncoder().encode(
    process.env.JWT_SECRET || 'edificio_xyz_super_secure_jwt_secret_key_2026'
  ),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
} as const;
