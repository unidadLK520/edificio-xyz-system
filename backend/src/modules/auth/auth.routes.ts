// backend/src/modules/auth/auth.routes.ts
// Definición de rutas del módulo de autenticación

import { Router, IRouter } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

export const authRouter: IRouter = Router();

authRouter.post('/login', authController.login);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', authMiddleware, authController.me);
