// apps/api/src/routes/movimientos.routes.ts
// Gestión de movimientos financieros (ingresos y egresos)
//   GET  /api/v1/movimientos          — listar con filtros
//   GET  /api/v1/movimientos/resumen  — resumen financiero (totales)
//   GET  /api/v1/movimientos/:id      — detalle
//   POST /api/v1/movimientos          — crear movimiento

import { Router, Response, NextFunction, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';

export const movimientosRouter: IRouter = Router();
movimientosRouter.use(authMiddleware);

// ── Schemas ──────────────────────────────────────────────────────────────────
const movimientoSchema = z.object({
  tipo: z.enum(['Ingreso', 'Egreso']),
  idCategoria: z.number().int().positive(),
  monto: z.number().positive(),
  descripcion: z.string().optional(),
  comprobanteUrl: z.string().url().optional(),
});

// ── GET /movimientos/resumen ─────────────────────────────────────────────────
// IMPORTANTE: esta ruta debe ir ANTES de /:id para que no sea capturada por ella
movimientosRouter.get(
  '/resumen',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { mes, anio } = req.query;

      let fechaInicio: Date | undefined;
      let fechaFin: Date | undefined;

      if (anio) {
        const a = parseInt(String(anio));
        const m = mes ? parseInt(String(mes)) - 1 : 0;
        fechaInicio = mes ? new Date(a, m, 1) : new Date(a, 0, 1);
        fechaFin = mes ? new Date(a, m + 1, 0, 23, 59, 59) : new Date(a, 11, 31, 23, 59, 59);
      }

      const where = fechaInicio
        ? { fecha: { gte: fechaInicio, lte: fechaFin } }
        : {};

      const [ingresos, egresos, porCategoria] = await Promise.all([
        prisma.movimiento.aggregate({
          where: { ...where, tipo: 'Ingreso' },
          _sum: { monto: true },
          _count: true,
        }),
        prisma.movimiento.aggregate({
          where: { ...where, tipo: 'Egreso' },
          _sum: { monto: true },
          _count: true,
        }),
        prisma.movimiento.groupBy({
          by: ['idCategoria', 'tipo'],
          where,
          _sum: { monto: true },
          _count: true,
        }),
      ]);

      const totalIngresos = ingresos._sum.monto?.toNumber() ?? 0;
      const totalEgresos = egresos._sum.monto?.toNumber() ?? 0;

      res.json({
        periodo: { mes: mes || 'todos', anio: anio || 'todos' },
        totalIngresos,
        totalEgresos,
        balance: totalIngresos - totalEgresos,
        cantidadIngresos: ingresos._count,
        cantidadEgresos: egresos._count,
        porCategoria,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /movimientos ─────────────────────────────────────────────────────────
movimientosRouter.get(
  '/',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tipo, idCategoria, fechaDesde, fechaHasta, page = '1', limit = '20' } = req.query;

      const where: Record<string, unknown> = {};
      if (tipo) where.tipo = String(tipo);
      if (idCategoria) where.idCategoria = parseInt(String(idCategoria));
      if (fechaDesde || fechaHasta) {
        where.fecha = {
          ...(fechaDesde && { gte: new Date(String(fechaDesde)) }),
          ...(fechaHasta && { lte: new Date(String(fechaHasta)) }),
        };
      }

      const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
      const take = parseInt(String(limit));

      const [movimientos, total] = await Promise.all([
        prisma.movimiento.findMany({
          where,
          skip,
          take,
          orderBy: { fecha: 'desc' },
          include: {
            categoria: { select: { nombre: true, tipo: true } },
            usuarioRegistro: { select: { nombreUsuario: true } },
          },
        }),
        prisma.movimiento.count({ where }),
      ]);

      res.json({
        data: movimientos,
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

// ── GET /movimientos/:id ─────────────────────────────────────────────────────
movimientosRouter.get(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const movimiento = await prisma.movimiento.findUnique({
        where: { idMovimiento: id },
        include: {
          categoria: true,
          usuarioRegistro: { select: { nombreUsuario: true, correo: true } },
          movimientosBancarios: {
            include: { cuenta: { select: { banco: true, numeroCuenta: true } } },
          },
          pagosEmpleados: {
            include: { empleado: { select: { nombres: true, apellidos: true, cargo: true } } },
          },
        },
      });

      if (!movimiento) {
        res.status(404).json({ error: 'Not Found', message: 'Movimiento no encontrado' });
        return;
      }

      res.json(movimiento);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /movimientos ────────────────────────────────────────────────────────
movimientosRouter.post(
  '/',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = movimientoSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      const movimiento = await prisma.movimiento.create({
        data: {
          ...result.data,
          idUsuarioRegistro: req.user!.idUsuario,
        },
        include: {
          categoria: { select: { nombre: true, tipo: true } },
        },
      });

      res.status(201).json(movimiento);
    } catch (err) {
      next(err);
    }
  }
);
