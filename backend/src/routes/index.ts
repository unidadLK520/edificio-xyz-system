// backend/src/routes/index.ts
// Router principal — monta todos los sub-routers bajo /api/v1

import { Router, IRouter } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from './auth.routes';
import { departamentosRouter } from './departamentos.routes';
import { expensasRouter } from './expensas.routes';
import { movimientosRouter } from './movimientos.routes';
import { comunicadosRouter } from './comunicados.routes';
import { personalRouter } from './personal.routes';

export const router: IRouter = Router();

// Rutas públicas
router.use('/health', healthRouter);
router.use('/auth', authRouter);

// Rutas protegidas (auth requerido en cada router)
router.use('/departamentos', departamentosRouter);
router.use('/expensas', expensasRouter);
router.use('/movimientos', movimientosRouter);
router.use('/comunicados', comunicadosRouter);
router.use('/personal', personalRouter);
