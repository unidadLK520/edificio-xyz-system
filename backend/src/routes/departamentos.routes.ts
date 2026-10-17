// backend/src/routes/departamentos.routes.ts
// CRUD completo de departamentos, parqueos, bauleras y ocupantes
//   GET    /api/v1/departamentos
//   GET    /api/v1/departamentos/:id
//   POST   /api/v1/departamentos
//   PUT    /api/v1/departamentos/:id
//   DELETE /api/v1/departamentos/:id

import { Router, Response, NextFunction, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { auditoriaService } from '../modules/auditoria';

export const departamentosRouter: IRouter = Router();
departamentosRouter.use(authMiddleware);

// ── Schemas ──────────────────────────────────────────────────────────────────
const departamentoSchema = z.object({
  numero: z.string().min(1).max(10),
  piso: z.number().int().optional(),
  areaM2: z.number().positive().optional(),
  idPropietario: z.number().int().positive().optional(),
  estado: z.enum(['Ocupado', 'Desocupado', 'EnVenta', 'EnAlquiler']).default('Ocupado'),
});

// ── GET /departamentos ───────────────────────────────────────────────────────
departamentosRouter.get(
  '/',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { estado, page = '1', limit = '20' } = req.query;

      const where = estado ? { estado: String(estado) } : {};
      const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
      const take = parseInt(String(limit));

      const [departamentos, total] = await Promise.all([
        prisma.departamento.findMany({
          where,
          skip,
          take,
          orderBy: { numero: 'asc' },
          include: {
            propietario: {
              select: { idPersona: true, nombres: true, apellidos: true, telefono: true },
            },
            parqueos: { select: { idParqueo: true, numero: true } },
            bauleras: { select: { idBaulera: true, numero: true } },
            _count: { select: { ocupantes: true, expensas: true } },
          },
        }),
        prisma.departamento.count({ where }),
      ]);

      res.json({
        data: departamentos,
        meta: {
          total,
          page: parseInt(String(page)),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /departamentos/:id ───────────────────────────────────────────────────
departamentosRouter.get(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const departamento = await prisma.departamento.findUnique({
        where: { idDepartamento: id },
        include: {
          propietario: true,
          parqueos: true,
          bauleras: true,
          ocupantes: {
            where: { fechaFin: null }, // solo ocupantes activos
            include: {
              persona: {
                select: { idPersona: true, nombres: true, apellidos: true, telefono: true, correo: true },
              },
            },
            orderBy: { fechaInicio: 'desc' },
          },
          expensas: {
            orderBy: { periodo: 'desc' },
            take: 12, // últimos 12 meses
          },
        },
      });

      if (!departamento) {
        res.status(404).json({ error: 'Not Found', message: 'Departamento no encontrado' });
        return;
      }

      res.json(departamento);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /departamentos ──────────────────────────────────────────────────────
departamentosRouter.post(
  '/',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = departamentoSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      const { numero, piso, areaM2, idPropietario, estado } = result.data;

      const departamento = await prisma.departamento.create({
        data: {
          numero,
          piso,
          areaM2: areaM2 !== undefined ? areaM2 : undefined,
          idPropietario,
          estado,
        },
        include: {
          propietario: { select: { nombres: true, apellidos: true } },
        },
      });

      res.status(201).json(departamento);
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /departamentos/asignar-tipo ──────────────────────────────────────────
// Asignación masiva de tipos a departamentos en transacción atómica (todo o nada)
// Solo permite tipos activos (422) y hereda area_m2 si el departamento no tiene
departamentosRouter.put(
  '/asignar-tipo',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { asignaciones } = req.body;
      if (!Array.isArray(asignaciones) || asignaciones.length === 0) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Debe enviar un arreglo "asignaciones" con al menos un elemento { idDepartamento, idTipo }',
        });
        return;
      }

      // Validar estructura básica
      for (const item of asignaciones) {
        if (!item.idDepartamento || !item.idTipo || isNaN(Number(item.idDepartamento)) || isNaN(Number(item.idTipo))) {
          res.status(400).json({
            error: 'Validation Error',
            message: 'Cada elemento de asignaciones debe incluir idDepartamento e idTipo válidos',
          });
          return;
        }
      }

      const resultados = await prisma.$transaction(async (tx) => {
        const actualizados: any[] = [];

        for (const item of asignaciones) {
          const idDepto = Number(item.idDepartamento);
          const idTipo = Number(item.idTipo);

          // 1. Validar que el tipo exista y esté activo (422)
          const tipo = await tx.tipoDepartamento.findUnique({
            where: { idTipo },
          });

          if (!tipo || !tipo.activo) {
            throw {
              statusCode: 422,
              error: 'UNPROCESSABLE_ENTITY',
              message: `El tipo de departamento ${idTipo} no existe o no se encuentra activo`,
            };
          }

          // 2. Validar que el departamento exista
          const depto = await tx.departamento.findUnique({
            where: { idDepartamento: idDepto },
          });

          if (!depto) {
            throw {
              statusCode: 404,
              error: 'NOT_FOUND',
              message: `El departamento ${idDepto} no existe`,
            };
          }

          // 3. Heredar area_m2 del tipo si el departamento no tiene
          const nuevoAreaM2 = (depto.areaM2 === null || depto.areaM2 === undefined) && tipo.areaM2 !== null
            ? tipo.areaM2
            : depto.areaM2;

          const deptoActualizado = await tx.departamento.update({
            where: { idDepartamento: idDepto },
            data: {
              idTipo,
              areaM2: nuevoAreaM2,
            },
            include: { tipo: true },
          });

          // 4. Auditoría por cambio
          await auditoriaService.registrarEvento({
            tablaAfectada: 'departamentos',
            idRegistro: String(idDepto),
            accion: 'ASIGNAR_TIPO_DEPARTAMENTO',
            resultado: 'EXITO',
            datosAnteriores: {
              idDepartamento: depto.idDepartamento,
              numero: depto.numero,
              idTipo: depto.idTipo,
              areaM2: depto.areaM2 ? Number(depto.areaM2) : null,
            },
            datosNuevos: {
              idDepartamento: deptoActualizado.idDepartamento,
              numero: deptoActualizado.numero,
              idTipo: deptoActualizado.idTipo,
              tipo: tipo.nombre,
              montoExpensa: Number(tipo.montoExpensa),
              areaM2: deptoActualizado.areaM2 ? Number(deptoActualizado.areaM2) : null,
            },
            idUsuario: req.user?.idUsuario || null,
            tx,
          });

          actualizados.push({
            idDepartamento: deptoActualizado.idDepartamento,
            numero: deptoActualizado.numero,
            idTipo: deptoActualizado.idTipo,
            tipo: tipo.nombre,
            monto: Number(tipo.montoExpensa),
            areaM2: deptoActualizado.areaM2 ? Number(deptoActualizado.areaM2) : null,
          });
        }

        return actualizados;
      }, { timeout: 60000, maxWait: 15000 });

      res.json({
        message: `Se asignó el tipo a ${resultados.length} departamento(s) exitosamente`,
        actualizados: resultados.length,
        asignaciones: resultados,
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          error: err.error || 'Bad Request',
          message: err.message,
        });
        return;
      }
      next(err);
    }
  }
);

// ── PUT /departamentos/:id/tipo ──────────────────────────────────────────────
// Asignación individual de tipo a departamento. Solo tipos activos (422) y hereda area_m2
departamentosRouter.put(
  '/:id/tipo',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de departamento inválido' });
        return;
      }

      const { idTipo } = req.body;
      if (idTipo === undefined || idTipo === null || isNaN(Number(idTipo))) {
        res.status(400).json({ error: 'Validation Error', message: 'Debe especificar idTipo numérico' });
        return;
      }

      const numIdTipo = Number(idTipo);

      // 1. Validar que el tipo exista y esté activo (422)
      const tipo = await prisma.tipoDepartamento.findUnique({
        where: { idTipo: numIdTipo },
      });

      if (!tipo || !tipo.activo) {
        res.status(422).json({
          error: 'UNPROCESSABLE_ENTITY',
          message: `El tipo de departamento con ID ${numIdTipo} no existe o no se encuentra activo`,
        });
        return;
      }

      // 2. Validar departamento
      const depto = await prisma.departamento.findUnique({
        where: { idDepartamento: id },
      });

      if (!depto) {
        res.status(404).json({
          error: 'Not Found',
          message: `Departamento con ID ${id} no encontrado`,
        });
        return;
      }

      // 3. Heredar area_m2 si el departamento no tiene
      const nuevoAreaM2 = (depto.areaM2 === null || depto.areaM2 === undefined) && tipo.areaM2 !== null
        ? tipo.areaM2
        : depto.areaM2;

      const { deptoActualizado } = await prisma.$transaction(async (tx) => {
        const updated = await tx.departamento.update({
          where: { idDepartamento: id },
          data: {
            idTipo: numIdTipo,
            areaM2: nuevoAreaM2,
          },
          include: { tipo: true },
        });

        // 4. Auditoría por cambio
        await auditoriaService.registrarEvento({
          tablaAfectada: 'departamentos',
          idRegistro: String(id),
          accion: 'ASIGNAR_TIPO_DEPARTAMENTO',
          resultado: 'EXITO',
          datosAnteriores: {
            idDepartamento: depto.idDepartamento,
            numero: depto.numero,
            idTipo: depto.idTipo,
            areaM2: depto.areaM2 ? Number(depto.areaM2) : null,
          },
          datosNuevos: {
            idDepartamento: updated.idDepartamento,
            numero: updated.numero,
            idTipo: updated.idTipo,
            tipo: tipo.nombre,
            montoExpensa: Number(tipo.montoExpensa),
            areaM2: updated.areaM2 ? Number(updated.areaM2) : null,
          },
          idUsuario: req.user?.idUsuario || null,
          tx,
        });

        return { deptoActualizado: updated };
      }, { timeout: 30000, maxWait: 15000 });

      const datosDepto = {
        idDepartamento: deptoActualizado.idDepartamento,
        numero: deptoActualizado.numero,
        idTipo: deptoActualizado.idTipo,
        tipo: tipo.nombre,
        monto: Number(tipo.montoExpensa),
        areaM2: deptoActualizado.areaM2 ? Number(deptoActualizado.areaM2) : null,
      };

      res.json({
        message: 'Tipo de departamento asignado exitosamente',
        ...datosDepto,
        departamento: datosDepto,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /departamentos/:id ───────────────────────────────────────────────────
departamentosRouter.put(
  '/:id',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const result = departamentoSchema.partial().safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      const departamento = await prisma.departamento.update({
        where: { idDepartamento: id },
        data: result.data,
        include: {
          propietario: { select: { nombres: true, apellidos: true } },
        },
      });

      res.json(departamento);
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /departamentos/:id ────────────────────────────────────────────────
departamentosRouter.delete(
  '/:id',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      await prisma.departamento.delete({ where: { idDepartamento: id } });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
