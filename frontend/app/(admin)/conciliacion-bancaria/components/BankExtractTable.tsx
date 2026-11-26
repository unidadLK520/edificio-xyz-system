import React from 'react';
import { Landmark, CheckCircle2, AlertTriangle, AlertCircle, Link2, Unlink, Sparkles, Loader2 } from 'lucide-react';
import { fechaSolo } from '@/lib/fecha';
import type { MovimientoBancarioItem } from '@/lib/services/finanzas.service';

interface BankExtractTableProps {
  extractoFiltrado: MovimientoBancarioItem[];
  loading: boolean;
  puedeEscribir: boolean;
  accionEnProgresoId: number | null;
  onAceptarSugerencia: (item: MovimientoBancarioItem) => void;
  onVincularClick: (item: MovimientoBancarioItem) => void;
}

export const BankExtractTable: React.FC<BankExtractTableProps> = ({
  extractoFiltrado,
  loading,
  puedeEscribir,
  accionEnProgresoId,
  onAceptarSugerencia,
  onVincularClick,
}) => {
  return (
    <div className="lg:col-span-7 space-y-3">
      <h3 className="font-extrabold text-sm text-[#262422] dark:text-white flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-blue-600" />
          Extracto Bancario ({extractoFiltrado.length})
        </span>
        <span className="text-xs font-normal text-[#7d776f]">
          Cuenta: {''}
        </span>
      </h3>

      <div className="rounded-2xl border border-[#cec8bc] dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#e3ded4] dark:bg-slate-950/60 font-bold uppercase text-[10px] text-[#5c5750]">
                <th className="py-2.5 px-3">Fecha / Ref</th>
                <th className="py-2.5 px-3">Concepto Bancario</th>
                <th className="py-2.5 px-3">Monto (Bs.)</th>
                <th className="py-2.5 px-3">Estado</th>
                {puedeEscribir && <th className="py-2.5 px-3 text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cec8bc]/50">
              {loading ? (
                <tr>
                  <td colSpan={puedeEscribir ? 5 : 4} className="py-8 text-center text-[#7d776f]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-700" />
                  </td>
                </tr>
              ) : extractoFiltrado.length === 0 ? (
                <tr>
                  <td colSpan={puedeEscribir ? 5 : 4} className="py-8 text-center text-[#7d776f]">
                    No hay movimientos bancarios para esta cuenta con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                extractoFiltrado.map((item) => {
                  const esDeposito = item.tipo === 'Deposito';
                  const tieneSugerencia = item.estadoConciliacion === 'Pendiente' && item.sugerencia;
                  const enAccion = accionEnProgresoId === item.idMovBancario;
                  return (
                    <tr key={item.idMovBancario} className="hover:bg-[#e6e1d6]/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-[11px] text-blue-900 dark:text-blue-300">
                          {item.referencia || 'S/R'}
                        </div>
                        <div className="text-[10px] text-[#7d776f] font-mono">{fechaSolo(item.fecha)}</div>
                      </td>
                      <td className="py-2.5 px-3 max-w-[200px]" title={item.concepto || (item as any).descripcion || ''}>
                        <div className="font-medium truncate">{item.concepto || (item as any).descripcion || 'Sin concepto'}</div>
                        {tieneSugerencia && item.sugerencia && (
                          <div className="mt-1.5 p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] space-y-1">
                            <div className="flex items-center gap-1 font-semibold text-blue-800 dark:text-blue-300">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span>Sugerencia: MOV-{item.sugerencia.idMovimiento}</span>
                            </div>
                            <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
                              {item.sugerencia.descripcion} (Bs. {Number(item.sugerencia.monto).toFixed(2)}) • Dif:{' '}{item.sugerencia.diferenciaDias}d
                            </p>
                            {puedeEscribir && (
                              <button
                                type="button"
                                disabled={enAccion}
                                onClick={() => onAceptarSugerencia(item)}
                                className="mt-1 px-2 py-0.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Link2 className="w-3 h-3" />
                                {enAccion ? 'Vinculando...' : 'Aceptar Sugerencia'}
                              </button>
                            )}
                          </div>
                        )}
                        {item.estadoConciliacion === 'Discrepancia' && item.diferencia !== null && (
                          <div className="mt-1 text-[10px] text-rose-600 font-semibold">
                            Diferencia con libro: Bs. {Number(item.diferencia).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className={`py-2.5 px-3 font-mono font-bold ${esDeposito ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {esDeposito ? '+' : '-'} Bs. {Number(item.monto).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.estadoConciliacion === 'Conciliado'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : item.estadoConciliacion === 'Pendiente'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-rose-100 text-rose-900 border border-rose-300'
                          }`}
                        >
                          {item.estadoConciliacion}
                        </span>
                      </td>
                      {puedeEscribir && (
                        <td className="py-2.5 px-3 text-right">
                          {item.estadoConciliacion === 'Pendiente' ? (
                            <button
                              type="button"
                              onClick={() => onVincularClick(item)}
                              className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                            >
                              <Link2 className="w-3 h-3" />
                              <span>Vincular</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={enAccion}
                              onClick={() => onAceptarSugerencia(item)}
                              className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-bold cursor-pointer inline-flex items-center gap-1 border border-rose-300"
                              title="Desvincular y volver a estado Pendiente"
                            >
                              <Unlink className="w-3 h-3" />
                              <span>{enAccion ? '...' : 'Desvincular'}</span>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
