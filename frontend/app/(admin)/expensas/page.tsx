// frontend/app/(admin)/expensas/page.tsx
// Módulo de Gestión, Emisión y Recaudación de Expensas
// Emisión de lotes mensuales, registro de pagos, control de morosidad y recibos oficiales

'use client'

import React, { useState, useMemo } from 'react'
import {
  Receipt,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Plus,
  Eye,
  FileText,
  CreditCard,
  Building2,
  X,
  Printer,
  Download,
  Send,
  TrendingUp,
  Percent
} from 'lucide-react'

export interface ExpensaItem {
  id: number
  departamento: string
  piso: number
  propietario: string
  areaM2: number
  periodo: string
  montoExpensa: number
  fondoReserva: number
  extraordinaria: number
  totalPagar: number
  estado: 'Pagado' | 'Pendiente' | 'En Mora'
  fechaVencimiento: string
  fechaPago?: string | null
  metodoPago?: string | null
  nroComprobante?: string | null
}

const EXPENSAS_INICIALES: ExpensaItem[] = [
  {
    id: 1,
    departamento: '101',
    piso: 1,
    propietario: 'Carlos Mendoza Rojas',
    areaM2: 110.5,
    periodo: 'Septiembre 2026',
    montoExpensa: 480.0,
    fondoReserva: 50.0,
    extraordinaria: 0.0,
    totalPagar: 530.0,
    estado: 'Pagado',
    fechaVencimiento: '2026-09-15',
    fechaPago: '2026-09-10',
    metodoPago: 'Transferencia Bancaria (BNB)',
    nroComprobante: 'BNB-9812401'
  },
  {
    id: 2,
    departamento: '102',
    piso: 1,
    propietario: 'Mariana Flores Soliz',
    areaM2: 85.0,
    periodo: 'Septiembre 2026',
    montoExpensa: 390.0,
    fondoReserva: 50.0,
    extraordinaria: 0.0,
    totalPagar: 440.0,
    estado: 'Pagado',
    fechaVencimiento: '2026-09-15',
    fechaPago: '2026-09-12',
    metodoPago: 'Pago QR Simple',
    nroComprobante: 'QR-491028'
  },
  {
    id: 3,
    departamento: '201',
    piso: 2,
    propietario: 'Alejandro Vargas Morales',
    areaM2: 125.0,
    periodo: 'Septiembre 2026',
    montoExpensa: 540.0,
    fondoReserva: 50.0,
    extraordinaria: 100.0,
    totalPagar: 690.0,
    estado: 'Pendiente',
    fechaVencimiento: '2026-09-25',
    fechaPago: null
  },
  {
    id: 4,
    departamento: '202',
    piso: 2,
    propietario: 'Valeria Torrico Camacho',
    areaM2: 95.0,
    periodo: 'Septiembre 2026',
    montoExpensa: 410.0,
    fondoReserva: 50.0,
    extraordinaria: 0.0,
    totalPagar: 460.0,
    estado: 'En Mora',
    fechaVencimiento: '2026-09-10',
    fechaPago: null
  },
  {
    id: 5,
    departamento: '301',
    piso: 3,
    propietario: 'Fernando Castro Ortiz',
    areaM2: 140.0,
    periodo: 'Septiembre 2026',
    montoExpensa: 610.0,
    fondoReserva: 50.0,
    extraordinaria: 0.0,
    totalPagar: 660.0,
    estado: 'Pendiente',
    fechaVencimiento: '2026-09-25',
    fechaPago: null
  }
]

