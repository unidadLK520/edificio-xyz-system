// backend/src/modules/auditoria/auditoria.service.ts
// Lógica de negocio para registro y consulta de auditoría de eventos (CA08, CA10)

import { Auditoria } from '@edificio-xyz/database';
import { auditoriaRepository, AuditoriaRepository } from './auditoria.repository';
import { RegistrarAuditoriaParams, ResultadoAuditoria, TipoEventoAuditoria } from './auditoria.types';

export class AuditoriaService {
  constructor(private readonly repository: AuditoriaRepository = auditoriaRepository) {}

  /**
   * Registra un inicio de sesión exitoso (CA08)
   */
  async registrarLoginExitoso(
    idUsuario: number,
    metadata: { correo: string; rol: string; ip?: string; userAgent?: string }
  ): Promise<Auditoria> {
    return this.repository.crear({
      tablaAfectada: 'usuarios',
      idRegistro: String(idUsuario),
      accion: TipoEventoAuditoria.LOGIN_EXITOSO,
      resultado: 'EXITO',
      idUsuario,
      datosNuevos: {
        correo: metadata.correo,
        rol: metadata.rol,
        ip: metadata.ip,
        userAgent: metadata.userAgent,
      },
    });
  }

  /**
   * Registra un intento de inicio de sesión fallido (CA08, CA02, CA03)
   */
  async registrarLoginFallido(
    idUsuario: number | null,
    metadata: {
      correo: string;
      motivo: string;
      resultado?: ResultadoAuditoria;
      intentos?: number;
      ip?: string;
      userAgent?: string;
    }
  ): Promise<Auditoria> {
    return this.repository.crear({
      tablaAfectada: 'usuarios',
      idRegistro: idUsuario ? String(idUsuario) : null,
      accion: TipoEventoAuditoria.LOGIN_FALLIDO,
      resultado: metadata.resultado || 'CREDENCIALES_INVALIDAS',
      idUsuario,
      datosNuevos: {
        correo: metadata.correo,
        motivo: metadata.motivo,
        intentos: metadata.intentos,
        ip: metadata.ip,
        userAgent: metadata.userAgent,
      },
    });
  }

  /**
   * Registra la activación del bloqueo temporal de 10 minutos al 3er intento fallido (CA07, CA10)
   */
  async registrarBloqueoTemporal(
    idUsuario: number,
    metadata: {
      correo: string;
      bloqueadoHasta: Date;
      ip?: string;
      userAgent?: string;
    }
  ): Promise<Auditoria> {
    return this.repository.crear({
      tablaAfectada: 'usuarios',
      idRegistro: String(idUsuario),
      accion: TipoEventoAuditoria.USUARIO_BLOQUEADO,
      resultado: 'BLOQUEO_TEMPORAL',
      idUsuario,
      datosNuevos: {
        correo: metadata.correo,
        intentos: 3,
        bloqueadoHasta: metadata.bloqueadoHasta.toISOString(),
        duracionMinutos: 10,
        ip: metadata.ip,
        userAgent: metadata.userAgent,
      },
    });
  }

  /**
   * Registra el cierre de sesión voluntario de un usuario (CA08)
   */
  async registrarLogout(
    idUsuario: number | null,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<Auditoria> {
    return this.repository.crear({
      tablaAfectada: 'usuarios',
      idRegistro: idUsuario ? String(idUsuario) : null,
      accion: TipoEventoAuditoria.LOGOUT,
      resultado: 'EXITO',
      idUsuario,
      datosNuevos: {
        ip: metadata?.ip,
        userAgent: metadata?.userAgent,
      },
    });
  }

  /**
   * Registra modificaciones sobre usuarios: activar, desactivar o asignar roles (CA10, preparado para Pieza 6)
   */
  async registrarCambioUsuario(
    idOperador: number,
    idAfectado: number,
    tipoCambio: 'ACTIVAR' | 'DESACTIVAR' | 'ASIGNAR_ROL' | string,
    datosAnteriores?: Record<string, any>,
    datosNuevos?: Record<string, any>,
    resultado: ResultadoAuditoria = 'EXITO'
  ): Promise<Auditoria> {
    return this.repository.crear({
      tablaAfectada: 'usuarios',
      idRegistro: String(idAfectado),
      accion: TipoEventoAuditoria.USUARIO_MODIFICADO,
      resultado,
      idUsuario: idOperador,
      datosAnteriores: datosAnteriores ?? null,
      datosNuevos: {
        tipoCambio,
        ...datosNuevos,
      },
    });
  }

  /**
   * Registro genérico de auditoría
   */
  async registrarEvento(params: RegistrarAuditoriaParams): Promise<Auditoria> {
    return this.repository.crear(params);
  }
}

export const auditoriaService = new AuditoriaService();
