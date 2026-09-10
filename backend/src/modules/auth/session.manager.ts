// backend/src/modules/auth/session.manager.ts
// Gestión de sesiones en memoria: lista negra de tokens revocados y control de inactividad

interface SessionActivity {
  lastActivity: number;
}

export class SessionManager {
  // Lista negra de tokens revocados (ej. por logout)
  private blacklist: Set<string> = new Set();

  // Registro de última actividad: token -> timestamp ms
  private activityMap: Map<string, SessionActivity> = new Map();

  /**
   * Invalida un token añadiéndolo a la lista negra
   */
  blacklistToken(token: string): void {
    this.blacklist.add(token);
    this.activityMap.delete(token);
  }

  /**
   * Verifica si un token está en la lista negra
   */
  isTokenBlacklisted(token: string): boolean {
    return this.blacklist.has(token);
  }

  /**
   * Registra o actualiza la última actividad del token
   */
  recordActivity(token: string): void {
    this.activityMap.set(token, { lastActivity: Date.now() });
  }

  /**
   * Permite establecer manualmente la última actividad (útil para pruebas)
   */
  setLastActivity(token: string, timestamp: number): void {
    this.activityMap.set(token, { lastActivity: timestamp });
  }

  /**
   * Verifica si una sesión ha expirado por inactividad
   */
  isSessionIdle(token: string, timeoutMinutes: number): boolean {
    const session = this.activityMap.get(token);
    if (!session) {
      // Si no tiene registro de actividad previa, se registrará al validar
      return false;
    }

    const elapsedMinutes = (Date.now() - session.lastActivity) / (1000 * 60);
    return elapsedMinutes > timeoutMinutes;
  }

  /**
   * Limpia registros en memoria (útil para tests)
   */
  clear(): void {
    this.blacklist.clear();
    this.activityMap.clear();
  }
}

export const sessionManager = new SessionManager();
