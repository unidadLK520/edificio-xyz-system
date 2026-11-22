// backend/src/routes/cobro.routes.ts
// Cobro por QR: QR de cobro (configuracion_global) y proyección de deuda a una fecha

import { Router, Response, NextFunction, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/role.middleware';
import { auditoriaService } from '../modules/auditoria';
import { calcularCapitalPendiente, calcularMoraExpensa, calcularFechaVencimientoPeriodo } from '../modules/expensas';

export const cobroRouter: IRouter = Router();
cobroRouter.use(authMiddleware);

const KEY_QR = 'qr_cobro_imagen';
const KEY_VIG = 'qr_cobro_vigente_hasta';
const MAX_QR_BYTES = 1.5 * 1024 * 1024;
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const hoyLaPaz = (): string => new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
const dos = (n: number): string => String(n).padStart(2, '0');

class ErrorNegocio extends Error {
    constructor(public status: number, message: string) {
        super(message);
        Object.setPrototypeOf(this, ErrorNegocio.prototype);
    }
}

function responderError(err: unknown, res: Response, next: NextFunction): void {
    if (err instanceof ErrorNegocio) {
        res.status(err.status).json({ error: err.status === 404 ? 'Not Found' : 'Validation Error', message: err.message });
        return;
    }
    next(err);
}

function imagenValida(buf: Buffer): boolean {
    const png = buf.length > 12 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    const jpg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const webp = buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
    return png || jpg || webp;
}

// ── GET /cobro/qr — QR de cobro vigente ──────────────────────────────────────
cobroRouter.get(
    '/qr',
    authorizeRoles('Administrador', 'Directorio', 'Copropietario'),
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const filas = await prisma.configuracionGlobal.findMany({ where: { clave: { in: [KEY_QR, KEY_VIG] } } });
            const imagen = filas.find((f) => f.clave === KEY_QR)?.valor ?? null;
            const vigenteHasta = filas.find((f) => f.clave === KEY_VIG)?.valor || null;
            const puedeEditar = req.user?.rol?.toUpperCase() === 'ADMINISTRADOR';
            res.json({
                configurado: imagen !== null,
                imagen,
                vigenteHasta,
                vencido: vigenteHasta !== null && vigenteHasta < hoyLaPaz(),
                puedeEditar,
            });
        } catch (err) {
            next(err);
        }
    }
);

// ── PUT /cobro/qr — reemplaza el QR de cobro (solo Administrador) ─────────────
const qrSchema = z.object({
    imagen: z.string().min(100),
    vigenteHasta: z.string().regex(YMD).optional(),
});

cobroRouter.put(
    '/qr',
    authorizeRoles('Administrador'),
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const r = qrSchema.safeParse(req.body);
            if (!r.success) {
                res.status(400).json({ error: 'Validation Error', message: 'Datos inválidos', details: r.error.flatten().fieldErrors });
                return;
            }
            const m = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(r.data.imagen);
            if (!m) throw new ErrorNegocio(400, 'La imagen debe ser PNG, JPG o WebP');
            const buf = Buffer.from(m[1], 'base64');
            if (buf.length === 0 || buf.length > MAX_QR_BYTES) throw new ErrorNegocio(400, 'La imagen no puede superar 1,5 MB');
            if (!imagenValida(buf)) throw new ErrorNegocio(400, 'El archivo no es una imagen válida');

            const vigencia = r.data.vigenteHasta ?? '';
            await prisma.$transaction([
                prisma.configuracionGlobal.upsert({
                    where: { clave: KEY_QR },
                    update: { valor: r.data.imagen },
                    create: { clave: KEY_QR, valor: r.data.imagen, descripcion: 'Imagen del QR de cobro (data URI)' },
                }),
                prisma.configuracionGlobal.upsert({
                    where: { clave: KEY_VIG },
                    update: { valor: vigencia },
                    create: { clave: KEY_VIG, valor: vigencia, descripcion: 'Fecha límite de vigencia del QR de cobro (YYYY-MM-DD)' },
                }),
            ]);

            await auditoriaService.registrarEvento({
                tablaAfectada: 'configuracion_global',
                idRegistro: KEY_QR,
                accion: 'ACTUALIZAR_QR_COBRO',
                resultado: 'EXITO',
                datosNuevos: { vigenteHasta: r.data.vigenteHasta ?? null, bytes: buf.length },
                idUsuario: req.user?.idUsuario ?? null,
            });
            res.json({ message: 'QR de cobro actualizado' });
        } catch (err) {
            responderError(err, res, next);
        }
    }
);

// ── GET /cobro/proyeccion/:idDepartamento?fecha=&aguaMensual= — deuda a una fecha (solo lectura) ─
interface Cargo {
    tipo: 'EXISTENTE' | 'PROYECTADA';
    idExpensa: number | null;
    periodo: string;
    fechaVencimiento: string;
    capital: number;
    agua: number;
    mesesMora: number;
    mora: number;
    total: number;
}

const proyeccionQuery = z.object({
    fecha: z.string().regex(YMD).optional(),
    aguaMensual: z.coerce.number().min(0).max(100000).default(0),
});

