// frontend/app/api/auth/me/route.ts
// Proxy de consulta de usuario autenticado hacia el backend Express

import { NextResponse, type NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000/api/v1';

export async function GET(request: NextRequest) {
  try {
    let token = request.cookies.get('auth_token')?.value;
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return NextResponse.json(
        { authenticated: false, message: 'No autenticado' },
        { status: 401 }
      );
    }

    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      '';
    const userAgent = request.headers.get('user-agent') || '';

    const backendResponse = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(clientIp ? { 'x-forwarded-for': clientIp } : {}),
        ...(userAgent ? { 'user-agent': userAgent } : {}),
      },
    });

    const data = await backendResponse.json().catch(() => ({}));

    if (!backendResponse.ok) {
      return NextResponse.json(
        {
          authenticated: false,
          error: data.error || 'Unauthorized',
          message: data.message || 'Sesión inválida o expirada',
        },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json({
      authenticated: true,
      usuario: data,
      ...data,
    });
  } catch (error) {
    console.error('Error en proxy /me:', error);
    return NextResponse.json(
      {
        authenticated: false,
        error: 'Internal Server Error',
        message: 'Error al verificar sesión con el backend',
      },
      { status: 500 }
    );
  }
}
