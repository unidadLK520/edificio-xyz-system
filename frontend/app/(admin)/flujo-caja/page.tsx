// frontend/app/(admin)/flujo-caja/page.tsx
// Módulo de Flujo de Caja y Gráficos Financieros Interactivos (Edificio XYZ)
'use client'

import React, { useState, useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Filter,
  Download,
  Printer,
  BarChart3,
  PieChart,
  LineChart,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sliders,
  Wallet,
  Building2,
  RefreshCw,
  Search,
  Scale
} from 'lucide-react'

interface MesFlujoData {
  mes: string
  mesCorto: string
  saldoInicial: number
  ingresosOrdinarios: number // Expensas A, B, C y agua
  ingresosExtraordinarios: number // Salón de eventos, multas, intereses
  totalIngresos: number
  egresosOperativos: number // Servicios, seguridad, limpieza
  egresosMantenimiento: number // Ascensores, bombas, reparaciones
  egresosAdministrativos: number // Software, suministros, honorarios
  totalEgresos: number
  flujoNeto: number // totalIngresos - totalEgresos
  saldoFinal: number
}

// Datos anuales reales basados en el modelo de 20 departamentos del Edificio XYZ
const FLUX_DATA_2026: MesFlujoData[] = [
  {
    mes: 'Enero 2026',
    mesCorto: 'Ene',
    saldoInicial: 15000,
    ingresosOrdinarios: 7420,
    ingresosExtraordinarios: 1200,
    totalIngresos: 8620,
    egresosOperativos: 3800,
    egresosMantenimiento: 1600,
    egresosAdministrativos: 850,
    totalEgresos: 6250,
    flujoNeto: 2370,
    saldoFinal: 17370
  },
  {
    mes: 'Febrero 2026',
    mesCorto: 'Feb',
    saldoInicial: 17370,
    ingresosOrdinarios: 7150,
    ingresosExtraordinarios: 950,
    totalIngresos: 8100,
    egresosOperativos: 3950,
    egresosMantenimiento: 2100,
    egresosAdministrativos: 780,
    totalEgresos: 6830,
    flujoNeto: 1270,
    saldoFinal: 18640
  },
  {
    mes: 'Marzo 2026',
    mesCorto: 'Mar',
    saldoInicial: 18640,
    ingresosOrdinarios: 7600,
    ingresosExtraordinarios: 1500,
    totalIngresos: 9100,
    egresosOperativos: 3750,
    egresosMantenimiento: 1400,
    egresosAdministrativos: 900,
    totalEgresos: 6050,
    flujoNeto: 3050,
    saldoFinal: 21690
  },
  {
    mes: 'Abril 2026',
    mesCorto: 'Abr',
    saldoInicial: 21690,
    ingresosOrdinarios: 6980,
    ingresosExtraordinarios: 800,
    totalIngresos: 7780,
    egresosOperativos: 4100,
    egresosMantenimiento: 2800,
    egresosAdministrativos: 820,
    totalEgresos: 7720,
    flujoNeto: 60,
    saldoFinal: 21750
  },
  {
    mes: 'Mayo 2026',
    mesCorto: 'May',
    saldoInicial: 21750,
    ingresosOrdinarios: 7750,
    ingresosExtraordinarios: 1800,
    totalIngresos: 9550,
    egresosOperativos: 3850,
    egresosMantenimiento: 1550,
    egresosAdministrativos: 890,
    totalEgresos: 6290,
    flujoNeto: 3260,
    saldoFinal: 25010
  },
  {
    mes: 'Junio 2026',
    mesCorto: 'Jun',
    saldoInicial: 25010,
    ingresosOrdinarios: 7300,
    ingresosExtraordinarios: 1100,
    totalIngresos: 8400,
    egresosOperativos: 3900,
    egresosMantenimiento: 1900,
    egresosAdministrativos: 850,
    totalEgresos: 6650,
    flujoNeto: 1750,
    saldoFinal: 26760
  },
  {
    mes: 'Julio 2026',
    mesCorto: 'Jul',
    saldoInicial: 26760,
    ingresosOrdinarios: 7550,
    ingresosExtraordinarios: 1400,
    totalIngresos: 8950,
    egresosOperativos: 3800,
    egresosMantenimiento: 1350,
    egresosAdministrativos: 910,
    totalEgresos: 6060,
    flujoNeto: 2890,
    saldoFinal: 29650
  },
  {
    mes: 'Agosto 2026',
    mesCorto: 'Ago',
    saldoInicial: 29650,
    ingresosOrdinarios: 7400,
    ingresosExtraordinarios: 1300,
    totalIngresos: 8700,
    egresosOperativos: 3950,
    egresosMantenimiento: 2200,
    egresosAdministrativos: 840,
    totalEgresos: 6990,
    flujoNeto: 1710,
    saldoFinal: 31360
  },
  {
    mes: 'Septiembre 2026',
    mesCorto: 'Sep',
    saldoInicial: 31360,
    ingresosOrdinarios: 7850,
    ingresosExtraordinarios: 1650,
    totalIngresos: 9500,
    egresosOperativos: 3820,
    egresosMantenimiento: 1450,
    egresosAdministrativos: 880,
    totalEgresos: 6150,
    flujoNeto: 3350,
    saldoFinal: 34710
  },
  {
    mes: 'Octubre 2026',
    mesCorto: 'Oct',
    saldoInicial: 34710,
    ingresosOrdinarios: 7600,
    ingresosExtraordinarios: 1250,
    totalIngresos: 8850,
    egresosOperativos: 3900,
    egresosMantenimiento: 1750,
    egresosAdministrativos: 900,
    totalEgresos: 6550,
    flujoNeto: 2300,
    saldoFinal: 37010
  },
  {
    mes: 'Noviembre 2026 (Proy.)',
    mesCorto: 'Nov',
    saldoInicial: 37010,
    ingresosOrdinarios: 7500,
    ingresosExtraordinarios: 1100,
    totalIngresos: 8600,
    egresosOperativos: 3920,
    egresosMantenimiento: 1600,
    egresosAdministrativos: 860,
    totalEgresos: 6380,
    flujoNeto: 2220,
    saldoFinal: 39230
  },
  {
    mes: 'Diciembre 2026 (Proy.)',
    mesCorto: 'Dic',
    saldoInicial: 39230,
    ingresosOrdinarios: 7900,
    ingresosExtraordinarios: 2200,
    totalIngresos: 10100,
    egresosOperativos: 4500,
    egresosMantenimiento: 1800,
    egresosAdministrativos: 1200,
    totalEgresos: 7500,
    flujoNeto: 2600,
    saldoFinal: 41830
  }
]

