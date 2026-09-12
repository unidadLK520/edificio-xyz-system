// frontend/app/api/auth/logout/route.ts
// Endpoint API de cierre de sesión con redirección automática al Login

import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  const response = NextResponse.redirect(loginUrl, { status: 303 });
  response.cookies.delete('auth_token');
  return response;
}

export async function GET(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  const response = NextResponse.redirect(loginUrl, { status: 303 });
  response.cookies.delete('auth_token');
  return response;
}

