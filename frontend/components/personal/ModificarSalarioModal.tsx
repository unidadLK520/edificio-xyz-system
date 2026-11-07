// frontend/components/personal/ModificarSalarioModal.tsx
// Modal para modificar el salario base de un colaborador (PUT /api/v1/personal/:id/salario)
// Requiere motivo obligatorio de al menos 5 caracteres para auditoría financiera.

'use client'

import React, { useState } from 'react'
import { X, DollarSign, AlertCircle } from 'lucide-react'
import { apiFetch } from '@/lib/api'

export interface ModificarSalarioModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (nuevoSalario: number, mensaje: string) => void
  empleado: {
    idEmpleado: number
    nombres: string
    apellidos: string
    salarioBase: number
  } | null
}

export default function ModificarSalarioModal({
  isOpen,
  onClose,
  onSuccess,
  empleado,
}: ModificarSalarioModalProps) {
  const [nuevoSalario, setNuevoSalario] = useState<number | ''>('')
  const [motivo, setMotivo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen || !empleado) return null

  const salarioActual = Number(empleado.salarioBase)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (nuevoSalario === '' || Number(nuevoSalario) <= 0) {
      setErrorMessage('El nuevo salario base debe ser mayor a 0 Bs.')
      return
    }

    if (Number(nuevoSalario) === salarioActual) {
      setErrorMessage('El nuevo salario debe ser diferente al salario base actual.')
      return
    }

    if (motivo.trim().length < 5) {
      setErrorMessage('El motivo del ajuste salarial debe tener al menos 5 caracteres.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await apiFetch(`/api/v1/personal/${empleado.idEmpleado}/salario`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salarioBase: Number(nuevoSalario),
          motivo: motivo.trim(),
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        let msg = data.message || data.error || 'Error al actualizar el salario base.'
        if (data.details) {
          const detailStr = Object.entries(data.details)
            .map(([k, v]: [string, any]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ')
          msg = `${msg} (${detailStr})`
        }
        setErrorMessage(msg)
        return
      }

      onSuccess(
        Number(nuevoSalario),
        `¡Salario base de ${empleado.nombres} ${empleado.apellidos} actualizado a Bs. ${Number(nuevoSalario).toFixed(2)} correctamente!`
      )
      setNuevoSalario('')
      setMotivo('')
      onClose()
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error de conexión al modificar el salario.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setErrorMessage(null)
    setNuevoSalario('')
    setMotivo('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4 animate-in fade-in duration-150">
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
              Ajustar Salario Base
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 rounded-lg cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800 text-xs space-y-1">
          <p className="text-[#7d776f]">
            Colaborador:{' '}
            <strong className="text-[#262422] dark:text-white">
              {empleado.nombres} {empleado.apellidos}
            </strong>
          </p>
          <p className="text-[#7d776f]">
            Salario base actual:{' '}
            <strong className="text-emerald-800 dark:text-emerald-400 font-mono">
              Bs. {salarioActual.toFixed(2)}
            </strong>
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
              Nuevo Salario Base (Bs.) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="Ej. 3000.00"
              value={nuevoSalario}
              onChange={(e) => setNuevoSalario(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-emerald-800 dark:text-emerald-400 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
              Motivo del Ajuste Salarial (Mínimo 5 caracteres) *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Ej. Incremento salarial por antigüedad y ajuste anual aprobado en asamblea..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
            />
            <span className="text-[10px] text-[#7d776f]">
              Quedará registrado permanentemente en la auditoría del sistema con el antes/después.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-semibold text-[#262422] dark:text-white hover:bg-[#cec8bc] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-600 text-xs font-bold text-white shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Confirmar Ajuste Salarial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

