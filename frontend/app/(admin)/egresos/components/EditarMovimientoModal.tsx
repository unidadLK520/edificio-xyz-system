// frontend/app/(admin)/egresos/components/EditarMovimientoModal.tsx
// Modal for editing existing movimientos

import React from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import type { MovimientoItem, MovimientoFormData, CategoriaItem } from '../types'
import { MovimientoForm } from './MovimientoForm'

interface EditarMovimientoModalProps {
  movimiento: MovimientoItem
  formData: MovimientoFormData
  setFormData: (data: MovimientoFormData | ((prev: MovimientoFormData) => MovimientoFormData)) => void
  categorias: CategoriaItem[]
  categoriasParaModal: CategoriaItem[]
  selectedFile: File | null
  fileNameAttached: string
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  isSubmitting: boolean
  editModalError: string | null
  handleSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export const EditarMovimientoModal: React.FC<EditarMovimientoModalProps> = ({
  movimiento,
  formData,
  setFormData,
  categorias,
  categoriasParaModal,
  selectedFile,
  fileNameAttached,
  handleFileUpload,
  isSubmitting,
  editModalError,
  handleSubmit,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-extrabold text-lg text-[#262422] dark:text-white">
              Modificar Movimiento Financiero
            </h3>
            <span className="text-[11px] text-[#7d776f] font-mono">
              Código: {movimiento.codigo}
            </span>
          </div>
          <button type="button" onClick={onClose} className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {editModalError && (
          <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="font-semibold">{editModalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <MovimientoForm
            formData={formData}
            setFormData={setFormData}
            categoriasParaModal={categoriasParaModal}
            categorias={categorias}
            selectedFile={selectedFile}
            fileNameAttached={fileNameAttached}
            handleFileUpload={handleFileUpload}
            isEdit={true}
            codigo={movimiento.codigo}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-semibold text-[#262422] dark:text-white cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-xs font-bold text-white shadow-md cursor-pointer flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSubmitting ? 'Actualizando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
