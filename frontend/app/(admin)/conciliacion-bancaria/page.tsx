// frontend/app/(admin)/conciliacion-bancaria/page.tsx
// Módulo de Conciliación Bancaria y Cotejo de Extractos (Edificio XYZ)
'use client'

import React, { useState, useMemo } from 'react'
import {
  Landmark,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  Upload,
  Download,
  Printer,
  Search,
  Filter,
  DollarSign,
  Scale,
  RefreshCw,
  FileSpreadsheet,
  Link2,
  ShieldCheck,
  Building2,
  X,
  FileCheck
} from 'lucide-react'

export interface ItemExtractoBancario {
  id: string
  fecha: string
  referencia: string
  glosa: string
  tipo: 'Abono' | 'Cargo' // Abono = Ingreso, Cargo = Egreso
  monto: number
  estado: 'Conciliado' | 'Pendiente' | 'Discrepancia'
  movimientoVinculadoId?: string
  deptoSugerido?: string
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
  referenciaBancaria?: string
}

// Datos de ejemplo realistas para el Edificio XYZ
const EXTRACTO_BANCARIO_SEED: ItemExtractoBancario[] = [
  {
    id: 'BAN-001',
    fecha: '02/10/2026',
    referencia: 'TRF-982104',
    glosa: 'DEP CUENTA EXPENSA DPTO 101 ANA VALDIVIA',
    tipo: 'Abono',
    monto: 325.0,
    estado: 'Conciliado',
    movimientoVinculadoId: 'SIS-001',
    deptoSugerido: '101'
  },
  {
    id: 'BAN-002',
    fecha: '04/10/2026',
    referencia: 'TRF-119283',
    glosa: 'TRANSFERENCIA DPTO 102 MENDOZA CARLOS',
    tipo: 'Abono',
    monto: 362.0,
    estado: 'Conciliado',
    movimientoVinculadoId: 'SIS-002',
    deptoSugerido: '102'
  },
  {
    id: 'BAN-003',
    fecha: '05/10/2026',
    referencia: 'CHQ-004812',
    glosa: 'COBRO CHEQUE OTIS ASCENSORES SERV MANTTO',
    tipo: 'Cargo',
    monto: 1450.0,
    estado: 'Conciliado',
    movimientoVinculadoId: 'SIS-003'
  },
  {
    id: 'BAN-004',
    fecha: '08/10/2026',
    referencia: 'QR-559102',
    glosa: 'PAGO QR BANCO UNION RESIDENTE 201',
    tipo: 'Abono',
    monto: 310.0,
    estado: 'Conciliado',
    movimientoVinculadoId: 'SIS-004',
    deptoSugerido: '201'
  },
  {
    id: 'BAN-005',
    fecha: '11/10/2026',
    referencia: 'TRF-774910',
    glosa: 'TRANSFERENCIA SIN GLOSA DE TERCERO',
    tipo: 'Abono',
    monto: 350.0,
    estado: 'Pendiente',
    deptoSugerido: '105'
  },
  {
    id: 'BAN-006',
    fecha: '12/10/2026',
    referencia: 'DEB-AUTO-01',
    glosa: 'DEBITO AUTOMATICO ELFEC ENERGIA ELECTRICA',
    tipo: 'Cargo',
    monto: 1820.5,
    estado: 'Conciliado',
    movimientoVinculadoId: 'SIS-005'
  },
  {
    id: 'BAN-007',
    fecha: '14/10/2026',
    referencia: 'COM-MAN-OCT',
    glosa: 'COMISION POR MANTENIMIENTO DE CUENTA BANCARIA',
    tipo: 'Cargo',
    monto: 35.0,
    estado: 'Pendiente'
  },
  {
    id: 'BAN-008',
    fecha: '15/10/2026',
    referencia: 'TRF-882914',
    glosa: 'PAGO EXPENSA DPTO 301 ROBERTO DAZA',
    tipo: 'Abono',
    monto: 360.0,
    estado: 'Discrepancia',
    deptoSugerido: '301',
    movimientoVinculadoId: 'SIS-006'
  }
]

