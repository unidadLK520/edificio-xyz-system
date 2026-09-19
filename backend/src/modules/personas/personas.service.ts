//-----------------------------Giovani Quiroz------------------------
// backend/src/modules/personas/personas.service.ts
// Lógica de negocio y reglas para la gestión de personas, copropietarios y asignaciones (HU02)

import { PersonasRepository, personasRepository } from './personas.repository';
import { AuditoriaService, auditoriaService } from '../auditoria';
import {
  CrearPersonaDTO,
  ActualizarPersonaDTO,
  AsignarUnidadDTO,
  ConsultarPersonasFiltros,
  ServiceResult,
} from './personas.types';

export { ServiceResult };

export class PersonasService {
  constructor(
    private readonly repository: PersonasRepository = personasRepository,
    private readonly auditoria: AuditoriaService = auditoriaService
  ) {}

  /**
   * Registra una nueva persona con validación de CI/NIT duplicado y auditoría (CA1, CA4)
   */
  async crearPersona(
    dto: CrearPersonaDTO,
    idOperador?: number
  ): Promise<ServiceResult<any>> {
    // 1. Validación de duplicado por CI/NIT (CA4)
    const existente = await this.repository.findByCiNit(dto.ciNit);
    if (existente) {
      return {
        success: false,
        error: 'PERSONA_DUPLICADA_CI',
        message: `Ya existe una persona registrada con el CI/NIT '${dto.ciNit}'`,
        statusCode: 409,
      };
    }

    // 2. Crear persona en BD (CA1)
    const persona = await this.repository.create(dto);

    // 3. Registrar auditoría (CA08/CA10)
    try {
      await this.auditoria.registrarEvento({
        tablaAfectada: 'personas',
        idRegistro: String(persona.idPersona),
        accion: 'INSERT',
        resultado: 'EXITO',
        idUsuario: idOperador ?? null,
        datosNuevos: {
          idPersona: persona.idPersona,
          ciNit: persona.ciNit,
          nombres: persona.nombres,
          apellidos: persona.apellidos,
          telefono: persona.telefono,
          correo: persona.correo,
          direccion: persona.direccion,
        },
      });
    } catch (err) {
      console.error('[PersonasService] Error al auditar creación de persona:', err);
    }

    return { success: true, data: persona };
  }

  /**
   * Consulta paginada y búsqueda de personas con filtros por nombre, apellido o CI (CA2, CA5)
   */
  async obtenerPersonas(filtros: ConsultarPersonasFiltros) {
    const page = filtros.page || 1;
    const limit = filtros.limit || 20;

    const { personas, total } = await this.repository.findAll({
      buscar: filtros.buscar,
      page,
      limit,
      tipoOcupante: filtros.tipoOcupante,
    });

    return {
      data: personas,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Obtiene el detalle completo de una persona por ID con unidades asignadas (CA8)
   */
  async obtenerPersonaPorId(idPersona: number): Promise<ServiceResult<any>> {
    const persona = await this.repository.findById(idPersona);
    if (!persona) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'Persona no encontrada',
        statusCode: 404,
      };
    }

    return { success: true, data: persona };
  }

