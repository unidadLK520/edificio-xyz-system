import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { config } from '../config';
import { prisma } from '@edificio-xyz/database';
import { sessionManager } from '../modules/auth/session.manager';

export interface JWTPayload {
  idUsuario: number;
  nombreUsuario: string;
  correo: string;
  rol: string;
  idRol?: number;
  sid?: string;
}

// Extendemos Request para adjuntar el usuario autenticado
export interface AuthRequest extends Request {
  user?: JWTPayload;
}

// Throttle en memoria para evitar actualizar la BD en cada petición (< 1 vez por minuto por sesión)
export const sessionTouchThrottle = new Map<string, number>();

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

  // 1. Validar si el token fue revocado en memoria (ej. por logout)
  if (sessionManager.isTokenBlacklisted(token)) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token revocado. La sesión ha sido cerrada.',
    });
    return;
  }

  // 2. Verificar firma y expiración del JWT
  let payload: JWTPayload;
  try {
    const verified = await jwtVerify(token, config.jwtSecret);
    payload = verified.payload as unknown as JWTPayload;
    req.user = payload;
  } catch {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token inválido o expirado. Vuelva a iniciar sesión.',
    });
    return;
  }

  // 3. Prompt 5 - Regla 4: Los tokens emitidos antes, sin sid, siguen válidos hasta expirar
  if (!payload.sid) {
    if (sessionManager.isSessionIdle(token, config.sessionIdleTimeoutMinutes)) {
      sessionManager.blacklistToken(token);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Sesión expirada por inactividad. Vuelva a iniciar sesión.',
      });
      return;
    }
    sessionManager.recordActivity(token);
    next();
    return;
  }

  // 4. Prompt 5 - Regla 2: Validar que el sid siga activo en la base de datos
  try {
    const sesion = await prisma.sesion.findUnique({
      where: { idSesion: payload.sid },
    });

    if (!sesion || !sesion.activa) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Sesión inválida o cerrada. Vuelva a iniciar sesión.',
      });
      return;
    }

    const now = Date.now();
    const transcurridoMs = now - sesion.ultimoAcceso.getTime();
    const maxInactividadMs = (config.sessionIdleTimeoutMinutes || 30) * 60 * 1000;

    // Validar expiración por inactividad (30 min)
    if (transcurridoMs > maxInactividadMs) {
      await prisma.sesion.update({
        where: { idSesion: sesion.idSesion },
        data: { activa: false },
      });
      sessionManager.blacklistToken(token);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Sesión expirada por inactividad. Vuelva a iniciar sesión.',
      });
      return;
    }

    // Actualizar ultimo_acceso como máximo una vez por minuto por sesión
    const lastTouch = sessionTouchThrottle.get(sesion.idSesion) ?? sesion.ultimoAcceso.getTime();
    if (now - lastTouch >= 60 * 1000) {
      sessionTouchThrottle.set(sesion.idSesion, now);
      await prisma.sesion.update({
        where: { idSesion: sesion.idSesion },
        data: { ultimoAcceso: new Date(now) },
      });
    }

    sessionManager.recordActivity(token);
    next();
  } catch (err) {
    next(err);
  }
}