export default function ExpensasPage() {
  const [expensas, setExpensas] = useState<ExpensaItem[]>(EXPENSAS_INICIALES)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [selectedExpensa, setSelectedExpensa] = useState<ExpensaItem | null>(null)

  // Modales
  const [isEmitirModalOpen, setIsEmitirModalOpen] = useState(false)
  const [isPagarModalOpen, setIsPagarModalOpen] = useState(false)
  const [expensaAPagar, setExpensaAPagar] = useState<ExpensaItem | null>(null)

  // Formulario Pago
  const [metodoPago, setMetodoPago] = useState('Transferencia Bancaria (BNB)')
  const [nroComprobante, setNroComprobante] = useState('')

  // Formulario Emisión
  const [nuevoPeriodo, setNuevoPeriodo] = useState('Octubre 2026')
  const [montoBaseFondo, setMontoBaseFondo] = useState(50)
  const [extraordinariaMonto, setExtraordinariaMonto] = useState(0)

  // Filtrado
  const expensasFiltradas = useMemo(() => {
    return expensas.filter((item) => {
      const matchSearch =
        item.departamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.propietario.toLowerCase().includes(searchTerm.toLowerCase())
      const matchEstado = filtroEstado === 'Todos' || item.estado === filtroEstado
      return matchSearch && matchEstado
    })
  }, [expensas, searchTerm, filtroEstado])

  // KPIs
  const totalFacturado = expensas.reduce((acc, curr) => acc + curr.totalPagar, 0)
  const totalCobrado = expensas
    .filter((e) => e.estado === 'Pagado')
    .reduce((acc, curr) => acc + curr.totalPagar, 0)
  const totalPendiente = totalFacturado - totalCobrado
  const tasaCumplimiento =
    totalFacturado > 0 ? Math.round((totalCobrado / totalFacturado) * 100) : 0

  // Manejar Registro de Pago
  const handleRegistrarPago = (e: React.FormEvent) => {
    e.preventDefault()
    if (!expensaAPagar) return

    setExpensas(
      expensas.map((item) => {
        if (item.id === expensaAPagar.id) {
          return {
            ...item,
            estado: 'Pagado',
            fechaPago: new Date().toISOString().split('T')[0],
            metodoPago: metodoPago,
            nroComprobante: nroComprobante.trim() || `COMP-${Date.now().toString().slice(-6)}`
          }
        }
        return item
      })
    )

    setIsPagarModalOpen(false)
    setExpensaAPagar(null)
    setNroComprobante('')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-xs font-semibold mb-2">
            <Receipt className="w-3.5 h-3.5" />
            Módulo Financiero y Cobranzas
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Gestión de Expensas y Recaudación
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Emisión de alícuotas mensuales, registro de pagos de residentes y control de morosidad.
          </p>
        </div>

        <button
          onClick={() => setIsEmitirModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-emerald-800/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Emitir Nuevo Período
        </button>
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
            Total emitido este mes
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
            Efectividad de pago
          </span>
        </div>
      </div>

      {/* BUSCADOR Y FILTROS */}
      <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nro de dpto o copropietario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
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
              <option value="En Mora">En Mora</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLA DE EXPENSAS */}
      <div className="rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#e3ded4] dark:bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-[#5c5750] dark:text-slate-400">
                <th className="py-3 px-4">Unidad</th>
                <th className="py-3 px-4">Copropietario</th>
                <th className="py-3 px-4">Período</th>
                <th className="py-3 px-4">Desglose (Base + Reserva)</th>
                <th className="py-3 px-4">Total a Pagar</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cec8bc]/60 dark:divide-slate-800 text-xs">
              {expensasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#7d776f] dark:text-slate-500">
                    No se encontraron expensas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                expensasFiltradas.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-[#e6e1d6]/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-[#262422] dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-700/10 text-emerald-800 dark:bg-emerald-600/20 dark:text-emerald-300 flex items-center justify-center font-bold text-xs border border-emerald-600/20">
                          {exp.departamento}
                        </span>
                        <span>Dpto {exp.departamento}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#4a4641] dark:text-slate-200 font-medium">
                      {exp.propietario}
                    </td>
                    <td className="py-3 px-4 text-[#5c5750] dark:text-slate-400">{exp.periodo}</td>
                    <td className="py-3 px-4 text-[#5c5750] dark:text-slate-400">
                      Bs. {exp.montoExpensa} + Bs. {exp.fondoReserva}
                      {exp.extraordinaria > 0 && ` + Bs. ${exp.extraordinaria} (Ext.)`}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-[#262422] dark:text-white text-sm">
                      Bs. {exp.totalPagar.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          exp.estado === 'Pagado'
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                            : exp.estado === 'Pendiente'
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                              : 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
                        }`}
                      >
                        {exp.estado === 'Pagado' && <CheckCircle2 className="w-3 h-3" />}
                        {exp.estado === 'Pendiente' && <Clock className="w-3 h-3" />}
                        {exp.estado === 'En Mora' && <AlertTriangle className="w-3 h-3" />}
                        {exp.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {exp.estado !== 'Pagado' ? (
                          <button
                            onClick={() => {
                              setExpensaAPagar(exp)
                              setIsPagarModalOpen(true)
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer"
                          >
                            <CreditCard className="w-3 h-3" />
                            Cobrar
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedExpensa(exp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#dfd9ce] hover:bg-[#d5cebf] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#262422] dark:text-white rounded-lg text-[11px] font-bold border border-[#cec8bc] dark:border-slate-700 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            Recibo
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRAR COBRO */}
      {isPagarModalOpen && expensaAPagar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base sm:text-lg text-[#262422] dark:text-white">
                Registrar Cobro de Expensa
              </h3>
              <button
                onClick={() => setIsPagarModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs space-y-1">
              <div className="flex justify-between font-semibold">
                <span className="text-[#66615b] dark:text-slate-400">Departamento:</span>
                <span className="font-bold text-[#262422] dark:text-white">
                  Dpto {expensaAPagar.departamento}
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-[#66615b] dark:text-slate-400">Titular:</span>
                <span className="text-[#262422] dark:text-white">{expensaAPagar.propietario}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-emerald-800 dark:text-emerald-400 pt-1 border-t border-[#cec8bc] dark:border-slate-800">
                <span>Total a Recaudar:</span>
                <span>Bs. {expensaAPagar.totalPagar.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleRegistrarPago} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Método de Pago
                </label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                >
                  <option value="Transferencia Bancaria (BNB)">Transferencia Bancaria (BNB)</option>
                  <option value="Pago QR Simple">Pago QR Simple</option>
                  <option value="Efectivo en Administración">Efectivo en Administración</option>
                  <option value="Depósito Banco Mercantil">Depósito Banco Mercantil</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Nro Comprobante / Transacción
                </label>
                <input
                  type="text"
                  placeholder="Ej. TRX-908123 o BNB-4412"
                  value={nroComprobante}
                  onChange={(e) => setNroComprobante(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPagarModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-semibold text-[#262422] dark:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-xs font-bold text-white shadow-md cursor-pointer"
                >
                  Confirmar Cobro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RECIBO DIGITAL OFICIAL */}
      {selectedExpensa && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-700 dark:bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  XYZ
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                    Recibo Oficial de Expensas
                  </h3>
                  <p className="text-[11px] text-[#7d776f]">Edificio XYZ • Cochabamba, Bolivia</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedExpensa(null)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800 text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Nro de Recibo:</span>
                <span className="font-bold font-mono">REC-2026-0{selectedExpensa.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Unidad / Departamento:</span>
                <span className="font-bold">
                  Dpto {selectedExpensa.departamento} (Piso {selectedExpensa.piso})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Copropietario:</span>
                <span className="font-bold">{selectedExpensa.propietario}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Período Cancelado:</span>
                <span className="font-bold">{selectedExpensa.periodo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Método & Comprobante:</span>
                <span className="font-bold text-emerald-800 dark:text-emerald-400">
                  {selectedExpensa.metodoPago || 'BNB'} ({selectedExpensa.nroComprobante})
                </span>
              </div>

              <div className="border-t border-dashed border-[#cec8bc] dark:border-slate-800 pt-2 space-y-1">
                <div className="flex justify-between text-[#5c5750] dark:text-slate-400">
                  <span>Alícuota Mantenimiento ({selectedExpensa.areaM2} m²):</span>
                  <span>Bs. {selectedExpensa.montoExpensa.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#5c5750] dark:text-slate-400">
                  <span>Fondo de Reserva:</span>
                  <span>Bs. {selectedExpensa.fondoReserva.toFixed(2)}</span>
                </div>
                {selectedExpensa.extraordinaria > 0 && (
                  <div className="flex justify-between text-[#5c5750] dark:text-slate-400">
                    <span>Cuota Extraordinaria:</span>
                    <span>Bs. {selectedExpensa.extraordinaria.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm text-[#262422] dark:text-white pt-1 border-t border-[#cec8bc] dark:border-slate-800">
                  <span>TOTAL PAGADO:</span>
                  <span className="text-emerald-800 dark:text-emerald-400">
                    Bs. {selectedExpensa.totalPagar.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#cec8bc] dark:border-slate-800">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 hover:bg-[#d5cebf] text-xs font-bold text-[#262422] dark:text-white cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
              <button
                onClick={() => setSelectedExpensa(null)}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-xs font-bold text-white shadow-md cursor-pointer"
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
