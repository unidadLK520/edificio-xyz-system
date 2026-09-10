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
}

export const authRepository = new AuthRepository();
