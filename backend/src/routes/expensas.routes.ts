// backend/src/routes/expensas.routes.ts
// HU04 — Gestión de Expensas, Generación Masiva, Pagos, Mora, Morosos, Estado de Cuenta y Auditoría

import { Router, Response, NextFunction, IRouter } from 'express';
import { prisma, Prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { auditoriaService } from '../modules/auditoria';
import {
  calcularCapitalPendiente,
  configurarReglaMora,
  obtenerReglasMora,
  ejecutarCalculoMora,
} from '../modules/expensas';

export const expensasRouter: IRouter = Router();
expensasRouter.use(authMiddleware);

// Helper para guardar registro de auditoría (CA10)
async function registrarAuditoria(
  req: AuthRequest,
  accion: string,
  tablaAfectada: string,
  idRegistro: string,
  datosAnteriores?: any,
  datosNuevos?: any,
  resultado: string = 'EXITO'
) {
  try {
    await prisma.auditoria.create({
      data: {
        tablaAfectada,
        idRegistro: String(idRegistro),
        accion,
        resultado,
        datosAnteriores: datosAnteriores ? JSON.parse(JSON.stringify(datosAnteriores)) : undefined,
        datosNuevos: datosNuevos ? JSON.parse(JSON.stringify(datosNuevos)) : undefined,
        idUsuario: req.user?.idUsuario || null,
        fechaHora: new Date(),
      },
    });
  } catch (err) {
    console.error('Error al guardar auditoría:', err);
  }
}

// ── Validation Schemas ────────────────────────────────────────────────────────
const expensaSchema = z.object({
  idDepartamento: z.number().int().positive(),
  periodo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  monto: z.number().positive(),
  tasaInteresMora: z.number().min(0).max(100).optional(),
  fechaVencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
});

const generarMasivoSchema = z.object({
  periodo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  fechaVencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  montoBase: z.number().positive().optional().default(500),
  tasaInteresMora: z.number().min(0).max(100).optional(),
  excluirDepartamentos: z.array(z.number().int()).optional().default([]),
  idDepartamentos: z.array(z.number().int()).optional(),
});

const pagoSchema = z.object({
  idDepartamento: z.number().int().positive().optional(),
  idExpensa: z.number().int().positive().nullable().optional(),
  idPersonaPagador: z.number().int().positive().optional(),
  montoPagado: z.number(),
  interesPagado: z.number().min(0).default(0),
  metodoPago: z.enum(['Efectivo', 'Transferencia', 'Cheque', 'QR']).optional(),
  esAnticipado: z.boolean().default(false),
  idCuenta: z.number().int().positive().optional(),
  comprobanteUrl: z.string().optional(),
});

const aplicarAnticipoSchema = z.object({
  monto: z.number().positive().optional(),
});

const anularPagoSchema = z.object({
  motivo: z.string().min(1, 'El motivo de anulación es obligatorio'),
});

const corregirPagoSchema = pagoSchema.extend({
  motivo: z.string().min(1, 'El motivo de corrección es obligatorio'),
});

const reglaMoraSchema = z.object({
  tasaInteres: z.number().min(0, 'La tasa de interés debe ser mayor o igual a 0').max(100, 'La tasa de interés no puede exceder 100'),
  diasGracia: z.number().int().min(0, 'Los días de gracia no pueden ser negativos').optional().default(0),
});

// ── Helper FIFO para aplicación automática de anticipos ──────────────────────
async function aplicarAnticiposFIFO(
  tx: Prisma.TransactionClient,
  expensa: { idExpensa: number; idDepartamento: number; monto: any; saldoPendiente: any; estado?: string },
  idUsuario?: number | null
) {
  let saldoPendiente = Number(expensa.saldoPendiente);
  if (saldoPendiente <= 0) {
    return expensa;
  }

  // Buscar anticipos activos (idExpensa null, esAnticipado true, anulado false) del mismo departamento ordenados FIFO por fechaPago / idPago
  const anticipos = await tx.pago.findMany({
    where: {
      idDepartamento: expensa.idDepartamento,
      idExpensa: null,
      esAnticipado: true,
      anulado: false,
    },
    include: {
      aplicacionesAnticipo: true,
    },
    orderBy: [
      { fechaPago: 'asc' },
      { idPago: 'asc' },
    ],
  });

  let aplicacionesRealizadas = 0;

  for (const ant of anticipos) {
    if (saldoPendiente <= 0) break;

    const totalAplicado = ant.aplicacionesAnticipo.reduce(
      (acc, a) => acc + Number(a.monto),
      0
    );
    const saldoDisponible = Math.max(0, Number(ant.montoPagado) - totalAplicado);

    if (saldoDisponible <= 0) continue;

    const montoAAplicar = Math.min(saldoPendiente, saldoDisponible);
    const montoRedondeado = Math.round(montoAAplicar * 100) / 100;

    if (montoRedondeado <= 0) continue;

    await tx.aplicacionAnticipo.create({
      data: {
        idPago: ant.idPago,
        idExpensa: expensa.idExpensa,
        monto: montoRedondeado,
        idUsuarioRegistro: idUsuario || null,
      },
    });

    saldoPendiente = Math.max(0, Math.round((saldoPendiente - montoRedondeado) * 100) / 100);
    aplicacionesRealizadas++;
  }

  if (aplicacionesRealizadas > 0) {
    const nuevoEstado = saldoPendiente === 0 ? 'Pagado' : 'Parcial';
    return await tx.expensa.update({
      where: { idExpensa: expensa.idExpensa },
      data: {
        saldoPendiente,
        estado: nuevoEstado,
      },
    });
  }

  return expensa;
}

// ── GET /api/v1/expensas ─────────────────────────────────────────────────────
// CA05: Listar expensas con filtros por estado, departamento y período
expensasRouter.get(
  '/',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { estado, idDepartamento, periodo, vencida, page = '1', limit = '50' } = req.query;
      const ahora = new Date();

      const where: Record<string, unknown> = {};
      if (estado && estado !== 'Todos') where.estado = String(estado);
      if (idDepartamento) where.idDepartamento = parseInt(String(idDepartamento));
      if (periodo) where.periodo = new Date(String(periodo));
      if (vencida === 'true') {
        where.fechaVencimiento = { lt: ahora };
        where.saldoPendiente = { gt: 0 };
      }

      const pageNum = Math.max(1, parseInt(String(page)) || 1);
      const limitNum = Math.max(1, parseInt(String(limit)) || 50);
      const skip = (pageNum - 1) * limitNum;

      const [expensas, total] = await Promise.all([
        prisma.expensa.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: [{ periodo: 'desc' }, { idDepartamento: 'asc' }],
          include: {
            departamento: {
              include: {
                propietario: { select: { idPersona: true, nombres: true, apellidos: true, ciNit: true, telefono: true } },
              },
            },
            pagos: {
              orderBy: { fechaPago: 'desc' },
              include: { usuarioRegistro: { select: { nombreUsuario: true } } },
            },
            _count: { select: { pagos: true } },
          },
        }),
        prisma.expensa.count({ where }),
      ]);

      const expensasConVencida = expensas.map((e) => ({
        ...e,
        vencida: new Date(e.fechaVencimiento) < ahora && Number(e.saldoPendiente) > 0,
      }));

      res.json({
        data: expensasConVencida,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/v1/expensas/morosos ─────────────────────────────────────────────
// CA07: Listado de morosos y deudas vencidas por departamento
expensasRouter.get(
  '/morosos',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ahora = new Date();

      const expensasVencidas = await prisma.expensa.findMany({
        where: {
          OR: [
            { estado: 'Moroso' },
            {
              fechaVencimiento: { lt: ahora },
              saldoPendiente: { gt: 0 },
            },
          ],
        },
        include: {
          departamento: {
            include: {
              propietario: { select: { idPersona: true, nombres: true, apellidos: true, ciNit: true, telefono: true, correo: true } },
            },
          },
          pagos: { where: { anulado: false } },
          aplicacionesAnticipos: { include: { pago: true } },
        },
        orderBy: [{ idDepartamento: 'asc' }, { periodo: 'asc' }],
      });

      // Agrupar por departamento
      const morososMap = new Map<number, any>();

      expensasVencidas.forEach((exp) => {
        const dptoId = exp.idDepartamento;
        if (!morososMap.has(dptoId)) {
          morososMap.set(dptoId, {
            idDepartamento: dptoId,
            numero: exp.departamento.numero,
            piso: exp.departamento.piso,
            propietario: exp.departamento.propietario,
            totalDeuda: 0,
            expensasMoraCount: 0,
            detalleExpensas: [],
          });
        }

        const info = morososMap.get(dptoId);
        info.totalDeuda += Number(exp.saldoPendiente);
        info.expensasMoraCount += 1;
        info.detalleExpensas.push({
          idExpensa: exp.idExpensa,
          periodo: exp.periodo,
          montoTotal: Number(exp.monto),
          capitalPendiente: calcularCapitalPendiente(exp),
          saldoPendiente: Number(exp.saldoPendiente),
          fechaVencimiento: exp.fechaVencimiento,
          tasaInteresMora: Number(exp.tasaInteresMora),
        });
      });

      const listadoMorosos = Array.from(morososMap.values());

      res.json({
        totalMorosos: listadoMorosos.length,
        totalDeudaGeneral: listadoMorosos.reduce((acc, m) => acc + m.totalDeuda, 0),
        data: listadoMorosos,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/v1/expensas/estado-cuenta/:idDepartamento ───────────────────────
// CA08: Estado de cuenta completo y ordenado por departamento
expensasRouter.get(
  '/estado-cuenta/:idDepartamento',
  authorizeRoles('Administrador', 'Directorio', 'Copropietario'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idDepartamento = parseInt(req.params.idDepartamento);
      if (isNaN(idDepartamento)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de departamento inválido' });
        return;
      }

      // Si el rol es Copropietario, solo puede consultar su departamento con asignación activa vigente (uq_ocupante_activo)
      const userRole = req.user?.rol?.toUpperCase();
      if (userRole === 'COPROPIETARIO') {
        let tieneAsignacionActiva = false;
        if (req.user?.idUsuario) {
          const usuario = await prisma.usuario.findUnique({
            where: { idUsuario: req.user.idUsuario },
            select: { idPersona: true },
          });

          if (usuario?.idPersona) {
            const ocupacionActiva = await prisma.ocupanteDepartamento.findFirst({
              where: {
                idDepartamento,
                idPersona: usuario.idPersona,
                fechaFin: null,
              },
            });

            if (ocupacionActiva) {
              tieneAsignacionActiva = true;
            }
          }
        }

        if (!tieneAsignacionActiva) {
          res.status(403).json({
            error: 'Forbidden',
            message: 'No tiene permisos para consultar el estado de cuenta de este departamento',
          });
          return;
        }
      }

      const departamento = await prisma.departamento.findUnique({
        where: { idDepartamento },
        include: { propietario: true },
      });

      if (!departamento) {
        res.status(404).json({ error: 'Not Found', message: 'Departamento no encontrado' });
        return;
      }

      const [expensas, pagos, anticipos] = await Promise.all([
        prisma.expensa.findMany({
          where: { idDepartamento },
          orderBy: { periodo: 'desc' },
          include: {
            pagos: { where: { anulado: false } },
            aplicacionesAnticipos: { include: { pago: true } },
          },
        }),
        // Devuelve TODOS los pagos (anulados y vigentes) para trazabilidad completa.
        // El cálculo de totales excluye los anulados por filtro JS más abajo.
        prisma.pago.findMany({
          where: { idDepartamento },
          orderBy: { fechaPago: 'desc' },
          include: { expensa: { select: { periodo: true } } },
        }),
        prisma.pago.findMany({
          where: { idDepartamento, esAnticipado: true, anulado: false },
          include: { aplicacionesAnticipo: true },
          orderBy: { fechaPago: 'desc' },
        }),
      ]);

      const expensasConCapital = expensas.map((e) => ({
        ...e,
        capitalPendiente: calcularCapitalPendiente(e),
      }));

      const anticiposConSaldo = anticipos.map((ant) => {
        const totalAplicado = ant.aplicacionesAnticipo.reduce(
          (acc, ap) => acc + Number(ap.monto),
          0
        );
        const saldoDisponible = Math.max(0, Math.round((Number(ant.montoPagado) - totalAplicado) * 100) / 100);
        return {
          ...ant,
          totalAplicado,
          saldoDisponible,
        };
      });

      const anticiposDisponibles = anticiposConSaldo.filter((a) => a.saldoDisponible > 0);
      const totalAnticipos = anticiposConSaldo.reduce((acc, a) => acc + Number(a.montoPagado), 0);
      const totalAnticiposDisponibles = anticiposDisponibles.reduce((acc, a) => acc + a.saldoDisponible, 0);

      const totalObligaciones = expensas.reduce((acc, e) => acc + Number(e.monto), 0);
      // Solo pagos vigentes (no anulados) cuentan para el total pagado
      const totalPagado = pagos.filter((p) => !p.anulado).reduce((acc, p) => acc + Number(p.montoPagado), 0);
      const saldoPendienteTotal = expensas.reduce((acc, e) => acc + Number(e.saldoPendiente), 0);

      res.json({
        departamento,
        resumen: {
          totalObligaciones,
          totalPagado,
          saldoPendienteTotal,
          totalAnticipos,
          totalAnticiposDisponibles,
          estadoGlobal: saldoPendienteTotal > 0 ? (expensas.some((e) => e.estado === 'Moroso') ? 'Moroso' : 'Deuda Pendiente') : 'Al Día',
        },
        expensas: expensasConCapital,
        pagos,
        anticipos: anticiposConSaldo,
        anticiposDisponibles,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/v1/expensas/reglas-mora ─────────────────────────────────────────
// CA09: Consultar regla de mora activa e historial completo
expensasRouter.get(
  '/reglas-mora',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await obtenerReglasMora();
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/expensas/reglas-mora ────────────────────────────────────────
// CA09, CA10: Configurar nueva regla de mora activa (desactiva anterior de forma atómica y audita)
expensasRouter.post(
  '/reglas-mora',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = reglaMoraSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Parámetros de regla de mora inválidos',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { tasaInteres, diasGracia } = parsed.data;
      const nuevaRegla = await configurarReglaMora({
        tasaInteres,
        diasGracia,
        idUsuario: req.user?.idUsuario || null,
      });

      res.status(201).json({
        message: 'Regla de mora configurada exitosamente',
        regla: nuevaRegla,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/v1/expensas/montos-tipo ─────────────────────────────────────────
// Lectura de tipos de departamento y sus montos de expensa configurados
expensasRouter.get(
  '/montos-tipo',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tipos = await prisma.tipoDepartamento.findMany({
        orderBy: { idTipo: 'asc' },
      });
      res.json({
        data: tipos.map((t) => ({
          idTipo: t.idTipo,
          nombre: t.nombre,
          montoExpensa: Number(t.montoExpensa),
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/v1/expensas/montos-tipo ─────────────────────────────────────────
// Actualización de montos de expensa por tipo con validación > 0 y auditoría CONFIGURAR_MONTO_EXPENSA
expensasRouter.put(
  '/montos-tipo',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      let items: Array<{ idTipo?: number; nombre?: string; monto: number }> = [];

      if (Array.isArray(req.body)) {
        items = req.body.map((item) => ({
          idTipo: item.idTipo,
          nombre: item.nombre,
          monto: Number(item.monto !== undefined ? item.monto : item.montoExpensa),
        }));
      } else if (req.body && Array.isArray(req.body.tipos)) {
        items = req.body.tipos.map((item: any) => ({
          idTipo: item.idTipo,
          nombre: item.nombre,
          monto: Number(item.monto !== undefined ? item.monto : item.montoExpensa),
        }));
      } else if (req.body && (req.body.idTipo !== undefined || req.body.nombre !== undefined)) {
        items = [
          {
            idTipo: req.body.idTipo,
            nombre: req.body.nombre,
            monto: Number(req.body.monto !== undefined ? req.body.monto : req.body.montoExpensa),
          },
        ];
      } else {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Debe especificar al menos un tipo de departamento a actualizar (idTipo o nombre y monto)',
        });
        return;
      }

      if (items.length === 0) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'La lista de tipos a actualizar está vacía',
        });
        return;
      }

      // Validar montos > 0
      for (const item of items) {
        if (item.monto === undefined || isNaN(item.monto) || item.monto <= 0) {
          res.status(400).json({
            error: 'Validation Error',
            message: 'El monto de la expensa debe ser mayor a cero',
          });
          return;
        }
        if (item.idTipo === undefined && !item.nombre) {
          res.status(400).json({
            error: 'Validation Error',
            message: 'Debe especificar idTipo o nombre para identificar el tipo',
          });
          return;
        }
      }

      // Actualizar en transacción con auditoría individual para cada tipo
      const actualizados = await prisma.$transaction(async (tx) => {
        const resultados: any[] = [];

        for (const item of items) {
          const tipoActual = await tx.tipoDepartamento.findFirst({
            where: item.idTipo !== undefined ? { idTipo: item.idTipo } : { nombre: item.nombre },
          });

          if (!tipoActual) {
            throw {
              statusCode: 404,
              code: 'NOT_FOUND',
              message: `Tipo de departamento ${item.idTipo || item.nombre} no encontrado`,
            };
          }

          const datosAnteriores = {
            idTipo: tipoActual.idTipo,
            nombre: tipoActual.nombre,
            montoExpensa: Number(tipoActual.montoExpensa),
          };

          const tipoNuevo = await tx.tipoDepartamento.update({
            where: { idTipo: tipoActual.idTipo },
            data: { montoExpensa: item.monto },
          });

          const datosNuevos = {
            idTipo: tipoNuevo.idTipo,
            nombre: tipoNuevo.nombre,
            montoExpensa: Number(tipoNuevo.montoExpensa),
          };

          await tx.auditoria.create({
            data: {
              tablaAfectada: 'tipos_departamento',
              idRegistro: String(tipoNuevo.idTipo),
              accion: 'CONFIGURAR_MONTO_EXPENSA',
              resultado: 'EXITO',
              datosAnteriores,
              datosNuevos,
              idUsuario: req.user?.idUsuario || null,
              fechaHora: new Date(),
            },
          });

          resultados.push(datosNuevos);
        }

        return resultados;
      }, { timeout: 30000, maxWait: 15000 });

      res.json({
        message: 'Montos de expensa por tipo actualizados exitosamente',
        actualizados,
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          error: err.code || 'Bad Request',
          message: err.message,
        });
        return;
      }
      next(err);
    }
  }
);

// ── GET /api/v1/expensas/:id ─────────────────────────────────────────────────
// CA05: Detalle de una expensa específica con sus pagos y saldos
expensasRouter.get(
  '/:id',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const expensa = await prisma.expensa.findUnique({
        where: { idExpensa: id },
        include: {
          departamento: {
            include: {
              propietario: { select: { nombres: true, apellidos: true, telefono: true, correo: true, ciNit: true } },
            },
          },
          pagos: {
            orderBy: { fechaPago: 'desc' },
            include: {
              usuarioRegistro: { select: { nombreUsuario: true } },
              cuentaBancaria: { select: { banco: true, numeroCuenta: true } },
            },
          },
          aplicacionesAnticipos: {
            include: {
              pago: true,
            },
          },
        },
      });

      if (!expensa) {
        res.status(404).json({ error: 'Not Found', message: 'Expensa no encontrada' });
        return;
      }

      const ahora = new Date();
      const vencida = new Date(expensa.fechaVencimiento) < ahora && Number(expensa.saldoPendiente) > 0;

      res.json({
        ...expensa,
        vencida,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/expensas/generar-masivo ─────────────────────────────────────
// CA1, CA2, CA10: Generación masiva de expensas con reglas de exclusión y auditoría
expensasRouter.post(
  '/generar-masivo',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = generarMasivoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Parámetros de generación masiva inválidos',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { periodo, fechaVencimiento, montoBase, tasaInteresMora, excluirDepartamentos, idDepartamentos } = parsed.data;
      // Normalizar periodo al primer día del mes en formato UTC para evitar discrepancias de zona horaria
      const [pYear, pMonth] = periodo.split('-');
      const periodoNormalizado = `${pYear}-${pMonth}-01`;
      const periodoDate = new Date(`${periodoNormalizado}T00:00:00.000Z`);
      const vencimientoDate = new Date(`${fechaVencimiento}T00:00:00.000Z`);

      // CA2: Obtener unidades aplicables (excluir departamentos especificados o filtrar por idDepartamentos)
      const { generadas, excepciones } = await prisma.$transaction(async (tx) => {
        const whereClause: any = {};
        if (excluirDepartamentos && excluirDepartamentos.length > 0) {
          whereClause.idDepartamento = { notIn: excluirDepartamentos };
        }
        if (idDepartamentos && idDepartamentos.length > 0) {
          whereClause.idDepartamento = {
            ...(whereClause.idDepartamento || {}),
            in: idDepartamentos,
          };
        }

        const departamentos = await tx.departamento.findMany({
          where: whereClause,
          include: {
            tipo: true,
          },
        });

        // Consultar expensas existentes para el período en una sola consulta
        const expensasExistentes = await tx.expensa.findMany({
          where: { periodo: periodoDate },
          select: { idDepartamento: true },
        });
        const deptosConExpensa = new Set(expensasExistentes.map((e) => e.idDepartamento));

        // Copiar tasa de la regla activa a expensas.tasa_interes_mora
        const reglaActiva = await tx.reglaMora.findFirst({
          where: { activa: true },
          orderBy: { fechaCreacion: 'desc' },
        });
        const tasaAplicar = tasaInteresMora !== undefined ? tasaInteresMora : (reglaActiva ? Number(reglaActiva.tasaInteres) : 0);

        const generadasArr: any[] = [];
        const excepcionesArr: any[] = [];

        for (const depto of departamentos) {
          // Si el departamento no tiene tipo asignado, va a excepciones
          if (!depto.tipo) {
            excepcionesArr.push({
              idDepartamento: depto.idDepartamento,
              numero: depto.numero,
              motivo: 'El departamento no tiene un tipo asignado en tipos_departamento',
            });
            continue;
          }

          // Verificar si ya existe expensa para el departamento en este período
          if (deptosConExpensa.has(depto.idDepartamento)) {
            excepcionesArr.push({
              idDepartamento: depto.idDepartamento,
              numero: depto.numero,
              motivo: 'Expensa ya fue generada previamente para este período',
            });
            continue;
          }

          // Monto fijo del tipo de departamento (tipos_departamento.monto_expensa)
          const montoFinal = Number(depto.tipo.montoExpensa);

          const nuevaExpensa = await tx.expensa.create({
            data: {
              idDepartamento: depto.idDepartamento,
              periodo: periodoDate,
              monto: montoFinal,
              saldoPendiente: montoFinal,
              tasaInteresMora: tasaAplicar,
              fechaVencimiento: vencimientoDate,
              estado: 'Pendiente',
            },
          });

          // Aplicación automática FIFO de anticipos disponibles en la misma transacción
          const expensaConAnticipos = await aplicarAnticiposFIFO(tx, nuevaExpensa, req.user?.idUsuario);
          generadasArr.push(expensaConAnticipos);
        }

        // Auditoría dentro de la misma transacción
        await auditoriaService.registrarEvento({
          tablaAfectada: 'expensas',
          idRegistro: `PERIODO-${periodo}`,
          accion: 'GENERACION_MASIVA_EXPENSAS',
          resultado: 'EXITO',
          datosNuevos: {
            periodo,
            generadasCount: generadasArr.length,
            excepcionesCount: excepcionesArr.length,
          },
          idUsuario: req.user?.idUsuario || null,
          tx,
        });

        return { generadas: generadasArr, excepciones: excepcionesArr };
      }, { timeout: 120000, maxWait: 30000 });

      res.status(201).json({
        message: `Se generaron ${generadas.length} expensas para el período ${periodo}`,
        generadasCount: generadas.length,
        excepcionesCount: excepciones.length,
        excepciones,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/expensas/calcular-mora ──────────────────────────────────────
// CA6, CA09, CA10: Cálculo idempotente de mora sobre expensas vencidas con auditoría transaccional
expensasRouter.post(
  '/calcular-mora',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idDepartamentos = Array.isArray(req.body?.idDepartamentos)
        ? req.body.idDepartamentos.map(Number).filter((n: number) => !isNaN(n))
        : undefined;

      const resultado = await ejecutarCalculoMora({
        idUsuario: req.user?.idUsuario || null,
        origen: 'MANUAL',
        idDepartamentos: idDepartamentos && idDepartamentos.length > 0 ? idDepartamentos : undefined,
      });

      res.json({
        message: resultado.mensaje,
        actualizadasCount: resultado.actualizadasCount,
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          error: err.code || 'Bad Request',
          code: err.code,
          message: err.message,
        });
        return;
      }
      next(err);
    }
  }
);

// ── POST /api/v1/expensas ────────────────────────────────────────────────────
// CA1, CA10: Crear expensa individual con aplicación automática FIFO de anticipos
expensasRouter.post(
  '/',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = expensaSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      const { idDepartamento, periodo, monto, tasaInteresMora, fechaVencimiento } = result.data;
      const [pYear, pMonth] = periodo.split('-');
      const periodoNormalizado = `${pYear}-${pMonth}-01`;
      const periodoDate = new Date(`${periodoNormalizado}T00:00:00.000Z`);
      const vencimientoDate = new Date(`${fechaVencimiento}T00:00:00.000Z`);

      // Verificar si ya existe expensa para este departamento en este período
      const existente = await prisma.expensa.findFirst({
        where: {
          idDepartamento,
          periodo: periodoDate,
        },
      });

      if (existente) {
        res.status(409).json({
          error: 'Conflict',
          message: `Ya existe una expensa registrada para el departamento en el período ${pYear}-${pMonth}`,
        });
        return;
      }

      const expensaFinal = await prisma.$transaction(async (tx) => {
        // Copiar tasa de la regla activa a expensas.tasa_interes_mora si no se especifica explícitamente
        const reglaActiva = await tx.reglaMora.findFirst({
          where: { activa: true },
          orderBy: { fechaCreacion: 'desc' },
        });
        const tasaAplicar = tasaInteresMora !== undefined ? tasaInteresMora : (reglaActiva ? Number(reglaActiva.tasaInteres) : 0);

        const expensaCreada = await tx.expensa.create({
          data: {
            idDepartamento,
            periodo: periodoDate,
            monto,
            tasaInteresMora: tasaAplicar,
            fechaVencimiento: vencimientoDate,
            saldoPendiente: monto,
            estado: 'Pendiente',
          },
          include: {
            departamento: { select: { numero: true } },
          },
        });

        // Aplicación automática FIFO de anticipos en la misma transacción
        const expensaProcesada = await aplicarAnticiposFIFO(tx, expensaCreada, req.user?.idUsuario);

        // CA10: Auditoría
        await auditoriaService.registrarEvento({
          tablaAfectada: 'expensas',
          idRegistro: String(expensaProcesada.idExpensa),
          accion: 'CREAR_EXPENSA',
          resultado: 'EXITO',
          datosNuevos: expensaProcesada,
          idUsuario: req.user?.idUsuario || null,
          tx,
        });

        return expensaProcesada;
      }, { timeout: 30000, maxWait: 15000 });

      res.status(201).json(expensaFinal);
    } catch (err: any) {
      if (err.code === 'P2002') {
        res.status(409).json({
          error: 'Conflict',
          message: 'Ya existe una expensa registrada para el departamento en este período',
        });
        return;
      }
      next(err);
    }
  }
);

// ── POST /api/v1/expensas/:id/pagos ──────────────────────────────────────────
// CA03, CA04, CA10: Registrar pago (o anticipo si idExpensa es null) con auditoría
expensasRouter.post(
  '/:id/pagos',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // RN10: idPersonaPagador es obligatorio (422 si falta o la persona no existe, también en anticipos)
      const rawPagador = req.body?.idPersonaPagador;
      if (rawPagador === undefined || rawPagador === null || !Number.isInteger(Number(rawPagador)) || Number(rawPagador) <= 0) {
        res.status(422).json({
          error: 'Unprocessable Entity',
          message: 'El idPersonaPagador es obligatorio y debe ser un número entero positivo',
        });
        return;
      }

      const idPersonaPagador = Number(rawPagador);
      const personaExiste = await prisma.persona.findUnique({
        where: { idPersona: idPersonaPagador },
      });

      if (!personaExiste) {
        res.status(422).json({
          error: 'Unprocessable Entity',
          message: `La persona pagadora con ID ${idPersonaPagador} no existe`,
        });
        return;
      }

      const result = pagoSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      const { montoPagado, interesPagado, metodoPago, esAnticipado, idCuenta, comprobanteUrl, idExpensa, idDepartamento: idDeptoBody } = result.data;
      const paramId = req.params.id;
      const parsedId = parseInt(paramId);

      // Si idExpensa en el body es explícitamente null o la ruta se invoca para registrar anticipo sin expensa
      const esAnticipoSinExpensa = idExpensa === null || (paramId === 'anticipo' && idExpensa === undefined);

      if (esAnticipoSinExpensa) {
        if (!esAnticipado) {
          res.status(400).json({
            error: 'Validation Error',
            message: 'esAnticipado debe ser true cuando idExpensa es null',
          });
          return;
        }

        let targetDepartamentoId = idDeptoBody;
        if (!targetDepartamentoId && !isNaN(parsedId) && parsedId > 0) {
          const exp = await prisma.expensa.findUnique({ where: { idExpensa: parsedId } });
          if (exp) {
            targetDepartamentoId = exp.idDepartamento;
          } else {
            const depto = await prisma.departamento.findUnique({ where: { idDepartamento: parsedId } });
            if (depto) targetDepartamentoId = depto.idDepartamento;
          }
        }

        if (!targetDepartamentoId) {
          res.status(400).json({
            error: 'Validation Error',
            message: 'idDepartamento es requerido para registrar un anticipo sin expensa',
          });
          return;
        }

        const pagoAnticipado = await prisma.pago.create({
          data: {
            idExpensa: null,
            idDepartamento: targetDepartamentoId,
            idPersonaPagador,
            montoPagado,
            interesPagado: interesPagado ?? 0,
            metodoPago: metodoPago || 'Efectivo',
            esAnticipado: true,
            idCuenta: idCuenta || null,
            comprobanteUrl: comprobanteUrl || null,
            idUsuarioRegistro: req.user?.idUsuario || null,
          },
        });

        await auditoriaService.registrarEvento({
          tablaAfectada: 'pagos',
          idRegistro: String(pagoAnticipado.idPago),
          accion: 'REGISTRO_ANTICIPO',
          resultado: 'EXITO',
          datosNuevos: { pago: pagoAnticipado },
          idUsuario: req.user?.idUsuario || null,
        });

        res.status(201).json({
          message: 'Pago anticipado registrado exitosamente sin asignar a expensa',
          pago: pagoAnticipado,
        });
        return;
      }

      // Flujo normal de pago sobre una expensa existente
      const expensaId = idExpensa !== undefined && idExpensa !== null ? idExpensa : parsedId;
      if (isNaN(expensaId) || expensaId <= 0) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de expensa inválido' });
        return;
      }

      const expensa = await prisma.expensa.findUnique({ where: { idExpensa: expensaId } });
      if (!expensa) {
        res.status(404).json({ error: 'Not Found', message: 'Expensa no encontrada' });
        return;
      }

      if (montoPagado <= 0) {
        res.status(422).json({
          error: 'Unprocessable Entity',
          message: 'El monto pagado debe ser mayor a cero',
        });
        return;
      }

      if (expensa.estado === 'Pagado' || Number(expensa.saldoPendiente) <= 0) {
        res.status(422).json({
          error: 'Unprocessable Entity',
          message: 'La expensa ya se encuentra totalmente pagada',
        });
        return;
      }

      const saldoActual = Number(expensa.saldoPendiente);
      if (montoPagado > saldoActual) {
        res.status(422).json({
          error: 'Unprocessable Entity',
          message: `El monto pagado (${montoPagado}) no puede exceder el saldo pendiente (${saldoActual})`,
        });
        return;
      }

      const nuevoSaldo = Math.max(0, Math.round((saldoActual - montoPagado) * 100) / 100);
      const nuevoEstado = nuevoSaldo === 0 ? 'Pagado' : 'Parcial';

      const [pago, expensaActualizada] = await prisma.$transaction([
        prisma.pago.create({
          data: {
            idExpensa: expensaId,
            idDepartamento: expensa.idDepartamento,
            idPersonaPagador,
            montoPagado,
            interesPagado: interesPagado ?? 0,
            metodoPago: metodoPago || 'Efectivo',
            esAnticipado: esAnticipado ?? false,
            idCuenta: idCuenta || null,
            comprobanteUrl: comprobanteUrl || null,
            idUsuarioRegistro: req.user?.idUsuario || null,
          },
        }),
        prisma.expensa.update({
          where: { idExpensa: expensaId },
          data: {
            saldoPendiente: nuevoSaldo,
            estado: nuevoEstado,
          },
        }),
      ]);

      await auditoriaService.registrarEvento({
        tablaAfectada: 'pagos',
        idRegistro: String(pago.idPago),
        accion: 'REGISTRO_PAGO_EXPENSA',
        resultado: 'EXITO',
        datosAnteriores: { saldoAnterior: saldoActual, estadoAnterior: expensa.estado },
        datosNuevos: { pago, nuevoSaldo, nuevoEstado },
        idUsuario: req.user?.idUsuario || null,
      });

      res.status(201).json({
        message: 'Pago registrado exitosamente',
        pago,
        expensa: expensaActualizada,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/expensas/:id/aplicar-anticipo/:idPago ───────────────────────
// CA04, CA10: Aplicación manual de un anticipo específico a una expensa
expensasRouter.post(
  '/:id/aplicar-anticipo/:idPago',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idExpensa = parseInt(req.params.id);
      const idPago = parseInt(req.params.idPago);

      if (isNaN(idExpensa) || isNaN(idPago)) {
        res.status(400).json({ error: 'Bad Request', message: 'IDs de expensa o pago inválidos' });
        return;
      }

      const parsed = aplicarAnticipoSchema.safeParse(req.body || {});
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos de aplicación de anticipo inválidos',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const montoDeseado = parsed.data?.monto;

      const resultado = await prisma.$transaction(async (tx) => {
        const expensa = await tx.expensa.findUnique({
          where: { idExpensa },
        });

        if (!expensa) {
          const err: any = new Error('Expensa no encontrada');
          err.statusCode = 404;
          err.code = 'EXPENSA_NO_ENCONTRADA';
          throw err;
        }

        const anticipo = await tx.pago.findUnique({
          where: { idPago },
          include: { aplicacionesAnticipo: true },
        });

        if (!anticipo || !anticipo.esAnticipado || anticipo.anulado) {
          const err: any = new Error('El pago especificado no es un anticipo válido o está anulado');
          err.statusCode = 400;
          err.code = 'ANTICIPO_INVALIDO';
          throw err;
        }

        if (anticipo.idDepartamento !== expensa.idDepartamento) {
          const err: any = new Error('El anticipo no pertenece al mismo departamento de la expensa');
          err.statusCode = 400;
          err.code = 'DEPARTAMENTO_NO_COINCIDE';
          throw err;
        }

        const totalAplicado = anticipo.aplicacionesAnticipo.reduce(
          (acc, ap) => acc + Number(ap.monto),
          0
        );
        const saldoDisponible = Math.max(0, Math.round((Number(anticipo.montoPagado) - totalAplicado) * 100) / 100);

        if (saldoDisponible <= 0) {
          const err: any = new Error('El anticipo no tiene saldo disponible');
          err.statusCode = 400;
          err.code = 'ANTICIPO_SIN_SALDO';
          throw err;
        }

        const saldoPendienteExpensa = Number(expensa.saldoPendiente);
        if (saldoPendienteExpensa <= 0) {
          const err: any = new Error('La expensa ya no cuenta con saldo pendiente');
          err.statusCode = 400;
          err.code = 'EXPENSA_SIN_SALDO_PENDIENTE';
          throw err;
        }

        let montoAAplicar = saldoDisponible;
        if (montoDeseado !== undefined) {
          if (montoDeseado > saldoDisponible) {
            const err: any = new Error(`El monto solicitado (${montoDeseado}) excede el saldo disponible del anticipo (${saldoDisponible})`);
            err.statusCode = 400;
            err.code = 'MONTO_EXCEDE_ANTICIPO';
            throw err;
          }
          if (montoDeseado > saldoPendienteExpensa) {
            const err: any = new Error(`El monto solicitado (${montoDeseado}) excede el saldo pendiente de la expensa (${saldoPendienteExpensa})`);
            err.statusCode = 400;
            err.code = 'MONTO_EXCEDE_EXPENSA';
            throw err;
          }
          montoAAplicar = montoDeseado;
        } else {
          montoAAplicar = Math.min(saldoPendienteExpensa, saldoDisponible);
        }

        montoAAplicar = Math.round(montoAAplicar * 100) / 100;

        const aplicacion = await tx.aplicacionAnticipo.create({
          data: {
            idPago: anticipo.idPago,
            idExpensa: expensa.idExpensa,
            monto: montoAAplicar,
            idUsuarioRegistro: req.user?.idUsuario || null,
          },
        });

        const nuevoSaldo = Math.max(0, Math.round((saldoPendienteExpensa - montoAAplicar) * 100) / 100);
        const nuevoEstado = nuevoSaldo === 0 ? 'Pagado' : 'Parcial';

        const expensaActualizada = await tx.expensa.update({
          where: { idExpensa },
          data: {
            saldoPendiente: nuevoSaldo,
            estado: nuevoEstado,
          },
        });

        const saldoDisponibleRestante = Math.max(0, Math.round((saldoDisponible - montoAAplicar) * 100) / 100);

        await auditoriaService.registrarEvento({
          tablaAfectada: 'aplicaciones_anticipos',
          idRegistro: String(aplicacion.idAplicacion),
          accion: 'APLICACION_ANTICIPO_MANUAL',
          resultado: 'EXITO',
          datosNuevos: {
            idAplicacion: aplicacion.idAplicacion,
            idPago: anticipo.idPago,
            idExpensa: expensa.idExpensa,
            montoAplicado: montoAAplicar,
            saldoDisponibleRestante,
            saldoPendienteExpensa: nuevoSaldo,
          },
          idUsuario: req.user?.idUsuario || null,
          tx,
        });

        return {
          aplicacion,
          expensa: expensaActualizada,
          saldoDisponibleRestante,
        };
      }, { timeout: 30000, maxWait: 15000 });

      res.status(200).json({
        message: 'Anticipo aplicado exitosamente a la expensa',
        ...resultado,
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          error: err.code || 'Error',
          code: err.code,
          message: err.message,
        });
        return;
      }
      next(err);
    }
  }
);

// ── Helpers internos para Anulación y Recálculo de Pagos ────────────────────
async function recalcularSaldoExpensa(
  tx: Prisma.TransactionClient,
  idExpensa: number
) {
  const expensa = await tx.expensa.findUnique({
    where: { idExpensa },
    include: {
      pagos: {
        where: { anulado: false },
      },
      aplicacionesAnticipos: {
        include: { pago: true },
      },
    },
  });

  if (!expensa) return null;

  const capitalPendiente = calcularCapitalPendiente(expensa);
  const montoMora = Number(expensa.montoMora || 0);
  const nuevoSaldo = Math.max(0, Math.round((capitalPendiente + montoMora) * 100) / 100);

  let nuevoEstado = 'Pendiente';
  if (nuevoSaldo === 0) {
    nuevoEstado = 'Pagado';
  } else if (capitalPendiente < Number(expensa.monto)) {
    nuevoEstado = 'Parcial';
  } else if (montoMora > 0 || expensa.fechaVencimiento < new Date()) {
    nuevoEstado = 'Moroso';
  } else {
    nuevoEstado = 'Pendiente';
  }

  return await tx.expensa.update({
    where: { idExpensa },
    data: {
      saldoPendiente: nuevoSaldo,
      estado: nuevoEstado,
    },
  });
}

interface AnulacionPagoResult {
  pagoAnulado: any;
  expensaActualizada: any;
}

async function anularPagoInterno(
  tx: Prisma.TransactionClient,
  idPago: number,
  idUsuario: number | null | undefined,
  motivo: string
): Promise<AnulacionPagoResult> {
  const pagoExistente = await tx.pago.findUnique({
    where: { idPago },
    include: { expensa: true },
  });

  if (!pagoExistente) {
    const error: any = new Error('Pago no encontrado');
    error.statusCode = 404;
    error.code = 'PAGO_NO_ENCONTRADO';
    throw error;
  }

  if (pagoExistente.anulado) {
    const error: any = new Error('El pago ya se encuentra anulado');
    error.statusCode = 409;
    error.code = 'PAGO_YA_ANULADO';
    throw error;
  }

  const pagoAnulado = await tx.pago.update({
    where: { idPago },
    data: {
      anulado: true,
      fechaAnulacion: new Date(),
      idUsuarioAnulacion: idUsuario || null,
      motivoAnulacion: motivo,
    },
  });

  const expensaActualizada = pagoExistente.idExpensa
    ? await recalcularSaldoExpensa(tx, pagoExistente.idExpensa)
    : null;

  // CA10: Auditoría oficial dentro de la misma transacción
  await auditoriaService.registrarEvento({
    tablaAfectada: 'pagos',
    idRegistro: String(idPago),
    accion: 'ANULACION_PAGO',
    resultado: 'EXITO',
    datosAnteriores: {
      anulado: pagoExistente.anulado,
      montoPagado: Number(pagoExistente.montoPagado),
      idExpensa: pagoExistente.idExpensa,
      saldoPendienteExpensa: pagoExistente.expensa ? Number(pagoExistente.expensa.saldoPendiente) : null,
    },
    datosNuevos: {
      anulado: true,
      motivoAnulacion: motivo,
      idUsuarioAnulacion: idUsuario || null,
      saldoPendienteExpensa: expensaActualizada ? Number(expensaActualizada.saldoPendiente) : null,
    },
    idUsuario: idUsuario || null,
    tx,
  });

  return { pagoAnulado, expensaActualizada };
}

// ── DELETE /api/v1/expensas/pagos/:idPago ────────────────────────────────────
// CA09, CA10: Anular pago con soft-delete, recálculo de saldo y auditoría
expensasRouter.delete(
  '/pagos/:idPago',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idPago = parseInt(req.params.idPago);
      if (isNaN(idPago)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de pago inválido' });
        return;
      }

      const result = anularPagoSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos de anulación inválidos',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      const { motivo } = result.data;
      const idUsuario = req.user?.idUsuario;

      const { pagoAnulado, expensaActualizada } = await prisma.$transaction(async (tx) => {
        return await anularPagoInterno(tx, idPago, idUsuario, motivo);
      }, { timeout: 30000, maxWait: 15000 });

      res.json({
        message: 'Pago anulado exitosamente y saldo recalculado',
        pagoAnulado,
        expensa: expensaActualizada,
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          error: err.code || 'Error',
          code: err.code,
          message: err.message,
        });
        return;
      }
      next(err);
    }
  }
);

// ── PATCH /api/v1/expensas/pagos/:idPago/corregir ────────────────────────────
// CA09, CA10: Corregir pago (anulación del original y registro del nuevo corregido)
expensasRouter.patch(
  '/pagos/:idPago/corregir',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idPago = parseInt(req.params.idPago);
      if (isNaN(idPago)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de pago inválido' });
        return;
      }

      // RN10: idPersonaPagador es obligatorio (422 si falta o la persona no existe)
      const rawPagador = req.body?.idPersonaPagador;
      if (rawPagador === undefined || rawPagador === null || !Number.isInteger(Number(rawPagador)) || Number(rawPagador) <= 0) {
        res.status(422).json({
          error: 'Unprocessable Entity',
          message: 'El idPersonaPagador es obligatorio y debe ser un número entero positivo',
        });
        return;
      }

      const idPersonaPagador = Number(rawPagador);
      const personaExiste = await prisma.persona.findUnique({
        where: { idPersona: idPersonaPagador },
      });

      if (!personaExiste) {
        res.status(422).json({
          error: 'Unprocessable Entity',
          message: `La persona pagadora con ID ${idPersonaPagador} no existe`,
        });
        return;
      }

      const result = corregirPagoSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos de corrección inválidos',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      const { motivo, montoPagado, interesPagado, metodoPago, esAnticipado, idCuenta, comprobanteUrl } = result.data;
      if (montoPagado <= 0) {
        res.status(422).json({
          error: 'Unprocessable Entity',
          message: 'El monto pagado debe ser mayor a cero',
        });
        return;
      }

      const idUsuario = req.user?.idUsuario;

      const { pagoAnulado, nuevoPago, expensaFinal } = await prisma.$transaction(async (tx) => {
        // 1. Anular el pago original reutilizando la lógica interna
        const { pagoAnulado, expensaActualizada } = await anularPagoInterno(tx, idPago, idUsuario, motivo);

        // Si el pago pertenece a una expensa, validar contra el saldo sin el pago original
        if (pagoAnulado.idExpensa && expensaActualizada) {
          const saldoSinPagoOriginal = Number(expensaActualizada.saldoPendiente);
          if (saldoSinPagoOriginal <= 0) {
            const err: any = new Error('La expensa ya se encuentra totalmente pagada');
            err.statusCode = 422;
            err.code = 'EXPENSA_YA_PAGADA';
            throw err;
          }
          if (montoPagado > saldoSinPagoOriginal) {
            const err: any = new Error(
              `El monto pagado (${montoPagado}) no puede exceder el saldo pendiente (${saldoSinPagoOriginal})`
            );
            err.statusCode = 422;
            err.code = 'MONTO_EXCEDE_SALDO';
            throw err;
          }
        }

        // 2. Crear el nuevo pago vinculado al original
        const nuevoPago = await tx.pago.create({
          data: {
            idExpensa: pagoAnulado.idExpensa,
            idDepartamento: pagoAnulado.idDepartamento,
            idPersonaPagador,
            montoPagado,
            interesPagado: interesPagado ?? 0,
            metodoPago: metodoPago || 'Efectivo',
            esAnticipado: esAnticipado ?? false,
            idCuenta: idCuenta || null,
            comprobanteUrl: comprobanteUrl || null,
            idUsuarioRegistro: idUsuario || null,
            idPagoOriginal: pagoAnulado.idPago,
          },
        });

        // 3. Recalcular saldo de la expensa con el nuevo pago incluido
        const expensaFinal = pagoAnulado.idExpensa
          ? await recalcularSaldoExpensa(tx, pagoAnulado.idExpensa)
          : null;

        // 4. Registrar auditoría del pago corregido
        await auditoriaService.registrarEvento({
          tablaAfectada: 'pagos',
          idRegistro: String(nuevoPago.idPago),
          accion: 'CORRECCION_PAGO',
          resultado: 'EXITO',
          datosAnteriores: { idPagoOriginal: pagoAnulado.idPago },
          datosNuevos: {
            idPago: nuevoPago.idPago,
            montoPagado,
            idExpensa: nuevoPago.idExpensa,
            saldoPendienteExpensa: expensaFinal ? Number(expensaFinal.saldoPendiente) : null,
          },
          idUsuario: idUsuario || null,
          tx,
        });

        return { pagoAnulado, nuevoPago, expensaFinal };
      }, { timeout: 30000, maxWait: 15000 });

      res.json({
        message: 'Pago corregido exitosamente',
        pagoAnulado,
        nuevoPago,
        expensa: expensaFinal,
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          error: err.code || 'Error',
          code: err.code,
          message: err.message,
        });
        return;
      }
      next(err);
    }
  }
);
