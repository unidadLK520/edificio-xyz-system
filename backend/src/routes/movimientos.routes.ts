// backend/src/routes/movimientos.routes.ts
// Gestión de movimientos financieros (ingresos y egresos)
//   GET    /api/v1/movimientos           - listar con filtros (tipo, categoría, período)
//   GET    /api/v1/movimientos/resumen   - resumen financiero (totales de ingresos, egresos y balance)
//   GET    /api/v1/movimientos/categorias- categorías de ingresos y egresos
//   GET    /api/v1/movimientos/:id       - detalle
//   POST   /api/v1/movimientos           - crear movimiento (requiere permisos financieros)
//   PUT    /api/v1/movimientos/:id       - modificar movimiento (requiere permisos financieros)
//   DELETE /api/v1/movimientos/:id       - anular movimiento (soft-delete, requiere permisos financieros)

import { Router, Response, NextFunction, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { auditoriaService } from '../modules/auditoria';

export const movimientosRouter: IRouter = Router();
movimientosRouter.use(authMiddleware);

// -- Helpers ------------------------------------------------------------------
const sanitizeOptionalString = (maxLen: number, fieldName: string) =>
  z.preprocess((val) => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    }
    return val;
  }, z.string({ invalid_type_error: `${fieldName} debe ser una cadena de texto` }).max(maxLen, `${fieldName} no puede exceder ${maxLen} caracteres`).nullable().optional());

// -- Schemas ------------------------------------------------------------------
const movimientoSchema = z.object({
  tipo: z.enum(['Ingreso', 'Egreso'], {
    required_error: 'El tipo es obligatorio',
    invalid_type_error: "El tipo debe ser 'Ingreso' o 'Egreso'",
  }),
  idCategoria: z.number({
    required_error: 'La categoría es obligatoria',
    invalid_type_error: 'La categoría debe ser un ID numérico',
  }).int().positive('La categoría debe ser un ID positivo'),
  monto: z.number({
    required_error: 'El monto es obligatorio',
    invalid_type_error: 'El monto debe ser numérico',
  }).positive('El monto debe ser mayor a 0'),
  descripcion: z.string({
    required_error: 'La descripción es obligatoria',
    invalid_type_error: 'La descripción es obligatoria',
  }).trim().min(1, 'La descripción es obligatoria'),
  fecha: z.coerce.date({
    required_error: 'La fecha es obligatoria',
    invalid_type_error: 'La fecha es obligatoria y debe ser válida',
  }),
  comprobanteUrl: z.string().optional().nullable(),
  tercero: sanitizeOptionalString(120, 'tercero'),
  nroFactura: sanitizeOptionalString(50, 'nroFactura'),
  metodoPago: sanitizeOptionalString(30, 'metodoPago'),
});

const movimientoUpdateSchema = z.object({
  tipo: z.enum(['Ingreso', 'Egreso']).optional(),
  idCategoria: z.number().int().positive().optional(),
  monto: z.number().positive().optional(),
  descripcion: z.string().trim().min(1, 'La descripción no puede estar vacía').optional(),
  fecha: z.coerce.date().optional(),
  comprobanteUrl: z.string().optional().nullable(),
  tercero: sanitizeOptionalString(120, 'tercero'),
  nroFactura: sanitizeOptionalString(50, 'nroFactura'),
  metodoPago: sanitizeOptionalString(30, 'metodoPago'),
});

const categoriaSchema = z.object({
  nombre: z.string({
    required_error: 'El nombre es obligatorio',
    invalid_type_error: 'El nombre es obligatorio',
  }).trim().min(1, 'El nombre es obligatorio').max(80, 'El nombre no puede exceder 80 caracteres'),
  tipo: z.enum(['Ingreso', 'Egreso'], {
    required_error: 'El tipo es obligatorio',
    invalid_type_error: "El tipo debe ser 'Ingreso' o 'Egreso'",
  }),
});

const categoriaUpdateSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre no puede estar vacío').max(80, 'El nombre no puede exceder 80 caracteres').optional(),
  tipo: z.enum(['Ingreso', 'Egreso']).optional(),
});

