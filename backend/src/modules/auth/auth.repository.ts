// backend/src/modules/auth/auth.repository.ts
// Acceso a datos exclusivo para el módulo de autenticación

import { prisma } from '@edificio-xyz/database';

export class AuthRepository {
  async findByCorreo(correo: string) {
    return prisma.usuario.findUnique({
      where: { correo },
      include: { rol: true },
    });
  }

  async findById(idUsuario: number) {
    return prisma.usuario.findUnique({
      where: { idUsuario },
      select: {
        idUsuario: true,
        nombreUsuario: true,
        correo: true,
        activo: true,
        fechaCreacion: true,
        ultimoAcceso: true,
        rol: { select: { nombre: true, descripcion: true } },
      },
    });
  }

  async updateUltimoAcceso(idUsuario: number, fecha: Date = new Date()) {
    return prisma.usuario.update({
      where: { idUsuario },
      data: { ultimoAcceso: fecha },
    });
  }

  async registrarIntentoFallido(idUsuario: number, intentosFallidos: number, bloqueadoHasta: Date | null = null) {
    return prisma.usuario.update({
      where: { idUsuario },
      data: {
        intentosFallidos,
        bloqueadoHasta,
      },
    });
  }

  async resetIntentos(idUsuario: number, fechaAcceso: Date = new Date()) {
    return prisma.usuario.update({
      where: { idUsuario },
      data: {
        intentosFallidos: 0,
        bloqueadoHasta: null,
        ultimoAcceso: fechaAcceso,
      },
    });
  }

  async findSesionActiva(idUsuario: number) {
    return prisma.sesion.findFirst({
      where: { idUsuario, activa: true },
      orderBy: { fechaInicio: 'desc' },
    });
  }

  async crearSesion(data: { idUsuario: number; ip?: string; userAgent?: string }) {
    return prisma.sesion.create({
      data: {
        idUsuario: data.idUsuario,
        ip: data.ip,
        userAgent: data.userAgent,
        activa: true,
        fechaInicio: new Date(),
        ultimoAcceso: new Date(),
      },
    });
  }

  async desactivarSesionesUsuario(idUsuario: number) {
    return prisma.sesion.updateMany({
      where: { idUsuario, activa: true },
      data: { activa: false },
    });
  }

  async desactivarSesion(idSesion: string) {
    return prisma.sesion.updateMany({
      where: { idSesion, activa: true },
      data: { activa: false },
    });
  }

  async findSesionById(idSesion: string) {
    return prisma.sesion.findUnique({
      where: { idSesion },
    });
  }

  async actualizarUltimoAccesoSesion(idSesion: string, fecha: Date = new Date()) {
    return prisma.sesion.update({
      where: { idSesion },
      data: { ultimoAcceso: fecha },
    });
  }
}

export const authRepository = new AuthRepository();
