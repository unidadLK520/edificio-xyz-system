//-----------------------------Giovani Quiroz------------------------
// backend/src/modules/auditoria/auditoria.repository.ts
// Acceso a datos para persistencia de eventos de auditoría

import { prisma, Auditoria } from '@edificio-xyz/database';
import { RegistrarAuditoriaParams } from './auditoria.types';

export class AuditoriaRepository {
  async crear(params: RegistrarAuditoriaParams): Promise<Auditoria> {
    const client = params.tx || prisma;
    const safeJson = (val: any) => {
      if (val === undefined || val === null) return undefined;
      try {
        return JSON.parse(JSON.stringify(val));
      } catch (err) {
        console.warn(
          `[AuditoriaRepository] Error serializando JSON para tabla "${params.tablaAfectada}", acción "${params.accion}":`,
          err
        );
        return undefined;
      }
    };

    return client.auditoria.create({
      data: {
        tablaAfectada: params.tablaAfectada || 'usuarios',
        idRegistro: params.idRegistro ?? (params.idUsuario ? String(params.idUsuario) : null),
        accion: params.accion,
        resultado: params.resultado ?? null,
        datosAnteriores: safeJson(params.datosAnteriores),
        datosNuevos: safeJson(params.datosNuevos),
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

  async findPaginado(filtros: {
    where: any;
    skip: number;
    take: number;
  }): Promise<{ items: any[]; total: number }> {
    const [total, items] = await Promise.all([
      prisma.auditoria.count({ where: filtros.where }),
      prisma.auditoria.findMany({
        where: filtros.where,
        orderBy: { fechaHora: 'desc' },
        skip: filtros.skip,
        take: filtros.take,
        include: {
          usuario: {
            select: {
              idUsuario: true,
              nombreUsuario: true,
              correo: true,
              rol: {
                select: {
                  idRol: true,
                  nombre: true,
                },
              },
            },
          },
        },
      }),
    ]);
    return { items, total };
  }

  async findById(idAuditoria: number | bigint): Promise<any | null> {
    return prisma.auditoria.findUnique({
      where: { idAuditoria: BigInt(idAuditoria) },
      include: {
        usuario: {
          select: {
            idUsuario: true,
            nombreUsuario: true,
            correo: true,
            rol: {
              select: {
                idRol: true,
                nombre: true,
              },
            },
          },
        },
      },
    });
  }
}

export const auditoriaRepository = new AuditoriaRepository();
