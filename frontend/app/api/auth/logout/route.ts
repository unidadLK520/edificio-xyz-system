// frontend/app/api/auth/logout/route.ts
// Endpoint API de cierre de sesión

import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Sesión cerrada' });
  response.cookies.delete('auth_token');
  return response;
}
