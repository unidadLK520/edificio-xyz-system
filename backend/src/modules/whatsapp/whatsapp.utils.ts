// backend/src/modules/whatsapp/whatsapp.utils.ts
// Utilidades del canal WhatsApp: teléfonos, mensaje y pausas

/**
 * Normaliza a formato internacional sin '+' (ej. 59157759028).
 * Bolivia: celulares de 8 dígitos que empiezan con 5, 6 o 7.
 * Devuelve null si el número no es utilizable.
 */
export function normalizarTelefono(raw: string | null | undefined): string | null {
    let n = (raw || '').replace(/\D/g, '');
    if (n.startsWith('00')) n = n.slice(2);
    if (/^[567]\d{7}$/.test(n)) return `591${n}`;
    if (/^591[567]\d{7}$/.test(n)) return n;
    if (n.length >= 10 && n.length <= 15 && !n.startsWith('591')) return n;
    return null;
}

/** Enmascara un teléfono para logs y respuestas (***9028). */
export function enmascararTelefono(tel: string): string {
    return tel.length > 4 ? `***${tel.slice(-4)}` : '***';
}

/** Mensaje de WhatsApp: mismo contenido que el correo. */
export function construirMensajeWhatsapp(titulo: string, contenido: string): string {
    return `🏢 *Edificio XYZ — Comunicado Oficial*\n\n*${titulo.trim()}*\n\n${contenido.trim()}\n\n_Emitido por la Administración del Edificio XYZ. Por favor no responda a este mensaje._`;
}

/** Pausa aleatoria entre mensajes (ms). Configurable por variables de entorno. */
export function leerPausaMs(): number {
    const min = Math.max(1000, Number(process.env.WHATSAPP_PAUSA_MIN_MS) || 3000);
    const max = Math.max(min, Number(process.env.WHATSAPP_PAUSA_MAX_MS) || 8000);
    return min + Math.floor(Math.random() * (max - min + 1));
}

export function dormir(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Seguro de envío. Por defecto (WHATSAPP_MODE sin definir o distinto de 'real') solo se
 * envía a los números de WHATSAPP_TEST_NUMBERS (separados por coma). Con 'real' se envía a todos.
 */
export function numeroPermitido(tel: string): boolean {
    if ((process.env.WHATSAPP_MODE || '').trim().toLowerCase() === 'real') return true;
    const lista = (process.env.WHATSAPP_TEST_NUMBERS || '')
        .split(',')
        .map((s) => normalizarTelefono(s.trim()))
        .filter((x): x is string => !!x);
    return lista.includes(tel);
}