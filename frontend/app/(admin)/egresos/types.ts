// frontend/app/(admin)/egresos/types.ts
// Shared types for the Finanzas/Egresos module

export interface MovimientoItem {
  id: number
  tipo: 'Ingreso' | 'Egreso'
  codigo: string
  fecha: string
  idCategoria: number
  categoria: string
  tercero?: string | null
  descripcion: string
  nroFactura?: string | null
  comprobanteUrl?: string | null
  monto: number
  metodoPago?: string | null
  registradoPor?: string
  anulado?: boolean
  motivoAnulacion?: string | null
  idPago?: number | null
}

export interface CategoriaItem {
  idCategoria: number
  nombre: string
  tipo: 'Ingreso' | 'Egreso'
}

export interface ResumenData {
  totalIngresos: number
  totalEgresos: number
  balance: number
  cantidadIngresos: number
  cantidadEgresos: number
}

export interface MovimientoFormData {
  tipo: 'Ingreso' | 'Egreso'
  idCategoria: number
  tercero: string
  descripcion: string
  monto: number
  fecha: string
  nroFactura: string
  metodoPago: string
  comprobanteUrl: string
}

export interface FeedbackMessage {
  type: 'success' | 'error'
  text: string | null
}

export type TabTipo = 'Todos' | 'Ingreso' | 'Egreso'
export type FiltroPeriodo = 'todos' | 'mes_actual' | 'mes_anterior' | 'personalizado'
