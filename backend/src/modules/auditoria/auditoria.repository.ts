// backend/src/modules/auditoria/auditoria.repository.ts
// Acceso a datos para persistencia de eventos de auditoría

import { prisma, Auditoria } from '@edificio-xyz/database';
import { RegistrarAuditoriaParams } from './auditoria.types';

export class AuditoriaRepository {
  async crear(params: RegistrarAuditoriaParams): Promise<Auditoria> {
    return prisma.auditoria.create({
      data: {
        tablaAfectada: params.tablaAfectada || 'usuarios',
        idRegistro: params.idRegistro ?? (params.idUsuario ? String(params.idUsuario) : null),
        accion: params.accion,
        resultado: params.resultado ?? null,
        datosAnteriores: params.datosAnteriores ?? undefined,
        datosNuevos: params.datosNuevos ?? undefined,
        idUsuario: params.idUsuario ?? null,
        fechaHora: new Date(),
      },
    });
  }

  async findByUsuario(idUsuario: number, limit = 50): Promise<Auditoria[]> {
    return prisma.auditoria.findMany({
      where: { idUsuario },
      orderBy: { fechaHora: 'desc' },
      take: limit,
    });
  }

  async findRecientes(limit = 100): Promise<Auditoria[]> {
    return prisma.auditoria.findMany({
      orderBy: { fechaHora: 'desc' },
      take: limit,
    });
  }
}

export const auditoriaRepository = new AuditoriaRepository();
