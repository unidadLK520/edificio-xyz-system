// backend/src/routes/unidades.routes.ts
// HU03 — Gestión de Unidades (Departamentos, Parqueos, Bauleras), Asignaciones e Historial de Antecedentes

import { Router, Response, NextFunction, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';

export const unidadesRouter: IRouter = Router();
unidadesRouter.use(authMiddleware);

// ── Validation Schemas ────────────────────────────────────────────────────────
const crearUnidadSchema = z.object({
  tipoUnidad: z.enum(['Departamento', 'Parqueo', 'Baulera']),
  numero: z.string().min(1, 'El identificador es obligatorio').max(20),
  piso: z.number().int().optional(),
  areaM2: z.number().positive().optional(),
  estado: z.string().optional(),
});

const editarUnidadSchema = z.object({
  numero: z.string().min(1).max(20).optional(),
  piso: z.number().int().optional(),
  areaM2: z.number().positive().optional(),
  estado: z.string().optional(),
});

const asignacionSchema = z.object({
  tipoUnidad: z.enum(['Departamento', 'Parqueo', 'Baulera']),
  idUnidad: z.number().int().positive(),
  idPersona: z.number().int().positive().optional(),
  idDepartamento: z.number().int().positive().optional(),
  tipoRelacion: z.enum(['Propietario', 'Inquilino', 'Asignado']),
  notas: z.string().optional(),
});

const finalizarAsignacionSchema = z.object({
  tipoUnidad: z.enum(['Departamento', 'Parqueo', 'Baulera']),
  idUnidad: z.number().int().positive(),
  idAsignacion: z.number().int().positive().optional(),
  notas: z.string().optional(),
});

// Helper: Verificación de identificador duplicado (CA4)
async function verificarIdentificadorDuplicado(
  tipoUnidad: 'Departamento' | 'Parqueo' | 'Baulera',
  numero: string,
  excludeId?: number
): Promise<boolean> {
  if (tipoUnidad === 'Departamento') {
    const existing = await prisma.departamento.findFirst({
      where: {
        numero: { equals: numero, mode: 'insensitive' },
        ...(excludeId ? { NOT: { idDepartamento: excludeId } } : {}),
      },
    });
    return !!existing;
  } else if (tipoUnidad === 'Parqueo') {
    const existing = await prisma.parqueo.findFirst({
      where: {
        numero: { equals: numero, mode: 'insensitive' },
        ...(excludeId ? { NOT: { idParqueo: excludeId } } : {}),
      },
    });
    return !!existing;
  } else {
    const existing = await prisma.baulera.findFirst({
      where: {
        numero: { equals: numero, mode: 'insensitive' },
        ...(excludeId ? { NOT: { idBaulera: excludeId } } : {}),
      },
    });
    return !!existing;
  }
}

// ── GET /api/v1/unidades ─────────────────────────────────────────────────────
// CA2, CA08, CA10: Listar y filtrar unidades por tipo, estado o búsqueda
unidadesRouter.get(
  '/',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tipo, estado, search, page = '1', limit = '50' } = req.query;

      const pageNum = Math.max(1, parseInt(String(page)) || 1);
      const limitNum = Math.max(1, parseInt(String(limit)) || 50);
      const skip = (pageNum - 1) * limitNum;

      const results: any[] = [];
      let totalCount = 0;

      const filterTipo = tipo ? String(tipo) : 'Todos';
      const filterEstado = estado ? String(estado) : null;
      const searchStr = search ? String(search).trim() : null;

      // 1. Departamentos
      if (filterTipo === 'Todos' || filterTipo === 'Departamento') {
        const whereDept: any = {};
        if (filterEstado && filterEstado !== 'Todos') {
          whereDept.estado = filterEstado;
        }
        if (searchStr) {
          whereDept.OR = [
            { numero: { contains: searchStr, mode: 'insensitive' } },
            { propietario: { nombres: { contains: searchStr, mode: 'insensitive' } } },
            { propietario: { apellidos: { contains: searchStr, mode: 'insensitive' } } },
          ];
        }

        const deptos = await prisma.departamento.findMany({
          where: whereDept,
          include: {
            propietario: {
              select: { idPersona: true, nombres: true, apellidos: true, ciNit: true, telefono: true, correo: true },
            },
            ocupantes: {
              where: { fechaFin: null },
              include: {
                persona: {
                  select: { idPersona: true, nombres: true, apellidos: true, ciNit: true, telefono: true, correo: true },
                },
              },
            },
            parqueos: true,
            bauleras: true,
          },
          orderBy: { numero: 'asc' },
        });

        deptos.forEach((d) => {
          results.push({
            id: d.idDepartamento,
            tipoUnidad: 'Departamento',
            numero: d.numero,
            piso: d.piso,
            areaM2: d.areaM2 ? Number(d.areaM2) : null,
            estado: d.estado,
            propietario: d.propietario,
            ocupanteActual: d.ocupantes.length > 0 ? d.ocupantes[0].persona : null,
            parqueos: d.parqueos,
            bauleras: d.bauleras,
          });
        });
      }

      // 2. Parqueos
      if (filterTipo === 'Todos' || filterTipo === 'Parqueo') {
        const whereParq: any = {};
        if (filterEstado && filterEstado !== 'Todos') {
          whereParq.estado = filterEstado;
        }
        if (searchStr) {
          whereParq.OR = [
            { numero: { contains: searchStr, mode: 'insensitive' } },
            { departamento: { numero: { contains: searchStr, mode: 'insensitive' } } },
            { persona: { nombres: { contains: searchStr, mode: 'insensitive' } } },
            { persona: { apellidos: { contains: searchStr, mode: 'insensitive' } } },
          ];
        }

        const parqueos = await prisma.parqueo.findMany({
          where: whereParq,
          include: {
            departamento: { select: { idDepartamento: true, numero: true } },
            persona: { select: { idPersona: true, nombres: true, apellidos: true, ciNit: true } },
          },
          orderBy: { numero: 'asc' },
        });

        parqueos.forEach((p) => {
          results.push({
            id: p.idParqueo,
            tipoUnidad: 'Parqueo',
            numero: p.numero,
            estado: p.estado || 'Disponible',
            idDepartamento: p.idDepartamento,
            departamento: p.departamento,
            idPersona: p.idPersona,
            persona: p.persona,
            fechaAsignacion: p.fechaAsignacion,
          });
        });
      }

      // 3. Bauleras
      if (filterTipo === 'Todos' || filterTipo === 'Baulera') {
        const whereBaul: any = {};
        if (filterEstado && filterEstado !== 'Todos') {
          whereBaul.estado = filterEstado;
        }
        if (searchStr) {
          whereBaul.OR = [
            { numero: { contains: searchStr, mode: 'insensitive' } },
            { departamento: { numero: { contains: searchStr, mode: 'insensitive' } } },
            { persona: { nombres: { contains: searchStr, mode: 'insensitive' } } },
            { persona: { apellidos: { contains: searchStr, mode: 'insensitive' } } },
          ];
        }

        const bauleras = await prisma.baulera.findMany({
          where: whereBaul,
          include: {
            departamento: { select: { idDepartamento: true, numero: true } },
            persona: { select: { idPersona: true, nombres: true, apellidos: true, ciNit: true } },
          },
          orderBy: { numero: 'asc' },
        });

        bauleras.forEach((b) => {
          results.push({
            id: b.idBaulera,
            tipoUnidad: 'Baulera',
            numero: b.numero,
            estado: b.estado || 'Disponible',
            idDepartamento: b.idDepartamento,
            departamento: b.departamento,
            idPersona: b.idPersona,
            persona: b.persona,
            fechaAsignacion: b.fechaAsignacion,
          });
        });
      }

      totalCount = results.length;
      const paginatedData = results.slice(skip, skip + limitNum);

      res.json({
        data: paginatedData,
        meta: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/v1/unidades/:tipo/:id ───────────────────────────────────────────
// CA2, CA10: Obtener detalle completo de una unidad por tipo e ID
unidadesRouter.get(
  '/:tipo/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tipo = req.params.tipo as 'Departamento' | 'Parqueo' | 'Baulera';
      const id = parseInt(req.params.id);

      if (isNaN(id) || !['Departamento', 'Parqueo', 'Baulera'].includes(tipo)) {
        res.status(400).json({ error: 'Bad Request', message: 'Tipo o ID de unidad inválido' });
        return;
      }

      let unidad: any = null;
      let historial: any[] = [];

      if (tipo === 'Departamento') {
        unidad = await prisma.departamento.findUnique({
          where: { idDepartamento: id },
          include: {
            propietario: true,
            parqueos: true,
            bauleras: true,
            ocupantes: {
              include: { persona: true },
              orderBy: { fechaInicio: 'desc' },
            },
          },
        });

        if (unidad) {
          historial = await prisma.historialAsignacionUnidad.findMany({
            where: { tipoUnidad: 'Departamento', idUnidad: id },
            include: { persona: true, departamento: true },
            orderBy: { fechaInicio: 'desc' },
          });
        }
      } else if (tipo === 'Parqueo') {
        unidad = await prisma.parqueo.findUnique({
          where: { idParqueo: id },
          include: { departamento: true, persona: true },
        });

        if (unidad) {
          historial = await prisma.historialAsignacionUnidad.findMany({
            where: { tipoUnidad: 'Parqueo', idUnidad: id },
            include: { persona: true, departamento: true },
            orderBy: { fechaInicio: 'desc' },
          });
        }
      } else if (tipo === 'Baulera') {
        unidad = await prisma.baulera.findUnique({
          where: { idBaulera: id },
          include: { departamento: true, persona: true },
        });

        if (unidad) {
          historial = await prisma.historialAsignacionUnidad.findMany({
            where: { tipoUnidad: 'Baulera', idUnidad: id },
            include: { persona: true, departamento: true },
            orderBy: { fechaInicio: 'desc' },
          });
        }
      }

      if (!unidad) {
        res.status(404).json({ error: 'Not Found', message: 'Unidad no encontrada' });
        return;
      }

      res.json({
        unidad: {
          ...unidad,
          tipoUnidad: tipo,
        },
        historial,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/unidades ────────────────────────────────────────────────────
// CA1, CA4, CA09: Crear unidad con verificación de duplicado e identificador único
unidadesRouter.post(
  '/',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = crearUnidadSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos requeridos inválidos',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { tipoUnidad, numero, piso, areaM2, estado } = parsed.data;

      // CA4: Impedir registro duplicado
      const esDuplicado = await verificarIdentificadorDuplicado(tipoUnidad, numero);
      if (esDuplicado) {
        res.status(409).json({
          error: 'Conflict',
          message: 'El identificador ya se encuentra utilizado',
        });
        return;
      }

      let nuevaUnidad: any;

      if (tipoUnidad === 'Departamento') {
        nuevaUnidad = await prisma.departamento.create({
          data: {
            numero,
            piso: piso ?? null,
            areaM2: areaM2 ? areaM2 : null,
            estado: estado || 'Desocupado',
          },
        });
      } else if (tipoUnidad === 'Parqueo') {
        nuevaUnidad = await prisma.parqueo.create({
          data: {
            numero,
            estado: estado || 'Disponible',
          },
        });
      } else {
        nuevaUnidad = await prisma.baulera.create({
          data: {
            numero,
            estado: estado || 'Disponible',
          },
        });
      }

      res.status(201).json({
        message: 'Unidad registrada exitosamente',
        unidad: {
          ...nuevaUnidad,
          tipoUnidad,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/v1/unidades/:tipo/:id ───────────────────────────────────────────
// CA3, CA4, CA09: Modificar datos de unidad conservando información no modificada
unidadesRouter.put(
  '/:tipo/:id',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tipo = req.params.tipo as 'Departamento' | 'Parqueo' | 'Baulera';
      const id = parseInt(req.params.id);

      if (isNaN(id) || !['Departamento', 'Parqueo', 'Baulera'].includes(tipo)) {
        res.status(400).json({ error: 'Bad Request', message: 'Tipo o ID de unidad inválido' });
        return;
      }

      const parsed = editarUnidadSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos de edición inválidos',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { numero, piso, areaM2, estado } = parsed.data;

      // CA4: Si se modifica el identificador (`numero`), verificar duplicados
      if (numero) {
        const esDuplicado = await verificarIdentificadorDuplicado(tipo, numero, id);
        if (esDuplicado) {
          res.status(409).json({
            error: 'Conflict',
            message: 'El identificador ya se encuentra utilizado',
          });
          return;
        }
      }

      let unidadActualizada: any;

      if (tipo === 'Departamento') {
        unidadActualizada = await prisma.departamento.update({
          where: { idDepartamento: id },
          data: {
            ...(numero ? { numero } : {}),
            ...(piso !== undefined ? { piso } : {}),
            ...(areaM2 !== undefined ? { areaM2 } : {}),
            ...(estado ? { estado } : {}),
          },
        });
      } else if (tipo === 'Parqueo') {
        unidadActualizada = await prisma.parqueo.update({
          where: { idParqueo: id },
          data: {
            ...(numero ? { numero } : {}),
            ...(estado ? { estado } : {}),
          },
        });
      } else {
        unidadActualizada = await prisma.baulera.update({
          where: { idBaulera: id },
          data: {
            ...(numero ? { numero } : {}),
            ...(estado ? { estado } : {}),
          },
        });
      }

      res.json({
        message: 'Unidad actualizada exitosamente',
        unidad: {
          ...unidadActualizada,
          tipoUnidad: tipo,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/unidades/asignaciones ───────────────────────────────────────
// CA5, CA6, CA07, CA09: Asignar unidad (departamento, parqueo, baulera) registrando la relación e historial
unidadesRouter.post(
  '/asignaciones',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = asignacionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos de asignación inválidos',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { tipoUnidad, idUnidad, idPersona, idDepartamento, tipoRelacion, notas } = parsed.data;

      if (!idPersona && !idDepartamento) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Debe especificar una Persona o un Departamento para realizar la asignación',
        });
        return;
      }

      const ahora = new Date();

      if (tipoUnidad === 'Departamento') {
        const depto = await prisma.departamento.findUnique({ where: { idDepartamento: idUnidad } });
        if (!depto) {
          res.status(404).json({ error: 'Not Found', message: 'Departamento no encontrado' });
          return;
        }

        if (tipoRelacion === 'Propietario' && idPersona) {
          // CA07: Si ya tenía un propietario distinto, registrar el antecedente anterior
          if (depto.idPropietario && depto.idPropietario !== idPersona) {
            await prisma.historialAsignacionUnidad.create({
              data: {
                tipoUnidad: 'Departamento',
                idUnidad: depto.idDepartamento,
                numeroUnidad: depto.numero,
                idPersona: depto.idPropietario,
                tipoRelacion: 'Propietario',
                fechaInicio: ahora,
                fechaFin: ahora,
                notas: 'Cambio de propietario',
              },
            });
          }

          await prisma.departamento.update({
            where: { idDepartamento: idUnidad },
            data: { idPropietario: idPersona, estado: 'Ocupado' },
          });
        }

        if (idPersona) {
          // Finalizar cualquier ocupante previo activo para mantener antecedente (CA07)
          await prisma.ocupanteDepartamento.updateMany({
            where: { idDepartamento: idUnidad, fechaFin: null },
            data: { fechaFin: ahora },
          });

          await prisma.ocupanteDepartamento.create({
            data: {
              idDepartamento: idUnidad,
              idPersona,
              tipoOcupante: tipoRelacion === 'Inquilino' ? 'Inquilino' : 'Propietario',
              fechaInicio: ahora,
            },
          });
        }

        // Registrar entrada en historial de antecedentes (CA07)
        await prisma.historialAsignacionUnidad.create({
          data: {
            tipoUnidad: 'Departamento',
            idUnidad: depto.idDepartamento,
            numeroUnidad: depto.numero,
            idPersona: idPersona || null,
            tipoRelacion,
            fechaInicio: ahora,
            notas: notas || `Asignación de ${tipoRelacion}`,
          },
        });

        res.json({ message: 'Asignación de departamento realizada correctamente' });
        return;
      } else if (tipoUnidad === 'Parqueo') {
        const parqueo = await prisma.parqueo.findUnique({ where: { idParqueo: idUnidad } });
        if (!parqueo) {
          res.status(404).json({ error: 'Not Found', message: 'Parqueo no encontrado' });
          return;
        }

        // CA07: Si el parqueo ya estaba asignado, cerrar antecedente previo en el historial
        if (parqueo.estado === 'Asignado' && (parqueo.idPersona || parqueo.idDepartamento)) {
          await prisma.historialAsignacionUnidad.create({
            data: {
              tipoUnidad: 'Parqueo',
              idUnidad: parqueo.idParqueo,
              numeroUnidad: parqueo.numero,
              idPersona: parqueo.idPersona,
              idDepartamento: parqueo.idDepartamento,
              tipoRelacion: 'Asignado',
              fechaInicio: parqueo.fechaAsignacion || ahora,
              fechaFin: ahora,
              notas: 'Asignación previa finalizada al reasignar',
            },
          });
        }

        // CA6: Actualizar el estado del parqueo para que deje de figurar como 'Disponible' (pasa a 'Asignado')
        const parqueoActualizado = await prisma.parqueo.update({
          where: { idParqueo: idUnidad },
          data: {
            estado: 'Asignado',
            idDepartamento: idDepartamento || null,
            idPersona: idPersona || null,
            fechaAsignacion: ahora,
          },
        });

        // CA07: Guardar la nueva asignación en el historial
        await prisma.historialAsignacionUnidad.create({
          data: {
            tipoUnidad: 'Parqueo',
            idUnidad: parqueoActualizado.idParqueo,
            numeroUnidad: parqueoActualizado.numero,
            idPersona: idPersona || null,
            idDepartamento: idDepartamento || null,
            tipoRelacion: 'Asignado',
            fechaInicio: ahora,
            notas: notas || 'Asignación de parqueo',
          },
        });

        res.json({
          message: 'Asignación de parqueo registrada y estado actualizado a Asignado',
          parqueo: parqueoActualizado,
        });
        return;
      } else if (tipoUnidad === 'Baulera') {
        const baulera = await prisma.baulera.findUnique({ where: { idBaulera: idUnidad } });
        if (!baulera) {
          res.status(404).json({ error: 'Not Found', message: 'Baulera no encontrada' });
          return;
        }

        // CA07: Guardar antecedente previo si estaba asignada
        if (baulera.estado === 'Asignado' && (baulera.idPersona || baulera.idDepartamento)) {
          await prisma.historialAsignacionUnidad.create({
            data: {
              tipoUnidad: 'Baulera',
              idUnidad: baulera.idBaulera,
              numeroUnidad: baulera.numero,
              idPersona: baulera.idPersona,
              idDepartamento: baulera.idDepartamento,
              tipoRelacion: 'Asignado',
              fechaInicio: baulera.fechaAsignacion || ahora,
              fechaFin: ahora,
              notas: 'Asignación previa finalizada al reasignar',
            },
          });
        }

        // CA6: Actualizar estado de baulera a 'Asignado'
        const bauleraActualizada = await prisma.baulera.update({
          where: { idBaulera: idUnidad },
          data: {
            estado: 'Asignado',
            idDepartamento: idDepartamento || null,
            idPersona: idPersona || null,
            fechaAsignacion: ahora,
          },
        });

        // CA07: Guardar historial
        await prisma.historialAsignacionUnidad.create({
          data: {
            tipoUnidad: 'Baulera',
            idUnidad: bauleraActualizada.idBaulera,
            numeroUnidad: bauleraActualizada.numero,
            idPersona: idPersona || null,
            idDepartamento: idDepartamento || null,
            tipoRelacion: 'Asignado',
            fechaInicio: ahora,
            notas: notas || 'Asignación de baulera',
          },
        });

        res.json({
          message: 'Asignación de baulera registrada y estado actualizado a Asignado',
          baulera: bauleraActualizada,
        });
        return;
      }
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/unidades/asignaciones/finalizar ─────────────────────────────
// CA6, CA07, CA09: Finalizar asignación vigente, restaurar estado 'Disponible' y conservar antecedente
unidadesRouter.post(
  '/asignaciones/finalizar',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = finalizarAsignacionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos de finalización inválidos',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { tipoUnidad, idUnidad, notas } = parsed.data;
      const ahora = new Date();

      if (tipoUnidad === 'Departamento') {
        const depto = await prisma.departamento.findUnique({ where: { idDepartamento: idUnidad } });
        if (!depto) {
          res.status(404).json({ error: 'Not Found', message: 'Departamento no encontrado' });
          return;
        }

        // Finalizar ocupantes activos
        await prisma.ocupanteDepartamento.updateMany({
          where: { idDepartamento: idUnidad, fechaFin: null },
          data: { fechaFin: ahora },
        });

        // Registrar antecedente en historial
        await prisma.historialAsignacionUnidad.create({
          data: {
            tipoUnidad: 'Departamento',
            idUnidad: depto.idDepartamento,
            numeroUnidad: depto.numero,
            idPersona: depto.idPropietario,
            tipoRelacion: 'Finalizado',
            fechaInicio: ahora,
            fechaFin: ahora,
            notas: notas || 'Asignación finalizada',
          },
        });

        await prisma.departamento.update({
          where: { idDepartamento: idUnidad },
          data: { estado: 'Desocupado' },
        });

        res.json({ message: 'Asignación de departamento finalizada' });
        return;
      } else if (tipoUnidad === 'Parqueo') {
        const parqueo = await prisma.parqueo.findUnique({ where: { idParqueo: idUnidad } });
        if (!parqueo) {
          res.status(404).json({ error: 'Not Found', message: 'Parqueo no encontrado' });
          return;
        }

        // CA07: Conservar el antecedente de la asignación anterior
        await prisma.historialAsignacionUnidad.create({
          data: {
            tipoUnidad: 'Parqueo',
            idUnidad: parqueo.idParqueo,
            numeroUnidad: parqueo.numero,
            idPersona: parqueo.idPersona,
            idDepartamento: parqueo.idDepartamento,
            tipoRelacion: 'Asignado',
            fechaInicio: parqueo.fechaAsignacion || ahora,
            fechaFin: ahora,
            notas: notas || 'Asignación finalizada - vuelve a estar disponible',
          },
        });

        // CA6: Retornar a estado 'Disponible'
        const parqueoLibre = await prisma.parqueo.update({
          where: { idParqueo: idUnidad },
          data: {
            estado: 'Disponible',
            idDepartamento: null,
            idPersona: null,
            fechaAsignacion: null,
          },
        });

        res.json({ message: 'Asignación de parqueo finalizada', parqueo: parqueoLibre });
        return;
      } else if (tipoUnidad === 'Baulera') {
        const baulera = await prisma.baulera.findUnique({ where: { idBaulera: idUnidad } });
        if (!baulera) {
          res.status(404).json({ error: 'Not Found', message: 'Baulera no encontrada' });
          return;
        }

        // CA07: Conservar antecedente
        await prisma.historialAsignacionUnidad.create({
          data: {
            tipoUnidad: 'Baulera',
            idUnidad: baulera.idBaulera,
            numeroUnidad: baulera.numero,
            idPersona: baulera.idPersona,
            idDepartamento: baulera.idDepartamento,
            tipoRelacion: 'Asignado',
            fechaInicio: baulera.fechaAsignacion || ahora,
            fechaFin: ahora,
            notas: notas || 'Asignación finalizada - vuelve a estar disponible',
          },
        });

        // CA6: Retornar a estado 'Disponible'
        const bauleraLibre = await prisma.baulera.update({
          where: { idBaulera: idUnidad },
          data: {
            estado: 'Disponible',
            idDepartamento: null,
            idPersona: null,
            fechaAsignacion: null,
          },
        });

        res.json({ message: 'Asignación de baulera finalizada', baulera: bauleraLibre });
        return;
      }
    } catch (err) {
      next(err);
    }
  }
);
