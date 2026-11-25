// backend/src/routes/whatsapp.routes.ts
// Vinculación del número de WhatsApp (solo Administrador)
//   GET    /api/v1/whatsapp/estado
//   POST   /api/v1/whatsapp/vincular   { telefono }  -> devuelve el código de emparejamiento
//   DELETE /api/v1/whatsapp/vincular                 -> desvincula y borra la sesión

import { Router, Response, NextFunction, IRouter } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { auditoriaService } from '../modules/auditoria';
import { whatsappService, normalizarTelefono, enmascararTelefono } from '../modules/whatsapp';

export const whatsappRouter: IRouter = Router();
whatsappRouter.use(authMiddleware);
whatsappRouter.use(authorizeRoles('Administrador'));

const vincularSchema = z.object({
    telefono: z.string().min(8).max(20),
});

whatsappRouter.get('/estado', (_req: AuthRequest, res: Response): void => {
    res.json(whatsappService.estadoActual());
});

whatsappRouter.post(
    '/vincular',
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const parsed = vincularSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ error: 'Validation Error', message: 'Teléfono inválido' });
                return;
            }
            const telefono = normalizarTelefono(parsed.data.telefono);
            if (!telefono) {
                res.status(400).json({ error: 'Validation Error', message: 'Formato de teléfono no válido' });
                return;
            }

            let codigo: string;
            try {
                codigo = await whatsappService.solicitarCodigoVinculacion(telefono);
            } catch (err: any) {
                res.status(409).json({ error: 'Conflict', message: err?.message || 'No se pudo generar el código' });
                return;
            }

            await auditoriaService.registrarEvento({
                tablaAfectada: 'whatsapp_sesion',
                idRegistro: 'sesion',
                accion: 'VINCULAR_WHATSAPP',
                resultado: 'EXITO',
                datosNuevos: { numero: enmascararTelefono(telefono) },
                idUsuario: req.user?.idUsuario ?? null,
            });

            res.json({
                codigo,
                instrucciones:
                    'En el celular: WhatsApp Business > Ajustes > Dispositivos vinculados > Vincular dispositivo > Vincular con número de teléfono, y escribe este código.',
            });
        } catch (err) {
            next(err);
        }
    }
);

whatsappRouter.delete(
    '/vincular',
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            await whatsappService.desvincular();

            await auditoriaService.registrarEvento({
                tablaAfectada: 'whatsapp_sesion',
                idRegistro: 'sesion',
                accion: 'DESVINCULAR_WHATSAPP',
                resultado: 'EXITO',
                idUsuario: req.user?.idUsuario ?? null,
            });

            res.json(whatsappService.estadoActual());
        } catch (err) {
            next(err);
        }
    }
);

whatsappRouter.post(
    '/reconectar',
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            try {
                await whatsappService.reconectar();
            } catch (err: any) {
                res.status(409).json({ error: 'Conflict', message: err?.message || 'No se pudo reconectar' });
                return;
            }

            await auditoriaService.registrarEvento({
                tablaAfectada: 'whatsapp_sesion',
                idRegistro: 'sesion',
                accion: 'RECONECTAR_WHATSAPP',
                resultado: 'EXITO',
                idUsuario: req.user?.idUsuario ?? null,
            });

            res.json(whatsappService.estadoActual());
        } catch (err) {
            next(err);
        }
    }
);