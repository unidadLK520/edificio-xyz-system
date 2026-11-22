// frontend/components/CobroQrSimuladorModal.tsx
// Modal de cobro con QR real, proyección de deuda y registro de pagos

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  QrCode,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { imagenADataUri } from '@/lib/imagen'

interface PersonaItem {
  idPersona: number
  nombres: string
  apellidos: string
  ciNit?: string
}

interface PagadorItem {
  idPersona: number
  nombre: string
  rol: 'Propietario' | 'Ocupante' | string
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
  idCuenta: number | null
  vencido: boolean
  puedeEditar?: boolean
}

export default function CobroQrSimuladorModal({
  isOpen,
  onClose,
  expensa,
  personasList = [],
  onPaymentSuccess
}: CobroQrSimuladorModalProps) {
  // Estado del QR de cobro
  const [qrInfo, setQrInfo] = useState<QrCobroInfo | null>(null)
  const [cargandoQr, setCargandoQr] = useState(false)
  const [mostrarFormQr, setMostrarFormQr] = useState(false)
  const [archivoQr, setArchivoQr] = useState<File | null>(null)
  const [vigenteHastaInput, setVigenteHastaInput] = useState('')
  const [idCuentaQr, setIdCuentaQr] = useState<number | ''>('')
  const [guardandoQr, setGuardandoQr] = useState(false)
  const [errorQr, setErrorQr] = useState<string | null>(null)
  const [exitoQr, setExitoQr] = useState<string | null>(null)

  // Estado de pagadores cargados desde la API
  const [pagadores, setPagadores] = useState<PagadorItem[]>([])
  const [cargandoPagadores, setCargandoPagadores] = useState(false)
  const [idPersonaSeleccionada, setIdPersonaSeleccionada] = useState<number | ''>('')

  // Estado de cuentas cargadas desde la API
  const [cuentas, setCuentas] = useState<Array<{ idCuenta: number; banco: string; numeroCuenta: string }>>([])
  const [cargandoCuentas, setCargandoCuentas] = useState(false)

  // Estado del comprobante de pago (imagen data URI)
  const [comprobanteDataUri, setComprobanteDataUri] = useState<string | null>(null)
  const [procesandoComprobante, setProcesandoComprobante] = useState(false)
  const [errorComprobante, setErrorComprobante] = useState<string | null>(null)
  const [verComprobanteCompleto, setVerComprobanteCompleto] = useState(false)

  // Estado del formulario de registro de pago
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
      if (data?.idCuenta) {
        setIdCuentaQr(data.idCuenta)
      }
      if (data?.vigenteHasta) {
        setVigenteHastaInput(data.vigenteHasta)
      }
    } catch (err: any) {
      setErrorQr(err.message || 'Error al obtener la información del QR de cobro')
    } finally {
      setCargandoQr(false)
    }
  }, [])

  const fetchCuentas = useCallback(async () => {
    setCargandoCuentas(true)
    try {
      const res = await apiFetch('/api/v1/cuentas-bancarias')
      const json = await res.json().catch(() => ({}))
      const lista = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []
      setCuentas(lista)
    } catch {
      setCuentas([])
    } finally {
      setCargandoCuentas(false)
    }
  }, [])

  const deptoNum =
    expensa?.departamento?.numero ||
    expensa?.departamentoNumero ||
    expensa?.idDepartamento ||
    ''
  const periodoTexto = expensa?.periodo || ''
  const idDepartamento =
    Number(expensa?.idDepartamento || expensa?.departamento?.idDepartamento) || 0
  const saldoPendiente = Number(expensa?.saldoPendiente || 0)

  const capitalPendiente = Number(expensa?.capitalPendiente ?? expensa?.saldoPendiente ?? 0)
  const moraCalculada = Number(expensa?.moraCalculada ?? 0)
  const totalAdeudadoFila =
    expensa?.totalAdeudado !== undefined && expensa?.totalAdeudado !== null
      ? Number(expensa.totalAdeudado)
      : Math.round((capitalPendiente + moraCalculada) * 100) / 100

  // Reiniciar estados al abrir el modal
  useEffect(() => {
    if (isOpen) {
      fetchQr()
      fetchCuentas()
      setMostrarFormQr(false)
      setArchivoQr(null)
      setVigenteHastaInput('')
      setIdCuentaQr('')
      setErrorPago(null)
      setErrorQr(null)
      setExitoQr(null)
      setNroComprobante('')
      setComprobanteDataUri(null)
      setErrorComprobante(null)
      setVerComprobanteCompleto(false)
    }
  }, [isOpen, fetchQr, fetchCuentas])

  // Cargar pagadores desde endpoint oficial de cobro
  useEffect(() => {
    if (!isOpen || !idDepartamento) {
      setPagadores([])
      setIdPersonaSeleccionada('')
      return
    }

    let activo = true
    setCargandoPagadores(true)
    apiFetch(`/api/v1/cobro/pagadores/${idDepartamento}`)
      .then(async (res) => {
        if (!res.ok) return { pagadores: [] }
        return res.json().catch(() => ({ pagadores: [] }))
      })
      .then((data) => {
        if (!activo) return
        const list: PagadorItem[] = Array.isArray(data?.pagadores) ? data.pagadores : []
        setPagadores(list)
        const prop = list.find((p) => p.rol?.toLowerCase() === 'propietario')
        if (prop) {
          setIdPersonaSeleccionada(prop.idPersona)
        } else {
          setIdPersonaSeleccionada('')
        }
      })
      .catch(() => {
        if (activo) {
          setPagadores([])
          setIdPersonaSeleccionada('')
        }
      })
      .finally(() => {
        if (activo) setCargandoPagadores(false)
      })

    return () => {
      activo = false
    }
  }, [isOpen, idDepartamento])

  if (!isOpen || !expensa) return null

  const handleGuardarQr = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!idCuentaQr) {
      setErrorQr('Debes seleccionar la cuenta donde se acreditan los cobros')
      return
    }
    if (!qrInfo?.configurado && !archivoQr) {
      setErrorQr('Debes seleccionar una imagen para el QR de cobro')
      return
    }

    setGuardandoQr(true)
    setErrorQr(null)
    setExitoQr(null)
    try {
      let dataUri: string | undefined = undefined
      if (archivoQr) {
        dataUri = await imagenADataUri(archivoQr, {
          maxLado: 1000,
          tipo: 'image/png'
        })
      }

      const bodyPayload: { imagen?: string; vigenteHasta?: string; idCuenta: number } = {
        idCuenta: Number(idCuentaQr),
        vigenteHasta: vigenteHastaInput || undefined,
      }
      if (dataUri) {
        bodyPayload.imagen = dataUri
      }

      const res = await apiFetch('/api/v1/cobro/qr', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
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

  const motivoDeshabilitadoQr = (() => {
    if (guardandoQr) return 'Guardando QR...'
    if (!idCuentaQr) return 'Falta elegir la cuenta'
    if (!qrInfo?.configurado && !archivoQr) return 'Falta imagen'
    return null
  })()

  const procesarArchivoComprobante = async (file: File) => {
    setErrorComprobante(null)
    setProcesandoComprobante(true)
    try {
      const dataUri = await imagenADataUri(file, {
        maxLado: 1400,
        tipo: 'image/jpeg',
        calidad: 0.8
      })
      setComprobanteDataUri(dataUri)
    } catch (err: any) {
      setErrorComprobante(err.message || 'Error al procesar el comprobante')
      setComprobanteDataUri(null)
    } finally {
      setProcesandoComprobante(false)
    }
  }

  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expensa?.idExpensa) return
    if (!qrInfo?.idCuenta) {
      setErrorPago('El administrador aun no configuro la cuenta del QR')
      return
    }
    if (!idPersonaSeleccionada) {
      setErrorPago('Debes seleccionar a la persona que realiza el pago')
      return
    }
    const nro = nroComprobante.trim()
    if (nro.length > 0 && (nro.length < 4 || nro.length > 100)) {
      setErrorPago('El N.º de comprobante del pago QR debe tener entre 4 y 100 caracteres')
      return
    }
    if (!comprobanteDataUri) {
      setErrorPago('Debes adjuntar el comprobante de pago')
      return
    }

    setGuardandoPago(true)
    setErrorPago(null)
    try {
      const bodyPayload: any = {
        idPersonaPagador: Number(idPersonaSeleccionada),
        montoPagado: capitalPendiente,
        interesPagado: moraCalculada,
        metodoPago: 'QR',
        comprobanteUrl: comprobanteDataUri
      }
      if (nro.length > 0) {
        bodyPayload.referenciaQr = nro
      }

      const res = await apiFetch(`/api/v1/expensas/${expensa.idExpensa}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrorPago(data.message || data.error || 'Error al registrar el pago')
        return
      }

      onClose()
      if (onPaymentSuccess) {
        const pagadorSeleccionado = pagadores.find(
          (p) => p.idPersona === Number(idPersonaSeleccionada)
        )
        onPaymentSuccess({
          pago: data.pago,
          expensa: data.expensa,
          pagadoPor: pagadorSeleccionado ? pagadorSeleccionado.nombre : undefined
        })
      }
    } catch (err: any) {
      setErrorPago(err.message || 'Error de conexión al registrar el pago')
    } finally {
      setGuardandoPago(false)
    }
  }

  const motivoDeshabilitadoPago = (() => {
    if (guardandoPago) return 'Enviando...'
    if (!qrInfo?.idCuenta) return 'El administrador aun no configuro la cuenta del QR'
    if (pagadores.length === 0 && !cargandoPagadores) {
      return 'Este departamento no tiene propietario ni ocupante vigente'
    }
    if (!idPersonaSeleccionada) return 'Selecciona a la persona que realiza el pago'
    const nro = nroComprobante.trim()
    if (nro.length > 0 && nro.length < 4) {
      return 'N.º de comprobante muy corto (mín. 4 caracteres)'
    }
    if (nro.length > 100) {
      return 'N.º de comprobante muy largo (máx. 100 caracteres)'
    }
    if (procesandoComprobante) return 'Procesando comprobante...'
    if (!comprobanteDataUri) return 'Falta subir el comprobante de pago'
    return null
  })()

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

        {/* 1) Bloque superior: Monto de esta expensa */}
        <div className="p-3.5 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-800/60 border border-[#cec8bc] dark:border-slate-700 text-xs space-y-2">
          <span className="font-bold text-[11px] uppercase tracking-wider text-[#5c5750] dark:text-slate-400 block">
            Monto de esta expensa
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700">
              <span className="text-[10px] text-[#7d776f] dark:text-slate-400 block uppercase">
                Capital Pendiente
              </span>
              <span className="text-sm font-bold text-[#262422] dark:text-white">
                Bs. {capitalPendiente.toFixed(2)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700">
              <span className="text-[10px] text-[#7d776f] dark:text-slate-400 block uppercase">
                Mora Calculada
              </span>
              <span
                className={`text-sm font-bold ${
                  moraCalculada > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {moraCalculada > 0 ? `+Bs. ${moraCalculada.toFixed(2)}` : 'Bs. 0.00'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
              <span className="text-[10px] text-emerald-800 dark:text-emerald-300 block uppercase font-bold">
                Total Deuda
              </span>
              <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                Bs. {totalAdeudadoFila.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* 2) Sección: QR de cobro */}
        <div className="p-4 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-800/60 border border-[#cec8bc] dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#262422] dark:text-white flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              QR de cobro vigente
            </span>
            {qrInfo?.configurado && qrInfo?.puedeEditar && !mostrarFormQr && (
              <button
                type="button"
                onClick={() => {
                  setMostrarFormQr(true)
                  if (qrInfo?.idCuenta) setIdCuentaQr(qrInfo.idCuenta)
                  if (qrInfo?.vigenteHasta) setVigenteHastaInput(qrInfo.vigenteHasta)
                }}
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
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-4 rounded-xl mx-auto">
                {qrInfo.imagen ? (
                  <img
                    src={qrInfo.imagen}
                    alt="QR de cobro"
                    className="w-72 h-72 sm:w-80 sm:h-80 object-contain"
                  />
                ) : (
                  <QrCode className="w-72 h-72 sm:w-80 sm:h-80 text-slate-400" />
                )}
              </div>
              {qrInfo.vencido && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>QR vencido</span>
                </div>
              )}
              {qrInfo.vigenteHasta && (
                <p className="text-xs text-[#5c5750] dark:text-slate-300 text-center">
                  Vigente hasta:{' '}
                  <span className="font-mono font-bold text-[#262422] dark:text-white">
                    {qrInfo.vigenteHasta}
                  </span>
                </p>
              )}
              {!qrInfo.idCuenta && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 text-center flex items-center justify-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span>El administrador aun no configuro la cuenta del QR</span>
                </div>
              )}
              <p className="text-xs text-[#7d776f] dark:text-slate-400 text-center">
                Escanea para realizar el cobro por QR de las expensas.
              </p>
            </div>
          ) : !qrInfo?.puedeEditar ? (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 text-center">
              El administrador aun no cargo el QR de cobro.
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 text-center">
              Aun no hay QR de cobro
            </div>
          )}

          {/* Formulario de carga o actualización de QR */}
          {Boolean(qrInfo?.puedeEditar) && (!qrInfo?.configurado || mostrarFormQr) && (
            <form
              onSubmit={handleGuardarQr}
              className="mt-3 pt-3 border-t border-[#cec8bc] dark:border-slate-700 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#262422] dark:text-white mb-1">
                    Imagen del QR (PNG, JPG, WebP) {qrInfo?.configurado ? '(opcional)' : '*'}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setArchivoQr(e.target.files?.[0] || null)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white cursor-pointer"
                    required={!qrInfo?.configurado}
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

              {/* Select obligatorio Cuenta donde se acreditan los cobros */}
              <div>
                <label className="block text-xs font-bold text-[#262422] dark:text-white mb-1">
                  Cuenta donde se acreditan los cobros *
                </label>
                {cargandoCuentas ? (
                  <div className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#7d776f] flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>Cargando cuentas...</span>
                  </div>
                ) : cuentas.length === 0 ? (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200">
                    No hay cuentas registradas en el sistema
                  </div>
                ) : (
                  <select
                    value={idCuentaQr}
                    onChange={(e) =>
                      setIdCuentaQr(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="">Selecciona la cuenta</option>
                    {cuentas.map((c) => (
                      <option key={`cuenta-qr-${c.idCuenta}`} value={c.idCuenta}>
                        {c.banco} - {c.numeroCuenta}
                      </option>
                    ))}
                  </select>
                )}
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
                  disabled={Boolean(motivoDeshabilitadoQr)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {guardandoQr ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando QR...</span>
                    </>
                  ) : motivoDeshabilitadoQr ? (
                    <span>{motivoDeshabilitadoQr}</span>
                  ) : (
                    <span>Guardar QR</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 4) y 6) Sección: Registro de pago o estado saldado */}
        {saldoPendiente > 0 ? (
          <form
            onSubmit={handleRegistrarPago}
            className="p-4 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-800/60 border border-[#cec8bc] dark:border-slate-700 space-y-3"
          >
            <h4 className="font-bold text-xs text-[#262422] dark:text-white">
              Registrar pago recibido por QR
            </h4>

            {!qrInfo?.idCuenta && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>El administrador aun no configuro la cuenta del QR</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Select Persona Pagadora desde /api/v1/cobro/pagadores */}
              <div>
                <label className="block text-xs font-bold text-[#262422] dark:text-white mb-1">
                  Persona que realiza el pago *
                </label>
                {cargandoPagadores ? (
                  <div className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#7d776f] flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>Cargando pagadores...</span>
                  </div>
                ) : pagadores.length === 0 ? (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200">
                    Este departamento no tiene propietario ni ocupante vigente
                  </div>
                ) : (
                  <select
                    value={idPersonaSeleccionada}
                    onChange={(e) =>
                      setIdPersonaSeleccionada(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="">Selecciona una persona</option>
                    {pagadores.map((p) => (
                      <option key={`pagador-${p.idPersona}`} value={p.idPersona}>
                        {p.nombre} ({p.rol})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* N.º de comprobante del pago QR */}
              <div>
                <label className="block text-xs font-bold text-[#262422] dark:text-white mb-1">
                  N.º de comprobante del pago QR (opcional)
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={nroComprobante}
                  onChange={(e) => setNroComprobante(e.target.value)}
                  placeholder="Número o referencia del comprobante"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Subir comprobante de pago (imagen) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#262422] dark:text-white">
                Subir comprobante de pago (imagen) *
              </label>
              {!comprobanteDataUri ? (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0] || null
                      if (f) {
                        await procesarArchivoComprobante(f)
                      }
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white cursor-pointer"
                    required
                  />
                  {procesandoComprobante && (
                    <p className="text-[11px] text-[#7d776f] mt-1 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                      <span>Procesando comprobante...</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Comprobante listo</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setComprobanteDataUri(null)
                        setErrorComprobante(null)
                        setVerComprobanteCompleto(false)
                      }}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                    >
                      Quitar
                    </button>
                  </div>
                  <div
                    onClick={() => setVerComprobanteCompleto(true)}
                    className="w-full flex items-center justify-center p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 cursor-pointer hover:opacity-95 transition-opacity"
                    title="Haz clic para ver en tamaño completo"
                  >
                    <img
                      src={comprobanteDataUri}
                      alt="Vista previa del comprobante"
                      className="max-h-72 w-full object-contain rounded-lg"
                    />
                  </div>
                  <p className="text-[11px] text-[#7d776f] dark:text-slate-400 text-center">
                    Haz clic en la imagen para verla en tamaño completo.
                  </p>
                </div>
              )}
              {errorComprobante && (
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{errorComprobante}</span>
                </div>
              )}
            </div>

            {/* Resumen antes del botón */}
            <div className="p-2.5 rounded-xl bg-[#ede9e1] dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-700 text-xs font-mono text-[#5c5750] dark:text-slate-300">
              Se registrará un pago de Bs. {capitalPendiente.toFixed(2)} + mora Bs. {moraCalculada.toFixed(2)} = Bs. {totalAdeudadoFila.toFixed(2)} en la expensa del Dpto {deptoNum}, período {periodoTexto}
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
                disabled={Boolean(motivoDeshabilitadoPago)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {guardandoPago ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : motivoDeshabilitadoPago ? (
                  <span>{motivoDeshabilitadoPago}</span>
                ) : (
                  <span>Registrar pago de Bs. {totalAdeudadoFila.toFixed(2)}</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300 flex items-center justify-between">
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
        {/* Visor simple en tamaño completo del comprobante */}
        {verComprobanteCompleto && comprobanteDataUri && (
          <div
            onClick={() => setVerComprobanteCompleto(false)}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center"
            >
              <div className="w-full flex justify-between items-center mb-2 px-2 text-white">
                <span className="text-xs font-bold">Comprobante de pago</span>
                <button
                  type="button"
                  onClick={() => setVerComprobanteCompleto(false)}
                  className="p-1 rounded-lg bg-black/50 text-white hover:bg-black/70 cursor-pointer"
                  title="Cerrar visor"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full flex items-center justify-center bg-black/40 rounded-2xl p-2 overflow-auto max-h-[82vh]">
                <img
                  src={comprobanteDataUri}
                  alt="Comprobante completo"
                  className="max-w-full max-h-[80vh] object-contain rounded-xl"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
