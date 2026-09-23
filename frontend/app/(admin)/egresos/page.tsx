// frontend/app/(admin)/egresos/page.tsx
// Módulo de Gestión de Egresos, Gastos y Proveedores

'use client'

import React, { useState, useMemo } from 'react'
import {
  Wallet,
  DollarSign,
  TrendingDown,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Building,
  Tag,
  Calendar,
  Eye,
  X,
  FileText
} from 'lucide-react'

export interface EgresoItem {
  id: number
  codigo: string
  fecha: string
  categoria: 'Mantenimiento' | 'Servicios Básicos' | 'Seguridad' | 'Limpieza' | 'Administrativo'
  proveedor: string
  descripcion: string
  nroFactura: string
  monto: number
  estado: 'Pagado' | 'Pendiente' | 'En Revisión'
  metodoPago: string
}

const EGRESOS_INICIALES: EgresoItem[] = [
  {
    id: 1,
    codigo: 'EGR-2026-081',
    fecha: '2026-09-18',
    categoria: 'Mantenimiento',
    proveedor: 'Otis Elevadores Bolivia S.A.',
    descripcion: 'Mantenimiento preventivo bimensual de ascensores torre A y B.',
    nroFactura: 'FAC-90182',
    monto: 3500.0,
    estado: 'Pagado',
    metodoPago: 'Transferencia Bancaria'
  },
  {
    id: 2,
    codigo: 'EGR-2026-082',
    fecha: '2026-09-15',
    categoria: 'Servicios Básicos',
    proveedor: 'ELFEC S.A.',
    descripcion: 'Energía eléctrica de áreas comunes, bombas de agua y pasillos.',
    nroFactura: 'FAC-349012',
    monto: 2450.0,
    estado: 'Pagado',
    metodoPago: 'Débito Automático'
  },
  {
    id: 3,
    codigo: 'EGR-2026-083',
    fecha: '2026-09-14',
    categoria: 'Seguridad',
    proveedor: 'Seguritas Integral Ltda.',
    descripcion: 'Servicio de vigilancia y monitoreo 24/7 mes en curso.',
    nroFactura: 'FAC-11928',
    monto: 4200.0,
    estado: 'Pagado',
    metodoPago: 'Cheque de Gerencia'
  },
  {
    id: 4,
    codigo: 'EGR-2026-084',
    fecha: '2026-09-20',
    categoria: 'Limpieza',
    proveedor: 'Distribuidora Química del Valle',
    descripcion: 'Insumos de limpieza, desinfectantes y bolsas de consorcio.',
    nroFactura: 'FAC-4891',
    monto: 850.0,
    estado: 'Pendiente',
    metodoPago: 'Efectivo Caja Chica'
  },
  {
    id: 5,
    codigo: 'EGR-2026-085',
    fecha: '2026-09-21',
    categoria: 'Mantenimiento',
    proveedor: 'Plomería & Bombas Express',
    descripcion: 'Reparación de válvula de presión en tanque subterráneo.',
    nroFactura: 'REC-0982',
    monto: 620.0,
    estado: 'En Revisión',
    metodoPago: 'Por Definir'
  }
]

