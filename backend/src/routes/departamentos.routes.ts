// backend/src/routes/departamentos.routes.ts
// CRUD completo de departamentos, parqueos, bauleras y ocupantes
//   GET    /api/v1/departamentos
//   GET    /api/v1/departamentos/:id
//   POST   /api/v1/departamentos
//   PUT    /api/v1/departamentos/:id
//   DELETE /api/v1/departamentos/:id

import { Router, Response, NextFunction, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';

export const departamentosRouter: IRouter = Router();
departamentosRouter.use(authMiddleware);

// ── Schemas ──────────────────────────────────────────────────────────────────
const departamentoSchema = z.object({
  numero: z.string().min(1).max(10),
  piso: z.number().int().optional(),
  areaM2: z.number().positive().optional(),
  idPropietario: z.number().int().positive().optional(),
  estado: z.enum(['Ocupado', 'Desocupado', 'EnVenta', 'EnAlquiler']).default('Ocupado'),
});

// ── GET /departamentos ───────────────────────────────────────────────────────
departamentosRouter.get(
  '/',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { estado, page = '1', limit = '20' } = req.query;

      const where = estado ? { estado: String(estado) } : {};
      const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
      const take = parseInt(String(limit));

      const [departamentos, total] = await Promise.all([
        prisma.departamento.findMany({
          where,
          skip,
          take,
          orderBy: { numero: 'asc' },
          include: {
            propietario: {
              select: { idPersona: true, nombres: true, apellidos: true, telefono: true },
            },
            parqueos: { select: { idParqueo: true, numero: true } },
            bauleras: { select: { idBaulera: true, numero: true } },
            _count: { select: { ocupantes: true, expensas: true } },
          },
        }),
        prisma.departamento.count({ where }),
      ]);

      res.json({
        data: departamentos,
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

// ── GET /departamentos/:id ───────────────────────────────────────────────────
departamentosRouter.get(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const departamento = await prisma.departamento.findUnique({
        where: { idDepartamento: id },
        include: {
          propietario: true,
          parqueos: true,
          bauleras: true,
          ocupantes: {
            where: { fechaFin: null }, // solo ocupantes activos
            include: {
              persona: {
                select: { idPersona: true, nombres: true, apellidos: true, telefono: true, correo: true },
              },
            },
            orderBy: { fechaInicio: 'desc' },
          },
          expensas: {
            orderBy: { periodo: 'desc' },
            take: 12, // últimos 12 meses
          },
        },
      });

      if (!departamento) {
        res.status(404).json({ error: 'Not Found', message: 'Departamento no encontrado' });
        return;
      }

      res.json(departamento);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /departamentos ──────────────────────────────────────────────────────
departamentosRouter.post(
  '/',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = departamentoSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      const { numero, piso, areaM2, idPropietario, estado } = result.data;

      const departamento = await prisma.departamento.create({
        data: {
          numero,
          piso,
          areaM2: areaM2 !== undefined ? areaM2 : undefined,
          idPropietario,
          estado,
        },
        include: {
          propietario: { select: { nombres: true, apellidos: true } },
        },
      });

      res.status(201).json(departamento);
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /departamentos/:id ───────────────────────────────────────────────────
departamentosRouter.put(
  '/:id',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const result = departamentoSchema.partial().safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      const departamento = await prisma.departamento.update({
        where: { idDepartamento: id },
        data: result.data,
        include: {
          propietario: { select: { nombres: true, apellidos: true } },
        },
      });

      res.json(departamento);
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /departamentos/:id ────────────────────────────────────────────────
departamentosRouter.delete(
  '/:id',
  authorizeRoles('Administrador', 'Directorio'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      await prisma.departamento.delete({ where: { idDepartamento: id } });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
