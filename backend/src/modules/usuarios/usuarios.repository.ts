// backend/src/modules/usuarios/usuarios.repository.ts
// Acceso a datos de Prisma para la gestión de usuarios y personas (CA09)

import { prisma } from '@edificio-xyz/database';

export interface CreateUsuarioData {
  nombreUsuario: string;
  correo: string;
  passwordHash: string;
  idRol: number;
  idPersona?: number | null;
  activo?: boolean;
}

export interface CreatePersonaData {
  nombres: string;
  apellidos: string;
  ciNit: string;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
}

export class UsuariosRepository {
  async findAll() {
    return prisma.usuario.findMany({
      select: {
        idUsuario: true,
        nombreUsuario: true,
        correo: true,
        activo: true,
        intentosFallidos: true,
        bloqueadoHasta: true,
        fechaCreacion: true,
        ultimoAcceso: true,
        idPersona: true,
        rol: {
          select: {
            idRol: true,
            nombre: true,
            descripcion: true,
          },
        },
        persona: {
          select: {
            idPersona: true,
            nombres: true,
            apellidos: true,
            ciNit: true,
            telefono: true,
            correo: true,
            direccion: true,
          },
        },
      },
      orderBy: { idUsuario: 'asc' },
    });
  }

  async findById(idUsuario: number) {
    return prisma.usuario.findUnique({
      where: { idUsuario },
      include: {
        rol: true,
        persona: true,
      },
    });
  }

  async findByCorreoOrNombre(correo: string, nombreUsuario: string) {
    return prisma.usuario.findFirst({
      where: {
        OR: [{ correo }, { nombreUsuario }],
      },
    });
  }

  async findPersonaByCiNit(ciNit: string) {
    return prisma.persona.findUnique({
      where: { ciNit },
    });
  }

  async findAllPersonas() {
    return prisma.persona.findMany({
      orderBy: { apellidos: 'asc' },
    });
  }

  async createPersona(data: CreatePersonaData) {
    return prisma.persona.create({
      data: {
        nombres: data.nombres,
        apellidos: data.apellidos,
        ciNit: data.ciNit,
        telefono: data.telefono ?? null,
        correo: data.correo ?? null,
        direccion: data.direccion ?? null,
      },
    });
  }

  async findRolByNombre(nombreRol: string) {
    const exact = await prisma.rol.findUnique({
      where: { nombre: nombreRol },
    });
    if (exact) return exact;

    return prisma.rol.findFirst({
      where: {
        nombre: {
          equals: nombreRol,
          mode: 'insensitive',
        },
      },
    });
  }

  async findAllRoles() {
    return prisma.rol.findMany({
      orderBy: { idRol: 'asc' },
    });
  }

  async create(data: CreateUsuarioData) {
    return prisma.usuario.create({
      data: {
        nombreUsuario: data.nombreUsuario,
        correo: data.correo,
        passwordHash: data.passwordHash,
        idRol: data.idRol,
        idPersona: data.idPersona ?? null,
        activo: data.activo ?? true,
      },
      include: {
        rol: true,
        persona: true,
      },
    });
  }

  async updateEstado(idUsuario: number, activo: boolean) {
    return prisma.usuario.update({
      where: { idUsuario },
      data: { activo },
      include: {
        rol: true,
        persona: true,
      },
    });
  }

  async updateRol(idUsuario: number, idRol: number) {
    return prisma.usuario.update({
      where: { idUsuario },
      data: { idRol },
      include: {
        rol: true,
        persona: true,
      },
    });
  }
}

export const usuariosRepository = new UsuariosRepository();
