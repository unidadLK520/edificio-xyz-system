// frontend/components/usuarios/types.ts

export interface PersonaItem {
  idPersona: number
  nombres: string
  apellidos: string
  ciNit: string
  telefono?: string | null
  correo?: string | null
  direccion?: string | null
}

export interface UsuarioItem {
  idUsuario: number
  nombreUsuario: string
  correo: string
  activo: boolean
  intentosFallidos: number
  bloqueadoHasta: string | null
  fechaCreacion: string
  ultimoAcceso: string | null
  idPersona?: number | null
  rol: {
    idRol: number
    nombre: string
    descripcion: string | null
  }
  persona?: PersonaItem | null
}
