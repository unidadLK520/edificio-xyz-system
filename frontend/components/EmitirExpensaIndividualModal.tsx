// frontend/components/EmitirExpensaIndividualModal.tsx
// Modal para emisión de expensas individuales por departamento (Requerimiento C 2.1 y Pizarra)

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { PlusCircle, X, AlertCircle, Calendar, Building2, Droplets, Sparkles, CheckCircle2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { fechaSolo } from '@/lib/fecha'

interface DepartamentoOption {
  idDepartamento: number
  numero: string
  tipologia?: string
  expensaBase?: number
}

interface EmitirExpensaIndividualModalProps {
  isOpen: boolean
  onClose: () => void
  departamentos: DepartamentoOption[]
  defaultPeriodo?: string
  defaultVencimiento?: string
  onSuccess: (idExpensa: number, mensaje: string, extraData?: { concepto: string; monto: number }) => void
}

export default function EmitirExpensaIndividualModal({
  isOpen,
  onClose,
  departamentos,
  defaultPeriodo = '2026-11-01',
  defaultVencimiento = '2026-11-10',
  onSuccess
}: EmitirExpensaIndividualModalProps) {
  const [selectedDeptoId, setSelectedDeptoId] = useState<number | ''>('')
  const [periodo, setPeriodo] = useState<string>(defaultPeriodo)
  const [fechaVencimiento, setFechaVencimiento] = useState<string>(defaultVencimiento)
  const [montoBase, setMontoBase] = useState<number | ''>(350)
  const [montoAgua, setMontoAgua] = useState<number | ''>(20)
  const [incluirExtra, setIncluirExtra] = useState<boolean>(false)
  const [extraConcepto, setExtraConcepto] = useState<string>('Extra Pintura Edificio')
  const [extraMonto, setExtraMonto] = useState<number | ''>(10)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Seleccionar el primer departamento por defecto al abrir
  useEffect(() => {
    if (departamentos.length > 0 && !selectedDeptoId) {
      const primerDepto = departamentos[0]
      setSelectedDeptoId(primerDepto.idDepartamento)
      determinarMontoBaseSugerido(primerDepto.tipologia)
    }
  }, [departamentos, selectedDeptoId, isOpen])

  const determinarMontoBaseSugerido = (tipologia?: string) => {
    const t = (tipologia || '').toLowerCase()
    if (t.includes('tipo c') || t.includes('3')) setMontoBase(400)
    else if (t.includes('tipo b') || t.includes('2')) setMontoBase(350)
    else setMontoBase(300)
  }

  const handleDeptoChange = (idDepto: number) => {
    setSelectedDeptoId(idDepto)
    const depto = departamentos.find((d) => d.idDepartamento === idDepto)
    if (depto) {
      determinarMontoBaseSugerido(depto.tipologia)
    }
  }

  // Desglose calculado en vivo según la fórmula de la pizarra
  const totalCalculado = useMemo(() => {
    const b = Number(montoBase || 0)
    const a = Number(montoAgua || 0)
    const e = incluirExtra ? Number(extraMonto || 0) : 0
    return Math.round((b + a + e) * 100) / 100
  }, [montoBase, montoAgua, incluirExtra, extraMonto])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!selectedDeptoId) {
      setErrorMessage('Debe seleccionar un departamento.')
      return
    }

    if (!periodo) {
      setErrorMessage('Debe especificar el período de la expensa.')
      return
    }

    if (!fechaVencimiento) {
      setErrorMessage('Debe especificar la fecha de vencimiento.')
      return
    }

    const baseNum = Number(montoBase || 0)
    if (baseNum <= 0) {
      setErrorMessage('El monto base de la expensa debe ser mayor a 0 Bs.')
      return
    }

    const aguaNum = Number(montoAgua || 0)
    const extraNum = incluirExtra ? Number(extraMonto || 0) : 0

    // Normalizar periodo al primer día del mes YYYY-MM-01
    const [pYear, pMonth] = periodo.split('-')
    const periodoNormalizado = `${pYear}-${pMonth}-01`

    setIsSubmitting(true)
    try {
      const res = await apiFetch('/api/v1/expensas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idDepartamento: Number(selectedDeptoId),
          periodo: periodoNormalizado,
          fechaVencimiento,
          montoBase: baseNum,
          montoAgua: aguaNum,
          monto: totalCalculado
        })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        let msg = data.message || data.error || 'Error al emitir expensa individual.'
        if (data.details) {
          const detailStr = Object.entries(data.details)
            .map(([k, v]: [string, any]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ')
          msg = `${msg} (${detailStr})`
        }
        setErrorMessage(msg)
        return
      }

      const idExpensaCreada = data.idExpensa || (data.data && data.data.idExpensa)
      const deptoObj = departamentos.find((d) => d.idDepartamento === Number(selectedDeptoId))
      const deptoLabel = deptoObj ? `Dpto. ${deptoObj.numero}` : `Dpto. #${selectedDeptoId}`

      onSuccess(
        idExpensaCreada,
        `¡Expensa individual emitida exitosamente para ${deptoLabel} por Bs. ${totalCalculado.toFixed(2)}!`,
        incluirExtra && extraNum > 0 ? { concepto: extraConcepto.trim() || 'Extra', monto: extraNum } : undefined
      )
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión al emitir la expensa individual.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-700 dark:bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-800/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                Emitir Expensa Individual
              </h3>
              <p className="text-xs text-[#7d776f]">
                Generación directa para una unidad específica con desglose de rubros
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

        {/* Error inline */}
        {errorMessage && (
          <div className="p-3 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl flex items-center gap-2 text-xs animate-in shake duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Selección de Departamento */}
          <div>
            <label className="block font-bold text-[#262422] dark:text-white mb-1">
              Departamento a Emitir *
            </label>
            <select
              required
              value={selectedDeptoId}
              onChange={(e) => handleDeptoChange(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white font-medium"
            >
              <option value="" disabled>
                Seleccione un departamento...
              </option>
              {departamentos.map((d) => (
                <option key={d.idDepartamento} value={d.idDepartamento}>
                  Dpto. {d.numero} {d.tipologia ? `— (${d.tipologia})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Período y Fecha de Vencimiento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#262422] dark:text-white mb-1">
                Período (Mes/Año) *
              </label>
              <input
                type="date"
                required
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 font-mono text-xs text-[#262422] dark:text-white font-bold"
              />
              <span className="text-[10px] text-[#7d776f]">Normalizado al 1er día del mes</span>
            </div>

            <div>
              <label className="block font-bold text-[#262422] dark:text-white mb-1">
                Fecha de Vencimiento *
              </label>
              <input
                type="date"
                required
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 font-mono text-xs text-[#262422] dark:text-white font-bold"
              />
              <span className="text-[9px] text-[#7d776f]">Límite de pago sin mora</span>
            </div>
          </div>

          {/* Desglose de Montos: Base y Agua */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-bold text-[#262422] dark:text-white mb-1">
                Expensa Base (Bs.) *
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={montoBase}
                onChange={(e) =>
                  setMontoBase(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="300"
                className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 font-mono font-bold text-sm text-[#262422] dark:text-white"
              />
              <span className="text-[10px] text-[#7d776f]">Tipo A = 300, B = 350, C = 400</span>
            </div>

            <div>
              <label className="block font-bold text-[#262422] dark:text-white mb-1">
                Consumo de Agua (Bs.)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={montoAgua}
                onChange={(e) =>
                  setMontoAgua(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="20"
                className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 font-mono font-bold text-sm text-blue-700 dark:text-blue-400"
              />
              <span className="text-[10px] text-[#7d776f]">Ej. Bs 20 según consumo</span>
            </div>
          </div>

          {/* Checkbox para Monto Extra Individual (Pizarra: Ej. B3 Extra Pintura 10 Bs) */}
          <div className="p-3 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-800/60 border border-[#cec8bc] dark:border-slate-700 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[#262422] dark:text-white">
              <input
                type="checkbox"
                checked={incluirExtra}
                onChange={(e) => setIncluirExtra(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 cursor-pointer"
              />
              <span>Agregar Cargo Extraordinario Individual</span>
            </label>

            {incluirExtra && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#cec8bc] dark:border-slate-700 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-semibold mb-1 text-[#66615b] dark:text-slate-400">
                    Concepto del Extra:
                  </label>
                  <input
                    type="text"
                    value={extraConcepto}
                    onChange={(e) => setExtraConcepto(e.target.value)}
                    placeholder="Ej. Extra Pintura Edificio"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1 text-[#66615b] dark:text-slate-400">
                    Monto Extra (Bs.):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={extraMonto}
                    onChange={(e) =>
                      setExtraMonto(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="10"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta de Resumen en Vivo según la Fórmula de la Pizarra */}
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs font-mono space-y-1 text-blue-950 dark:text-blue-200">
            <span className="font-bold text-[10px] uppercase tracking-wider block text-blue-700 dark:text-blue-400">
              Resumen de Liquidación Resultante
            </span>
            <div className="flex justify-between">
              <span>Expensa Base:</span>
              <span className="font-bold">Bs. {Number(montoBase || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Consumo Agua:</span>
              <span className="font-bold">Bs. {Number(montoAgua || 0).toFixed(2)}</span>
            </div>
            {incluirExtra && (
              <div className="flex justify-between text-indigo-700 dark:text-indigo-300">
                <span>{extraConcepto || 'Extra'}:</span>
                <span className="font-bold">+ Bs. {Number(extraMonto || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-blue-200 dark:border-blue-800 pt-1.5 font-black text-sm text-blue-900 dark:text-white">
              <span>Total a Emitir:</span>
              <span>Bs. {totalCalculado.toFixed(2)}</span>
            </div>
          </div>

          {/* Botones de acción */}
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
              className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Emitiendo expensa...' : '⚡ Emitir Expensa Individual'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

