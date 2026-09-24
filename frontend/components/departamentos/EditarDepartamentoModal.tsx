// frontend/components/departamentos/EditarDepartamentoModal.tsx
'use client'

import React from 'react'
import { Edit, X } from 'lucide-react'
import { DepartamentoItem } from './types'

interface EditarDepartamentoModalProps {
  isOpen: boolean
  depto: DepartamentoItem | null
  onClose: () => void
  onUpdate: (depto: DepartamentoItem) => void
  onChange: (depto: DepartamentoItem) => void
}

export default function EditarDepartamentoModal({
  isOpen,
  depto,
  onClose,
  onUpdate,
  onChange
}: EditarDepartamentoModalProps) {
  if (!isOpen || !depto) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(depto)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-blue-700 dark:text-indigo-400" />
            <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
              Editar Departamento {depto.numero}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Superficie (m²)
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={depto.areaM2 ?? ''}
                onChange={(e) => onChange({ ...depto, areaM2: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Estado
              </label>
              <select
                value={depto.estado}
                onChange={(e) => onChange({ ...depto, estado: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="Ocupado">Ocupado</option>
                <option value="Disponible">Disponible</option>
                <option value="En Alquiler">En Alquiler</option>
                <option value="Mantenimiento">Mantenimiento</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Parqueo
              </label>
              <input
                type="text"
                value={depto.parqueo}
                onChange={(e) => onChange({ ...depto, parqueo: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Baulera
              </label>
              <input
                type="text"
                value={depto.baulera}
                onChange={(e) => onChange({ ...depto, baulera: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-indigo-600 text-xs font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer"
            >
              Actualizar Datos
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
