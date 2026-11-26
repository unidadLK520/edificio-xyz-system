// frontend/app/(admin)/egresos/components/CrearMovimientoModal.tsx
// Modal for creating new movimientos (Ingresos/Egresos)

import React from 'react'
import { X, Loader2, AlertCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import type { MovimientoFormData, CategoriaItem } from '../types'
import { MovimientoForm } from './MovimientoForm'

interface CrearMovimientoModalProps {
  formData: MovimientoFormData
  setFormData: (data: MovimientoFormData | ((prev: MovimientoFormData) => MovimientoFormData)) => void
  categorias: CategoriaItem[]
  categoriasParaModal: CategoriaItem[]
  selectedFile: File | null
  fileNameAttached: string
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  isSubmitting: boolean
  createModalError: string | null
  handleSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export const CrearMovimientoModal: React.FC<CrearMovimientoModalProps> = ({
  formData,
  setFormData,
  categorias,
  categoriasParaModal,
  selectedFile,
  fileNameAttached,
  handleFileUpload,
  isSubmitting,
  createModalError,
  handleSubmit,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${formData.tipo === 'Ingreso' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
            <h3 className="font-extrabold text-lg text-[#262422] dark:text-white">
              Registrar {formData.tipo === 'Ingreso' ? 'Ingreso Extraordinario' : 'Egreso / Gasto'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {createModalError && (
          <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="font-semibold">{createModalError}</span>
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
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-semibold text-[#262422] dark:text-white cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer flex items-center gap-2 ${
                formData.tipo === 'Ingreso' ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-rose-700 hover:bg-rose-600'
              }`}
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSubmitting ? 'Guardando...' : 'Guardar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
