// backend/src/routes/comunicados.routes.ts
// Gestión de comunicados y notificaciones a residentes
//   GET    /api/v1/comunicados       — listar
//   GET    /api/v1/comunicados/:id   — detalle con envíos
//   POST   /api/v1/comunicados       — crear
//   DELETE /api/v1/comunicados/:id   — eliminar

import { Router, Response, NextFunction, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';

export const comunicadosRouter: IRouter = Router();
comunicadosRouter.use(authMiddleware);

// ── Schemas ──────────────────────────────────────────────────────────────────
const comunicadoSchema = z.object({
  titulo: z.string().min(3).max(150),
  contenido: z.string().min(1),
  canalEnvio: z.enum(['Correo', 'WhatsApp', 'Ambos', 'Solo sistema']).optional(),
  // IDs de personas destinatarias (opcional: si se omite, se envía a todos)
  destinatarios: z.array(z.number().int().positive()).optional(),
});

// ── GET /comunicados ─────────────────────────────────────────────────────────
comunicadosRouter.get(
  '/',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page = '1', limit = '20' } = req.query;
      const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
      const take = parseInt(String(limit));

      const [comunicados, total] = await Promise.all([
        prisma.comunicado.findMany({
          skip,
          take,
          orderBy: { fechaPublicacion: 'desc' },
          include: {
            usuarioCreador: { select: { nombreUsuario: true } },
            _count: { select: { envios: true } },
          },
        }),
        prisma.comunicado.count(),
      ]);

      res.json({
        data: comunicados,
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

// ── GET /comunicados/:id ─────────────────────────────────────────────────────
comunicadosRouter.get(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const comunicado = await prisma.comunicado.findUnique({
        where: { idComunicado: id },
        include: {
          usuarioCreador: { select: { nombreUsuario: true } },
          envios: {
            include: {
              persona: { select: { nombres: true, apellidos: true, correo: true, telefono: true } },
            },
            orderBy: { fechaEnvio: 'desc' },
          },
        },
      });

      if (!comunicado) {
        res.status(404).json({ error: 'Not Found', message: 'Comunicado no encontrado' });
        return;
      }

      res.json(comunicado);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /comunicados ────────────────────────────────────────────────────────
comunicadosRouter.post(
  '/',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = comunicadoSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos',
          details: result.error.flatten().fieldErrors,
        });
        return;
      }

      const { titulo, contenido, canalEnvio, destinatarios } = result.data;

      // Si no hay destinatarios específicos, obtener todas las personas
      let personasIds = destinatarios;
      if (!personasIds || personasIds.length === 0) {
        const personas = await prisma.persona.findMany({ select: { idPersona: true } });
        personasIds = personas.map((p) => p.idPersona);
      }

      // Crear comunicado con sus envíos en una transacción
      const comunicado = await prisma.comunicado.create({
        data: {
          titulo,
          contenido,
          canalEnvio,
          idUsuarioCreador: req.user!.idUsuario,
          envios: {
            create: personasIds.map((idPersona) => ({
              idPersona,
              estadoEnvio: 'Pendiente',
            })),
          },
        },
        include: {
          _count: { select: { envios: true } },
        },
      });

      res.status(201).json(comunicado);
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /comunicados/:id ──────────────────────────────────────────────────
comunicadosRouter.delete(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      // Eliminar envíos primero (integridad referencial)
      await prisma.$transaction([
        prisma.comunicadoEnvio.deleteMany({ where: { idComunicado: id } }),
        prisma.comunicado.delete({ where: { idComunicado: id } }),
      ]);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
