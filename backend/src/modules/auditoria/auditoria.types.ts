//-----------------------------Giovani Quiroz------------------------
// backend/src/modules/auditoria/auditoria.types.ts
// Tipos y catálogo de eventos de auditoría (CA08, CA10)

import { Prisma } from '@edificio-xyz/database';

export enum TipoEventoAuditoria {
  LOGIN_EXITOSO = 'LOGIN_EXITOSO',
  LOGIN_FALLIDO = 'LOGIN_FALLIDO',
  USUARIO_BLOQUEADO = 'USUARIO_BLOQUEADO',
  LOGOUT = 'LOGOUT',
  USUARIO_MODIFICADO = 'USUARIO_MODIFICADO',
  SESION_RECHAZADA = 'SESION_RECHAZADA',
  SESION_FORZADA = 'SESION_FORZADA',
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
  tx?: Prisma.TransactionClient;
}

export interface FiltrosAuditoria {
  tablaAfectada?: string;
  accion?: string;
  idUsuario?: number;
  idRegistro?: string;
  resultado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  limit?: number;
}

export interface DetalleAuditoriaDTO {
  idAuditoria: number;
  tablaAfectada: string;
  idRegistro: string | null;
  accion: string;
  resultado: string | null;
  fechaHora: Date;
  idUsuario: number | null;
  usuario?: {
    idUsuario: number;
    nombreUsuario: string;
    correo: string;
    rol?: string;
  } | null;
  datosAnteriores: any;
  datosNuevos: any;
}

export interface RespuestaPaginadaAuditoria {
  data: DetalleAuditoriaDTO[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
