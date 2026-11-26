// frontend/app/(admin)/conciliacion-bancaria/page.tsx
// Módulo de Conciliación Bancaria y Cotejo de Extractos (Edificio XYZ)
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
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
import { SummaryCards } from './components/SummaryCards'
import { Toast } from './components/Toast'
import { Header } from './components/Header'
import { FiltersBar } from './components/FiltersBar'
import { BankExtractTable } from './components/BankExtractTable'
import { InternalMovementsList } from './components/InternalMovementsList'
import { VincularModal } from './components/VincularModal'

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

  const [rolUsuario, setRolUsuario] = useState<string>('Administrador')
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRolUsuario(localStorage.getItem('user_role') || 'Administrador')
    }
  }, [])

  const puedeEscribir = useMemo(
    () => puedeEscribirFinanzas('conciliacion', rolUsuario),
    [rolUsuario]
  )

  const [filtroEstado, setFiltroEstado] = useState<
    'Todos' | 'Conciliado' | 'Pendiente' | 'Discrepancia'
  >('Todos')
  const [searchTerm, setSearchTerm] = useState('')

  const [itemParaVincular, setItemParaVincular] = useState<MovimientoBancarioItem | null>(null)
  const [movimientoSistemaSeleccionado, setMovimientoSistemaSeleccionado] = useState<number | ''>('')
  const [vinculando, setVinculando] = useState(false)
  const [modalVincularError, setModalVincularError] = useState<string | null>(null)
  const [accionEnProgresoId, setAccionEnProgresoId] = useState<number | null>(null)

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text })
    setTimeout(() => setFeedbackMsg(null), 5000)
  }

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

  const fetchConciliacionData = useCallback(async (isManual = false) => {
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
      } else if (isManual) {
        showNotification('success', 'Conciliación bancaria y cotejo sincronizados exitosamente con el backend.')
      }
    } catch (err: unknown) {
      setApiError(extractErrorMessage(err, 'Error de conexión con el servicio de conciliación bancaria.'))
    } finally {
      setLoading(false)
    }
  }, [cuentaSeleccionadaId, filtroDesde, filtroHasta])

  useEffect(() => {
    fetchConciliacionData()
  }, [fetchConciliacionData])

  const extractoFiltrado = useMemo(() => {
    return movimientosBancarios.filter((item) => {
      const matchEstado = filtroEstado === 'Todos' || item.estadoConciliacion === filtroEstado
      const query = (searchTerm || '').toLowerCase().trim()
      if (!query) return matchEstado
      const conceptoStr = (item.concepto || (item as any).descripcion || '').toLowerCase()
      const refStr = (item.referencia || '').toLowerCase()
      return matchEstado && (conceptoStr.includes(query) || refStr.includes(query))
    })
  }, [movimientosBancarios, filtroEstado, searchTerm])

  const movimientosInternosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return movimientosInternos
    const query = searchTerm.toLowerCase()
    return movimientosInternos.filter((m) => {
      const matchId = `mov-${m.idMovimiento}`.includes(query) || String(m.idMovimiento).includes(query)
      const matchDesc = m.descripcion?.toLowerCase().includes(query)
      const matchCat = m.categoria?.nombre?.toLowerCase().includes(query)
      return matchId || matchDesc || matchCat
    })
  }, [movimientosInternos, searchTerm])

  const handleExportCSVConciliacion = () => {
    if (movimientosBancarios.length === 0) {
      showNotification('error', 'No hay datos de conciliación para exportar.')
      return
    }
    const cuentaActual = cuentasBancarias.find((c) => c.idCuenta === cuentaSeleccionadaId)
    const headers = [
      'Cuenta Bancaria', 'Fecha', 'Tipo', 'Referencia', 'Concepto',
      'Monto (Bs.)', 'Estado Conciliacion', 'Diferencia', 'Movimiento Vinculado'
    ]
    const rows = extractoFiltrado.map((mb) => [
      `"${cuentaActual?.banco || ''} - ${cuentaActual?.numeroCuenta || ''}"`,
      fechaSolo(mb.fecha),
      mb.tipo,
      `"${mb.referencia || 'S/R'}"`,
      `"${(mb.concepto || (mb as any).descripcion || 'Sin concepto').replace(/"/g, '""')}"`,
      Number(mb.monto).toFixed(2),
      mb.estadoConciliacion,
      mb.diferencia !== undefined && mb.diferencia !== null ? Number(mb.diferencia).toFixed(2) : '0.00',
      mb.sugerencia ? `"Sugerido: MOV-${mb.sugerencia.idMovimiento}"` : '""'
    ])
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csvContent))
    link.setAttribute('download', `conciliacion_${cuentaActual?.banco || 'cuenta'}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showNotification('success', 'Reporte de conciliación exportado a CSV exitosamente.')
  }

  const handleAceptarSugerencia = async (item: MovimientoBancarioItem) => {
    if (!item.sugerencia) return
    setAccionEnProgresoId(item.idMovBancario)
    try {
      await conciliacionService.vincular(item.idMovBancario, item.sugerencia.idMovimiento)
      showNotification('success', 'Movimiento vinculado y conciliado exitosamente con la sugerencia.')
      await fetchConciliacionData()
    } catch (err: unknown) {
      showNotification('error', extractErrorMessage(err, 'Error al vincular con la sugerencia.'))
    } finally {
      setAccionEnProgresoId(null)
    }
  }

  const handleVincularManual = async () => {
    if (!itemParaVincular || !movimientoSistemaSeleccionado) {
      setModalVincularError('Seleccione un movimiento interno para vincular.')
      return
    }
    setVinculando(true)
    setModalVincularError(null)
    try {
      await conciliacionService.vincular(itemParaVincular.idMovBancario, Number(movimientoSistemaSeleccionado))
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

  const resumenFinal = useMemo(() => {
    if (movimientosBancarios.length > 0) {
      let conc = 0, mConc = 0, pend = 0, mPend = 0, disc = 0, mDisc = 0, difDisc = 0
      for (const m of movimientosBancarios) {
        const monto = Number(m.monto || 0)
        if (m.estadoConciliacion === 'Conciliado') { conc++; mConc += monto }
        else if (m.estadoConciliacion === 'Discrepancia') { disc++; mDisc += monto; difDisc += Number(m.diferencia || 0) }
        else { pend++; mPend += monto }
      }
      return {
        cantConciliados: resumenEstado?.cantConciliados || conc,
        montoConciliados: resumenEstado?.montoConciliados || mConc,
        cantPendientes: resumenEstado?.cantPendientes || pend,
        montoPendientes: resumenEstado?.montoPendientes || mPend,
        cantDiscrepancias: resumenEstado?.cantDiscrepancias || disc,
        montoDiscrepancias: resumenEstado?.montoDiscrepancias || mDisc,
        sumaDiferenciaDiscrepancias: resumenEstado?.sumaDiferenciaDiscrepancias || difDisc
      }
    }
    return resumenEstado || {
      cantConciliados: 0, montoConciliados: 0, cantPendientes: 0, montoPendientes: 0,
      cantDiscrepancias: 0, montoDiscrepancias: 0, sumaDiferenciaDiscrepancias: 0
    }
  }, [movimientosBancarios, resumenEstado])

  const totalMovs = resumenFinal.cantConciliados + resumenFinal.cantPendientes + resumenFinal.cantDiscrepancias
  const porcentaje = totalMovs > 0 ? Math.round((resumenFinal.cantConciliados / totalMovs) * 100) : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <Toast feedbackMsg={feedbackMsg} setFeedbackMsg={setFeedbackMsg} />

      <Header
        cuentasBancarias={cuentasBancarias}
        cuentaSeleccionadaId={cuentaSeleccionadaId}
        setCuentaSeleccionadaId={setCuentaSeleccionadaId}
        handleExportCSVConciliacion={handleExportCSVConciliacion}
        loading={loading}
        fetchConciliacionData={fetchConciliacionData}
      />

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
            onClick={() => fetchConciliacionData(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer shadow-md shadow-amber-600/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>
        </div>
      ) : (
        <>
          <SummaryCards data={{ ...resumenFinal, porcentaje }} />

          <FiltersBar
            filtroEstado={filtroEstado}
            setFiltroEstado={setFiltroEstado}
            filtroDesde={filtroDesde}
            setFiltroDesde={setFiltroDesde}
            filtroHasta={filtroHasta}
            setFiltroHasta={setFiltroHasta}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <BankExtractTable
              extractoFiltrado={extractoFiltrado}
              loading={loading}
              puedeEscribir={puedeEscribir}
              accionEnProgresoId={accionEnProgresoId}
              onAceptarSugerencia={handleAceptarSugerencia}
              onVincularClick={(item) => {
                setItemParaVincular(item)
                setMovimientoSistemaSeleccionado('')
                setModalVincularError(null)
              }}
            />

            <InternalMovementsList movimientosInternosFiltrados={movimientosInternosFiltrados} />
          </div>
        </>
      )}

      <VincularModal
        itemParaVincular={itemParaVincular}
        setItemParaVincular={setItemParaVincular}
        movimientoSistemaSeleccionado={movimientoSistemaSeleccionado}
        setMovimientoSistemaSeleccionado={setMovimientoSistemaSeleccionado}
        modalVincularError={modalVincularError}
        setModalVincularError={setModalVincularError}
        vinculando={vinculando}
        handleVincularManual={handleVincularManual}
      />
    </div>
  )
}
