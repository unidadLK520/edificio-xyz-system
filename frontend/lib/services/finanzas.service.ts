// frontend/lib/services/finanzas.service.ts
// Capa de servicio centralizada para operaciones de Caja, Bancos y Conciliación (US1.4)
// Utiliza apiFetch sin Bearer manual (manejado por cookies en el proxy de Next.js)

import { apiFetch } from '@/lib/api'

// Helper uniforme para extraer mensaje y status real de respuestas de error (distintas de 2xx)
export async function formatApiError(res: Response, fallbackMsg = 'Operación fallida'): Promise<string> {
  try {
    const json = await res.json().catch(() => null)
    if (json) {
      let detailStr = ''
      if (json.details && typeof json.details === 'object') {
        detailStr = Object.entries(json.details)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ')
      }
      const baseMsg = json.message || json.error || fallbackMsg
      return detailStr ? `Error (${res.status}): ${baseMsg} (${detailStr})` : `Error (${res.status}): ${baseMsg}`
    }
  } catch {
    // Si no es JSON legible
  }
  return `Error (${res.status}): ${fallbackMsg}`
}

export function extractErrorMessage(err: unknown, fallback = 'Ha ocurrido un error inesperado'): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (err && typeof err === 'object' && 'message' in err) return String((err as any).message)
  return fallback
}

// ============================================================================
// 1. MÓDULO DE CAJA CHICA (/api/v1/caja)
// ============================================================================

export interface MovimientoCajaItem {
  idMovimientoCaja: number
  tipo: 'Ingreso' | 'Egreso'
  monto: number
  concepto: string
  fecha: string
  anulado: boolean
  fechaAnulacion?: string | null
  motivoAnulacion?: string | null
  idUsuarioRegistro: number
  idUsuarioAnulacion?: number | null
  usuarioRegistro?: { idUsuario: number; nombreUsuario: string }
  usuarioAnulacion?: { idUsuario: number; nombreUsuario: string }
}

export interface SaldoCajaData {
  saldoInicial: number
  totalIngresos: number
  totalEgresos: number
  saldoFinal: number
  saldoDisponibleActual: number
  periodo: {
    desde: string | null
    hasta: string | null
  }
}

export type CajaSaldoResumen = SaldoCajaData

