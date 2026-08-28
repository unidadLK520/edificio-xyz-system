// apps/api/src/middlewares/auth.middleware.ts
// Verifica el JWT en el header Authorization: Bearer <token>

import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { config } from '../config';

export interface JWTPayload {
  idUsuario: number;
  nombreUsuario: string;
  correo: string;
  rol: string;
}

// Extendemos Request para adjuntar el usuario autenticado
export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token de autenticación requerido. Incluya: Authorization: Bearer <token>',
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const { payload } = await jwtVerify(token, config.jwtSecret);
    req.user = payload as unknown as JWTPayload;
    next();
  } catch {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token inválido o expirado. Vuelva a iniciar sesión.',
    });
  }
}
