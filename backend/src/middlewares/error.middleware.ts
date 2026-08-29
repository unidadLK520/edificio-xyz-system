// backend/src/middlewares/error.middleware.ts
// Handler global de errores — debe ser el último middleware en Express

import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorMiddleware(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  // Log en desarrollo
  if (config.isDev) {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  }

  // Errores de Prisma conocidos
  if (err.code === 'P2002') {
    res.status(409).json({
      error: 'Conflict',
      message: 'Ya existe un registro con ese valor único.',
    });
    return;
  }

  if (err.code === 'P2025') {
    res.status(404).json({
      error: 'Not Found',
      message: 'Registro no encontrado.',
    });
    return;
  }

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : 'Error',
    message: config.isDev ? message : 'Ocurrió un error. Contacte al administrador.',
    ...(config.isDev && { stack: err.stack }),
  });
}
