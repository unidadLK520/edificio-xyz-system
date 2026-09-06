// frontend/lib/auth.ts
// Utilidades de autenticación y verificación de JWT para Next.js

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const jwtSecretEnv = process.env.JWT_SECRET;

if (!jwtSecretEnv) {
  throw new Error(
    'JWT_SECRET no está definido. Configura la variable de entorno antes de iniciar la app.'
  );
}

const SECRET_KEY = new TextEncoder().encode(jwtSecretEnv);