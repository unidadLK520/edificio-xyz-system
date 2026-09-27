// frontend/components/egresos/types.ts
// Tipos e interfaces compartidas para el módulo de Egresos y Facturas (HU 5)

export type CategoriaEgreso =
  | 'Mantenimiento'
  | 'Servicios Básicos'
  | 'Seguridad'
  | 'Limpieza'
  | 'Administrativo'
  | 'Fondo de Reserva'

export type EstadoEgreso = 'Pagado' | 'Pendiente' | 'En Revisión'

export type MetodoPagoEgreso =
  | 'Transferencia Bancaria (BNB)'
  | 'Transferencia Bancaria (BMSC)'
  | 'Cheque de Gerencia'
  | 'Débito Automático'
  | 'Efectivo Caja Chica'
  | 'Por Definir'

export interface EgresoItem {
  id: number
  codigo: string
  fecha: string
  categoria: CategoriaEgreso
  proveedor: string
  descripcion: string
  nroFactura: string
  monto: number
  estado: EstadoEgreso
  metodoPago: MetodoPagoEgreso | string
  comprobanteUrl?: string
  fechaRegistro?: string
}

export interface EgresoFormData {
  proveedor: string
  categoria: CategoriaEgreso
  descripcion: string
  nroFactura: string
  monto: number
  metodoPago: MetodoPagoEgreso | string
  estado: EstadoEgreso
  fecha: string
}
