//-----------------------------Giovani Quiroz------------------------
// backend/src/routes/unidades.routes.ts
// HU03 — Gestión de Unidades (Departamentos, Parqueos, Bauleras), Asignaciones e Historial de Antecedentes

import { Router, Response, NextFunction, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { auditoriaService } from '../modules/auditoria';

export const unidadesRouter: IRouter = Router();
unidadesRouter.use(authMiddleware);

// ── Validation Schemas ────────────────────────────────────────────────────────
const crearUnidadSchema = z.object({
  tipoUnidad: z.enum(['Departamento', 'Parqueo', 'Baulera']),
  numero: z.string().min(1, 'El identificador es obligatorio').max(20),
  piso: z.number().int().optional(),
  areaM2: z.number().positive().optional(),
  estado: z.string().optional(),
  idTipo: z.number().int().positive().nullable().optional(),
});

const editarUnidadSchema = z.object({
  numero: z.string().min(1).max(20).optional(),
  piso: z.number().int().optional(),
  areaM2: z.number().positive().optional(),
  estado: z.string().optional(),
  idTipo: z.number().int().positive().nullable().optional(),
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
// Retorna tipo y monto del tipo de departamento si está configurado
unidadesRouter.get(
  '/',
  authorizeRoles('Administrador', 'Directorio', 'Consulta', 'Copropietario'),
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
            tipo: true,
          },
          orderBy: { numero: 'asc' },
        });

        deptos.forEach((d) => {
          const tieneOcupante = d.ocupantes.length > 0;
          const tienePropietario = !!d.propietario;
          const tieneAsignacionActiva = tieneOcupante || tienePropietario;

          // Sincronización automática de estado: Ocupado si tiene titular/ocupante activo, Disponible si no
          let estadoFinal = d.estado;
          if (['Ocupado', 'Disponible', 'Desocupado'].includes(d.estado)) {
            estadoFinal = tieneAsignacionActiva ? 'Ocupado' : 'Disponible';
          }

          if (filterEstado && filterEstado !== 'Todos' && estadoFinal !== filterEstado) {
            return;
          }

          results.push({
            id: d.idDepartamento,
            tipoUnidad: 'Departamento',
            numero: d.numero,
            piso: d.piso,
            areaM2: d.areaM2 ? Number(d.areaM2) : null,
            estado: estadoFinal,
            idTipo: d.idTipo ?? null,
            tipo: d.tipo ? d.tipo.nombre : null,
            monto: d.tipo ? Number(d.tipo.montoExpensa) : null,
            tipoDepartamento: d.tipo
              ? {
                  idTipo: d.tipo.idTipo,
                  nombre: d.tipo.nombre,
                  montoExpensa: Number(d.tipo.montoExpensa),
                }
              : null,
            propietario: d.propietario,
            ocupanteActual: tieneOcupante ? d.ocupantes[0].persona : null,
            tipoOcupante: tieneOcupante ? d.ocupantes[0].tipoOcupante : (tienePropietario ? 'Propietario' : null),
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
// historialAsignaciones:
// - Para Departamento: proviene de ocupantes_departamento
// - Para Parqueo y Baulera: proviene de los eventos de auditoria de esa unidad
unidadesRouter.get(
  '/:tipo/:id',
  authorizeRoles('Administrador', 'Directorio', 'Consulta', 'Copropietario'),
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
            tipo: true,
            ocupantes: {
              include: { persona: true },
              orderBy: { fechaInicio: 'desc' },
            },
          },
        });

        if (unidad) {
          // Historial de asignaciones para Departamento obtenido de ocupantes_departamento
          const ocupantes = await prisma.ocupanteDepartamento.findMany({
            where: { idDepartamento: id },
            include: { persona: true, departamento: true },
            orderBy: { fechaInicio: 'desc' },
          });

          historial = ocupantes.map((oc) => ({
            idHistorial: oc.idOcupacion,
            tipoUnidad: 'Departamento',
            idUnidad: oc.idDepartamento,
            numeroUnidad: unidad.numero,
            idPersona: oc.idPersona,
            idDepartamento: oc.idDepartamento,
            tipoRelacion: oc.tipoOcupante,
            fechaInicio: oc.fechaInicio,
            fechaFin: oc.fechaFin,
            notas: `Ocupación registrada como ${oc.tipoOcupante}`,
            persona: oc.persona,
            departamento: oc.departamento,
          }));
        }
      } else if (tipo === 'Parqueo') {
        unidad = await prisma.parqueo.findUnique({
          where: { idParqueo: id },
          include: { departamento: true, persona: true },
        });

        if (unidad) {
          // Historial de asignaciones para Parqueo obtenido de los eventos de auditoría
          const eventos = await prisma.auditoria.findMany({
            where: {
              tablaAfectada: 'parqueos',
              idRegistro: String(id),
            },
            orderBy: { fechaHora: 'desc' },
          });

          const personaIds = new Set<number>();
          const deptoIds = new Set<number>();

          eventos.forEach((ev) => {
            const dn = (ev.datosNuevos as any) || {};
            const da = (ev.datosAnteriores as any) || {};
            if (dn?.idPersona) personaIds.add(Number(dn.idPersona));
            if (dn?.idDepartamento) deptoIds.add(Number(dn.idDepartamento));
            if (da?.idPersona) personaIds.add(Number(da.idPersona));
            if (da?.idDepartamento) deptoIds.add(Number(da.idDepartamento));
          });

          const personas = personaIds.size > 0
            ? await prisma.persona.findMany({ where: { idPersona: { in: Array.from(personaIds) } } })
            : [];
          const deptos = deptoIds.size > 0
            ? await prisma.departamento.findMany({ where: { idDepartamento: { in: Array.from(deptoIds) } } })
            : [];

          const personaMap = new Map(personas.map((p) => [p.idPersona, p]));
          const deptoMap = new Map(deptos.map((d) => [d.idDepartamento, d]));

          historial = eventos.map((ev) => {
            const dn = (ev.datosNuevos as any) || {};
            const da = (ev.datosAnteriores as any) || {};
            const idPersona = dn.idPersona ?? da.idPersona ?? null;
            const idDepartamento = dn.idDepartamento ?? da.idDepartamento ?? null;
            const tipoRelacion = dn.tipoRelacion || (ev.accion === 'FINALIZACION_ASIGNACION' ? 'Finalizado' : 'Asignado');

            return {
              idHistorial: Number(ev.idAuditoria),
              tipoUnidad: 'Parqueo',
              idUnidad: id,
              numeroUnidad: unidad.numero,
              idPersona,
              idDepartamento,
              tipoRelacion,
              fechaInicio: ev.fechaHora,
              fechaFin: ev.accion === 'FINALIZACION_ASIGNACION' ? ev.fechaHora : null,
              notas: dn.notas || `Evento de auditoría: ${ev.accion}`,
              persona: idPersona ? personaMap.get(idPersona) || null : null,
              departamento: idDepartamento ? deptoMap.get(idDepartamento) || null : null,
            };
          });
        }
      } else if (tipo === 'Baulera') {
        unidad = await prisma.baulera.findUnique({
          where: { idBaulera: id },
          include: { departamento: true, persona: true },
        });

        if (unidad) {
          // Historial de asignaciones para Baulera obtenido de los eventos de auditoría
          const eventos = await prisma.auditoria.findMany({
            where: {
              tablaAfectada: 'bauleras',
              idRegistro: String(id),
            },
            orderBy: { fechaHora: 'desc' },
          });

          const personaIds = new Set<number>();
          const deptoIds = new Set<number>();

          eventos.forEach((ev) => {
            const dn = (ev.datosNuevos as any) || {};
            const da = (ev.datosAnteriores as any) || {};
            if (dn?.idPersona) personaIds.add(Number(dn.idPersona));
            if (dn?.idDepartamento) deptoIds.add(Number(dn.idDepartamento));
            if (da?.idPersona) personaIds.add(Number(da.idPersona));
            if (da?.idDepartamento) deptoIds.add(Number(da.idDepartamento));
          });

          const personas = personaIds.size > 0
            ? await prisma.persona.findMany({ where: { idPersona: { in: Array.from(personaIds) } } })
            : [];
          const deptos = deptoIds.size > 0
            ? await prisma.departamento.findMany({ where: { idDepartamento: { in: Array.from(deptoIds) } } })
            : [];

          const personaMap = new Map(personas.map((p) => [p.idPersona, p]));
          const deptoMap = new Map(deptos.map((d) => [d.idDepartamento, d]));

          historial = eventos.map((ev) => {
            const dn = (ev.datosNuevos as any) || {};
            const da = (ev.datosAnteriores as any) || {};
            const idPersona = dn.idPersona ?? da.idPersona ?? null;
            const idDepartamento = dn.idDepartamento ?? da.idDepartamento ?? null;
            const tipoRelacion = dn.tipoRelacion || (ev.accion === 'FINALIZACION_ASIGNACION' ? 'Finalizado' : 'Asignado');

            return {
              idHistorial: Number(ev.idAuditoria),
              tipoUnidad: 'Baulera',
              idUnidad: id,
              numeroUnidad: unidad.numero,
              idPersona,
              idDepartamento,
              tipoRelacion,
              fechaInicio: ev.fechaHora,
              fechaFin: ev.accion === 'FINALIZACION_ASIGNACION' ? ev.fechaHora : null,
              notas: dn.notas || `Evento de auditoría: ${ev.accion}`,
              persona: idPersona ? personaMap.get(idPersona) || null : null,
              departamento: idDepartamento ? deptoMap.get(idDepartamento) || null : null,
            };
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
          ...(tipo === 'Departamento'
            ? {
                tipo: unidad.tipo ? unidad.tipo.nombre : null,
                monto: unidad.tipo ? Number(unidad.tipo.montoExpensa) : null,
              }
            : {}),
        },
        historial,
        historialAsignaciones: historial,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/unidades ────────────────────────────────────────────────────
// CA1, CA4, CA09: Crear unidad con verificación de duplicado e identificador único
// Acepta idTipo opcional para Departamentos (debe existir en tipos_departamento, si no 422)
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

      const { tipoUnidad, numero, piso, areaM2, estado, idTipo } = parsed.data;

      // Validación de idTipo en tipos_departamento para Departamentos
      if (tipoUnidad === 'Departamento' && idTipo !== undefined && idTipo !== null) {
        const tipoExistente = await prisma.tipoDepartamento.findUnique({
          where: { idTipo },
        });
        if (!tipoExistente) {
          res.status(422).json({
            error: 'UNPROCESSABLE_ENTITY',
            message: 'El idTipo especificado no existe en tipos_departamento',
          });
          return;
        }
      }

      // CA4: Impedir registro duplicado
      const esDuplicado = await verificarIdentificadorDuplicado(tipoUnidad, numero);
      if (esDuplicado) {
        res.status(409).json({
          error: 'IDENTIFICADOR_DUPLICADO',
          message: 'El identificador ya se encuentra utilizado',
        });
        return;
      }

      // Regla: Bloquear si viene manual 'Ocupado' en Departamento
      if (tipoUnidad === 'Departamento' && estado === 'Ocupado') {
        res.status(400).json({
          error: 'ESTADO_TRANSICION_AUTOMATICA',
          message: 'No se permite asignar el estado Ocupado manualmente',
        });
        return;
      }

      let nuevaUnidad: any;

      if (tipoUnidad === 'Departamento') {
        const estadoFinal = estado && estado !== 'Desocupado' ? estado : 'Disponible';
        nuevaUnidad = await prisma.departamento.create({
          data: {
            numero,
            piso: piso ?? null,
            areaM2: areaM2 ? areaM2 : null,
            estado: estadoFinal,
            idTipo: idTipo ?? null,
          },
          include: {
            tipo: true,
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

      const idUsuario = req.user?.idUsuario ?? null;
      await auditoriaService.registrarEvento({
        tablaAfectada: tipoUnidad === 'Departamento' ? 'departamentos' : tipoUnidad === 'Parqueo' ? 'parqueos' : 'bauleras',
        idRegistro: String(
          tipoUnidad === 'Departamento'
            ? nuevaUnidad.idDepartamento
            : tipoUnidad === 'Parqueo'
            ? nuevaUnidad.idParqueo
            : nuevaUnidad.idBaulera
        ),
        accion: 'CREATE',
        idUsuario,
        datosAnteriores: null,
        datosNuevos: nuevaUnidad,
      });

      res.status(201).json({
        message: 'Unidad registrada exitosamente',
        unidad: {
          ...nuevaUnidad,
          tipoUnidad,
          ...(tipoUnidad === 'Departamento'
            ? {
                tipo: nuevaUnidad.tipo ? nuevaUnidad.tipo.nombre : null,
                monto: nuevaUnidad.tipo ? Number(nuevaUnidad.tipo.montoExpensa) : null,
              }
            : {}),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/v1/unidades/:tipo/:id ───────────────────────────────────────────
// CA3, CA4, CA09: Modificar datos de unidad conservando información no modificada
// PUT /unidades/Departamento/:id acepta idTipo opcional (debe existir en tipos_departamento, si no 422)
// Auditoría con datosAnteriores y datosNuevos
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

      const { numero, piso, areaM2, estado, idTipo } = parsed.data;

      // Validación de idTipo para Departamento (422 si no existe)
      if (tipo === 'Departamento' && idTipo !== undefined && idTipo !== null) {
        const tipoExistente = await prisma.tipoDepartamento.findUnique({
          where: { idTipo },
        });
        if (!tipoExistente) {
          res.status(422).json({
            error: 'UNPROCESSABLE_ENTITY',
            message: 'El idTipo especificado no existe en tipos_departamento',
          });
          return;
        }
      }

      // CA4: Si se modifica el identificador (`numero`), verificar duplicados
      if (numero) {
        const esDuplicado = await verificarIdentificadorDuplicado(tipo, numero, id);
        if (esDuplicado) {
          res.status(409).json({
            error: 'IDENTIFICADOR_DUPLICADO',
            message: 'El identificador ya se encuentra utilizado',
          });
          return;
        }
      }

      let unidadAnterior: any = null;
      if (tipo === 'Departamento') {
        unidadAnterior = await prisma.departamento.findUnique({
          where: { idDepartamento: id },
          include: { tipo: true },
        });
      } else if (tipo === 'Parqueo') {
        unidadAnterior = await prisma.parqueo.findUnique({ where: { idParqueo: id } });
      } else {
        unidadAnterior = await prisma.baulera.findUnique({ where: { idBaulera: id } });
      }

      if (!unidadAnterior) {
        res.status(404).json({ error: 'Not Found', message: 'Unidad no encontrada' });
        return;
      }

      // Regla: Bloquear si viene manual 'Ocupado' o 'Disponible' en Departamento y difiere del estado actual
      if (tipo === 'Departamento' && estado !== undefined && estado !== unidadAnterior.estado) {
        if (estado === 'Ocupado' || estado === 'Disponible') {
          res.status(400).json({
            error: 'ESTADO_TRANSICION_AUTOMATICA',
            message: 'Los estados Ocupado y Disponible no pueden ser modificados manualmente',
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
            ...(idTipo !== undefined ? { idTipo } : {}),
          },
          include: {
            tipo: true,
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

      const idUsuario = req.user?.idUsuario ?? null;
      await auditoriaService.registrarEvento({
        tablaAfectada: tipo === 'Departamento' ? 'departamentos' : tipo === 'Parqueo' ? 'parqueos' : 'bauleras',
        idRegistro: String(id),
        accion: 'UPDATE',
        idUsuario,
        datosAnteriores: unidadAnterior,
        datosNuevos: unidadActualizada,
      });

      res.json({
        message: 'Unidad actualizada exitosamente',
        unidad: {
          ...unidadActualizada,
          tipoUnidad: tipo,
          ...(tipo === 'Departamento'
            ? {
                tipo: unidadActualizada.tipo ? unidadActualizada.tipo.nombre : null,
                monto: unidadActualizada.tipo ? Number(unidadActualizada.tipo.montoExpensa) : null,
              }
            : {}),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/unidades/asignaciones ───────────────────────────────────────
// CA5, CA6, CA07, CA09: Asignar unidad (departamento, parqueo, baulera)
// Para Parqueo y Baulera: actualiza solo estado, id_departamento, id_persona y fecha_asignacion en $transaction con auditoría
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
      const idUsuario = req.user?.idUsuario ?? null;

      const result = await prisma.$transaction(async (tx) => {
        if (tipoUnidad === 'Departamento') {
          const depto = await tx.departamento.findUnique({ where: { idDepartamento: idUnidad } });
          if (!depto) {
            return { status: 404, body: { error: 'Not Found', message: 'Departamento no encontrado' } };
          }

          const deptoAnterior = { ...depto };

          if (tipoRelacion === 'Propietario' && idPersona) {
            await tx.departamento.update({
              where: { idDepartamento: idUnidad },
              data: { idPropietario: idPersona, estado: 'Ocupado' },
            });
          }

          if (idPersona) {
            // Finalizar ocupantes previos activos
            await tx.ocupanteDepartamento.updateMany({
              where: { idDepartamento: idUnidad, fechaFin: null },
              data: { fechaFin: ahora },
            });

            await tx.ocupanteDepartamento.create({
              data: {
                idDepartamento: idUnidad,
                idPersona,
                tipoOcupante: tipoRelacion === 'Inquilino' ? 'Inquilino' : 'Propietario',
                fechaInicio: ahora,
              },
            });

            await tx.departamento.update({
              where: { idDepartamento: idUnidad },
              data: { estado: 'Ocupado' },
            });
          }

          await auditoriaService.registrarEvento({
            tablaAfectada: 'departamentos',
            idRegistro: String(idUnidad),
            accion: 'ASIGNACION_UNIDAD',
            idUsuario,
            datosAnteriores: deptoAnterior,
            datosNuevos: { tipoUnidad, idUnidad, idPersona, tipoRelacion, notas },
            tx,
          });

          return { status: 200, body: { message: 'Asignación de departamento realizada correctamente' } };
        } else if (tipoUnidad === 'Parqueo') {
          const parqueo = await tx.parqueo.findUnique({ where: { idParqueo: idUnidad } });
          if (!parqueo) {
            return { status: 404, body: { error: 'Not Found', message: 'Parqueo no encontrado' } };
          }

          const parqueoAnterior = { ...parqueo };

          // Actualiza solo estado, id_departamento, id_persona y fecha_asignacion
          const parqueoActualizado = await tx.parqueo.update({
            where: { idParqueo: idUnidad },
            data: {
              estado: 'Asignado',
              idDepartamento: idDepartamento || null,
              idPersona: idPersona || null,
              fechaAsignacion: ahora,
            },
          });

          await auditoriaService.registrarEvento({
            tablaAfectada: 'parqueos',
            idRegistro: String(idUnidad),
            accion: 'ASIGNACION_UNIDAD',
            idUsuario,
            datosAnteriores: parqueoAnterior,
            datosNuevos: {
              tipoUnidad,
              idUnidad,
              idPersona: idPersona || null,
              idDepartamento: idDepartamento || null,
              tipoRelacion,
              notas,
              estado: 'Asignado',
              fechaAsignacion: ahora,
            },
            tx,
          });

          return {
            status: 200,
            body: {
              message: 'Asignación de parqueo registrada y estado actualizado a Asignado',
              parqueo: parqueoActualizado,
            },
          };
        } else if (tipoUnidad === 'Baulera') {
          const baulera = await tx.baulera.findUnique({ where: { idBaulera: idUnidad } });
          if (!baulera) {
            return { status: 404, body: { error: 'Not Found', message: 'Baulera no encontrada' } };
          }

          const bauleraAnterior = { ...baulera };

          // Actualiza solo estado, id_departamento, id_persona y fecha_asignacion
          const bauleraActualizada = await tx.baulera.update({
            where: { idBaulera: idUnidad },
            data: {
              estado: 'Asignado',
              idDepartamento: idDepartamento || null,
              idPersona: idPersona || null,
              fechaAsignacion: ahora,
            },
          });

          await auditoriaService.registrarEvento({
            tablaAfectada: 'bauleras',
            idRegistro: String(idUnidad),
            accion: 'ASIGNACION_UNIDAD',
            idUsuario,
            datosAnteriores: bauleraAnterior,
            datosNuevos: {
              tipoUnidad,
              idUnidad,
              idPersona: idPersona || null,
              idDepartamento: idDepartamento || null,
              tipoRelacion,
              notas,
              estado: 'Asignado',
              fechaAsignacion: ahora,
            },
            tx,
          });

          return {
            status: 200,
            body: {
              message: 'Asignación de baulera registrada y estado actualizado a Asignado',
              baulera: bauleraActualizada,
            },
          };
        }

        return { status: 400, body: { error: 'Bad Request', message: 'Tipo de unidad no soportado' } };
      }, { timeout: 30000, maxWait: 15000 });

      res.status(result.status).json(result.body);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/unidades/asignaciones/finalizar ─────────────────────────────
// CA6, CA07, CA09: Finalizar asignación vigente, restaurar estado 'Disponible'
// Para Parqueo y Baulera: actualiza solo estado, id_departamento, id_persona y fecha_asignacion en $transaction con auditoría
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
      const idUsuario = req.user?.idUsuario ?? null;

      const result = await prisma.$transaction(async (tx) => {
        if (tipoUnidad === 'Departamento') {
          const depto = await tx.departamento.findUnique({ where: { idDepartamento: idUnidad } });
          if (!depto) {
            return { status: 404, body: { error: 'Not Found', message: 'Departamento no encontrado' } };
          }

          const deptoAnterior = { ...depto };

          // Finalizar ocupantes activos
          await tx.ocupanteDepartamento.updateMany({
            where: { idDepartamento: idUnidad, fechaFin: null },
            data: { fechaFin: ahora },
          });

          // Verificar ocupantes activos restantes para sincronizar estado (Ocupado / Disponible)
          const ocupantesActivos = await tx.ocupanteDepartamento.count({
            where: { idDepartamento: idUnidad, fechaFin: null },
          });
          const nuevoEstado = ocupantesActivos > 0 ? 'Ocupado' : 'Disponible';

          await tx.departamento.update({
            where: { idDepartamento: idUnidad },
            data: {
              estado: nuevoEstado,
              ...(nuevoEstado === 'Disponible' ? { idPropietario: null } : {}),
            },
          });

          await auditoriaService.registrarEvento({
            tablaAfectada: 'departamentos',
            idRegistro: String(idUnidad),
            accion: 'FINALIZACION_ASIGNACION',
            idUsuario,
            datosAnteriores: deptoAnterior,
            datosNuevos: { tipoUnidad, idUnidad, notas, estado: nuevoEstado },
            tx,
          });

          return { status: 200, body: { message: 'Asignación de departamento finalizada' } };
        } else if (tipoUnidad === 'Parqueo') {
          const parqueo = await tx.parqueo.findUnique({ where: { idParqueo: idUnidad } });
          if (!parqueo) {
            return { status: 404, body: { error: 'Not Found', message: 'Parqueo no encontrado' } };
          }

          const parqueoAnterior = { ...parqueo };

          // CA6: Retornar a estado 'Disponible' y limpiar departamento, persona y fechaAsignacion
          const parqueoLibre = await tx.parqueo.update({
            where: { idParqueo: idUnidad },
            data: {
              estado: 'Disponible',
              idDepartamento: null,
              idPersona: null,
              fechaAsignacion: null,
            },
          });

          await auditoriaService.registrarEvento({
            tablaAfectada: 'parqueos',
            idRegistro: String(idUnidad),
            accion: 'FINALIZACION_ASIGNACION',
            idUsuario,
            datosAnteriores: parqueoAnterior,
            datosNuevos: { tipoUnidad, idUnidad, notas, estado: 'Disponible' },
            tx,
          });

          return { status: 200, body: { message: 'Asignación de parqueo finalizada', parqueo: parqueoLibre } };
        } else if (tipoUnidad === 'Baulera') {
          const baulera = await tx.baulera.findUnique({ where: { idBaulera: idUnidad } });
          if (!baulera) {
            return { status: 404, body: { error: 'Not Found', message: 'Baulera no encontrada' } };
          }

          const bauleraAnterior = { ...baulera };

          // CA6: Retornar a estado 'Disponible' y limpiar departamento, persona y fechaAsignacion
          const bauleraLibre = await tx.baulera.update({
            where: { idBaulera: idUnidad },
            data: {
              estado: 'Disponible',
              idDepartamento: null,
              idPersona: null,
              fechaAsignacion: null,
            },
          });

          await auditoriaService.registrarEvento({
            tablaAfectada: 'bauleras',
            idRegistro: String(idUnidad),
            accion: 'FINALIZACION_ASIGNACION',
            idUsuario,
            datosAnteriores: bauleraAnterior,
            datosNuevos: { tipoUnidad, idUnidad, notas, estado: 'Disponible' },
            tx,
          });

          return { status: 200, body: { message: 'Asignación de baulera finalizada', baulera: bauleraLibre } };
        }

        return { status: 400, body: { error: 'Bad Request', message: 'Tipo de unidad no soportado' } };
      }, { timeout: 30000, maxWait: 15000 });

      res.status(result.status).json(result.body);
    } catch (err) {
      next(err);
    }
  }
);