const LIBRO_SISTEMA_SEED: ItemLibroSistema[] = [
  {
    id: 'SIS-001',
    fecha: '02/10/2026',
    codigo: 'REC-2026-101',
    concepto: 'Cobro de Expensa Mes Octubre',
    departamento: '101',
    tipo: 'Ingreso',
    monto: 325.0,
    estado: 'Conciliado',
    referenciaBancaria: 'TRF-982104'
  },
  {
    id: 'SIS-002',
    fecha: '04/10/2026',
    codigo: 'REC-2026-102',
    concepto: 'Cobro de Expensa + Consumo de Agua',
    departamento: '102',
    tipo: 'Ingreso',
    monto: 362.0,
    estado: 'Conciliado',
    referenciaBancaria: 'TRF-119283'
  },
  {
    id: 'SIS-003',
    fecha: '05/10/2026',
    codigo: 'EGR-2026-041',
    concepto: 'Mantenimiento Preventivo de Ascensores Otis',
    tipo: 'Egreso',
    monto: 1450.0,
    estado: 'Conciliado',
    referenciaBancaria: 'CHQ-004812'
  },
  {
    id: 'SIS-004',
    fecha: '08/10/2026',
    codigo: 'REC-2026-201',
    concepto: 'Expensa Ordinaria Octubre',
    departamento: '201',
    tipo: 'Ingreso',
    monto: 310.0,
    estado: 'Conciliado',
    referenciaBancaria: 'QR-559102'
  },
  {
    id: 'SIS-005',
    fecha: '12/10/2026',
    codigo: 'EGR-2026-042',
    concepto: 'Servicio de Energía Eléctrica Áreas Comunes ELFEC',
    tipo: 'Egreso',
    monto: 1820.5,
    estado: 'Conciliado',
    referenciaBancaria: 'DEB-AUTO-01'
  },
  {
    id: 'SIS-006',
    fecha: '15/10/2026',
    codigo: 'REC-2026-301',
    concepto: 'Expensa Octubre con Mora Aplicada',
    departamento: '301',
    tipo: 'Ingreso',
    monto: 341.0, // En sistema 341, en banco 360 (diferencia de 19 Bs por regla fija vs porcentual)
    estado: 'Discrepancia',
    referenciaBancaria: 'TRF-882914'
  },
  {
    id: 'SIS-007',
    fecha: '15/10/2026',
    codigo: 'REC-2026-402',
    concepto: 'Expensa Octubre Dpto 402 Claudia Daza',
    departamento: '402',
    tipo: 'Ingreso',
    monto: 400.0,
    estado: 'Pendiente'
  }
]

