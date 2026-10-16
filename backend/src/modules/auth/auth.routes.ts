// backend/src/modules/auth/auth.routes.ts
// Definición de rutas del módulo de autenticación

import { Router, IRouter } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';

export const authRouter: IRouter = Router();

authRouter.post('/login', authController.login);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', authMiddleware, authController.me);
authRouter.delete(
  '/sesiones/:idUsuario',
  authMiddleware,
  authorizeRoles('Administrador'),
  authController.forzarCierreSesion
);