export const cajaService = {
  // GET /api/v1/caja/saldo
  async getSaldo(params?: { desde?: string; hasta?: string }): Promise<SaldoCajaData> {
    const q = new URLSearchParams()
    if (params?.desde) q.append('desde', params.desde)
    if (params?.hasta) q.append('hasta', params.hasta)
    const url = `/api/v1/caja/saldo${q.toString() ? `?${q.toString()}` : ''}`

    const res = await apiFetch(url)
    if (!res.ok) {
      throw new Error(await formatApiError(res, 'Error al consultar saldo de caja'))
    }
    const json = await res.json()
    return json.data
  },

  // GET /api/v1/caja
  async getMovimientos(params?: {
    desde?: string
    hasta?: string
    tipo?: 'Ingreso' | 'Egreso' | 'Todos'
    anulado?: boolean
    page?: number
    limit?: number
  }): Promise<{ items: MovimientoCajaItem[]; total: number; totalPages: number }> {
    const q = new URLSearchParams()
    if (params?.desde) q.append('desde', params.desde)
    if (params?.hasta) q.append('hasta', params.hasta)
    if (params?.tipo && params.tipo !== 'Todos') q.append('tipo', params.tipo)
    if (params?.anulado !== undefined) q.append('anulado', String(params.anulado))
    if (params?.page) q.append('page', String(params.page))
    if (params?.limit) q.append('limit', String(params.limit))
    const url = `/api/v1/caja${q.toString() ? `?${q.toString()}` : ''}`

    const res = await apiFetch(url)
    if (!res.ok) {
      throw new Error(await formatApiError(res, 'Error al listar movimientos de caja'))
    }
    const json = await res.json()
    const items = (json.data || []).map((m: any) => ({
      ...m,
      monto: Number(m.monto || 0),
      idMovimientoCaja: Number(m.idMovimientoCaja || m.id)
    }))
    return {
      items,
      total: json.pagination?.total ?? items.length,
      totalPages: json.pagination?.totalPages ?? 1
    }
  },

  // POST /api/v1/caja
  async registrar(payload: {
    tipo: 'Ingreso' | 'Egreso'
    monto: number
    concepto: string
    fecha: string | Date
  }): Promise<MovimientoCajaItem> {
    const res = await apiFetch('/api/v1/caja', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: payload.tipo,
        monto: Number(payload.monto),
        concepto: payload.concepto.trim(),
        fecha: new Date(payload.fecha).toISOString()
      })
    })

    if (!res.ok) {
      throw new Error(await formatApiError(res, 'Error al registrar movimiento de caja'))
    }
    const json = await res.json()
    return json.data
  },

  // DELETE /api/v1/caja/:id
  async anular(idMovimientoCaja: number, motivo: string): Promise<void> {
    const res = await apiFetch(`/api/v1/caja/${idMovimientoCaja}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo: motivo.trim() })
    })

    if (!res.ok) {
      throw new Error(await formatApiError(res, 'Error al anular movimiento de caja'))
    }
  }
}

// ============================================================================
// 2. MÓDULO DE CUENTAS BANCARIAS (/api/v1/cuentas-bancarias)
// ============================================================================

export interface CuentaBancariaItem {
  idCuenta: number
  banco: string
  numeroCuenta: string
  tipoCuenta?: string | null
  saldoInicial: number
  saldoCalculado: number
  totalDepositos: number
  totalRetiros: number
  saldoActual: number
}

export const cuentasBancariasService = {
  // GET /api/v1/cuentas-bancarias
  async getCuentas(): Promise<CuentaBancariaItem[]> {
    const res = await apiFetch('/api/v1/cuentas-bancarias')
    if (!res.ok) {
      throw new Error(await formatApiError(res, 'Error al listar cuentas bancarias'))
    }
    const json = await res.json()
    const raw = Array.isArray(json.data) ? json.data : []
    return raw.map((c: any) => ({
      idCuenta: Number(c.idCuenta || c.id),
      banco: String(c.banco || ''),
      numeroCuenta: String(c.numeroCuenta || c.nroCuenta || ''),
      tipoCuenta: c.tipoCuenta || 'Cuenta Corriente',
      saldoInicial: Number(c.saldoInicial || 0),
      saldoCalculado: Number(c.saldoCalculado ?? c.saldoActual ?? c.saldo ?? 0),
      totalDepositos: Number(c.totalDepositos || 0),
      totalRetiros: Number(c.totalRetiros || 0),
      saldoActual: Number(c.saldoActual ?? c.saldoCalculado ?? c.saldo ?? 0)
    }))
  },

  // POST /api/v1/cuentas-bancarias
  async crear(payload: {
    banco: string
    numeroCuenta: string
    tipoCuenta?: string | null
    saldoInicial?: number
  }): Promise<CuentaBancariaItem> {
    const res = await apiFetch('/api/v1/cuentas-bancarias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        banco: payload.banco.trim(),
        numeroCuenta: payload.numeroCuenta.trim(),
        tipoCuenta: payload.tipoCuenta?.trim() || null,
        saldoInicial: Number(payload.saldoInicial || 0)
      })
    })

    if (!res.ok) {
      throw new Error(await formatApiError(res, 'Error al crear cuenta bancaria'))
    }
    const json = await res.json()
    return json.data
  },

  // PUT /api/v1/cuentas-bancarias/:id
  async actualizar(
    idCuenta: number,
    payload: {
      banco?: string
      numeroCuenta?: string
      tipoCuenta?: string | null
      saldoInicial?: number
    }
  ): Promise<CuentaBancariaItem> {
    const res = await apiFetch(`/api/v1/cuentas-bancarias/${idCuenta}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        banco: payload.banco?.trim(),
        numeroCuenta: payload.numeroCuenta?.trim(),
        tipoCuenta: payload.tipoCuenta?.trim() || null,
        saldoInicial: payload.saldoInicial !== undefined ? Number(payload.saldoInicial) : undefined
      })
    })

    if (!res.ok) {
      throw new Error(await formatApiError(res, 'Error al actualizar cuenta bancaria'))
    }
    const json = await res.json()
    return json.data
  }
}

// ============================================================================
// 3. MÓDULO DE MOVIMIENTOS BANCARIOS (/api/v1/movimientos-bancarios)
// ============================================================================

export interface MovimientoBancarioItem {
  idMovBancario: number
  idCuenta: number
  tipo: 'Deposito' | 'Retiro'
  monto: number
  concepto: string
  referencia?: string | null
  fecha: string
  conciliado: boolean
  estadoConciliacion: 'Pendiente' | 'Conciliado' | 'Discrepancia'
  diferencia?: number | null
  fechaConciliacion?: string | null
  cuenta?: { idCuenta: number; banco: string; numeroCuenta: string }
  movimientoInterno?: any
}

