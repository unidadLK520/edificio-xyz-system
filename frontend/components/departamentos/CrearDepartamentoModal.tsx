// frontend/components/departamentos/CrearDepartamentoModal.tsx
'use client'

import React, { useState } from 'react'
import { Building2, X, Percent } from 'lucide-react'
import { DepartamentoFormData } from './types'

interface CrearDepartamentoModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: DepartamentoFormData) => void
  totalAreaConstruida: number
}

export default function CrearDepartamentoModal({
  isOpen,
  onClose,
  onSubmit,
  totalAreaConstruida
}: CrearDepartamentoModalProps) {
  const [formData, setFormData] = useState<DepartamentoFormData>({
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

  if (!isOpen) return null

  const alicuotaEstimada = Number(
    (
      (Number(formData.areaM2) / (totalAreaConstruida + Number(formData.areaM2 || 1))) *
      100
    ).toFixed(2)
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.numero.trim()) return
    onSubmit({
      ...formData,
      alicuota: alicuotaEstimada || formData.alicuota
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-700 dark:text-indigo-400" />
            <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
              Registrar Nueva Unidad Habitacional
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
                Nro Departamento *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. 401"
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Piso *
              </label>
              <input
                type="number"
                min="1"
                max="30"
                required
                value={formData.piso}
                onChange={(e) => setFormData({ ...formData, piso: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Estado de Ocupación
              </label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
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
                Parqueo Asignado
              </label>
              <input
                type="text"
                placeholder="Ej. P-12 o Sin parqueo"
                value={formData.parqueo}
                onChange={(e) => setFormData({ ...formData, parqueo: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Baulera Asignada
              </label>
              <input
                type="text"
                placeholder="Ej. B-05 o Sin baulera"
                value={formData.baulera}
                onChange={(e) => setFormData({ ...formData, baulera: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="border-t border-[#cec8bc] dark:border-slate-800 pt-3 space-y-2">
            <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300">
              Datos del Propietario Titular (Opcional)
            </label>
            <input
              type="text"
              placeholder="Nombre completo y apellidos"
              value={formData.propietarioNombre}
              onChange={(e) => setFormData({ ...formData, propietarioNombre: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="CI / NIT"
                value={formData.propietarioCi}
                onChange={(e) => setFormData({ ...formData, propietarioCi: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
              />
              <input
                type="text"
                placeholder="Teléfono / Celular"
                value={formData.propietarioTel}
                onChange={(e) => setFormData({ ...formData, propietarioTel: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
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
              className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-xs font-bold text-white shadow-md cursor-pointer transition-all active:scale-95"
            >
              Guardar Departamento
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