cobroRouter.get(
    '/proyeccion/:idDepartamento',
    authorizeRoles('Administrador', 'Directorio'),
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const idDepartamento = Number(req.params.idDepartamento);
            if (!Number.isInteger(idDepartamento) || idDepartamento <= 0) throw new ErrorNegocio(400, 'ID de departamento inválido');
            const q = proyeccionQuery.safeParse(req.query);
            if (!q.success) throw new ErrorNegocio(400, 'Parámetros inválidos (fecha YYYY-MM-DD y aguaMensual numérico)');

            const hoy = hoyLaPaz();
            const fecha = q.data.fecha ?? hoy;
            const fechaD = new Date(`${fecha}T00:00:00Z`);
            if (Number.isNaN(fechaD.getTime()) || fechaD.toISOString().slice(0, 10) !== fecha) throw new ErrorNegocio(400, 'Fecha inválida');
            const tope = new Date(`${hoy}T00:00:00Z`);
            tope.setUTCMonth(tope.getUTCMonth() + 24);
            if (fechaD > tope) throw new ErrorNegocio(400, 'La fecha no puede superar 24 meses desde hoy');
            const aguaMensual = round2(q.data.aguaMensual);

            const [depto, regla, existentes, anticipos] = await Promise.all([
                prisma.departamento.findUnique({
                    where: { idDepartamento },
                    select: { numero: true, tipo: { select: { montoExpensa: true } } },
                }),
                prisma.reglaMora.findFirst({ where: { activa: true }, orderBy: { fechaCreacion: 'desc' } }),
                prisma.expensa.findMany({
                    where: { idDepartamento },
                    orderBy: { periodo: 'asc' },
                    include: {
                        pagos: { where: { anulado: false }, omit: { comprobanteUrl: true } },
                        aplicacionesAnticipos: { include: { pago: { omit: { comprobanteUrl: true } } } },
                    },
                }),
                prisma.pago.findMany({
                    where: { idDepartamento, esAnticipado: true, anulado: false, idExpensa: null },
                    select: { montoPagado: true, aplicacionesAnticipo: { select: { monto: true } } },
                }),
            ]);
            if (!depto) throw new ErrorNegocio(404, 'Departamento no encontrado');

            const cargos: Cargo[] = [];
            let ultimoPeriodo: string | null = null;

            // 1) Expensas ya emitidas con saldo, con su mora a la fecha elegida
            for (const e of existentes) {
                const periodo = e.periodo.toISOString().slice(0, 10);
                if (!ultimoPeriodo || periodo > ultimoPeriodo) ultimoPeriodo = periodo;
                if (periodo > fecha) continue;
                const capital = calcularCapitalPendiente(e);
                if (capital <= 0) continue;
                let mesesMora = 0;
                let mora = 0;
                if (regla || Number(e.tasaInteresMora || 0) > 0) {
                    const m = calcularMoraExpensa({
                        capitalPendiente: capital,
                        fechaVencimiento: e.fechaVencimiento,
                        fechaReferencia: fecha,
                        regla: regla || { tipoCalculo: 'PORCENTAJE', tasaInteres: Number(e.tasaInteresMora || 0) },
                        tasaInteresMora: Number(e.tasaInteresMora || 0),
                    });
                    mesesMora = m.mesesMora;
                    mora = m.moraAcumulada;
                }
                cargos.push({
                    tipo: 'EXISTENTE',
                    idExpensa: e.idExpensa,
                    periodo,
                    fechaVencimiento: e.fechaVencimiento.toISOString().slice(0, 10),
                    capital,
                    agua: 0,
                    mesesMora,
                    mora,
                    total: round2(capital + mora),
                });
            }

            // 2) Períodos futuros aún no emitidos (cuota del tipo + agua estimada)
            const avisos: string[] = ['No incluye cuotas extra de períodos aún no emitidos.'];
            const montoBase = depto.tipo ? Number(depto.tipo.montoExpensa) : null;
            const diaVenc = regla?.diaVencimiento ?? null;
            if (montoBase === null) {
                avisos.push('El departamento no tiene tipo asignado: no se proyectan períodos futuros.');
            } else if (!regla || diaVenc === null) {
                avisos.push('No hay una regla de mora activa con día de vencimiento: no se proyectan períodos futuros.');
            } else {
                const [uy, um] = (ultimoPeriodo ?? hoy).split('-').map(Number);
                let y = ultimoPeriodo ? (um === 12 ? uy + 1 : uy) : uy;
                let mes = ultimoPeriodo ? (um === 12 ? 1 : um + 1) : um;
                for (let i = 0; i < 36; i++) {
                    const periodo = `${y}-${dos(mes)}-01`;
                    const diasMes = new Date(Date.UTC(y, mes, 0)).getUTCDate();
                    const generacion = regla.diaGeneracion ? `${y}-${dos(mes)}-${dos(Math.min(regla.diaGeneracion, diasMes))}` : periodo;
                    if (generacion > fecha) break;
                    const capital = round2(montoBase + aguaMensual);
                    const vencimiento = calcularFechaVencimientoPeriodo(periodo, diaVenc, null);
                    const m = calcularMoraExpensa({
                        capitalPendiente: capital,
                        fechaVencimiento: vencimiento,
                        fechaReferencia: fecha,
                        regla,
                        tasaInteresMora: 0,
                    });
                    cargos.push({
                        tipo: 'PROYECTADA',
                        idExpensa: null,
                        periodo,
                        fechaVencimiento: vencimiento.toISOString().slice(0, 10),
                        capital,
                        agua: aguaMensual,
                        mesesMora: m.mesesMora,
                        mora: m.moraAcumulada,
                        total: round2(capital + m.moraAcumulada),
                    });
                    mes += 1;
                    if (mes > 12) {
                        mes = 1;
                        y += 1;
                    }
                }
                if (cargos.some((c) => c.tipo === 'PROYECTADA')) {
                    avisos.push(
                        aguaMensual > 0
                            ? `Los períodos proyectados incluyen una estimación de agua de Bs. ${aguaMensual.toFixed(2)} por mes.`
                            : 'El consumo de agua de períodos futuros aún no está registrado: indica una estimación mensual para incluirlo.'
                    );
                }
            }

            // 3) Anticipos a favor aún no aplicados
            const disponible = anticipos.reduce(
                (a, p) => a + Number(p.montoPagado) - p.aplicacionesAnticipo.reduce((s, ap) => s + Number(ap.monto), 0),
                0
            );
            const capitalTotal = round2(cargos.reduce((a, c) => a + c.capital, 0));
            const moraTotal = round2(cargos.reduce((a, c) => a + c.mora, 0));
            const anticiposAFavor = Math.max(0, round2(disponible));
            const anticiposAplicados = Math.min(anticiposAFavor, round2(capitalTotal + moraTotal));
            const ultima = existentes.length > 0 ? existentes[existentes.length - 1] : null;

            res.json({
                idDepartamento,
                departamentoNumero: depto.numero,
                fecha,
                cargos,
                anticiposAFavor,
                aguaSugerida: ultima ? Number(ultima.montoAgua) : null,
                totales: {
                    capital: capitalTotal,
                    mora: moraTotal,
                    anticipos: anticiposAplicados,
                    totalAPagar: Math.max(0, round2(capitalTotal + moraTotal - anticiposAplicados)),
                },
                avisos,
            });
        } catch (err) {
            responderError(err, res, next);
        }
    }
);// ── GET /cobro/pagadores/:idDepartamento — propietario y ocupantes vigentes ──
cobroRouter.get(
    '/pagadores/:idDepartamento',
    authorizeRoles('Administrador', 'Directorio'),
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const idDepartamento = Number(req.params.idDepartamento);
            if (!Number.isInteger(idDepartamento) || idDepartamento <= 0) throw new ErrorNegocio(400, 'ID de departamento inválido');
            const hoy = new Date(`${hoyLaPaz()}T00:00:00Z`);
            const depto = await prisma.departamento.findUnique({
                where: { idDepartamento },
                select: {
                    propietario: { select: { idPersona: true, nombres: true, apellidos: true } },
                    ocupantes: {
                        where: { OR: [{ fechaFin: null }, { fechaFin: { gte: hoy } }] },
                        select: { tipoOcupante: true, persona: { select: { idPersona: true, nombres: true, apellidos: true } } },
                    },
                },
            });
            if (!depto) throw new ErrorNegocio(404, 'Departamento no encontrado');

            const vistos = new Set<number>();
            const pagadores: { idPersona: number; nombre: string; rol: 'Propietario' | 'Ocupante' }[] = [];
            const agregar = (p: { idPersona: number; nombres: string; apellidos: string | null }, rol: 'Propietario' | 'Ocupante'): void => {
                if (vistos.has(p.idPersona)) return;
                vistos.add(p.idPersona);
                pagadores.push({ idPersona: p.idPersona, nombre: `${p.nombres} ${p.apellidos ?? ''}`.trim(), rol });
            };
            if (depto.propietario) agregar(depto.propietario, 'Propietario');
            for (const o of depto.ocupantes) agregar(o.persona, o.tipoOcupante === 'Propietario' ? 'Propietario' : 'Ocupante');
            pagadores.sort((a, b) => (a.rol === b.rol ? 0 : a.rol === 'Propietario' ? -1 : 1));

            res.json({ pagadores });
        } catch (err) {
            responderError(err, res, next);
        }
    }
);

// ── GET /cobro/comprobante/:idPago — imagen del comprobante de un pago ──
cobroRouter.get(
    '/comprobante/:idPago',
    authorizeRoles('Administrador', 'Directorio'),
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const idPago = Number(req.params.idPago);
            if (!Number.isInteger(idPago) || idPago <= 0) throw new ErrorNegocio(400, 'ID de pago inválido');
            const pago = await prisma.pago.findUnique({ where: { idPago }, select: { comprobanteUrl: true } });
            if (!pago || !pago.comprobanteUrl) throw new ErrorNegocio(404, 'El pago no tiene comprobante');
            res.json({ imagen: pago.comprobanteUrl });
        } catch (err) {
            responderError(err, res, next);
        }
    }
);