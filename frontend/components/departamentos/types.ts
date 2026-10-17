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
  // Parámetros de cobro y medidores de agua (Reglas Pizarra Docente)
  expensaBase?: number
  codigoMedidor?: string
  lecturaAnteriorAgua?: number
  lecturaActualAgua?: number
  tarifaAguaM3?: number
  consumoAguaM3?: number
  montoAgua?: number
  otrosExtras?: number
  fechaLecturaAnterior?: string
  fechaLecturaActual?: string
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
  // Parámetros de cobro y medidor
  expensaBase?: number
  codigoMedidor?: string
  lecturaAnteriorAgua?: number
  lecturaActualAgua?: number
  tarifaAguaM3?: number
  otrosExtras?: number
}

// Configuración Global de Parámetros (Pizarra Docente)
export interface ParametrosCobroConfig {
  diaLimitePago: number // ej. 10 (< 10/Mes -> Mora = 0; >= 10/Mes -> Mora)
  tipoMora: 'porcentaje' | 'monto_fijo' // 10% vs Bs 50
  valorMoraPorcentaje: number // 10
  valorMoraFijo: number // 50
  frecuenciaMora: 'mes' | 'dia' // Conf. < Mes / Día >
  tarifaAguaM3: number // 5 Bs / m3
  expensaBaseTipoA: number // 300 Bs
  expensaBaseTipoB: number // 350 Bs
  expensaBaseTipoC: number // 400 Bs
}

// Interfaz para Gestión 100% Editable de Tipos de Departamentos (Tipologías)
export interface TipoDepartamentoItem {
  id: string
  nombre: string // Ej: 'Tipo A', 'Tipo B', 'Tipo C', 'Penthouse'
  codigo: string // Ej: 'A', 'B', 'C', 'PH'
  areaM2: number // Superficie en m² (ej. 60, 80, 100)
  expensaBase: number // Expensa base en Bs (ej. 300, 350, 400)
  alicuotaEstimada?: number // % Alícuota sobre 1,600 m²
  habitaciones: number // Nro de dormitorios
  banos: number // Nro de baños
  descripcion: string
  colorBadge: 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'indigo' | string
  activo: boolean
}

export const DEFAULT_TIPOS_DEPARTAMENTO: TipoDepartamentoItem[] = [
  {
    id: 'tipo-a',
    nombre: 'Tipo A',
    codigo: 'A',
    areaM2: 60.0,
    expensaBase: 300.0,
    alicuotaEstimada: 3.75,
    habitaciones: 2,
    banos: 1,
    descripcion:
      'Departamento compacto de 2 dormitorios, 1 baño, living-comedor y cocina americana.',
    colorBadge: 'blue',
    activo: true
  },
  {
    id: 'tipo-b',
    nombre: 'Tipo B',
    codigo: 'B',
    areaM2: 80.0,
    expensaBase: 350.0,
    alicuotaEstimada: 5.0,
    habitaciones: 3,
    banos: 2,
    descripcion:
      'Departamento familiar de 3 dormitorios (1 en suite), 2 baños y cocina independiente.',
    colorBadge: 'emerald',
    activo: true
  },
  {
    id: 'tipo-c',
    nombre: 'Tipo C',
    codigo: 'C',
    areaM2: 100.0,
    expensaBase: 400.0,
    alicuotaEstimada: 6.25,
    habitaciones: 3,
    banos: 3,
    descripcion:
      'Departamento amplio de 3 dormitorios en suite, balcón panorámico, dependencia y lavandería.',
    colorBadge: 'purple',
    activo: true
  }
]
