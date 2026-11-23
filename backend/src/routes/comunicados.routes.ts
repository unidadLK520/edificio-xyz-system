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
import {
  whatsappService,
  normalizarTelefono,
  construirMensajeWhatsapp,
  leerPausaMs,
  dormir,
} from '../modules/whatsapp';

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

    for (let i = 0; i < envios.length; i++) {
      const envio = envios[i];
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
        } else if (sendResult.skipped) {
          console.warn(
            `[COMUNICADOS] Envío omitido para idEnvio ${envio.idEnvio}: ${sendResult.motivo || 'Sin motivo especificado'}`
          );
        } else {
          // Fallo en validación previa de correo o en el transporte (SMTP / Brevo)
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

      // Pausa de 500 ms entre correos del mismo lote
      if (i < envios.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  } catch (err: any) {
    console.error(
      `[COMUNICADOS] Error general al despachar correos para el comunicado ${idComunicado}:`,
      err?.message || err
    );
  }
}
// ── Helper: Envío en segundo plano por WhatsApp ──────────────────────────────
// Cola global: un solo lote a la vez, para que la pausa entre mensajes sea real.
let colaWhatsapp: Promise<void> = Promise.resolve();

function encolarWhatsapp(
  idComunicado: number,
  titulo: string,
  contenido: string,
  soloWhatsapp: boolean
): void {
  colaWhatsapp = colaWhatsapp
    .then(() => despacharWhatsappComunicado(idComunicado, titulo, contenido, soloWhatsapp))
    .catch((err: any) => {
      console.error('[COMUNICADOS] Error en la cola de WhatsApp:', err?.message || err);
    });
}

async function despacharWhatsappComunicado(
  idComunicado: number,
  titulo: string,
  contenido: string,
  soloWhatsapp: boolean
): Promise<void> {
  const envios = await prisma.comunicadoEnvio.findMany({
    where: { idComunicado, estadoWhatsapp: 'Pendiente' },
    orderBy: { idEnvio: 'asc' },
    include: { persona: { select: { telefono: true } } },
  });

  const mensaje = construirMensajeWhatsapp(titulo, contenido);
  const vistos = new Set<string>();
  let intentados = 0;
  let fallosSeguidos = 0;
  let detenido: string | null = null;

  const marcar = async (
    idEnvio: number,
    estado: 'Enviado' | 'Fallido' | 'Omitido',
    error: string | null
  ): Promise<void> => {
    const ahora = estado === 'Omitido' ? null : new Date();
    try {
      await prisma.comunicadoEnvio.update({
        where: { idEnvio },
        data: {
          estadoWhatsapp: estado,
          fechaEnvioWhatsapp: ahora,
          errorWhatsapp: error ? error.slice(0, 120) : null,
          ...(soloWhatsapp ? { estadoEnvio: estado, fechaEnvio: ahora } : {}),
        },
      });
    } catch (err: any) {
      console.error(
        `[COMUNICADOS] No se pudo guardar el estado de WhatsApp del envío ${idEnvio}:`,
        err?.message || err
      );
    }
  };

  for (const envio of envios) {
    if (detenido) {
      await marcar(envio.idEnvio, 'Fallido', detenido);
      continue;
    }

    const tel = normalizarTelefono(envio.persona?.telefono);
    if (!tel) {
      await marcar(envio.idEnvio, 'Omitido', 'Sin teléfono válido');
      continue;
    }
    if (vistos.has(tel)) {
      await marcar(envio.idEnvio, 'Omitido', 'Número repetido en este comunicado');
      continue;
    }
    vistos.add(tel);

    if (intentados > 0) await dormir(leerPausaMs());
    intentados++;

    let resultado = await whatsappService.enviarTexto(tel, mensaje);
    const esperas = [5000, 15000];
    for (let i = 0; i < esperas.length && !resultado.ok && resultado.temporal && !resultado.limite; i++) {
      await dormir(esperas[i]);
      resultado = await whatsappService.enviarTexto(tel, mensaje);
    }

    if (resultado.ok) {
      fallosSeguidos = 0;
      await marcar(envio.idEnvio, 'Enviado', null);
      continue;
    }

    await marcar(envio.idEnvio, 'Fallido', resultado.error);
    if (resultado.limite) {
      detenido = 'Detenido: WhatsApp limitó el envío';
    } else if (resultado.temporal) {
      fallosSeguidos++;
      if (fallosSeguidos >= 3) detenido = 'Detenido: WhatsApp desconectado';
    } else {
      fallosSeguidos = 0;
    }
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

      const incluyeCorreo = canalEnvio === 'Correo' || canalEnvio === 'Ambos';
      const incluyeWhatsapp = canalEnvio === 'WhatsApp' || canalEnvio === 'Ambos';

      // Si pide WhatsApp y no hay número conectado, no se crea nada
      if (incluyeWhatsapp && !whatsappService.estaConectado()) {
        res.status(409).json({
          error: 'Conflict',
          message:
            'WhatsApp no está conectado. Vincula el número desde el servidor o elige otro canal de envío.',
        });
        return;
      }

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
                  ...(incluyeWhatsapp ? { estadoWhatsapp: 'Pendiente' } : {}),
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

      // Correos en segundo plano (US3.2 CA06)
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

      // WhatsApp en segundo plano
      if (incluyeWhatsapp) {
        setImmediate(() => {
          encolarWhatsapp(comunicado.idComunicado, titulo, contenido, canalEnvio === 'WhatsApp');
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

// ── PUT /comunicados/:id ─────────────────────────────────────────────────────
// Permite al Administrador editar título, contenido o canal de un comunicado existente
comunicadosRouter.put(
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

      const { titulo, contenido, canalEnvio } = req.body;

      if (!titulo && !contenido && !canalEnvio) {
        res.status(400).json({ error: 'Bad Request', message: 'Debe proporcionar al menos un campo para actualizar' });
        return;
      }

      const actualizado = await prisma.$transaction(async (tx) => {
        const com = await tx.comunicado.update({
          where: { idComunicado: id },
          data: {
            ...(titulo ? { titulo: String(titulo).trim() } : {}),
            ...(contenido ? { contenido: String(contenido).trim() } : {}),
            ...(canalEnvio ? { canalEnvio: String(canalEnvio) } : {}),
          },
        });

        await auditoriaService.registrarEvento({
          tablaAfectada: 'comunicados',
          idRegistro: id.toString(),
          accion: 'ACTUALIZAR_COMUNICADO',
          resultado: 'EXITO',
          datosAnteriores: existing,
          datosNuevos: com,
          idUsuario: req.user?.idUsuario ?? null,
          tx,
        });

        return com;
      }, FINANZAS_TX_OPTIONS);

      res.status(200).json(actualizado);
    } catch (err) {
      next(err);
    }
  }
);
