// frontend/app/api/auth/logout/route.ts
// Proxy de cierre de sesión hacia el backend Express

import { NextResponse, type NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000/api/v1';

async function handleLogout(request: NextRequest) {
  // Extraer token de headers o cookies
  let token = request.cookies.get('auth_token')?.value;
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Si hay token, avisar al backend Express para que lo agregue a blacklist y audite el logout
  if (token) {
    try {
      const clientIp =
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        '';
      const userAgent = request.headers.get('user-agent') || '';

      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(clientIp ? { 'x-forwarded-for': clientIp } : {}),
          ...(userAgent ? { 'user-agent': userAgent } : {}),
        },
      });
    } catch (err) {
      console.error('Error al notificar logout al backend Express:', err);
    }
  }

  // Determinar si la respuesta debe ser redirect (navegación HTML) o JSON (llamadas fetch)
  const acceptHeader = request.headers.get('accept') || '';
  const isHtml = acceptHeader.includes('text/html');

  let response: NextResponse;
  if (isHtml) {
    const loginUrl = new URL('/login', request.url);
    response = NextResponse.redirect(loginUrl, { status: 303 });
  } else {
    response = NextResponse.json({
      success: true,
      message: 'Sesión cerrada exitosamente',
    });
  }

  // Eliminar la cookie de sesión del lado del cliente
  response.cookies.delete('auth_token');
  return response;
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}

export async function GET(request: NextRequest) {
  return handleLogout(request);
}
