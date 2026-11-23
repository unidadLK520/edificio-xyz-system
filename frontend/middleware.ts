// frontend/middleware.ts
// Middleware de autenticación y redirección para rutas protegidas

import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { getToken } from 'next-auth/jwt'

const jwtSecretEnv = process.env.JWT_SECRET

if (!jwtSecretEnv) {
  throw new Error(
    'JWT_SECRET no está definido. Configura la variable de entorno antes de iniciar la app.'
  )
}

const SECRET_KEY = new TextEncoder().encode(jwtSecretEnv)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login'
  ) {
    return NextResponse.next()
  }

  // 1. Verificar si existe auth_token clásico
  const token = request.cookies.get('auth_token')?.value

  if (token) {
    try {
      await jwtVerify(token, SECRET_KEY)
      return NextResponse.next()
    } catch {
      // Si el token tradicional falló, continuamos a verificar si hay sesión de NextAuth
    }
  }

  // 2. Verificar si existe sesión de NextAuth (Google OAuth)
  const nextAuthToken = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || jwtSecretEnv,
  })

  if (nextAuthToken) {
    const response = NextResponse.next()
    const backendToken =
      (nextAuthToken.backendToken as string) ||
      (nextAuthToken.token as string)
    if (backendToken && !request.cookies.has('auth_token')) {
      response.cookies.set('auth_token', backendToken, {
        path: '/',
        maxAge: 60 * 60 * 8,
        sameSite: 'lax',
      })
    }
    return response
  }

  // Si no hay ninguna sesión válida, redirigir al login
  const loginUrl = new URL('/login', request.url)
  const response = NextResponse.redirect(loginUrl)
  if (token) {
    response.cookies.delete('auth_token')
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}

