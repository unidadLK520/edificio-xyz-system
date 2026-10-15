// backend/src/routes/tipos-departamento.routes.ts
// Gestión de Tipos de Departamento (GET, POST, PUT /api/v1/tipos-departamento)
// Roles autorizados: Administrador, Directorio (A y D)

import { Router, Response, NextFunction, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { auditoriaService } from '../modules/auditoria';

export const tiposDepartamentoRouter: IRouter = Router();
tiposDepartamentoRouter.use(authMiddleware);

// ── Schemas de validación ────────────────────────────────────────────────────
const crearTipoDepartamentoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(60, 'El nombre no puede exceder los 60 caracteres'),
  montoExpensa: z
    .number({ invalid_type_error: 'El monto de expensa debe ser numérico' })
    .positive('El monto de la expensa debe ser mayor a cero'),
  areaM2: z
    .number({ invalid_type_error: 'El área en m2 debe ser numérica' })
    .positive('El área en m2 debe ser mayor a cero')
    .nullable()
    .optional(),
  activo: z.boolean().optional().default(true),
});

const actualizarTipoDepartamentoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(60, 'El nombre no puede exceder los 60 caracteres')
    .optional(),
  montoExpensa: z
    .number({ invalid_type_error: 'El monto de expensa debe ser numérico' })
    .positive('El monto de la expensa debe ser mayor a cero')
    .optional(),
  areaM2: z
    .number({ invalid_type_error: 'El área en m2 debe ser numérica' })
    .positive('El área en m2 debe ser mayor a cero')
    .nullable()
    .optional(),
  activo: z.boolean().optional(),
});

