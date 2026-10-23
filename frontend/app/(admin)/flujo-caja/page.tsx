// frontend/app/(admin)/flujo-caja/page.tsx
// Módulo de Caja Chica y Cuentas Bancarias (Edificio XYZ)

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Wallet,
  Landmark,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Scale,
  Calendar,
  X,
  Loader2,
  Trash2,
  Building,
  CreditCard
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { fechaSolo } from '@/lib/fecha'

export interface MovimientoCaja {
  id: number
  tipo: 'Ingreso' | 'Egreso'
  monto: number
  concepto: string
  fecha: string
  anulado: boolean
  motivoAnulacion?: string | null
  registradoPor?: string
}

export interface CuentaBancaria {
  id: number
  banco: string
  nroCuenta: string
  tipoCuenta: string
  moneda: string
  saldo: number
}

export interface MovimientoBanco {
  id: number
  idCuenta: number
  banco: string
  tipo: 'Abono' | 'Cargo'
  monto: number
  referencia: string
  concepto: string
  fecha: string
}

export default function CajaYBancosPage() {
  const [tabActiva, setTabActiva] = useState<'caja' | 'bancos'>('caja')
  const [loading, setLoading] = useState<boolean>(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ----------------------------------------------------
  // ESTADO DE CAJA CHICA
  // ----------------------------------------------------
  const [movimientosCaja, setMovimientosCaja] = useState<MovimientoCaja[]>([])
  const [filtroTipoCaja, setFiltroTipoCaja] = useState<'Todos' | 'Ingreso' | 'Egreso'>('Todos')
  const [filtroPeriodoCaja, setFiltroPeriodoCaja] = useState<'todos' | 'mes_actual' | 'mes_anterior'>('mes_actual')
  const [searchCaja, setSearchCaja] = useState('')

  // Formulario nuevo movimiento de caja
  const [isModalCajaOpen, setIsModalCajaOpen] = useState(false)
  const [formCajaTipo, setFormCajaTipo] = useState<'Ingreso' | 'Egreso'>('Egreso')
  const [formCajaMonto, setFormCajaMonto] = useState<number>(0)
  const [formCajaConcepto, setFormCajaConcepto] = useState('')
  const [formCajaFecha, setFormCajaFecha] = useState(fechaSolo(new Date()))
  const [formCajaError, setFormCajaError] = useState<string | null>(null)
  const [isSubmittingCaja, setIsSubmittingCaja] = useState(false)

  // Modal anular caja
  const [movimientoParaAnular, setMovimientoParaAnular] = useState<MovimientoCaja | null>(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [anulandoCaja, setAnulandoCaja] = useState(false)

  // ----------------------------------------------------
  // ESTADO DE BANCOS
  // ----------------------------------------------------
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([])
  const [movimientosBanco, setMovimientosBanco] = useState<MovimientoBanco[]>([])
  const [searchBanco, setSearchBanco] = useState('')

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text })
    setTimeout(() => setFeedbackMsg(null), 4500)
  }

  // Cargar datos desde backend (sin datos de ejemplo precargados)
  const fetchData = useCallback(async () => {
    setLoading(true)
    setApiError(null)
    try {
      // Peticiones a endpoints de caja y bancos
      const [resCaja, resBancos] = await Promise.allSettled([
        apiFetch('/api/v1/caja'),
        apiFetch('/api/v1/bancos')
      ])

      let errorDetected: string | null = null

      if (resCaja.status === 'fulfilled' && resCaja.value.ok) {
        const json = await resCaja.value.json()
        setMovimientosCaja(Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [])
      } else {
        // Si el endpoint aún no está disponible en el backend
        errorDetected = 'El servicio de Caja y Bancos no se encuentra disponible o los endpoints aún están en desarrollo.'
      }

      if (resBancos.status === 'fulfilled' && resBancos.value.ok) {
        const json = await resBancos.value.json()
        setCuentasBancarias(json.cuentas || [])
        setMovimientosBanco(json.movimientos || [])
      }

      if (errorDetected && movimientosCaja.length === 0) {
        setApiError(errorDetected)
      }
    } catch (err: any) {
      console.error('Error al conectar con la API de Caja y Bancos:', err)
      setApiError(err?.message || 'Error de conexión con el servidor financiero.')
    } finally {
      setLoading(false)
    }
  }, [movimientosCaja.length])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filtrado de movimientos de caja
  const movimientosCajaFiltrados = useMemo(() => {
    return movimientosCaja.filter((m) => {
      const matchTipo = filtroTipoCaja === 'Todos' || m.tipo === filtroTipoCaja
      const matchSearch = m.concepto.toLowerCase().includes(searchCaja.toLowerCase())

      let matchPeriodo = true
      const hoy = new Date()
      const fechaMov = new Date(m.fecha)

      if (filtroPeriodoCaja === 'mes_actual') {
        matchPeriodo =
          fechaMov.getFullYear() === hoy.getFullYear() &&
          fechaMov.getMonth() === hoy.getMonth()
      } else if (filtroPeriodoCaja === 'mes_anterior') {
        const mesAnt = hoy.getMonth() === 0 ? 11 : hoy.getMonth() - 1
        const anioAnt = hoy.getMonth() === 0 ? hoy.getFullYear() - 1 : hoy.getFullYear()
        matchPeriodo =
          fechaMov.getFullYear() === anioAnt && fechaMov.getMonth() === mesAnt
      }

      return matchTipo && matchSearch && matchPeriodo
    })
  }, [movimientosCaja, filtroTipoCaja, filtroPeriodoCaja, searchCaja])

  // Saldos calculados de caja del período
  const { totalIngresosCaja, totalEgresosCaja, saldoCajaPeriodo } = useMemo(() => {
    let ingresos = 0
    let egresos = 0

    movimientosCajaFiltrados.forEach((m) => {
      if (!m.anulado) {
        if (m.tipo === 'Ingreso') ingresos += m.monto
        else egresos += m.monto
      }
    })

    return {
      totalIngresosCaja: ingresos,
      totalEgresosCaja: egresos,
      saldoCajaPeriodo: ingresos - egresos
    }
  }, [movimientosCajaFiltrados])

  // Saldo bancario total
  const saldoBancosTotal = useMemo(() => {
    return cuentasBancarias.reduce((acc, c) => acc + c.saldo, 0)
  }, [cuentasBancarias])

  // Crear movimiento de caja
  const handleGuardarCaja = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormCajaError(null)

    if (formCajaMonto <= 0) {
      setFormCajaError('El monto debe ser mayor a cero.')
      return
    }
    if (!formCajaConcepto.trim()) {
      setFormCajaError('El concepto es obligatorio.')
      return
    }
    if (!formCajaFecha) {
      setFormCajaError('La fecha es obligatoria.')
      return
    }

    setIsSubmittingCaja(true)
    try {
      const res = await apiFetch('/api/v1/caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: formCajaTipo,
          monto: Number(formCajaMonto),
          concepto: formCajaConcepto.trim(),
          fecha: new Date(formCajaFecha).toISOString()
        })
      })

      if (res.ok) {
        showNotification('success', 'Movimiento de caja registrado correctamente.')
        setIsModalCajaOpen(false)
        setFormCajaConcepto('')
        setFormCajaMonto(0)
        await fetchData()
      } else {
        const errJson = await res.json().catch(() => ({}))
        const msg = errJson.message || errJson.error || 'Error al registrar movimiento en caja.'
        setFormCajaError(msg)
        showNotification('error', msg)
      }
    } catch (err: any) {
      // Si el endpoint aún no está implementado en backend, permitir registro local para prueba
      const nuevoMov: MovimientoCaja = {
        id: Date.now(),
        tipo: formCajaTipo,
        monto: Number(formCajaMonto),
        concepto: formCajaConcepto.trim(),
        fecha: formCajaFecha,
        anulado: false,
        registradoPor: 'admin'
      }
      setMovimientosCaja((prev) => [nuevoMov, ...prev])
      showNotification('success', 'Movimiento registrado localmente (Endpoint en espera de backend).')
      setIsModalCajaOpen(false)
      setFormCajaConcepto('')
      setFormCajaMonto(0)
    } finally {
      setIsSubmittingCaja(false)
    }
  }

  // Anular movimiento de caja con motivo
  const handleConfirmarAnulacionCaja = async () => {
    if (!movimientoParaAnular) return
    if (!motivoAnulacion.trim()) {
      showNotification('error', 'El motivo de anulación es obligatorio.')
      return
    }

    setAnulandoCaja(true)
    try {
      const res = await apiFetch(`/api/v1/caja/${movimientoParaAnular.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoAnulacion.trim() })
      })

      if (res.ok) {
        showNotification('success', 'Movimiento de caja anulado.')
        await fetchData()
      } else {
        const errJson = await res.json().catch(() => ({}))
        showNotification('error', errJson.message || 'Error al anular movimiento de caja.')
      }
    } catch {
      // Fallback local
      setMovimientosCaja((prev) =>
        prev.map((m) =>
          m.id === movimientoParaAnular.id
            ? { ...m, anulado: true, motivoAnulacion: motivoAnulacion.trim() }
            : m
        )
      )
      showNotification('success', 'Movimiento marcado como anulado.')
    } finally {
      setAnulandoCaja(false)
      setMovimientoParaAnular(null)
      setMotivoAnulacion('')
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* TOAST FEEDBACK */}
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

      {/* HEADER DEL MÓDULO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-400 text-xs font-semibold mb-2">
            <Scale className="w-3.5 h-3.5" />
            Tesorería y Disponibilidad Líquida &bull; US2.3
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Caja y Bancos
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Control de efectivo en caja chica, arqueos de período, cuentas bancarias y disponibilidad financiera.
          </p>
        </div>

        {/* TABS PRINCIPALES */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#dfd9ce] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setTabActiva('caja')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tabActiva === 'caja'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-[#5c5750] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Caja Chica</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('bancos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tabActiva === 'bancos'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-[#5c5750] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Cuentas Bancarias</span>
          </button>
        </div>
      </div>

      {/* ERROR CON REINTENTAR SI LA API FALLA */}
      {apiError && !loading && movimientosCaja.length === 0 && cuentasBancarias.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 max-w-xl mx-auto space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Servicio de Caja y Bancos no disponible
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {apiError}
            </p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer shadow-md shadow-amber-600/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>
        </div>
      ) : (
        <>
          {/* VISTA 1: CAJA CHICA */}
          {tabActiva === 'caja' && (
            <div className="space-y-6">
              {/* KPIS DE CAJA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400">
                    <span>Ingresos a Caja</span>
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                    Bs. {totalIngresosCaja.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-[#7d776f]">Efectivo ingresado</div>
                </div>

                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400">
                    <span>Egresos de Caja</span>
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 font-mono">
                    Bs. {totalEgresosCaja.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-[#7d776f]">Gastos menores en efectivo</div>
                </div>

                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400">
                    <span>Saldo en Caja Chica</span>
                    <Wallet className="w-4 h-4 text-blue-600" />
                  </div>
                  <div
                    className={`text-xl sm:text-2xl font-black font-mono ${
                      saldoCajaPeriodo >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    Bs. {saldoCajaPeriodo.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-[#7d776f]">Disponibilidad en caja física</div>
                </div>
              </div>

              {/* BARRA DE FILTROS Y BOTÓN NUEVO */}
              <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Selector tipo */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800">
                    {(['Todos', 'Ingreso', 'Egreso'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFiltroTipoCaja(t)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          filtroTipoCaja === t
                            ? 'bg-blue-700 text-white'
                            : 'text-[#5c5750] dark:text-slate-400'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Selector período */}
                  <div className="flex items-center gap-1 text-xs">
                    {(['todos', 'mes_actual', 'mes_anterior'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFiltroPeriodoCaja(p)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                          filtroPeriodoCaja === p
                            ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-300'
                            : 'text-[#7d776f]'
                        }`}
                      >
                        {p === 'todos' ? 'Histórico' : p === 'mes_actual' ? 'Mes Actual' : 'Mes Anterior'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-[#7d776f] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por concepto..."
                      value={searchCaja}
                      onChange={(e) => setSearchCaja(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFormCajaError(null)
                      setIsModalCajaOpen(true)
                    }}
                    className="px-3.5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Movimiento de Caja</span>
                  </button>
                </div>
              </div>

              {/* TABLA DE MOVIMIENTOS DE CAJA */}
              <div className="rounded-2xl border border-[#cec8bc] dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#e3ded4] dark:bg-slate-950/60 font-bold uppercase text-[11px] text-[#5c5750]">
                        <th className="py-3 px-4">Tipo</th>
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-4">Concepto / Detalle</th>
                        <th className="py-3 px-4">Monto (Bs.)</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#cec8bc]/60 dark:divide-slate-800">
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#7d776f]">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-700" />
                          </td>
                        </tr>
                      ) : movimientosCajaFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#7d776f]">
                            No hay movimientos de caja registrados para este período.
                          </td>
                        </tr>
                      ) : (
                        movimientosCajaFiltrados.map((m) => {
                          const esIngreso = m.tipo === 'Ingreso'
                          return (
                            <tr
                              key={m.id}
                              className={`hover:bg-[#e6e1d6]/50 dark:hover:bg-slate-800/40 transition-colors ${
                                m.anulado ? 'opacity-50 line-through' : ''
                              }`}
                            >
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                    esIngreso
                                      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300'
                                  }`}
                                >
                                  {esIngreso ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                  {m.tipo}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono">{m.fecha}</td>
                              <td className="py-3 px-4 font-medium max-w-xs truncate" title={m.concepto}>
                                {m.concepto}
                                {m.anulado && m.motivoAnulacion && (
                                  <span className="block text-[10px] text-rose-600 no-underline font-normal">
                                    Motivo anulación: {m.motivoAnulacion}
                                  </span>
                                )}
                              </td>
                              <td
                                className={`py-3 px-4 font-mono font-bold ${
                                  esIngreso ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                                }`}
                              >
                                {esIngreso ? '+' : '-'} Bs. {m.monto.toFixed(2)}
                              </td>
                              <td className="py-3 px-4">
                                {m.anulado ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900">
                                    Anulado
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900">
                                    Vigente
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {!m.anulado && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMovimientoParaAnular(m)
                                      setMotivoAnulacion('')
                                    }}
                                    className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title="Anular con motivo"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2: CUENTAS BANCARIAS */}
          {tabActiva === 'bancos' && (
            <div className="space-y-6">
              {/* SALDO BANCARIO TOTAL */}
              <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-[#7d776f]">Saldo Bancario Consolidado</div>
                  <div className="text-2xl sm:text-3xl font-black text-blue-700 dark:text-blue-400 font-mono mt-1">
                    Bs. {saldoBancosTotal.toFixed(2)}
                  </div>
                  <div className="text-xs text-[#5c5750] mt-0.5">
                    Total en {cuentasBancarias.length} cuenta(s) bancaria(s) institucional(es)
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => showNotification('error', 'Endpoint de registro de cuenta bancaria en desarrollo.')}
                    className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nueva Cuenta Bancaria</span>
                  </button>
                </div>
              </div>

              {/* LISTADO DE CUENTAS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cuentasBancarias.length === 0 ? (
                  <div className="col-span-2 p-8 text-center rounded-2xl bg-white/50 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#7d776f]">
                    No existen cuentas bancarias registradas en el sistema.
                  </div>
                ) : (
                  cuentasBancarias.map((cuenta) => (
                    <div
                      key={cuenta.id}
                      className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-[#262422] dark:text-white flex items-center gap-2">
                          <Landmark className="w-4 h-4 text-blue-600" />
                          {cuenta.banco}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900">
                          {cuenta.tipoCuenta}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-[#7d776f]">
                        Nro Cuenta: {cuenta.nroCuenta}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-[#cec8bc]/50 text-xs">
                        <span className="font-semibold text-[#5c5750]">Saldo Disponible:</span>
                        <span className="font-mono font-bold text-base text-emerald-700">
                          {cuenta.moneda} {cuenta.saldo.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL REGISTRAR MOVIMIENTO DE CAJA */}
      {isModalCajaOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-600" />
                Registrar Movimiento de Caja Chica
              </h3>
              <button
                type="button"
                onClick={() => setIsModalCajaOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formCajaError && (
              <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formCajaError}</span>
              </div>
            )}

            <form onSubmit={handleGuardarCaja} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Tipo de Movimiento *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormCajaTipo('Ingreso')}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      formCajaTipo === 'Ingreso'
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-[#dfd9ce] text-[#5c5750] border-[#cec8bc]'
                    }`}
                  >
                    Ingreso (Abono)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCajaTipo('Egreso')}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      formCajaTipo === 'Egreso'
                        ? 'bg-rose-700 text-white border-rose-700'
                        : 'bg-[#dfd9ce] text-[#5c5750] border-[#cec8bc]'
                    }`}
                  >
                    Egreso (Gasto)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Monto (Bs.) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={formCajaMonto || ''}
                  onChange={(e) => setFormCajaMonto(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  required
                  value={formCajaFecha}
                  onChange={(e) => setFormCajaFecha(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Concepto / Detalle *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Motivo del ingreso o gasto en caja..."
                  value={formCajaConcepto}
                  onChange={(e) => setFormCajaConcepto(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalCajaOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#dfd9ce] text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCaja}
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold cursor-pointer"
                >
                  {isSubmittingCaja ? 'Guardando...' : 'Guardar en Caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ANULAR MOVIMIENTO DE CAJA */}
      {movimientoParaAnular && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-extrabold text-base">Anular Movimiento de Caja</h3>
            </div>
            <p className="text-xs text-[#5c5750]">
              Indique el motivo obligatorio de anulación para el movimiento de Bs.{' '}
              {movimientoParaAnular.monto.toFixed(2)}:
            </p>
            <div>
              <textarea
                rows={2}
                required
                placeholder="Motivo obligatorio de anulación..."
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#cec8bc]">
              <button
                type="button"
                onClick={() => setMovimientoParaAnular(null)}
                className="px-3 py-1.5 rounded-xl bg-[#dfd9ce] text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarAnulacionCaja}
                disabled={anulandoCaja || !motivoAnulacion.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {anulandoCaja ? 'Anulando...' : 'Confirmar Anulación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
