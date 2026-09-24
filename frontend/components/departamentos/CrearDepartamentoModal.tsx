// frontend/components/departamentos/CrearDepartamentoModal.tsx
'use client'

import React, { useState } from 'react'
import { Building2, X, Percent, Car, Box, AlertCircle } from 'lucide-react'
import { DepartamentoFormData, TipoUnidad } from './types'

interface CrearDepartamentoModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: DepartamentoFormData) => Promise<void> | void
  totalAreaConstruida: number
  errorMessage?: string | null
}

export default function CrearDepartamentoModal({
  isOpen,
  onClose,
  onSubmit,
  totalAreaConstruida,
  errorMessage
}: CrearDepartamentoModalProps) {
  const [formData, setFormData] = useState<DepartamentoFormData>({
    tipoUnidad: 'Departamento',
    numero: '',
    piso: 1,
    areaM2: 100,
    alicuota: 3.75,
    parqueo: 'Sin parqueo',
    baulera: 'Sin baulera',
    propietarioNombre: '',
    propietarioCi: '',
    propietarioTel: '',
    propietarioCorreo: '',
    estado: 'Ocupado'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const tipo = formData.tipoUnidad || 'Departamento'

  const alicuotaEstimada = Number(
    (
      (Number(formData.areaM2) / (totalAreaConstruida + Number(formData.areaM2 || 1))) *
      100
    ).toFixed(2)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.numero.trim()) return
    setIsSubmitting(true)
    try {
      await onSubmit({
        ...formData,
        alicuota: alicuotaEstimada || formData.alicuota
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            {tipo === 'Departamento' && <Building2 className="w-5 h-5 text-blue-700 dark:text-indigo-400" />}
            {tipo === 'Parqueo' && <Car className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            {tipo === 'Baulera' && <Box className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
              Registrar Nueva Unidad
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-800 rounded-xl text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* CA1: Selección de Tipo de Unidad */}
          <div>
            <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1.5">
              Tipo de Unidad *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Departamento', 'Parqueo', 'Baulera'] as TipoUnidad[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      tipoUnidad: t,
                      estado: t === 'Departamento' ? 'Ocupado' : 'Disponible'
                    })
                  }
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    tipo === t
                      ? 'bg-blue-700 text-white border-blue-700 dark:bg-indigo-600 dark:border-indigo-600 shadow-sm'
                      : 'bg-[#ded8cc] dark:bg-slate-800 border-[#cec8bc] dark:border-slate-700 text-[#5c5750] dark:text-slate-300 hover:bg-[#d5cfc3]'
                  }`}
                >
                  {t === 'Departamento' && <Building2 className="w-3.5 h-3.5" />}
                  {t === 'Parqueo' && <Car className="w-3.5 h-3.5" />}
                  {t === 'Baulera' && <Box className="w-3.5 h-3.5" />}
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Identificador / Nro *
              </label>
              <input
                type="text"
                required
                placeholder={tipo === 'Departamento' ? 'Ej. 401' : tipo === 'Parqueo' ? 'Ej. P-05' : 'Ej. B-02'}
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Estado Inicial
              </label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                {tipo === 'Departamento' ? (
                  <>
                    <option value="Ocupado">Ocupado</option>
                    <option value="Disponible">Disponible</option>
                    <option value="En Alquiler">En Alquiler</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                  </>
                ) : (
                  <>
                    <option value="Disponible">Disponible</option>
                    <option value="Asignado">Asignado</option>
                    <option value="Inactivo">Inactivo</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {tipo === 'Departamento' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Piso *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={formData.piso}
                    onChange={(e) => setFormData({ ...formData, piso: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Área Construida (m²) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={formData.areaM2}
                    onChange={(e) => setFormData({ ...formData, areaM2: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono font-bold"
                  />
                  <span className="text-[10px] text-blue-700 dark:text-indigo-400 font-semibold flex items-center gap-1 mt-1">
                    <Percent className="w-3 h-3" />
                    Alícuota estimada: {alicuotaEstimada}%
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-xs font-bold text-white shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : `Guardar ${tipo}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

