// backend/src/middlewares/role.middleware.ts
// Middleware para autorización basada en roles (RBAC) — Case Insensitive

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export function authorizeRoles(...rolesPermitidos: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.rol?.toUpperCase();
    const allowedUpper = rolesPermitidos.map((r) => r.toUpperCase());

    if (!userRole || !allowedUpper.includes(userRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'No tiene permisos para realizar esta acción',
      });
      return;
    }

    next();
  };
}