const anularMovimientoSchema = z
  .object({
    motivo: z.string().trim().min(1, 'El motivo de anulación es obligatorio').optional(),
    motivoAnulacion: z.string().trim().min(1, 'El motivo de anulación es obligatorio').optional(),
  })
  .refine((data) => Boolean(data.motivo || data.motivoAnulacion), {
    message: 'El motivo de anulación es obligatorio',
    path: ['motivo'],
  });

// -- GET /movimientos/categorias ----------------------------------------------
// Lista categorías disponibles clasificadas por tipo (Ingreso / Egreso)
movimientosRouter.get(
  '/categorias',
  authorizeRoles('Administrador', 'Directorio'),
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

        await prisma.categoriaMovimiento.createMany({
          data: defaultCats,
          skipDuplicates: true,
        });

        categorias = await prisma.categoriaMovimiento.findMany({
          where,
          orderBy: { idCategoria: 'asc' },
        });
      }

      res.json(categorias);
    } catch (err) {
      next(err);
    }
  }
);

// -- POST /movimientos/categorias ---------------------------------------------
// Crear categoría de movimientos (solo Administrador)
movimientosRouter.post(
  '/categorias',
  authorizeRoles('Administrador'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = categoriaSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      const { nombre, tipo } = result.data;

      // Unicidad: nombre único por tipo
      const existing = await prisma.categoriaMovimiento.findFirst({
        where: {
          nombre: { equals: nombre, mode: 'insensitive' },
          tipo,
        },
      });

      if (existing) {
        res.status(409).json({
          error: 'Conflict',
          code: 'CATEGORIA_DUPLICADA',
          message: `Ya existe una categoría de tipo '${tipo}' con el nombre '${nombre}'`,
        });
        return;
      }

      const categoria = await prisma.categoriaMovimiento.create({
        data: { nombre, tipo },
      });

      await auditoriaService.registrarEvento({
        tablaAfectada: 'categorias_movimiento',
        idRegistro: categoria.idCategoria.toString(),
        accion: 'CREAR_CATEGORIA',
        resultado: 'EXITO',
        datosNuevos: categoria,
        idUsuario: req.user!.idUsuario,
      });

      res.status(201).json(categoria);
    } catch (err) {
      next(err);
    }
  }
);

