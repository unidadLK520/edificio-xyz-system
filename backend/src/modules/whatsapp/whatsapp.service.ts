// backend/src/modules/whatsapp/whatsapp.service.ts
// Conexión a WhatsApp (vía Baileys, no oficial) y envío de texto.
// WHATSAPP_PROVIDER=baileys solo en Render. En local déjalo sin definir:
// el backend local usa la misma BD y dos instancias con la misma sesión se expulsan entre sí.

import { prisma } from '@edificio-xyz/database';
import { usarEstadoAuthBD } from './whatsapp.auth';
import type { AuthBD } from './whatsapp.auth';
import { enmascararTelefono } from './whatsapp.utils';

export type EstadoWhatsapp =
    | 'deshabilitado'
    | 'desconectado'
    | 'conectando'
    | 'esperando_codigo'
    | 'conectado';

export interface EstadoWhatsappInfo {
    proveedor: string;
    estado: EstadoWhatsapp;
    vinculado: boolean;
    numero: string | null;
    ultimoError: string | null;
}

export type ResultadoEnvio =
    | { ok: true }
    | { ok: false; error: string; temporal: boolean; limite: boolean };

// Baileys es solo ESM y este backend es CommonJS: import dinámico nativo.
const importarEsm = new Function('m', 'return import(m)') as (m: string) => Promise<any>;

const silentLogger: any = {
    level: 'silent',
    child() {
        return silentLogger;
    },
    trace() { },
    debug() { },
    info() { },
    warn() { },
    error() { },
};

function limpiarMensajeError(err: any): string {
    return String(err?.message || err || 'Error desconocido')
        .replace(/\d{8,}/g, '***')
        .slice(0, 120);
}

class WhatsappService {
    private lib: any = null;
    private auth: AuthBD | null = null;
    private sock: any = null;
    private estado: EstadoWhatsapp = 'desconectado';
    private conectando = false;
    private intentos = 0;
    private reconexion: ReturnType<typeof setTimeout> | null = null;
    private ultimoError: string | null = null;
    private pendienteCodigo: {
        telefono: string;
        pedido: boolean;
        ok: (codigo: string) => void;
        fallo: (err: Error) => void;
    } | null = null;

    habilitado(): boolean {
        return (process.env.WHATSAPP_PROVIDER || '').trim().toLowerCase() === 'baileys';
    }

    estaConectado(): boolean {
        return this.estado === 'conectado' && !!this.sock;
    }

    private async cargarLib(): Promise<any> {
        if (!this.lib) this.lib = await importarEsm('@whiskeysockets/baileys');
        return this.lib;
    }

    /** Se llama una vez al arrancar el servidor. Solo reconecta si ya hay un número vinculado. */
    async iniciar(): Promise<void> {
        if (!this.habilitado()) {
            this.estado = 'deshabilitado';
            return;
        }
        try {
            const lib = await this.cargarLib();
            this.auth = await usarEstadoAuthBD(lib);
            if (this.auth.state.creds?.me?.id) await this.conectar();
            else this.estado = 'desconectado';
        } catch (err: any) {
            this.ultimoError = limpiarMensajeError(err);
            this.estado = 'desconectado';
            console.error('[WHATSAPP] No se pudo iniciar:', this.ultimoError);
        }
    }

    private async conectar(): Promise<void> {
        if (this.conectando) return;
        this.conectando = true;
        try {
            const lib = await this.cargarLib();
            if (!this.auth) this.auth = await usarEstadoAuthBD(lib);

            let version: number[] | undefined;
            try {
                version = (await lib.fetchLatestBaileysVersion()).version;
            } catch {
                version = undefined;
            }

            const fabrica = typeof lib.default === 'function' ? lib.default : lib.makeWASocket;
            const sock = fabrica({
                auth: this.auth.state,
                ...(version ? { version } : {}),
                logger: silentLogger,
                browser: lib.Browsers.ubuntu('Chrome'),
                markOnlineOnConnect: false,
                syncFullHistory: false,
            });

            const auth = this.auth;
            this.sock = sock;
            this.estado = 'conectando';
            sock.ev.on('creds.update', () => {
                void auth.guardarCreds();
            });
            sock.ev.on('connection.update', (u: any) => {
                void this.alActualizar(sock, u);
            });
        } finally {
            this.conectando = false;
        }
    }

