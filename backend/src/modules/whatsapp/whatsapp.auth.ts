// backend/src/modules/whatsapp/whatsapp.auth.ts
// Estado de autenticación de WhatsApp guardado en Supabase (tabla whatsapp_sesion).
// Render gratis no tiene disco persistente: sin esto cada reinicio pediría vincular de nuevo.
// Las escrituras se agrupan cada 2 s (una sola consulta) para no cargar la conexión a la BD.

import { prisma } from '@edificio-xyz/database';

const MAX_CLAVE = 200;
const VOLCADO_MS = 2000;

export interface AuthBD {
    state: { creds: any; keys: any };
    guardarCreds: () => Promise<void>;
    volcarTodo: () => Promise<void>;
    limpiar: () => Promise<void>;
}

export async function usarEstadoAuthBD(lib: any): Promise<AuthBD> {
    const { BufferJSON, initAuthCreds, proto } = lib;

    const cache = new Map<string, string>();
    let pendientes = new Map<string, string | null>();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let volcando = false;

    const filas = await prisma.whatsappSesion.findMany({ select: { clave: true, valor: true } });
    for (const f of filas) cache.set(f.clave, f.valor);

    const credsRaw = cache.get('creds');
    const creds = credsRaw ? JSON.parse(credsRaw, BufferJSON.reviver) : initAuthCreds();

    const programar = () => {
        if (timer) return;
        timer = setTimeout(() => {
            timer = null;
            void volcar();
        }, VOLCADO_MS);
    };

    async function volcar(): Promise<void> {
        if (volcando || pendientes.size === 0) return;
        volcando = true;
        const lote = pendientes;
        pendientes = new Map();
        try {
            const claves: string[] = [];
            const valores: string[] = [];
            const borrar: string[] = [];
            for (const [k, v] of lote) {
                if (v === null) borrar.push(k);
                else {
                    claves.push(k);
                    valores.push(v);
                }
            }
            if (claves.length > 0) {
                await prisma.$executeRaw`
          INSERT INTO edificio.whatsapp_sesion (clave, valor, actualizado_en)
          SELECT t.clave, t.valor, now()
          FROM unnest(${claves}::text[], ${valores}::text[]) AS t(clave, valor)
          ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = now()`;
            }
            if (borrar.length > 0) {
                await prisma.whatsappSesion.deleteMany({ where: { clave: { in: borrar } } });
            }
        } catch (err: any) {
            console.error('[WHATSAPP] No se pudo guardar la sesión:', String(err?.message || err).slice(0, 150));
            for (const [k, v] of lote) if (!pendientes.has(k)) pendientes.set(k, v);
        } finally {
            volcando = false;
            if (pendientes.size > 0) programar();
        }
    }

    const keys = {
        get: async (tipo: string, ids: string[]) => {
            const data: Record<string, any> = {};
            for (const id of ids) {
                const raw = cache.get(`${tipo}-${id}`);
                if (!raw) continue;
                let valor = JSON.parse(raw, BufferJSON.reviver);
                if (tipo === 'app-state-sync-key' && valor) {
                    valor = proto.Message.AppStateSyncKeyData.fromObject(valor);
                }
                data[id] = valor;
            }
            return data;
        },
        set: async (data: Record<string, Record<string, any>>) => {
            for (const tipo of Object.keys(data)) {
                for (const id of Object.keys(data[tipo])) {
                    const clave = `${tipo}-${id}`;
                    const valor = data[tipo][id];
                    if (valor) {
                        const json = JSON.stringify(valor, BufferJSON.replacer);
                        cache.set(clave, json);
                        if (clave.length <= MAX_CLAVE) pendientes.set(clave, json);
                    } else {
                        cache.delete(clave);
                        if (clave.length <= MAX_CLAVE) pendientes.set(clave, null);
                    }
                }
            }
            programar();
        },
    };

    const esperarVolcado = async () => {
        while (volcando) await new Promise((r) => setTimeout(r, 50));
    };

    return {
        state: { creds, keys },
        guardarCreds: async () => {
            const json = JSON.stringify(creds, BufferJSON.replacer);
            cache.set('creds', json);
            pendientes.set('creds', json);
            programar();
        },
        volcarTodo: async () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            await esperarVolcado();
            await volcar();
        },
        limpiar: async () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            pendientes = new Map();
            cache.clear();
            await esperarVolcado();
            await prisma.whatsappSesion.deleteMany({});
        },
    };
}