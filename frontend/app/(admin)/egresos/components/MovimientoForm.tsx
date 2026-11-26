// frontend/app/(admin)/egresos/components/MovimientoForm.tsx
// Shared form component for create/edit movimiento

import React from 'react'
import { ArrowDownLeft, ArrowUpRight, UploadCloud } from 'lucide-react'
import type { MovimientoFormData, CategoriaItem } from '../types'

interface MovimientoFormProps {
  formData: MovimientoFormData
  setFormData: (data: MovimientoFormData | ((prev: MovimientoFormData) => MovimientoFormData)) => void
  categoriasParaModal: CategoriaItem[]
  categorias: CategoriaItem[]
  selectedFile: File | null
  fileNameAttached: string
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  isEdit?: boolean
  codigo?: string
}

export const MovimientoForm: React.FC<MovimientoFormProps> = ({
  formData,
  setFormData,
  categoriasParaModal,
  categorias,
  selectedFile,
  fileNameAttached,
  handleFileUpload,
  isEdit = false,
  codigo
}) => {
  const updateForm = (field: keyof MovimientoFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-4">
      {/* Tipo selector (only for create) */}
      {!isEdit && (
        <div>
          <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1.5">
            Tipo de Movimiento Financiero *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                updateForm('tipo', 'Ingreso')
                const cat = categorias.find(c => c.tipo === 'Ingreso')
                if (cat) updateForm('idCategoria', cat.idCategoria)
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                formData.tipo === 'Ingreso'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                  : 'bg-[#dfd9ce] dark:bg-slate-950 text-[#5c5750] dark:text-slate-400 border-[#cec8bc] dark:border-slate-800'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Ingreso Extraordinario</span>
            </button>
            <button
              type="button"
              onClick={() => {
                updateForm('tipo', 'Egreso')
                const cat = categorias.find(c => c.tipo === 'Egreso')
                if (cat) updateForm('idCategoria', cat.idCategoria)
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                formData.tipo === 'Egreso'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                  : 'bg-[#dfd9ce] dark:bg-slate-950 text-[#5c5750] dark:text-slate-400 border-[#cec8bc] dark:border-slate-800'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Egreso / Gasto</span>
            </button>
          </div>
        </div>
      )}

      {/* Categoría y Monto */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
            Categoría Asociada *
          </label>
          <select
            value={formData.idCategoria}
            onChange={(e) => updateForm('idCategoria', Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          >
            {categoriasParaModal.map(cat => (
              <option key={cat.idCategoria} value={cat.idCategoria}>{cat.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
            Monto (Bs.) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            value={formData.monto || ''}
            onChange={(e) => updateForm('monto', Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold font-mono"
          />
        </div>
      </div>

      {/* Fecha OBLIGATORIA */}
      <div>
        <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
          Fecha del Movimiento * (Obligatoria)
        </label>
        <input
          type="date"
          required
          value={formData.fecha}
          onChange={(e) => updateForm('fecha', e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {/* Concepto / Descripción OBLIGATORIA */}
      <div>
        <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
          Descripción / Concepto * (Obligatoria)
        </label>
        <textarea
          rows={2}
          required
          placeholder="Detalles sobre el motivo del ingreso o egreso..."
          value={formData.descripcion}
          onChange={(e) => updateForm('descripcion', e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {/* Campos Opcionales: Tercero, NroFactura, Método de Pago */}
      <div className="p-3.5 rounded-2xl bg-white/50 dark:bg-slate-950/50 border border-[#cec8bc]/70 dark:border-slate-800 space-y-3">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-[#7d776f]">
          Datos Adicionales (Opcionales)
        </span>

        <div>
          <label className="block text-[11px] font-medium text-[#5c5750] dark:text-slate-400 mb-1">
            Tercero / Proveedor / Beneficiario / Pagador (Opcional)
          </label>
          <input
            type="text"
            maxLength={120}
            placeholder="Ej. Schindler Ascensores, Propietario Dpto 302..."
            value={formData.tercero}
            onChange={(e) => updateForm('tercero', e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[#5c5750] dark:text-slate-400 mb-1">
              Nro Factura / Recibo (Opcional)
            </label>
            <input
              type="text"
              maxLength={50}
              placeholder="Ej. FAC-9912, REC-001"
              value={formData.nroFactura}
              onChange={(e) => updateForm('nroFactura', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#5c5750] dark:text-slate-400 mb-1">
              Método de Pago (Opcional)
            </label>
            <input
              type="text"
              maxLength={30}
              placeholder="Ej. Transferencia QR, Efectivo..."
              value={formData.metodoPago}
              onChange={(e) => updateForm('metodoPago', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Subida de Comprobante */}
      <div>
        <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
          Comprobante de Respaldo (PDF, Imagen)
        </label>
        <div className="relative border-2 border-dashed border-[#cec8bc] dark:border-slate-700 rounded-2xl p-3 text-center bg-[#dfd9ce]/50 dark:bg-slate-950/50 hover:bg-[#dfd9ce] transition-colors">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center gap-1 pointer-events-none">
            <UploadCloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            {fileNameAttached ? (
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 truncate max-w-xs">
                ✓ {fileNameAttached}
              </span>
            ) : (
              <>
                <span className="text-xs font-semibold text-[#4a4641] dark:text-slate-300">
                  Haga clic o arrastre el archivo de comprobante aquí
                </span>
                <span className="text-[10px] text-[#7d776f]">Formatos: JPG, PNG o PDF</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
