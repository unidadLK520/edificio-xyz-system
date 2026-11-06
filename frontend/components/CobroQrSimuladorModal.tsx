// frontend/components/CobroQrSimuladorModal.tsx
// Modal de Simulación de Pago por QR y Cálculo Dinámico de Mora según Fecha del Sistema (Requerimientos C 4.1, 4.2, 4.3, 12.6 y Pizarra)

'use client'

import React, { useState, useMemo } from 'react'
import {
  QrCode,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  X,
  CreditCard,
  Building2,
  Sparkles,
  Info
} from 'lucide-react'
import { useFechaSistema } from '@/context/FechaSistemaContext'
import { apiFetch } from '@/lib/api'
import { fechaSolo } from '@/lib/fecha'

interface CobroQrSimuladorModalProps {
  isOpen: boolean
  onClose: () => void
  expensa: any
  personasList?: Array<{ idPersona: number; nombres: string; apellidos: string; ciNit?: string }>
  onPaymentSuccess?: (reciboInfo?: any) => void
}

export default function CobroQrSimuladorModal({
  isOpen,
  onClose,
  expensa,
  personasList = [],
  onPaymentSuccess
}: CobroQrSimuladorModalProps) {
  const { fechaSistema, setFechaSistema, politicaMora, calcularMoraExpensa } = useFechaSistema()

  const [idPersonaSeleccionada, setIdPersonaSeleccionada] = useState<number | ''>(() => {
    return expensa?.departamento?.propietario?.idPersona || personasList[0]?.idPersona || ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pagoCompletado, setPagoCompletado] = useState<any | null>(null)

  // Saldo base de la expensa
  const saldoBase = Number(expensa?.saldoPendiente ?? expensa?.monto ?? 0)

  // Cálculo de mora dinámico f(fechaSistema, fechaVencimiento)
  const calculoMora = useMemo(() => {
    return calcularMoraExpensa(expensa?.fechaVencimiento, saldoBase)
  }, [calcularMoraExpensa, expensa?.fechaVencimiento, saldoBase])

  const totalConMora = useMemo(() => {
    return Math.max(0, Math.round((saldoBase + calculoMora.montoMora) * 100) / 100)
  }, [saldoBase, calculoMora.montoMora])

  if (!isOpen || !expensa) return null

  // Presets rápidos del mes de la expensa para simular fácilmente
  const añoMes = fechaSolo(expensa.periodo)?.slice(0, 7) || fechaSistema.slice(0, 7) || '2026-11'
  const diaVenc = String(politicaMora.diaVencimiento || 10).padStart(2, '0')
  const presetAntes = `${añoMes}-05`
  const presetVencimiento = `${añoMes}-${diaVenc}`
  const presetMora = `${añoMes}-15`

  const handleSimularPagoQR = async () => {
    setErrorMessage(null)

    // Validar persona pagadora
    const idPersona = Number(idPersonaSeleccionada)
    if (!idPersona || isNaN(idPersona)) {
      setErrorMessage('Debe seleccionar la persona que efectúa el pago.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await apiFetch(`/api/v1/expensas/${expensa.idExpensa}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montoPagado: saldoBase,
          interesPagado: calculoMora.montoMora,
          metodoPago: 'QR',
          idPersonaPagador: idPersona,
          comprobanteUrl: `QR-SIM-${Date.now().toString().slice(-6)}`
        })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Error al procesar el pago mediante QR.')
      }

      setPagoCompletado({
        ...data,
        expensaOriginal: expensa,
        calculoMora,
        totalPagado: totalConMora,
        fechaSimulada: fechaSistema
      })

      if (onPaymentSuccess) {
        onPaymentSuccess({
          ...expensa,
          saldoPendiente: 0,
          estado: 'Pagado',
          interesPagado: calculoMora.montoMora,
          fechaPagoSimulada: fechaSistema
        })
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión al simular el cobro QR.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-xl rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-700/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                Simulador de Pago por QR Simple
              </h3>
              <p className="text-xs text-[#7d776f]">
                Dpto. {expensa.departamento?.numero || expensa.idDepartamento} • Período:{' '}
                {expensa.periodo}
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

        {/* Mensaje de Error */}
        {errorMessage && (
          <div className="p-3 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Si ya se completó el pago simulado */}
        {pagoCompletado ? (
          <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-lg text-emerald-900 dark:text-emerald-200">
                ¡Pago QR Simulado con Éxito!
              </h4>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                La expensa ha sido marcada como <span className="font-bold">Pagada</span> en el
                sistema con fecha simulada: <span className="font-mono font-bold">{pagoCompletado.fechaSimulada}</span>.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-left space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Monto Expensa:</span>
                <span className="font-bold">Bs. {saldoBase.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Mora Pagada:</span>
                <span className="font-bold text-rose-600">
                  Bs. {calculoMora.montoMora.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold text-sm text-emerald-700">
                <span>Total Cobrado:</span>
                <span>Bs. {totalConMora.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Cerrar Simulador
            </button>
          </div>
        ) : (
          <>
            {/* SECCIÓN 1: CONTROL DE FECHA SIMULADA DE LA PIZARRA (Req C 4.1, 4.2, 4.3) */}
            <div className="p-3.5 rounded-2xl bg-[#dfd9ce]/80 dark:bg-slate-800/80 border border-[#cec8bc] dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#262422] dark:text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-700 dark:text-indigo-400" />
                  Fecha de Simulación del Pago:
                </span>
                <span className="text-[11px] text-[#7d776f] font-mono">
                  Vence: {fechaSolo(expensa.fechaVencimiento) || '—'}
                </span>
              </div>

              {/* Botones de prueba rápida (Antes, Vencimiento, Con Mora) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setFechaSistema(presetAntes)}
                  className={`px-2 py-1.5 rounded-xl font-semibold transition-all border text-center cursor-pointer ${
                    fechaSistema === presetAntes
                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                      : 'bg-[#ede9e1] dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950'
                  }`}
                >
                  🟢 Antes Venc. (05/Nov)
                  <span className="block text-[9px] font-normal opacity-90">Sin mora</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFechaSistema(presetVencimiento)}
                  className={`px-2 py-1.5 rounded-xl font-semibold transition-all border text-center cursor-pointer ${
                    fechaSistema === presetVencimiento
                      ? 'bg-blue-700 text-white border-blue-800 shadow-sm'
                      : 'bg-[#ede9e1] dark:bg-slate-900 text-blue-800 dark:text-blue-300 border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950'
                  }`}
                >
                  🔵 En Vencimiento (10/Nov)
                  <span className="block text-[9px] font-normal opacity-90">Sin mora</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFechaSistema(presetMora)}
                  className={`px-2 py-1.5 rounded-xl font-semibold transition-all border text-center cursor-pointer ${
                    fechaSistema === presetMora
                      ? 'bg-rose-700 text-white border-rose-800 shadow-sm'
                      : 'bg-[#ede9e1] dark:bg-slate-900 text-rose-800 dark:text-rose-300 border-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950'
                  }`}
                >
                  🔴 Con Mora (15/Nov)
                  <span className="block text-[9px] font-normal opacity-90">
                    +{politicaMora.tipoPenalidad === 'fijo' ? `Bs ${politicaMora.montoFijo}` : `${politicaMora.porcentaje}%`}
                  </span>
                </button>
              </div>

              {/* Selector personalizado */}
              <div className="flex items-center gap-2 pt-1 border-t border-[#cec8bc]/60 dark:border-slate-700 text-xs">
                <span className="text-[11px] text-[#7d776f]">Fecha actual en el simulador:</span>
                <input
                  type="date"
                  value={fechaSistema}
                  onChange={(e) => {
                    if (e.target.value) setFechaSistema(e.target.value)
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 font-mono font-bold text-xs"
                />
              </div>
            </div>

            {/* SECCIÓN 2: ESTADO Y CÁLCULO DE MORA EN VIVO */}
            <div
              className={`p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                calculoMora.aplicaMora
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  {calculoMora.aplicaMora ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-200 text-rose-900 uppercase">
                      ⚠️ Aplica Penalidad por Mora
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-200 text-emerald-900 uppercase">
                      ✓ Pago a Tiempo (Sin Mora)
                    </span>
                  )}
                </div>
                <p className="text-[11px] mt-1 opacity-90">{calculoMora.descripcionMora}</p>
              </div>

              <div className="text-right font-mono">
                <span className="text-[10px] text-[#7d776f] block">Recargo por mora</span>
                <span
                  className={`text-base font-black ${
                    calculoMora.aplicaMora ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  Bs. {calculoMora.montoMora.toFixed(2)}
                </span>
              </div>
            </div>

            {/* SECCIÓN 3: CÓDIGO QR Y DESGLOSE FINANCIERO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-[#dfd9ce]/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-[#cec8bc] dark:border-slate-700">
              {/* QR Renderizado */}
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border shadow-inner">
                <div className="w-36 h-36 bg-slate-950 rounded-xl p-2 flex flex-col items-center justify-center text-white space-y-1">
                  <QrCode className="w-20 h-20 text-white" />
                  <span className="text-[8px] font-mono tracking-widest text-emerald-400 font-bold">
                    EDIFICIO-XYZ-EXPENSAS
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1 font-semibold">
                  QR SIMPLE INTERBANCARIO
                </span>
              </div>

              {/* Desglose de Pago */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#cec8bc] dark:border-slate-700 text-[#66615b] dark:text-slate-400">
                  <span>Monto Base Expensa:</span>
                  <span className="font-mono font-bold text-[#262422] dark:text-white">
                    Bs. {(expensa.montoBase || saldoBase).toFixed(2)}
                  </span>
                </div>

                {Boolean(expensa.montoAgua && expensa.montoAgua > 0) && (
                  <div className="flex justify-between py-1 border-b border-[#cec8bc] dark:border-slate-700 text-[#66615b] dark:text-slate-400">
                    <span>Consumo de Agua:</span>
                    <span className="font-mono font-bold text-[#262422] dark:text-white">
                      Bs. {Number(expensa.montoAgua).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-1 border-b border-[#cec8bc] dark:border-slate-700">
                  <span className="text-[#66615b] dark:text-slate-400">Recargo de Mora:</span>
                  <span
                    className={`font-mono font-bold ${
                      calculoMora.montoMora > 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    + Bs. {calculoMora.montoMora.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-t-2 border-[#cec8bc] dark:border-slate-600 font-black text-sm">
                  <span className="text-[#262422] dark:text-white">Total a Cobrar:</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400 text-base">
                    Bs. {totalConMora.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: SELECCIÓN DE PERSONA PAGADORA Y BOTÓN DE SIMULACIÓN */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-[#262422] dark:text-white mb-1">
                  Persona que Realiza el Pago *
                </label>
                <select
                  value={idPersonaSeleccionada}
                  onChange={(e) => setIdPersonaSeleccionada(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white font-medium"
                >
                  {personasList.length === 0 ? (
                    <option value="1">Copropietario Titular</option>
                  ) : (
                    personasList.map((p) => (
                      <option key={p.idPersona} value={p.idPersona}>
                        {p.nombres} {p.apellidos} {p.ciNit ? `(CI: ${p.ciNit})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#7d776f] hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSimularPagoQR}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 transition-all"
                >
                  <QrCode className="w-4 h-4" />
                  {isSubmitting
                    ? 'Procesando Pago QR...'
                    : `Simular Pago QR (Bs. ${totalConMora.toFixed(2)})`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

