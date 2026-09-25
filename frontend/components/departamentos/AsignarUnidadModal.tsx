// frontend/components/departamentos/AsignarUnidadModal.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { UserCheck, X, Building2, Car, Box, AlertCircle } from 'lucide-react'
import { UnidadItem } from './types'

interface AsignarUnidadModalProps {
  isOpen: boolean
  onClose: () => void
  unidad: UnidadItem | null
  onSuccess: () => void
}

export default function AsignarUnidadModal({
  isOpen,
  onClose,
  unidad,
  onSuccess
}: AsignarUnidadModalProps) {
  const [personas, setPersonas] = useState<any[]>([])
  const [departamentos, setDepartamentos] = useState<any[]>([])
  const [selectedPersona, setSelectedPersona] = useState<string>('')
  const [selectedDepartamento, setSelectedDepartamento] = useState<string>('')
  const [tipoRelacion, setTipoRelacion] = useState<'Propietario' | 'Inquilino' | 'Asignado'>('Asignado')
  const [notas, setNotas] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      // Cargar lista de personas y departamentos para la selección
      fetch('/api/v1/personas')
        .then((res) => res.json())
        .then((data) => {
          if (data.data && Array.isArray(data.data)) {
            setPersonas(data.data)
          }
        })
        .catch(() => {})

      fetch('/api/v1/departamentos')
        .then((res) => res.json())
        .then((data) => {
          if (data.data && Array.isArray(data.data)) {
            setDepartamentos(data.data)
          }
        })
        .catch(() => {})
    }
  }, [isOpen])

  if (!isOpen || !unidad) return null

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setIsSubmitting(true)

    try {
      const payload = {
        tipoUnidad: unidad.tipoUnidad,
        idUnidad: unidad.id,
        idPersona: selectedPersona ? Number(selectedPersona) : undefined,
        idDepartamento: selectedDepartamento ? Number(selectedDepartamento) : undefined,
        tipoRelacion: unidad.tipoUnidad === 'Departamento' ? tipoRelacion : 'Asignado',
        notas
      }

      const res = await fetch('/api/v1/unidades/asignaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.message || 'Error al guardar asignación')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFinalize = async () => {
    if (!confirm(`¿Está seguro de finalizar la asignación actual de ${unidad.tipoUnidad} ${unidad.numero}?`)) return

    setErrorMsg(null)
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/v1/unidades/asignaciones/finalizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoUnidad: unidad.tipoUnidad,
          idUnidad: unidad.id,
          notas: 'Finalizado manualmente desde administración'
        })
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.message || 'Error al finalizar asignación')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al finalizar asignación')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-700 dark:text-indigo-400" />
            <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
              Gestionar Asignación de {unidad.tipoUnidad} {unidad.numero}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-800 rounded-xl text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAssign} className="space-y-4">
          {unidad.tipoUnidad === 'Departamento' && (
            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Tipo de Relación *
              </label>
              <select
                value={tipoRelacion}
                onChange={(e) => setTipoRelacion(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white"
              >
                <option value="Propietario">Propietario</option>
                <option value="Inquilino">Ocupante / Inquilino</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
              Asignar a Persona
            </label>
            <select
              value={selectedPersona}
              onChange={(e) => setSelectedPersona(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white"
            >
              <option value="">-- Seleccionar Persona --</option>
              {personas.map((p) => (
                <option key={p.idPersona} value={p.idPersona}>
                  {p.nombres} {p.apellidos} (CI: {p.ciNit})
                </option>
              ))}
            </select>
          </div>

          {unidad.tipoUnidad !== 'Departamento' && (
            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Asignar a Departamento Asociado (Opcional)
              </label>
              <select
                value={selectedDepartamento}
                onChange={(e) => setSelectedDepartamento(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white"
              >
                <option value="">-- Sin Departamento Asociado --</option>
                {departamentos.map((d) => (
                  <option key={d.idDepartamento} value={d.idDepartamento}>
                    Departamento {d.numero} (Piso {d.piso || '-'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
              Notas / Observaciones
            </label>
            <input
              type="text"
              placeholder="Ej. Entrega de llaves realizada"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#cec8bc] dark:border-slate-800">
            {unidad.estado !== 'Disponible' && (
              <button
                type="button"
                onClick={handleFinalize}
                disabled={isSubmitting}
                className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all"
              >
                Finalizar Asignación
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-xs font-bold text-white shadow-md"
              >
                {isSubmitting ? 'Guardando...' : 'Confirmar Asignación'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
