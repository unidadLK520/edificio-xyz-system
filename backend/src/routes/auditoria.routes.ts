// backend/src/routes/auditoria.routes.ts
// Rutas para consulta y auditoría de eventos del sistema (solo lectura)

import { Router, Response, NextFunction, IRouter } from 'express';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { auditoriaService } from '../modules/auditoria';

export const auditoriaRouter: IRouter = Router();

// Requerir autenticación para todas las rutas de auditoría
auditoriaRouter.use(authMiddleware);

/**
 * GET /api/v1/auditoria
 * Lista paginada y filtrada de logs de auditoría (Administrador, Directorio)
 * Máximo 100 registros por página, orden descendente por fechaHora
 * Enmascara campos sensibles (password, hash, token) en datosAnteriores y datosNuevos
 */
auditoriaRouter.get(
  '/',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        tablaAfectada,
        accion,
        idUsuario,
        idRegistro,
        resultado,
        fechaDesde,
        fechaHasta,
        page,
        limit,
      } = req.query;

      const resultadoPaginado = await auditoriaService.consultarAuditoria({
        tablaAfectada: tablaAfectada ? String(tablaAfectada) : undefined,
        accion: accion ? String(accion) : undefined,
        idUsuario: idUsuario ? Number(idUsuario) : undefined,
        idRegistro: idRegistro ? String(idRegistro) : undefined,
        resultado: resultado ? String(resultado) : undefined,
        fechaDesde: fechaDesde ? String(fechaDesde) : undefined,
        fechaHasta: fechaHasta ? String(fechaHasta) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json(resultadoPaginado);
    } catch (err) {
      next(err);
    }
  }
);
