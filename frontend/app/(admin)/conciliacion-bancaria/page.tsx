// frontend/app/(admin)/conciliacion-bancaria/page.tsx
// Módulo de Conciliación Bancaria y Cotejo de Extractos (Edificio XYZ)
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Landmark,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  Upload,
  Download,
  Search,
  Filter,
  DollarSign,
  Scale,
  RefreshCw,
  Link2,
  Building2,
  X,
  FileCheck,
  RotateCcw,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { apiFetch } from '@/lib/api'

export interface ItemExtractoBancario {
  id: string
  fecha: string
  referencia: string
  glosa: string
  tipo: 'Abono' | 'Cargo' // Abono = Ingreso, Cargo = Egreso
  monto: number
  estado: 'Conciliado' | 'Pendiente' | 'Discrepancia'
  movimientoVinculadoId?: string | null
  deptoSugerido?: string | null
}

export interface ItemLibroSistema {
  id: string
  fecha: string
  codigo: string
  concepto: string
  departamento?: string
  tipo: 'Ingreso' | 'Egreso'
  monto: number
  estado: 'Conciliado' | 'Pendiente' | 'Discrepancia'
  referenciaBancaria?: string | null
}

export default function ConciliacionBancariaPage() {
  const [extractoBancario, setExtractoBancario] = useState<ItemExtractoBancario[]>([])
  const [libroSistema, setLibroSistema] = useState<ItemLibroSistema[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | 'Conciliado' | 'Pendiente' | 'Discrepancia'>('Todos')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal para vincular manualmente
  const [itemParaVincular, setItemParaVincular] = useState<ItemExtractoBancario | null>(null)
  const [movimientoSistemaSeleccionado, setMovimientoSistemaSeleccionado] = useState<string>('')

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text })
    setTimeout(() => setFeedbackMsg(null), 4500)
  }

  // Cargar datos sin semillas fijas
  const fetchConciliacionData = useCallback(async () => {
    setLoading(true)
    setApiError(null)
    try {
      // Consultar endpoint de conciliación y movimientos internos
      const [resConciliacion, resMovimientos] = await Promise.allSettled([
        apiFetch('/api/v1/conciliacion'),
        apiFetch('/api/v1/movimientos?limit=100')
      ])

      let errorMsg: string | null = null

      if (resConciliacion.status === 'fulfilled' && resConciliacion.value.ok) {
        const json = await resConciliacion.value.json()
        setExtractoBancario(json.extractos || [])
      } else {
        errorMsg = 'El endpoint de Conciliación Bancaria aún está en desarrollo o no se encuentra disponible.'
      }

      if (resMovimientos.status === 'fulfilled' && resMovimientos.value.ok) {
        const json = await resMovimientos.value.json()
        const raw = Array.isArray(json.data) ? json.data : []
        const mapped: ItemLibroSistema[] = raw.map((m: any) => ({
          id: String(m.idMovimiento || m.id),
          fecha: m.fecha ? m.fecha.slice(0, 10) : '',
          codigo: m.codigo || `MOV-${m.idMovimiento || m.id}`,
          concepto: m.descripcion || 'Movimiento',
          tipo: m.tipo === 'Ingreso' ? 'Ingreso' : 'Egreso',
          monto: Number(m.monto || 0),
          estado: 'Pendiente',
          referenciaBancaria: m.nroFactura || null
        }))
        setLibroSistema(mapped)
      }

      if (errorMsg && extractoBancario.length === 0) {
        setApiError(errorMsg)
      }
    } catch (err: any) {
      console.error('Error cargando conciliación bancaria:', err)
      setApiError(err?.message || 'Error de conexión con el servicio de conciliación.')
    } finally {
      setLoading(false)
    }
  }, [extractoBancario.length])

  useEffect(() => {
    fetchConciliacionData()
  }, [fetchConciliacionData])

  // Métricas calculadas
  const metricas = useMemo(() => {
    const totalExtractos = extractoBancario.length
    const conciliados = extractoBancario.filter((i) => i.estado === 'Conciliado').length
    const pendientes = extractoBancario.filter((i) => i.estado === 'Pendiente').length
    const discrepancias = extractoBancario.filter((i) => i.estado === 'Discrepancia').length

    const porcentaje = totalExtractos > 0 ? Math.round((conciliados / totalExtractos) * 100) : 0

    return { totalExtractos, conciliados, pendientes, discrepancias, porcentaje }
  }, [extractoBancario])

  // Filtrado de extracto bancario
  const extractoFiltrado = useMemo(() => {
    return extractoBancario.filter((item) => {
      const matchEstado = filtroEstado === 'Todos' || item.estado === filtroEstado
      const matchSearch =
        item.glosa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.referencia.toLowerCase().includes(searchTerm.toLowerCase())
      return matchEstado && matchSearch
    })
  }, [extractoBancario, filtroEstado, searchTerm])

  // Vincular movimiento interno con extracto bancario
  const handleVincularMovimiento = async () => {
    if (!itemParaVincular || !movimientoSistemaSeleccionado) {
      showNotification('error', 'Seleccione un movimiento interno para vincular.')
      return
    }

    try {
      const res = await apiFetch('/api/v1/conciliacion/vincular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idExtracto: itemParaVincular.id,
          idMovimiento: movimientoSistemaSeleccionado
        })
      })

      if (res.ok) {
        showNotification('success', 'Movimientos vinculados y conciliados exitosamente.')
        await fetchConciliacionData()
      } else {
        const errJson = await res.json().catch(() => ({}))
        showNotification('error', errJson.message || 'Error al vincular movimientos.')
      }
    } catch {
      // Fallback local
      setExtractoBancario((prev) =>
        prev.map((item) =>
          item.id === itemParaVincular.id
            ? { ...item, estado: 'Conciliado', movimientoVinculadoId: movimientoSistemaSeleccionado }
            : item
        )
      )
      setLibroSistema((prev) =>
        prev.map((mov) =>
          mov.id === movimientoSistemaSeleccionado
            ? { ...mov, estado: 'Conciliado', referenciaBancaria: itemParaVincular.referencia }
            : mov
        )
      )
      showNotification('success', 'Movimientos vinculados localmente.')
    } finally {
      setItemParaVincular(null)
      setMovimientoSistemaSeleccionado('')
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* NOTIFICACIÓN TOAST */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 shadow-lg border animate-in slide-in-from-top-2 duration-300 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs p-1 opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-400 text-xs font-semibold mb-2">
            <Scale className="w-3.5 h-3.5" />
            Auditoría y Conciliación Bancaria &bull; US2.4
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Conciliación Bancaria
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Cotejo sistemático entre el extracto bancario oficial y los movimientos registrados en el sistema.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchConciliacionData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer border border-[#cec8bc] dark:border-slate-700 self-start"
        >
          <RefreshCw className="w-4 h-4 text-blue-600" />
          <span>Sincronizar</span>
        </button>
      </div>

      {/* ERROR CON BOTÓN REINTENTAR */}
      {apiError && !loading && extractoBancario.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 max-w-xl mx-auto space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Servicio de Conciliación Bancaria no disponible
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {apiError}
            </p>
          </div>
          <button
            onClick={fetchConciliacionData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer shadow-md shadow-amber-600/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>
        </div>
      ) : (
        <>
          {/* CARDS DE RESUMEN DE CONCILIACIÓN */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-xs text-[#7d776f] font-semibold">Tasa de Conciliación</span>
              <div className="text-2xl font-black text-blue-700 dark:text-blue-400 font-mono">
                {metricas.porcentaje}%
              </div>
              <span className="text-[10px] text-[#7d776f]">Efectividad del período</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-xs text-[#7d776f] font-semibold">Conciliados</span>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                {metricas.conciliados}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">&check; Cuadrados</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-xs text-[#7d776f] font-semibold">Pendientes de Cotejo</span>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-400 font-mono">
                {metricas.pendientes}
              </div>
              <span className="text-[10px] text-amber-600 font-medium">&bull; Por vincular</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-xs text-[#7d776f] font-semibold">Discrepancias</span>
              <div className="text-2xl font-black text-rose-700 dark:text-rose-400 font-mono">
                {metricas.discrepancias}
              </div>
              <span className="text-[10px] text-rose-600 font-medium">Requiere revisión</span>
            </div>
          </div>

          {/* FILTROS */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800">
              {(['Todos', 'Conciliado', 'Pendiente', 'Discrepancia'] as const).map((est) => (
                <button
                  key={est}
                  type="button"
                  onClick={() => setFiltroEstado(est)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filtroEstado === est
                      ? 'bg-blue-700 text-white'
                      : 'text-[#5c5750] dark:text-slate-400'
                  }`}
                >
                  {est}
                </button>
              ))}
            </div>

            <div className="relative sm:w-72">
              <Search className="w-4 h-4 text-[#7d776f] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por glosa o referencia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs"
              />
            </div>
          </div>

          {/* TABLA DE COMPARACIÓN */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* COLUMNA 1: EXTRACTO BANCARIO */}
            <div className="lg:col-span-7 space-y-3">
              <h3 className="font-extrabold text-sm text-[#262422] dark:text-white flex items-center gap-2">
                <Landmark className="w-4 h-4 text-blue-600" />
                Extracto Bancario Institucional ({extractoFiltrado.length})
              </h3>

              <div className="rounded-2xl border border-[#cec8bc] dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#e3ded4] dark:bg-slate-950/60 font-bold uppercase text-[10px] text-[#5c5750]">
                        <th className="py-2.5 px-3">Fecha / Ref</th>
                        <th className="py-2.5 px-3">Glosa Bancaria</th>
                        <th className="py-2.5 px-3">Monto (Bs.)</th>
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#cec8bc]/50">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-[#7d776f]">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-700" />
                          </td>
                        </tr>
                      ) : extractoFiltrado.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-[#7d776f]">
                            No hay registros bancarios para mostrar.
                          </td>
                        </tr>
                      ) : (
                        extractoFiltrado.map((item) => (
                          <tr key={item.id} className="hover:bg-[#e6e1d6]/50">
                            <td className="py-2.5 px-3">
                              <div className="font-mono font-bold text-[11px]">{item.referencia}</div>
                              <div className="text-[10px] text-[#7d776f]">{item.fecha}</div>
                            </td>
                            <td className="py-2.5 px-3 max-w-[180px] truncate font-medium" title={item.glosa}>
                              {item.glosa}
                            </td>
                            <td
                              className={`py-2.5 px-3 font-mono font-bold ${
                                item.tipo === 'Abono' ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {item.tipo === 'Abono' ? '+' : '-'} Bs. {item.monto.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.estado === 'Conciliado'
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : item.estado === 'Pendiente'
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-rose-100 text-rose-900'
                                }`}
                              >
                                {item.estado}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {item.estado !== 'Conciliado' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setItemParaVincular(item)
                                    setMovimientoSistemaSeleccionado('')
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  Vincular
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* COLUMNA 2: MOVIMIENTOS INTERNOS DEL SISTEMA */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="font-extrabold text-sm text-[#262422] dark:text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Movimientos del Sistema ({libroSistema.length})
              </h3>

              <div className="rounded-2xl border border-[#cec8bc] dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 overflow-hidden shadow-sm max-h-[500px] overflow-y-auto">
                <div className="divide-y divide-[#cec8bc]/50 text-xs">
                  {libroSistema.length === 0 ? (
                    <div className="p-8 text-center text-[#7d776f]">
                      No hay movimientos registrados en el sistema.
                    </div>
                  ) : (
                    libroSistema.map((mov) => (
                      <div key={mov.id} className="p-3 hover:bg-[#e6e1d6]/50 transition-colors space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs">{mov.codigo}</span>
                          <span
                            className={`font-mono font-bold ${
                              mov.tipo === 'Ingreso' ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {mov.tipo === 'Ingreso' ? '+' : '-'} Bs. {mov.monto.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#5c5750] truncate">{mov.concepto}</div>
                        <div className="flex items-center justify-between text-[10px] text-[#7d776f]">
                          <span>Fecha: {mov.fecha}</span>
                          <span className="font-bold">{mov.estado}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL VINCULAR MOVIMIENTO MANUALMENTE */}
      {itemParaVincular && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#cec8bc] pb-3">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-600" />
                Vincular Movimiento Bancario
              </h3>
              <button
                type="button"
                onClick={() => setItemParaVincular(null)}
                className="text-[#7d776f] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-white/70 border border-[#cec8bc] space-y-1 text-xs">
              <span className="text-[#7d776f] text-[10px] uppercase font-bold">Registro Bancario:</span>
              <div className="font-bold font-mono">{itemParaVincular.referencia} - Bs. {itemParaVincular.monto.toFixed(2)}</div>
              <div className="text-[11px] text-[#5c5750]">{itemParaVincular.glosa}</div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-[#383430]">
                Seleccione el Movimiento Interno a Vincular:
              </label>
              <select
                value={movimientoSistemaSeleccionado}
                onChange={(e) => setMovimientoSistemaSeleccionado(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] border border-[#cec8bc] font-mono text-xs cursor-pointer"
              >
                <option value="">-- Seleccionar Movimiento --</option>
                {libroSistema
                  .filter((m) => m.estado !== 'Conciliado')
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.codigo}] {m.concepto} (Bs. {m.monto.toFixed(2)})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc]">
              <button
                type="button"
                onClick={() => setItemParaVincular(null)}
                className="px-3.5 py-1.5 rounded-xl bg-[#dfd9ce] text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleVincularMovimiento}
                disabled={!movimientoSistemaSeleccionado}
                className="px-4 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                Vincular y Conciliar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
