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

/**
 * GET /api/v1/auditoria/:id
 * Detalle individual de un evento de auditoría (Administrador, Directorio)
 * Enmascara campos sensibles en datosAnteriores y datosNuevos. 404 si no existe.
 */
auditoriaRouter.get(
  '/:id',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id) || id <= 0) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'El ID de auditoría debe ser un número entero positivo',
        });
        return;
      }

      const detalle = await auditoriaService.obtenerDetalle(id);
      if (!detalle) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Registro de auditoría no encontrado',
        });
        return;
      }

      res.json({
        data: detalle,
      });
    } catch (err) {
      next(err);
    }
  }
);

