// frontend/components/departamentos/types.ts
// Tipos e interfaces compartidas para el módulo de Departamentos, Parqueos y Bauleras (Edificio XYZ)

export type TipoUnidad = 'Departamento' | 'Parqueo' | 'Baulera'

export type TipologiaDepto = 'Tipo A (60 m²)' | 'Tipo B (80 m²)' | 'Tipo C (100 m²)'

export type EstadoOcupacionDepto = 'Ocupado por Propietario' | 'Alquilado' | 'Desocupado'

export interface PropietarioInfo {
  id?: number
  nombre: string
  ci: string
  telefono: string
  correo: string
}

export interface InquilinoInfo {
  id?: number
  nombre: string
  ci?: string
  telefono: string
  correo?: string
}

export interface HistorialOcupanteItem {
  idHistorial?: number
  periodo?: string
  residente?: string
  tipo?: 'Propietario' | 'Inquilino' | string
  fechaInicio?: string
  fechaFin?: string
  notas?: string
}

export interface UnidadItem {
  id: number
  tipoUnidad: TipoUnidad
  numero: string
  piso?: number | null
  areaM2?: number | null
  tipologia?: TipologiaDepto
  alicuota?: number
  estado: EstadoOcupacionDepto | string // 'Ocupado por Propietario' | 'Alquilado' | 'Desocupado' | 'Asignado' | 'Disponible'
  propietario?: PropietarioInfo | null
  ocupanteActual?: PropietarioInfo | null
  tipoOcupante?: string | null
  inquilinoActual?: InquilinoInfo | null
  idDepartamento?: number | null
  departamento?: { idDepartamento?: number; numero?: string } | null
  idPersona?: number | null
  persona?: { idPersona?: number; nombres?: string; apellidos?: string; ciNit?: string } | null
  parqueos?: any[]
  bauleras?: any[]
  parqueo?: string
  baulera?: string
  fechaRegistro?: string
  historialOcupantes?: HistorialOcupanteItem[]
}

export interface DepartamentoItem extends UnidadItem {}

export interface DepartamentoFormData {
  tipoUnidad?: TipoUnidad
  numero: string
  piso: number
  areaM2: number
  tipologia?: TipologiaDepto
  alicuota?: number
  parqueo?: string
  baulera?: string
  propietarioNombre?: string
  propietarioCi?: string
  propietarioTel?: string
  propietarioCorreo?: string
  inquilinoNombre?: string
  inquilinoTel?: string
  estado: EstadoOcupacionDepto | string
}