export default function EgresosPage() {
  const [egresos, setEgresos] = useState<EgresoItem[]>(EGRESOS_INICIALES)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('Todos')
  const [filtroEstado, setFiltroEstado] = useState('Todos')

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedEgreso, setSelectedEgreso] = useState<EgresoItem | null>(null)

  // Formulario
  const [nuevoProveedor, setNuevoProveedor] = useState('')
  const [nuevaCategoria, setNuevaCategoria] = useState<EgresoItem['categoria']>('Mantenimiento')
  const [nuevaDescripcion, setNuevaDescripcion] = useState('')
  const [nuevoNroFactura, setNuevoNroFactura] = useState('')
  const [nuevoMonto, setNuevoMonto] = useState<number>(0)
  const [nuevoMetodoPago, setNuevoMetodoPago] = useState('Transferencia Bancaria')

  // Filtrado
  const egresosFiltrados = useMemo(() => {
    return egresos.filter((e) => {
      const matchSearch =
        e.proveedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.nroFactura.toLowerCase().includes(searchTerm.toLowerCase())
      const matchCat = filtroCategoria === 'Todos' || e.categoria === filtroCategoria
      const matchEst = filtroEstado === 'Todos' || e.estado === filtroEstado
      return matchSearch && matchCat && matchEst
    })
  }, [egresos, searchTerm, filtroCategoria, filtroEstado])

  // Totales
  const totalGastos = egresos.reduce((acc, curr) => acc + curr.monto, 0)
  const totalPagados = egresos
    .filter((e) => e.estado === 'Pagado')
    .reduce((acc, curr) => acc + curr.monto, 0)
  const totalPendientes = totalGastos - totalPagados

  const handleCrearEgreso = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoProveedor.trim() || nuevoMonto <= 0) return

    const nuevo: EgresoItem = {
      id: Date.now(),
      codigo: `EGR-2026-0${egresos.length + 1}`,
      fecha: new Date().toISOString().split('T')[0],
      categoria: nuevaCategoria,
      proveedor: nuevoProveedor.trim(),
      descripcion: nuevaDescripcion.trim() || 'Sin descripción detallada',
      nroFactura: nuevoNroFactura.trim() || `FAC-${Date.now().toString().slice(-4)}`,
      monto: Number(nuevoMonto),
      estado: 'Pagado',
      metodoPago: nuevoMetodoPago
    }

    setEgresos([nuevo, ...egresos])
    setIsCreateModalOpen(false)
    // Limpiar
    setNuevoProveedor('')
    setNuevaDescripcion('')
    setNuevoNroFactura('')
    setNuevoMonto(0)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-400 text-xs font-semibold mb-2">
            <Wallet className="w-3.5 h-3.5" />
            Control de Egresos & Facturas
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Egresos, Gastos y Facturas
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Registro de pagos a proveedores, servicios básicos, compras y liquidaciones del
            edificio.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-rose-800/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Registrar Egreso
        </button>
      </div>

      {/* KPIS DE GASTOS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Total Egresos Mes</span>
            <TrendingDown className="w-4 h-4 text-rose-700 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-900 dark:text-rose-400">
            Bs. {totalGastos.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">Gastos devengados</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Pagados / Ejecutados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-[#262422] dark:text-white">
            Bs. {totalPagados.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Con factura conciliada
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Por Pagar / Revisión</span>
            <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-400">
            Bs. {totalPendientes.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Compromisos pendientes
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Mayor Rubro</span>
            <Tag className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <div className="text-lg font-bold text-[#262422] dark:text-white truncate">
            Seguridad & Mantenimiento
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            68% del presupuesto
          </span>
        </div>
      </div>

      {/* BUSCADOR Y FILTROS */}
      <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por proveedor, factura o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-600 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#7d776f]" />
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
            >
              <option value="Todos">Rubro: Todos</option>
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="Servicios Básicos">Servicios Básicos</option>
              <option value="Seguridad">Seguridad</option>
              <option value="Limpieza">Limpieza</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
            >
              <option value="Todos">Estado: Todos</option>
              <option value="Pagado">Pagado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En Revisión">En Revisión</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLA DE EGRESOS */}
      <div className="rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#e3ded4] dark:bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-[#5c5750] dark:text-slate-400">
                <th className="py-3 px-4">Código / Fecha</th>
                <th className="py-3 px-4">Proveedor & Factura</th>
                <th className="py-3 px-4">Rubro / Categoría</th>
                <th className="py-3 px-4">Descripción</th>
                <th className="py-3 px-4">Monto (Bs.)</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cec8bc]/60 dark:divide-slate-800 text-xs">
              {egresosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#7d776f] dark:text-slate-500">
                    No se encontraron registros de egresos.
                  </td>
                </tr>
              ) : (
                egresosFiltrados.map((egreso) => (
                  <tr
                    key={egreso.id}
                    className="hover:bg-[#e6e1d6]/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#262422] dark:text-white font-mono text-xs">
                        {egreso.codigo}
                      </div>
                      <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                        {egreso.fecha}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#262422] dark:text-white flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
                        {egreso.proveedor}
                      </div>
                      <div className="text-[11px] text-[#7d776f] dark:text-slate-400 font-mono">
                        Fact: {egreso.nroFactura}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#dfd9ce] dark:bg-slate-800 text-[#4a4641] dark:text-slate-300 font-semibold text-[11px]">
                        {egreso.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#5c5750] dark:text-slate-400 max-w-xs truncate">
                      {egreso.descripcion}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-[#262422] dark:text-white text-sm">
                      Bs. {egreso.monto.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          egreso.estado === 'Pagado'
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                            : egreso.estado === 'Pendiente'
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                              : 'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30'
                        }`}
                      >
                        {egreso.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedEgreso(egreso)}
                        className="p-1.5 rounded-lg text-[#5c5750] hover:text-[#262422] hover:bg-[#ded8cc] dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Ver Comprobante de Gasto"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR EGRESO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-lg text-[#262422] dark:text-white">
                Registrar Nuevo Gasto / Egreso
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearEgreso} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Proveedor / Beneficiario *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. ELFEC S.A., Tigo, Plomería Morales"
                  value={nuevoProveedor}
                  onChange={(e) => setNuevoProveedor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Rubro / Categoría
                  </label>
                  <select
                    value={nuevaCategoria}
                    onChange={(e) => setNuevaCategoria(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-600 cursor-pointer"
                  >
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Servicios Básicos">Servicios Básicos</option>
                    <option value="Seguridad">Seguridad</option>
                    <option value="Limpieza">Limpieza</option>
                    <option value="Administrativo">Administrativo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Monto (Bs.) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="0.00"
                    value={nuevoMonto || ''}
                    onChange={(e) => setNuevoMonto(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Nro Factura / Recibo
                  </label>
                  <input
                    type="text"
                    placeholder="FAC-89012"
                    value={nuevoNroFactura}
                    onChange={(e) => setNuevoNroFactura(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Forma de Pago
                  </label>
                  <select
                    value={nuevoMetodoPago}
                    onChange={(e) => setNuevoMetodoPago(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-600 cursor-pointer"
                  >
                    <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Débito Automático">Débito Automático</option>
                    <option value="Efectivo Caja Chica">Efectivo Caja Chica</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Descripción / Concepto del Gasto
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre el trabajo o servicio prestado..."
                  value={nuevaDescripcion}
                  onChange={(e) => setNuevaDescripcion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-semibold text-[#262422] dark:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-xs font-bold text-white shadow-md cursor-pointer"
                >
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE EGRESO */}
      {selectedEgreso && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                Comprobante de Egreso
              </h3>
              <button
                onClick={() => setSelectedEgreso(null)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Código:</span>
                <span className="font-bold font-mono">{selectedEgreso.codigo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Proveedor:</span>
                <span className="font-bold">{selectedEgreso.proveedor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Factura Nro:</span>
                <span className="font-bold">{selectedEgreso.nroFactura}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Fecha de Pago:</span>
                <span className="font-bold">{selectedEgreso.fecha}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Método:</span>
                <span className="font-bold">{selectedEgreso.metodoPago}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800 mt-2">
                <span className="font-bold block text-[10px] uppercase text-[#7d776f] mb-1">
                  Concepto
                </span>
                <p className="text-[#4a4641] dark:text-slate-300">{selectedEgreso.descripcion}</p>
              </div>
              <div className="flex justify-between font-extrabold text-base text-rose-900 dark:text-rose-400 pt-2 border-t border-[#cec8bc] dark:border-slate-800">
                <span>Monto Desembolsado:</span>
                <span>Bs. {selectedEgreso.monto.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#cec8bc] dark:border-slate-800">
              <button
                onClick={() => setSelectedEgreso(null)}
                className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer"
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
