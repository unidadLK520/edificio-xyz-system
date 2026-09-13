// frontend/app/api/auth/login/route.ts
// Proxy de autenticación hacia el backend Express

import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000/api/v1';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, correo, password } = body;
    const userEmail = email || correo;

    if (!userEmail || !password) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Credenciales no válidas: Debe proporcionar correo y contraseña',
        },
        { status: 400 }
      );
    }

    // Extraer headers del cliente (IP y User-Agent) para la auditoría de Express
    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      '';
    const userAgent = request.headers.get('user-agent') || '';

    // Reenviar al backend Express
    const backendResponse = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(clientIp ? { 'x-forwarded-for': clientIp } : {}),
        ...(userAgent ? { 'user-agent': userAgent } : {}),
      },
      body: JSON.stringify({
        correo: userEmail.trim(),
        password,
      }),
    });

    const data = await backendResponse.json().catch(() => ({}));

    if (!backendResponse.ok) {
      const backendMsg = data.message || data.error || 'Credenciales inválidas';
      // NOTA: page.tsx línea 115 evalúa includes('Credenciales no válidas') para relanzar el error;
      // si no lo incluye, el fallback de desarrollo asume erróneamente isSuccess = true.
      const formattedMessage = backendMsg.includes('Credenciales no válidas')
        ? backendMsg
        : `Credenciales no válidas: ${backendMsg}`;

      return NextResponse.json(
        {
          error: data.error || 'Unauthorized',
          message: formattedMessage,
          details: data.details,
        },
        { status: backendResponse.status }
      );
    }

    // Respuesta exitosa
    const response = NextResponse.json({
      success: true,
      token: data.token,
      usuario: data.usuario,
    });

    // Guardar cookie HTTP-only idéntica a la esperada
    if (data.token) {
      response.cookies.set('auth_token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 8, // 8 horas
      });
    }

    return response;
  } catch (error) {
    console.error('Error en proxy de login:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Credenciales no válidas: Error al conectar con el servidor de autenticación',
      },
      { status: 500 }
    );
  }
}
