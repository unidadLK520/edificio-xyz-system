// frontend/components/departamentos/types.ts
// Tipos e interfaces compartidas para el módulo de Departamentos, Parqueos y Bauleras (Edificio XYZ)

export type TipoUnidad = 'Departamento' | 'Parqueo' | 'Baulera'

export type TipologiaDepto = 'Tipo A (60 m²)' | 'Tipo B (80 m²)' | 'Tipo C (100 m²)' | string

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
  // Parámetros de cobro y agua (Reglas del Edificio XYZ)
  expensaBase?: number
  montoAgua?: number
  otrosExtras?: number
}

export interface DepartamentoItem extends UnidadItem {}

export interface DepartamentoFormData {
  tipoUnidad?: TipoUnidad
  numero: string
  piso: number
  areaM2: number
  tipologia?: TipologiaDepto
  parqueo?: string
  baulera?: string
  propietarioNombre?: string
  propietarioCi?: string
  propietarioTel?: string
  propietarioCorreo?: string
  inquilinoNombre?: string
  inquilinoTel?: string
  estado: EstadoOcupacionDepto | string
  // Parámetros de cobro
  expensaBase?: number
  montoAgua?: number
  otrosExtras?: number
}

// Configuración Global de Parámetros de Cobro
export interface ParametrosCobroConfig {
  diaLimitePago: number // ej. 10 (< 10/Mes -> Mora = 0; >= 10/Mes -> Mora)
  tipoMora?: 'porcentaje' // Solo porcentaje
  valorMoraPorcentaje: number // Tasa de interés mora %
  tarifaAguaM3: number // 5 Bs / m3
  expensaBaseTipoA: number // 300 Bs
  expensaBaseTipoB: number // 350 Bs
  expensaBaseTipoC: number // 400 Bs
}

// Interfaz para Gestión de Tipos de Departamentos conectada a la API
export interface TipoDepartamentoItem {
  id: string
  idTipo?: number
  nombre: string
  codigo?: string
  areaM2: number
  expensaBase: number
  montoExpensa?: number
  activo: boolean
  departamentosAsignados?: number
  habitaciones?: number
  banos?: number
  descripcion?: string
  colorBadge?: string
}

export const DEFAULT_TIPOS_DEPARTAMENTO: TipoDepartamentoItem[] = []
