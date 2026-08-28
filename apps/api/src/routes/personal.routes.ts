// apps/api/src/routes/personal.routes.ts
// Gestión de empleados y pagos de sueldos
//   GET    /api/v1/personal           — listar empleados
//   GET    /api/v1/personal/:id       — detalle con historial de pagos
//   POST   /api/v1/personal           — crear empleado
//   PUT    /api/v1/personal/:id       — actualizar empleado
//   POST   /api/v1/personal/:id/pagos — registrar pago de sueldo

import { Router, Response, NextFunction, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';

export const personalRouter: IRouter = Router();
personalRouter.use(authMiddleware);

// ── Schemas ──────────────────────────────────────────────────────────────────
const empleadoSchema = z.object({
  nombres: z.string().min(1).max(100),
  apellidos: z.string().min(1).max(100),
  ci: z.string().min(1).max(30),
  cargo: z.string().max(80).optional(),
  salarioBase: z.number().positive(),
  fechaIngreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  activo: z.boolean().default(true),
});

const pagoEmpleadoSchema = z.object({
  periodo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD (primer día del mes)'),
  salarioPagado: z.number().positive(),
  anticipos: z.number().min(0).default(0),
  bonificaciones: z.number().min(0).default(0),
  descuentos: z.number().min(0).default(0),
  idMovimiento: z.number().int().positive().optional(),
});

// ── GET /personal ────────────────────────────────────────────────────────────
personalRouter.get(
  '/',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activo, page = '1', limit = '20' } = req.query;

      const where: Record<string, unknown> = {};
      if (activo !== undefined) where.activo = activo === 'true';

      const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
      const take = parseInt(String(limit));

      const [empleados, total] = await Promise.all([
        prisma.empleado.findMany({
          where,
          skip,
          take,
          orderBy: [{ activo: 'desc' }, { apellidos: 'asc' }],
          include: {
            _count: { select: { pagos: true } },
          },
        }),
        prisma.empleado.count({ where }),
      ]);

      res.json({
        data: empleados,
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

// ── GET /personal/:id ────────────────────────────────────────────────────────
personalRouter.get(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const empleado = await prisma.empleado.findUnique({
        where: { idEmpleado: id },
        include: {
          pagos: {
            orderBy: { periodo: 'desc' },
            take: 12,
            include: {
              movimiento: { select: { idMovimiento: true, descripcion: true, fecha: true } },
            },
          },
        },
      });

      if (!empleado) {
        res.status(404).json({ error: 'Not Found', message: 'Empleado no encontrado' });
        return;
      }

      res.json(empleado);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /personal ───────────────────────────────────────────────────────────
personalRouter.post(
  '/',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = empleadoSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      const { fechaIngreso, salarioBase, ...rest } = result.data;

      const empleado = await prisma.empleado.create({
        data: {
          ...rest,
          salarioBase,
          fechaIngreso: new Date(fechaIngreso),
        },
      });

      res.status(201).json(empleado);
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /personal/:id ────────────────────────────────────────────────────────
personalRouter.put(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const result = empleadoSchema.partial().safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      const { fechaIngreso, ...rest } = result.data;

      const empleado = await prisma.empleado.update({
        where: { idEmpleado: id },
        data: {
          ...rest,
          ...(fechaIngreso && { fechaIngreso: new Date(fechaIngreso) }),
        },
      });

      res.json(empleado);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /personal/:id/pagos ─────────────────────────────────────────────────
personalRouter.post(
  '/:id/pagos',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const result = pagoEmpleadoSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      // Verificar que existe el empleado
      const empleado = await prisma.empleado.findUnique({ where: { idEmpleado: id } });
      if (!empleado) {
        res.status(404).json({ error: 'Not Found', message: 'Empleado no encontrado' });
        return;
      }

      const { periodo, salarioPagado, anticipos, bonificaciones, descuentos, idMovimiento } =
        result.data;

      const pago = await prisma.pagoEmpleado.create({
        data: {
          idEmpleado: id,
          periodo: new Date(periodo),
          salarioPagado,
          anticipos,
          bonificaciones,
          descuentos,
          idMovimiento,
        },
        include: {
          empleado: { select: { nombres: true, apellidos: true, cargo: true } },
        },
      });

      res.status(201).json(pago);
    } catch (err) {
      next(err);
    }
  }
);
