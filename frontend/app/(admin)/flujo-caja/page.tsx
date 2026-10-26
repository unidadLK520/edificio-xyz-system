// frontend/app/(admin)/flujo-caja/page.tsx
// Módulo de Flujo de Caja y Cuentas Bancarias (Edificio XYZ)

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Wallet,
  Landmark,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Scale,
  Calendar,
  X,
  Loader2,
  Trash2,
  Edit2,
  Eye,
  Building,
  CreditCard,
  Layers,
  FileText
} from 'lucide-react'
import { fechaSolo } from '@/lib/fecha'
import {
  cajaService,
  cuentasBancariasService,
  movimientosBancariosService,
  puedeEscribirFinanzas,
  extractErrorMessage,
  CajaSaldoResumen,
  MovimientoCajaItem,
  CuentaBancariaItem,
  MovimientoBancarioItem
} from '@/lib/services/finanzas.service'

export default function CajaYBancosPage() {
  const [tabActiva, setTabActiva] = useState<'caja' | 'bancos'>('caja')
  const [loading, setLoading] = useState<boolean>(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Rol del usuario actual para MAPA_PERMISOS_FINANZAS
  const [rolUsuario, setRolUsuario] = useState<string>('Administrador')
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rol = localStorage.getItem('user_role') || 'Administrador'
      setRolUsuario(rol)
    }
  }, [])

  const puedeEscribirCaja = useMemo(() => puedeEscribirFinanzas('caja', rolUsuario), [rolUsuario])
  const puedeEscribirCuentas = useMemo(() => puedeEscribirFinanzas('cuentas_bancarias', rolUsuario), [rolUsuario])
  const puedeEscribirMovimientos = useMemo(() => puedeEscribirFinanzas('movimientos_bancarios', rolUsuario), [rolUsuario])

  // ----------------------------------------------------
  // ESTADO DE CAJA CHICA
  // ----------------------------------------------------
  const [movimientosCaja, setMovimientosCaja] = useState<MovimientoCajaItem[]>([])
  const [saldoCajaResumen, setSaldoCajaResumen] = useState<CajaSaldoResumen | null>(null)
  const [filtroTipoCaja, setFiltroTipoCaja] = useState<'Todos' | 'Ingreso' | 'Egreso'>('Todos')
  const [filtroPeriodoCaja, setFiltroPeriodoCaja] = useState<'todos' | 'mes_actual' | 'mes_anterior'>('mes_actual')
  const [searchCaja, setSearchCaja] = useState('')

  // Formulario nuevo movimiento de caja
  const [isModalCajaOpen, setIsModalCajaOpen] = useState(false)
  const [formCajaTipo, setFormCajaTipo] = useState<'Ingreso' | 'Egreso'>('Egreso')
  const [formCajaMonto, setFormCajaMonto] = useState<number | ''>('')
  const [formCajaConcepto, setFormCajaConcepto] = useState('')
  const [formCajaFecha, setFormCajaFecha] = useState(fechaSolo(new Date()))
  const [formCajaError, setFormCajaError] = useState<string | null>(null)
  const [isSubmittingCaja, setIsSubmittingCaja] = useState(false)

  // Modal anular caja
  const [movimientoParaAnular, setMovimientoParaAnular] = useState<MovimientoCajaItem | null>(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [anulandoCaja, setAnulandoCaja] = useState(false)
  const [modalAnulacionError, setModalAnulacionError] = useState<string | null>(null)

  // ----------------------------------------------------
  // ESTADO DE BANCOS (Cuentas y Movimientos Bancarios)
  // ----------------------------------------------------
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancariaItem[]>([])
  const [cuentaSeleccionadaId, setCuentaSeleccionadaId] = useState<number | null>(null)
  const [saldoCuentaSeleccionada, setSaldoCuentaSeleccionada] = useState<{
    idCuenta: number
    banco: string
    numeroCuenta: string
    saldoInicial: number
    totalDepositos: number
    totalRetiros: number
    saldoFinal: number
    saldoDisponibleActual: number
    periodo: { desde: string | null; hasta: string | null }
  } | null>(null)
  const [loadingSaldoCuenta, setLoadingSaldoCuenta] = useState(false)

  const [movimientosBanco, setMovimientosBanco] = useState<MovimientoBancarioItem[]>([])
  const [filtroTipoBanco, setFiltroTipoBanco] = useState<'Todos' | 'Deposito' | 'Retiro'>('Todos')
  const [filtroEstadoBanco, setFiltroEstadoBanco] = useState<'Todos' | 'Pendiente' | 'Conciliado' | 'Discrepancia'>('Todos')
  const [searchBanco, setSearchBanco] = useState('')
  const [loadingMovBancos, setLoadingMovBancos] = useState(false)

  // Modal Detalle Movimiento Bancario (GET /api/v1/movimientos-bancarios/:id)
  const [isModalDetalleMovOpen, setIsModalDetalleMovOpen] = useState(false)
  const [movBancoDetalle, setMovBancoDetalle] = useState<MovimientoBancarioItem | null>(null)
  const [loadingDetalleMov, setLoadingDetalleMov] = useState(false)

  // Modal Cuenta Bancaria (Crear / Editar)
  const [isModalCuentaOpen, setIsModalCuentaOpen] = useState(false)
  const [cuentaEnEdicion, setCuentaEnEdicion] = useState<CuentaBancariaItem | null>(null)
  const [formCuentaBanco, setFormCuentaBanco] = useState('')
  const [formCuentaNumero, setFormCuentaNumero] = useState('')
  const [formCuentaTipo, setFormCuentaTipo] = useState('Corriente')
  const [formCuentaSaldoInicial, setFormCuentaSaldoInicial] = useState<number | ''>(0)
  const [formCuentaError, setFormCuentaError] = useState<string | null>(null)
  const [isSubmittingCuenta, setIsSubmittingCuenta] = useState(false)

  // Modal Movimiento Bancario (Crear / Editar)
  const [isModalMovBancoOpen, setIsModalMovBancoOpen] = useState(false)
  const [movBancoEnEdicion, setMovBancoEnEdicion] = useState<MovimientoBancarioItem | null>(null)
  const [formMovBancoCuentaId, setFormMovBancoCuentaId] = useState<number | ''>('')
  const [formMovBancoTipo, setFormMovBancoTipo] = useState<'Deposito' | 'Retiro'>('Deposito')
  const [formMovBancoMonto, setFormMovBancoMonto] = useState<number | ''>('')
  const [formMovBancoConcepto, setFormMovBancoConcepto] = useState('')
  const [formMovBancoReferencia, setFormMovBancoReferencia] = useState('')
  const [formMovBancoFecha, setFormMovBancoFecha] = useState(fechaSolo(new Date()))
  const [formMovBancoError, setFormMovBancoError] = useState<string | null>(null)
  const [isSubmittingMovBanco, setIsSubmittingMovBanco] = useState(false)

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text })
    setTimeout(() => setFeedbackMsg(null), 5000)
  }

  // Cargar datos de caja y cuentas bancarias
  const fetchData = useCallback(async () => {
    setLoading(true)
    setApiError(null)
    try {
      const [resSaldo, resMovimientos, resCuentas] = await Promise.allSettled([
        cajaService.getSaldo(),
        cajaService.getMovimientos({ limit: 200 }),
        cuentasBancariasService.getCuentas()
      ])

      const errores: string[] = []

      if (resSaldo.status === 'fulfilled') {
        setSaldoCajaResumen(resSaldo.value)
      } else {
        errores.push(`Saldo de caja: ${extractErrorMessage(resSaldo.reason)}`)
      }

      if (resMovimientos.status === 'fulfilled') {
        setMovimientosCaja(resMovimientos.value.items)
      } else {
        errores.push(`Movimientos de caja: ${extractErrorMessage(resMovimientos.reason)}`)
      }

      if (resCuentas.status === 'fulfilled') {
        setCuentasBancarias(resCuentas.value)
        if (resCuentas.value.length > 0 && cuentaSeleccionadaId === null) {
          setCuentaSeleccionadaId(resCuentas.value[0].idCuenta)
        }
      } else {
        errores.push(`Cuentas bancarias: ${extractErrorMessage(resCuentas.reason)}`)
      }

      if (errores.length > 0 && resMovimientos.status === 'rejected' && resCuentas.status === 'rejected') {
        setApiError(errores.join(' | '))
      }
    } catch (err: unknown) {
      setApiError(extractErrorMessage(err, 'Error al conectar con la API financiera.'))
    } finally {
      setLoading(false)
    }
  }, [cuentaSeleccionadaId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Cargar movimientos bancarios y saldo recalculado cuando cambia la cuenta seleccionada o filtros
  const fetchMovimientosBancarios = useCallback(async () => {
    if (!cuentaSeleccionadaId) {
      setMovimientosBanco([])
      setSaldoCuentaSeleccionada(null)
      return
    }
    setLoadingMovBancos(true)
    setLoadingSaldoCuenta(true)
    try {
      const [resMovs, resSaldo] = await Promise.allSettled([
        movimientosBancariosService.getMovimientos({
          idCuenta: cuentaSeleccionadaId,
          tipo: filtroTipoBanco === 'Todos' ? undefined : filtroTipoBanco,
          estado: filtroEstadoBanco === 'Todos' ? undefined : filtroEstadoBanco,
          limit: 100
        }),
        cuentasBancariasService.getSaldo(cuentaSeleccionadaId)
      ])

      if (resMovs.status === 'fulfilled') {
        setMovimientosBanco(resMovs.value.items)
      } else {
        showNotification('error', `Error al cargar movimientos bancarios: ${extractErrorMessage(resMovs.reason)}`)
      }

      if (resSaldo.status === 'fulfilled') {
        setSaldoCuentaSeleccionada(resSaldo.value)
      }
    } catch (err: unknown) {
      showNotification('error', `Error en la cuenta bancaria: ${extractErrorMessage(err)}`)
    } finally {
      setLoadingMovBancos(false)
      setLoadingSaldoCuenta(false)
    }
  }, [cuentaSeleccionadaId, filtroTipoBanco, filtroEstadoBanco])

  const handleVerDetalleMovBanco = async (idMov: number) => {
    setLoadingDetalleMov(true)
    setIsModalDetalleMovOpen(true)
    try {
      const detalle = await movimientosBancariosService.getDetalle(idMov)
      setMovBancoDetalle(detalle)
    } catch (err: unknown) {
      showNotification('error', extractErrorMessage(err, 'Error al consultar detalle del movimiento'))
      setIsModalDetalleMovOpen(false)
    } finally {
      setLoadingDetalleMov(false)
    }
  }

  useEffect(() => {
    if (tabActiva === 'bancos') {
      fetchMovimientosBancarios()
    }
  }, [tabActiva, fetchMovimientosBancarios])

  // Filtrado de movimientos de caja en el frontend
  const movimientosCajaFiltrados = useMemo(() => {
    return movimientosCaja.filter((m) => {
      const matchTipo = filtroTipoCaja === 'Todos' || m.tipo === filtroTipoCaja
      const usuarioReg = m.usuarioRegistro?.nombreUsuario || ''
      const matchSearch =
        m.concepto.toLowerCase().includes(searchCaja.toLowerCase()) ||
        usuarioReg.toLowerCase().includes(searchCaja.toLowerCase())

      let matchPeriodo = true
      const hoy = new Date()
      const fechaMov = new Date(m.fecha)

      if (filtroPeriodoCaja === 'mes_actual') {
        matchPeriodo =
          fechaMov.getFullYear() === hoy.getFullYear() &&
          fechaMov.getMonth() === hoy.getMonth()
      } else if (filtroPeriodoCaja === 'mes_anterior') {
        const mesAnt = hoy.getMonth() === 0 ? 11 : hoy.getMonth() - 1
        const anioAnt = hoy.getMonth() === 0 ? hoy.getFullYear() - 1 : hoy.getFullYear()
        matchPeriodo =
          fechaMov.getFullYear() === anioAnt && fechaMov.getMonth() === mesAnt
      }

      return matchTipo && matchSearch && matchPeriodo
    })
  }, [movimientosCaja, filtroTipoCaja, filtroPeriodoCaja, searchCaja])

  // Filtrado de movimientos bancarios por texto de búsqueda
  const movimientosBancoFiltrados = useMemo(() => {
    if (!searchBanco.trim()) return movimientosBanco
    const query = searchBanco.toLowerCase()
    return movimientosBanco.filter(
      (m) =>
        m.concepto.toLowerCase().includes(query) ||
        (m.referencia && m.referencia.toLowerCase().includes(query))
    )
  }, [movimientosBanco, searchBanco])

  // Saldo bancario total
  const saldoBancosTotal = useMemo(() => {
    return cuentasBancarias.reduce((acc, c) => acc + (Number(c.saldoActual) || 0), 0)
  }, [cuentasBancarias])

  // Registrar movimiento de caja chica
  const handleGuardarCaja = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormCajaError(null)

    const montoNum = Number(formCajaMonto)
    if (!montoNum || montoNum <= 0) {
      setFormCajaError('El monto debe ser un número mayor a cero.')
      return
    }
    if (!formCajaConcepto.trim()) {
      setFormCajaError('El concepto es obligatorio.')
      return
    }
    if (!formCajaFecha) {
      setFormCajaError('La fecha es obligatoria.')
      return
    }

    setIsSubmittingCaja(true)
    try {
      await cajaService.registrar({
        tipo: formCajaTipo,
        monto: montoNum,
        concepto: formCajaConcepto.trim(),
        fecha: new Date(formCajaFecha).toISOString()
      })

      showNotification('success', 'Movimiento de caja registrado exitosamente.')
      setIsModalCajaOpen(false)
      setFormCajaConcepto('')
      setFormCajaMonto('')
      await fetchData()
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Error al registrar movimiento en caja.')
      setFormCajaError(msg)
      showNotification('error', msg)
    } finally {
      setIsSubmittingCaja(false)
    }
  }

  // Anular movimiento de caja con motivo obligatorio
  const handleConfirmarAnulacionCaja = async () => {
    if (!movimientoParaAnular) return
    setModalAnulacionError(null)

    if (!motivoAnulacion.trim()) {
      setModalAnulacionError('El motivo de anulación es obligatorio.')
      return
    }

    setAnulandoCaja(true)
    try {
      await cajaService.anular(movimientoParaAnular.idMovimientoCaja, motivoAnulacion.trim())
      showNotification('success', 'Movimiento de caja anulado correctamente.')
      setMovimientoParaAnular(null)
      setMotivoAnulacion('')
      await fetchData()
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Error al anular movimiento de caja.')
      setModalAnulacionError(msg)
      showNotification('error', msg)
    } finally {
      setAnulandoCaja(false)
    }
  }

  // Guardar Cuenta Bancaria (Crear o Editar)
  const handleGuardarCuenta = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormCuentaError(null)

    if (!formCuentaBanco.trim()) {
      setFormCuentaError('El nombre del banco es obligatorio.')
      return
    }
    if (!formCuentaNumero.trim()) {
      setFormCuentaError('El número de cuenta es obligatorio.')
      return
    }

    setIsSubmittingCuenta(true)
    try {
      if (cuentaEnEdicion) {
        await cuentasBancariasService.actualizar(cuentaEnEdicion.idCuenta, {
          banco: formCuentaBanco.trim(),
          numeroCuenta: formCuentaNumero.trim(),
          tipoCuenta: formCuentaTipo.trim(),
          saldoInicial: Number(formCuentaSaldoInicial) || 0
        })
        showNotification('success', 'Cuenta bancaria actualizada correctamente.')
      } else {
        await cuentasBancariasService.crear({
          banco: formCuentaBanco.trim(),
          numeroCuenta: formCuentaNumero.trim(),
          tipoCuenta: formCuentaTipo.trim(),
          saldoInicial: Number(formCuentaSaldoInicial) || 0
        })
        showNotification('success', 'Cuenta bancaria registrada correctamente.')
      }

      setIsModalCuentaOpen(false)
      setCuentaEnEdicion(null)
      setFormCuentaBanco('')
      setFormCuentaNumero('')
      setFormCuentaSaldoInicial(0)
      await fetchData()
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Error al guardar la cuenta bancaria.')
      setFormCuentaError(msg)
      showNotification('error', msg)
    } finally {
      setIsSubmittingCuenta(false)
    }
  }

  // Guardar Movimiento Bancario (Crear o Editar)
  const handleGuardarMovBanco = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormMovBancoError(null)

    const cuentaId = Number(formMovBancoCuentaId) || cuentaSeleccionadaId
    if (!cuentaId) {
      setFormMovBancoError('Debe seleccionar una cuenta bancaria.')
      return
    }
    const montoNum = Number(formMovBancoMonto)
    if (!montoNum || montoNum <= 0) {
      setFormMovBancoError('El monto debe ser mayor a cero.')
      return
    }
    if (!formMovBancoConcepto.trim()) {
      setFormMovBancoError('El concepto es obligatorio.')
      return
    }

    setIsSubmittingMovBanco(true)
    try {
      if (movBancoEnEdicion) {
        await movimientosBancariosService.actualizar(movBancoEnEdicion.idMovBancario, {
          monto: montoNum,
          concepto: formMovBancoConcepto.trim(),
          referencia: formMovBancoReferencia.trim() || undefined,
          fecha: new Date(formMovBancoFecha).toISOString()
        })
        showNotification('success', 'Movimiento bancario actualizado correctamente.')
      } else {
        await movimientosBancariosService.registrar({
          idCuenta: cuentaId,
          tipo: formMovBancoTipo,
          monto: montoNum,
          concepto: formMovBancoConcepto.trim(),
          referencia: formMovBancoReferencia.trim() || undefined,
          fecha: new Date(formMovBancoFecha).toISOString()
        })
        showNotification('success', 'Movimiento bancario registrado correctamente.')
      }

      setIsModalMovBancoOpen(false)
      setMovBancoEnEdicion(null)
      setFormMovBancoMonto('')
      setFormMovBancoConcepto('')
      setFormMovBancoReferencia('')
      await fetchMovimientosBancarios()
      await fetchData()
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Error al guardar movimiento bancario.')
      setFormMovBancoError(msg)
      showNotification('error', msg)
    } finally {
      setIsSubmittingMovBanco(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* TOAST FEEDBACK */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 shadow-lg border animate-in slide-in-from-top-2 duration-300 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs p-1 opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER DEL MÓDULO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-400 text-xs font-semibold mb-2">
            <Scale className="w-3.5 h-3.5" />
            Tesorería y Flujo Financiero &bull; US2.3
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Flujo de Caja y Bancos
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Gestión de disponibilidad líquida, arqueos de caja chica física y movimientos de cuentas bancarias.
          </p>
        </div>

        {/* TABS PRINCIPALES */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#dfd9ce] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setTabActiva('caja')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tabActiva === 'caja'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-[#5c5750] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Caja Chica</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('bancos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tabActiva === 'bancos'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-[#5c5750] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Cuentas Bancarias</span>
          </button>
        </div>
      </div>

      {/* ERROR CON REINTENTAR SI LA API FALLA */}
      {apiError && !loading && movimientosCaja.length === 0 && cuentasBancarias.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 max-w-xl mx-auto space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Servicio de Caja y Bancos no disponible
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {apiError}
            </p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer shadow-md shadow-amber-600/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>
        </div>
      ) : (
        <>
          {/* VISTA 1: CAJA CHICA */}
          {tabActiva === 'caja' && (
            <div className="space-y-6">
              {/* KPIS DE CAJA CHICA (Desde /api/v1/caja/saldo oficial) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400">
                    <span>Saldo Inicial</span>
                    <Layers className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-200 font-mono">
                    Bs. {(saldoCajaResumen?.saldoInicial ?? 0).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-[#7d776f]">Apertura de período</div>
                </div>

                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400">
                    <span>Total Ingresos</span>
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                    Bs. {(saldoCajaResumen?.totalIngresos ?? 0).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-[#7d776f]">Efectivo ingresado</div>
                </div>

                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400">
                    <span>Total Egresos</span>
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 font-mono">
                    Bs. {(saldoCajaResumen?.totalEgresos ?? 0).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-[#7d776f]">Gastos menores en efectivo</div>
                </div>

                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400">
                    <span>Disponible Actual</span>
                    <Wallet className="w-4 h-4 text-blue-600" />
                  </div>
                  <div
                    className={`text-xl sm:text-2xl font-black font-mono ${
                      (saldoCajaResumen?.saldoDisponibleActual ?? 0) >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    Bs. {(saldoCajaResumen?.saldoDisponibleActual ?? 0).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-[#7d776f]">En caja física</div>
                </div>
              </div>

              {/* BARRA DE FILTROS Y BOTÓN NUEVO */}
              <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Selector tipo */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800">
                    {(['Todos', 'Ingreso', 'Egreso'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFiltroTipoCaja(t)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          filtroTipoCaja === t
                            ? 'bg-blue-700 text-white'
                            : 'text-[#5c5750] dark:text-slate-400'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Selector período */}
                  <div className="flex items-center gap-1 text-xs">
                    {(['todos', 'mes_actual', 'mes_anterior'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFiltroPeriodoCaja(p)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                          filtroPeriodoCaja === p
                            ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-300'
                            : 'text-[#7d776f]'
                        }`}
                      >
                        {p === 'todos' ? 'Histórico' : p === 'mes_actual' ? 'Mes Actual' : 'Mes Anterior'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-[#7d776f] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por concepto o usuario..."
                      value={searchCaja}
                      onChange={(e) => setSearchCaja(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs"
                    />
                  </div>

                  {puedeEscribirCaja && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormCajaError(null)
                        setIsModalCajaOpen(true)
                      }}
                      className="px-3.5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Movimiento de Caja</span>
                    </button>
                  )}
                </div>
              </div>

              {/* TABLA DE MOVIMIENTOS DE CAJA */}
              <div className="rounded-2xl border border-[#cec8bc] dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#e3ded4] dark:bg-slate-950/60 font-bold uppercase text-[11px] text-[#5c5750]">
                        <th className="py-3 px-4">Tipo</th>
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-4">Concepto / Detalle</th>
                        <th className="py-3 px-4">Registrado Por</th>
                        <th className="py-3 px-4">Monto (Bs.)</th>
                        <th className="py-3 px-4">Estado</th>
                        {puedeEscribirCaja && <th className="py-3 px-4 text-right">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#cec8bc]/60 dark:divide-slate-800">
                      {loading ? (
                        <tr>
                          <td colSpan={puedeEscribirCaja ? 7 : 6} className="py-8 text-center text-[#7d776f]">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-700" />
                          </td>
                        </tr>
                      ) : movimientosCajaFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={puedeEscribirCaja ? 7 : 6} className="py-8 text-center text-[#7d776f]">
                            No hay movimientos de caja registrados para este período.
                          </td>
                        </tr>
                      ) : (
                        movimientosCajaFiltrados.map((m) => {
                          const esIngreso = m.tipo === 'Ingreso'
                          return (
                            <tr
                              key={m.idMovimientoCaja}
                              className={`hover:bg-[#e6e1d6]/50 dark:hover:bg-slate-800/40 transition-colors ${
                                m.anulado ? 'opacity-50 line-through' : ''
                              }`}
                            >
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                    esIngreso
                                      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300'
                                  }`}
                                >
                                  {esIngreso ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                  {m.tipo}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono">{fechaSolo(m.fecha)}</td>
                              <td className="py-3 px-4 font-medium max-w-xs" title={m.concepto}>
                                <div>{m.concepto}</div>
                                {m.anulado && m.motivoAnulacion && (
                                  <span className="block text-[10px] text-rose-600 no-underline font-normal mt-0.5">
                                    Motivo anulación: {m.motivoAnulacion}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-[#7d776f]">
                                {m.usuarioRegistro?.nombreUsuario || 'Sistema'}
                              </td>
                              <td
                                className={`py-3 px-4 font-mono font-bold ${
                                  esIngreso ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                                }`}
                              >
                                {esIngreso ? '+' : '-'} Bs. {Number(m.monto).toFixed(2)}
                              </td>
                              <td className="py-3 px-4">
                                {m.anulado ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-200">
                                    Anulado
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                                    Vigente
                                  </span>
                                )}
                              </td>
                              {puedeEscribirCaja && (
                                <td className="py-3 px-4 text-right">
                                  {!m.anulado && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMovimientoParaAnular(m)
                                        setMotivoAnulacion('')
                                        setModalAnulacionError(null)
                                      }}
                                      className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                      title="Anular con motivo obligatorio"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2: CUENTAS BANCARIAS Y MOVIMIENTOS BANCARIOS */}
          {tabActiva === 'bancos' && (
            <div className="space-y-6">
              {/* SALDO BANCARIO TOTAL Y BOTONES */}
              <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-[#7d776f]">Saldo Bancario Consolidado</div>
                  <div className="text-2xl sm:text-3xl font-black text-blue-700 dark:text-blue-400 font-mono mt-1">
                    Bs. {saldoBancosTotal.toFixed(2)}
                  </div>
                  <div className="text-xs text-[#5c5750] mt-0.5">
                    Total en {cuentasBancarias.length} cuenta(s) bancaria(s) institucional(es)
                  </div>
                </div>

                {puedeEscribirCuentas && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCuentaEnEdicion(null)
                        setFormCuentaBanco('')
                        setFormCuentaNumero('')
                        setFormCuentaTipo('Corriente')
                        setFormCuentaSaldoInicial(0)
                        setFormCuentaError(null)
                        setIsModalCuentaOpen(true)
                      }}
                      className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nueva Cuenta Bancaria</span>
                    </button>
                  </div>
                )}
              </div>

              {/* LISTADO DE CUENTAS BANCARIAS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cuentasBancarias.length === 0 ? (
                  <div className="col-span-full p-8 text-center rounded-2xl bg-white/50 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#7d776f]">
                    No existen cuentas bancarias registradas en el sistema.
                  </div>
                ) : (
                  cuentasBancarias.map((cuenta) => {
                    const isSelected = cuenta.idCuenta === cuentaSeleccionadaId
                    return (
                      <div
                        key={cuenta.idCuenta}
                        onClick={() => setCuentaSeleccionadaId(cuenta.idCuenta)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                            : 'bg-white/70 dark:bg-slate-900/70 border-[#cec8bc] dark:border-slate-800 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-[#262422] dark:text-white flex items-center gap-2">
                            <Landmark className="w-4 h-4 text-blue-600" />
                            {cuenta.banco}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-200">
                            {cuenta.tipoCuenta || 'Corriente'}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-[#7d776f]">
                          Nro: {cuenta.numeroCuenta}
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-[#cec8bc]/50 text-xs">
                          <span className="font-semibold text-[#5c5750]">Saldo Actual:</span>
                          <span className="font-mono font-bold text-base text-emerald-700 dark:text-emerald-400">
                            Bs. {Number(cuenta.saldoActual || 0).toFixed(2)}
                          </span>
                        </div>
                        {puedeEscribirCuentas && (
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setCuentaEnEdicion(cuenta)
                                setFormCuentaBanco(cuenta.banco)
                                setFormCuentaNumero(cuenta.numeroCuenta)
                                setFormCuentaTipo(cuenta.tipoCuenta || 'Corriente')
                                setFormCuentaSaldoInicial(cuenta.saldoInicial)
                                setFormCuentaError(null)
                                setIsModalCuentaOpen(true)
                              }}
                              className="text-xs text-blue-700 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Edit2 className="w-3 h-3" /> Editar
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* SECCIÓN MOVIMIENTOS BANCARIOS DE LA CUENTA SELECCIONADA */}
              {cuentaSeleccionadaId && (
                <div className="space-y-4 pt-4 border-t border-[#cec8bc] dark:border-slate-800">
                  {/* PANEL SALDO RECALCULADO OFICIAL (GET /api/v1/cuentas-bancarias/:id/saldo) */}
                  {saldoCuentaSeleccionada && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 text-xs shadow-sm">
                      <div>
                        <span className="text-[#7d776f] font-semibold text-[11px] block">Saldo Inicial Período</span>
                        <div className="text-base sm:text-lg font-black font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                          Bs. {Number(saldoCuentaSeleccionada.saldoInicial || 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] block">Depósitos (Abonos)</span>
                        <div className="text-base sm:text-lg font-black font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                          + Bs. {Number(saldoCuentaSeleccionada.totalDepositos || 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-rose-700 dark:text-rose-400 font-semibold text-[11px] block">Retiros (Cargos)</span>
                        <div className="text-base sm:text-lg font-black font-mono text-rose-700 dark:text-rose-400 mt-0.5">
                          - Bs. {Number(saldoCuentaSeleccionada.totalRetiros || 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-blue-700 dark:text-blue-400 font-semibold text-[11px] block">Disponible Cuenta</span>
                        <div className="text-base sm:text-lg font-black font-mono text-blue-700 dark:text-blue-400 mt-0.5">
                          Bs. {Number(saldoCuentaSeleccionada.saldoDisponibleActual || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-extrabold text-[#262422] dark:text-white flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        Movimientos del Extracto Bancario
                      </h3>
                      <p className="text-xs text-[#7d776f]">
                        Cuenta: {cuentasBancarias.find((c) => c.idCuenta === cuentaSeleccionadaId)?.banco} - {cuentasBancarias.find((c) => c.idCuenta === cuentaSeleccionadaId)?.numeroCuenta}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Filtro tipo */}
                      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs">
                        {(['Todos', 'Deposito', 'Retiro'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setFiltroTipoBanco(t)}
                            className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                              filtroTipoBanco === t ? 'bg-blue-700 text-white' : 'text-[#5c5750]'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      {/* Filtro estado */}
                      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs">
                        {(['Todos', 'Pendiente', 'Conciliado', 'Discrepancia'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setFiltroEstadoBanco(st)}
                            className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                              filtroEstadoBanco === st ? 'bg-blue-700 text-white' : 'text-[#5c5750]'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>

                      {puedeEscribirMovimientos && (
                        <button
                          type="button"
                          onClick={() => {
                            setMovBancoEnEdicion(null)
                            setFormMovBancoCuentaId(cuentaSeleccionadaId)
                            setFormMovBancoTipo('Deposito')
                            setFormMovBancoMonto('')
                            setFormMovBancoConcepto('')
                            setFormMovBancoReferencia('')
                            setFormMovBancoFecha(fechaSolo(new Date()))
                            setFormMovBancoError(null)
                            setIsModalMovBancoOpen(true)
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Registrar Mov. Bancario</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* TABLA MOVIMIENTOS BANCARIOS */}
                  <div className="rounded-2xl border border-[#cec8bc] dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#e3ded4] dark:bg-slate-950/60 font-bold uppercase text-[11px] text-[#5c5750]">
                            <th className="py-3 px-4">Tipo</th>
                            <th className="py-3 px-4">Fecha</th>
                            <th className="py-3 px-4">Referencia</th>
                            <th className="py-3 px-4">Concepto</th>
                            <th className="py-3 px-4">Monto (Bs.)</th>
                            <th className="py-3 px-4">Estado</th>
                            <th className="py-3 px-4 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#cec8bc]/60 dark:divide-slate-800">
                          {loadingMovBancos ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-[#7d776f]">
                                <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-700" />
                              </td>
                            </tr>
                          ) : movimientosBancoFiltrados.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-[#7d776f]">
                                No hay movimientos bancarios registrados para esta cuenta y filtros.
                              </td>
                            </tr>
                          ) : (
                            movimientosBancoFiltrados.map((mb) => {
                              const esDeposito = mb.tipo === 'Deposito'
                              const yaConciliado = mb.estadoConciliacion === 'Conciliado'
                              return (
                                <tr key={mb.idMovBancario} className="hover:bg-[#e6e1d6]/50 transition-colors">
                                  <td className="py-3 px-4">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                        esDeposito
                                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                                          : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300'
                                      }`}
                                    >
                                      {esDeposito ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                      {mb.tipo}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-mono">{fechaSolo(mb.fecha)}</td>
                                  <td className="py-3 px-4 font-mono text-[#5c5750]">{mb.referencia || 'S/R'}</td>
                                  <td className="py-3 px-4 font-medium max-w-xs truncate" title={mb.concepto}>
                                    {mb.concepto}
                                  </td>
                                  <td
                                    className={`py-3 px-4 font-mono font-bold ${
                                      esDeposito ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                                    }`}
                                  >
                                    {esDeposito ? '+' : '-'} Bs. {Number(mb.monto).toFixed(2)}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        mb.estadoConciliacion === 'Conciliado'
                                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                          : mb.estadoConciliacion === 'Discrepancia'
                                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                          : 'bg-slate-100 text-slate-800 border border-slate-300'
                                      }`}
                                    >
                                      {mb.estadoConciliacion}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="inline-flex items-center gap-1">
                                      {/* GET /api/v1/movimientos-bancarios/:id */}
                                      <button
                                        type="button"
                                        onClick={() => handleVerDetalleMovBanco(mb.idMovBancario)}
                                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        title="Ver detalle del movimiento"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>

                                      {/* PUT /api/v1/movimientos-bancarios/:id (solo si no está conciliado) */}
                                      {puedeEscribirMovimientos && (
                                        !yaConciliado ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setMovBancoEnEdicion(mb)
                                              setFormMovBancoCuentaId(mb.idCuenta)
                                              setFormMovBancoTipo(mb.tipo)
                                              setFormMovBancoMonto(mb.monto)
                                              setFormMovBancoConcepto(mb.concepto)
                                              setFormMovBancoReferencia(mb.referencia || '')
                                              setFormMovBancoFecha(fechaSolo(mb.fecha))
                                              setFormMovBancoError(null)
                                              setIsModalMovBancoOpen(true)
                                            }}
                                            className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                                            title="Editar movimiento"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                        ) : (
                                          <span className="text-[10px] text-slate-400 italic">Conciliado</span>
                                        )
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL REGISTRAR MOVIMIENTO DE CAJA */}
      {isModalCajaOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-600" />
                Registrar Movimiento de Caja Chica
              </h3>
              <button
                type="button"
                onClick={() => setIsModalCajaOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formCajaError && (
              <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formCajaError}</span>
              </div>
            )}

            <form onSubmit={handleGuardarCaja} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Tipo de Movimiento *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormCajaTipo('Ingreso')}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      formCajaTipo === 'Ingreso'
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-[#dfd9ce] text-[#5c5750] border-[#cec8bc]'
                    }`}
                  >
                    Ingreso (Abono)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCajaTipo('Egreso')}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      formCajaTipo === 'Egreso'
                        ? 'bg-rose-700 text-white border-rose-700'
                        : 'bg-[#dfd9ce] text-[#5c5750] border-[#cec8bc]'
                    }`}
                  >
                    Egreso (Gasto)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Monto (Bs.) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={formCajaMonto}
                  onChange={(e) => setFormCajaMonto(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  required
                  value={formCajaFecha}
                  onChange={(e) => setFormCajaFecha(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Concepto / Detalle *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Motivo del ingreso o gasto en caja..."
                  value={formCajaConcepto}
                  onChange={(e) => setFormCajaConcepto(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalCajaOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#dfd9ce] text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCaja}
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold cursor-pointer"
                >
                  {isSubmittingCaja ? 'Guardando...' : 'Guardar en Caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ANULAR MOVIMIENTO DE CAJA */}
      {movimientoParaAnular && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-extrabold text-base">Anular Movimiento de Caja</h3>
            </div>
            <p className="text-xs text-[#5c5750]">
              Indique el motivo obligatorio de anulación para el movimiento de Bs.{' '}
              {Number(movimientoParaAnular.monto).toFixed(2)}:
            </p>

            {modalAnulacionError && (
              <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs">
                {modalAnulacionError}
              </div>
            )}

            <div>
              <textarea
                rows={2}
                required
                placeholder="Motivo obligatorio de anulación..."
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#cec8bc]">
              <button
                type="button"
                onClick={() => {
                  setMovimientoParaAnular(null)
                  setModalAnulacionError(null)
                }}
                className="px-3 py-1.5 rounded-xl bg-[#dfd9ce] text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarAnulacionCaja}
                disabled={anulandoCaja || !motivoAnulacion.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {anulandoCaja ? 'Anulando...' : 'Confirmar Anulación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR CUENTA BANCARIA */}
      {isModalCuentaOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white flex items-center gap-2">
                <Landmark className="w-4 h-4 text-blue-600" />
                {cuentaEnEdicion ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalCuentaOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formCuentaError && (
              <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formCuentaError}</span>
              </div>
            )}

            <form onSubmit={handleGuardarCuenta} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Banco / Entidad Financiera *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Banco Nacional de Bolivia, Banco Unión..."
                  value={formCuentaBanco}
                  onChange={(e) => setFormCuentaBanco(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Número de Cuenta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 100000456789"
                  value={formCuentaNumero}
                  onChange={(e) => setFormCuentaNumero(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Tipo de Cuenta
                </label>
                <select
                  value={formCuentaTipo}
                  onChange={(e) => setFormCuentaTipo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc]"
                >
                  <option value="Corriente">Cuenta Corriente</option>
                  <option value="Ahorros">Caja de Ahorros</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Saldo Inicial (Bs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formCuentaSaldoInicial}
                  onChange={(e) => setFormCuentaSaldoInicial(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] font-mono font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc]">
                <button
                  type="button"
                  onClick={() => setIsModalCuentaOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#dfd9ce] text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCuenta}
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold cursor-pointer"
                >
                  {isSubmittingCuenta ? 'Guardando...' : 'Guardar Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR MOVIMIENTO BANCARIO */}
      {isModalMovBancoOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                {movBancoEnEdicion ? 'Editar Movimiento Bancario' : 'Registrar Movimiento Bancario'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalMovBancoOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formMovBancoError && (
              <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formMovBancoError}</span>
              </div>
            )}

            <form onSubmit={handleGuardarMovBanco} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Cuenta Bancaria *
                </label>
                <select
                  required
                  disabled={!!movBancoEnEdicion}
                  value={formMovBancoCuentaId}
                  onChange={(e) => setFormMovBancoCuentaId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc]"
                >
                  <option value="">Seleccione una cuenta...</option>
                  {cuentasBancarias.map((c) => (
                    <option key={c.idCuenta} value={c.idCuenta}>
                      {c.banco} - {c.numeroCuenta}
                    </option>
                  ))}
                </select>
              </div>

              {!movBancoEnEdicion && (
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Tipo *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormMovBancoTipo('Deposito')}
                      className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                        formMovBancoTipo === 'Deposito'
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-[#dfd9ce] text-[#5c5750] border-[#cec8bc]'
                      }`}
                    >
                      Depósito (Abono)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormMovBancoTipo('Retiro')}
                      className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                        formMovBancoTipo === 'Retiro'
                          ? 'bg-rose-700 text-white border-rose-700'
                          : 'bg-[#dfd9ce] text-[#5c5750] border-[#cec8bc]'
                      }`}
                    >
                      Retiro (Cargo)
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Monto (Bs.) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={formMovBancoMonto}
                  onChange={(e) => setFormMovBancoMonto(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Referencia Bancaria
                </label>
                <input
                  type="text"
                  placeholder="Ej: TRANSF-8934, CHQ-102"
                  value={formMovBancoReferencia}
                  onChange={(e) => setFormMovBancoReferencia(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  required
                  value={formMovBancoFecha}
                  onChange={(e) => setFormMovBancoFecha(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Concepto / Detalle *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Descripción del movimiento..."
                  value={formMovBancoConcepto}
                  onChange={(e) => setFormMovBancoConcepto(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc]">
                <button
                  type="button"
                  onClick={() => setIsModalMovBancoOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#dfd9ce] text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMovBanco}
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold cursor-pointer"
                >
                  {isSubmittingMovBanco ? 'Guardando...' : 'Guardar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE MOVIMIENTO BANCARIO (GET /api/v1/movimientos-bancarios/:id) */}
      {isModalDetalleMovOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                Detalle del Movimiento Bancario
              </h3>
              <button
                type="button"
                onClick={() => setIsModalDetalleMovOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetalleMov ? (
              <div className="py-8 text-center text-[#7d776f]">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-700" />
                <p className="text-xs mt-2">Consultando endpoint oficial...</p>
              </div>
            ) : movBancoDetalle ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-white/70 dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-[#7d776f] uppercase font-bold">Tipo:</span>
                    <p className="font-bold text-sm text-[#262422] dark:text-white">{movBancoDetalle.tipo}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#7d776f] uppercase font-bold">Monto:</span>
                    <p className="font-bold text-sm font-mono text-blue-700 dark:text-blue-400">
                      Bs. {Number(movBancoDetalle.monto).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 space-y-2.5">
                  <div>
                    <span className="text-[10px] text-[#7d776f] uppercase font-bold">Concepto:</span>
                    <p className="font-medium text-[#262422] dark:text-white mt-0.5">{movBancoDetalle.concepto}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#cec8bc]/40 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-[#7d776f] uppercase font-bold">Fecha:</span>
                      <p className="font-mono">{fechaSolo(movBancoDetalle.fecha)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#7d776f] uppercase font-bold">Referencia:</span>
                      <p className="font-mono">{movBancoDetalle.referencia || 'Sin referencia'}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#cec8bc]/40 dark:border-slate-800">
                    <span className="text-[10px] text-[#7d776f] uppercase font-bold">Estado de Conciliación:</span>
                    <p className="font-bold mt-0.5 text-blue-800 dark:text-blue-300">{movBancoDetalle.estadoConciliacion}</p>
                    {movBancoDetalle.diferencia !== null && movBancoDetalle.diferencia !== undefined && (
                      <p className="text-rose-600 font-semibold text-[11px] mt-0.5">
                        Diferencia con libro interno: Bs. {Number(movBancoDetalle.diferencia).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalDetalleMovOpen(false)}
                    className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
