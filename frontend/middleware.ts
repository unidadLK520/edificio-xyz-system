// frontend/middleware.ts
// Middleware de autenticación y redirección para rutas protegidas

import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const jwtSecretEnv = process.env.JWT_SECRET;

if (!jwtSecretEnv) {
  throw new Error(
    'JWT_SECRET no está definido. Configura la variable de entorno antes de iniciar la app.'
  );
}

const SECRET_KEY = new TextEncoder().encode(jwtSecretEnv);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, SECRET_KEY);
    return NextResponse.next();
  } catch {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth_token');
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};