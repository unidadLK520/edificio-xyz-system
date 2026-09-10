// backend/src/routes/expensas.routes.ts
// Gestión de expensas y pagos
//   GET  /api/v1/expensas               — listar con filtros
//   GET  /api/v1/expensas/:id           — detalle con pagos
//   POST /api/v1/expensas               — emitir/crear expensa
//   POST /api/v1/expensas/:id/pagos     — registrar pago de expensa

import { Router, Response, NextFunction, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';

export const expensasRouter: IRouter = Router();
expensasRouter.use(authMiddleware);

// ── Schemas ──────────────────────────────────────────────────────────────────
const expensaSchema = z.object({
  idDepartamento: z.number().int().positive(),
  periodo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  monto: z.number().positive(),
  tasaInteresMora: z.number().min(0).max(100).default(0),
  fechaVencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
});

const pagoSchema = z.object({
  montoPagado: z.number().positive(),
  interesPagado: z.number().min(0).default(0),
  metodoPago: z.enum(['Efectivo', 'Transferencia', 'Cheque', 'QR']).optional(),
  esAnticipado: z.boolean().default(false),
  idCuenta: z.number().int().positive().optional(),
  comprobanteUrl: z.string().url().optional(),
});

// ── GET /expensas ────────────────────────────────────────────────────────────
expensasRouter.get(
  '/',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { estado, idDepartamento, periodo, page = '1', limit = '20' } = req.query;

      const where: Record<string, unknown> = {};
      if (estado) where.estado = String(estado);
      if (idDepartamento) where.idDepartamento = parseInt(String(idDepartamento));
      if (periodo) where.periodo = new Date(String(periodo));

      const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
      const take = parseInt(String(limit));

      const [expensas, total] = await Promise.all([
        prisma.expensa.findMany({
          where,
          skip,
          take,
          orderBy: [{ periodo: 'desc' }, { idDepartamento: 'asc' }],
          include: {
            departamento: {
              select: { numero: true, piso: true },
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

// ── GET /expensas/:id ────────────────────────────────────────────────────────
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
              propietario: { select: { nombres: true, apellidos: true, telefono: true } },
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

// ── POST /expensas ───────────────────────────────────────────────────────────
expensasRouter.post(
  '/',
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

      res.status(201).json(expensa);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /expensas/:id/pagos ─────────────────────────────────────────────────
expensasRouter.post(
  '/:id/pagos',
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

      // Verificar que existe la expensa
      const expensa = await prisma.expensa.findUnique({ where: { idExpensa: id } });
      if (!expensa) {
        res.status(404).json({ error: 'Not Found', message: 'Expensa no encontrada' });
        return;
      }

      const { montoPagado, interesPagado, metodoPago, esAnticipado, idCuenta, comprobanteUrl } = result.data;

      // Registrar pago y actualizar expensa en una transacción
      const [pago] = await prisma.$transaction([
        prisma.pago.create({
          data: {
            idExpensa: id,
            idDepartamento: expensa.idDepartamento,
            montoPagado,
            interesPagado,
            metodoPago,
            esAnticipado,
            idCuenta,
            comprobanteUrl,
            idUsuarioRegistro: req.user!.idUsuario,
          },
        }),
        prisma.expensa.update({
          where: { idExpensa: id },
          data: {
            saldoPendiente: {
              decrement: montoPagado,
            },
            estado:
              expensa.saldoPendiente.toNumber() - montoPagado <= 0
                ? 'Pagado'
                : 'Parcial',
          },
        }),
      ]);

      res.status(201).json(pago);
    } catch (err) {
      next(err);
    }
  }
);
