// frontend/components/departamentos/types.ts
// Tipos e interfaces compartidas para el módulo de Departamentos y Catastro (HU 4)

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
  periodo: string
  residente: string
  tipo: 'Propietario' | 'Inquilino'
}

export interface DepartamentoItem {
  id: number
  numero: string
  piso: number
  areaM2: number
  alicuota?: number
  estado: 'Ocupado' | 'Disponible' | 'En Alquiler' | 'Mantenimiento'
  propietario: PropietarioInfo | null
  inquilinoActual?: InquilinoInfo | null
  parqueo: string
  baulera: string
  fechaRegistro?: string
  historialOcupantes?: HistorialOcupanteItem[]
}

export interface DepartamentoFormData {
  numero: string
  piso: number
  areaM2: number
  alicuota: number
  parqueo: string
  baulera: string
  propietarioNombre: string
  propietarioCi: string
  propietarioTel: string
  propietarioCorreo: string
  estado: 'Ocupado' | 'Disponible' | 'En Alquiler' | 'Mantenimiento'
}
