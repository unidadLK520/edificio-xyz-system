import React from 'react';

interface SummaryData {
  cantConciliados: number;
  montoConciliados: number;
  cantPendientes: number;
  montoPendientes: number;
  cantDiscrepancias: number;
  montoDiscrepancias: number;
  sumaDiferenciaDiscrepancias: number;
  porcentaje: number;
}

export const SummaryCards: React.FC<{data: SummaryData}> = ({data}) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
      <span className="text-xs text-[#7d776f] font-semibold">Tasa de Conciliación</span>
      <div className="text-2xl font-black text-blue-700 dark:text-blue-400 font-mono">{data.porcentaje}%</div>
      <span className="text-[10px] text-[#7d776f]">Efectividad global</span>
    </div>
    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
      <span className="text-xs text-[#7d776f] font-semibold">Conciliados</span>
      <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">{data.cantConciliados}</div>
      <span className="text-[10px] text-emerald-600 font-medium">Bs. {data.montoConciliados.toFixed(2)}</span>
    </div>
    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
      <span className="text-xs text-[#7d776f] font-semibold">Pendientes</span>
      <div className="text-2xl font-black text-amber-700 dark:text-amber-400 font-mono">{data.cantPendientes}</div>
      <span className="text-[10px] text-amber-600 font-medium">Bs. {data.montoPendientes.toFixed(2)}</span>
    </div>
    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
      <span className="text-xs text-[#7d776f] font-semibold">Discrepancias</span>
      <div className="text-2xl font-black text-rose-700 dark:text-rose-400 font-mono">{data.cantDiscrepancias}</div>
      <span className="text-[10px] text-rose-600 font-medium">Dif: Bs. {data.sumaDiferenciaDiscrepancias.toFixed(2)}</span>
    </div>
  </div>
);
