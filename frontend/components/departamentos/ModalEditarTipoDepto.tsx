// frontend/components/departamentos/ModalEditarTipoDepto.tsx
// Modal para crear y editar tipos de departamentos (Tipologías 100% editables)
'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Building2,
  DollarSign,
  Maximize2,
  Bed,
  Bath,
  CheckCircle2,
  AlertCircle,
  Palette,
  Sparkles,
  RefreshCw
} from 'lucide-react'
import { TipoDepartamentoItem } from './types'

interface ModalEditarTipoDeptoProps {
  isOpen: boolean
  onClose: () => void
  tipoToEdit: TipoDepartamentoItem | null
  onSave: (tipo: TipoDepartamentoItem, cascadaAUnidades: boolean) => Promise<string | null | void> | void
  totalMetrosEdificio?: number
}

const COLOR_OPTIONS = [
  {
    key: 'blue',
    label: 'Azul',
    bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800'
  },
  {
    key: 'emerald',
    label: 'Esmeralda',
    bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
  },
  {
    key: 'purple',
    label: 'Púrpura',
    bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800'
  },
  {
    key: 'amber',
    label: 'Ámbar',
    bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
  },
  {
    key: 'rose',
    label: 'Rosa / Tinto',
    bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800'
  },
  {
    key: 'indigo',
    label: 'Índigo',
    bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
  }
]

