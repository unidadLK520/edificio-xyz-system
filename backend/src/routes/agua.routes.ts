// backend/src/routes/agua.routes.ts
// Rutas de gestión de tarifas y lecturas de agua

import { Router, Response, NextFunction, IRouter } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import {
  configurarTarifaAgua,
  obtenerTarifaAgua,
  registrarLecturaAgua,
  obtenerLecturasAgua,
  corregirLecturaAgua,
} from '../modules/agua';

export const aguaRouter: IRouter = Router();
aguaRouter.use(authMiddleware);

const tarifaSchema = z
  .object({
    precioM3: z.number().min(0, 'El precio por m3 debe ser mayor o igual a 0').optional(),
    precio_m3: z.number().min(0, 'El precio por m3 debe ser mayor o igual a 0').optional(),
  })
  .refine((data) => data.precioM3 !== undefined || data.precio_m3 !== undefined, {
    message: 'Debe especificar el precio por m3 (precioM3 o precio_m3)',
  });

// ── GET /api/v1/agua/tarifa ──────────────────────────────────────────────────
// Consulta de tarifa de agua activa e historial (Administrador y Directorio)
aguaRouter.get(
  '/tarifa',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await obtenerTarifaAgua();
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/agua/tarifa ─────────────────────────────────────────────────
// Configurar nueva tarifa de agua activa (Administrador y Directorio)
aguaRouter.post(
  '/tarifa',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = tarifaSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Parámetros de tarifa de agua inválidos',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const precio = parsed.data.precioM3 !== undefined ? parsed.data.precioM3 : parsed.data.precio_m3!;
      const nuevaTarifa = await configurarTarifaAgua({
        precioM3: precio,
        idUsuario: req.user?.idUsuario || null,
      });

      res.status(201).json({
        message: 'Tarifa de agua configurada exitosamente',
        tarifa: {
          ...nuevaTarifa,
          precioM3: Number(nuevaTarifa.precioM3),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── Validación de Lecturas ───────────────────────────────────────────────────
const registrarLecturaSchema = z.object({
  idDepartamento: z.number().int().positive().optional(),
  id_departamento: z.number().int().positive().optional(),
  periodo: z.string().min(1, 'El período es obligatorio'),
  lecturaActual: z.number().min(0, 'La lectura actual debe ser mayor o igual a 0').optional(),
  lectura_actual: z.number().min(0, 'La lectura actual debe ser mayor o igual a 0').optional(),
  lecturaAnterior: z.number().min(0, 'La lectura anterior debe ser mayor o igual a 0').optional(),
  lectura_anterior: z.number().min(0, 'La lectura anterior debe ser mayor o igual a 0').optional(),
}).refine(
  (d) => (d.idDepartamento !== undefined || d.id_departamento !== undefined) &&
         (d.lecturaActual !== undefined || d.lectura_actual !== undefined),
  { message: 'Debe especificar idDepartamento y lecturaActual' }
);

const corregirLecturaSchema = z.object({
  lecturaActual: z.number().min(0, 'La lectura actual debe ser mayor o igual a 0').optional(),
  lectura_actual: z.number().min(0, 'La lectura actual debe ser mayor o igual a 0').optional(),
  lecturaAnterior: z.number().min(0, 'La lectura anterior debe ser mayor o igual a 0').optional(),
  lectura_anterior: z.number().min(0, 'La lectura anterior debe ser mayor o igual a 0').optional(),
});

// ── POST /api/v1/agua/lecturas ───────────────────────────────────────────────
// Registrar lectura de agua del período (Administrador y Directorio)
aguaRouter.post(
  '/lecturas',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = registrarLecturaSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Parámetros de lectura de agua inválidos',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const idDepartamento = parsed.data.idDepartamento !== undefined ? parsed.data.idDepartamento : parsed.data.id_departamento!;
      const lecturaActual = parsed.data.lecturaActual !== undefined ? parsed.data.lecturaActual : parsed.data.lectura_actual!;
      const lecturaAnterior = parsed.data.lecturaAnterior !== undefined ? parsed.data.lecturaAnterior : parsed.data.lectura_anterior;

      const nuevaLectura = await registrarLecturaAgua({
        idDepartamento,
        periodo: parsed.data.periodo,
        lecturaActual,
        lecturaAnterior,
        idUsuario: req.user?.idUsuario || null,
      });

      res.status(201).json({
        message: 'Lectura de agua registrada exitosamente',
        lectura: nuevaLectura,
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

// ── GET /api/v1/agua/lecturas ────────────────────────────────────────────────
// Listar lecturas de agua con filtros por periodo e idDepartamento (A, D, C)
aguaRouter.get(
  '/lecturas',
  authorizeRoles('Administrador', 'Directorio', 'Consulta', 'Copropietario'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { periodo, idDepartamento, page, limit } = req.query;

      const resultado = await obtenerLecturasAgua({
        periodo: periodo ? String(periodo) : undefined,
        idDepartamento: idDepartamento ? Number(idDepartamento) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json(resultado);
    } catch (err) {
      next(err);
    }
  }
);

// Handler común para corrección de lectura
async function handleCorregirLectura(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const idLectura = parseInt(req.params.id);
    if (isNaN(idLectura)) {
      res.status(400).json({ error: 'Bad Request', message: 'ID de lectura inválido' });
      return;
    }

    const parsed = corregirLecturaSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Parámetros de corrección inválidos',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const lecturaActual = parsed.data.lecturaActual !== undefined ? parsed.data.lecturaActual : parsed.data.lectura_actual;
    const lecturaAnterior = parsed.data.lecturaAnterior !== undefined ? parsed.data.lecturaAnterior : parsed.data.lectura_anterior;

    const lecturaCorregida = await corregirLecturaAgua({
      idLectura,
      lecturaActual,
      lecturaAnterior,
      idUsuario: req.user?.idUsuario || null,
    });

    res.json({
      message: 'Lectura de agua corregida exitosamente',
      lectura: lecturaCorregida,
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

// ── PUT /api/v1/agua/lecturas/:id ────────────────────────────────────────────
// Corregir lectura de agua (Administrador y Directorio; 409 si ya se usó en expensa emitida)
aguaRouter.put(
  '/lecturas/:id',
  authorizeRoles('Administrador', 'Directorio'),
  handleCorregirLectura
);

// Alias directo PUT /api/v1/agua/:id
aguaRouter.put(
  '/:id',
  authorizeRoles('Administrador', 'Directorio'),
  handleCorregirLectura
);

