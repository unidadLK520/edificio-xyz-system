// frontend/app/(admin)/egresos/page.tsx
// Módulo de Gestión de Egresos, Gastos y Proveedores

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
  FileText,
  Loader2
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

const CATEGORIA_MAP: Record<string, number> = {
  'Mantenimiento': 1,
  'Servicios Básicos': 2,
  'Seguridad': 3,
  'Limpieza': 4,
  'Administrativo': 5
}

export default function EgresosPage() {
  const [egresos, setEgresos] = useState<EgresoItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

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

  // Fetch egresos desde backend API /api/v1/movimientos
  const fetchEgresos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/movimientos?tipo=Egreso')
      if (res.ok) {
        const json = await res.json()
        const rawData = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []

        const mapped: EgresoItem[] = rawData.map((item: any) => {
          let proveedor = item.proveedor || ''
          let descripcionClean = item.descripcion || ''

          if (descripcionClean.includes('|')) {
            const parts = descripcionClean.split('|')
            proveedor = parts[0].trim()
            descripcionClean = parts.slice(1).join('|').trim()
          }
          if (!proveedor) proveedor = 'Proveedor General'

          return {
            id: item.idMovimiento || item.id || Date.now(),
            codigo: item.codigo || `EGR-2026-${String(item.idMovimiento || item.id || 1).padStart(3, '0')}`,
            fecha: item.fecha ? new Date(item.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            categoria: (item.categoria?.nombre as EgresoItem['categoria']) || item.categoria || 'Mantenimiento',
            proveedor: proveedor,
            descripcion: descripcionClean || 'Sin descripción detallada',
            nroFactura: item.comprobanteUrl || item.nroFactura || 'FAC-0000',
            monto: Number(item.monto || 0),
            estado: item.estado || 'Pagado',
            metodoPago: item.metodoPago || 'Transferencia Bancaria'
          }
        })
        setEgresos(mapped)
      }
    } catch (err) {
      console.error('Error al cargar egresos desde la API:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEgresos()
  }, [fetchEgresos])

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

  // Totales dinámicos
  const totalGastos = useMemo(() => egresos.reduce((acc, curr) => acc + curr.monto, 0), [egresos])
  const totalPagados = useMemo(
    () =>
      egresos
        .filter((e) => e.estado === 'Pagado')
        .reduce((acc, curr) => acc + curr.monto, 0),
    [egresos]
  )
  const totalPendientes = useMemo(() => totalGastos - totalPagados, [totalGastos, totalPagados])

  // Cálculo dinámico del "Mayor Rubro"
  const mayorRubroInfo = useMemo(() => {
    if (egresos.length === 0 || totalGastos === 0) {
      return { nombre: 'Sin registros', porcentaje: 0 }
    }
    const totalsByCat: Record<string, number> = {}
    egresos.forEach((e) => {
      totalsByCat[e.categoria] = (totalsByCat[e.categoria] || 0) + e.monto
    })

    let maxCat = ''
    let maxVal = 0
    Object.entries(totalsByCat).forEach(([cat, val]) => {
      if (val > maxVal) {
        maxVal = val
        maxCat = cat
      }
    })

    const porcentaje = Math.round((maxVal / totalGastos) * 100)
    return { nombre: maxCat, porcentaje }
  }, [egresos, totalGastos])

  const handleCrearEgreso = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoProveedor.trim() || nuevoMonto <= 0) return

    setIsSubmitting(true)
    try {
      const idCat = CATEGORIA_MAP[nuevaCategoria] || 1
      const bodyPayload = {
        tipo: 'Egreso',
        idCategoria: idCat,
        monto: Number(nuevoMonto),
        descripcion: `${nuevoProveedor.trim()} | ${nuevaDescripcion.trim() || 'Sin descripción detallada'}`,
        comprobanteUrl: nuevoNroFactura.trim() || `FAC-${Date.now().toString().slice(-4)}`
      }

      const res = await fetch('/api/v1/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      })

      if (res.ok) {
        await fetchEgresos()
      } else {
        const nuevo: EgresoItem = {
          id: Date.now(),
          codigo: `EGR-2026-${String(egresos.length + 1).padStart(3, '0')}`,
          fecha: new Date().toISOString().split('T')[0],
          categoria: nuevaCategoria,
          proveedor: nuevoProveedor.trim(),
          descripcion: nuevaDescripcion.trim() || 'Sin descripción detallada',
          nroFactura: nuevoNroFactura.trim() || `FAC-${Date.now().toString().slice(-4)}`,
          monto: Number(nuevoMonto),
          estado: 'Pagado',
          metodoPago: nuevoMetodoPago
        }
        setEgresos((prev) => [nuevo, ...prev])
      }

      setIsCreateModalOpen(false)
      setNuevoProveedor('')
      setNuevaDescripcion('')
      setNuevoNroFactura('')
      setNuevoMonto(0)
    } catch (err) {
      console.error('Error creando egreso:', err)
    } finally {
      setIsSubmitting(false)
    }
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
            Bs. {totalGastos.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">Gastos devengados</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Pagados / Ejecutados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-[#262422] dark:text-white">
            Bs. {totalPagados.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            Bs. {totalPendientes.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            {mayorRubroInfo.nombre}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            {mayorRubroInfo.porcentaje}% del total registrado
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
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#7d776f] dark:text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-rose-700" />
                      <span>Cargando egresos desde el servidor...</span>
                    </div>
                  </td>
                </tr>
              ) : egresosFiltrados.length === 0 ? (
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
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-xs font-bold text-white shadow-md cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmitting ? 'Guardando...' : 'Guardar Gasto'}
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
