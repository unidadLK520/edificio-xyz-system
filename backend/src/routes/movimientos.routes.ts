// backend/src/routes/movimientos.routes.ts
// Gestión de movimientos financieros (ingresos y egresos)
//   GET    /api/v1/movimientos           — listar con filtros (tipo, categoría, período)
//   GET    /api/v1/movimientos/resumen   — resumen financiero (totales de ingresos, egresos y balance)
//   GET    /api/v1/movimientos/categorias— categorías de ingresos y egresos
//   GET    /api/v1/movimientos/:id       — detalle
//   POST   /api/v1/movimientos           — crear movimiento (requiere permisos financieros)
//   PUT    /api/v1/movimientos/:id       — modificar movimiento (requiere permisos financieros)
//   DELETE /api/v1/movimientos/:id       — eliminar movimiento (requiere permisos financieros)

import { Router, Response, NextFunction, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';

export const movimientosRouter: IRouter = Router();
movimientosRouter.use(authMiddleware);

// ── Schemas ──────────────────────────────────────────────────────────────────
const movimientoSchema = z.object({
  tipo: z.enum(['Ingreso', 'Egreso']),
  idCategoria: z.number().int().positive(),
  monto: z.number().positive(),
  descripcion: z.string().optional().default(''),
  fecha: z.coerce.date().optional(),
  comprobanteUrl: z.string().optional().nullable(),
});

const movimientoUpdateSchema = z.object({
  tipo: z.enum(['Ingreso', 'Egreso']).optional(),
  idCategoria: z.number().int().positive().optional(),
  monto: z.number().positive().optional(),
  descripcion: z.string().optional().nullable(),
  fecha: z.coerce.date().optional(),
  comprobanteUrl: z.string().optional().nullable(),
});

// ── GET /movimientos/categorias ──────────────────────────────────────────────
// Lista categorías disponibles clasificadas por tipo (Ingreso / Egreso)
movimientosRouter.get(
  '/categorias',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tipo } = req.query;
      const where = tipo ? { tipo: String(tipo) } : {};

      let categorias = await prisma.categoriaMovimiento.findMany({
        where,
        orderBy: { idCategoria: 'asc' },
      });

      // Sembrar categorías iniciales si la tabla se encuentra vacía
      if (categorias.length === 0 && !tipo) {
        const defaultCats = [
          // Egresos
          { nombre: 'Mantenimiento y Reparaciones', tipo: 'Egreso' },
          { nombre: 'Servicios Básicos (Luz/Agua)', tipo: 'Egreso' },
          { nombre: 'Seguridad y Vigilancia', tipo: 'Egreso' },
          { nombre: 'Limpieza y Desinfección', tipo: 'Egreso' },
          { nombre: 'Administrativo y Legal', tipo: 'Egreso' },
          // Ingresos
          { nombre: 'Ingreso Extraordinario', tipo: 'Ingreso' },
          { nombre: 'Alquiler Áreas Comunes / Salón', tipo: 'Ingreso' },
          { nombre: 'Multas y Penalidades', tipo: 'Ingreso' },
          { nombre: 'Donación o Aporte Voluntario', tipo: 'Ingreso' },
          { nombre: 'Intereses y Rendimientos', tipo: 'Ingreso' },
        ];
        await prisma.categoriaMovimiento.createMany({ data: defaultCats });
        categorias = await prisma.categoriaMovimiento.findMany({ orderBy: { idCategoria: 'asc' } });
      }

      res.json(categorias);
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /movimientos/resumen ─────────────────────────────────────────────────
// Totales consistentes de ingresos y egresos según período o categoría (CA10)
movimientosRouter.get(
  '/resumen',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { mes, anio, idCategoria, fechaDesde, fechaHasta } = req.query;

      let fechaInicio: Date | undefined;
      let fechaFin: Date | undefined;

      if (fechaDesde || fechaHasta) {
        if (fechaDesde) fechaInicio = new Date(String(fechaDesde));
        if (fechaHasta) {
          const fin = new Date(String(fechaHasta));
          fin.setHours(23, 59, 59, 999);
          fechaFin = fin;
        }
      } else if (anio) {
        const a = parseInt(String(anio));
        const m = mes ? parseInt(String(mes)) - 1 : 0;
        fechaInicio = mes ? new Date(a, m, 1) : new Date(a, 0, 1);
        fechaFin = mes ? new Date(a, m + 1, 0, 23, 59, 59, 999) : new Date(a, 11, 31, 23, 59, 59, 999);
      }

      const where: Record<string, unknown> = {};
      if (fechaInicio || fechaFin) {
        where.fecha = {
          ...(fechaInicio && { gte: fechaInicio }),
          ...(fechaFin && { lte: fechaFin }),
        };
      }
      if (idCategoria) {
        where.idCategoria = parseInt(String(idCategoria));
      }

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
        periodo: {
          mes: mes || 'todos',
          anio: anio || 'todos',
          fechaDesde: fechaDesde || null,
          fechaHasta: fechaHasta || null,
        },
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
// Listado de movimientos con filtros por tipo, categoría, período y paginación (CA6, CA7)
movimientosRouter.get(
  '/',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tipo, idCategoria, fechaDesde, fechaHasta, page = '1', limit = '50', q } = req.query;

      const where: Record<string, unknown> = {};
      if (tipo && String(tipo) !== 'Todos') {
        where.tipo = String(tipo);
      }
      if (idCategoria && String(idCategoria) !== 'Todos') {
        where.idCategoria = parseInt(String(idCategoria));
      }
      if (fechaDesde || fechaHasta) {
        const fDesde = fechaDesde ? new Date(String(fechaDesde)) : undefined;
        let fHasta = fechaHasta ? new Date(String(fechaHasta)) : undefined;
        if (fHasta) {
          fHasta.setHours(23, 59, 59, 999);
        }
        where.fecha = {
          ...(fDesde && { gte: fDesde }),
          ...(fHasta && { lte: fHasta }),
        };
      }
      if (q) {
        where.descripcion = {
          contains: String(q),
          mode: 'insensitive',
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
            categoria: { select: { idCategoria: true, nombre: true, tipo: true } },
            usuarioRegistro: { select: { idUsuario: true, nombreUsuario: true } },
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
          usuarioRegistro: { select: { idUsuario: true, nombreUsuario: true, correo: true } },
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
// Registrar ingreso o egreso (CA1, CA2, CA3, CA4, CA5, CA9)
movimientosRouter.post(
  '/',
  authorizeRoles('Administrador', 'SuperAdmin'),
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

      // Validar categoría existente
      const categoria = await prisma.categoriaMovimiento.findUnique({
        where: { idCategoria: result.data.idCategoria },
      });
      if (!categoria) {
        res.status(400).json({ error: 'Bad Request', message: 'Categoría no encontrada' });
        return;
      }

      const movimiento = await prisma.movimiento.create({
        data: {
          tipo: result.data.tipo,
          idCategoria: result.data.idCategoria,
          monto: result.data.monto,
          descripcion: result.data.descripcion || null,
          fecha: result.data.fecha || new Date(),
          comprobanteUrl: result.data.comprobanteUrl || null,
          idUsuarioRegistro: req.user!.idUsuario,
        },
        include: {
          categoria: { select: { idCategoria: true, nombre: true, tipo: true } },
          usuarioRegistro: { select: { idUsuario: true, nombreUsuario: true } },
        },
      });

      res.status(201).json(movimiento);
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /movimientos/:id ─────────────────────────────────────────────────────
// Modificar movimiento financiero (CA8, CA9)
movimientosRouter.put(
  '/:id',
  authorizeRoles('Administrador', 'SuperAdmin'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const existing = await prisma.movimiento.findUnique({
        where: { idMovimiento: id },
      });

      if (!existing) {
        res.status(404).json({ error: 'Not Found', message: 'Movimiento no encontrado' });
        return;
      }

      const result = movimientoUpdateSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      // Si cambia de categoría, validar existencia
      if (result.data.idCategoria) {
        const cat = await prisma.categoriaMovimiento.findUnique({
          where: { idCategoria: result.data.idCategoria },
        });
        if (!cat) {
          res.status(400).json({ error: 'Bad Request', message: 'Categoría no encontrada' });
          return;
        }
      }

      // Actualizar solo los datos enviados, conservando los datos no modificados
      const updated = await prisma.movimiento.update({
        where: { idMovimiento: id },
        data: {
          ...(result.data.tipo !== undefined && { tipo: result.data.tipo }),
          ...(result.data.idCategoria !== undefined && { idCategoria: result.data.idCategoria }),
          ...(result.data.monto !== undefined && { monto: result.data.monto }),
          ...(result.data.descripcion !== undefined && { descripcion: result.data.descripcion }),
          ...(result.data.fecha !== undefined && { fecha: result.data.fecha }),
          ...(result.data.comprobanteUrl !== undefined && { comprobanteUrl: result.data.comprobanteUrl }),
        },
        include: {
          categoria: { select: { idCategoria: true, nombre: true, tipo: true } },
          usuarioRegistro: { select: { idUsuario: true, nombreUsuario: true } },
        },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /movimientos/:id ──────────────────────────────────────────────────
// Eliminar movimiento (CA9)
movimientosRouter.delete(
  '/:id',
  authorizeRoles('Administrador', 'SuperAdmin'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const existing = await prisma.movimiento.findUnique({
        where: { idMovimiento: id },
      });

      if (!existing) {
        res.status(404).json({ error: 'Not Found', message: 'Movimiento no encontrado' });
        return;
      }

      await prisma.movimiento.delete({
        where: { idMovimiento: id },
      });

      res.json({ success: true, message: 'Movimiento eliminado correctamente' });
    } catch (err) {
      next(err);
    }
  }
);
