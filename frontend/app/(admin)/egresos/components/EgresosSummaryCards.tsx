import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';

interface SummaryCardsProps {
  totalIngresos: number;
  totalEgresos: number;
  balanceNeto: number;
  cantidadIngresos: number;
  cantidadEgresos: number;
}

export const EgresosSummaryCards: React.FC<SummaryCardsProps> = ({
  totalIngresos,
  totalEgresos,
  balanceNeto,
  cantidadIngresos,
  cantidadEgresos,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
        <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400">
          <span>Ingresos Extraordinarios</span>
          <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
          Bs. {totalIngresos.toFixed(2)}
        </div>
        <div className="text-[11px] text-[#7d776f] dark:text-slate-500">
          {cantidadIngresos} movimiento(s) computado(s)
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
        <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400">
          <span>Egresos y Gastos Operativos</span>
          <ArrowUpRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 font-mono">
          Bs. {totalEgresos.toFixed(2)}
        </div>
        <div className="text-[11px] text-[#7d776f] dark:text-slate-500">
          {cantidadEgresos} gasto(s) computado(s)
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
        <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400">
          <span>Balance Neto del Filtro</span>
          <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div
          className={`text-xl sm:text-2xl font-black font-mono ${
            balanceNeto >= 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-rose-700 dark:text-rose-400'
          }`}
        >
          Bs. {balanceNeto.toFixed(2)}
        </div>
        <div className="text-[11px] text-[#7d776f] dark:text-slate-500">
          {balanceNeto >= 0 ? 'Superávit en el período' : 'Déficit en el período'}
        </div>
      </div>
    </div>
  );
};
