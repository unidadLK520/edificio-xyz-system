// backend/src/routes/health.routes.ts
// Rutas de diagnóstico y conmutación de base de datos (/api/v1/health)

import { Router, Request, Response, NextFunction, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { dbFailoverService } from '../modules/database-failover/db-failover.service';

export const healthRouter: IRouter = Router();

// GET /api/v1/health — Ping público de salud del sistema
healthRouter.get('/', async (_req: Request, res: Response) => {
  try {
    // Ping a la base de datos activa
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Edificio XYZ API',
      version: '1.0.0',
      database: 'connected',
      activeDb: dbFailoverService.getStatus().activeDb,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('❌ Error al conectar con la base de datos en /health:', errorMessage);

    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      service: 'Edificio XYZ API',
      version: '1.0.0',
      database: 'disconnected',
      error: errorMessage,
    });
  }
});

// GET /api/v1/health/db — Consulta de estado de BD activa (solo Administrador)
healthRouter.get(
  '/db',
  authMiddleware,
  authorizeRoles('Administrador'),
  async (_req: AuthRequest, res: Response) => {
    const status = dbFailoverService.getStatus();
    res.json({
      status: 'ok',
      ...status,
    });
  }
);

// POST /api/v1/health/db/principal — Restauración manual a la base principal tras comprobarla (solo Administrador)
healthRouter.post(
  '/db/principal',
  authMiddleware,
  authorizeRoles('Administrador'),
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await dbFailoverService.restorePrincipal();
      res.json({
        status: 'ok',
        message: 'Base de datos principal comprobada y restaurada como activa.',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }
);
