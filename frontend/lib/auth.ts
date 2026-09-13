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

export interface JWTPayload {
  idUsuario: number;
  nombreUsuario: string;
  correo: string;
  rol: string;
}

export async function createSessionToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  return verifySessionToken(token);
}