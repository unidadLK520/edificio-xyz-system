// backend/src/modules/auth/auth.controller.ts
// Controlador HTTP para endpoints de autenticación

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService, AuthService } from './auth.service';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const loginSchema = z.object({
  correo: z.string().email('Correo inválido').optional(),
  email: z.string().email('Correo inválido').optional(),
  password: z.string().min(1, 'Contraseña requerida'),
}).refine(data => !!(data.correo || data.email), {
  message: 'Debe ingresar su correo electrónico',
});

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos o faltantes',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      const correo = (result.data.correo || result.data.email)!.trim();
      const userAgent = req.headers['user-agent'] as string | undefined;
      const ip = req.ip || (req.socket.remoteAddress as string | undefined);

      const loginResult = await this.service.login(
        { correo, password: result.data.password },
        { ip, userAgent }
      );

      if (!loginResult.success) {
        const statusCode = loginResult.status || (loginResult.reason === 'SESSION_ACTIVE' ? 409 : 401);
        const errorLabel = statusCode === 409 ? 'Conflict' : 'Unauthorized';
        res.status(statusCode).json({
          error: errorLabel,
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

  forzarCierreSesion = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idUsuario = parseInt(req.params.idUsuario, 10);
      if (isNaN(idUsuario)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de usuario inválido' });
        return;
      }

      const idOperador = req.user!.idUsuario;
      const ip = req.ip || (req.socket.remoteAddress as string | undefined);
      const userAgent = req.headers['user-agent'] as string | undefined;

      const resultado = await this.service.forzarCierreSesion(idOperador, idUsuario, { ip, userAgent });

      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente',
        data: resultado,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