// ── GET /api/v1/tipos-departamento ───────────────────────────────────────────
// Listado de tipos de departamento con conteo de unidades asignadas
tiposDepartamentoRouter.get(
  '/',
  authorizeRoles('Administrador', 'Directorio'),
  async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tipos = await prisma.tipoDepartamento.findMany({
        orderBy: { idTipo: 'asc' },
        include: {
          _count: {
            select: { departamentos: true },
          },
        },
      });

      res.json({
        data: tipos.map((t) => ({
          idTipo: t.idTipo,
          nombre: t.nombre,
          montoExpensa: Number(t.montoExpensa),
          areaM2: t.areaM2 ? Number(t.areaM2) : null,
          activo: t.activo,
          departamentosAsignados: t._count.departamentos,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/tipos-departamento ──────────────────────────────────────────
// Creación de nuevo tipo de departamento con nombre libre hasta 60 caracteres y único
tiposDepartamentoRouter.post(
  '/',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = crearTipoDepartamentoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos para crear tipo de departamento',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { nombre, montoExpensa, areaM2, activo } = parsed.data;

      // Verificar unicidad de nombre (case-insensitive)
      const existente = await prisma.tipoDepartamento.findFirst({
        where: { nombre: { equals: nombre, mode: 'insensitive' } },
      });

      if (existente) {
        res.status(409).json({
          error: 'Conflict',
          message: `Ya existe un tipo de departamento con el nombre "${nombre}"`,
        });
        return;
      }

      const nuevoTipo = await prisma.tipoDepartamento.create({
        data: {
          nombre,
          montoExpensa,
          areaM2: areaM2 !== undefined ? areaM2 : null,
          activo: activo !== undefined ? activo : true,
        },
      });

      // Auditoría
      await auditoriaService.registrarEvento({
        tablaAfectada: 'tipos_departamento',
        idRegistro: String(nuevoTipo.idTipo),
        accion: 'CREAR_TIPO_DEPARTAMENTO',
        resultado: 'EXITO',
        datosNuevos: {
          idTipo: nuevoTipo.idTipo,
          nombre: nuevoTipo.nombre,
          montoExpensa: Number(nuevoTipo.montoExpensa),
          areaM2: nuevoTipo.areaM2 ? Number(nuevoTipo.areaM2) : null,
          activo: nuevoTipo.activo,
        },
        idUsuario: req.user?.idUsuario || null,
      });

      const datosNuevos = {
        idTipo: nuevoTipo.idTipo,
        nombre: nuevoTipo.nombre,
        montoExpensa: Number(nuevoTipo.montoExpensa),
        areaM2: nuevoTipo.areaM2 ? Number(nuevoTipo.areaM2) : null,
        activo: nuevoTipo.activo,
      };

      res.status(201).json({
        message: 'Tipo de departamento creado exitosamente',
        ...datosNuevos,
        tipo: datosNuevos,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/v1/tipos-departamento/:id y PUT /api/v1/tipos-departamento ───────
// Actualización con restricción: si activo=false y tiene departamentos asignados -> 409
async function handleActualizarTipo(
  idTipo: number,
  body: any,
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = actualizarTipoDepartamentoSchema.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Datos inválidos para actualizar tipo de departamento',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const tipoActual = await prisma.tipoDepartamento.findUnique({
      where: { idTipo },
    });

    if (!tipoActual) {
      res.status(404).json({
        error: 'Not Found',
        message: `Tipo de departamento con ID ${idTipo} no encontrado`,
      });
      return;
    }

    const { nombre, montoExpensa, areaM2, activo } = parsed.data;

    // Validación de negocio: PUT con activo=false -> 409 si hay departamentos asignados
    if (activo === false) {
      const departamentosAsignados = await prisma.departamento.count({
        where: { idTipo },
      });

      if (departamentosAsignados > 0) {
        res.status(409).json({
          error: 'Conflict',
          message: `No se puede desactivar el tipo "${tipoActual.nombre}" porque tiene ${departamentosAsignados} departamento(s) asignado(s)`,
          departamentosAsignados,
        });
        return;
      }
    }

    // Validación de unicidad de nombre si cambia
    if (nombre && nombre.toLowerCase() !== tipoActual.nombre.toLowerCase()) {
      const existente = await prisma.tipoDepartamento.findFirst({
        where: {
          nombre: { equals: nombre, mode: 'insensitive' },
          idTipo: { not: idTipo },
        },
      });

      if (existente) {
        res.status(409).json({
          error: 'Conflict',
          message: `Ya existe otro tipo de departamento con el nombre "${nombre}"`,
        });
        return;
      }
    }

    const datosAnteriores = {
      idTipo: tipoActual.idTipo,
      nombre: tipoActual.nombre,
      montoExpensa: Number(tipoActual.montoExpensa),
      areaM2: tipoActual.areaM2 ? Number(tipoActual.areaM2) : null,
      activo: tipoActual.activo,
    };

    const tipoActualizado = await prisma.tipoDepartamento.update({
      where: { idTipo },
      data: {
        nombre: nombre !== undefined ? nombre : undefined,
        montoExpensa: montoExpensa !== undefined ? montoExpensa : undefined,
        areaM2: areaM2 !== undefined ? areaM2 : undefined,
        activo: activo !== undefined ? activo : undefined,
      },
    });

    const datosNuevos = {
      idTipo: tipoActualizado.idTipo,
      nombre: tipoActualizado.nombre,
      montoExpensa: Number(tipoActualizado.montoExpensa),
      areaM2: tipoActualizado.areaM2 ? Number(tipoActualizado.areaM2) : null,
      activo: tipoActualizado.activo,
    };

    // Auditoría
    await auditoriaService.registrarEvento({
      tablaAfectada: 'tipos_departamento',
      idRegistro: String(tipoActualizado.idTipo),
      accion: 'ACTUALIZAR_TIPO_DEPARTAMENTO',
      resultado: 'EXITO',
      datosAnteriores,
      datosNuevos,
      idUsuario: req.user?.idUsuario || null,
    });

    res.json({
      message: 'Tipo de departamento actualizado exitosamente',
      ...datosNuevos,
      tipo: datosNuevos,
    });
  } catch (err) {
    next(err);
  }
}

tiposDepartamentoRouter.put(
  '/:id',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Bad Request', message: 'ID de tipo de departamento inválido' });
      return;
    }
    await handleActualizarTipo(id, req.body, req, res, next);
  }
);

tiposDepartamentoRouter.put(
  '/',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const id = parseInt(String(req.body.idTipo), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Bad Request', message: 'Debe especificar idTipo en el cuerpo de la solicitud' });
      return;
    }
    await handleActualizarTipo(id, req.body, req, res, next);
  }
);