export default function ModalEditarTipoDepto({
  isOpen,
  onClose,
  tipoToEdit,
  onSave,
  totalMetrosEdificio = 1600
}: ModalEditarTipoDeptoProps) {
  const isEditing = Boolean(tipoToEdit && tipoToEdit.id)

  const [formData, setFormData] = useState<TipoDepartamentoItem>({
    id: '',
    nombre: '',
    codigo: '',
    areaM2: 60,
    expensaBase: 300,
    alicuotaEstimada: 3.75,
    habitaciones: 2,
    banos: 1,
    descripcion: '',
    colorBadge: 'blue',
    activo: true
  })

  const [cascadaAUnidades, setCascadaAUnidades] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (tipoToEdit) {
      setFormData(tipoToEdit)
    } else {
      setFormData({
        id: `tipo-${Date.now()}`,
        nombre: '',
        codigo: '',
        areaM2: 70,
        expensaBase: 320,
        alicuotaEstimada: Number(((70 / totalMetrosEdificio) * 100).toFixed(2)),
        habitaciones: 2,
        banos: 1,
        descripcion: '',
        colorBadge: 'indigo',
        activo: true
      })
    }
    setErrorMsg(null)
  }, [tipoToEdit, isOpen, totalMetrosEdificio])

  if (!isOpen) return null

  // Calcular alícuota estimada dinámica
  const alicuotaCalculada = Number(((formData.areaM2 / totalMetrosEdificio) * 100).toFixed(2))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre.trim()) {
      setErrorMsg('El nombre del tipo de departamento es obligatorio.')
      return
    }
    if (formData.areaM2 <= 0) {
      setErrorMsg('El área en m² debe ser mayor a cero.')
      return
    }
    if (formData.expensaBase < 0) {
      setErrorMsg('La expensa base no puede ser negativa.')
      return
    }

    const codigoFinal = (formData.codigo || '').trim() || formData.nombre.slice(0, 3).toUpperCase()
    const itemToSave: TipoDepartamentoItem = {
      ...formData,
      id: formData.id || `tipo-${formData.nombre.toLowerCase().replace(/\s+/g, '-')}`,
      codigo: codigoFinal,
      alicuotaEstimada: alicuotaCalculada
    }

    try {
      const res = onSave(itemToSave, cascadaAUnidades) as any
      if (res && typeof res.then === 'function') {
        res.then((err?: string | null) => {
          if (err) {
            setErrorMsg(err)
          } else {
            onClose()
          }
        }).catch((e: any) => {
          setErrorMsg(e?.message || 'Error al guardar tipo de departamento')
        })
      } else {
        onClose()
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error al guardar tipo de departamento')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* ENCABEZADO */}
        <div className="p-5 border-b border-[#cec8bc] dark:border-slate-800 flex items-center justify-between bg-[#dfd9ce]/60 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-700/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center justify-center border border-rose-700/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#262422] dark:text-white">
                {isEditing
                  ? `Editar Tipología: ${tipoToEdit?.nombre}`
                  : 'Registrar Nuevo Tipo de Departamento'}
              </h2>
              <p className="text-xs text-[#66615b] dark:text-slate-400">
                Configuración de superficie, expensa base y especificaciones arquitectónicas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-xl text-[#7d776f] hover:text-[#262422] hover:bg-[#ded8cc] dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CUERPO DEL FORMULARIO */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nombre y Código */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Nombre del Tipo de Apartamento *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Tipo A, Tipo D, Suite Ejecutiva, Penthouse"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs text-[#262422] dark:text-white placeholder-[#857f76] focus:outline-none focus:ring-2 focus:ring-rose-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Código Corto *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. A, B, C, PH"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs text-[#262422] dark:text-white uppercase font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-600"
              />
            </div>
          </div>

          {/* Área m² y Expensa Base */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-[#dfd9ce]/50 dark:bg-slate-950/40 border border-[#cec8bc] dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1 flex items-center gap-1">
                <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                Superficie (m²) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  required
                  value={formData.areaM2}
                  onChange={(e) => setFormData({ ...formData, areaM2: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-600"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7d776f]">
                  m²
                </span>
              </div>
              <p className="text-[10px] text-[#7d776f] mt-1">
                Superficie arquitectónica real de la unidad
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Monto de Expensa (Bs.) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={formData.expensaBase}
                  onChange={(e) =>
                    setFormData({ ...formData, expensaBase: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-600"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7d776f]">
                  Bs
                </span>
              </div>
              <p className="text-[10px] text-[#7d776f] mt-1">Cuota base de expensa del departamento</p>
            </div>
          </div>

          {/* Estado Activo y Color Visual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-[#dfd9ce]/40 dark:bg-slate-950/40 border border-[#cec8bc] dark:border-slate-800 items-center">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tipoActivoCheckbox"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="tipoActivoCheckbox" className="text-xs font-bold text-[#262422] dark:text-white cursor-pointer">
                Tipo Activo (Disponible para departamentos)
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-[#7d776f]" />
                Identificador Visual
              </label>
              <select
                value={formData.colorBadge}
                onChange={(e) => setFormData({ ...formData, colorBadge: e.target.value })}
                className="w-full px-3 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs font-bold text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-600 cursor-pointer"
              >
                {COLOR_OPTIONS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
              Descripción / Notas
            </label>
            <textarea
              rows={2}
              placeholder="Detalles sobre características, orientación, etc."
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs text-[#262422] dark:text-white placeholder-[#857f76] focus:outline-none focus:ring-2 focus:ring-rose-600"
            />
          </div>

          {/* Vista Previa de la Tarjeta */}
          <div className="p-3.5 rounded-2xl border border-dashed border-[#cec8bc] dark:border-slate-700 bg-[#dfd9ce]/30 dark:bg-slate-950/30">
            <div className="text-[11px] font-bold text-[#7d776f] uppercase mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Vista Previa de la Tipología
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-extrabold text-sm text-[#262422] dark:text-white">
                  {formData.nombre || 'Nombre del Tipo'}
                </span>
                <span className="ml-2 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#cec8bc] dark:bg-slate-800">
                  {formData.codigo || 'COD'}
                </span>
                <p className="text-xs text-[#66615b] dark:text-slate-400 mt-0.5">
                  {formData.areaM2} m² • {formData.activo ? 'Activo' : 'Inactivo'}
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono font-extrabold text-base text-rose-700 dark:text-rose-400">
                  Bs. {formData.expensaBase.toFixed(2)}
                </span>
                <span className="block text-[10px] text-[#7d776f]">expensa base</span>
              </div>
            </div>
          </div>

          {/* Opción Cascada para actualizar unidades existentes */}
          {isEditing && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex items-start gap-3">
              <input
                type="checkbox"
                id="checkCascada"
                checked={cascadaAUnidades}
                onChange={(e) => setCascadaAUnidades(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <label
                htmlFor="checkCascada"
                className="text-xs text-amber-950 dark:text-amber-200 cursor-pointer"
              >
                <span className="font-extrabold block">
                  Actualizar departamentos asociados a este tipo
                </span>
                Sincronizar la expensa base (Bs. {formData.expensaBase}) y superficie (
                {formData.areaM2} m²) en todos los departamentos que ya tengan asignado este tipo.
              </label>
            </div>
          )}

          {/* BOTONES */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white text-xs font-bold shadow-lg shadow-rose-900/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditing ? 'Guardar Cambios de Tipología' : 'Registrar Nuevo Tipo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
