// frontend/app/(admin)\egresos/components/DeleteMovimientoModal.tsx
// Modal for confirming movimiento anulación

import React from 'react'
import { X, AlertCircle } from 'lucide-react'
import type { MovimientoItem } from '../types'

interface DeleteMovimientoModalProps {
  movimiento: MovimientoItem
  motivo: string
  setMotivo: (v: string) => void
  error: string | null
  isDeleting: boolean
  onConfirm: () => void
  onClose: () => void
}

export const DeleteMovimientoModal: React.FC<DeleteMovimientoModalProps> = ({
  movimiento,
  motivo,
  setMotivo,
  error,
  isDeleting,
  onConfirm,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
              Anular Movimiento Financiero
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#7d776f] hover:text-[#262422] p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-xs text-[#5c5750] dark:text-slate-300">
          ¿Está seguro de que desea anular el movimiento{' '}
          <strong className="text-[#262422] dark:text-white font-mono">{movimiento.codigo}</strong> por Bs.{' '}
          <strong className="font-mono">{movimiento.monto.toFixed(2)}</strong>? Esta acción se registrará con auditoría formal en la base de datos.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); onConfirm() }} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-[#262422] dark:text-white mb-1">
              Motivo de la Anulación *
            </label>
            <textarea
              required
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Especifique el motivo obligatorio (ej. Error en monto, duplicado, cancelado)..."
              className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-600 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#cec8bc] dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-bold text-[#262422] dark:text-white cursor-pointer hover:bg-[#cec8bc] dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isDeleting || !motivo.trim()}
              className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer shadow-md disabled:opacity-50"
            >
              {isDeleting ? 'Anulando...' : 'Confirmar Anulación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
