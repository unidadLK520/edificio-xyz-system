// backend/src/routes/agua.routes.ts
// Rutas de gestión de montos manuales de agua

import { Router, Response, NextFunction, IRouter } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import {
  registrarOActualizarMontosAgua,
  obtenerMontosAgua,
} from '../modules/agua';

export const aguaRouter: IRouter = Router();
aguaRouter.use(authMiddleware);

// Esquema para cada elemento de monto de agua
const itemMontoAguaSchema = z
  .object({
    idDepartamento: z.number().int().positive().optional(),
    id_departamento: z.number().int().positive().optional(),
    montoAgua: z.number().min(0, 'El monto de agua debe ser mayor o igual a 0').optional(),
    monto_agua: z.number().min(0, 'El monto de agua debe ser mayor o igual a 0').optional(),
  })
  .refine(
    (d) =>
      (d.idDepartamento !== undefined || d.id_departamento !== undefined) &&
      (d.montoAgua !== undefined || d.monto_agua !== undefined),
    {
      message: 'Debe especificar el departamento (idDepartamento) y el monto de agua (montoAgua)',
    }
  );

// Esquema para el registro/actualización masivo por período
const registrarMontosSchema = z.object({
  periodo: z.string().min(1, 'El período es obligatorio'),
  montos: z
    .array(itemMontoAguaSchema)
    .min(1, 'Debe especificar al menos un monto de agua en la lista'),
});

// ── PUT /api/v1/agua/montos ──────────────────────────────────────────────────
// Registra o actualiza montos manuales de agua por (departamento, periodo) en transacción (todo o nada)
// Roles permitidos: Administrador, Directorio
// Códigos de respuesta:
// - 200: Registro/actualización exitoso
// - 400: Monto negativo, formato de período inválido o datos malformados
// - 409: Ya existe una expensa emitida para ese departamento y período
// - 422: El departamento no existe
aguaRouter.put(
  '/montos',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = registrarMontosSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Parámetros de montos de agua inválidos',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const itemsNormalizados = parsed.data.montos.map((m) => {
        const idDepartamento =
          m.idDepartamento !== undefined ? m.idDepartamento : m.id_departamento!;
        const montoAgua =
          m.montoAgua !== undefined ? m.montoAgua : m.monto_agua!;
        return { idDepartamento, montoAgua };
      });

      const resultado = await registrarOActualizarMontosAgua({
        periodo: parsed.data.periodo,
        montos: itemsNormalizados,
        idUsuario: req.user?.idUsuario || null,
      });

      res.status(200).json({
        message: 'Montos de agua registrados exitosamente',
        ...resultado,
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          error: err.code || 'Error',
          message: err.message,
        });
        return;
      }
      next(err);
    }
  }
);

// ── GET /api/v1/agua/montos ──────────────────────────────────────────────────
// Consulta montos de agua registrados con filtros opcionales por periodo e idDepartamento
// Roles permitidos: Administrador, Directorio, Consulta
aguaRouter.get(
  '/montos',
  authorizeRoles('Administrador', 'Directorio', 'Consulta'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { periodo, idDepartamento, id_departamento } = req.query;
      const deptoId = idDepartamento || id_departamento;

      const resultado = await obtenerMontosAgua({
        periodo: periodo ? String(periodo) : undefined,
        idDepartamento: deptoId ? Number(deptoId) : undefined,
      });

      res.status(200).json(resultado);
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          error: err.code || 'Error',
          message: err.message,
        });
        return;
      }
      next(err);
    }
  }
);
