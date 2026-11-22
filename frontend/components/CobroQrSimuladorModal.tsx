// frontend/components/CobroQrSimuladorModal.tsx
// Modal de cobro con QR real, proyección de deuda y registro de pagos

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  QrCode,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Upload,
  Calendar,
  Image as ImageIcon
} from 'lucide-react'
import { useFechaSistema } from '@/context/FechaSistemaContext'
import { apiFetch } from '@/lib/api'
import { imagenADataUri } from '@/lib/imagen'
import ProyeccionDeuda from '@/components/expensas/ProyeccionDeuda'

interface PersonaItem {
  idPersona: number
  nombres: string
  apellidos: string
  ciNit?: string
}

interface CobroQrSimuladorModalProps {
  isOpen: boolean
  onClose: () => void
  expensa: any
  personasList?: PersonaItem[]
  onPaymentSuccess?: (reciboInfo?: any) => void
}

interface QrCobroInfo {
  configurado: boolean
  imagen: string | null
  vigenteHasta: string | null
  vencido: boolean
}

export default function CobroQrSimuladorModal({
  isOpen,
  onClose,
  expensa,
  personasList = [],
  onPaymentSuccess
}: CobroQrSimuladorModalProps) {
  const { fechaSistema } = useFechaSistema()

  // Estado del QR de cobro
  const [qrInfo, setQrInfo] = useState<QrCobroInfo | null>(null)
  const [cargandoQr, setCargandoQr] = useState(false)
  const [mostrarFormQr, setMostrarFormQr] = useState(false)
  const [archivoQr, setArchivoQr] = useState<File | null>(null)
  const [vigenteHastaInput, setVigenteHastaInput] = useState('')
  const [guardandoQr, setGuardandoQr] = useState(false)
  const [errorQr, setErrorQr] = useState<string | null>(null)
  const [exitoQr, setExitoQr] = useState<string | null>(null)

  // Estado del formulario de registro de pago
  const [idPersonaSeleccionada, setIdPersonaSeleccionada] = useState<number | ''>('')
  const [nroComprobante, setNroComprobante] = useState('')
  const [guardandoPago, setGuardandoPago] = useState(false)
  const [errorPago, setErrorPago] = useState<string | null>(null)

  const fetchQr = useCallback(async () => {
    setCargandoQr(true)
    setErrorQr(null)
    try {
      const res = await apiFetch('/api/v1/cobro/qr')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Error al consultar el QR de cobro')
      }
      setQrInfo(data)
    } catch (err: any) {
      setErrorQr(err.message || 'Error al obtener la información del QR de cobro')
    } finally {
      setCargandoQr(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchQr()
      setMostrarFormQr(false)
      setArchivoQr(null)
      setVigenteHastaInput('')
      setErrorPago(null)
      setErrorQr(null)
      setExitoQr(null)
      setNroComprobante('')
    }
  }, [isOpen, fetchQr])

  // Inicializar la persona pagadora con el propietario de la expensa si existe
  useEffect(() => {
    if (expensa && personasList.length > 0) {
      const propId =
        expensa.departamento?.idPropietario ||
        expensa.departamento?.propietario?.idPersona ||
        expensa.idPersona ||
        expensa.idPersonaPagador ||
        null
      if (propId) {
        const encontrada = personasList.find((p) => p.idPersona === Number(propId))
        setIdPersonaSeleccionada(encontrada ? encontrada.idPersona : '')
      } else {
        setIdPersonaSeleccionada('')
      }
    } else {
      setIdPersonaSeleccionada('')
    }
  }, [expensa, personasList])

  if (!isOpen || !expensa) return null

  const deptoNum =
    expensa.departamento?.numero ||
    expensa.departamentoNumero ||
    expensa.idDepartamento ||
    ''
  const periodoTexto = expensa.periodo || ''
  const idDepartamento =
    Number(expensa.idDepartamento || expensa.departamento?.idDepartamento) || 0
  const saldoPendiente = Number(expensa.saldoPendiente || 0)

  const handleGuardarQr = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!archivoQr) {
      setErrorQr('Debes seleccionar una imagen para el QR de cobro')
      return
    }

    setGuardandoQr(true)
    setErrorQr(null)
    setExitoQr(null)
    try {
      const dataUri = await imagenADataUri(archivoQr, {
        maxLado: 1000,
        tipo: 'image/png'
      })

      const res = await apiFetch('/api/v1/cobro/qr', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagen: dataUri,
          vigenteHasta: vigenteHastaInput || undefined
        })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Error al actualizar el QR de cobro')
      }

      setExitoQr(data.message || 'QR de cobro guardado correctamente')
      setArchivoQr(null)
      setVigenteHastaInput('')
      setMostrarFormQr(false)
      await fetchQr()
    } catch (err: any) {
      setErrorQr(err.message || 'Error al guardar el QR de cobro')
    } finally {
      setGuardandoQr(false)
    }
  }

  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expensa?.idExpensa) return
    if (!idPersonaSeleccionada) {
      setErrorPago('Debes seleccionar a la persona que realiza el pago')
      return
    }
    const nro = nroComprobante.trim()
    if (nro.length < 4 || nro.length > 100) {
      setErrorPago('El N.º de comprobante del pago QR debe tener entre 4 y 100 caracteres')
      return
    }

    setGuardandoPago(true)
    setErrorPago(null)
    try {
      const capitalPendiente = Number(expensa.capitalPendiente ?? expensa.saldoPendiente ?? 0)
      const moraCalculada = Number(expensa.moraCalculada ?? 0)

      const res = await apiFetch(`/api/v1/expensas/${expensa.idExpensa}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPersonaPagador: Number(idPersonaSeleccionada),
          montoPagado: capitalPendiente,
          interesPagado: moraCalculada,
          metodoPago: 'QR',
          referenciaQr: nro
        })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Error al registrar el pago')
      }

      if (onPaymentSuccess) {
        onPaymentSuccess(data.pago || data)
      }
      onClose()
    } catch (err: any) {
      setErrorPago(err.message || 'Error de conexión al registrar el pago')
    } finally {
      setGuardandoPago(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-700/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                Dpto {deptoNum} - {periodoTexto}
              </h3>
              <p className="text-xs text-[#7d776f] dark:text-slate-400">
                Gestión de cobro con QR y liquidación
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-[#7d776f] hover:text-[#262422] dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sección: QR de cobro */}
        <div className="p-4 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-800/60 border border-[#cec8bc] dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#262422] dark:text-white flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              QR de cobro vigente
            </span>
            {qrInfo?.configurado && !mostrarFormQr && (
              <button
                type="button"
                onClick={() => setMostrarFormQr(true)}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Cambiar QR
              </button>
            )}
          </div>

          {cargandoQr ? (
            <div className="p-4 flex items-center justify-center gap-2 text-xs text-[#7d776f]">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Cargando QR de cobro...</span>
            </div>
          ) : qrInfo?.configurado ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="p-2.5 bg-white rounded-2xl border border-[#cec8bc] shadow-inner shrink-0">
                {qrInfo.imagen ? (
                  <img
                    src={qrInfo.imagen}
                    alt="QR de cobro"
                    className="w-36 h-36 object-contain rounded-xl"
                  />
                ) : (
                  <QrCode className="w-36 h-36 text-slate-400" />
                )}
              </div>
              <div className="text-xs space-y-1.5 flex-1 text-center sm:text-left">
                {qrInfo.vencido ? (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>QR vencido</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>QR activo</span>
                  </div>
                )}
                {qrInfo.vigenteHasta && (
                  <p className="text-[#5c5750] dark:text-slate-300">
                    Vigente hasta:{' '}
                    <span className="font-mono font-bold text-[#262422] dark:text-white">
                      {qrInfo.vigenteHasta}
                    </span>
                  </p>
                )}
                <p className="text-[11px] text-[#7d776f] dark:text-slate-400">
                  Escanea para realizar el cobro por QR de las expensas.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
              Aun no hay QR de cobro
            </div>
          )}

          {/* Formulario de carga o actualización de QR */}
          {(!qrInfo?.configurado || mostrarFormQr) && (
            <form
              onSubmit={handleGuardarQr}
              className="mt-3 pt-3 border-t border-[#cec8bc] dark:border-slate-700 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#262422] dark:text-white mb-1">
                    Imagen del QR (PNG, JPG, WebP) *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setArchivoQr(e.target.files?.[0] || null)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white cursor-pointer"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#262422] dark:text-white mb-1">
                    Vigente hasta (opcional)
                  </label>
                  <input
                    type="date"
                    value={vigenteHastaInput}
                    onChange={(e) => setVigenteHastaInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {errorQr && (
                <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{errorQr}</span>
                </div>
              )}

              {exitoQr && (
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span>{exitoQr}</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                {mostrarFormQr && qrInfo?.configurado && (
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFormQr(false)
                      setErrorQr(null)
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={guardandoQr || !archivoQr}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {guardandoQr ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando QR...</span>
                    </>
                  ) : (
                    <span>Guardar QR</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sección: Proyección de deuda a una fecha */}
        {idDepartamento > 0 && (
          <ProyeccionDeuda
            idDepartamento={idDepartamento}
            fechaInicial={fechaSistema}
            fechaVencimientoRef={expensa.fechaVencimiento}
          />
        )}

        {/* Sección: Registro de pago o estado saldado */}
        {saldoPendiente > 0 ? (
          <form
            onSubmit={handleRegistrarPago}
            className="p-4 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-800/60 border border-[#cec8bc] dark:border-slate-700 space-y-3"
          >
            <h4 className="font-bold text-xs text-[#262422] dark:text-white">
              Registrar pago recibido por QR
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#262422] dark:text-white mb-1">
                  Persona que realiza el pago *
                </label>
                <select
                  value={idPersonaSeleccionada}
                  onChange={(e) =>
                    setIdPersonaSeleccionada(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Selecciona una persona</option>
                  {personasList.map((p) => (
                    <option key={`persona-${p.idPersona}`} value={p.idPersona}>
                      {p.nombres} {p.apellidos} {p.ciNit ? `(CI: ${p.ciNit})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#262422] dark:text-white mb-1">
                  N.º de comprobante del pago QR *
                </label>
                <input
                  type="text"
                  minLength={4}
                  maxLength={100}
                  value={nroComprobante}
                  onChange={(e) => setNroComprobante(e.target.value)}
                  placeholder="Número o referencia del comprobante"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            {errorPago && (
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                <span>{errorPago}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#cec8bc] dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#7d776f] hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={
                  guardandoPago ||
                  !idPersonaSeleccionada ||
                  nroComprobante.trim().length < 4 ||
                  nroComprobante.trim().length > 100
                }
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 transition-all"
              >
                {guardandoPago ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Registrando pago...</span>
                  </>
                ) : (
                  <span>Registrar pago</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Expensa saldada</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
