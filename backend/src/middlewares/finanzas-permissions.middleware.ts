// backend/src/middlewares/finanzas-permissions.middleware.ts
// US1.4 (Paso 5): Mapeo único de permisos y roles para módulos financieros
// Regla:
// - Administrador escribe (POST, PUT, DELETE)
// - Administrador y Directorio leen (GET)
// - Consulta y Copropietario reciben 403

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export type ModuloFinanzas = 'caja' | 'cuentas_bancarias' | 'movimientos_bancarios' | 'conciliacion';
export type AccionFinanzas = 'leer' | 'escribir';

export const MAPA_PERMISOS_FINANZAS: Record<ModuloFinanzas, Record<AccionFinanzas, string[]>> = {
  caja: {
    leer: ['Administrador', 'Directorio'],
    escribir: ['Administrador'],
  },
  cuentas_bancarias: {
    leer: ['Administrador', 'Directorio'],
    escribir: ['Administrador'],
  },
  movimientos_bancarios: {
    leer: ['Administrador', 'Directorio'],
    escribir: ['Administrador'],
  },
  conciliacion: {
    leer: ['Administrador', 'Directorio'],
    escribir: ['Administrador'],
  },
};

export const FINANZAS_TX_OPTIONS = {
  maxWait: 5000,
  timeout: 15000,
} as const;

export function requireFinanzasPermission(modulo: ModuloFinanzas, accion: AccionFinanzas) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.rol;
    if (!userRole) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuario no autenticado o rol ausente',
      });
      return;
    }

    const rolesPermitidos = MAPA_PERMISOS_FINANZAS[modulo][accion];
    const tienePermiso = rolesPermitidos.some(
      (rol) => rol.toLowerCase() === userRole.toLowerCase()
    );

    if (!tienePermiso) {
      res.status(403).json({
        error: 'Forbidden',
        message: `No tiene permisos suficientes para ${accion === 'leer' ? 'consultar' : 'modificar'} en el módulo de ${modulo}`,
      });
      return;
    }

    next();
  };
}
