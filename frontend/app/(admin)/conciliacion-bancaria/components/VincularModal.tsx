import React from 'react';
import { X, AlertCircle, Link2, Unlink, Loader2, AlertTriangle } from 'lucide-react';
import { fechaSolo } from '@/lib/fecha';

import type { MovimientoBancarioItem } from '@/lib/services/finanzas.service';

interface VincularModalProps {
  itemParaVincular: MovimientoBancarioItem | null;
  setItemParaVincular: (item: MovimientoBancarioItem | null) => void;
  movimientoSistemaSeleccionado: number | '';
  setMovimientoSistemaSeleccionado: (id: number | '') => void;
  modalVincularError: string | null;
  setModalVincularError: (msg: string | null) => void;
  vinculando: boolean;
  handleVincularManual: () => Promise<void>;
}

export const VincularModal: React.FC<VincularModalProps> = ({
  itemParaVincular,
  setItemParaVincular,
  movimientoSistemaSeleccionado,
  setMovimientoSistemaSeleccionado,
  modalVincularError,
  setModalVincularError,
  vinculando,
  handleVincularManual,
}) => {
  if (!itemParaVincular) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <h3 className="font-extrabold text-sm flex items-center gap-2 text-[#262422] dark:text-white">
            <Link2 className="w-4 h-4 text-blue-600" />
            Vincular Movimiento Bancario
          </h3>
          <button type="button" onClick={() => setItemParaVincular(null)} className="text-[#7d776f] hover:text-[#262422] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        {modalVincularError && (
          <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{modalVincularError}</span>
          </div>
        )}
        {/* Aquí puedes agregar los campos de selección de movimiento interno y botón de confirmación según tu lógica */}
        {/* Por simplicidad, solo mostramos un botón para ejecutar la vinculación manual */}
        <button
          type="button"
          disabled={vinculando}
          onClick={handleVincularManual}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded disabled:opacity-60"
        >
          {vinculando ? 'Vinculando...' : 'Confirmar Vinculación'}
        </button>
      </div>
    </div>
  );
};
