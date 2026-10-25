// backend/src/routes/movimientos-bancarios.routes.ts
// US1.4 (Paso 3): Módulo de Movimientos Bancarios
// Endpoints:
//   POST /api/v1/movimientos-bancarios     - Registrar movimiento bancario
//   GET  /api/v1/movimientos-bancarios     - Listar con filtros (idCuenta, desde, hasta, tipo, estado)
//   GET  /api/v1/movimientos-bancarios/:id - Detalle de movimiento bancario
//   PUT  /api/v1/movimientos-bancarios/:id - Modificar movimiento bancario (solo si no está conciliado, 409)

import { Router, Response, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { requireFinanzasPermission, FINANZAS_TX_OPTIONS } from '../middlewares/finanzas-permissions.middleware';
import { auditoriaService } from '../modules/auditoria';

export const movimientosBancariosRouter: IRouter = Router();

movimientosBancariosRouter.use(authMiddleware);

// Schemas de validación
const registrarMovimientoBancarioSchema = z.object({
  idCuenta: z.number({
    required_error: 'La cuenta bancaria es obligatoria',
    invalid_type_error: 'idCuenta debe ser numérico',
  }).int().positive('idCuenta debe ser un entero positivo'),
  tipo: z.enum(['Deposito', 'Retiro'], {
    required_error: 'El tipo es obligatorio',
    invalid_type_error: "El tipo debe ser 'Deposito' o 'Retiro'",
  }),
  monto: z.number({
    required_error: 'El monto es obligatorio',
    invalid_type_error: 'El monto debe ser numérico',
  }).positive('El monto debe ser mayor a 0'),
  concepto: z.string({
    required_error: 'El concepto es obligatorio',
    invalid_type_error: 'El concepto es obligatorio',
  }).trim().min(1, 'El concepto es obligatorio'),
  fecha: z.coerce.date().optional(),
  referencia: z.string().trim().max(100).optional().nullable(),
});

const modificarMovimientoBancarioSchema = z.object({
  monto: z.number().positive().optional(),
  concepto: z.string().trim().min(1).optional(),
  fecha: z.coerce.date().optional(),
  referencia: z.string().trim().max(100).optional().nullable(),
});

// Helper para determinar estado efectivo de conciliación:
// Si conciliado = true, se interpreta siempre como 'Conciliado'.
export function resolverEstadoConciliacion(mov: {
  conciliado: boolean;
  estadoConciliacion: string;
}): 'Pendiente' | 'Conciliado' | 'Discrepancia' {
  if (mov.conciliado || mov.estadoConciliacion === 'Conciliado') {
    return 'Conciliado';
  }
  if (mov.estadoConciliacion === 'Discrepancia') {
    return 'Discrepancia';
  }
  return 'Pendiente';
}

// -----------------------------------------------------------------------------
// POST /api/v1/movimientos-bancarios - Registrar movimiento bancario
// -----------------------------------------------------------------------------
movimientosBancariosRouter.post(
  '/',
  requireFinanzasPermission('movimientos_bancarios', 'escribir'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parseResult = registrarMovimientoBancarioSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Datos inválidos para el movimiento bancario',
          details: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { idCuenta, tipo, monto, concepto, fecha, referencia } = parseResult.data;

      // Verificar existencia de la cuenta bancaria
      const cuenta = await prisma.cuentaBancaria.findUnique({
        where: { idCuenta },
      });
      if (!cuenta) {
        res.status(404).json({
          error: 'Not Found',
          message: `La cuenta bancaria con ID ${idCuenta} no existe`,
        });
        return;
      }

      const nuevoMov = await prisma.$transaction(async (tx) => {
        const mov = await tx.movimientoBancario.create({
          data: {
            idCuenta,
            tipo,
            monto,
            concepto,
            referencia: referencia ?? null,
            fecha: fecha ?? new Date(),
            conciliado: false,
            estadoConciliacion: 'Pendiente',
            idUsuarioRegistro: req.user!.idUsuario,
          },
          include: {
            cuenta: { select: { idCuenta: true, banco: true, numeroCuenta: true } },
            usuarioRegistro: { select: { idUsuario: true, nombreUsuario: true } },
          },
        });

        await auditoriaService.registrarEvento({
          tablaAfectada: 'movimientos_bancarios',
          idRegistro: mov.idMovBancario.toString(),
          accion: 'REGISTRO_MOVIMIENTO_BANCARIO',
          resultado: 'EXITO',
          datosNuevos: mov,
          idUsuario: req.user!.idUsuario,
          tx,
        });

        return mov;
      }, FINANZAS_TX_OPTIONS);

      res.status(201).json({
        success: true,
        message: 'Movimiento bancario registrado exitosamente',
        data: {
          ...nuevoMov,
          monto: Number(nuevoMov.monto),
          estadoConciliacion: resolverEstadoConciliacion(nuevoMov),
        },
      });
    } catch (err: any) {
      console.error('Error creando movimiento bancario:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// GET /api/v1/movimientos-bancarios - Listar con filtros
// -----------------------------------------------------------------------------
movimientosBancariosRouter.get(
  '/',
  requireFinanzasPermission('movimientos_bancarios', 'leer'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        idCuenta,
        desde,
        hasta,
        tipo,
        estado,
        page = '1',
        limit = '50',
      } = req.query;

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.max(1, parseInt(String(limit), 10) || 50);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (idCuenta) {
        const parsedId = parseInt(String(idCuenta), 10);
        if (!isNaN(parsedId)) where.idCuenta = parsedId;
      }

      if (tipo && (tipo === 'Deposito' || tipo === 'Retiro')) {
        where.tipo = tipo;
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

      // Filtro de estado: reconcilia estado_conciliacion con conciliado = true
      if (estado) {
        const est = String(estado);
        if (est === 'Conciliado') {
          where.OR = [
            { conciliado: true },
            { estadoConciliacion: 'Conciliado' },
          ];
        } else if (est === 'Pendiente') {
          where.AND = [
            { conciliado: false },
            { estadoConciliacion: 'Pendiente' },
          ];
        } else if (est === 'Discrepancia') {
          where.estadoConciliacion = 'Discrepancia';
        }
      }

      const [total, items] = await Promise.all([
        prisma.movimientoBancario.count({ where }),
        prisma.movimientoBancario.findMany({
          where,
          orderBy: { fecha: 'desc' },
          skip,
          take: limitNum,
          include: {
            cuenta: { select: { idCuenta: true, banco: true, numeroCuenta: true } },
            movimiento: {
              select: {
                idMovimiento: true,
                tipo: true,
                monto: true,
                descripcion: true,
                fecha: true,
                anulado: true,
              },
            },
            usuarioRegistro: { select: { idUsuario: true, nombreUsuario: true } },
            usuarioConciliacion: { select: { idUsuario: true, nombreUsuario: true } },
          },
        }),
      ]);

      const mappedItems = items.map((m) => ({
        ...m,
        monto: Number(m.monto),
        diferencia: m.diferencia !== null ? Number(m.diferencia) : null,
        estadoConciliacion: resolverEstadoConciliacion(m),
        movimientoInterno: m.movimiento,
      }));

      res.json({
        success: true,
        data: mappedItems,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      });
    } catch (err: any) {
      console.error('Error listando movimientos bancarios:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// GET /api/v1/movimientos-bancarios/:id - Detalle
// -----------------------------------------------------------------------------
movimientosBancariosRouter.get(
  '/:id',
  requireFinanzasPermission('movimientos_bancarios', 'leer'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const item = await prisma.movimientoBancario.findUnique({
        where: { idMovBancario: id },
        include: {
          cuenta: { select: { idCuenta: true, banco: true, numeroCuenta: true } },
          movimiento: true,
          usuarioRegistro: { select: { idUsuario: true, nombreUsuario: true } },
          usuarioConciliacion: { select: { idUsuario: true, nombreUsuario: true } },
        },
      });

      if (!item) {
        res.status(404).json({ error: 'Not Found', message: 'Movimiento bancario no encontrado' });
        return;
      }

      res.json({
        success: true,
        data: {
          ...item,
          monto: Number(item.monto),
          diferencia: item.diferencia !== null ? Number(item.diferencia) : null,
          estadoConciliacion: resolverEstadoConciliacion(item),
        },
      });
    } catch (err: any) {
      console.error('Error obteniendo movimiento bancario:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// PUT /api/v1/movimientos-bancarios/:id - Modificar movimiento bancario (409 si conciliado)
// -----------------------------------------------------------------------------
movimientosBancariosRouter.put(
  '/:id',
  requireFinanzasPermission('movimientos_bancarios', 'escribir'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const parseResult = modificarMovimientoBancarioSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Datos inválidos para actualizar movimiento bancario',
          details: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const existing = await prisma.movimientoBancario.findUnique({
        where: { idMovBancario: id },
      });

      if (!existing) {
        res.status(404).json({ error: 'Not Found', message: 'Movimiento bancario no encontrado' });
        return;
      }

      // Regla: PUT solo si no está conciliado (409)
      const estadoActual = resolverEstadoConciliacion(existing);
      if (estadoActual === 'Conciliado') {
        res.status(409).json({
          error: 'Conflict',
          message: 'No se puede modificar un movimiento bancario que ya ha sido conciliado',
        });
        return;
      }

      const { monto, concepto, fecha, referencia } = parseResult.data;

      const actualizado = await prisma.$transaction(async (tx) => {
        const item = await tx.movimientoBancario.update({
          where: { idMovBancario: id },
          data: {
            monto: monto !== undefined ? monto : existing.monto,
            concepto: concepto !== undefined ? concepto : existing.concepto,
            fecha: fecha !== undefined ? fecha : existing.fecha,
            referencia: referencia !== undefined ? referencia : existing.referencia,
          },
          include: {
            cuenta: { select: { idCuenta: true, banco: true, numeroCuenta: true } },
            usuarioRegistro: { select: { idUsuario: true, nombreUsuario: true } },
          },
        });

        await auditoriaService.registrarEvento({
          tablaAfectada: 'movimientos_bancarios',
          idRegistro: item.idMovBancario.toString(),
          accion: 'MODIFICACION_MOVIMIENTO_BANCARIO',
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
        message: 'Movimiento bancario actualizado exitosamente',
        data: {
          ...actualizado,
          monto: Number(actualizado.monto),
          estadoConciliacion: resolverEstadoConciliacion(actualizado),
        },
      });
    } catch (err: any) {
      console.error('Error actualizando movimiento bancario:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);
