// frontend/components/departamentos/EditarDepartamentoModal.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { X, Building2, Car, Box, LockOpen, UserCheck, Layers, Link2 } from 'lucide-react'
import { UnidadItem, TipoDepartamentoItem } from './types'

export interface AssignmentsChangeData {
  parqueoId?: number | null // null = desvincular, number = vincular
  bauleraId?: number | null // null = desvincular, number = vincular
  departamentoId?: number | null // para Parqueo/Baulera: vincular o null
  personaId?: number | null // para Parqueo/Baulera: titular asignado o null
}

interface EditarDepartamentoModalProps {
  isOpen: boolean
  depto: UnidadItem | null
  onClose: () => void
  onUpdate: (unidad: UnidadItem, assignments?: AssignmentsChangeData) => Promise<void> | void
  onChange: (unidad: UnidadItem) => void
  tiposDisponibles?: TipoDepartamentoItem[]
  parqueosDisponibles?: UnidadItem[]
  baulerasDisponibles?: UnidadItem[]
  deptosDisponibles?: UnidadItem[]
  personasList?: any[]
}

export default function EditarDepartamentoModal({
  isOpen,
  depto,
  onClose,
  onUpdate,
  onChange,
  tiposDisponibles,
  parqueosDisponibles = [],
  baulerasDisponibles = [],
  deptosDisponibles = [],
  personasList = []
}: EditarDepartamentoModalProps) {
  const isDepto = (depto?.tipoUnidad || 'Departamento') === 'Departamento'
  const isParqueo = depto?.tipoUnidad === 'Parqueo'
  const isBaulera = depto?.tipoUnidad === 'Baulera'
  const tipo = depto?.tipoUnidad || 'Departamento'

  // Identificar el parqueo actualmente asignado al departamento
  const initialParqueoId = useMemo(() => {
    if (!depto || !isDepto) return null
    if (depto.parqueos && depto.parqueos.length > 0) {
      return Number(depto.parqueos[0].idParqueo || depto.parqueos[0].id)
    }
    if (depto.parqueo && depto.parqueo !== 'Sin parqueo') {
      const found = parqueosDisponibles.find((p) => p.numero === depto.parqueo)
      return found ? found.id : null
    }
    return null
  }, [depto, isDepto, parqueosDisponibles])

  // Identificar la baulera actualmente asignada al departamento
  const initialBauleraId = useMemo(() => {
    if (!depto || !isDepto) return null
    if (depto.bauleras && depto.bauleras.length > 0) {
      return Number(depto.bauleras[0].idBaulera || depto.bauleras[0].id)
    }
    if (depto.baulera && depto.baulera !== 'Sin baulera') {
      const found = baulerasDisponibles.find((b) => b.numero === depto.baulera)
      return found ? found.id : null
    }
    return null
  }, [depto, isDepto, baulerasDisponibles])

  // Estados locales para la selección de parqueo y baulera del departamento
  const [selectedParqueoId, setSelectedParqueoId] = useState<number | null>(initialParqueoId)
  const [selectedBauleraId, setSelectedBauleraId] = useState<number | null>(initialBauleraId)

  // Estados locales para parqueo o baulera directamente
  const [selectedDeptoId, setSelectedDeptoId] = useState<number | null>(
    depto?.idDepartamento ?? depto?.departamento?.idDepartamento ?? null
  )
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(
    depto?.idPersona ?? depto?.persona?.idPersona ?? null
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sincronizar estados locales cuando cambia el departamento seleccionado
  useEffect(() => {
    if (depto) {
      setSelectedParqueoId(initialParqueoId)
      setSelectedBauleraId(initialBauleraId)
      setSelectedDeptoId(depto.idDepartamento ?? depto.departamento?.idDepartamento ?? null)
      setSelectedPersonaId(depto.idPersona ?? depto.persona?.idPersona ?? null)
    }
  }, [depto, initialParqueoId, initialBauleraId])

  if (!isOpen || !depto) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (isDepto) {
        await onUpdate(depto, {
          parqueoId: selectedParqueoId,
          bauleraId: selectedBauleraId
        })
      } else {
        await onUpdate(depto, {
          departamentoId: selectedDeptoId,
          personaId: selectedPersonaId
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-4 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
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
            disabled={isSubmitting}
            className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Identificador / Número */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <select
                  value={depto.estado}
                  onChange={(e) => onChange({ ...depto, estado: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="Ocupado por Propietario">Ocupado por Propietario</option>
                  <option value="Alquilado">Alquilado a Inquilino</option>
                  <option value="Desocupado">Desocupado / Vacío (Genera Expensa)</option>
                </select>
              ) : (
                <select
                  value={depto.estado}
                  onChange={(e) => onChange({ ...depto, estado: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="Disponible">Disponible (Libre)</option>
                  <option value="Asignado">Asignado</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                </select>
              )}
            </div>
          </div>

          {/* Campos exclusivos de Departamento */}
          {isDepto && (
            <>
              {tiposDisponibles && tiposDisponibles.length > 0 && (
                <div>
                  <label className="block font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Tipología de Departamento (Editable)
                  </label>
                  <select
                    value={depto.tipologia || ''}
                    onChange={(e) => {
                      const sel = e.target.value
                      const matched = tiposDisponibles.find((t) => t.nombre === sel)
                      onChange({
                        ...depto,
                        tipologia: sel,
                        areaM2: matched ? matched.areaM2 : depto.areaM2,
                        expensaBase: matched ? matched.expensaBase : depto.expensaBase
                      })
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="">Seleccionar tipología...</option>
                    {tiposDisponibles.map((t) => (
                      <option key={t.id} value={t.nombre}>
                        {t.nombre} ({t.areaM2} m² • Bs. {t.expensaBase.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              {/* SECCIÓN EDITABLE: VINCULACIÓN DE PARQUEO Y BAULERA */}
              <div className="p-3.5 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-800/60 border border-[#cec8bc] dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#262422] dark:text-white border-b border-[#cec8bc]/60 dark:border-slate-700/60 pb-2">
                  <Link2 className="w-4 h-4 text-blue-700 dark:text-indigo-400" />
                  <span>Asignación de Parqueo y Baulera para este Departamento</span>
                </div>

                {/* Dropdown Parqueo */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[#5c5750] dark:text-slate-300 flex items-center gap-1">
                      <Car className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                      Parqueo Asignado
                    </label>
                    {selectedParqueoId && (
                      <button
                        type="button"
                        onClick={() => setSelectedParqueoId(null)}
                        className="text-[10px] text-rose-700 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                      >
                        Quitar parqueo
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedParqueoId ?? ''}
                    onChange={(e) => setSelectedParqueoId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="">(Sin parqueo asignado / Libre)</option>
                    {parqueosDisponibles.map((p) => {
                      const esActual = p.id === initialParqueoId || p.numero === depto.parqueo
                      const deptoAsignado = p.departamento?.numero
                      return (
                        <option key={p.id} value={p.id}>
                          Parqueo {p.numero} {esActual ? '★ (Asignado a este dpto)' : p.estado === 'Disponible' ? '(Disponible)' : `(Asignado a Dpto ${deptoAsignado || 'otro'})`}
                        </option>
                      )
                    })}
                  </select>
                </div>

                {/* Dropdown Baulera */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[#5c5750] dark:text-slate-300 flex items-center gap-1">
                      <Box className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      Baulera Asignada
                    </label>
                    {selectedBauleraId && (
                      <button
                        type="button"
                        onClick={() => setSelectedBauleraId(null)}
                        className="text-[10px] text-rose-700 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                      >
                        Quitar baulera
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedBauleraId ?? ''}
                    onChange={(e) => setSelectedBauleraId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="">(Sin baulera asignada / Libre)</option>
                    {baulerasDisponibles.map((b) => {
                      const esActual = b.id === initialBauleraId || b.numero === depto.baulera
                      const deptoAsignado = b.departamento?.numero
                      return (
                        <option key={b.id} value={b.id}>
                          Baulera {b.numero} {esActual ? '★ (Asignada a este dpto)' : b.estado === 'Disponible' ? '(Disponible)' : `(Asignada a Dpto ${deptoAsignado || 'otro'})`}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* CAMPOS EXCLUSIVOS SI ES PARQUEO O BAULERA */}
          {!isDepto && (
            <div className="p-3.5 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-800/60 border border-[#cec8bc] dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#262422] dark:text-white border-b border-[#cec8bc]/60 dark:border-slate-700/60 pb-2">
                <Link2 className="w-4 h-4 text-blue-700 dark:text-indigo-400" />
                <span>Asignación Inmobiliaria de {tipo}</span>
              </div>

              {/* Selector de Departamento Vinculado */}
              <div>
                <label className="block font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                  Vincular a Departamento Asociado
                </label>
                <select
                  value={selectedDeptoId ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null
                    setSelectedDeptoId(val)
                    if (val && depto.estado === 'Disponible') {
                      onChange({ ...depto, estado: 'Asignado' })
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="">(Sin departamento vinculado / Unidad libre)</option>
                  {deptosDisponibles.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dpto. {d.numero} (Piso {d.piso || '-'} • {d.propietario?.nombre || 'Sin titular'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Titular / Persona Asignada */}
              <div>
                <label className="block font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                  Asignar a Persona / Titular
                </label>
                <select
                  value={selectedPersonaId ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null
                    setSelectedPersonaId(val)
                    if (val && depto.estado === 'Disponible') {
                      onChange({ ...depto, estado: 'Asignado' })
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="">(Sin titular asignado)</option>
                  {personasList.map((p) => (
                    <option key={p.idPersona} value={p.idPersona}>
                      {p.nombres} {p.apellidos} {p.ciNit ? `(CI: ${p.ciNit})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botón rápido para liberar unidad */}
              {(selectedDeptoId || selectedPersonaId || depto.estado === 'Asignado') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDeptoId(null)
                    setSelectedPersonaId(null)
                    onChange({ ...depto, estado: 'Disponible' })
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-amber-500/25 transition-all cursor-pointer"
                >
                  <LockOpen className="w-4 h-4" />
                  <span>Desvincular y dejar como Disponible (Libre)</span>
                </button>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl font-bold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-indigo-600 font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>Guardando cambios...</>
              ) : (
                <>Guardar y Actualizar</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
