//-----------------------------Giovani Quiroz------------------------
// backend/src/modules/personas/personas.repository.ts
// Acceso a datos exclusivo para el módulo de personas (HU02)

import { prisma, Prisma } from '@edificio-xyz/database';
import { CrearPersonaDTO, ActualizarPersonaDTO } from './personas.types';

export class PersonasRepository {
  /**
   * Busca una persona por su CI/NIT (CA4)
   */
  async findByCiNit(ciNit: string) {
    return prisma.persona.findUnique({
      where: { ciNit },
    });
  }

  /**
   * Busca una persona por ID con detalle de departamentos propios y ocupaciones activas (CA8)
   */
  async findById(idPersona: number) {
    return prisma.persona.findUnique({
      where: { idPersona },
      include: {
        departamentosPropios: {
          select: {
            idDepartamento: true,
            numero: true,
            piso: true,
            areaM2: true,
            estado: true,
            parqueos: { select: { idParqueo: true, numero: true } },
            bauleras: { select: { idBaulera: true, numero: true } },
          },
        },
        ocupaciones: {
          orderBy: { fechaInicio: 'desc' },
          include: {
            departamento: {
              select: {
                idDepartamento: true,
                numero: true,
                piso: true,
                estado: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Lista personas con filtros de búsqueda por nombre/apellido/CI y paginación (CA2, CA5)
   */
  async findAll(params: {
    buscar?: string;
    page: number;
    limit: number;
    tipoOcupante?: string;
  }) {
    const { buscar, page, limit, tipoOcupante } = params;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.PersonaWhereInput = {};

    // Búsqueda por texto en CI/NIT, nombres o apellidos (CA5)
    if (buscar && buscar.trim().length > 0) {
      const term = buscar.trim();
      where.OR = [
        { ciNit: { contains: term, mode: 'insensitive' } },
        { nombres: { contains: term, mode: 'insensitive' } },
        { apellidos: { contains: term, mode: 'insensitive' } },
      ];
    }

    // Filtro por tipo de ocupante (Propietario / Inquilino)
    if (tipoOcupante) {
      where.ocupaciones = {
        some: {
          tipoOcupante,
          fechaFin: null, // ocupación activa
        },
      };
    }

    const personas = await prisma.persona.findMany({
      where,
      skip,
      take,
      orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
      include: {
        departamentosPropios: {
          select: { idDepartamento: true, numero: true },
        },
        ocupaciones: {
          where: { fechaFin: null },
          select: {
            idOcupacion: true,
            tipoOcupante: true,
            departamento: { select: { idDepartamento: true, numero: true } },
          },
        },
        _count: {
          select: {
            departamentosPropios: true,
            ocupaciones: true,
          },
        },
      },
    });

    const total = await prisma.persona.count({ where });

    return { personas, total };
  }

  /**
   * Inserta un nuevo registro de persona en la base de datos (CA1)
   */
  async create(data: CrearPersonaDTO) {
    return prisma.persona.create({
      data: {
        ciNit: data.ciNit,
        nombres: data.nombres,
        apellidos: data.apellidos,
        telefono: data.telefono || null,
        correo: data.correo || null,
        direccion: data.direccion || null,
      },
    });
  }

  /**
   * Actualiza los datos de una persona (CA3)
   */
  async update(idPersona: number, data: ActualizarPersonaDTO) {
    return prisma.persona.update({
      where: { idPersona },
      data: {
        ...(data.ciNit !== undefined && { ciNit: data.ciNit }),
        ...(data.nombres !== undefined && { nombres: data.nombres }),
        ...(data.apellidos !== undefined && { apellidos: data.apellidos }),
        ...(data.telefono !== undefined && { telefono: data.telefono || null }),
        ...(data.correo !== undefined && { correo: data.correo || null }),
        ...(data.direccion !== undefined && { direccion: data.direccion || null }),
      },
    });
  }

  /**
   * Verifica la existencia de un departamento por ID
   */
  async findDepartamentoById(idDepartamento: number) {
    return prisma.departamento.findUnique({
      where: { idDepartamento },
      include: {
        propietario: { select: { idPersona: true, nombres: true, apellidos: true } },
      },
    });
  }

  /**
   * Asigna una persona a un departamento como ocupante/propietario dentro de una transacción (CA6)
   */
  async asignarOcupante(params: {
    idPersona: number;
    idDepartamento: number;
    tipoOcupante: string;
    fechaInicio: Date;
    fechaFin?: Date | null;
    actualizarPropietarioDirecto?: boolean;
  }) {
    const {
      idPersona,
      idDepartamento,
      tipoOcupante,
      fechaInicio,
      fechaFin,
      actualizarPropietarioDirecto,
    } = params;

    // 1. Crear el registro en ocupantes_departamento
    const ocupacion = await prisma.ocupanteDepartamento.create({
      data: {
        idDepartamento,
        idPersona,
        tipoOcupante,
        fechaInicio,
        fechaFin: fechaFin || null,
      },
      include: {
        departamento: { select: { idDepartamento: true, numero: true, piso: true } },
        persona: { select: { idPersona: true, nombres: true, apellidos: true, ciNit: true } },
      },
    });

    // 2. Si es propietario directo o se solicitó actualizar el titular, actualizar departamentos.id_propietario
    if (actualizarPropietarioDirecto || tipoOcupante === 'Propietario') {
      await prisma.departamento.update({
        where: { idDepartamento },
        data: { idPropietario: idPersona },
      });
    }

    return ocupacion;
  }

  /**
   * Busca un registro de ocupación por su ID
   */
  async findOcupacionById(idOcupacion: number) {
    return prisma.ocupanteDepartamento.findUnique({
      where: { idOcupacion },
      include: {
        departamento: true,
        persona: true,
      },
    });
  }

  /**
   * Finaliza una ocupación activa estableciendo la fecha de fin (CA6, CA7)
   */
  async finalizarOcupacion(idOcupacion: number, fechaFin: Date) {
    return prisma.ocupanteDepartamento.update({
      where: { idOcupacion },
      data: { fechaFin },
      include: {
        departamento: { select: { idDepartamento: true, numero: true } },
        persona: { select: { idPersona: true, nombres: true, apellidos: true } },
      },
    });
  }

  /**
   * Obtiene el historial completo de unidades que ha ocupado o tenido una persona (CA7)
   */
  async findHistorialPorPersona(idPersona: number) {
    return prisma.ocupanteDepartamento.findMany({
      where: { idPersona },
      orderBy: { fechaInicio: 'desc' },
      include: {
        departamento: {
          select: {
            idDepartamento: true,
            numero: true,
            piso: true,
            estado: true,
          },
        },
      },
    });
  }

  /**
   * Obtiene el historial completo de ocupantes de un departamento específico (CA7)
   */
  async findHistorialPorDepartamento(idDepartamento: number) {
    return prisma.ocupanteDepartamento.findMany({
      where: { idDepartamento },
      orderBy: { fechaInicio: 'desc' },
      include: {
        persona: {
          select: {
            idPersona: true,
            ciNit: true,
            nombres: true,
            apellidos: true,
            telefono: true,
            correo: true,
          },
        },
      },
    });
  }
}

export const personasRepository = new PersonasRepository();
