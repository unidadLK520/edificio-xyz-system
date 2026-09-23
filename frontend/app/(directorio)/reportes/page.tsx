'use client'

import React, { useState } from 'react'
import {
  FileBarChart,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Building,
  Printer,
  FileSpreadsheet,
  X,
  Search,
  ChevronRight,
  ShieldCheck,
  Send
} from 'lucide-react'

interface ReportData {
  mes: string
  ingresos: number
  egresos: number
  balance: number
  tasaMorosidad: number
}

const HISTORICAL_DATA: ReportData[] = [
  { mes: 'Enero 2026', ingresos: 12500, egresos: 9200, balance: 3300, tasaMorosidad: 8.3 },
  { mes: 'Febrero 2026', ingresos: 12100, egresos: 10400, balance: 1700, tasaMorosidad: 12.5 },
  { mes: 'Marzo 2026', ingresos: 12800, egresos: 8900, balance: 3900, tasaMorosidad: 4.1 },
  { mes: 'Abril 2026', ingresos: 11900, egresos: 9800, balance: 2100, tasaMorosidad: 16.6 },
  { mes: 'Mayo 2026', ingresos: 13200, egresos: 11200, balance: 2000, tasaMorosidad: 4.1 },
  { mes: 'Junio 2026', ingresos: 12600, egresos: 9100, balance: 3500, tasaMorosidad: 8.3 },
  { mes: 'Julio 2026', ingresos: 12900, egresos: 8600, balance: 4300, tasaMorosidad: 4.1 },
  { mes: 'Agosto 2026', ingresos: 12480, egresos: 9750, balance: 2730, tasaMorosidad: 8.3 },
  { mes: 'Septiembre 2026', ingresos: 13520, egresos: 8400, balance: 5120, tasaMorosidad: 4.2 }
]

const EXPENSE_CATEGORIES = [
  {
    name: 'Mantenimiento & Ascensores',
    amount: 3500,
    percentage: 41.7,
    color: 'bg-indigo-600',
    text: 'text-indigo-600'
  },
  {
    name: 'Servicios Básicos (Luz/Agua común)',
    amount: 2100,
    percentage: 25.0,
    color: 'bg-blue-600',
    text: 'text-blue-600'
  },
  {
    name: 'Seguridad & Vigilancia 24/7',
    amount: 1600,
    percentage: 19.0,
    color: 'bg-emerald-600',
    text: 'text-emerald-600'
  },
  {
    name: 'Limpieza e Insumos',
    amount: 800,
    percentage: 9.5,
    color: 'bg-amber-600',
    text: 'text-amber-600'
  },
  {
    name: 'Administración & Fondo Reserva',
    amount: 400,
    percentage: 4.8,
    color: 'bg-purple-600',
    text: 'text-purple-600'
  }
]

const DEBTORS_LIST = [
  {
    depto: '103',
    propietario: 'Hernán Siles',
    mesesMora: 3,
    deudaTotal: 1560,
    estado: 'Crítico (+90d)',
    telefono: '+591 71928374'
  },
  {
    depto: '202',
    propietario: 'Claudia Villarroel',
    mesesMora: 2,
    deudaTotal: 1040,
    estado: 'En Mora (60d)',
    telefono: '+591 76543219'
  },
  {
    depto: '401',
    propietario: 'Gonzalo Peñaranda',
    mesesMora: 1,
    deudaTotal: 520,
    estado: 'Aviso (30d)',
    telefono: '+591 70192834'
  }
]

