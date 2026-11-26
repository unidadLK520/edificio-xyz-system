// Helper utilities for Whatsapp module
export const silentLogger: any = {
    level: 'silent',
    child() { return silentLogger; },
    trace() {},
    debug() {},
    info() {},
    warn() {},
    error() {},
};

export function limpiarMensajeError(err: any): string {
    return String(err?.message || err || 'Error desconocido')
        .replace(/\\d{8,}/g, '***')
        .slice(0, 120);
}

/** Schedule a reconnection attempt */
export function programarReconexionHelper(service: any, ms: number): void {
    if (service.reconexion) clearTimeout(service.reconexion);
    service.reconexion = setTimeout(() => {
        service.reconexion = null;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        (service as any).conectar().catch((err: any) => {
            service.ultimoError = limpiarMensajeError(err);
            service.estado = 'conectando';
            programarReconexionHelper(service, Math.min(30000, 2000 * 2 ** service.intentos++));
        });
    }, ms);
}

/** Close the socket gracefully */
export async function cerrarSocketHelper(service: any): Promise<void> {
    if (service.reconexion) {
        clearTimeout(service.reconexion);
        service.reconexion = null;
    }
    const s = service.sock;
    service.sock = null;
    if (s) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            s.end(undefined);
        } catch {
            // ignore errors
        }
    }
    service.estado = 'desconectado';
}

/** Delete session from DB and clear auth */
export async function borrarSesionHelper(service: any): Promise<void> {
    if (service.auth) await service.auth.limpiar();
    else await service.prisma.whatsappSesion.deleteMany({});
    service.auth = null;
}
