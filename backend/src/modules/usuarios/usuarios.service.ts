// backend/src/modules/usuarios/usuarios.service.ts
// Lógica de negocio para la gestión conjunta de Usuarios y Personas (CA09, CA04, CA10)

import { hash } from 'bcryptjs';
import { usuariosRepository, UsuariosRepository } from './usuarios.repository';
import { auditoriaService, AuditoriaService } from '../auditoria';

export interface PersonaDTO {
  nombres: string;
  apellidos: string;
  ciNit: string;
  telefono?: string | null;
  direccion?: string | null;
  correo?: string | null;
}

export interface RegistrarUsuarioDTO {
  nombreUsuario: string;
  correo: string;
  password: string;
  rol: string;
  idPersona?: number | null;
  persona?: PersonaDTO | null;
  activo?: boolean;
}

export class UsuariosService {
  constructor(
    private readonly repository: UsuariosRepository = usuariosRepository,
    private readonly auditoria: AuditoriaService = auditoriaService
  ) {}

  async obtenerUsuarios() {
    return this.repository.findAll();
  }

  async obtenerRoles() {
    return this.repository.findAllRoles();
  }

  async obtenerPersonas() {
    return this.repository.findAllPersonas();
  }

  async registrarUsuario(dto: RegistrarUsuarioDTO, idAdminResp: number) {
    // 1. Validar unicidad de correo y nombre de usuario
    const existente = await this.repository.findByCorreoOrNombre(dto.correo, dto.nombreUsuario);
    if (existente) {
      if (existente.correo === dto.correo) {
        throw new Error('Ya existe un usuario registrado con este correo electrónico');
      }
      throw new Error('Ya existe un usuario registrado con este nombre de usuario');
    }

    // 2. Resolver el rol por su nombre
    const rolObj = await this.repository.findRolByNombre(dto.rol);
    if (!rolObj) {
      throw new Error(`El rol especificado '${dto.rol}' no existe en el sistema`);
    }

    // 3. Gestionar o Registrar la Persona asociada
    let finalIdPersona: number | null = dto.idPersona ?? null;

    if (!finalIdPersona && dto.persona) {
      if (!dto.persona.nombres?.trim() || !dto.persona.apellidos?.trim() || !dto.persona.ciNit?.trim()) {
        throw new Error('Debe proporcionar nombres, apellidos y CI/NIT para el registro de la persona');
      }

      // Verificar si la persona ya existe por su CI/NIT
      const personaExistente = await this.repository.findPersonaByCiNit(dto.persona.ciNit.trim());
      if (personaExistente) {
        finalIdPersona = personaExistente.idPersona;
      } else {
        // Crear nueva Persona en la tabla 'personas'
        const nuevaPersona = await this.repository.createPersona({
          nombres: dto.persona.nombres.trim(),
          apellidos: dto.persona.apellidos.trim(),
          ciNit: dto.persona.ciNit.trim(),
          telefono: dto.persona.telefono?.trim() || null,
          correo: dto.persona.correo?.trim() || dto.correo.trim(),
          direccion: dto.persona.direccion?.trim() || null,
        });
        finalIdPersona = nuevaPersona.idPersona;
      }
    }

    // 4. Hash bcrypt para la contraseña
    const passwordHash = await hash(dto.password, 10);

    // 5. Crear usuario en la BD vinculado a la Persona
    const nuevoUsuario = await this.repository.create({
      nombreUsuario: dto.nombreUsuario.trim(),
      correo: dto.correo.trim(),
      passwordHash,
      idRol: rolObj.idRol,
      idPersona: finalIdPersona,
      activo: dto.activo ?? true,
    });

    // 6. Auditoría de creación de usuario y persona (CA08, CA10)
    await this.auditoria.registrarCambioUsuario(
      idAdminResp,
      nuevoUsuario.idUsuario,
      'REGISTRAR_USUARIO_Y_PERSONA',
      undefined,
      {
        nombreUsuario: nuevoUsuario.nombreUsuario,
        correo: nuevoUsuario.correo,
        rol: rolObj.nombre,
        activo: nuevoUsuario.activo,
        idPersona: finalIdPersona,
        persona: nuevoUsuario.persona
          ? `${nuevoUsuario.persona.nombres} ${nuevoUsuario.persona.apellidos} (CI: ${nuevoUsuario.persona.ciNit})`
          : null,
      }
    );

    return {
      idUsuario: nuevoUsuario.idUsuario,
      nombreUsuario: nuevoUsuario.nombreUsuario,
      correo: nuevoUsuario.correo,
      rol: rolObj.nombre,
      activo: nuevoUsuario.activo,
      fechaCreacion: nuevoUsuario.fechaCreacion,
      persona: nuevoUsuario.persona
        ? {
            idPersona: nuevoUsuario.persona.idPersona,
            nombres: nuevoUsuario.persona.nombres,
            apellidos: nuevoUsuario.persona.apellidos,
            ciNit: nuevoUsuario.persona.ciNit,
            telefono: nuevoUsuario.persona.telefono,
            correo: nuevoUsuario.persona.correo,
            direccion: nuevoUsuario.persona.direccion,
          }
        : null,
    };
  }

  async cambiarEstadoUsuario(idUsuario: number, activo: boolean, idAdminResp: number) {
    const usuarioActual = await this.repository.findById(idUsuario);
    if (!usuarioActual) {
      throw new Error('Usuario no encontrado');
    }

    const usuarioActualizado = await this.repository.updateEstado(idUsuario, activo);

    await this.auditoria.registrarCambioUsuario(
      idAdminResp,
      idUsuario,
      activo ? 'ACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO',
      { activo: usuarioActual.activo },
      { activo: usuarioActualizado.activo }
    );

    return usuarioActualizado;
  }

  async cambiarRolUsuario(idUsuario: number, nombreRol: string, idAdminResp: number) {
    const usuarioActual = await this.repository.findById(idUsuario);
    if (!usuarioActual) {
      throw new Error('Usuario no encontrado');
    }

    const rolObj = await this.repository.findRolByNombre(nombreRol);
    if (!rolObj) {
      throw new Error(`El rol especificado '${nombreRol}' no existe en el sistema`);
    }

    const usuarioActualizado = await this.repository.updateRol(idUsuario, rolObj.idRol);

    await this.auditoria.registrarCambioUsuario(
      idAdminResp,
      idUsuario,
      'ASIGNAR_ROL',
      { idRol: usuarioActual.idRol, rol: usuarioActual.rol.nombre },
      { idRol: rolObj.idRol, rol: rolObj.nombre }
    );

    return usuarioActualizado;
  }
}

export const usuariosService = new UsuariosService();
