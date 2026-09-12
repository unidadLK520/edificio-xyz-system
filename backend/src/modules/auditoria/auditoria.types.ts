// backend/src/modules/auditoria/auditoria.types.ts
// Tipos y catálogo de eventos de auditoría (CA08, CA10)

export enum TipoEventoAuditoria {
  LOGIN_EXITOSO = 'LOGIN_EXITOSO',
  LOGIN_FALLIDO = 'LOGIN_FALLIDO',
  USUARIO_BLOQUEADO = 'USUARIO_BLOQUEADO',
  LOGOUT = 'LOGOUT',
  USUARIO_MODIFICADO = 'USUARIO_MODIFICADO',
}

export type ResultadoAuditoria =
  | 'EXITO'
  | 'CREDENCIALES_INVALIDAS'
  | 'USUARIO_INACTIVO'
  | 'CUENTA_BLOQUEADA'
  | 'BLOQUEO_TEMPORAL'
  | 'FALLO';

export interface RegistrarAuditoriaParams {
  tablaAfectada?: string;
  idRegistro?: string | null;
  accion: TipoEventoAuditoria | string;
  resultado?: ResultadoAuditoria | string | null;
  datosAnteriores?: Record<string, any> | null;
  datosNuevos?: Record<string, any> | null;
  idUsuario?: number | null;
}
