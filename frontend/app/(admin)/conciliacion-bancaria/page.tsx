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
  Search,
  Filter,
  DollarSign,
  Scale,
  RefreshCw,
  Link2,
  Unlink,
  Sparkles,
  Building2,
  X,
  FileCheck,
  RotateCcw,
  AlertCircle,
  Loader2,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Download
} from 'lucide-react'
import { fechaSolo } from '@/lib/fecha'
import {
  conciliacionService,
  cuentasBancariasService,
  puedeEscribirFinanzas,
  extractErrorMessage,
  CuentaBancariaItem,
  MovimientoBancarioItem,
  MovimientoInternoItem,
  ResumenConciliacionData
} from '@/lib/services/finanzas.service'

export default function ConciliacionBancariaPage() {
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancariaItem[]>([])
  const [cuentaSeleccionadaId, setCuentaSeleccionadaId] = useState<number | null>(null)
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')

  const [movimientosBancarios, setMovimientosBancarios] = useState<MovimientoBancarioItem[]>([])
  const [movimientosInternos, setMovimientosInternos] = useState<MovimientoInternoItem[]>([])
  const [resumenEstado, setResumenEstado] = useState<ResumenConciliacionData | null>(null)

  const [loading, setLoading] = useState<boolean>(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Rol del usuario actual
  const [rolUsuario, setRolUsuario] = useState<string>('Administrador')
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rol = localStorage.getItem('user_role') || 'Administrador'
      setRolUsuario(rol)
    }
  }, [])

  const puedeEscribir = useMemo(
    () => puedeEscribirFinanzas('conciliacion', rolUsuario),
    [rolUsuario]
  )

  // Filtros de tabla
  const [filtroEstado, setFiltroEstado] = useState<
    'Todos' | 'Conciliado' | 'Pendiente' | 'Discrepancia'
  >('Todos')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal para vincular manualmente
  const [itemParaVincular, setItemParaVincular] = useState<MovimientoBancarioItem | null>(null)
  const [movimientoSistemaSeleccionado, setMovimientoSistemaSeleccionado] = useState<number | ''>(
    ''
  )
  const [vinculando, setVinculando] = useState(false)
  const [modalVincularError, setModalVincularError] = useState<string | null>(null)

  // Estado de acción rápida (aceptar sugerencia / desvincular)
  const [accionEnProgresoId, setAccionEnProgresoId] = useState<number | null>(null)

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text })
    setTimeout(() => setFeedbackMsg(null), 5000)
  }

  // Cargar lista de cuentas bancarias institucionales
  useEffect(() => {
    async function cargarCuentas() {
      try {
        const cuentas = await cuentasBancariasService.getCuentas()
        setCuentasBancarias(cuentas)
        if (cuentas.length > 0 && cuentaSeleccionadaId === null) {
          setCuentaSeleccionadaId(cuentas[0].idCuenta)
        }
      } catch (err: unknown) {
        showNotification('error', `Error al cargar cuentas bancarias: ${extractErrorMessage(err)}`)
      }
    }
    cargarCuentas()
  }, [])

  // Cargar datos reales de cotejo y resumen oficial por cuenta
  const fetchConciliacionData = useCallback(async () => {
    if (!cuentaSeleccionadaId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setApiError(null)

    try {
      const [resCotejo, resEstado] = await Promise.allSettled([
        conciliacionService.getCotejo({
          idCuenta: cuentaSeleccionadaId,
          desde: filtroDesde || undefined,
          hasta: filtroHasta || undefined
        }),
        conciliacionService.getEstado(cuentaSeleccionadaId)
      ])

      const errores: string[] = []

      if (resCotejo.status === 'fulfilled') {
        setMovimientosBancarios(resCotejo.value.movimientosBancarios)
        setMovimientosInternos(resCotejo.value.movimientosInternos)
      } else {
        errores.push(`Cotejo: ${extractErrorMessage(resCotejo.reason)}`)
      }

      if (resEstado.status === 'fulfilled') {
        setResumenEstado(resEstado.value)
      } else {
        errores.push(`Resumen oficial: ${extractErrorMessage(resEstado.reason)}`)
      }

      if (errores.length > 0 && resCotejo.status === 'rejected') {
        setApiError(errores.join(' | '))
      }
    } catch (err: unknown) {
      setApiError(
        extractErrorMessage(err, 'Error de conexión con el servicio de conciliación bancaria.')
      )
    } finally {
      setLoading(false)
    }
  }, [cuentaSeleccionadaId, filtroDesde, filtroHasta])

  useEffect(() => {
    fetchConciliacionData()
  }, [fetchConciliacionData])

  // Filtrado de extracto bancario
  const extractoFiltrado = useMemo(() => {
    return movimientosBancarios.filter((item) => {
      const matchEstado = filtroEstado === 'Todos' || item.estadoConciliacion === filtroEstado
      const query = (searchTerm || '').toLowerCase().trim()
      if (!query) return matchEstado
      const conceptoStr = (item.concepto || (item as any).descripcion || '').toLowerCase()
      const refStr = (item.referencia || '').toLowerCase()
      const matchSearch = conceptoStr.includes(query) || refStr.includes(query)
      return matchEstado && matchSearch
    })
  }, [movimientosBancarios, filtroEstado, searchTerm])

  // Filtrado de movimientos internos del sistema
  const movimientosInternosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return movimientosInternos
    const query = searchTerm.toLowerCase()
    return movimientosInternos.filter((m) => {
      const matchId =
        `mov-${m.idMovimiento}`.includes(query) || String(m.idMovimiento).includes(query)
      const matchDesc = m.descripcion?.toLowerCase().includes(query)
      const matchCat = m.categoria?.nombre?.toLowerCase().includes(query)
      return matchId || matchDesc || matchCat
    })
  }, [movimientosInternos, searchTerm])

  // Exportar reporte de conciliación a CSV
  const handleExportCSVConciliacion = () => {
    if (movimientosBancarios.length === 0) {
      showNotification('error', 'No hay datos de conciliación para exportar.')
      return
    }
    const cuentaActual = cuentasBancarias.find((c) => c.idCuenta === cuentaSeleccionadaId)
    const headers = [
      'Cuenta Bancaria',
      'Fecha',
      'Tipo',
      'Referencia',
      'Concepto',
      'Monto (Bs.)',
      'Estado Conciliacion',
      'Diferencia',
      'Movimiento Vinculado'
    ]
    const rows = extractoFiltrado.map((mb) => [
      `"${cuentaActual?.banco || ''} - ${cuentaActual?.numeroCuenta || ''}"`,
      fechaSolo(mb.fecha),
      mb.tipo,
      `"${mb.referencia || 'S/R'}"`,
      `"${(mb.concepto || (mb as any).descripcion || 'Sin concepto').replace(/"/g, '""')}"`,
      Number(mb.monto).toFixed(2),
      mb.estadoConciliacion,
      mb.diferencia !== undefined && mb.diferencia !== null
        ? Number(mb.diferencia).toFixed(2)
        : '0.00',
      mb.sugerencia ? `"Sugerido: MOV-${mb.sugerencia.idMovimiento}"` : '""'
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `conciliacion_${cuentaActual?.banco || 'cuenta'}_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showNotification('success', 'Reporte de conciliación exportado a CSV exitosamente.')
  }

  // Vincular con sugerencia automática
  const handleAceptarSugerencia = async (item: MovimientoBancarioItem) => {
    if (!item.sugerencia) return
    setAccionEnProgresoId(item.idMovBancario)

    try {
      await conciliacionService.vincular(item.idMovBancario, item.sugerencia.idMovimiento)
      showNotification(
        'success',
        'Movimiento vinculado y conciliado exitosamente con la sugerencia.'
      )
      await fetchConciliacionData()
    } catch (err: unknown) {
      showNotification('error', extractErrorMessage(err, 'Error al vincular con la sugerencia.'))
    } finally {
      setAccionEnProgresoId(null)
    }
  }

  // Vincular manualmente seleccionando movimiento interno
  const handleVincularManual = async () => {
    if (!itemParaVincular || !movimientoSistemaSeleccionado) {
      setModalVincularError('Seleccione un movimiento interno para vincular.')
      return
    }

    setVinculando(true)
    setModalVincularError(null)

    try {
      await conciliacionService.vincular(
        itemParaVincular.idMovBancario,
        Number(movimientoSistemaSeleccionado)
      )
      showNotification('success', 'Movimiento bancario e interno vinculados exitosamente.')
      setItemParaVincular(null)
      setMovimientoSistemaSeleccionado('')
      await fetchConciliacionData()
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Error al vincular movimientos.')
      setModalVincularError(msg)
      showNotification('error', msg)
    } finally {
      setVinculando(false)
    }
  }

  // Desvincular movimiento previamente conciliado o con discrepancia
  const handleDesvincular = async (idMovBancario: number) => {
    setAccionEnProgresoId(idMovBancario)

    try {
      await conciliacionService.desvincular(idMovBancario)
      showNotification('success', 'Movimiento desvinculado. Su estado vuelve a Pendiente.')
      await fetchConciliacionData()
    } catch (err: unknown) {
      showNotification('error', extractErrorMessage(err, 'Error al desvincular el movimiento.'))
    } finally {
      setAccionEnProgresoId(null)
    }
  }

  // Opciones válidas para el modal de vinculación manual según tipo de movimiento bancario
  const movimientosInternosDisponibles = useMemo(() => {
    if (!itemParaVincular) return []
    // Deposito bancario se concilia con Ingreso; Retiro se concilia con Egreso
    const tipoRequerido = itemParaVincular.tipo === 'Deposito' ? 'Ingreso' : 'Egreso'
    return movimientosInternos.filter((m) => !m.anulado && !m.vinculado && m.tipo === tipoRequerido)
  }, [itemParaVincular, movimientosInternos])

  const totalMovs =
    (resumenEstado?.cantConciliados || 0) +
    (resumenEstado?.cantPendientes || 0) +
    (resumenEstado?.cantDiscrepancias || 0)
  const porcentaje =
    totalMovs > 0 ? Math.round(((resumenEstado?.cantConciliados || 0) / totalMovs) * 100) : 0

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

      {/* HEADER CON SELECTOR DE CUENTA Y ACCIONES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-400 text-xs font-semibold mb-2">
            <Scale className="w-3.5 h-3.5" />
            Auditoría y Conciliación Bancaria &bull; US2.4
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Conciliación Bancaria
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Cotejo sistemático entre el extracto bancario oficial y los movimientos registrados en
            el sistema.
          </p>
        </div>

        {/* SELECTOR DE CUENTA BANCARIA */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#dfd9ce] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800">
            <Landmark className="w-4 h-4 text-blue-600 ml-2 shrink-0" />
            <select
              value={cuentaSeleccionadaId || ''}
              onChange={(e) => setCuentaSeleccionadaId(Number(e.target.value))}
              className="bg-transparent border-0 text-xs font-bold text-[#262422] dark:text-white pr-2 py-1 focus:ring-0 cursor-pointer"
            >
              {cuentasBancarias.length === 0 ? (
                <option value="">Sin cuentas registradas</option>
              ) : (
                cuentasBancarias.map((c) => (
                  <option key={c.idCuenta} value={c.idCuenta} className="dark:bg-slate-900">
                    {c.banco} ({c.numeroCuenta})
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportCSVConciliacion}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer border border-[#cec8bc] dark:border-slate-700"
            title="Exportar reporte de conciliación a CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span>Descargar CSV</span>
          </button>

          <button
            type="button"
            onClick={fetchConciliacionData}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer border border-[#cec8bc] dark:border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Sincronizar</span>
          </button>
        </div>
      </div>

      {/* ERROR DE API CON BOTÓN REINTENTAR */}
      {apiError && !loading && movimientosBancarios.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 max-w-xl mx-auto space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Servicio de Conciliación Bancaria no disponible
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{apiError}</p>
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
          {/* CARDS DE RESUMEN DE CONCILIACIÓN (Desde /api/v1/conciliacion/estado oficial) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-xs text-[#7d776f] font-semibold">Tasa de Conciliación</span>
              <div className="text-2xl font-black text-blue-700 dark:text-blue-400 font-mono">
                {porcentaje}%
              </div>
              <span className="text-[10px] text-[#7d776f]">Efectividad global</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-xs text-[#7d776f] font-semibold">Conciliados</span>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                {resumenEstado?.cantConciliados ?? 0}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">
                Bs. {(resumenEstado?.montoConciliados ?? 0).toFixed(2)}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-xs text-[#7d776f] font-semibold">Pendientes</span>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-400 font-mono">
                {resumenEstado?.cantPendientes ?? 0}
              </div>
              <span className="text-[10px] text-amber-600 font-medium">
                Bs. {(resumenEstado?.montoPendientes ?? 0).toFixed(2)}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-xs text-[#7d776f] font-semibold">Discrepancias</span>
              <div className="text-2xl font-black text-rose-700 dark:text-rose-400 font-mono">
                {resumenEstado?.cantDiscrepancias ?? 0}
              </div>
              <span className="text-[10px] text-rose-600 font-medium">
                Dif: Bs. {(resumenEstado?.sumaDiferenciaDiscrepancias ?? 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* BARRA DE FILTROS */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs">
              {(['Todos', 'Conciliado', 'Pendiente', 'Discrepancia'] as const).map((est) => (
                <button
                  key={est}
                  type="button"
                  onClick={() => setFiltroEstado(est)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    filtroEstado === est
                      ? 'bg-blue-700 text-white'
                      : 'text-[#5c5750] dark:text-slate-400'
                  }`}
                >
                  {est}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-[#7d776f]">
                <span>Desde:</span>
                <input
                  type="date"
                  value={filtroDesde}
                  onChange={(e) => setFiltroDesde(e.target.value)}
                  className="px-2 py-1 rounded-lg bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs"
                />
                <span>Hasta:</span>
                <input
                  type="date"
                  value={filtroHasta}
                  onChange={(e) => setFiltroHasta(e.target.value)}
                  className="px-2 py-1 rounded-lg bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs"
                />
              </div>

              <div className="relative sm:w-64">
                <Search className="w-4 h-4 text-[#7d776f] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por concepto o ref..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs"
                />
              </div>
            </div>
          </div>

          {/* VISTA DE COTEJO: EXTRACTO BANCARIO Y MOVIMIENTOS INTERNOS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* COLUMNA 1: EXTRACTO BANCARIO */}
            <div className="lg:col-span-7 space-y-3">
              <h3 className="font-extrabold text-sm text-[#262422] dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-blue-600" />
                  Extracto Bancario ({extractoFiltrado.length})
                </span>
                <span className="text-xs font-normal text-[#7d776f]">
                  Cuenta:{' '}
                  {cuentasBancarias.find((c) => c.idCuenta === cuentaSeleccionadaId)
                    ?.numeroCuenta || '-'}
                </span>
              </h3>

              <div className="rounded-2xl border border-[#cec8bc] dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#e3ded4] dark:bg-slate-950/60 font-bold uppercase text-[10px] text-[#5c5750]">
                        <th className="py-2.5 px-3">Fecha / Ref</th>
                        <th className="py-2.5 px-3">Concepto Bancario</th>
                        <th className="py-2.5 px-3">Monto (Bs.)</th>
                        <th className="py-2.5 px-3">Estado</th>
                        {puedeEscribir && <th className="py-2.5 px-3 text-right">Acción</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#cec8bc]/50">
                      {loading ? (
                        <tr>
                          <td
                            colSpan={puedeEscribir ? 5 : 4}
                            className="py-8 text-center text-[#7d776f]"
                          >
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-700" />
                          </td>
                        </tr>
                      ) : extractoFiltrado.length === 0 ? (
                        <tr>
                          <td
                            colSpan={puedeEscribir ? 5 : 4}
                            className="py-8 text-center text-[#7d776f]"
                          >
                            No hay movimientos bancarios para esta cuenta con los filtros
                            seleccionados.
                          </td>
                        </tr>
                      ) : (
                        extractoFiltrado.map((item) => {
                          const esDeposito = item.tipo === 'Deposito'
                          const tieneSugerencia =
                            item.estadoConciliacion === 'Pendiente' && item.sugerencia
                          const esConciliado = item.estadoConciliacion === 'Conciliado'
                          const enAccion = accionEnProgresoId === item.idMovBancario

                          return (
                            <tr
                              key={item.idMovBancario}
                              className="hover:bg-[#e6e1d6]/50 transition-colors"
                            >
                              <td className="py-2.5 px-3">
                                <div className="font-mono font-bold text-[11px] text-blue-900 dark:text-blue-300">
                                  {item.referencia || 'S/R'}
                                </div>
                                <div className="text-[10px] text-[#7d776f] font-mono">
                                  {fechaSolo(item.fecha)}
                                </div>
                              </td>

                              <td
                                className="py-2.5 px-3 max-w-[200px]"
                                title={item.concepto || (item as any).descripcion || ''}
                              >
                                <div className="font-medium truncate">
                                  {item.concepto || (item as any).descripcion || 'Sin concepto'}
                                </div>

                                {/* SUGERENCIA AUTOMÁTICA DEL SISTEMA */}
                                {tieneSugerencia && item.sugerencia && (
                                  <div className="mt-1.5 p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] space-y-1">
                                    <div className="flex items-center gap-1 font-semibold text-blue-800 dark:text-blue-300">
                                      <Sparkles className="w-3 h-3 text-amber-500" />
                                      <span>Sugerencia: MOV-{item.sugerencia.idMovimiento}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
                                      {item.sugerencia.descripcion} (Bs.{' '}
                                      {Number(item.sugerencia.monto).toFixed(2)}) &bull; Dif:{' '}
                                      {item.sugerencia.diferenciaDias}d
                                    </p>
                                    {puedeEscribir && (
                                      <button
                                        type="button"
                                        disabled={enAccion}
                                        onClick={() => handleAceptarSugerencia(item)}
                                        className="mt-1 px-2 py-0.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <Link2 className="w-3 h-3" />
                                        {enAccion ? 'Vinculando...' : 'Aceptar Sugerencia'}
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* DISCREPANCIA INFO */}
                                {item.estadoConciliacion === 'Discrepancia' &&
                                  item.diferencia !== null && (
                                    <div className="mt-1 text-[10px] text-rose-600 font-semibold">
                                      Diferencia con libro: Bs. {Number(item.diferencia).toFixed(2)}
                                    </div>
                                  )}
                              </td>

                              <td
                                className={`py-2.5 px-3 font-mono font-bold ${
                                  esDeposito
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-rose-700 dark:text-rose-400'
                                }`}
                              >
                                {esDeposito ? '+' : '-'} Bs. {Number(item.monto).toFixed(2)}
                              </td>

                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    item.estadoConciliacion === 'Conciliado'
                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                      : item.estadoConciliacion === 'Pendiente'
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                                  }`}
                                >
                                  {item.estadoConciliacion}
                                </span>
                              </td>

                              {puedeEscribir && (
                                <td className="py-2.5 px-3 text-right">
                                  {item.estadoConciliacion === 'Pendiente' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setItemParaVincular(item)
                                        setMovimientoSistemaSeleccionado('')
                                        setModalVincularError(null)
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                                    >
                                      <Link2 className="w-3 h-3" />
                                      <span>Vincular</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={enAccion}
                                      onClick={() => handleDesvincular(item.idMovBancario)}
                                      className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-bold cursor-pointer inline-flex items-center gap-1 border border-rose-300"
                                      title="Desvincular y volver a estado Pendiente"
                                    >
                                      <Unlink className="w-3 h-3" />
                                      <span>{enAccion ? '...' : 'Desvincular'}</span>
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* COLUMNA 2: MOVIMIENTOS INTERNOS DEL SISTEMA */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="font-extrabold text-sm text-[#262422] dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Libro del Sistema ({movimientosInternosFiltrados.length})
                </span>
                <span className="text-xs font-normal text-[#7d776f]">Período actual</span>
              </h3>

              <div className="rounded-2xl border border-[#cec8bc] dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 overflow-hidden shadow-sm max-h-[580px] overflow-y-auto">
                <div className="divide-y divide-[#cec8bc]/50 text-xs">
                  {movimientosInternosFiltrados.length === 0 ? (
                    <div className="p-8 text-center text-[#7d776f]">
                      No hay movimientos internos registrados para el período consultado
                      {searchTerm.trim() ? ' que coincidan con la búsqueda' : ''}.
                    </div>
                  ) : (
                    movimientosInternosFiltrados.map((mov) => {
                      const esIngreso = mov.tipo === 'Ingreso'
                      return (
                        <div
                          key={mov.idMovimiento}
                          className="p-3 hover:bg-[#e6e1d6]/50 transition-colors space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                              MOV-{mov.idMovimiento}
                            </span>
                            <span
                              className={`font-mono font-bold ${
                                esIngreso
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-rose-700 dark:text-rose-400'
                              }`}
                            >
                              {esIngreso ? '+' : '-'} Bs. {Number(mov.monto).toFixed(2)}
                            </span>
                          </div>
                          <div
                            className="text-[11px] text-[#5c5750] dark:text-slate-300 truncate"
                            title={mov.descripcion}
                          >
                            {mov.descripcion}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-[#7d776f] pt-0.5">
                            <span className="font-mono">{fechaSolo(mov.fecha)}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-semibold ${
                                mov.vinculado
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {mov.vinculado ? 'Vinculado' : 'Disponible'}
                            </span>
                          </div>
                        </div>
                      )
                    })
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
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm flex items-center gap-2 text-[#262422] dark:text-white">
                <Link2 className="w-4 h-4 text-blue-600" />
                Vincular Movimiento Bancario
              </h3>
              <button
                type="button"
                onClick={() => setItemParaVincular(null)}
                className="text-[#7d776f] hover:text-[#262422] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalVincularError && (
              <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalVincularError}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 space-y-1 text-xs">
              <span className="text-[#7d776f] text-[10px] uppercase font-bold">
                Registro Bancario Seleccionado:
              </span>
              <div className="font-bold font-mono text-sm text-[#262422] dark:text-white">
                {itemParaVincular.referencia || 'S/R'} &bull; Bs.{' '}
                {Number(itemParaVincular.monto).toFixed(2)} ({itemParaVincular.tipo})
              </div>
              <div className="text-[11px] text-[#5c5750] dark:text-slate-400">
                {itemParaVincular.concepto ||
                  (itemParaVincular as any).descripcion ||
                  'Sin concepto'}
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-[#383430] dark:text-slate-200">
                Seleccione el Movimiento Interno a Vincular:
              </label>
              <select
                value={movimientoSistemaSeleccionado}
                onChange={(e) =>
                  setMovimientoSistemaSeleccionado(
                    e.target.value === '' ? '' : Number(e.target.value)
                  )
                }
                className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 font-mono text-xs cursor-pointer"
              >
                <option value="">-- Seleccionar Movimiento Compatible --</option>
                {movimientosInternosDisponibles.map((m) => (
                  <option key={m.idMovimiento} value={m.idMovimiento}>
                    [MOV-{m.idMovimiento}] {m.descripcion} - Bs. {Number(m.monto).toFixed(2)} (
                    {fechaSolo(m.fecha)})
                  </option>
                ))}
              </select>
              {movimientosInternosDisponibles.length === 0 && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  No hay movimientos internos disponibles del tipo compatible (
                  {itemParaVincular.tipo === 'Deposito' ? 'Ingreso' : 'Egreso'}) sin vincular.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setItemParaVincular(null)}
                className="px-3.5 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleVincularManual}
                disabled={vinculando || !movimientoSistemaSeleccionado}
                className="px-4 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {vinculando ? 'Vinculando...' : 'Vincular y Conciliar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
