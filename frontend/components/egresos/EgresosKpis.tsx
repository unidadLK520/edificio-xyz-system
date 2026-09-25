// frontend/components/egresos/EgresosKpis.tsx
'use client'

import React from 'react'
import { TrendingDown, CheckCircle2, Clock, Tag } from 'lucide-react'

interface EgresosKpisProps {
  totalGastos: number
  totalPagados: number
  totalPendientes: number
  mayorRubro: string
}

export default function EgresosKpis({
  totalGastos,
  totalPagados,
  totalPendientes,
  mayorRubro
}: EgresosKpisProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Total Egresos */}
      <div className="p-4 rounded-2xl bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400 mb-1">
          <span>Total Egresos Mes</span>
          <TrendingDown className="w-4 h-4 text-rose-700 dark:text-rose-400" />
        </div>
        <div className="text-2xl font-black text-rose-800 dark:text-rose-400">
          Bs. {totalGastos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
        </div>
        <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
          Gastos operativos devengados
        </span>
      </div>

      {/* Pagados / Conciliados */}
      <div className="p-4 rounded-2xl bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400 mb-1">
          <span>Pagados / Conciliados</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
        </div>
        <div className="text-2xl font-black text-emerald-800 dark:text-emerald-400">
          Bs. {totalPagados.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
        </div>
        <span className="text-[11px] text-[#7d776f] dark:text-slate-500">Facturas descargadas</span>
      </div>

      {/* Por Pagar / Revisión */}
      <div className="p-4 rounded-2xl bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400 mb-1">
          <span>Por Pagar / Revisión</span>
          <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
        </div>
        <div className="text-2xl font-black text-amber-800 dark:text-amber-400">
          Bs. {totalPendientes.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
        </div>
        <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
          Compromisos pendientes
        </span>
      </div>

      {/* Mayor Rubro */}
      <div className="p-4 rounded-2xl bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400 mb-1">
          <span>Mayor Rubro del Mes</span>
          <Tag className="w-4 h-4 text-blue-700 dark:text-blue-400" />
        </div>
        <div className="text-base sm:text-lg font-bold text-[#262422] dark:text-white truncate mt-0.5">
          {mayorRubro || 'Mantenimiento & Seguridad'}
        </div>
        <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
          Distribución presupuestaria
        </span>
      </div>
    </div>
  )
}
