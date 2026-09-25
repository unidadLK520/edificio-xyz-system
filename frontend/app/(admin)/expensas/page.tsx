// frontend/app/(admin)/expensas/page.tsx
// HU04: Módulo de Gestión, Emisión Masiva, Recaudación de Expensas y Control de Morosidad

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Receipt,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Eye,
  CreditCard,
  Building2,
  X,
  Printer,
  Percent,
  Calculator,
  RotateCcw,
  FileText,
  UserX,
  History
} from 'lucide-react'

export interface ExpensaItem {
  idExpensa: number
  idDepartamento: number
  periodo: string
  monto: number
  saldoPendiente: number
  tasaInteresMora: number
  fechaVencimiento: string
  estado: string
  departamento?: { numero: string; piso?: number }
  propietarioNombre?: string
  pagos?: any[]
}

export default function ExpensasPage() {
  const [expensas, setExpensas] = useState<ExpensaItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [activeTab, setActiveTab] = useState<'todas' | 'morosos'>('todas')
  const [listadoMorosos, setListadoMorosos] = useState<any[]>([])

  // Modales
  const [isEmitirModalOpen, setIsEmitirModalOpen] = useState(false)
  const [isPagarModalOpen, setIsPagarModalOpen] = useState(false)
  const [isEstadoCuentaModalOpen, setIsEstadoCuentaModalOpen] = useState(false)
  const [selectedExpensa, setSelectedExpensa] = useState<ExpensaItem | null>(null)
  const [expensaAPagar, setExpensaAPagar] = useState<ExpensaItem | null>(null)
  const [estadoCuentaData, setEstadoCuentaData] = useState<any | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Formulario Pago (CA03, CA04)
  const [montoPagoInput, setMontoPagoInput] = useState<number>(0)
  const [metodoPagoInput, setMetodoPagoInput] = useState<string>('Transferencia')
  const [esAnticipadoInput, setEsAnticipadoInput] = useState<boolean>(false)
  const [comprobanteUrlInput, setComprobanteUrlInput] = useState<string>('')
  const [isSubmittingPago, setIsSubmittingPago] = useState<boolean>(false)

  // Formulario Emisión Masiva (CA1, CA2)
  const [nuevoPeriodo, setNuevoPeriodo] = useState('2026-10-01')
  const [nuevaFechaVencimiento, setNuevaFechaVencimiento] = useState('2026-10-15')
  const [montoBaseInput, setMontoBaseInput] = useState(450)
  const [tasaMoraInput, setTasaMoraInput] = useState(5)
  const [isSubmittingEmision, setIsSubmittingEmision] = useState(false)

  const showToast = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 4000)
  }

  // CA05: Fetch expensas desde la API
  const fetchExpensas = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/expensas?estado=${filtroEstado}`)
      if (res.ok) {
        const json = await res.json()
        if (json.data && Array.isArray(json.data)) {
          const mapped: ExpensaItem[] = json.data.map((item: any) => ({
            idExpensa: item.idExpensa,
            idDepartamento: item.idDepartamento,
            periodo: new Date(item.periodo).toISOString().split('T')[0],
            monto: Number(item.monto),
            saldoPendiente: Number(item.saldoPendiente),
            tasaInteresMora: Number(item.tasaInteresMora || 0),
            fechaVencimiento: new Date(item.fechaVencimiento).toISOString().split('T')[0],
            estado: item.estado,
            departamento: item.departamento,
            propietarioNombre: item.departamento?.propietario
              ? `${item.departamento.propietario.nombres} ${item.departamento.propietario.apellidos}`
              : 'Sin Titular',
            pagos: item.pagos || []
          }))
          setExpensas(mapped)
        }
      }
    } catch {}
  }, [filtroEstado])

  // CA07: Fetch morosos
  const fetchMorosos = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/expensas/morosos')
      if (res.ok) {
        const json = await res.json()
        if (json.data && Array.isArray(json.data)) {
          setListadoMorosos(json.data)
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchExpensas()
    fetchMorosos()
  }, [fetchExpensas, fetchMorosos])

  // KPIs
  const totalFacturado = useMemo(() => expensas.reduce((acc, curr) => acc + curr.monto, 0), [expensas])
  const totalPendiente = useMemo(() => expensas.reduce((acc, curr) => acc + curr.saldoPendiente, 0), [expensas])
  const totalCobrado = Math.max(0, totalFacturado - totalPendiente)
  const tasaCumplimiento = totalFacturado > 0 ? Math.round((totalCobrado / totalFacturado) * 100) : 0

  // CA1, CA2: Emisión Masiva de Expensas
  const handleEmisionMasiva = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingEmision(true)

    try {
      const res = await fetch('/api/v1/expensas/generar-masivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodo: nuevoPeriodo,
          fechaVencimiento: nuevaFechaVencimiento,
          montoBase: montoBaseInput,
          tasaInteresMora: tasaMoraInput
        })
      })

      const json = await res.json()
      if (res.ok) {
        await fetchExpensas()
        setIsEmitirModalOpen(false)
        showToast(`¡Emisión masiva completada! ${json.generadasCount} expensas generadas.`)
      } else {
        alert(json.message || 'Error en la emisión masiva')
      }
    } catch {
      alert('Error de conexión con el servidor')
    } finally {
      setIsSubmittingEmision(false)
    }
  }

  // CA6: Recálculo de Mora
  const handleCalcularMora = async () => {
    if (!confirm('¿Desea calcular y aplicar los recargos por mora a todas las expensas vencidas?')) return

    try {
      const res = await fetch('/api/v1/expensas/calcular-mora', { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        await fetchExpensas()
        await fetchMorosos()
        showToast(`¡Recargo por mora aplicado a ${json.actualizadasCount} expensas vencidas!`)
      }
    } catch {}
  }

  // CA03, CA04: Registrar Pago
  const handleRegistrarPagoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expensaAPagar) return
    setIsSubmittingPago(true)

    try {
      const res = await fetch(`/api/v1/expensas/${expensaAPagar.idExpensa}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montoPagado: montoPagoInput,
          metodoPago: metodoPagoInput,
          esAnticipado: esAnticipadoInput,
          comprobanteUrl: comprobanteUrlInput || undefined
        })
      })

      const json = await res.json()
      if (res.ok) {
        await fetchExpensas()
        await fetchMorosos()
        setIsPagarModalOpen(false)
        setExpensaAPagar(null)
        showToast('¡Pago registrado exitosamente!')
      } else {
        alert(json.message || 'Error al registrar pago')
      }
    } catch {
      alert('Error al procesar el pago')
    } finally {
      setIsSubmittingPago(false)
    }
  }

  // CA08: Ver Estado de Cuenta
  const handleVerEstadoCuenta = async (idDepartamento: number) => {
    try {
      const res = await fetch(`/api/v1/expensas/estado-cuenta/${idDepartamento}`)
      if (res.ok) {
        const json = await res.json()
        setEstadoCuentaData(json)
        setIsEstadoCuentaModalOpen(true)
      }
    } catch {}
  }

  // CA09: Anular Pago
  const handleAnularPago = async (idPago: number) => {
    if (!confirm('¿Está seguro de anular este pago? El saldo pendiente se recalculará automáticamente.')) return

    try {
      const res = await fetch(`/api/v1/expensas/pagos/${idPago}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchExpensas()
        if (estadoCuentaData) {
          handleVerEstadoCuenta(estadoCuentaData.departamento.idDepartamento)
        }
        showToast('Pago anulado exitosamente y saldo recalculado.')
      }
    } catch {}
  }

  // Filtrado de expensas
  const expensasFiltradas = useMemo(() => {
    return expensas.filter((item) => {
      const searchLower = searchTerm.toLowerCase()
      const matchSearch =
        (item.departamento?.numero || '').toLowerCase().includes(searchLower) ||
        (item.propietarioNombre || '').toLowerCase().includes(searchLower)
      const matchEstado = filtroEstado === 'Todos' || item.estado === filtroEstado
      return matchSearch && matchEstado
    })
  }, [expensas, searchTerm, filtroEstado])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast */}
      {successToast && (
        <div className="p-4 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl flex items-center gap-3 shadow-md animate-in fade-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{successToast}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-xs font-semibold mb-2">
            <Receipt className="w-3.5 h-3.5" />
            HU04: Módulo Financiero, Cobranzas & Mora
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Gestión de Expensas y Recaudación
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Emisión masiva de alícuotas, pagos parciales/anticipados, recargo de mora y estado de cuenta por departamento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* CA6: Botón Calcular Mora */}
          <button
            onClick={handleCalcularMora}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            title="Calcular Recargos de Mora"
          >
            <Calculator className="w-4 h-4" />
            Recalcular Mora
          </button>

          {/* CA1: Botón Emisión Masiva */}
          <button
            onClick={() => setIsEmitirModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-emerald-800/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Emisión Masiva de Lote
          </button>
        </div>
      </div>

      {/* KPIS FINANCIEROS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Facturación del Período</span>
            <DollarSign className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-[#262422] dark:text-white">
            Bs. {totalFacturado.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Total emitido
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Total Recaudado</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
            Bs. {totalCobrado.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Ingresos confirmados
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Saldo por Cobrar</span>
            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-400">
            Bs. {totalPendiente.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Pendiente y morosidad
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Tasa de Cobranza</span>
            <Percent className="w-4 h-4 text-purple-700 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-400">
            {tasaCumplimiento}%
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Efectividad de cobro
          </span>
        </div>
      </div>

      {/* PESTAÑAS (CA05 vs CA07 Morosos) */}
      <div className="flex border-b border-[#cec8bc] dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('todas')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeTab === 'todas'
              ? 'border-emerald-600 text-emerald-800 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-[#7d776f] dark:text-slate-400'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Listado General de Expensas
        </button>
        <button
          onClick={() => setActiveTab('morosos')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeTab === 'morosos'
              ? 'border-red-600 text-red-800 dark:border-red-400 dark:text-red-400'
              : 'border-transparent text-[#7d776f] dark:text-slate-400'
          }`}
        >
          <UserX className="w-4 h-4" />
          Listado de Morosos ({listadoMorosos.length})
        </button>
      </div>

      {activeTab === 'todas' ? (
        <>
          {/* BUSCADOR Y FILTROS */}
          <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por departamento o copropietario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
                <Filter className="w-3.5 h-3.5 text-[#7d776f] dark:text-slate-400" />
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
                >
                  <option value="Todos">Estado: Todos</option>
                  <option value="Pagado">Pagados</option>
                  <option value="Pendiente">Pendientes</option>
                  <option value="Parcial">Parciales</option>
                  <option value="Moroso">Morosos</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLA DE EXPENSAS (CA05) */}
          <div className="rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/60 dark:bg-slate-950/60 text-[#7d776f] dark:text-slate-400 uppercase text-[11px] font-bold">
                    <th className="py-3 px-4">Departamento</th>
                    <th className="py-3 px-4">Período</th>
                    <th className="py-3 px-4">Monto Importe</th>
                    <th className="py-3 px-4">Saldo Pendiente</th>
                    <th className="py-3 px-4">Vencimiento</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cec8bc] dark:divide-slate-800">
                  {expensasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#7d776f] dark:text-slate-500">
                        No se encontraron expensas registradas.
                      </td>
                    </tr>
                  ) : (
                    expensasFiltradas.map((item) => (
                      <tr key={item.idExpensa} className="hover:bg-[#dfd9ce]/40 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-bold text-[#262422] dark:text-white">
                          Dpto {item.departamento?.numero || item.idDepartamento}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs">{item.periodo}</td>
                        <td className="py-3.5 px-4 font-bold font-mono">Bs. {item.monto.toFixed(2)}</td>
                        <td className="py-3.5 px-4 font-bold font-mono text-red-600 dark:text-red-400">
                          Bs. {item.saldoPendiente.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-xs">{item.fechaVencimiento}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              item.estado === 'Pagado'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : item.estado === 'Parcial'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400'
                                  : item.estado === 'Moroso'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                            }`}
                          >
                            {item.estado}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          {/* CA03: Registrar Pago */}
                          {item.saldoPendiente > 0 && (
                            <button
                              onClick={() => {
                                setExpensaAPagar(item)
                                setMontoPagoInput(item.saldoPendiente)
                                setIsPagarModalOpen(true)
                              }}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                              title="Registrar Pago"
                            >
                              Pagar
                            </button>
                          )}
                          {/* CA08: Estado de Cuenta */}
                          <button
                            onClick={() => handleVerEstadoCuenta(item.idDepartamento)}
                            className="p-1.5 rounded-lg text-[#5c5750] hover:text-blue-700 dark:text-slate-400 hover:bg-[#ded8cc] transition-colors"
                            title="Ver Estado de Cuenta"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* CA07: VISTA DE LISTADO DE MOROSOS */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-red-100/50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-red-900 dark:text-red-300 text-sm">
                Reporte Consolidado de Morosidad
              </h3>
              <p className="text-xs text-red-700 dark:text-red-400">
                Unidades con deudas vencidas acumuladas en la base de datos.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-[#7d776f]">Deuda Total Vencida:</span>
              <div className="text-xl font-black text-red-700 dark:text-red-400 font-mono">
                Bs. {listadoMorosos.reduce((acc, m) => acc + m.totalDeuda, 0).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listadoMorosos.map((m) => (
              <div
                key={m.idDepartamento}
                className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-base text-[#262422] dark:text-white">
                      Departamento {m.numero} (Piso {m.piso || '-'})
                    </h4>
                    <p className="text-xs text-[#7d776f] dark:text-slate-400">
                      Titular: {m.propietario ? `${m.propietario.nombres} ${m.propietario.apellidos}` : 'Sin Titular'} • CI: {m.propietario?.ciNit || '-'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-black">
                    {m.expensasMoraCount} mes(es) en mora
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#dfd9ce]/60 dark:bg-slate-950/60 font-mono text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Deuda Acumulada:</span>
                    <span className="text-red-600 dark:text-red-400">Bs. {m.totalDeuda.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => handleVerEstadoCuenta(m.idDepartamento)}
                    className="px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold"
                  >
                    Ver Estado de Cuenta
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL EMISIÓN MASIVA (CA1, CA2) */}
      {isEmitirModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-2xl border border-[#cec8bc] dark:border-slate-800 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                Emisión Masiva de Lote
              </h3>
              <button onClick={() => setIsEmitirModalOpen(false)}>
                <X className="w-5 h-5 text-[#7d776f]" />
              </button>
            </div>

            <form onSubmit={handleEmisionMasiva} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1">Período (YYYY-MM-DD) *</label>
                <input
                  type="date"
                  required
                  value={nuevoPeriodo}
                  onChange={(e) => setNuevoPeriodo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Fecha Vencimiento *</label>
                <input
                  type="date"
                  required
                  value={nuevaFechaVencimiento}
                  onChange={(e) => setNuevaFechaVencimiento(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Monto Base (Bs.)</label>
                  <input
                    type="number"
                    value={montoBaseInput}
                    onChange={(e) => setMontoBaseInput(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Tasa Mora (%)</label>
                  <input
                    type="number"
                    value={tasaMoraInput}
                    onChange={(e) => setTasaMoraInput(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsEmitirModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7d776f]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEmision}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                >
                  {isSubmittingEmision ? 'Generando...' : 'Ejecutar Emisión Masiva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRO DE PAGO (CA03, CA04) */}
      {isPagarModalOpen && expensaAPagar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-2xl border border-[#cec8bc] dark:border-slate-800 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                Registrar Pago — Dpto {expensaAPagar.departamento?.numero || expensaAPagar.idDepartamento}
              </h3>
              <button onClick={() => setIsPagarModalOpen(false)}>
                <X className="w-5 h-5 text-[#7d776f]" />
              </button>
            </div>

            <form onSubmit={handleRegistrarPagoSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1">Monto a Pagar (Bs.) *</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={montoPagoInput}
                  onChange={(e) => setMontoPagoInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border font-mono font-bold text-sm text-emerald-700"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Método de Pago</label>
                <select
                  value={metodoPagoInput}
                  onChange={(e) => setMetodoPagoInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border"
                >
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="QR">Pago QR Simple</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              {/* CA04: Checkbox Pago Anticipado */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#dfd9ce]/60 border">
                <input
                  type="checkbox"
                  id="chkAnticipado"
                  checked={esAnticipadoInput}
                  onChange={(e) => setEsAnticipadoInput(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
                <label htmlFor="chkAnticipado" className="font-bold text-xs cursor-pointer">
                  Registrar como Pago Anticipado (Crédito a favor)
                </label>
              </div>

              <div>
                <label className="block font-bold mb-1">URL / Referencia Comprobante (Opcional)</label>
                <input
                  type="text"
                  placeholder="https://comprobantes.com/recibo.pdf"
                  value={comprobanteUrlInput}
                  onChange={(e) => setComprobanteUrlInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsPagarModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7d776f]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPago}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                >
                  {isSubmittingPago ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ESTADO DE CUENTA (CA08, CA09) */}
      {isEstadoCuentaModalOpen && estadoCuentaData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-[#ede9e1] dark:bg-slate-900 rounded-2xl border border-[#cec8bc] dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                  Estado de Cuenta — Departamento {estadoCuentaData.departamento?.numero}
                </h3>
                <p className="text-xs text-[#7d776f]">
                  Titular: {estadoCuentaData.departamento?.propietario ? `${estadoCuentaData.departamento.propietario.nombres} ${estadoCuentaData.departamento.propietario.apellidos}` : 'Sin Titular'}
                </p>
              </div>
              <button onClick={() => setIsEstadoCuentaModalOpen(false)}>
                <X className="w-5 h-5 text-[#7d776f]" />
              </button>
            </div>

            {/* Resumen Financiero */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-[#dfd9ce]/60 dark:bg-slate-950/60 rounded-xl text-xs font-mono text-center">
              <div>
                <span className="text-[#7d776f] block">Total Obligaciones</span>
                <span className="font-bold">Bs. {estadoCuentaData.resumen?.totalObligaciones?.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[#7d776f] block">Total Pagado</span>
                <span className="font-bold text-emerald-600">Bs. {estadoCuentaData.resumen?.totalPagado?.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[#7d776f] block">Saldo Pendiente</span>
                <span className="font-bold text-red-600">Bs. {estadoCuentaData.resumen?.saldoPendienteTotal?.toFixed(2)}</span>
              </div>
            </div>

            {/* Lista de Pagos y Opción de Anulación (CA09) */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#7d776f]">
                Historial de Pagos Registrados
              </h4>
              <div className="space-y-1">
                {estadoCuentaData.pagos?.length === 0 ? (
                  <p className="text-xs text-[#7d776f] italic">Sin pagos registrados en esta unidad.</p>
                ) : (
                  estadoCuentaData.pagos?.map((p: any) => (
                    <div
                      key={p.idPago}
                      className="flex justify-between items-center p-2.5 rounded-xl bg-[#dfd9ce]/40 dark:bg-slate-800/40 text-xs font-mono"
                    >
                      <div>
                        <span className="font-bold text-emerald-700">Bs. {Number(p.montoPagado).toFixed(2)}</span>
                        <span className="text-[10px] text-[#7d776f] ml-2">({p.metodoPago} • {new Date(p.fechaPago).toLocaleDateString()})</span>
                        {p.esAnticipado && <span className="ml-2 text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full font-sans font-bold">Anticipado</span>}
                      </div>
                      {/* CA09: Anular Pago */}
                      <button
                        onClick={() => handleAnularPago(p.idPago)}
                        className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-[10px] font-bold font-sans"
                        title="Anular Pago y Recalcular Saldo"
                      >
                        Anular
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Estado de Cuenta
              </button>
              <button
                onClick={() => setIsEstadoCuentaModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