// -- PUT /movimientos/categorias/:id ------------------------------------------
// Modificar categoría de movimientos (solo Administrador)
movimientosRouter.put(
  '/categorias/:id',
  authorizeRoles('Administrador'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de categoría inválido' });
        return;
      }

      const existing = await prisma.categoriaMovimiento.findUnique({
        where: { idCategoria: id },
      });

      if (!existing) {
        res.status(404).json({ error: 'Not Found', message: 'Categoría no encontrada' });
        return;
      }

      const result = categoriaUpdateSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      const nuevoNombre = result.data.nombre ?? existing.nombre;
      const nuevoTipo = result.data.tipo ?? existing.tipo;

      // Si cambia el tipo, verificar si existen movimientos asociados a esta categoría
      if (nuevoTipo !== existing.tipo) {
        const movimientosAsociados = await prisma.movimiento.count({
          where: { idCategoria: id },
        });
        if (movimientosAsociados > 0) {
          res.status(409).json({
            error: 'Conflict',
            code: 'CATEGORIA_CON_MOVIMIENTOS',
            message: 'No se puede cambiar el tipo de una categoría que tiene movimientos asociados',
          });
          return;
        }
      }

      if (nuevoNombre !== existing.nombre || nuevoTipo !== existing.tipo) {
        const dup = await prisma.categoriaMovimiento.findFirst({
          where: {
            idCategoria: { not: id },
            nombre: { equals: nuevoNombre, mode: 'insensitive' },
            tipo: nuevoTipo,
          },
        });
        if (dup) {
          res.status(409).json({
            error: 'Conflict',
            code: 'CATEGORIA_DUPLICADA',
            message: `Ya existe una categoría de tipo '${nuevoTipo}' con el nombre '${nuevoNombre}'`,
          });
          return;
        }
      }

      const updated = await prisma.categoriaMovimiento.update({
        where: { idCategoria: id },
        data: {
          ...(result.data.nombre !== undefined && { nombre: result.data.nombre }),
          ...(result.data.tipo !== undefined && { tipo: result.data.tipo }),
        },
      });

      await auditoriaService.registrarEvento({
        tablaAfectada: 'categorias_movimiento',
        idRegistro: updated.idCategoria.toString(),
        accion: 'MODIFICAR_CATEGORIA',
        resultado: 'EXITO',
        datosAnteriores: existing,
        datosNuevos: updated,
        idUsuario: req.user!.idUsuario,
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// -- GET /movimientos/resumen -------------------------------------------------
// Totales consistentes de ingresos y egresos según período o categoría (CA10)
movimientosRouter.get(
  '/resumen',
  authorizeRoles('Administrador', 'Directorio'),
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

      const where: Record<string, unknown> = {
        anulado: false,
      };
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

// -- GET /movimientos ---------------------------------------------------------
// Listado de movimientos con filtros por tipo, categoría, período y paginación (CA6, CA7)
movimientosRouter.get(
  '/',
  authorizeRoles('Administrador', 'Directorio'),
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
        const query = String(q).trim();
        if (query) {
          where.OR = [
            { descripcion: { contains: query, mode: 'insensitive' } },
            { tercero: { contains: query, mode: 'insensitive' } },
            { nroFactura: { contains: query, mode: 'insensitive' } },
          ];
        }
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

// -- GET /movimientos/:id -----------------------------------------------------
movimientosRouter.get(
  '/:id',
  authorizeRoles('Administrador', 'Directorio'),
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

// -- POST /movimientos --------------------------------------------------------
// Registrar ingreso o egreso (CA1, CA2, CA3, CA4, CA5, CA9)
movimientosRouter.post(
  '/',
  authorizeRoles('Administrador'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawBody = req.body || {};
      const normalizedBody: any = { ...rawBody };

      if ('idCategoria' in rawBody) {
        normalizedBody.idCategoria = rawBody.idCategoria;
      } else if (typeof rawBody.categoria === 'number') {
        normalizedBody.idCategoria = rawBody.categoria;
      } else if ('id_categoria' in rawBody) {
        normalizedBody.idCategoria = rawBody.id_categoria;
      }

      if ('nroFactura' in rawBody) {
        normalizedBody.nroFactura = rawBody.nroFactura;
      } else if ('nro_factura' in rawBody) {
        normalizedBody.nroFactura = rawBody.nro_factura;
      }

      if ('metodoPago' in rawBody) {
        normalizedBody.metodoPago = rawBody.metodoPago;
      } else if ('metodo_pago' in rawBody) {
        normalizedBody.metodoPago = rawBody.metodo_pago;
      }

      const result = movimientoSchema.safeParse(normalizedBody);
      if (!result.success) {
        const details: Record<string, string[] | undefined> = { ...result.error.flatten().fieldErrors };
        if (details.idCategoria && !details.categoria) {
          details.categoria = details.idCategoria;
        }
        if (details.nroFactura && !details.nro_factura) {
          details.nro_factura = details.nroFactura;
        }
        if (details.metodoPago && !details.metodo_pago) {
          details.metodo_pago = details.metodoPago;
        }
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos',
          details,
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
          descripcion: result.data.descripcion,
          fecha: result.data.fecha,
          comprobanteUrl: result.data.comprobanteUrl || null,
          tercero: result.data.tercero ?? null,
          nroFactura: result.data.nroFactura ?? null,
          metodoPago: result.data.metodoPago ?? null,
          idUsuarioRegistro: req.user!.idUsuario,
        },
        include: {
          categoria: { select: { idCategoria: true, nombre: true, tipo: true } },
          usuarioRegistro: { select: { idUsuario: true, nombreUsuario: true } },
        },
      });

      await auditoriaService.registrarEvento({
        tablaAfectada: 'movimientos',
        idRegistro: movimiento.idMovimiento.toString(),
        accion: 'CREAR_MOVIMIENTO',
        resultado: 'EXITO',
        datosNuevos: movimiento,
        idUsuario: req.user!.idUsuario,
      });

      res.status(201).json(movimiento);
    } catch (err) {
      next(err);
    }
  }
);

// -- PUT /movimientos/:id -----------------------------------------------------
// Modificar movimiento financiero (CA8, CA9)
movimientosRouter.put(
  '/:id',
  authorizeRoles('Administrador'),
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

      if (existing.anulado) {
        res.status(409).json({
          error: 'MOVIMIENTO_ANULADO',
          code: 'MOVIMIENTO_ANULADO',
          message: 'No se puede modificar un movimiento que ha sido anulado',
        });
        return;
      }

      const rawBody = req.body || {};
      const normalizedBody: any = { ...rawBody };

      if ('idCategoria' in rawBody) {
        normalizedBody.idCategoria = rawBody.idCategoria;
      } else if (typeof rawBody.categoria === 'number') {
        normalizedBody.idCategoria = rawBody.categoria;
      } else if ('id_categoria' in rawBody) {
        normalizedBody.idCategoria = rawBody.id_categoria;
      }

      if ('nroFactura' in rawBody) {
        normalizedBody.nroFactura = rawBody.nroFactura;
      } else if ('nro_factura' in rawBody) {
        normalizedBody.nroFactura = rawBody.nro_factura;
      }

      if ('metodoPago' in rawBody) {
        normalizedBody.metodoPago = rawBody.metodoPago;
      } else if ('metodo_pago' in rawBody) {
        normalizedBody.metodoPago = rawBody.metodo_pago;
      }

      const result = movimientoUpdateSchema.safeParse(normalizedBody);
      if (!result.success) {
        const details: Record<string, string[] | undefined> = { ...result.error.flatten().fieldErrors };
        if (details.idCategoria && !details.categoria) {
          details.categoria = details.idCategoria;
        }
        if (details.nroFactura && !details.nro_factura) {
          details.nro_factura = details.nroFactura;
        }
        if (details.metodoPago && !details.metodo_pago) {
          details.metodo_pago = details.metodoPago;
        }
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos',
          details,
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
          ...(result.data.tercero !== undefined && { tercero: result.data.tercero }),
          ...(result.data.nroFactura !== undefined && { nroFactura: result.data.nroFactura }),
          ...(result.data.metodoPago !== undefined && { metodoPago: result.data.metodoPago }),
        },
        include: {
          categoria: { select: { idCategoria: true, nombre: true, tipo: true } },
          usuarioRegistro: { select: { idUsuario: true, nombreUsuario: true } },
        },
      });

      await auditoriaService.registrarEvento({
        tablaAfectada: 'movimientos',
        idRegistro: updated.idMovimiento.toString(),
        accion: 'MODIFICAR_MOVIMIENTO',
        resultado: 'EXITO',
        datosAnteriores: existing,
        datosNuevos: updated,
        idUsuario: req.user!.idUsuario,
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// -- DELETE /movimientos/:id --------------------------------------------------
// Anulación (soft-delete) de movimiento financiero (CA9)
movimientosRouter.delete(
  '/:id',
  authorizeRoles('Administrador'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const bodyResult = anularMovimientoSchema.safeParse(req.body);
      if (!bodyResult.success) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'El motivo de anulación es obligatorio',
          details: bodyResult.error.flatten().fieldErrors,
        });
        return;
      }

      const motivo = (bodyResult.data.motivo || bodyResult.data.motivoAnulacion)!.trim();

      const existing = await prisma.movimiento.findUnique({
        where: { idMovimiento: id },
      });

      if (!existing) {
        res.status(404).json({ error: 'Not Found', message: 'Movimiento no encontrado' });
        return;
      }

      if (existing.anulado) {
        res.status(409).json({
          error: 'Conflict',
          message: 'El movimiento ya fue anulado',
          code: 'ANULACION_YA_REALIZADA',
        });
        return;
      }

      const anulado = await prisma.$transaction(async (tx) => {
        const mov = await tx.movimiento.update({
          where: { idMovimiento: id },
          data: {
            anulado: true,
            fechaAnulacion: new Date(),
            idUsuarioAnulacion: req.user!.idUsuario,
            motivoAnulacion: motivo,
          },
          include: {
            categoria: { select: { idCategoria: true, nombre: true, tipo: true } },
            usuarioRegistro: { select: { idUsuario: true, nombreUsuario: true } },
          },
        });

        await auditoriaService.registrarEvento({
          tablaAfectada: 'movimientos',
          idRegistro: mov.idMovimiento.toString(),
          accion: 'ANULACION_MOVIMIENTO',
          resultado: 'EXITO',
          datosAnteriores: existing,
          datosNuevos: mov,
          idUsuario: req.user!.idUsuario,
          tx,
        });

        return mov;
      });

      res.json({
        success: true,
        message: 'Movimiento anulado correctamente',
        data: anulado,
      });
    } catch (err) {
      next(err);
    }
  }
);
