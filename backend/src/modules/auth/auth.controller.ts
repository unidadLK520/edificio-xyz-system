// backend/src/modules/auth/auth.controller.ts
// Controlador HTTP para endpoints de autenticación

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService, AuthService } from './auth.service';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const loginSchema = z.object({
  correo: z.string().email('Correo inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const userAgent = req.headers['user-agent'] as string | undefined;
      const ip = req.ip || (req.socket.remoteAddress as string | undefined);

      const loginResult = await this.service.login(result.data, { ip, userAgent });

      if (!loginResult.success) {
        res.status(401).json({
          error: 'Unauthorized',
          message: loginResult.message,
        });
        return;
      }

      res.json(loginResult.data);
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const userAgent = req.headers['user-agent'] as string | undefined;
      const ip = req.ip || (req.socket.remoteAddress as string | undefined);
      await this.service.logout(token, { ip, userAgent });
    }
    res.json({ message: 'Sesión cerrada exitosamente' });
  };

  me = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const usuario = await this.service.getMe(req.user!.idUsuario);

      if (!usuario) {
        res.status(404).json({ error: 'Not Found', message: 'Usuario no encontrado' });
        return;
      }

      res.json(usuario);
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
