// backend/src/routes/expensas.routes.ts
// HU04 — Gestión de Expensas, Generación Masiva, Pagos, Mora, Morosos, Estado de Cuenta y Auditoría

import { Router, Response, NextFunction, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';

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
  tasaInteresMora: z.number().min(0).max(100).default(0),
  fechaVencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
});

const generarMasivoSchema = z.object({
  periodo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  fechaVencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  montoBase: z.number().positive().optional().default(500),
  tasaInteresMora: z.number().min(0).max(100).optional().default(5),
  excluirDepartamentos: z.array(z.number().int()).optional().default([]),
});

const pagoSchema = z.object({
  montoPagado: z.number().positive(),
  interesPagado: z.number().min(0).default(0),
  metodoPago: z.enum(['Efectivo', 'Transferencia', 'Cheque', 'QR']).optional(),
  esAnticipado: z.boolean().default(false),
  idCuenta: z.number().int().positive().optional(),
  comprobanteUrl: z.string().optional(),
});

// ── GET /api/v1/expensas ─────────────────────────────────────────────────────
// CA05: Listar expensas con filtros por estado, departamento y período
expensasRouter.get(
  '/',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { estado, idDepartamento, periodo, page = '1', limit = '50' } = req.query;

      const where: Record<string, unknown> = {};
      if (estado && estado !== 'Todos') where.estado = String(estado);
      if (idDepartamento) where.idDepartamento = parseInt(String(idDepartamento));
      if (periodo) where.periodo = new Date(String(periodo));

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

      res.json({
        data: expensas,
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
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idDepartamento = parseInt(req.params.idDepartamento);
      if (isNaN(idDepartamento)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de departamento inválido' });
        return;
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
          include: { pagos: true },
        }),
        prisma.pago.findMany({
          where: { idDepartamento },
          orderBy: { fechaPago: 'desc' },
          include: { expensa: { select: { periodo: true } } },
        }),
        prisma.pago.findMany({
          where: { idDepartamento, esAnticipado: true },
          orderBy: { fechaPago: 'desc' },
        }),
      ]);

      const totalObligaciones = expensas.reduce((acc, e) => acc + Number(e.monto), 0);
      const totalPagado = pagos.reduce((acc, p) => acc + Number(p.montoPagado), 0);
      const saldoPendienteTotal = expensas.reduce((acc, e) => acc + Number(e.saldoPendiente), 0);
      const totalAnticipos = anticipos.reduce((acc, a) => acc + Number(a.montoPagado), 0);

      res.json({
        departamento,
        resumen: {
          totalObligaciones,
          totalPagado,
          saldoPendienteTotal,
          totalAnticipos,
          estadoGlobal: saldoPendienteTotal > 0 ? (expensas.some((e) => e.estado === 'Moroso') ? 'Moroso' : 'Deuda Pendiente') : 'Al Día',
        },
        expensas,
        pagos,
        anticipos,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/v1/expensas/:id ─────────────────────────────────────────────────
// CA05: Detalle de una expensa específica con sus pagos y saldos
expensasRouter.get(
  '/:id',
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
        },
      });

      if (!expensa) {
        res.status(404).json({ error: 'Not Found', message: 'Expensa no encontrada' });
        return;
      }

      res.json(expensa);
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

      const { periodo, fechaVencimiento, montoBase, tasaInteresMora, excluirDepartamentos } = parsed.data;
      const periodoDate = new Date(periodo);
      const vencimientoDate = new Date(fechaVencimiento);

      // CA2: Obtener unidades aplicables (excluir desocupadas/inactivas o especificadas en reglas)
      const departamentos = await prisma.departamento.findMany({
        where: {
          NOT: [
            { idDepartamento: { in: excluirDepartamentos } },
            { estado: 'Inactivo' },
          ],
        },
      });

      const generadas: any[] = [];
      const excepciones: any[] = [];

      for (const depto of departamentos) {
        // Verificar si ya existe expensa para el departamento en este período
        const existente = await prisma.expensa.findFirst({
          where: {
            idDepartamento: depto.idDepartamento,
            periodo: periodoDate,
          },
        });

        if (existente) {
          excepciones.push({
            idDepartamento: depto.idDepartamento,
            numero: depto.numero,
            motivo: 'Expensa ya fue generada previamente para este período',
          });
          continue;
        }

        // Calcular monto (proporcional al área m2 o monto base)
        const areaFactor = depto.areaM2 ? Number(depto.areaM2) / 100 : 1;
        const montoFinal = Math.round(montoBase * areaFactor * 100) / 100;

        const nuevaExpensa = await prisma.expensa.create({
          data: {
            idDepartamento: depto.idDepartamento,
            periodo: periodoDate,
            monto: montoFinal,
            saldoPendiente: montoFinal,
            tasaInteresMora,
            fechaVencimiento: vencimientoDate,
            estado: 'Pendiente',
          },
        });

        generadas.push(nuevaExpensa);
      }

      // CA10: Auditoría de generación masiva
      await registrarAuditoria(
        req,
        'GENERACION_MASIVA_EXPENSAS',
        'expensas',
        `PERIODO-${periodo}`,
        null,
        { periodo, generadasCount: generadas.length, excepcionesCount: excepciones.length }
      );

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
// CA6, CA10: Cálculo e interés por mora sobre expensas vencidas con auditoría
expensasRouter.post(
  '/calcular-mora',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ahora = new Date();

      // Buscar expensas vencidas con saldo pendiente > 0
      const expensasVencidas = await prisma.expensa.findMany({
        where: {
          fechaVencimiento: { lt: ahora },
          saldoPendiente: { gt: 0 },
        },
      });

      let actualizadasCount = 0;

      for (const exp of expensasVencidas) {
        const tasa = Number(exp.tasaInteresMora) > 0 ? Number(exp.tasaInteresMora) : 5; // 5% por defecto si no está especificada
        const montoMora = Math.round((Number(exp.saldoPendiente) * (tasa / 100)) * 100) / 100;
        const nuevoSaldo = Number(exp.saldoPendiente) + montoMora;

        await prisma.expensa.update({
          where: { idExpensa: exp.idExpensa },
          data: {
            saldoPendiente: nuevoSaldo,
            estado: 'Moroso',
          },
        });
        actualizadasCount++;
      }

      // CA10: Auditoría
      await registrarAuditoria(
        req,
        'CALCULO_MORA_EXPENSAS',
        'expensas',
        `MORA-${ahora.toISOString().split('T')[0]}`,
        null,
        { actualizadasCount }
      );

      res.json({
        message: `Se aplicó el recargo de mora a ${actualizadasCount} expensas vencidas`,
        actualizadasCount,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/expensas ────────────────────────────────────────────────────
// CA1, CA10: Crear expensa individual
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

      const expensa = await prisma.expensa.create({
        data: {
          idDepartamento,
          periodo: new Date(periodo),
          monto,
          tasaInteresMora,
          fechaVencimiento: new Date(fechaVencimiento),
          saldoPendiente: monto,
          estado: 'Pendiente',
        },
        include: {
          departamento: { select: { numero: true } },
        },
      });

      // CA10: Auditoría
      await registrarAuditoria(req, 'CREAR_EXPENSA', 'expensas', String(expensa.idExpensa), null, expensa);

      res.status(201).json(expensa);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/v1/expensas/:id/pagos ──────────────────────────────────────────
// CA03, CA04, CA10: Registrar pago (total/parcial/anticipado) y actualizar saldo con auditoría
expensasRouter.post(
  '/:id/pagos',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
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

      const expensa = await prisma.expensa.findUnique({ where: { idExpensa: id } });
      if (!expensa) {
        res.status(404).json({ error: 'Not Found', message: 'Expensa no encontrada' });
        return;
      }

      const { montoPagado, interesPagado, metodoPago, esAnticipado, idCuenta, comprobanteUrl } = result.data;

      const saldoActual = Number(expensa.saldoPendiente);
      const nuevoSaldo = Math.max(0, saldoActual - montoPagado);
      const nuevoEstado = nuevoSaldo === 0 ? 'Pagado' : 'Parcial';

      const [pago, expensaActualizada] = await prisma.$transaction([
        prisma.pago.create({
          data: {
            idExpensa: id,
            idDepartamento: expensa.idDepartamento,
            montoPagado,
            interesPagado,
            metodoPago: metodoPago || 'Efectivo',
            esAnticipado,
            idCuenta: idCuenta || null,
            comprobanteUrl: comprobanteUrl || null,
            idUsuarioRegistro: req.user?.idUsuario || null,
          },
        }),
        prisma.expensa.update({
          where: { idExpensa: id },
          data: {
            saldoPendiente: nuevoSaldo,
            estado: nuevoEstado,
          },
        }),
      ]);

      // CA10: Auditoría
      await registrarAuditoria(
        req,
        'REGISTRO_PAGO_EXPENSA',
        'pagos',
        String(pago.idPago),
        { saldoAnterior: saldoActual, estadoAnterior: expensa.estado },
        { pago, nuevoSaldo, nuevoEstado }
      );

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

// ── DELETE /api/v1/expensas/pagos/:idPago ────────────────────────────────────
// CA09, CA10: Corregir / Anular pago con recálculo de saldo y auditoría
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

      const pagoExistente = await prisma.pago.findUnique({
        where: { idPago },
        include: { expensa: true },
      });

      if (!pagoExistente) {
        res.status(404).json({ error: 'Not Found', message: 'Pago no encontrado' });
        return;
      }

      const montoARestablecer = Number(pagoExistente.montoPagado);

      // Eliminar el pago y restaurar el saldo de la expensa si corresponde
      await prisma.pago.delete({ where: { idPago } });

      let expensaRestablecida = null;
      if (pagoExistente.idExpensa && pagoExistente.expensa) {
        const nuevoSaldo = Number(pagoExistente.expensa.saldoPendiente) + montoARestablecer;
        const nuevoEstado = nuevoSaldo >= Number(pagoExistente.expensa.monto) ? 'Pendiente' : 'Parcial';

        expensaRestablecida = await prisma.expensa.update({
          where: { idExpensa: pagoExistente.idExpensa },
          data: {
            saldoPendiente: nuevoSaldo,
            estado: nuevoEstado,
          },
        });
      }

      // CA10: Auditoría
      await registrarAuditoria(
        req,
        'ANULACION_PAGO_EXPENSA',
        'pagos',
        String(idPago),
        pagoExistente,
        { estado: 'Anulado', expensaRestablecida }
      );

      res.json({
        message: 'Pago anulado exitosamente y saldo recalculado',
        pagoAnulado: pagoExistente,
        expensa: expensaRestablecida,
      });
    } catch (err) {
      next(err);
    }
  }
);
