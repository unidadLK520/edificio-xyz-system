// frontend/components/departamentos/DepartamentosKpis.tsx
'use client'

import React from 'react'
import { Home, CheckCircle2, AlertCircle, Car } from 'lucide-react'

interface DepartamentosKpisProps {
  totalDeptos: number
  ocupados: number
  disponibles: number
  conParqueo: number
  totalAreaConstruida: number
}

export default function DepartamentosKpis({
  totalDeptos,
  ocupados,
  disponibles,
  conParqueo,
  totalAreaConstruida
}: DepartamentosKpisProps) {
  const porcentajeOcupacion = totalDeptos > 0 ? ((ocupados / totalDeptos) * 100).toFixed(0) : '0'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Total Unidades */}
      <div className="p-4 rounded-2xl bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400 mb-1">
          <span>Total Unidades</span>
          <Home className="w-4 h-4 text-blue-700 dark:text-indigo-400" />
        </div>
        <div className="text-2xl font-black text-[#262422] dark:text-white">{totalDeptos}</div>
        <span className="text-[11px] text-[#7d776f] dark:text-slate-500 font-mono">
          {totalAreaConstruida.toFixed(1)} m² construidos
        </span>
      </div>

      {/* Ocupados */}
      <div className="p-4 rounded-2xl bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400 mb-1">
          <span>Ocupados</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
        </div>
        <div className="text-2xl font-black text-emerald-800 dark:text-emerald-400">{ocupados}</div>
        <span className="text-[11px] text-[#7d776f] dark:text-slate-500 font-medium">
          {porcentajeOcupacion}% nivel de ocupación
        </span>
      </div>

      {/* Disponibles */}
      <div className="p-4 rounded-2xl bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400 mb-1">
          <span>Disponibles / Alquiler</span>
          <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
        </div>
        <div className="text-2xl font-black text-amber-800 dark:text-amber-400">{disponibles}</div>
        <span className="text-[11px] text-[#7d776f] dark:text-slate-500">Listos para habitar</span>
      </div>

      {/* Parqueos Asignados */}
      <div className="p-4 rounded-2xl bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400 mb-1">
          <span>Parqueos Asignados</span>
          <Car className="w-4 h-4 text-purple-700 dark:text-purple-400" />
        </div>
        <div className="text-2xl font-black text-purple-800 dark:text-purple-400">{conParqueo}</div>
        <span className="text-[11px] text-[#7d776f] dark:text-slate-500">Espacios vehiculares</span>
      </div>
    </div>
  )
}
