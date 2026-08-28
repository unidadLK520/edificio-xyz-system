// apps/api/src/routes/health.routes.ts
// GET /api/v1/health — verifica el estado del servidor y la BD

import { Router, Request, Response, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';

export const healthRouter: IRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  try {
    // Ping a la base de datos
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Edificio XYZ API',
      version: '1.0.0',
      database: 'connected',
    });
  } catch {
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      service: 'Edificio XYZ API',
      version: '1.0.0',
      database: 'disconnected',
    });
  }
});
