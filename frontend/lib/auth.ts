// frontend/lib/auth.ts
// Utilidades de autenticación y verificación de JWT para Next.js

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const jwtSecretEnv = process.env.JWT_SECRET

if (!jwtSecretEnv) {
  throw new Error(
    'JWT_SECRET no está definido. Configura la variable de entorno antes de iniciar la app.'
  )
}

const SECRET_KEY = new TextEncoder().encode(jwtSecretEnv)

export interface JWTPayload {
  idUsuario: number
  nombreUsuario: string
  correo: string
  rol: string
}

export async function createSessionToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET_KEY)
}

export async function verifySessionToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()

  // Primero intentar con el token del backend (auth_token)
  const token = cookieStore.get('auth_token')?.value
  if (token) {
    const session = verifySessionToken(token)
    if (session) return session
  }

  // Si no hay token del backend, intentar con NextAuth
  try {
    const nextAuthSession = await getServerSession(authOptions)
    if (nextAuthSession?.user?.email) {
      // Crear un payload compatible desde la sesión de NextAuth
      return {
        idUsuario: 1, // ID temporal para usuarios de Google
        nombreUsuario: nextAuthSession.user.name || 'Usuario',
        correo: nextAuthSession.user.email,
        rol: 'ADMINISTRADOR' // Rol por defecto para usuarios de Google
      }
    }
  } catch (error) {
    // Silenciar error en verificación de NextAuth
  }

  return null
}