// Categorías de egresos con porcentajes consolidados
const CATEGORIAS_GASTO = [
  { nombre: 'Servicios Básicos & Limpieza', monto: 47240, porcentaje: 59.8, color: '#2563eb', darkColor: '#60a5fa' },
  { nombre: 'Mantenimiento & Ascensores', monto: 21700, porcentaje: 27.5, color: '#f59e0b', darkColor: '#fbbf24' },
  { nombre: 'Administración & Suministros', monto: 10080, porcentaje: 12.7, color: '#8b5cf6', darkColor: '#a78bfa' }
]

export default function FlujoCajaPage() {
  const [data] = useState<MesFlujoData[]>(FLUX_DATA_2026)
  const [selectedMesIndex, setSelectedMesIndex] = useState<number>(9) // Octubre por defecto
  const [vistaActiva, setVistaActiva] = useState<'graficos' | 'tabla' | 'simulador'>('graficos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<'todos' | 'q1' | 'q2' | 'q3' | 'q4'>('todos')
  const [simulacionMorosidad, setSimulacionMorosidad] = useState<number>(0) // % mora simulada
  const [simulacionGastoExtra, setSimulacionGastoExtra] = useState<number>(0) // Bs adicionales

  // Filtrado de datos por trimestre
  const datosFiltrados = useMemo(() => {
    if (filtroPeriodo === 'q1') return data.slice(0, 3)
    if (filtroPeriodo === 'q2') return data.slice(3, 6)
    if (filtroPeriodo === 'q3') return data.slice(6, 9)
    if (filtroPeriodo === 'q4') return data.slice(9, 12)
    return data
  }, [data, filtroPeriodo])

  // Totales acumulados
  const totalIngresos = useMemo(() => datosFiltrados.reduce((acc, m) => acc + m.totalIngresos, 0), [datosFiltrados])
  const totalEgresos = useMemo(() => datosFiltrados.reduce((acc, m) => acc + m.totalEgresos, 0), [datosFiltrados])
  const flujoNetoTotal = totalIngresos - totalEgresos
  const saldoFinalPeriodo = datosFiltrados[datosFiltrados.length - 1]?.saldoFinal || 0
  const mesSeleccionado = data[selectedMesIndex] || data[0]

  // Valores simulados
  const ingresosSimulados = totalIngresos * (1 - simulacionMorosidad / 100)
  const egresosSimulados = totalEgresos + simulacionGastoExtra * datosFiltrados.length
  const flujoNetoSimulado = ingresosSimulados - egresosSimulados

  // Máximo para escala de gráficos
  const maxIngresoEgreso = Math.max(...data.map((d) => Math.max(d.totalIngresos, d.totalEgresos)), 12000)

  // Exportar a CSV
  const handleExportCSV = () => {
    const headers = 'Mes,Saldo Inicial,Ingresos Ordinarios,Ingresos Extra,Total Ingresos,Egresos Operativos,Mantenimiento,Administrativo,Total Egresos,Flujo Neto,Saldo Final\n'
    const rows = datosFiltrados
      .map(
        (d) =>
          `"${d.mes}",${d.saldoInicial},${d.ingresosOrdinarios},${d.ingresosExtraordinarios},${d.totalIngresos},${d.egresosOperativos},${d.egresosMantenimiento},${d.egresosAdministrativos},${d.totalEgresos},${d.flujoNeto},${d.saldoFinal}`
      )
      .join('\n')

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `flujo_caja_edificio_xyz_${filtroPeriodo}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER DE PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-400 text-xs font-semibold mb-2">
            <LineChart className="w-3.5 h-3.5" />
            Control Financiero & Liquidez Edificio XYZ
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Flujo de Caja y Análisis Gráfico
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Visualización interactiva de ingresos operativos, gastos presupuestados y proyección de saldos de reserva.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Trimestre */}
          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-900 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Calendar className="w-3.5 h-3.5 text-[#7d776f]" />
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value as any)}
              className="bg-transparent text-[#262422] dark:text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="todos">Año Completo (2026)</option>
              <option value="q1">1° Trimestre (Ene - Mar)</option>
              <option value="q2">2° Trimestre (Abr - Jun)</option>
              <option value="q3">3° Trimestre (Jul - Sep)</option>
              <option value="q4">4° Trimestre (Oct - Dic)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Descargar CSV</span>
          </button>
        </div>
      </div>

      {/* KPIS PRINCIPALES DE FLUJO DE CAJA */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Ingresos */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Ingresos Totales</span>
            <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-800 dark:text-emerald-400 font-mono">
            Bs. {totalIngresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#7d776f] dark:text-slate-500 mt-1">
            Expensas + Agua + Extras ({datosFiltrados.length} meses)
          </div>
        </div>

        {/* Total Egresos */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Egresos Totales</span>
            <span className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-800 dark:text-rose-400 font-mono">
            Bs. {totalEgresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#7d776f] dark:text-slate-500 mt-1">
            Servicios + Mantenimiento + Gastos
          </div>
        </div>

        {/* Flujo Neto */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Flujo Neto (Superávit)</span>
            <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
              <Scale className="w-4 h-4" />
            </span>
          </div>
          <div
            className={`text-xl sm:text-2xl font-extrabold font-mono ${
              flujoNetoTotal >= 0 ? 'text-emerald-800 dark:text-emerald-400' : 'text-rose-800 dark:text-rose-400'
            }`}
          >
            {flujoNetoTotal >= 0 ? '+' : ''}Bs. {flujoNetoTotal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#7d776f] dark:text-slate-500 mt-1">
            Margen operativo: {totalIngresos > 0 ? ((flujoNetoTotal / totalIngresos) * 100).toFixed(1) : 0}%
          </div>
        </div>

        {/* Saldo de Caja Final */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Caja Disponible</span>
            <span className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-800 dark:text-purple-300 font-mono">
            Bs. {saldoFinalPeriodo.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Fondo de Reserva Operativo
          </div>
        </div>
      </div>

      {/* PESTAÑAS DE VISTA: GRÁFICOS INTERACTIVOS VS TABLA DETALLADA VS SIMULADOR */}
      <div className="flex items-center gap-2 border-b border-[#cec8bc] dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setVistaActiva('graficos')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            vistaActiva === 'graficos'
              ? 'bg-rose-700 text-white shadow-md shadow-rose-900/20'
              : 'bg-[#ede9e1] dark:bg-slate-900 text-[#66615b] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white border border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Gráficos y Comparativas</span>
        </button>

        <button
          type="button"
          onClick={() => setVistaActiva('tabla')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            vistaActiva === 'tabla'
              ? 'bg-rose-700 text-white shadow-md shadow-rose-900/20'
              : 'bg-[#ede9e1] dark:bg-slate-900 text-[#66615b] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white border border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Estado de Flujo Desglosado</span>
        </button>

        <button
          type="button"
          onClick={() => setVistaActiva('simulador')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            vistaActiva === 'simulador'
              ? 'bg-rose-700 text-white shadow-md shadow-rose-900/20'
              : 'bg-[#ede9e1] dark:bg-slate-900 text-[#66615b] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white border border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-500" />
          <span>Simulador de Escenarios</span>
        </button>
      </div>

      {/* CONTENIDO 1: VISTA DE GRÁFICOS INTERACTIVOS */}
      {vistaActiva === 'graficos' && (
        <div className="space-y-6">
          {/* GRÁFICO 1: EVOLUCIÓN MENSUAL (BARRAS COMPARATIVAS) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#262422] dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-rose-700 dark:text-rose-400" />
                  Evolución Mensual: Ingresos vs. Egresos (2026)
                </h2>
                <p className="text-xs text-[#7d776f] dark:text-slate-400">
                  Haga clic en cualquier mes para ver el desglose en el panel lateral.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <span className="w-3 h-3 rounded-md bg-emerald-600 inline-block" />
                  <span>Ingresos</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                  <span className="w-3 h-3 rounded-md bg-rose-600 inline-block" />
                  <span>Egresos</span>
                </div>
                <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                  <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
                  <span>Saldo Acumulado</span>
                </div>
              </div>
            </div>

            {/* BARRAS MENSUALES */}
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-4 items-end min-h-[260px]">
              {data.map((mesData, idx) => {
                const isSelected = selectedMesIndex === idx
                const heightIngreso = Math.round((mesData.totalIngresos / maxIngresoEgreso) * 180)
                const heightEgreso = Math.round((mesData.totalEgresos / maxIngresoEgreso) * 180)

                return (
                  <div
                    key={mesData.mes}
                    onClick={() => setSelectedMesIndex(idx)}
                    className={`flex flex-col items-center group cursor-pointer p-1.5 rounded-2xl transition-all ${
                      isSelected
                        ? 'bg-[#dfd9ce] dark:bg-slate-800/90 ring-2 ring-rose-600 shadow-md scale-105'
                        : 'hover:bg-[#dfd9ce]/50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Tooltip con valor al pasar el mouse */}
                    <div className="text-[10px] font-mono font-bold text-[#7d776f] dark:text-slate-400 mb-1 text-center">
                      +{Math.round(mesData.flujoNeto / 1000)}k
                    </div>

                    {/* Barras dobles */}
                    <div className="flex items-end gap-1 h-[180px] w-full justify-center">
                      {/* Barra Ingreso */}
                      <div
                        style={{ height: `${heightIngreso}px` }}
                        className="w-2.5 sm:w-3.5 rounded-t-md bg-emerald-600 dark:bg-emerald-500 hover:brightness-110 transition-all shadow-xs"
                        title={`Ingresos: Bs. ${mesData.totalIngresos}`}
                      />
                      {/* Barra Egreso */}
                      <div
                        style={{ height: `${heightEgreso}px` }}
                        className="w-2.5 sm:w-3.5 rounded-t-md bg-rose-600 dark:bg-rose-500 hover:brightness-110 transition-all shadow-xs"
                        title={`Egresos: Bs. ${mesData.totalEgresos}`}
                      />
                    </div>

                    {/* Nombre del mes */}
                    <span
                      className={`text-[11px] font-bold mt-2 truncate ${
                        isSelected ? 'text-rose-700 dark:text-rose-400 font-extrabold' : 'text-[#5c5750] dark:text-slate-400'
                      }`}
                    >
                      {mesData.mesCorto}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* DETALLE DEL MES SELECCIONADO */}
            <div className="p-4 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-rose-700 text-white font-bold flex items-center justify-center shrink-0">
                  {mesSeleccionado.mesCorto}
                </span>
                <div>
                  <h4 className="font-extrabold text-sm text-[#262422] dark:text-white">
                    Detalle de {mesSeleccionado.mes}
                  </h4>
                  <span className="text-[11px] text-[#7d776f]">
                    Saldo inicial: Bs. {mesSeleccionado.saldoInicial.toLocaleString()} • Saldo final: Bs.{' '}
                    {mesSeleccionado.saldoFinal.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 font-mono font-bold">
                <div>
                  <span className="block text-[10px] text-[#7d776f] uppercase font-sans">Ingresos</span>
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Bs. {mesSeleccionado.totalIngresos.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#7d776f] uppercase font-sans">Egresos</span>
                  <span className="text-rose-700 dark:text-rose-400">
                    Bs. {mesSeleccionado.totalEgresos.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#7d776f] uppercase font-sans">Flujo Neto</span>
                  <span className="text-blue-700 dark:text-blue-400">
                    +Bs. {mesSeleccionado.flujoNeto.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* GRÁFICO 2: COMPOSICIÓN DE EGRESOS & CURVA DE RESERVA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut Chart SVG de Categorías de Gastos */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-base text-[#262422] dark:text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-amber-500" />
                  Distribución Acumulada de Gastos (Rubros)
                </h3>
                <p className="text-xs text-[#7d776f] dark:text-slate-400 mt-0.5">
                  Proporción de gastos operativos del Edificio XYZ en Bolivianos (Bs.).
                </p>
              </div>

              {/* Gráfico circular SVG */}
              <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
                <div className="relative w-40 h-40 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Anillo fondo */}
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#cec8bc" strokeWidth="16" className="dark:stroke-slate-800" />
                    {/* Segmento 1: Servicios Básicos (59.8%) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#2563eb"
                      strokeWidth="16"
                      strokeDasharray="238.76"
                      strokeDashoffset="95.5"
                      strokeLinecap="round"
                    />
                    {/* Segmento 2: Mantenimiento (27.5%) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#f59e0b"
                      strokeWidth="16"
                      strokeDasharray="238.76"
                      strokeDashoffset="173"
                      strokeLinecap="round"
                    />
                    {/* Segmento 3: Administrativo (12.7%) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#8b5cf6"
                      strokeWidth="16"
                      strokeDasharray="238.76"
                      strokeDashoffset="208"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-[#7d776f] uppercase font-bold">Total Gastos</span>
                    <span className="font-extrabold text-sm text-[#262422] dark:text-white font-mono">
                      Bs. 79.0k
                    </span>
                  </div>
                </div>

                {/* Leyenda de Rubros */}
                <div className="space-y-3 flex-1">
                  {CATEGORIAS_GASTO.map((cat) => (
                    <div key={cat.nombre} className="text-xs">
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className="flex items-center gap-1.5 text-[#262422] dark:text-white">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: cat.color }} />
                          {cat.nombre}
                        </span>
                        <span className="font-mono text-[#7d776f] dark:text-slate-400">
                          {cat.porcentaje}%
                        </span>
                      </div>
                      <div className="w-full bg-[#dfd9ce] dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${cat.porcentaje}%`, backgroundColor: cat.color }}
                        />
                      </div>
                      <div className="text-[11px] text-[#7d776f] text-right font-mono mt-0.5">
                        Bs. {cat.monto.toLocaleString('es-BO')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Curva de Crecimiento del Saldo Disponible */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-base text-[#262422] dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Evolución del Fondo de Reserva (Caja Acumulada)
                </h3>
                <p className="text-xs text-[#7d776f] dark:text-slate-400 mt-0.5">
                  Proyección continua de liquidez desde Enero (Bs. 15.000) a Diciembre (Bs. 41.830).
                </p>
              </div>

              {/* Gráfico de línea SVG estilizado */}
              <div className="w-full h-44 relative flex items-end">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160" preserveAspectRatio="none">
                  {/* Gradiente de relleno */}
                  <defs>
                    <linearGradient id="liquidezGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Área debajo de la curva */}
                  <path
                    d="M 0 120 Q 125 100 250 65 T 500 15 L 500 160 L 0 160 Z"
                    fill="url(#liquidezGrad)"
                  />
                  {/* Línea principal */}
                  <path
                    d="M 0 120 Q 125 100 250 65 T 500 15"
                    fill="transparent"
                    stroke="#8b5cf6"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Puntos destacados */}
                  <circle cx="0" cy="120" r="5" fill="#8b5cf6" stroke="#fff" strokeWidth="2" />
                  <circle cx="250" cy="65" r="5" fill="#8b5cf6" stroke="#fff" strokeWidth="2" />
                  <circle cx="500" cy="15" r="6" fill="#10b981" stroke="#fff" strokeWidth="2" />
                </svg>
              </div>

              <div className="flex items-center justify-between text-xs text-[#7d776f] font-mono pt-2 border-t border-[#cec8bc] dark:border-slate-800">
                <div>
                  <span className="block text-[10px] uppercase font-sans">Ene 2026</span>
                  <span className="font-bold text-[#262422] dark:text-white">Bs. 15.000</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-sans">Jun 2026</span>
                  <span className="font-bold text-[#262422] dark:text-white">Bs. 26.760</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] uppercase font-sans">Dic 2026</span>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400">Bs. 41.830</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO 2: ESTADO DE FLUJO DESGLOSADO (TABLA) */}
      {vistaActiva === 'tabla' && (
        <div className="rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 bg-[#dfd9ce]/60 dark:bg-slate-950/60 border-b border-[#cec8bc] dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-[#262422] dark:text-white">
                Planilla Mensual de Flujo de Efectivo
              </h3>
              <p className="text-xs text-[#7d776f] dark:text-slate-400">
                Auditoría detallada mes a mes de ingresos ordinarios, extraordinarios y partidas de egresos.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs font-bold text-[#5c5750] dark:text-slate-300 hover:bg-[#ded8cc] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/40 dark:bg-slate-950/40 text-[#7d776f] dark:text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-3 px-3.5">Mes</th>
                  <th className="py-3 px-3 text-right">Saldo Inicial</th>
                  <th className="py-3 px-3 text-right text-emerald-800 dark:text-emerald-400">Ingr. Expensas</th>
                  <th className="py-3 px-3 text-right text-emerald-800 dark:text-emerald-400">Ingr. Extras</th>
                  <th className="py-3 px-3.5 text-right font-extrabold text-emerald-900 dark:text-emerald-300 bg-emerald-500/5">
                    Total Ingresos
                  </th>
                  <th className="py-3 px-3 text-right text-rose-800 dark:text-rose-400">Servicios</th>
                  <th className="py-3 px-3 text-right text-rose-800 dark:text-rose-400">Mantenimiento</th>
                  <th className="py-3 px-3 text-right text-rose-800 dark:text-rose-400">Administrativo</th>
                  <th className="py-3 px-3.5 text-right font-extrabold text-rose-900 dark:text-rose-300 bg-rose-500/5">
                    Total Egresos
                  </th>
                  <th className="py-3 px-3.5 text-right font-extrabold text-blue-900 dark:text-blue-300">
                    Flujo Neto
                  </th>
                  <th className="py-3 px-3.5 text-right font-extrabold text-purple-900 dark:text-purple-300">
                    Saldo Final
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cec8bc] dark:divide-slate-800 font-mono">
                {datosFiltrados.map((fila) => (
                  <tr key={fila.mes} className="hover:bg-[#dfd9ce]/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3.5 font-bold font-sans text-[#262422] dark:text-white">
                      {fila.mes}
                    </td>
                    <td className="py-3 px-3 text-right text-[#5c5750] dark:text-slate-400">
                      Bs. {fila.saldoInicial.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400 font-semibold">
                      +{fila.ingresosOrdinarios.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400">
                      +{fila.ingresosExtraordinarios.toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/5">
                      Bs. {fila.totalIngresos.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-700 dark:text-rose-400">
                      -{fila.egresosOperativos.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-700 dark:text-rose-400">
                      -{fila.egresosMantenimiento.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-700 dark:text-rose-400">
                      -{fila.egresosAdministrativos.toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-rose-800 dark:text-rose-300 bg-rose-500/5">
                      Bs. {fila.totalEgresos.toLocaleString()}
                    </td>
                    <td
                      className={`py-3 px-3.5 text-right font-extrabold ${
                        fila.flujoNeto >= 0 ? 'text-emerald-800 dark:text-emerald-400' : 'text-rose-800 dark:text-rose-400'
                      }`}
                    >
                      {fila.flujoNeto >= 0 ? '+' : ''}Bs. {fila.flujoNeto.toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5 text-right font-extrabold text-purple-800 dark:text-purple-300">
                      Bs. {fila.saldoFinal.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#cec8bc] dark:border-slate-700 bg-[#dfd9ce]/80 dark:bg-slate-950/80 font-bold font-mono text-xs">
                  <td className="py-3 px-3.5 font-sans uppercase text-[#262422] dark:text-white">
                    TOTALES ACUMULADOS
                  </td>
                  <td className="py-3 px-3 text-right text-[#7d776f]">-</td>
                  <td className="py-3 px-3 text-right text-emerald-700">
                    +{datosFiltrados.reduce((a, b) => a + b.ingresosOrdinarios, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-700">
                    +{datosFiltrados.reduce((a, b) => a + b.ingresosExtraordinarios, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3.5 text-right font-extrabold text-emerald-800 bg-emerald-500/10">
                    Bs. {totalIngresos.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-700">
                    -{datosFiltrados.reduce((a, b) => a + b.egresosOperativos, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-700">
                    -{datosFiltrados.reduce((a, b) => a + b.egresosMantenimiento, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-700">
                    -{datosFiltrados.reduce((a, b) => a + b.egresosAdministrativos, 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3.5 text-right font-extrabold text-rose-800 bg-rose-500/10">
                    Bs. {totalEgresos.toLocaleString()}
                  </td>
                  <td className="py-3 px-3.5 text-right font-extrabold text-blue-800">
                    +Bs. {flujoNetoTotal.toLocaleString()}
                  </td>
                  <td className="py-3 px-3.5 text-right font-extrabold text-purple-800">
                    Bs. {saldoFinalPeriodo.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO 3: SIMULADOR DE ESCENARIOS FINANCIEROS */}
      {vistaActiva === 'simulador' && (
        <div className="p-6 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-[#cec8bc] dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-lg text-[#262422] dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-500" />
              Simulador Interactivo de Sensibilidad Financiera
            </h3>
            <p className="text-xs text-[#7d776f] dark:text-slate-400 mt-1">
              Ajuste los controles para proyectar cómo impactarían aumentos de morosidad o gastos imprevistos de mantenimiento en la liquidez del edificio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Control 1: Morosidad */}
            <div className="p-5 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#262422] dark:text-white">
                  Tasa de Morosidad Proyectada
                </label>
                <span className="font-mono font-extrabold text-sm text-rose-700 dark:text-rose-400">
                  {simulacionMorosidad}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="5"
                value={simulacionMorosidad}
                onChange={(e) => setSimulacionMorosidad(Number(e.target.value))}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <p className="text-[11px] text-[#7d776f]">
                {simulacionMorosidad === 0
                  ? 'Escenario ideal: 100% de recaudación oportuna.'
                  : `Reducción estimada de ingresos: -Bs. ${((totalIngresos * simulacionMorosidad) / 100).toLocaleString('es-BO')}`}
              </p>
            </div>

            {/* Control 2: Gasto Extra */}
            <div className="p-5 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#262422] dark:text-white">
                  Gasto Extraordinario Mensual Imprevisto
                </label>
                <span className="font-mono font-extrabold text-sm text-amber-600 dark:text-amber-400">
                  +Bs. {simulacionGastoExtra} / mes
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="3000"
                step="250"
                value={simulacionGastoExtra}
                onChange={(e) => setSimulacionGastoExtra(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <p className="text-[11px] text-[#7d776f]">
                {simulacionGastoExtra === 0
                  ? 'Sin gastos no presupuestados.'
                  : `Impacto anual en caja: -Bs. ${(simulacionGastoExtra * datosFiltrados.length).toLocaleString('es-BO')}`}
              </p>
            </div>
          </div>

          {/* Resultado de la Simulación */}
          <div className="p-5 rounded-2xl bg-[#dfd9ce]/90 dark:bg-slate-950/80 border border-[#cec8bc] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <span className="text-[11px] font-bold text-[#7d776f] uppercase block">
                Ingresos Simulados
              </span>
              <span className="text-lg font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
                Bs. {ingresosSimulados.toLocaleString('es-BO', { maximumFractionDigits: 0 })}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#7d776f] uppercase block">
                Egresos Simulados
              </span>
              <span className="text-lg font-mono font-extrabold text-rose-700 dark:text-rose-400">
                Bs. {egresosSimulados.toLocaleString('es-BO', { maximumFractionDigits: 0 })}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#7d776f] uppercase block">
                Flujo Neto Proyectado
              </span>
              <span
                className={`text-lg font-mono font-extrabold ${
                  flujoNetoSimulado >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {flujoNetoSimulado >= 0 ? '+' : ''}Bs.{' '}
                {flujoNetoSimulado.toLocaleString('es-BO', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setSimulacionMorosidad(0)
                setSimulacionGastoExtra(0)
              }}
              className="px-4 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs font-bold text-[#5c5750] dark:text-slate-300 hover:bg-[#ded8cc] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restablecer Simulación</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