export default function ReportesPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('Septiembre 2026')
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isNotificationSent, setIsNotificationSent] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const currentPeriodData =
    HISTORICAL_DATA.find((d) => d.mes === selectedPeriod) ||
    HISTORICAL_DATA[HISTORICAL_DATA.length - 1]

  const totalIngresosAnual = HISTORICAL_DATA.reduce((acc, curr) => acc + curr.ingresos, 0)
  const totalEgresosAnual = HISTORICAL_DATA.reduce((acc, curr) => acc + curr.egresos, 0)
  const superavitAnual = totalIngresosAnual - totalEgresosAnual

  const handleNotifyDebtor = (depto: string) => {
    setIsNotificationSent(depto)
    setTimeout(() => {
      setIsNotificationSent(null)
    }, 3000)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#ede9e1]/90 dark:bg-slate-900/90 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            Directorio & Fiscalización Financiera
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#262422] dark:text-white tracking-tight">
            Reportes y Balances Ejecutivos
          </h1>
          <p className="text-xs sm:text-sm text-[#7d776f] dark:text-slate-400">
            Supervisión integral de recaudación de expensas, ejecución presupuestaria y trazabilidad
            de morosidad.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600 appearance-none pr-8 cursor-pointer shadow-xs"
            >
              {HISTORICAL_DATA.map((d) => (
                <option key={d.mes} value={d.mes}>
                  Período: {d.mes}
                </option>
              ))}
            </select>
            <Calendar className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7d776f] pointer-events-none" />
          </div>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-900/20 active:scale-95"
          >
            <Download className="w-4 h-4" />
            Descargar Informe Oficial
          </button>
        </div>
      </div>

      {/* Tarjetas KPI Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recaudación */}
        <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase">
              Ingresos Recaudados
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#262422] dark:text-white">
              Bs. {currentPeriodData.ingresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+8.3% vs período anterior</span>
            </div>
          </div>
        </div>

        {/* Egresos */}
        <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase">
              Egresos Ejecutados
            </span>
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#262422] dark:text-white">
              Bs. {currentPeriodData.egresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-rose-700 dark:text-rose-400 font-semibold">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Dentro del presupuesto límite</span>
            </div>
          </div>
        </div>

        {/* Superávit / Balance */}
        <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase">
              Balance Neto ({selectedPeriod.split(' ')[0]})
            </span>
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-purple-700 dark:text-purple-400">
              +Bs. {currentPeriodData.balance.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[#7d776f] dark:text-slate-400 font-medium">
              <span>Destinado a fondo de contingencia</span>
            </div>
          </div>
        </div>

        {/* Morosidad */}
        <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase">
              Índice de Morosidad
            </span>
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#262422] dark:text-white">
              {currentPeriodData.tasaMorosidad}%
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Bajo el umbral crítico (15%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico y Desglose Financiero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Historial Comparativo (2 Columnas) */}
        <div className="lg:col-span-2 bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#262422] dark:text-white flex items-center gap-2">
                <FileBarChart className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                Comparativa Histórica Ingresos vs. Egresos (2026)
              </h2>
              <p className="text-xs text-[#7d776f] dark:text-slate-400">
                Evolución de flujo de efectivo mes a mes en Bolivianos (Bs.).
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" /> Ingresos
              </div>
              <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                <span className="w-3 h-3 rounded-full bg-rose-600 inline-block" /> Egresos
              </div>
            </div>
          </div>

          {/* Gráfico de Barras CSS Interactivo */}
          <div className="space-y-3 pt-2">
            {HISTORICAL_DATA.map((item) => {
              const maxVal = 15000
              const ingresosPercent = Math.min((item.ingresos / maxVal) * 100, 100)
              const egresosPercent = Math.min((item.egresos / maxVal) * 100, 100)
              const isSelected = item.mes === selectedPeriod

              return (
                <div
                  key={item.mes}
                  onClick={() => setSelectedPeriod(item.mes)}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#dfd9ce] dark:bg-slate-800/90 border border-purple-600/40 ring-1 ring-purple-600/20'
                      : 'hover:bg-[#e4ded4] dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                    <span className="text-[#262422] dark:text-white">{item.mes}</span>
                    <span className="text-[#7d776f] dark:text-slate-400">
                      Balance:{' '}
                      <span className="text-purple-700 dark:text-purple-400">
                        +Bs. {item.balance.toLocaleString()}
                      </span>
                    </span>
                  </div>

                  <div className="space-y-1">
                    {/* Barra Ingresos */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-12 text-[#7d776f] dark:text-slate-400 font-mono">
                        Ingreso
                      </span>
                      <div className="flex-1 bg-[#d5cfc2] dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${ingresosPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400 font-bold w-16 text-right">
                        Bs. {item.ingresos.toLocaleString()}
                      </span>
                    </div>

                    {/* Barra Egresos */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-12 text-[#7d776f] dark:text-slate-400 font-mono">
                        Egreso
                      </span>
                      <div className="flex-1 bg-[#d5cfc2] dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${egresosPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-rose-800 dark:text-rose-400 font-bold w-16 text-right">
                        Bs. {item.egresos.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-3 border-t border-[#cec8bc] dark:border-slate-800 flex justify-between items-center text-xs font-bold text-[#5c5750] dark:text-slate-400">
            <span>Acumulado Gestión 2026:</span>
            <div className="flex gap-4">
              <span className="text-emerald-700 dark:text-emerald-400">
                Ingresos: Bs. {totalIngresosAnual.toLocaleString()}
              </span>
              <span className="text-rose-700 dark:text-rose-400">
                Egresos: Bs. {totalEgresosAnual.toLocaleString()}
              </span>
              <span className="text-purple-700 dark:text-purple-400 font-black">
                Superávit: Bs. {superavitAnual.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Distribución de Egresos por Rubro */}
        <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-[#262422] dark:text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                Egresos por Rubro ({selectedPeriod.split(' ')[0]})
              </h2>
              <p className="text-xs text-[#7d776f] dark:text-slate-400">
                Distribución porcentual del gasto operativo ejecutado.
              </p>
            </div>

            <div className="space-y-3.5 mt-4">
              {EXPENSE_CATEGORIES.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[#262422] dark:text-slate-200 truncate pr-2">
                      {cat.name}
                    </span>
                    <span className="font-mono font-bold text-[#5c5750] dark:text-slate-300">
                      Bs. {cat.amount.toLocaleString()} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#d5cfc2] dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`${cat.color} h-full rounded-full`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-purple-100/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-300">
            <div className="font-bold flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4" />
              Auditoría & Fondo de Reserva
            </div>
            <p className="text-[11px] leading-relaxed">
              El 5% de toda la recaudación mensual es resguardado de forma inembargable en la cuenta
              de ahorros de emergencia del edificio.
            </p>
          </div>
        </div>
      </div>

      {/* Matriz de Copropietarios en Mora & Acciones */}
      <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-[#262422] dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Seguimiento de Unidades con Expensas Pendientes (Morosidad)
            </h2>
            <p className="text-xs text-[#7d776f] dark:text-slate-400">
              Unidades habitacionales con retraso de 1 a 3 meses para gestión de cobranza y
              notificación formal.
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7d776f]" />
            <input
              type="text"
              placeholder="Buscar dpto o propietario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-600 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Tabla Morosos */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#cec8bc] dark:border-slate-800 text-[#7d776f] dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3 px-3">Unidad</th>
                <th className="pb-3 px-3">Propietario / Residente</th>
                <th className="pb-3 px-3">Meses de Retraso</th>
                <th className="pb-3 px-3">Deuda Acumulada</th>
                <th className="pb-3 px-3">Estado de Gestión</th>
                <th className="pb-3 px-3 text-right">Acción de Fiscalización</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cec8bc]/50 dark:divide-slate-800/60">
              {DEBTORS_LIST.filter(
                (d) =>
                  d.depto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  d.propietario.toLowerCase().includes(searchTerm.toLowerCase())
              ).map((debtor) => (
                <tr
                  key={debtor.depto}
                  className="hover:bg-[#e4ded4]/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-3 font-bold text-[#262422] dark:text-white">
                    <span className="px-2 py-0.5 rounded-md bg-[#ded8cc] dark:bg-slate-800 font-mono text-[11px]">
                      Dpto {debtor.depto}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-[#262422] dark:text-slate-200">
                      {debtor.propietario}
                    </div>
                    <div className="text-[11px] text-[#7d776f] dark:text-slate-400 font-mono">
                      {debtor.telefono}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      {debtor.mesesMora} {debtor.mesesMora === 1 ? 'mes' : 'meses'}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-rose-700 dark:text-rose-400 text-sm">
                    Bs. {debtor.deudaTotal.toFixed(2)}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        debtor.mesesMora >= 3
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                          : debtor.mesesMora === 2
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                      }`}
                    >
                      {debtor.estado}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleNotifyDebtor(debtor.depto)}
                      disabled={isNotificationSent === debtor.depto}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isNotificationSent === debtor.depto
                          ? 'bg-emerald-600 text-white'
                          : 'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:hover:bg-purple-900/50'
                      }`}
                    >
                      {isNotificationSent === debtor.depto ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          ¡Notificación Enviada!
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Notificar Cobranza
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Exportación de Informes Oficiales */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-700 text-white">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#262422] dark:text-white">
                    Exportar Informe Financiero Oficial
                  </h3>
                  <p className="text-xs text-[#7d776f] dark:text-slate-400">
                    Generación de libro de balance con firma digital del Directorio.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300">
                Seleccionar Tipo de Documento:
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    alert('Generando Estado de Resultados y Flujo de Caja (PDF)...')
                    setIsExportModalOpen(false)
                  }}
                  className="flex items-center justify-between p-3 rounded-xl border border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/60 dark:bg-slate-800/60 hover:border-purple-600 text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Printer className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                    <div>
                      <div className="text-xs font-bold text-[#262422] dark:text-white">
                        Estado de Resultados y Balance General (PDF)
                      </div>
                      <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                        Formato oficial para asamblea general y rendición de cuentas.
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#7d776f]" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    alert('Descargando Matriz de Conciliación de Expensas (Excel)...')
                    setIsExportModalOpen(false)
                  }}
                  className="flex items-center justify-between p-3 rounded-xl border border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/60 dark:bg-slate-800/60 hover:border-purple-600 text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <div>
                      <div className="text-xs font-bold text-[#262422] dark:text-white">
                        Libro Mayor y Conciliación Bancaria (Excel .xlsx)
                      </div>
                      <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                        Desglose de cada depósito por departamento con códigos de transacción.
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#7d776f]" />
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[#cec8bc] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors"
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
