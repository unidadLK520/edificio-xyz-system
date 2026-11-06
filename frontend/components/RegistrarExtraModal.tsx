// frontend/components/RegistrarExtraModal.tsx
// Modal para registrar montos extras individuales con descripción (Requerimiento C 2.2 & Pizarra)
// Ejemplo de la pizarra: Dpto B3 -> Expensa Bs 350 + Agua Bs 20 + Extra Bs 10 = Total Bs 380

'use client'

import React, { useState, useEffect } from 'react'
import { PlusCircle, X, AlertCircle, DollarSign, FileText } from 'lucide-react'

interface RegistrarExtraModalProps {
  isOpen: boolean
  onClose: () => void
  expensa: any
  onSuccess: (idExpensa: number, concepto: string, montoExtra: number) => void
}

export default function RegistrarExtraModal({
  isOpen,
  onClose,
  expensa,
  onSuccess
}: RegistrarExtraModalProps) {
  const [concepto, setConcepto] = useState('Extra Pintura Edificio')
  const [montoExtra, setMontoExtra] = useState<number | ''>(10)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (expensa) {
      if (expensa.extraConcepto) {
        setConcepto(expensa.extraConcepto)
      } else {
        setConcepto('Extra Pintura Edificio')
      }
      if (expensa.montoExtra !== undefined) {
        setMontoExtra(Number(expensa.montoExtra))
      } else {
        setMontoExtra(10)
      }
      setErrorMessage(null)
    }
  }, [expensa, isOpen])

  if (!isOpen || !expensa) return null

  const montoBase = Number(expensa.montoBase || expensa.monto || 0)
  const montoAgua = Number(expensa.montoAgua || 0)
  const extraNum = Number(montoExtra || 0)
  const nuevoTotalCalculado = Math.round((montoBase + montoAgua + extraNum) * 100) / 100

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!concepto.trim()) {
      setErrorMessage('La descripción o concepto del extra es obligatoria.')
      return
    }

    if (isNaN(extraNum) || extraNum < 0) {
      setErrorMessage('El monto extra no puede ser negativo.')
      return
    }

    onSuccess(expensa.idExpensa, concepto.trim(), extraNum)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                Cargo Extraordinario Individual
              </h3>
              <p className="text-xs text-[#7d776f]">
                Dpto. {expensa.departamento?.numero || expensa.idDepartamento} • Requerimiento C 2.2
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

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Concepto del Extra */}
          <div>
            <label className="block font-bold text-[#262422] dark:text-white mb-1">
              Descripción o Concepto del Extra *
            </label>
            <input
              type="text"
              required
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej. Extra Pintura Edificio o Reparación Portón"
              className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white font-medium"
            />
            <p className="text-[10px] text-[#7d776f] mt-1">
              Ejemplos pliego/pizarra: &quot;Extra Pintura Edificio&quot;, &quot;Mantenimiento Extraordinario&quot;.
            </p>
          </div>

          {/* Monto Extra */}
          <div>
            <label className="block font-bold text-[#262422] dark:text-white mb-1">
              Monto Adicional (Bs.) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={montoExtra}
              onChange={(e) =>
                setMontoExtra(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder="Ej. 10 ó 250"
              className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 font-mono font-bold text-sm text-indigo-700 dark:text-indigo-400"
            />
          </div>

          {/* Tarjeta de visualización en vivo según la fórmula de la pizarra: Exp + Agua + Extra = Total */}
          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1.5 font-mono text-xs text-indigo-950 dark:text-indigo-200">
            <span className="font-bold text-[10px] uppercase tracking-wider block text-indigo-700 dark:text-indigo-400">
              Desglose Resultante (Fórmula Pizarra)
            </span>
            <div className="flex justify-between">
              <span>Expensa Base:</span>
              <span className="font-bold">Bs. {montoBase.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Agua:</span>
              <span className="font-bold">Bs. {montoAgua.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-indigo-700 dark:text-indigo-300">
              <span>{concepto || 'Extra'}:</span>
              <span className="font-bold">+ Bs. {extraNum.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-indigo-200 dark:border-indigo-800 pt-1 font-black text-sm text-indigo-900 dark:text-white">
              <span>Total Liquidado:</span>
              <span>Bs. {nuevoTotalCalculado.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#7d776f] hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              Guardar Monto Extra
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

