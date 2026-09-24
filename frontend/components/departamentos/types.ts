// frontend/components/departamentos/types.ts
// Tipos e interfaces compartidas para el módulo de Departamentos, Parqueos y Bauleras (HU03)

export type TipoUnidad = 'Departamento' | 'Parqueo' | 'Baulera'

export interface PropietarioInfo {
  id?: number
  nombre: string
  ci: string
  telefono: string
  correo: string
}

export interface InquilinoInfo {
  nombre: string
  telefono: string
}

export interface HistorialOcupanteItem {
  idHistorial?: number
  periodo?: string
  residente?: string
  tipo?: string
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
  alicuota?: number
  estado: string
  propietario?: PropietarioInfo | null
  ocupanteActual?: PropietarioInfo | null
  inquilinoActual?: InquilinoInfo | null
  idDepartamento?: number | null
  departamento?: { idDepartamento?: number; numero?: string } | null
  idPersona?: number | null
  persona?: { idPersona?: number; nombres?: string; apellidos?: string } | null
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
  alicuota?: number
  parqueo?: string
  baulera?: string
  propietarioNombre?: string
  propietarioCi?: string
  propietarioTel?: string
  propietarioCorreo?: string
  estado: string
}