export const movimientosBancariosService = {
  // GET /api/v1/movimientos-bancarios
  async getMovimientos(params?: {
    idCuenta?: number
    desde?: string
    hasta?: string
    tipo?: 'Deposito' | 'Retiro'
    estado?: 'Pendiente' | 'Conciliado' | 'Discrepancia'
    page?: number
    limit?: number
  }): Promise<{ items: MovimientoBancarioItem[]; total: number; totalPages: number }> {
    const q = new URLSearchParams()
    if (params?.idCuenta) q.append('idCuenta', String(params.idCuenta))
    if (params?.desde) q.append('desde', params.desde)
    if (params?.hasta) q.append('hasta', params.hasta)
    if (params?.tipo) q.append('tipo', params.tipo)
    if (params?.estado) q.append('estado', params.estado)
    if (params?.page) q.append('page', String(params.page))
    if (params?.limit) q.append('limit', String(params.limit))
    const url = `/api/v1/movimientos-bancarios${q.toString() ? `?${q.toString()}` : ''}`

    const res = await apiFetch(url)
    if (!res.ok) {
      throw new Error(await formatApiError(res, 'Error al listar movimientos bancarios'))
    }
    const json = await res.json()
    const items = (json.data || []).map((m: any) => ({
      ...m,
      idMovBancario: Number(m.idMovBancario || m.id),
      idCuenta: Number(m.idCuenta),
      monto: Number(m.monto || 0),
      diferencia: m.diferencia !== null && m.diferencia !== undefined ? Number(m.diferencia) : null
    }))
    return {
      items,
      total: json.pagination?.total ?? items.length,
      totalPages: json.pagination?.totalPages ?? 1
    }
  },

  // POST /api/v1/movimientos-bancarios
  async registrar(payload: {
    idCuenta: number
    tipo: 'Deposito' | 'Retiro'
    monto: number
    concepto: string
    fecha?: string | Date
    referencia?: string | null
  }): Promise<MovimientoBancarioItem> {
    const res = await apiFetch('/api/v1/movimientos-bancarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idCuenta: Number(payload.idCuenta),
        tipo: payload.tipo,
        monto: Number(payload.monto),
        concepto: payload.concepto.trim(),
        fecha: payload.fecha ? new Date(payload.fecha).toISOString() : new Date().toISOString(),
        referencia: payload.referencia?.trim() || null
      })
    })

    if (!res.ok) {
      throw new Error(await formatApiError(res, 'Error al registrar movimiento bancario'))
    }
    const json = await res.json()
    return json.data
  },

  // PUT /api/v1/movimientos-bancarios/:id
  async actualizar(
    idMovBancario: number,
    payload: {
      monto?: number
      concepto?: string
      fecha?: string | Date
      referencia?: string | null
    }
  ): Promise<MovimientoBancarioItem> {
    const res = await apiFetch(`/api/v1/movimientos-bancarios/${idMovBancario}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monto: payload.monto !== undefined ? Number(payload.monto) : undefined,
        concepto: payload.concepto?.trim(),
        fecha: payload.fecha ? new Date(payload.fecha).toISOString() : undefined,
        referencia: payload.referencia !== undefined ? payload.referencia?.trim() || null : undefined
      })
    })

    if (!res.ok) {
      throw new Error(await formatApiError(res, 'Error al modificar movimiento bancario'))
    }
    const json = await res.json()
    return json.data
  }
}

// ============================================================================
// 4. MÓDULO DE CONCILIACIÓN BANCARIA (/api/v1/conciliacion)
// ============================================================================

export interface MovimientoInternoItem {
  idMovimiento: number
  tipo: 'Ingreso' | 'Egreso'
  monto: number
  descripcion: string
  fecha: string
  categoria?: { idCategoria: number; nombre: string; tipo: string } | null
  anulado: boolean
  vinculado: boolean
  movimientoBancarioVinculado?: any
}

export interface CotejoData {
  idCuenta: number
  movimientosBancarios: MovimientoBancarioItem[]
  movimientosInternos: MovimientoInternoItem[]
}

export interface ResumenConciliacionData {
  cantConciliados: number
  montoConciliados: number
  cantPendientes: number
  montoPendientes: number
  cantDiscrepancias: number
  montoDiscrepancias: number
  sumaDiferenciaDiscrepancias: number
}

export const conciliacionService = {
  // GET /api/v1/conciliacion/cotejo?idCuenta=X
  async getCotejo(params: { idCuenta: number; desde?: string; hasta?: string }): Promise<CotejoData> {
    const q = new URLSearchParams()
    q.append('idCuenta', String(params.idCuenta))
    if (params.desde) q.append('desde', params.desde)
    if (params.hasta) q.append('hasta', params.hasta)

    const res = await apiFetch(`/api/v1/conciliacion/cotejo?${q.toString()}`)
    if (!res.ok) {
      throw new Error(await formatApiError(res, 'Error al obtener cotejo de conciliación'))
    }
    const json = await res.json()
    const d = json.data || {}

    const bancarios: MovimientoBancarioItem[] = (d.movimientosBancarios || []).map((mb: any) => ({
      ...mb,
      idMovBancario: Number(mb.idMovBancario),
      idCuenta: Number(mb.idCuenta),
      monto: Number(mb.monto || 0),
      diferencia: mb.diferencia !== null && mb.diferencia !== undefined ? Number(mb.diferencia) : null
    }))

    const internos: MovimientoInternoItem[] = (d.movimientosInternos || []).map((mi: any) => ({
      ...mi,
      idMovimiento: Number(mi.idMovimiento),
      monto: Number(mi.monto || 0)
    }))

    return {
      idCuenta: Number(d.idCuenta || params.idCuenta),
      movimientosBancarios: bancarios,
      movimientosInternos: internos
    }
  },

  // GET /api/v1/conciliacion/estado?idCuenta=X
  async getEstado(idCuenta?: number): Promise<ResumenConciliacionData> {
    const q = idCuenta ? `?idCuenta=${idCuenta}` : ''
    const res = await apiFetch(`/api/v1/conciliacion/estado${q}`)
    if (!res.ok) {
      throw new Error(await formatApiError(res, 'Error al consultar resumen de conciliación'))
    }
    const json = await res.json()
    const d = json.data || {}
    return {
      cantConciliados: Number(d.cantConciliados || 0),
      montoConciliados: Number(d.montoConciliados || 0),
      cantPendientes: Number(d.cantPendientes || 0),
      montoPendientes: Number(d.montoPendientes || 0),
      cantDiscrepancias: Number(d.cantDiscrepancias || 0),
      montoDiscrepancias: Number(d.montoDiscrepancias || 0),
      sumaDiferenciaDiscrepancias: Number(d.sumaDiferenciaDiscrepancias || 0)
    }
  },

  // POST /api/v1/conciliacion/vincular
  async vincular(idMovBancario: number, idMovimiento: number): Promise<void> {
    const res = await apiFetch('/api/v1/conciliacion/vincular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idMovBancario: Number(idMovBancario),
        idMovimiento: Number(idMovimiento)
      })
    })

    if (!res.ok) {
      throw new Error(await formatApiError(res, 'Error al vincular movimientos'))
    }
  },

  // DELETE /api/v1/conciliacion/desvincular/:idMovBancario
  async desvincular(idMovBancario: number): Promise<void> {
    const res = await apiFetch(`/api/v1/conciliacion/desvincular/${idMovBancario}`, {
      method: 'DELETE'
    })

    if (!res.ok) {
      throw new Error(await formatApiError(res, 'Error al desvincular movimiento bancario'))
    }
  }
}

// ============================================================================
// 5. HELPER DE PERMISOS SEGÚN MAPA_PERMISOS_FINANZAS
// ============================================================================

export type ModuloFinanzas = 'caja' | 'bancos' | 'cuentas_bancarias' | 'movimientos_bancarios' | 'conciliacion'

export function puedeEscribirFinanzas(modulo: ModuloFinanzas, rol?: string | null): boolean {
  if (!rol) return false
  const r = rol.toLowerCase()
  // Según MAPA_PERMISOS_FINANZAS de finanzas-permissions.middleware.ts: solo 'Administrador' escribe
  return r === 'administrador'
}

export function puedeLeerFinanzas(modulo: ModuloFinanzas, rol?: string | null): boolean {
  if (!rol) return false
  const r = rol.toLowerCase()
  // 'Administrador' y 'Directorio' leen
  return r === 'administrador' || r === 'directorio'
}
