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
import { authorizeRoles } from '../middlewares/role.middleware';
import { FINANZAS_TX_OPTIONS } from '../middlewares/finanzas-permissions.middleware';
import { auditoriaService } from '../modules/auditoria';
import {
  mailerService,
  buildComunicadoEmailHtml,
  buildComunicadoEmailText,
} from '../modules/mailer';

export const comunicadosRouter: IRouter = Router();
comunicadosRouter.use(authMiddleware);

// ── Helper: Envío en segundo plano de correos (US3.2 CA06) ───────────────────
async function despacharCorreosComunicado(
  idComunicado: number,
  titulo: string,
  contenido: string
): Promise<void> {
  try {
    const envios = await prisma.comunicadoEnvio.findMany({
      where: { idComunicado },
      include: {
        persona: {
          select: {
            idPersona: true,
            correo: true,
            nombres: true,
            apellidos: true,
          },
        },
      },
    });

    const htmlBody = buildComunicadoEmailHtml(titulo, contenido);
    const textBody = buildComunicadoEmailText(titulo, contenido);

    for (const envio of envios) {
      const email = envio.persona?.correo?.trim();
      // Personas sin correo registrado: marcar como 'Omitido' sin llamar a SMTP
      if (!email) {
        try {
          await prisma.comunicadoEnvio.update({
            where: { idEnvio: envio.idEnvio },
            data: {
              estadoEnvio: 'Omitido',
            },
          });
        } catch (err: any) {
          console.error(
            `[COMUNICADOS] Error al actualizar estado de envío Omitido para idEnvio ${envio.idEnvio}:`,
            err?.message || err
          );
        }
        continue;
      }

      try {
        const sendResult = await mailerService.sendMail({
          to: email,
          subject: titulo,
          text: textBody,
          html: htmlBody,
        });

        if (sendResult.success) {
          await prisma.comunicadoEnvio.update({
            where: { idEnvio: envio.idEnvio },
            data: {
              estadoEnvio: 'Enviado',
              fechaEnvio: new Date(),
            },
          });
        } else if (!sendResult.skipped) {
          // Fallo en validación previa de correo o en el transporte SMTP
          await prisma.comunicadoEnvio.update({
            where: { idEnvio: envio.idEnvio },
            data: {
              estadoEnvio: 'Fallido',
              fechaEnvio: new Date(),
            },
          });
        }
      } catch (err: any) {
        console.error(
          `[COMUNICADOS] Error al actualizar estado de envío para idEnvio ${envio.idEnvio}:`,
          err?.message || err
        );
        try {
          await prisma.comunicadoEnvio.update({
            where: { idEnvio: envio.idEnvio },
            data: {
              estadoEnvio: 'Fallido',
              fechaEnvio: new Date(),
            },
          });
        } catch {
          // Ignorar para preservar la estabilidad del proceso
        }
      }
    }
  } catch (err: any) {
    console.error(
      `[COMUNICADOS] Error general al despachar correos para el comunicado ${idComunicado}:`,
      err?.message || err
    );
  }
}

// ── Schemas ──────────────────────────────────────────────────────────────────
const comunicadoSchema = z.object({
  titulo: z.string().min(3).max(150),
  contenido: z.string().min(1),
  canalEnvio: z.enum(['Correo', 'WhatsApp', 'Ambos', 'Solo sistema']).optional(),
  // IDs de personas destinatarias (opcional: si se omite, se envía a todos)
  destinatarios: z.array(z.number().int().positive()).optional(),
});

// ── Helper: Normalización y cálculo de resumen de envíos (US3.2) ─────────────
export interface ResumenEnvios {
  total: number;
  pendientes: number;
  enviados: number;
  fallidos: number;
  omitidos: number;
}

function clasificarEstadoEnvio(
  estado: string | null | undefined
): 'enviados' | 'fallidos' | 'pendientes' | 'omitidos' {
  const norm = (estado || '').trim().toLowerCase();
  if (norm === 'enviado' || norm === 'entregado') {
    return 'enviados';
  }
  if (norm === 'fallido') {
    return 'fallidos';
  }
  if (norm === 'omitido') {
    return 'omitidos';
  }
  return 'pendientes';
}

