// backend/src/routes/personal.routes.ts
// Gestión de empleados y pagos de sueldos
//   GET    /api/v1/personal             — listar empleados
//   GET    /api/v1/personal/:id         — detalle con historial de pagos
//   POST   /api/v1/personal             — crear empleado
//   PUT    /api/v1/personal/:id         — actualizar empleado
//   PUT    /api/v1/personal/:id/salario — modificar salario base (el antes/después queda en auditoría)
//   GET    /api/v1/personal/:id/salario — consultar salario actual de empleado
//   POST   /api/v1/personal/:id/pagos   — registrar pago de sueldo
//   GET    /api/v1/personal/:id/pagos   — historial completo paginado y filtrable

import { Router, Response, NextFunction, IRouter } from 'express';
import { prisma, Prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { auditoriaService } from '../modules/auditoria';
import { FINANZAS_TX_OPTIONS } from '../middlewares/finanzas-permissions.middleware';

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

const modificarSalarioSchema = z.object({
  salarioBase: z.number().positive(),
  motivo: z.string().min(5),
});

// ── GET /personal ────────────────────────────────────────────────────────────
personalRouter.get(
  '/',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activo, page = '1', limit = '20' } = req.query;

      const where: Prisma.EmpleadoWhereInput = {};
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
  authorizeRoles('Administrador', 'Directorio'),
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
  authorizeRoles('Administrador'),
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

      const empleado = await prisma.$transaction(async (tx) => {
        const nuevo = await tx.empleado.create({
          data: {
            ...rest,
            salarioBase,
            fechaIngreso: new Date(fechaIngreso),
          },
        });

        await auditoriaService.registrarEvento({
          tablaAfectada: 'empleados',
          idRegistro: nuevo.idEmpleado.toString(),
          accion: 'CREAR_EMPLEADO',
          resultado: 'EXITO',
          datosNuevos: nuevo,
          idUsuario: req.user?.idUsuario ?? null,
          tx,
        });

        return nuevo;
      }, FINANZAS_TX_OPTIONS);

      res.status(201).json(empleado);
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /personal/:id ────────────────────────────────────────────────────────
personalRouter.put(
  '/:id',
  authorizeRoles('Administrador'),
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

      const empleado = await prisma.$transaction(async (tx) => {
        const existing = await tx.empleado.findUnique({
          where: { idEmpleado: id },
        });
        if (!existing) {
          return null;
        }

        const updated = await tx.empleado.update({
          where: { idEmpleado: id },
          data: {
            ...rest,
            ...(fechaIngreso && { fechaIngreso: new Date(fechaIngreso) }),
          },
        });

        await auditoriaService.registrarEvento({
          tablaAfectada: 'empleados',
          idRegistro: updated.idEmpleado.toString(),
          accion: 'ACTUALIZAR_EMPLEADO',
          resultado: 'EXITO',
          datosAnteriores: existing,
          datosNuevos: updated,
          idUsuario: req.user?.idUsuario ?? null,
          tx,
        });

        return updated;
      }, FINANZAS_TX_OPTIONS);

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

// ── PUT /personal/:id/salario ────────────────────────────────────────────────
// modificar salario base (el antes/después queda en auditoría)
personalRouter.put(
  '/:id/salario',
  authorizeRoles('Administrador'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const result = modificarSalarioSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      const { salarioBase, motivo } = result.data;

      const resultado = await prisma.$transaction(async (tx) => {
        const existing = await tx.empleado.findUnique({
          where: { idEmpleado: id },
        });
        if (!existing) {
          return { tipo: 'NOT_FOUND' as const };
        }

        if (Number(existing.salarioBase) === salarioBase || existing.salarioBase.equals(salarioBase)) {
          return { tipo: 'SAME_SALARY' as const };
        }

        const updated = await tx.empleado.update({
          where: { idEmpleado: id },
          data: {
            salarioBase,
          },
        });

        await auditoriaService.registrarEvento({
          tablaAfectada: 'empleados',
          idRegistro: updated.idEmpleado.toString(),
          accion: 'MODIFICACION_SALARIO_EMPLEADO',
          resultado: 'EXITO',
          datosAnteriores: { salarioBase: Number(existing.salarioBase) },
          datosNuevos: { salarioBase, motivo },
          idUsuario: req.user?.idUsuario ?? null,
          tx,
        });

        return { tipo: 'OK' as const, updated };
      }, FINANZAS_TX_OPTIONS);

      if (resultado.tipo === 'NOT_FOUND') {
        res.status(404).json({ error: 'Not Found', message: 'Empleado no encontrado' });
        return;
      }

      if (resultado.tipo === 'SAME_SALARY') {
        res.status(422).json({
          error: 'Unprocessable Entity',
          message: 'El nuevo salario debe ser diferente al actual',
        });
        return;
      }

      res.json({
        idEmpleado: resultado.updated.idEmpleado,
        salarioBase: Number(resultado.updated.salarioBase),
        fechaActualizacion: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /personal/:id/salario ────────────────────────────────────────────────
// Consultar Salario Actual de Empleado (5.12.14)
personalRouter.get(
  '/:id/salario',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const empleado = await prisma.empleado.findUnique({
        where: { idEmpleado: id },
        select: {
          idEmpleado: true,
          salarioBase: true,
          nombres: true,
          apellidos: true,
          cargo: true,
        },
      });

      if (!empleado) {
        res.status(404).json({ error: 'Not Found', message: 'Empleado no encontrado' });
        return;
      }

      res.json({
        idEmpleado: empleado.idEmpleado,
        salarioBase: Number(empleado.salarioBase),
        nombres: empleado.nombres,
        apellidos: empleado.apellidos,
        cargo: empleado.cargo,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /personal/:id/pagos ─────────────────────────────────────────────────
personalRouter.post(
  '/:id/pagos',
  authorizeRoles('Administrador'),
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

      // Verificar que existe el empleado (validación previa fuera de la transacción)
      const empleado = await prisma.empleado.findUnique({ where: { idEmpleado: id } });
      if (!empleado) {
        res.status(404).json({ error: 'Not Found', message: 'Empleado no encontrado' });
        return;
      }

      const { periodo, salarioPagado, anticipos, bonificaciones, descuentos, idMovimiento } =
        result.data;

      const pago = await prisma.$transaction(async (tx) => {
        const nuevoPago = await tx.pagoEmpleado.create({
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

        await auditoriaService.registrarEvento({
          tablaAfectada: 'pagos_empleados',
          idRegistro: nuevoPago.idPagoEmpleado.toString(),
          accion: 'REGISTRO_PAGO_EMPLEADO',
          resultado: 'EXITO',
          datosNuevos: nuevoPago,
          idUsuario: req.user?.idUsuario ?? null,
          tx,
        });

        return nuevoPago;
      }, FINANZAS_TX_OPTIONS);

      res.status(201).json(pago);
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /personal/:id/pagos ──────────────────────────────────────────────────
// Historial completo paginado y filtrable de pagos de un empleado (CA11, 5.12.6)
personalRouter.get(
  '/:id/pagos',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const { anio, periodo, page = '1', limit = '12' } = req.query;

      if (anio !== undefined) {
        if (!/^\d{4}$/.test(String(anio))) {
          res.status(400).json({ error: 'Bad Request', message: 'Año inválido (debe ser un número de 4 dígitos)' });
          return;
        }
      }

      if (periodo !== undefined) {
        const periodoStr = String(periodo);
        const match = periodoStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) {
          res.status(400).json({ error: 'Bad Request', message: 'Período inválido (formato esperado: YYYY-MM-DD)' });
          return;
        }
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        const dateObj = new Date(Date.UTC(year, month - 1, day));
        if (
          dateObj.getUTCFullYear() !== year ||
          dateObj.getUTCMonth() + 1 !== month ||
          dateObj.getUTCDate() !== day
        ) {
          res.status(400).json({ error: 'Bad Request', message: 'Período inválido (fecha inexistente)' });
          return;
        }
      }

      const empleado = await prisma.empleado.findUnique({
        where: { idEmpleado: id },
        select: { idEmpleado: true },
      });
      if (!empleado) {
        res.status(404).json({ error: 'Not Found', message: 'Empleado no encontrado' });
        return;
      }

      const pageNum = Math.max(1, parseInt(String(page)) || 1);
      const rawLimit = parseInt(String(limit)) || 12;
      const limitNum = Math.min(50, Math.max(1, rawLimit));
      const skip = (pageNum - 1) * limitNum;

      const where: Prisma.PagoEmpleadoWhereInput = { idEmpleado: id };

      if (periodo) {
        where.periodo = new Date(String(periodo));
      } else if (anio) {
        const a = parseInt(String(anio));
        where.periodo = {
          gte: new Date(Date.UTC(a, 0, 1)),
          lte: new Date(Date.UTC(a, 11, 31, 23, 59, 59, 999)),
        };
      }

      const [pagos, total] = await Promise.all([
        prisma.pagoEmpleado.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { periodo: 'desc' },
          include: {
            movimiento: { select: { idMovimiento: true, descripcion: true, fecha: true } },
          },
        }),
        prisma.pagoEmpleado.count({ where }),
      ]);

      res.json({
        data: pagos,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