  /**
   * Modifica los datos de una persona con validación de CI único y auditoría (CA3)
   */
  async actualizarPersona(
    idPersona: number,
    dto: ActualizarPersonaDTO,
    idOperador?: number
  ): Promise<ServiceResult<any>> {
    const existente = await this.repository.findById(idPersona);
    if (!existente) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'Persona no encontrada',
        statusCode: 404,
      };
    }

    // Si se modifica el CI/NIT, verificar que ninguna otra persona lo tenga (CA4)
    if (dto.ciNit && dto.ciNit !== existente.ciNit) {
      const colision = await this.repository.findByCiNit(dto.ciNit);
      if (colision && colision.idPersona !== idPersona) {
        return {
          success: false,
          error: 'PERSONA_DUPLICADA_CI',
          message: `El CI/NIT '${dto.ciNit}' ya pertenece a otra persona registrada`,
          statusCode: 409,
        };
      }
    }

    const personaActualizada = await this.repository.update(idPersona, dto);

    // Auditoría de modificación con datos anteriores y datos nuevos (CA3)
    try {
      await this.auditoria.registrarEvento({
        tablaAfectada: 'personas',
        idRegistro: String(idPersona),
        accion: 'UPDATE',
        resultado: 'EXITO',
        idUsuario: idOperador ?? null,
        datosAnteriores: {
          ciNit: existente.ciNit,
          nombres: existente.nombres,
          apellidos: existente.apellidos,
          telefono: existente.telefono,
          correo: existente.correo,
          direccion: existente.direccion,
        },
        datosNuevos: {
          ...dto,
        },
      });
    } catch (err) {
      console.error('[PersonasService] Error al auditar actualización de persona:', err);
    }

    return { success: true, data: personaActualizada };
  }

  /**
   * Asigna una persona a un departamento como propietario o inquilino (CA6)
   */
  async asignarAUnidad(
    idPersona: number,
    dto: AsignarUnidadDTO,
    idOperador?: number
  ): Promise<ServiceResult<any>> {
    // 1. Validar que la persona exista
    const persona = await this.repository.findById(idPersona);
    if (!persona) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'Persona no encontrada',
        statusCode: 404,
      };
    }

    // 2. Validar que el departamento exista
    const departamento = await this.repository.findDepartamentoById(dto.idDepartamento);
    if (!departamento) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: `El departamento con ID ${dto.idDepartamento} no existe`,
        statusCode: 404,
      };
    }

    const fechaInicio = new Date(`${dto.fechaInicio}T00:00:00`);
    const fechaFin = dto.fechaFin ? new Date(`${dto.fechaFin}T00:00:00`) : null;

    if (fechaFin && fechaFin < fechaInicio) {
      return {
        success: false,
        error: 'FECHA_INVALIDA',
        message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
        statusCode: 400,
      };
    }

    // 3. Ejecutar la asignación
    const ocupacion = await this.repository.asignarOcupante({
      idPersona,
      idDepartamento: dto.idDepartamento,
      tipoOcupante: dto.tipoOcupante,
      fechaInicio,
      fechaFin,
      actualizarPropietarioDirecto: dto.esPropietarioDirecto,
    });

    // 4. Auditar la asignación
    try {
      await this.auditoria.registrarEvento({
        tablaAfectada: 'ocupantes_departamento',
        idRegistro: String(ocupacion.idOcupacion),
        accion: 'ASIGNACION_UNIDAD',
        resultado: 'EXITO',
        idUsuario: idOperador ?? null,
        datosNuevos: {
          idOcupacion: ocupacion.idOcupacion,
          idPersona,
          idDepartamento: dto.idDepartamento,
          numeroDepartamento: departamento.numero,
          tipoOcupante: dto.tipoOcupante,
          fechaInicio: dto.fechaInicio,
          fechaFin: dto.fechaFin || null,
          esPropietarioDirecto: dto.esPropietarioDirecto,
        },
      });
    } catch (err) {
      console.error('[PersonasService] Error al auditar asignación de unidad:', err);
    }

    return { success: true, data: ocupacion };
  }

  /**
   * Finaliza una ocupación activa asignando fecha de fin (CA6, CA7)
   */
  async finalizarOcupacion(
    idOcupacion: number,
    fechaFinStr?: string,
    idOperador?: number
  ): Promise<ServiceResult<any>> {
    const ocupacion = await this.repository.findOcupacionById(idOcupacion);
    if (!ocupacion) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'Registro de ocupación no encontrado',
        statusCode: 404,
      };
    }

    // Si la ocupación ya tiene fecha de fin registrada y es pasada o igual, ya concluyó
    if (ocupacion.fechaFin !== null && new Date(ocupacion.fechaFin) <= new Date()) {
      return {
        success: false,
        error: 'OCUPACION_YA_FINALIZADA',
        message: 'Esta ocupación ya fue finalizada anteriormente',
        statusCode: 400,
      };
    }

    const fechaFin = fechaFinStr ? new Date(`${fechaFinStr}T00:00:00`) : new Date();

    if (fechaFin < ocupacion.fechaInicio) {
      return {
        success: false,
        error: 'FECHA_INVALIDA',
        message: 'La fecha de fin no puede ser anterior a la fecha de inicio de la ocupación',
        statusCode: 400,
      };
    }

    const ocupacionFinalizada = await this.repository.finalizarOcupacion(idOcupacion, fechaFin);

    // Auditar finalización de ocupación
    try {
      await this.auditoria.registrarEvento({
        tablaAfectada: 'ocupantes_departamento',
        idRegistro: String(idOcupacion),
        accion: 'FINALIZACION_OCUPACION',
        resultado: 'EXITO',
        idUsuario: idOperador ?? null,
        datosAnteriores: { fechaFin: null },
        datosNuevos: { fechaFin: fechaFin.toISOString().slice(0, 10) },
      });
    } catch (err) {
      console.error('[PersonasService] Error al auditar finalización de ocupación:', err);
    }

    return { success: true, data: ocupacionFinalizada };
  }

  /**
   * Obtiene el historial completo de unidades que ha ocupado una persona (CA7)
   */
  async obtenerHistorialPersona(idPersona: number): Promise<ServiceResult<any>> {
    const persona = await this.repository.findById(idPersona);
    if (!persona) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'Persona no encontrada',
        statusCode: 404,
      };
    }

    const historial = await this.repository.findHistorialPorPersona(idPersona);

    return {
      success: true,
      data: {
        persona: {
          idPersona: persona.idPersona,
          ciNit: persona.ciNit,
          nombres: persona.nombres,
          apellidos: persona.apellidos,
        },
        departamentosPropios: persona.departamentosPropios,
        historialOcupaciones: historial,
      },
    };
  }

  /**
   * Obtiene el historial de todos los ocupantes que han estado en un departamento (CA7)
   */
  async obtenerHistorialDepartamento(idDepartamento: number): Promise<ServiceResult<any>> {
    const departamento = await this.repository.findDepartamentoById(idDepartamento);
    if (!departamento) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'Departamento no encontrado',
        statusCode: 404,
      };
    }

    const historial = await this.repository.findHistorialPorDepartamento(idDepartamento);

    return {
      success: true,
      data: {
        departamento: {
          idDepartamento: departamento.idDepartamento,
          numero: departamento.numero,
          piso: departamento.piso,
          propietarioActual: departamento.propietario,
        },
        historialOcupantes: historial,
      },
    };
  }
}

export const personasService = new PersonasService();
