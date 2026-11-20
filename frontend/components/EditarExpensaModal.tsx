// frontend/components/EditarExpensaModal.tsx
// Modal para editar los montos individuales de una expensa (Expensa Base, Agua, Extras)
// Requerimientos C 2.1, 2.2, 2.3

'use client'

import React, { useState, useEffect } from 'react'
import { Edit3, X, AlertCircle, DollarSign, Droplet, Calendar, ShieldCheck } from 'lucide-react'

interface EditarExpensaModalProps {
  isOpen: boolean
  onClose: () => void
  expensa: any
  onSuccess: (updated: any) => void
}

export default function EditarExpensaModal({
  isOpen,
  onClose,
  expensa,
  onSuccess
}: EditarExpensaModalProps) {
  const [montoBase, setMontoBase] = useState<number | ''>('')
  const [montoAgua, setMontoAgua] = useState<number | ''>('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (expensa) {
      setMontoBase(Number(expensa.montoBase !== undefined ? expensa.montoBase : expensa.monto || 0))
      setMontoAgua(Number(expensa.montoAgua || 0))
      if (expensa.fechaVencimiento) {
        setFechaVencimiento(new Date(expensa.fechaVencimiento).toISOString().split('T')[0])
      } else {
        setFechaVencimiento('')
      }
      setErrorMessage(null)
    }
  }, [expensa, isOpen])

  if (!isOpen || !expensa) return null

  const baseNum = Number(montoBase || 0)
  const aguaNum = Number(montoAgua || 0)
  const extrasNum = Number(expensa.montoExtra || expensa.montoExtras || 0)
  const nuevoTotalCalculado = Math.round((baseNum + aguaNum + extrasNum) * 100) / 100

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (isNaN(baseNum) || baseNum < 0) {
      setErrorMessage('La expensa base debe ser un monto positivo.')
      return
    }
    if (isNaN(aguaNum) || aguaNum < 0) {
      setErrorMessage('El monto de agua no puede ser negativo.')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/v1/expensas/${expensa.idExpensa}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          montoBase: baseNum,
          montoAgua: aguaNum,
          fechaVencimiento: fechaVencimiento || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Error al actualizar los montos de la expensa')
      }

      onSuccess(data.data || { ...expensa, montoBase: baseNum, montoAgua: aguaNum, monto: nuevoTotalCalculado })
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión con el servidor')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                Editar Montos de Expensa
              </h3>
              <p className="text-xs text-[#7d776f]">
                Dpto. {expensa.departamento?.numero || expensa.idDepartamento} • {expensa.periodo ? new Date(expensa.periodo).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-[#7d776f] hover:text-[#262422] dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Monto Base Expensa */}
          <div>
            <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
              Expensa Base (Bs.) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-[#7d776f]">Bs.</span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={montoBase}
                onChange={(e) => setMontoBase(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full pl-10 pr-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs font-bold text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Monto Agua */}
          <div>
            <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1 flex items-center gap-1">
              <Droplet className="w-3.5 h-3.5 text-blue-500" />
              Monto Consumo de Agua (Bs.)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-[#7d776f]">Bs.</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={montoAgua}
                onChange={(e) => setMontoAgua(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full pl-10 pr-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs font-bold text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Fecha de Vencimiento */}
          <div>
            <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Fecha de Vencimiento
            </label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs font-bold text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Resumen del nuevo total */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs">
            <span className="font-semibold text-[#5c5750] dark:text-slate-300">
              Nuevo Total a Cobrar:
            </span>
            <span className="font-mono font-extrabold text-sm text-amber-700 dark:text-amber-400">
              Bs. {nuevoTotalCalculado.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#cec8bc] dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
