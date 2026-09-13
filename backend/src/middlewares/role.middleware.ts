// backend/src/middlewares/role.middleware.ts
// Middleware para autorización basada en roles (RBAC)

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export function authorizeRoles(...rolesPermitidos: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'No tiene permisos para realizar esta acción',
      });
      return;
    }

    next();
  };
}
