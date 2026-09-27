// frontend/components/departamentos/EditarDepartamentoModal.tsx
'use client'

import React from 'react'
import { Edit, X, Building2, Car, Box } from 'lucide-react'
import { UnidadItem } from './types'

interface EditarDepartamentoModalProps {
  isOpen: boolean
  depto: UnidadItem | null
  onClose: () => void
  onUpdate: (unidad: UnidadItem) => void
  onChange: (unidad: UnidadItem) => void
}

export default function EditarDepartamentoModal({
  isOpen,
  depto,
  onClose,
  onUpdate,
  onChange
}: EditarDepartamentoModalProps) {
  if (!isOpen || !depto) return null

  const tipo = depto.tipoUnidad || 'Departamento'
  const isDepto = tipo === 'Departamento'
  const isParqueo = tipo === 'Parqueo'
  const isBaulera = tipo === 'Baulera'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(depto)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            {isDepto && <Building2 className="w-5 h-5 text-blue-700 dark:text-indigo-400" />}
            {isParqueo && <Car className="w-5 h-5 text-amber-700 dark:text-amber-400" />}
            {isBaulera && <Box className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />}
            <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
              Editar {tipo} {depto.numero}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Identificador / Número */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                {isDepto ? 'Número de Departamento *' : `Código de ${tipo} *`}
              </label>
              <input
                type="text"
                required
                value={depto.numero || ''}
                onChange={(e) => onChange({ ...depto, numero: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Estado según tipo de unidad */}
            <div>
              <label className="block font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Estado Actual {isDepto && <span className="text-[10px] text-[#7d776f] font-normal">(Automático)</span>}
              </label>
              {isDepto ? (
                <div className="w-full px-3 py-2 rounded-xl bg-[#ded8cc]/60 dark:bg-slate-800/60 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-white font-semibold flex items-center justify-between">
                  <span>{depto.estado}</span>
                  <span className="text-[10px] text-blue-700 dark:text-indigo-400 font-bold bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
                    Automático por asignación
                  </span>
                </div>
              ) : (
                <select
                  value={depto.estado}
                  onChange={(e) => onChange({ ...depto, estado: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="Disponible">Disponible</option>
                  <option value="Asignado">Asignado</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                </select>
              )}
            </div>
          </div>

          {/* Campos exclusivos de Departamento */}
          {isDepto && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                  Piso *
                </label>
                <input
                  type="number"
                  required
                  value={depto.piso ?? ''}
                  onChange={(e) => onChange({ ...depto, piso: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                  Superficie (m²) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={depto.areaM2 ?? ''}
                  onChange={(e) => onChange({ ...depto, areaM2: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          )}

          {/* Panel Informativo de Asignación si es Parqueo o Baulera */}
          {!isDepto && (
            <div className="p-3 rounded-xl bg-[#ded8cc]/70 dark:bg-slate-800/70 border border-[#cec8bc] dark:border-slate-700 space-y-1">
              <span className="font-bold text-[11px] text-[#5c5750] dark:text-slate-400 block uppercase">
                Asignación Inmobiliaria:
              </span>
              <p className="text-xs text-[#262422] dark:text-white font-semibold">
                {depto.departamento
                  ? `Asignado al Departamento ${depto.departamento.numero}`
                  : 'Esta unidad se encuentra libre (sin departamento vinculado).'}
              </p>
              {depto.persona && (
                <p className="text-[11px] text-[#7d776f] dark:text-slate-400 font-medium">
                  Titular asignado: {depto.persona.nombres} {depto.persona.apellidos}
                </p>
              )}
            </div>
          )}

          {/* Panel Informativo si es Departamento */}
          {isDepto && (
            <div className="p-3 rounded-xl bg-[#ded8cc]/70 dark:bg-slate-800/70 border border-[#cec8bc] dark:border-slate-700 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-bold text-[10px] text-[#7d776f] uppercase block">Parqueo Vinculado:</span>
                <span className="font-semibold text-[#262422] dark:text-white">{depto.parqueo || 'Sin parqueo'}</span>
              </div>
              <div>
                <span className="font-bold text-[10px] text-[#7d776f] uppercase block">Baulera Vinculada:</span>
                <span className="font-semibold text-[#262422] dark:text-white">{depto.baulera || 'Sin baulera'}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-indigo-600 font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer"
            >
              Actualizar Datos
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
