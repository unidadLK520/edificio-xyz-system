// frontend/app/api/auth/login/route.ts
// Endpoint API de autenticación e inicio de sesión

import { NextResponse } from 'next/server';
import { prisma } from '@edificio-xyz/database';
import bcrypt from 'bcryptjs';
import { createSessionToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, correo, password } = body;
    const userEmail = email || correo;

    if (!userEmail || !password) {
      return NextResponse.json(
        { error: 'Debe proporcionar correo y contraseña' },
        { status: 400 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { correo: userEmail },
      include: { rol: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    if (!user.activo) {
      return NextResponse.json(
        { error: 'El usuario se encuentra inactivo' },
        { status: 403 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Actualizar último acceso
    await prisma.usuario.update({
      where: { idUsuario: user.idUsuario },
      data: { ultimoAcceso: new Date() },
    });

    const tokenPayload = {
      idUsuario: user.idUsuario,
      nombreUsuario: user.nombreUsuario,
      correo: user.correo,
      rol: user.rol.nombre,
    };

    const token = await createSessionToken(tokenPayload);

    const response = NextResponse.json({
      success: true,
      token,
      usuario: tokenPayload,
    });

    // Guardar cookie HTTP-only
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 horas
    });

    return response;
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error en el servidor al iniciar sesión' },
      { status: 500 }
    );
  }
}