export default function ConciliacionBancariaPage() {
  const [bancoData, setBancoData] = useState<ItemExtractoBancario[]>(EXTRACTO_BANCARIO_SEED)
  const [sistemaData, setSistemaData] = useState<ItemLibroSistema[]>(LIBRO_SISTEMA_SEED)
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState('bms-principal')
  const [periodo, setPeriodo] = useState('Octubre 2026')
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | 'Conciliado' | 'Pendiente' | 'Discrepancia'>('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isManualLinkModalOpen, setIsManualLinkModalOpen] = useState(false)
  const [itemParaVincular, setItemParaVincular] = useState<ItemExtractoBancario | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Cálculos de saldo de conciliación
  const saldoInicialBanco = 34710.0
  const abonosBanco = bancoData.filter((b) => b.tipo === 'Abono').reduce((a, b) => a + b.monto, 0)
  const cargosBanco = bancoData.filter((b) => b.tipo === 'Cargo').reduce((a, b) => a + b.monto, 0)
  const saldoFinalBanco = saldoInicialBanco + abonosBanco - cargosBanco

  const saldoInicialSistema = 34710.0
  const ingresosSistema = sistemaData.filter((s) => s.tipo === 'Ingreso').reduce((a, b) => a + b.monto, 0)
  const egresosSistema = sistemaData.filter((s) => s.tipo === 'Egreso').reduce((a, b) => a + b.monto, 0)
  const saldoFinalSistema = saldoInicialSistema + ingresosSistema - egresosSistema

  const diferencia = saldoFinalBanco - saldoFinalSistema
  const estaCuadrado = Math.abs(diferencia) < 0.01

  // Porcentaje de conciliación
  const totalPartidas = bancoData.length
  const totalConciliadas = bancoData.filter((b) => b.estado === 'Conciliado').length
  const porcentajeConciliado = totalPartidas > 0 ? Math.round((totalConciliadas / totalPartidas) * 100) : 0

  // Filtrado de partidas
  const bancoFiltrado = useMemo(() => {
    return bancoData.filter((item) => {
      const matchEstado = filtroEstado === 'Todos' || item.estado === filtroEstado
      const matchSearch =
        item.glosa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.referencia.toLowerCase().includes(searchTerm.toLowerCase())
      return matchEstado && matchSearch
    })
  }, [bancoData, filtroEstado, searchTerm])

  const sistemaFiltrado = useMemo(() => {
    return sistemaData.filter((item) => {
      const matchEstado = filtroEstado === 'Todos' || item.estado === filtroEstado
      const matchSearch =
        item.concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.departamento && item.departamento.includes(searchTerm))
      return matchEstado && matchSearch
    })
  }, [sistemaData, filtroEstado, searchTerm])

  // Ejecutar auto-conciliación inteligente
  const handleAutoConciliacion = () => {
    let matchesCount = 0

    // Clonar listas
    const newBanco = bancoData.map((b) => ({ ...b }))
    const newSistema = sistemaData.map((s) => ({ ...s }))

    newBanco.forEach((b) => {
      if (b.estado === 'Pendiente') {
        const match = newSistema.find(
          (s) => s.estado === 'Pendiente' && Math.abs(s.monto - b.monto) < 0.01 && s.tipo === (b.tipo === 'Abono' ? 'Ingreso' : 'Egreso')
        )
        if (match) {
          b.estado = 'Conciliado'
          b.movimientoVinculadoId = match.id
          match.estado = 'Conciliado'
          match.referenciaBancaria = b.referencia
          matchesCount++
        }
      }
    })

    setBancoData(newBanco)
    setSistemaData(newSistema)
    showToast(`¡Auto-conciliación completada! Se cuadraron ${matchesCount} partidas automáticamente.`)
  }

  // Vincular manualmente un ítem
  const handleVincularManual = (sisId: string) => {
    if (!itemParaVincular) return

    setBancoData((prev) =>
      prev.map((b) =>
        b.id === itemParaVincular.id
          ? { ...b, estado: 'Conciliado', movimientoVinculadoId: sisId }
          : b
      )
    )

    setSistemaData((prev) =>
      prev.map((s) =>
        s.id === sisId
          ? { ...s, estado: 'Conciliado', referenciaBancaria: itemParaVincular.referencia }
          : s
      )
    )

    setIsManualLinkModalOpen(false)
    setItemParaVincular(null)
    showToast('¡Partida conciliada manualmente con éxito!')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Toast de confirmación */}
      {toastMessage && (
        <div className="p-4 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl flex items-center gap-3 shadow-md animate-in fade-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* HEADER DE PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-800 dark:text-purple-400 text-xs font-semibold mb-2">
            <Landmark className="w-3.5 h-3.5" />
            Cotejo Contable & Conciliación de Cuentas
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Conciliación Bancaria
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Cotejo de extractos bancarios oficiales contra registros de expensas e ingresos/egresos del Edificio XYZ.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Cuenta */}
          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-900 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Building2 className="w-3.5 h-3.5 text-[#7d776f]" />
            <select
              value={cuentaSeleccionada}
              onChange={(e) => setCuentaSeleccionada(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="bms-principal">BMSC Cta. Cte. N° 4010-829104-Bs (Expensas)</option>
              <option value="bnb-reserva">BNB Cta. Ahorros N° 2000-19283-Bs (Reserva)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleAutoConciliacion}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Auto-Conciliar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-white text-xs font-bold rounded-xl hover:bg-[#ded8cc] transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Subir Extracto</span>
          </button>
        </div>
      </div>

      {/* TARJETAS DE ESTADO DE CONCILIACIÓN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Saldo Banco */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-[#7d776f] dark:text-slate-400">
            Saldo Según Extracto Bancario
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#262422] dark:text-white mt-1 font-mono">
            Bs. {saldoFinalBanco.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#7d776f] mt-0.5">
            Corte al 16 de Octubre de 2026
          </div>
        </div>

        {/* Saldo Sistema */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-[#7d776f] dark:text-slate-400">
            Saldo Según Libros del Sistema
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#262422] dark:text-white mt-1 font-mono">
            Bs. {saldoFinalSistema.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#7d776f] mt-0.5">
            Total recaudaciones y egresos
          </div>
        </div>

        {/* Diferencia */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-[#7d776f] dark:text-slate-400">
            Diferencia a Justificar
          </div>
          <div
            className={`text-xl sm:text-2xl font-extrabold mt-1 font-mono ${
              estaCuadrado ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            Bs. {Math.abs(diferencia).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-bold mt-0.5 flex items-center gap-1">
            {estaCuadrado ? (
              <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Conciliación Cuadrada (0.00)
              </span>
            ) : (
              <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Partidas pendientes de cotejo
              </span>
            )}
          </div>
        </div>

        {/* Progreso */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-[#7d776f] dark:text-slate-400">
            Avance de Conciliación
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 dark:text-purple-400 mt-1">
            {porcentajeConciliado}%
          </div>
          <div className="text-[11px] text-[#7d776f] mt-0.5">
            {totalConciliadas} de {totalPartidas} movimientos cotejados
          </div>
        </div>
      </div>

      {/* FILTROS Y ESTADOS */}
      <div className="p-3.5 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7d776f] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por referencia, glosa, código o departamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#7d776f]" />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="bg-transparent text-[#262422] dark:text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="Todos">Estado: Todos</option>
              <option value="Conciliado">Solo Conciliados</option>
              <option value="Pendiente">Pendientes</option>
              <option value="Discrepancia">Discrepancias</option>
            </select>
          </div>
        </div>
      </div>

      {/* VISTA COMPARATIVA EN DOS COLUMNAS (SIDE-BY-SIDE) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* COLUMNA 1: EXTRACTO BANCARIO OFICIAL */}
        <div className="rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="p-4 bg-[#dfd9ce]/70 dark:bg-slate-950/70 border-b border-[#cec8bc] dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                <h3 className="font-extrabold text-sm text-[#262422] dark:text-white">
                  1. Extracto del Banco ({bancoFiltrado.length})
                </h3>
              </div>
              <span className="text-[11px] font-bold text-[#7d776f]">
                {cuentaSeleccionada === 'bms-principal' ? 'BMSC Cta. Cte.' : 'BNB Ahorros'}
              </span>
            </div>

            <div className="divide-y divide-[#cec8bc] dark:divide-slate-800 max-h-[500px] overflow-y-auto">
              {bancoFiltrado.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#7d776f]">
                  No hay movimientos bancarios con el filtro seleccionado.
                </div>
              ) : (
                bancoFiltrado.map((item) => {
                  const isAbono = item.tipo === 'Abono'
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 hover:bg-[#dfd9ce]/40 dark:hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[10px] text-[#7d776f]">
                            {item.fecha}
                          </span>
                          <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-[#cec8bc] dark:bg-slate-800 text-[#262422] dark:text-white">
                            {item.referencia}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.estado === 'Conciliado'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : item.estado === 'Discrepancia'
                                ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                            }`}
                          >
                            {item.estado}
                          </span>
                        </div>
                        <p className="font-semibold text-[#262422] dark:text-white text-xs line-clamp-1">
                          {item.glosa}
                        </p>
                        {item.deptoSugerido && (
                          <span className="text-[10px] text-blue-700 dark:text-blue-400 font-bold block">
                            Dpto. Identificado: {item.deptoSugerido}
                          </span>
                        )}
                      </div>

                      <div className="text-right space-y-1">
                        <span
                          className={`font-mono font-extrabold text-sm block ${
                            isAbono ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {isAbono ? '+' : '-'}Bs. {item.monto.toFixed(2)}
                        </span>
                        {item.estado === 'Pendiente' && (
                          <button
                            type="button"
                            onClick={() => {
                              setItemParaVincular(item)
                              setIsManualLinkModalOpen(true)
                            }}
                            className="text-[10px] text-purple-700 dark:text-purple-400 hover:underline font-bold cursor-pointer"
                          >
                            Vincular
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="p-3 bg-[#dfd9ce]/40 dark:bg-slate-950/40 border-t border-[#cec8bc] dark:border-slate-800 text-xs flex justify-between font-bold">
            <span>Total Movimientos Banco</span>
            <span className="font-mono text-purple-700 dark:text-purple-400">
              Bs. {saldoFinalBanco.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* COLUMNA 2: REGISTROS EN LIBRO DEL SISTEMA */}
        <div className="rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="p-4 bg-[#dfd9ce]/70 dark:bg-slate-950/70 border-b border-[#cec8bc] dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <h3 className="font-extrabold text-sm text-[#262422] dark:text-white">
                  2. Registros del Sistema ({sistemaFiltrado.length})
                </h3>
              </div>
              <span className="text-[11px] font-bold text-[#7d776f]">
                Expensas & Movimientos
              </span>
            </div>

            <div className="divide-y divide-[#cec8bc] dark:divide-slate-800 max-h-[500px] overflow-y-auto">
              {sistemaFiltrado.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#7d776f]">
                  No hay registros contables con el filtro seleccionado.
                </div>
              ) : (
                sistemaFiltrado.map((item) => {
                  const isIngreso = item.tipo === 'Ingreso'
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 hover:bg-[#dfd9ce]/40 dark:hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[10px] text-[#7d776f]">
                            {item.fecha}
                          </span>
                          <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-[#cec8bc] dark:bg-slate-800 text-[#262422] dark:text-white">
                            {item.codigo}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.estado === 'Conciliado'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : item.estado === 'Discrepancia'
                                ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                            }`}
                          >
                            {item.estado}
                          </span>
                        </div>
                        <p className="font-semibold text-[#262422] dark:text-white text-xs line-clamp-1">
                          {item.concepto}
                        </p>
                        {item.departamento && (
                          <span className="text-[10px] text-purple-700 dark:text-purple-400 font-bold block">
                            Dpto. {item.departamento}
                          </span>
                        )}
                      </div>

                      <div className="text-right space-y-1">
                        <span
                          className={`font-mono font-extrabold text-sm block ${
                            isIngreso ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {isIngreso ? '+' : '-'}Bs. {item.monto.toFixed(2)}
                        </span>
                        {item.referenciaBancaria && (
                          <span className="text-[10px] font-mono text-[#7d776f] block">
                            Ref: {item.referenciaBancaria}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="p-3 bg-[#dfd9ce]/40 dark:bg-slate-950/40 border-t border-[#cec8bc] dark:border-slate-800 text-xs flex justify-between font-bold">
            <span>Total Registros Libros</span>
            <span className="font-mono text-blue-700 dark:text-blue-400">
              Bs. {saldoFinalSistema.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* MODAL VINCULACIÓN MANUAL */}
      {isManualLinkModalOpen && itemParaVincular && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white flex items-center gap-2">
                <Link2 className="w-4 h-4 text-purple-700" />
                Vincular Partida Bancaria Manualmente
              </h3>
              <button onClick={() => setIsManualLinkModalOpen(false)} className="text-[#7d776f] hover:text-[#262422]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800 text-xs space-y-1">
              <span className="font-bold text-[#7d776f] uppercase block text-[10px]">Movimiento en Extracto:</span>
              <p className="font-bold text-[#262422] dark:text-white">{itemParaVincular.glosa}</p>
              <div className="flex justify-between font-mono font-bold pt-1">
                <span>Ref: {itemParaVincular.referencia}</span>
                <span className="text-emerald-700 dark:text-emerald-400">Bs. {itemParaVincular.monto.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-xs text-[#262422] dark:text-white block">
                Seleccione el registro del sistema a cotejar:
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {sistemaData
                  .filter((s) => s.estado === 'Pendiente')
                  .map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleVincularManual(s.id)}
                      className="p-3 rounded-xl border border-[#cec8bc] dark:border-slate-700 bg-[#dfd9ce]/40 dark:bg-slate-800/40 hover:bg-purple-100 dark:hover:bg-purple-950/40 transition-colors cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#262422] dark:text-white block">{s.concepto}</span>
                        <span className="text-[11px] text-[#7d776f] font-mono">{s.codigo} {s.departamento ? `• Dpto ${s.departamento}` : ''}</span>
                      </div>
                      <span className="font-mono font-extrabold text-sm text-purple-700 dark:text-purple-400">
                        Bs. {s.monto.toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsManualLinkModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#5c5750] hover:bg-[#ded8cc]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUBIR EXTRACTO */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-purple-700" />
                Cargar Extracto Bancario
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-[#7d776f] hover:text-[#262422]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 border-2 border-dashed border-[#cec8bc] dark:border-slate-700 rounded-2xl text-center space-y-2 bg-[#dfd9ce]/30">
              <FileSpreadsheet className="w-10 h-10 text-purple-700 dark:text-purple-400 mx-auto" />
              <p className="text-xs font-bold text-[#262422] dark:text-white">
                Arrastre su archivo de extracto aquí o haga clic para examinar
              </p>
              <p className="text-[11px] text-[#7d776f]">Formatos soportados: CSV, XLSX, TXT (BMSC, BNB, Banco Unión)</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#5c5750] hover:bg-[#ded8cc]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false)
                  showToast('¡Extracto bancario importado exitosamente!')
                }}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md"
              >
                Procesar Extracto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