    private async alActualizar(sock: any, u: any): Promise<void> {
        if (sock !== this.sock) return; // evento de un socket viejo

        const { connection, lastDisconnect, qr } = u;

        // Al aparecer el "qr" el socket está listo para pedir el código de emparejamiento
        if (qr && this.pendienteCodigo && !this.pendienteCodigo.pedido) {
            const p = this.pendienteCodigo;
            p.pedido = true;
            try {
                const codigo = await sock.requestPairingCode(p.telefono);
                this.estado = 'esperando_codigo';
                this.pendienteCodigo = null;
                p.ok(codigo);
            } catch (err: any) {
                this.pendienteCodigo = null;
                p.fallo(new Error(limpiarMensajeError(err)));
            }
        }

        if (connection === 'open') {
            this.estado = 'conectado';
            this.intentos = 0;
            this.ultimoError = null;
            await this.auth?.volcarTodo();
            console.log('[WHATSAPP] Sesión conectada');
            return;
        }

        if (connection === 'close') {
            const codigo = (lastDisconnect?.error as any)?.output?.statusCode;
            const DR = this.lib?.DisconnectReason || {};
            this.sock = null;

            if (this.pendienteCodigo) {
                const p = this.pendienteCodigo;
                this.pendienteCodigo = null;
                p.fallo(new Error('La conexión se cerró antes de generar el código'));
            }

            if (codigo === DR.loggedOut) {
                await this.borrarSesion();
                this.estado = 'desconectado';
                this.ultimoError = 'La sesión fue cerrada desde el celular';
                return;
            }
            if (codigo === DR.connectionReplaced) {
                this.estado = 'desconectado';
                this.ultimoError = 'La sesión se abrió en otro servidor';
                return;
            }
            // Sin número vinculado no tiene sentido reconectar en bucle
            if (!this.auth?.state.creds?.me?.id) {
                this.estado = 'desconectado';
                return;
            }

            // 515 = reinicio normal tras vincular; el resto, espera creciente hasta 30 s
            const espera =
                codigo === DR.restartRequired ? 500 : Math.min(30000, 2000 * 2 ** this.intentos);
            this.intentos++;
            this.estado = 'conectando';
            this.programarReconexion(espera);
        }
    }

    private programarReconexion(ms: number): void {
        if (this.reconexion) clearTimeout(this.reconexion);
        this.reconexion = setTimeout(() => {
            this.reconexion = null;
            this.conectar().catch((err: any) => {
                this.ultimoError = limpiarMensajeError(err);
                this.estado = 'conectando';
                this.programarReconexion(Math.min(30000, 2000 * 2 ** this.intentos++));
            });
        }, ms);
    }

    private async cerrarSocket(): Promise<void> {
        if (this.reconexion) {
            clearTimeout(this.reconexion);
            this.reconexion = null;
        }
        const s = this.sock;
        this.sock = null;
        if (s) {
            try {
                s.end(undefined);
            } catch {
                // ignorar
            }
        }
        this.estado = 'desconectado';
    }

    private async borrarSesion(): Promise<void> {
        if (this.auth) await this.auth.limpiar();
        else await prisma.whatsappSesion.deleteMany({});
        this.auth = null;
    }

    /** Devuelve el código de 8 caracteres que se escribe en el celular (Dispositivos vinculados). */
    async solicitarCodigoVinculacion(telefono: string): Promise<string> {
        if (!this.habilitado()) {
            throw new Error('WHATSAPP_PROVIDER no está configurado como baileys en este servidor');
        }
        if (this.estado === 'conectado') {
            throw new Error('Ya hay un número vinculado; desvincúlalo antes de vincular otro');
        }
        if (this.pendienteCodigo) throw new Error('Ya hay una solicitud de código en curso');

        await this.cerrarSocket();
        await this.borrarSesion();

        return new Promise<string>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendienteCodigo = null;
                void this.cerrarSocket();
                reject(new Error('Tiempo de espera agotado generando el código'));
            }, 30000);

            this.pendienteCodigo = {
                telefono,
                pedido: false,
                ok: (codigo) => {
                    clearTimeout(timer);
                    resolve(codigo);
                },
                fallo: (err) => {
                    clearTimeout(timer);
                    reject(err);
                },
            };

            this.conectar().catch((err: any) => {
                this.pendienteCodigo = null;
                clearTimeout(timer);
                reject(new Error(limpiarMensajeError(err)));
            });
        });
    }

    async desvincular(): Promise<void> {
        const s = this.sock;
        if (s && this.estado === 'conectado') {
            try {
                await s.logout();
            } catch {
                // si falla, igual se limpia la sesión local
            }
        }
        await this.cerrarSocket();
        await this.borrarSesion();
        this.ultimoError = null;
    }

    /** Cierre ordenado (SIGTERM en Render): guarda la sesión pendiente. */
    async detener(): Promise<void> {
        await this.cerrarSocket();
        await this.auth?.volcarTodo();
    }

    estadoActual(): EstadoWhatsappInfo {
        const id: string | undefined = this.auth?.state.creds?.me?.id;
        const numero = id ? id.split(':')[0].split('@')[0] : null;
        return {
            proveedor: this.habilitado() ? 'baileys' : 'none',
            estado: this.habilitado() ? this.estado : 'deshabilitado',
            vinculado: !!id,
            numero: numero ? enmascararTelefono(numero) : null,
            ultimoError: this.ultimoError,
        };
    }

    /** Envía un texto a un teléfono ya normalizado (ej. 59157759028). */
    async enviarTexto(telefono: string, texto: string): Promise<ResultadoEnvio> {
        if (!this.estaConectado()) {
            return { ok: false, error: 'WhatsApp desconectado', temporal: true, limite: false };
        }
        try {
            const res = await this.sock.onWhatsApp(`${telefono}@s.whatsapp.net`);
            const info = Array.isArray(res) ? res[0] : null;
            if (!info?.exists) {
                return { ok: false, error: 'El número no tiene WhatsApp', temporal: false, limite: false };
            }
            await this.sock.sendMessage(info.jid, { text: texto });
            return { ok: true };
        } catch (err: any) {
            const msg = limpiarMensajeError(err);
            const limite = /rate-overlimit|too many|429/i.test(msg);
            const temporal = limite || /closed|timed out|timeout|not open|ECONN|ETIMEDOUT/i.test(msg);
            return { ok: false, error: msg, temporal, limite };
        }
    }
}

export const whatsappService = new WhatsappService();