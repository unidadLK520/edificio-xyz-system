// backend/src/routes/caja.routes.ts
// US1.4 (Paso 2): Módulo de Caja Chica / Efectivo
// Endpoints:
//   POST   /api/v1/caja             - Registrar movimiento (Ingreso / Egreso)
//   GET    /api/v1/caja             - Listado paginado con filtros (desde, hasta, tipo)
//   GET    /api/v1/caja/saldo       - Saldo recalculado del período y saldo actual disponible
//   DELETE /api/v1/caja/:id         - Anular movimiento con motivo obligatorio (soft-delete)

import { Router, Response, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { requireFinanzasPermission, FINANZAS_TX_OPTIONS } from '../middlewares/finanzas-permissions.middleware';
import { auditoriaService } from '../modules/auditoria';

export const cajaRouter: IRouter = Router();

cajaRouter.use(authMiddleware);

// Schemas de validación
const registrarCajaSchema = z.object({
  tipo: z.enum(['Ingreso', 'Egreso'], {
    required_error: 'El tipo es obligatorio',
    invalid_type_error: "El tipo debe ser 'Ingreso' o 'Egreso'",
  }),
  monto: z.number({
    required_error: 'El monto es obligatorio',
    invalid_type_error: 'El monto debe ser numérico',
  }).positive('El monto debe ser mayor a 0'),
  concepto: z.string({
    required_error: 'El concepto es obligatorio',
    invalid_type_error: 'El concepto es obligatorio',
  }).trim().min(1, 'El concepto es obligatorio'),
  fecha: z.coerce.date({
    required_error: 'La fecha es obligatoria',
    invalid_type_error: 'La fecha es obligatoria y debe ser una fecha válida',
  }),
});

const anularCajaSchema = z.object({
  motivo: z.string({
    required_error: 'El motivo de anulación es obligatorio',
    invalid_type_error: 'El motivo de anulación es obligatorio',
  }).trim().min(1, 'El motivo de anulación es obligatorio'),
});

// Helper para obtener saldo base inicial de configuracion_global
async function getSaldoInicialBase(): Promise<number> {
  const conf = await prisma.configuracionGlobal.findUnique({
    where: { clave: 'saldo_inicial_caja' },
  });
  if (!conf || !conf.valor) return 0;
  const num = parseFloat(conf.valor);
  return isNaN(num) ? 0 : num;
}

// -----------------------------------------------------------------------------
// POST /api/v1/caja - Registrar movimiento de caja
// -----------------------------------------------------------------------------
cajaRouter.post(
  '/',
  requireFinanzasPermission('caja', 'escribir'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parseResult = registrarCajaSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Datos inválidos para el movimiento de caja',
          details: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { tipo, monto, concepto, fecha } = parseResult.data;

      const movimientoCaja = await prisma.$transaction(async (tx) => {
        const item = await tx.caja.create({
          data: {
            tipo,
            monto,
            concepto,
            fecha,
            idUsuarioRegistro: req.user!.idUsuario,
            anulado: false,
          },
          include: {
            usuarioRegistro: {
              select: { idUsuario: true, nombreUsuario: true },
            },
          },
        });

        await auditoriaService.registrarEvento({
          tablaAfectada: 'caja',
          idRegistro: item.idMovimientoCaja.toString(),
          accion: 'REGISTRO_MOVIMIENTO_CAJA',
          resultado: 'EXITO',
          datosNuevos: item,
          idUsuario: req.user!.idUsuario,
          tx,
        });

        return item;
      }, FINANZAS_TX_OPTIONS);

      res.status(201).json({
        success: true,
        message: 'Movimiento de caja registrado exitosamente',
        data: movimientoCaja,
      });
    } catch (err: any) {
      console.error('Error registrando movimiento de caja:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// GET /api/v1/caja/saldo - Saldo recalculado del período y saldo actual disponible
// (Ruta declarada antes de /:id para evitar conflicto de parámetros)
// -----------------------------------------------------------------------------
cajaRouter.get(
  '/saldo',
  requireFinanzasPermission('caja', 'leer'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { desde, hasta } = req.query;

      const fechaDesde = desde ? new Date(String(desde)) : undefined;
      const fechaHasta = hasta ? new Date(String(hasta)) : undefined;

      if (fechaDesde && isNaN(fechaDesde.getTime())) {
        res.status(400).json({ error: 'Bad Request', message: 'Parámetro "desde" inválido' });
        return;
      }
      if (fechaHasta && isNaN(fechaHasta.getTime())) {
        res.status(400).json({ error: 'Bad Request', message: 'Parámetro "hasta" inválido' });
        return;
      }

      const saldoBase = await getSaldoInicialBase();

      // Movimientos no anulados históricos
      const todosMovsNoAnulados = await prisma.caja.findMany({
        where: { anulado: false },
        orderBy: { fecha: 'asc' },
      });

      // Saldo disponible actual (todos los no anulados históricos + base)
      let ingresosHistoricos = 0;
      let egresosHistoricos = 0;
      let ingresosPrevios = 0;
      let egresosPrevios = 0;
      let totalIngresosPeriodo = 0;
      let totalEgresosPeriodo = 0;

      for (const m of todosMovsNoAnulados) {
        const val = Number(m.monto);
        const mFecha = new Date(m.fecha);

        // Histórico global
        if (m.tipo === 'Ingreso') ingresosHistoricos += val;
        else if (m.tipo === 'Egreso') egresosHistoricos += val;

        // Si hay filtro de fecha 'desde'
        if (fechaDesde && mFecha < fechaDesde) {
          if (m.tipo === 'Ingreso') ingresosPrevios += val;
          else if (m.tipo === 'Egreso') egresosPrevios += val;
        }

        // Dentro del período
        const cumpleDesde = !fechaDesde || mFecha >= fechaDesde;
        const cumpleHasta = !fechaHasta || mFecha <= fechaHasta;
        if (cumpleDesde && cumpleHasta) {
          if (m.tipo === 'Ingreso') totalIngresosPeriodo += val;
          else if (m.tipo === 'Egreso') totalEgresosPeriodo += val;
        }
      }

      const saldoInicialPeriodo = saldoBase + ingresosPrevios - egresosPrevios;
      const saldoFinalPeriodo = saldoInicialPeriodo + totalIngresosPeriodo - totalEgresosPeriodo;
      const saldoDisponibleActual = saldoBase + ingresosHistoricos - egresosHistoricos;

      res.json({
        success: true,
        data: {
          saldoInicial: saldoInicialPeriodo,
          totalIngresos: totalIngresosPeriodo,
          totalEgresos: totalEgresosPeriodo,
          saldoFinal: saldoFinalPeriodo,
          saldoDisponibleActual,
          periodo: {
            desde: fechaDesde ? fechaDesde.toISOString() : null,
            hasta: fechaHasta ? fechaHasta.toISOString() : null,
          },
        },
      });
    } catch (err: any) {
      console.error('Error calculando saldo de caja:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// GET /api/v1/caja - Listado paginado con filtros
// -----------------------------------------------------------------------------
cajaRouter.get(
  '/',
  requireFinanzasPermission('caja', 'leer'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { desde, hasta, tipo, anulado, page = '1', limit = '20' } = req.query;

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.max(1, parseInt(String(limit), 10) || 20);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (tipo && (tipo === 'Ingreso' || tipo === 'Egreso')) {
        where.tipo = tipo;
      }

      if (anulado !== undefined) {
        where.anulado = anulado === 'true';
      }

      if (desde || hasta) {
        where.fecha = {};
        if (desde) {
          const d = new Date(String(desde));
          if (!isNaN(d.getTime())) where.fecha.gte = d;
        }
        if (hasta) {
          const h = new Date(String(hasta));
          if (!isNaN(h.getTime())) where.fecha.lte = h;
        }
      }

      const [total, items] = await Promise.all([
        prisma.caja.count({ where }),
        prisma.caja.findMany({
          where,
          orderBy: { fecha: 'desc' },
          skip,
          take: limitNum,
          include: {
            usuarioRegistro: {
              select: { idUsuario: true, nombreUsuario: true },
            },
            usuarioAnulacion: {
              select: { idUsuario: true, nombreUsuario: true },
            },
          },
        }),
      ]);

      res.json({
        success: true,
        data: items,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      });
    } catch (err: any) {
      console.error('Error listando caja:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// GET /api/v1/caja/:id - Detalle de un movimiento de caja
// -----------------------------------------------------------------------------
cajaRouter.get(
  '/:id',
  requireFinanzasPermission('caja', 'leer'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const item = await prisma.caja.findUnique({
        where: { idMovimientoCaja: id },
        include: {
          usuarioRegistro: { select: { idUsuario: true, nombreUsuario: true } },
          usuarioAnulacion: { select: { idUsuario: true, nombreUsuario: true } },
        },
      });

      if (!item) {
        res.status(404).json({ error: 'Not Found', message: 'Movimiento de caja no encontrado' });
        return;
      }

      res.json({ success: true, data: item });
    } catch (err: any) {
      console.error('Error obteniendo movimiento de caja:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// DELETE /api/v1/caja/:id - Anulación de movimiento de caja con motivo obligatorio
// -----------------------------------------------------------------------------
cajaRouter.delete(
  '/:id',
  requireFinanzasPermission('caja', 'escribir'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const parseResult = anularCajaSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'El motivo de anulación es obligatorio',
          details: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { motivo } = parseResult.data;

      const existing = await prisma.caja.findUnique({
        where: { idMovimientoCaja: id },
      });

      if (!existing) {
        res.status(404).json({ error: 'Not Found', message: 'Movimiento de caja no encontrado' });
        return;
      }

      if (existing.anulado) {
        res.status(409).json({
          error: 'Conflict',
          message: 'El movimiento de caja ya fue anulado',
          code: 'ANULACION_YA_REALIZADA',
        });
        return;
      }

      const movimientoAnulado = await prisma.$transaction(async (tx) => {
        const item = await tx.caja.update({
          where: { idMovimientoCaja: id },
          data: {
            anulado: true,
            fechaAnulacion: new Date(),
            idUsuarioAnulacion: req.user!.idUsuario,
            motivoAnulacion: motivo,
          },
          include: {
            usuarioRegistro: { select: { idUsuario: true, nombreUsuario: true } },
            usuarioAnulacion: { select: { idUsuario: true, nombreUsuario: true } },
          },
        });

        await auditoriaService.registrarEvento({
          tablaAfectada: 'caja',
          idRegistro: item.idMovimientoCaja.toString(),
          accion: 'ANULACION_MOVIMIENTO_CAJA',
          resultado: 'EXITO',
          datosAnteriores: existing,
          datosNuevos: item,
          idUsuario: req.user!.idUsuario,
          tx,
        });

        return item;
      }, FINANZAS_TX_OPTIONS);

      res.json({
        success: true,
        message: 'Movimiento de caja anulado correctamente',
        data: movimientoAnulado,
      });
    } catch (err: any) {
      console.error('Error anulando movimiento de caja:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);
