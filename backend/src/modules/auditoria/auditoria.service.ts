//-----------------------------Giovani Quiroz------------------------
// backend/src/modules/auditoria/auditoria.service.ts
// Lógica de negocio para registro y consulta de auditoría de eventos (CA08, CA10)

import { Auditoria } from '@edificio-xyz/database';
import { auditoriaRepository, AuditoriaRepository } from './auditoria.repository';
import {
  FiltrosAuditoria,
  DetalleAuditoriaDTO,
  RespuestaPaginadaAuditoria,
  RegistrarAuditoriaParams,
  ResultadoAuditoria,
  TipoEventoAuditoria,
} from './auditoria.types';
import { enmascararDatosSensibles } from './auditoria.mask';

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

  /**
   * Consulta paginada y filtrada de auditoría con enmascaramiento de datos sensibles
   */
  async consultarAuditoria(filtros: FiltrosAuditoria): Promise<RespuestaPaginadaAuditoria> {
    const page = Math.max(1, Number(filtros.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filtros.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filtros.tablaAfectada) {
      where.tablaAfectada = {
        equals: filtros.tablaAfectada,
        mode: 'insensitive',
      };
    }

    if (filtros.accion) {
      where.accion = {
        equals: filtros.accion,
        mode: 'insensitive',
      };
    }

    if (filtros.idUsuario !== undefined && filtros.idUsuario !== null && !isNaN(Number(filtros.idUsuario))) {
      where.idUsuario = Number(filtros.idUsuario);
    }

    if (filtros.idRegistro) {
      where.idRegistro = String(filtros.idRegistro);
    }

    if (filtros.resultado) {
      where.resultado = {
        equals: filtros.resultado,
        mode: 'insensitive',
      };
    }

    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.fechaHora = {};
      if (filtros.fechaDesde) {
        where.fechaHora.gte = new Date(filtros.fechaDesde + 'T00:00:00.000Z');
      }
      if (filtros.fechaHasta) {
        where.fechaHora.lte = new Date(filtros.fechaHasta + 'T23:59:59.999Z');
      }
    }

    const { items, total } = await this.repository.findPaginado({
      where,
      skip,
      take: limit,
    });

    const data: DetalleAuditoriaDTO[] = items.map((item) => ({
      idAuditoria: Number(item.idAuditoria),
      tablaAfectada: item.tablaAfectada,
      idRegistro: item.idRegistro,
      accion: item.accion,
      resultado: item.resultado,
      fechaHora: item.fechaHora,
      idUsuario: item.idUsuario,
      usuario: item.usuario
        ? {
            idUsuario: item.usuario.idUsuario,
            nombreUsuario: item.usuario.nombreUsuario,
            correo: item.usuario.correo,
            rol: item.usuario.rol?.nombre,
          }
        : null,
      datosAnteriores: enmascararDatosSensibles(item.datosAnteriores),
      datosNuevos: enmascararDatosSensibles(item.datosNuevos),
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Obtiene el detalle de un registro específico de auditoría con enmascaramiento
   */
  async obtenerDetalle(idAuditoria: number): Promise<DetalleAuditoriaDTO | null> {
    const item = await this.repository.findById(idAuditoria);
    if (!item) return null;

    return {
      idAuditoria: Number(item.idAuditoria),
      tablaAfectada: item.tablaAfectada,
      idRegistro: item.idRegistro,
      accion: item.accion,
      resultado: item.resultado,
      fechaHora: item.fechaHora,
      idUsuario: item.idUsuario,
      usuario: item.usuario
        ? {
            idUsuario: item.usuario.idUsuario,
            nombreUsuario: item.usuario.nombreUsuario,
            correo: item.usuario.correo,
            rol: item.usuario.rol?.nombre,
          }
        : null,
      datosAnteriores: enmascararDatosSensibles(item.datosAnteriores),
      datosNuevos: enmascararDatosSensibles(item.datosNuevos),
    };
  }
}

export const auditoriaService = new AuditoriaService();
