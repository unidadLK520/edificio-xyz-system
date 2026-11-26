// Types for Whatsapp module
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