function calcularResumenDesdeEnvios(envios: { estadoEnvio?: string | null }[]): ResumenEnvios {
  const resumen: ResumenEnvios = {
    total: envios.length,
    pendientes: 0,
    enviados: 0,
    fallidos: 0,
    omitidos: 0,
  };

  for (const envio of envios) {
    const categoria = clasificarEstadoEnvio(envio.estadoEnvio);
    resumen[categoria]++;
  }

  return resumen;
}

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

      const idsPagina = comunicados.map((c) => c.idComunicado);

      // Mapa para inicializar y acumular el resumen de envíos de cada comunicado de la página
      const resumenPorComunicado = new Map<number, ResumenEnvios>();
      for (const id of idsPagina) {
        resumenPorComunicado.set(id, {
          total: 0,
          pendientes: 0,
          enviados: 0,
          fallidos: 0,
          omitidos: 0,
        });
      }

      // Una sola consulta agrupada para todos los comunicados de la página (sin consultas N+1)
      if (idsPagina.length > 0) {
        const grupos = await prisma.comunicadoEnvio.groupBy({
          by: ['idComunicado', 'estadoEnvio'],
          where: {
            idComunicado: { in: idsPagina },
          },
          _count: {
            _all: true,
          },
        });

        for (const grupo of grupos) {
          const resumen = resumenPorComunicado.get(grupo.idComunicado);
          if (resumen) {
            const cantidad = grupo._count._all;
            const categoria = clasificarEstadoEnvio(grupo.estadoEnvio);
            resumen[categoria] += cantidad;
            resumen.total += cantidad;
          }
        }
      }

      const data = comunicados.map((c) => ({
        ...c,
        resumenEnvios: resumenPorComunicado.get(c.idComunicado) || {
          total: 0,
          pendientes: 0,
          enviados: 0,
          fallidos: 0,
          omitidos: 0,
        },
      }));

      res.json({
        data,
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

      const isAdmin = req.user?.rol?.toUpperCase() === 'ADMINISTRADOR';

      // Para Administrador: todo igual que hoy (incluye envíos con datos de personas)
      if (isAdmin) {
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
        return;
      }

      // Para roles distintos de Administrador: sin envíos con datos de personas y con resumenEnvios
      const comunicado = await prisma.comunicado.findUnique({
        where: { idComunicado: id },
        include: {
          usuarioCreador: { select: { nombreUsuario: true } },
          envios: {
            select: { estadoEnvio: true },
          },
        },
      });

      if (!comunicado) {
        res.status(404).json({ error: 'Not Found', message: 'Comunicado no encontrado' });
        return;
      }

      const resumenEnvios = calcularResumenDesdeEnvios(comunicado.envios);
      const { envios: _envios, ...comunicadoSinEnvios } = comunicado;

      res.json({
        ...comunicadoSinEnvios,
        resumenEnvios,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /comunicados ────────────────────────────────────────────────────────
comunicadosRouter.post(
  '/',
  authorizeRoles('Administrador'),
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

      // Crear comunicado con sus envíos y auditoría en una transacción interactiva
      const txOptions =
        FINANZAS_TX_OPTIONS.timeout < 30000
          ? { ...FINANZAS_TX_OPTIONS, timeout: 30000, maxWait: 15000 }
          : FINANZAS_TX_OPTIONS;

      const comunicado = await prisma.$transaction(async (tx) => {
        const nuevo = await tx.comunicado.create({
          data: {
            titulo,
            contenido,
            canalEnvio,
            idUsuarioCreador: req.user!.idUsuario,
            envios: {
              createMany: {
                data: personasIds.map((idPersona) => ({
                  idPersona,
                  estadoEnvio: 'Pendiente',
                })),
              },
            },
          },
          include: {
            _count: { select: { envios: true } },
          },
        });

        await auditoriaService.registrarEvento({
          tablaAfectada: 'comunicados',
          idRegistro: nuevo.idComunicado.toString(),
          accion: 'CREAR_COMUNICADO',
          resultado: 'EXITO',
          datosNuevos: nuevo,
          idUsuario: req.user?.idUsuario ?? null,
          tx,
        });

        return nuevo;
      }, txOptions);

      res.status(201).json(comunicado);

      // Despacho de correos en segundo plano fuera de la transacción (US3.2 CA06)
      const incluyeCorreo = canalEnvio === 'Correo' || canalEnvio === 'Ambos';
      if (incluyeCorreo) {
        setImmediate(() => {
          despacharCorreosComunicado(comunicado.idComunicado, titulo, contenido).catch((err) => {
            console.error(
              '[COMUNICADOS] Error en ejecución background de despacho de correos:',
              err?.message || err
            );
          });
        });
      }
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /comunicados/:id ──────────────────────────────────────────────────
comunicadosRouter.delete(
  '/:id',
  authorizeRoles('Administrador'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID inválido' });
        return;
      }

      const existing = await prisma.comunicado.findUnique({
        where: { idComunicado: id },
      });

      if (!existing) {
        res.status(404).json({ error: 'Not Found', message: 'Comunicado no encontrado' });
        return;
      }

      // Eliminar envíos primero (integridad referencial) y registrar auditoría en transacción interactiva
      await prisma.$transaction(async (tx) => {
        await tx.comunicadoEnvio.deleteMany({ where: { idComunicado: id } });
        await tx.comunicado.delete({ where: { idComunicado: id } });

        await auditoriaService.registrarEvento({
          tablaAfectada: 'comunicados',
          idRegistro: id.toString(),
          accion: 'ELIMINAR_COMUNICADO',
          resultado: 'EXITO',
          datosAnteriores: existing,
          idUsuario: req.user?.idUsuario ?? null,
          tx,
        });
      }, FINANZAS_TX_OPTIONS);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
