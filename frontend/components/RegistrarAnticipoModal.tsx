// frontend/components/RegistrarAnticipoModal.tsx
// Modal para registrar pagos anticipados (Requerimiento C 5.1)
// Permite recibir saldo a favor (ej. Bs 1,000) para un departamento y amortizarlo en cargos futuros

'use client'

import React, { useState } from 'react'
import { Wallet, X, AlertCircle, CheckCircle2, DollarSign, Building2, User } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface RegistrarAnticipoModalProps {
  isOpen: boolean
  onClose: () => void
  departamentos: Array<{ idDepartamento: number; numero: string; tipologia?: string }>
  personasList: Array<{ idPersona: number; nombres: string; apellidos: string; ciNit?: string }>
  onSuccess: (mensaje: string) => void
}

export default function RegistrarAnticipoModal({
  isOpen,
  onClose,
  departamentos,
  personasList,
  onSuccess
}: RegistrarAnticipoModalProps) {
  const [selectedDeptoId, setSelectedDeptoId] = useState<number | ''>(
    departamentos[0]?.idDepartamento || ''
  )
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | ''>(
    personasList[0]?.idPersona || ''
  )
  const [montoAnticipo, setMontoAnticipo] = useState<number | ''>(1000)
  const [metodoPago, setMetodoPago] = useState<string>('Transferencia')
  const [glosaComprobante, setGlosaComprobante] = useState<string>('Anticipo de Expensas')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!selectedDeptoId) {
      setErrorMessage('Debe seleccionar el departamento beneficiario del anticipo.')
      return
    }

    if (!selectedPersonaId) {
      setErrorMessage('Debe seleccionar la persona pagadora.')
      return
    }

    const montoNum = Number(montoAnticipo)
    if (isNaN(montoNum) || montoNum <= 0) {
      setErrorMessage('El monto anticipado debe ser mayor a 0 Bs.')
      return
    }

    setIsSubmitting(true)
    try {
      // POST a la ruta de pagos de expensas con esAnticipado: true y sin idExpensa
      const res = await apiFetch(`/api/v1/expensas/${selectedDeptoId}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idDepartamento: Number(selectedDeptoId),
          idExpensa: null,
          idPersonaPagador: Number(selectedPersonaId),
          montoPagado: montoNum,
          interesPagado: 0,
          metodoPago,
          esAnticipado: true,
          comprobanteUrl: glosaComprobante.trim() || undefined
        })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Error al registrar el anticipo.')
      }

      onSuccess(
        `¡Anticipo de Bs. ${montoNum.toFixed(2)} registrado exitosamente! Se amortizará automáticamente en las siguientes expensas.`
      )
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión al registrar el anticipo.')
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
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                Registrar Pago Anticipado (Bolsa de Crédito)
              </h3>
              <p className="text-xs text-[#7d776f]">Requerimiento C 5.1 — Disminución automática mensual</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-[#7d776f] hover:text-[#262422] dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="p-3 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Departamento */}
          <div>
            <label className="block font-bold text-[#262422] dark:text-white mb-1">
              Departamento Beneficiario *
            </label>
            <select
              required
              value={selectedDeptoId}
              onChange={(e) => setSelectedDeptoId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white"
            >
              <option value="" disabled>
                Seleccione un departamento...
              </option>
              {departamentos.map((d) => (
                <option key={d.idDepartamento} value={d.idDepartamento}>
                  Dpto. {d.numero} {d.tipologia ? `(${d.tipologia})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Persona Pagadora */}
          <div>
            <label className="block font-bold text-[#262422] dark:text-white mb-1">
              Persona que Realiza el Anticipo *
            </label>
            <select
              required
              value={selectedPersonaId}
              onChange={(e) => setSelectedPersonaId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white"
            >
              <option value="" disabled>
                Seleccione una persona...
              </option>
              {personasList.map((p) => (
                <option key={p.idPersona} value={p.idPersona}>
                  {p.nombres} {p.apellidos} {p.ciNit ? `(CI: ${p.ciNit})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Monto Anticipado */}
          <div>
            <label className="block font-bold text-[#262422] dark:text-white mb-1">
              Monto Anticipado a Recibir (Bs.) *
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              value={montoAnticipo}
              onChange={(e) =>
                setMontoAnticipo(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder="Ej. 1000"
              className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 font-mono font-bold text-sm text-amber-700 dark:text-amber-400"
            />
            <p className="text-[10px] text-[#7d776f] mt-1">
              Ejemplo pliego: Recibir Bs 1,000 y descontar progresivamente según las expensas generadas.
            </p>
          </div>

          {/* Forma de Pago */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-[#262422] dark:text-white mb-1">
                Forma de Pago *
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white"
              >
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="QR">Pago QR</option>
                <option value="Efectivo">Efectivo en Caja</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#262422] dark:text-white mb-1">
                Referencia / Glosa
              </label>
              <input
                type="text"
                value={glosaComprobante}
                onChange={(e) => setGlosaComprobante(e.target.value)}
                placeholder="Ej. Anticipo Expensas"
                className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs"
              />
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
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Anticipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

