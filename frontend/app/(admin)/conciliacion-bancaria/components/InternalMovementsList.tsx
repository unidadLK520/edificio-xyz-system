import React from 'react';
import { FileCheck, Clock } from 'lucide-react';
import { fechaSolo } from '@/lib/fecha';

interface MovimientoInternoItem {
  idMovimiento: number;
  fecha: string;
  descripcion?: string;
  monto: number;
  tipo: string;
  vinculado?: boolean;
  anulado?: boolean;
}

interface Props {
  movimientosInternosFiltrados: MovimientoInternoItem[];
}

export const InternalMovementsList: React.FC<Props> = ({ movimientosInternosFiltrados }) => {
  return (
    <div className="lg:col-span-5 space-y-3">
      <h3 className="font-extrabold text-sm text-[#262422] dark:text-white flex items-center justify-between">
        <span className="flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-emerald-600" />
          Libro del Sistema ({movimientosInternosFiltrados.length})
        </span>
        <span className="text-xs font-normal text-[#7d776f]">Período actual</span>
      </h3>

      <div className="rounded-2xl border border-[#cec8bc] dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 overflow-hidden shadow-sm max-h-[580px] overflow-y-auto">
        <div className="divide-y divide-[#cec8bc]/50 text-xs">
          {movimientosInternosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-[#7d776f]">
              No hay movimientos internos registrados para el período consultado{''}
            </div>
          ) : (
            movimientosInternosFiltrados.map((mov) => {
              const esIngreso = mov.tipo === 'Ingreso';
              return (
                <div key={mov.idMovimiento} className="p-3 hover:bg-[#e6e1d6]/50 transition-colors space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                      MOV-{mov.idMovimiento}
                    </span>
                    <span
                      className={`font-mono font-bold ${esIngreso ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}
                    >
                      {esIngreso ? '+' : '-'} Bs. {Number(mov.monto).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#5c5750] dark:text-slate-300 truncate" title={mov.descripcion}>
                    {mov.descripcion}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#7d776f] pt-0.5">
                    <span className="font-mono">{fechaSolo(mov.fecha)}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-semibold ${
                        mov.vinculado ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {mov.vinculado ? 'Vinculado' : 'Disponible'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};