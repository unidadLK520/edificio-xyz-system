// backend/src/routes/auth.routes.ts
// Endpoints de autenticación
//   POST /api/v1/auth/login   — iniciar sesión
//   POST /api/v1/auth/logout  — cerrar sesión
//   GET  /api/v1/auth/me      — datos del usuario autenticado

import { Router, Request, Response, NextFunction, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { compare } from 'bcryptjs';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { config } from '../config';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';

export const authRouter: IRouter = Router();

// ── Schemas de validación ────────────────────────────────────────────────────
const loginSchema = z.object({
  correo: z.string().email('Correo inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

// ── POST /auth/login ─────────────────────────────────────────────────────────
authRouter.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      const { correo, password } = result.data;

      const usuario = await prisma.usuario.findUnique({
        where: { correo },
        include: { rol: true },
      });

      if (!usuario || !usuario.activo) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Credenciales incorrectas o usuario inactivo',
        });
        return;
      }

      const passwordValido = await compare(password, usuario.passwordHash);
      if (!passwordValido) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Credenciales incorrectas o usuario inactivo',
        });
        return;
      }

      // Actualizar último acceso
      await prisma.usuario.update({
        where: { idUsuario: usuario.idUsuario },
        data: { ultimoAcceso: new Date() },
      });

      // Generar JWT (8 horas)
      const token = await new SignJWT({
        idUsuario: usuario.idUsuario,
        nombreUsuario: usuario.nombreUsuario,
        correo: usuario.correo,
        rol: usuario.rol.nombre,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('8h')
        .sign(config.jwtSecret);

      res.json({
        token,
        usuario: {
          idUsuario: usuario.idUsuario,
          nombreUsuario: usuario.nombreUsuario,
          correo: usuario.correo,
          rol: usuario.rol.nombre,
          ultimoAcceso: usuario.ultimoAcceso,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /auth/logout ────────────────────────────────────────────────────────
// El cliente simplemente elimina el token. Este endpoint es semántico.
authRouter.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Sesión cerrada exitosamente' });
});

// ── GET /auth/me ─────────────────────────────────────────────────────────────
authRouter.get(
  '/me',
  authMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const usuario = await prisma.usuario.findUnique({
        where: { idUsuario: req.user!.idUsuario },
        select: {
          idUsuario: true,
          nombreUsuario: true,
          correo: true,
          activo: true,
          fechaCreacion: true,
          ultimoAcceso: true,
          rol: { select: { nombre: true, descripcion: true } },
        },
      });

      if (!usuario) {
        res.status(404).json({ error: 'Not Found', message: 'Usuario no encontrado' });
        return;
      }

      res.json(usuario);
    } catch (err) {
      next(err);
    }
  }
);
