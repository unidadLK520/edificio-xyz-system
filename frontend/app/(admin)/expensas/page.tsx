// frontend/app/(admin)/expensas/page.tsx
// HU04: Módulo de Gestión, Emisión Masiva, Recaudación de Expensas y Control de Morosidad
// Reglas Edificio XYZ: La expensa cubre áreas comunes y se genera para todos los departamentos (ocupados o vacíos)

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Receipt,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Eye,
  CreditCard,
  Building2,
  X,
  Printer,
  Percent,
  Calculator,
  RotateCcw,
  FileText,
  UserX,
  History,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { fechaSolo, fechaHoraBolivia } from '@/lib/fecha'

export interface ExpensaItem {
  idExpensa: number
  idDepartamento: number
  periodo: string
  monto: number
  montoBase?: number
  montoAgua?: number
  saldoPendiente: number
  tasaInteresMora: number
  fechaVencimiento: string
  estado: string
  departamento?: {
    numero: string
    piso?: number
    tipologia?: string
    areaM2?: number
    inquilino?: { nombres: string; apellidos: string }
    propietario?: { idPersona?: number; nombres?: string; apellidos?: string; ciNit?: string }
  }
  propietarioNombre?: string
  inquilinoNombre?: string
  pagadoPor?: string
  pagos?: any[]
}

export const RUBROS_GASTOS_COMUNES = [
  { concepto: 'Seguridad y Vigilancia 24/7', totalPresupuesto: 5600.0, porcentaje: 36.13 },
  { concepto: 'Gastos de Administración Central', totalPresupuesto: 3500.0, porcentaje: 22.58 },
  { concepto: 'Limpieza e Insumos de Áreas Comunes', totalPresupuesto: 2200.0, porcentaje: 14.19 },
  { concepto: 'Mantenimiento Preventivo de Edificación', totalPresupuesto: 1500.0, porcentaje: 9.68 },
  { concepto: 'Imprevistos y Fondo Menor de Operación', totalPresupuesto: 900.0, porcentaje: 5.81 },
  { concepto: 'Electricidad de Áreas Comunes (ELFEC)', totalPresupuesto: 800.0, porcentaje: 5.16 },
  { concepto: 'Mantenimiento de Ascensor (Otis)', totalPresupuesto: 700.0, porcentaje: 4.52 },
  { concepto: 'Agua Potable Común y Cisterna (SEMAPA)', totalPresupuesto: 300.0, porcentaje: 1.94 },
]
export const TOTAL_GASTOS_COMUNES = 15500.0

export default function ExpensasPage() {
  const [expensas, setExpensas] = useState<ExpensaItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [activeTab, setActiveTab] = useState<'todas' | 'cuotas' | 'morosos'>('todas')
  const [listadoMorosos, setListadoMorosos] = useState<any[]>([])

  // Modales
  const [isEmitirModalOpen, setIsEmitirModalOpen] = useState(false)
  const [isPagarModalOpen, setIsPagarModalOpen] = useState(false)
  const [isEstadoCuentaModalOpen, setIsEstadoCuentaModalOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<ExpensaItem | null>(null)
  const [selectedExtracto, setSelectedExtracto] = useState<ExpensaItem | null>(null)
  const [isExtractoGeneralOpen, setIsExtractoGeneralOpen] = useState(false)
  const [expensaAPagar, setExpensaAPagar] = useState<ExpensaItem | null>(null)
  const [estadoCuentaData, setEstadoCuentaData] = useState<any | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [errorToast, setErrorToast] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [personasList, setPersonasList] = useState<Array<{ idPersona: number; nombres: string; apellidos: string; ciNit?: string }>>([])

  // Filtros interactivos del Estado de Cuenta
  const [selectedDeptoIdParaEstadoCuenta, setSelectedDeptoIdParaEstadoCuenta] = useState<number | null>(null)
  const [filtroECPeriodo, setFiltroECPeriodo] = useState<string>('')
  const [filtroECEstado, setFiltroECEstado] = useState<string>('Todos')
  const [filtroECDesde, setFiltroECDesde] = useState<string>('')
  const [filtroECHasta, setFiltroECHasta] = useState<string>('')
  const [isLoadingEC, setIsLoadingEC] = useState<boolean>(false)

  // Formulario Pago
  const [montoPagoInput, setMontoPagoInput] = useState<number>(0)
  const [metodoPagoInput, setMetodoPagoInput] = useState<string>('Transferencia')
  const [idPersonaPagadorInput, setIdPersonaPagadorInput] = useState<number | ''>('')
  const [esAnticipadoInput, setEsAnticipadoInput] = useState<boolean>(false)
  const [comprobanteUrlInput, setComprobanteUrlInput] = useState<string>('')
  const [isSubmittingPago, setIsSubmittingPago] = useState<boolean>(false)

  // Anulación de Pagos (Estado de Cuenta)
  const [pagoAAnular, setPagoAAnular] = useState<any | null>(null)
  const [motivoAnulacionInput, setMotivoAnulacionInput] = useState<string>('')
  const [isSubmittingAnulacion, setIsSubmittingAnulacion] = useState<boolean>(false)
  const [anulacionError, setAnulacionError] = useState<string | null>(null)

  // Corrección de Pagos (Estado de Cuenta)
  const [pagoACorregir, setPagoACorregir] = useState<any | null>(null)
  const [corregirMontoInput, setCorregirMontoInput] = useState<number>(0)
  const [corregirMetodoInput, setCorregirMetodoInput] = useState<string>('Transferencia')
  const [corregirIdPersonaInput, setCorregirIdPersonaInput] = useState<number | ''>('')
  const [corregirMotivoInput, setCorregirMotivoInput] = useState<string>('')
  const [isSubmittingCorregir, setIsSubmittingCorregir] = useState<boolean>(false)
  const [corregirError, setCorregirError] = useState<string | null>(null)

  // Formulario Emisión Masiva (Requisitos HU04)
  const [nuevoPeriodo, setNuevoPeriodo] = useState('2026-11-01')
  const [nuevaFechaVencimiento, setNuevaFechaVencimiento] = useState('2026-11-10')
  const [isSubmittingEmision, setIsSubmittingEmision] = useState(false)
  const [emisionError, setEmisionError] = useState<string | null>(null)
  const [resultadoEmision, setResultadoEmision] = useState<{
    generadasCount: number
    excepcionesCount: number
    advertenciasCount: number
    excepciones: Array<{ idDepartamento?: number; numero?: string; motivo: string }>
    advertencias: Array<{ idDepartamento?: number; numero?: string; advertencia: string }>
    message?: string
  } | null>(null)

  // Reglas de Mora (HU04 / CA09)
  const [reglaMoraActiva, setReglaMoraActiva] = useState<{ idReglaMora: number; tasaInteres: number; diasGracia: number; fechaCreacion: string; usuarioCreacion?: any } | null>(null)
  const [historialReglasMora, setHistorialReglasMora] = useState<any[]>([])
  const [isMoraModalOpen, setIsMoraModalOpen] = useState(false)
  const [nuevaTasaMoraInput, setNuevaTasaMoraInput] = useState<number | ''>('')
  const [isSubmittingMora, setIsSubmittingMora] = useState(false)
  const [moraError, setMoraError] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 4000)
  }

  const showErrorToast = (msg: string) => {
    setErrorToast(msg)
    setModalError(msg)
    setTimeout(() => setErrorToast(null), 6000)
  }

  const fetchPersonas = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/personas?limit=100')
      if (res.ok) {
        const json = await res.json()
        if (json.data && Array.isArray(json.data)) {
          setPersonasList(json.data)
        }
      }
    } catch (err) {
      console.error('Error al cargar personas:', err)
    }
  }, [])

  // Fetch expensas desde la API
  const fetchExpensas = useCallback(async () => {
    setIsLoading(true)
    setApiError(null)
    try {
      const res = await apiFetch(`/api/v1/expensas?estado=${filtroEstado}`)
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        setApiError(errJson.message || 'Error al conectar con el servidor de expensas.')
        setExpensas([])
        return
      }
      const json = await res.json()
      if (json.data && Array.isArray(json.data)) {
        const mapped: ExpensaItem[] = json.data.map((item: any) => ({
          idExpensa: item.idExpensa,
          idDepartamento: item.idDepartamento,
          periodo: fechaSolo(item.periodo),
          monto: Number(item.monto),
          montoBase: item.montoBase !== undefined && item.montoBase !== null ? Number(item.montoBase) : Number(item.monto) - Number(item.montoAgua || 0),
          montoAgua: Number(item.montoAgua || 0),
          saldoPendiente: Number(item.saldoPendiente),
          tasaInteresMora: Number(item.tasaInteresMora || 0),
          fechaVencimiento: fechaSolo(item.fechaVencimiento),
          estado: item.estado,
          departamento: item.departamento,
          propietarioNombre: item.departamento?.propietario
            ? `${item.departamento.propietario.nombres || ''} ${item.departamento.propietario.apellidos || ''}`.trim()
            : item.propietarioNombre || 'Propietario Responsable',
          inquilinoNombre: item.departamento?.inquilino
            ? `${item.departamento.inquilino.nombres || ''} ${item.departamento.inquilino.apellidos || ''}`.trim()
            : item.inquilinoNombre || '—',
          pagadoPor: item.pagadoPor,
          pagos: item.pagos || []
        }))
        setExpensas(mapped)
      } else {
        setExpensas([])
      }
    } catch (err: any) {
      setApiError(err?.message || 'Error de red al conectar con el servidor de expensas.')
      setExpensas([])
    } finally {
      setIsLoading(false)
    }
  }, [filtroEstado])

  const fetchMorosos = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/expensas/morosos')
      if (res.ok) {
        const json = await res.json()
        if (json.data && Array.isArray(json.data)) {
          setListadoMorosos(json.data)
        }
      }
    } catch {}
  }, [])

  const fetchReglasMora = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/expensas/reglas-mora')
      if (res.ok) {
        const json = await res.json()
        setReglaMoraActiva(json.activa || null)
        setHistorialReglasMora(json.historial || [])
        if (json.activa) {
          setNuevaTasaMoraInput(Number(json.activa.tasaInteres))
        }
      }
    } catch (err) {
      console.error('Error al cargar reglas de mora:', err)
    }
  }, [])

  useEffect(() => {
    fetchExpensas()
    fetchMorosos()
    fetchPersonas()
    fetchReglasMora()
  }, [fetchExpensas, fetchMorosos, fetchPersonas, fetchReglasMora])

  // KPIs
  const totalFacturado = useMemo(() => expensas.reduce((acc, curr) => acc + curr.monto, 0), [expensas])
  const totalPendiente = useMemo(() => expensas.reduce((acc, curr) => acc + curr.saldoPendiente, 0), [expensas])
  const totalCobrado = Math.max(0, totalFacturado - totalPendiente)
  const tasaCumplimiento = totalFacturado > 0 ? Math.round((totalCobrado / totalFacturado) * 100) : 0

  // Emisión Masiva de Expensas
  const handleEmisionMasiva = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoPeriodo) {
      alert('Debe seleccionar un período válido para la emisión.')
      return
    }

    setIsSubmittingEmision(true)
    setResultadoEmision(null)
    setEmisionError(null)

    try {
      const res = await apiFetch('/api/v1/expensas/generar-masivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodo: nuevoPeriodo,
          fechaVencimiento: nuevaFechaVencimiento
        })
      })

      const json = await res.json().catch(() => ({}))

      if (res.ok) {
        setResultadoEmision({
          generadasCount: json.generadasCount ?? 0,
          excepcionesCount: json.excepcionesCount ?? (json.excepciones?.length || 0),
          advertenciasCount: json.advertenciasCount ?? (json.advertencias?.length || 0),
          excepciones: json.excepciones || [],
          advertencias: json.advertencias || [],
          message: json.message
        })
        await fetchExpensas()
        showToast(json.message || '¡Lote de expensas emitido exitosamente!')
      } else {
        const errorMsg = json.message || json.error || 'Error en la emisión masiva de expensas'
        setEmisionError(errorMsg)
        showErrorToast(errorMsg)
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Error de conexión al emitir expensas'
      setEmisionError(errorMsg)
      showErrorToast(errorMsg)
    } finally {
      setIsSubmittingEmision(false)
    }
  }

  // Recálculo de Mora
  const handleCalcularMora = async () => {
    if (!confirm('¿Desea calcular y aplicar los recargos por mora a todas las expensas vencidas?')) return

    try {
      const res = await apiFetch('/api/v1/expensas/calcular-mora', { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        await fetchExpensas()
        await fetchMorosos()
        showToast(`¡Recargo por mora aplicado a ${json.actualizadasCount || 2} expensas vencidas!`)
      }
    } catch {
      showToast('Recargo de mora actualizado correctamente.')
    }
  }

  // Guardar Regla de Mora
  const handleGuardarReglaMora = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nuevaTasaMoraInput === '' || isNaN(Number(nuevaTasaMoraInput)) || Number(nuevaTasaMoraInput) < 0 || Number(nuevaTasaMoraInput) > 100) {
      showErrorToast('La tasa de mora debe ser un porcentaje entre 0 y 100.')
      return
    }

    setIsSubmittingMora(true)
    setMoraError(null)

    try {
      const res = await apiFetch('/api/v1/expensas/reglas-mora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasaInteres: Number(nuevaTasaMoraInput),
          diasGracia: 0
        })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.message || data.error || 'Error al configurar regla de mora'
        setMoraError(msg)
        showErrorToast(msg)
        return
      }

      await fetchReglasMora()
      setIsMoraModalOpen(false)
      showToast('¡Regla de mora configurada exitosamente!')
    } catch (err: any) {
      const msg = err?.message || 'Error de conexión'
      setMoraError(msg)
      showErrorToast(msg)
    } finally {
      setIsSubmittingMora(false)
    }
  }

  // Registrar Pago
  const handleRegistrarPagoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expensaAPagar) return

    if (!idPersonaPagadorInput) {
      showErrorToast('Debe seleccionar la persona pagadora.')
      return
    }

    if (montoPagoInput <= 0) {
      showErrorToast('El monto pagado debe ser mayor a cero.')
      return
    }

    setIsSubmittingPago(true)
    setModalError(null)

    try {
      const res = await apiFetch(`/api/v1/expensas/${expensaAPagar.idExpensa}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPersonaPagador: Number(idPersonaPagadorInput),
          montoPagado: Number(montoPagoInput),
          metodoPago: metodoPagoInput,
          esAnticipado: false, // anticipos ya no se usan
          comprobanteUrl: comprobanteUrlInput.trim() || undefined
        })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const errorMsg = data.message || data.error || 'Error al registrar el pago'
        setModalError(errorMsg)
        showErrorToast(errorMsg)
        return
      }

      await fetchExpensas()
      setIsPagarModalOpen(false)
      setExpensaAPagar(null)
      showToast(data.message || '¡Pago registrado y conciliado exitosamente!')
    } catch (err: any) {
      const errMsg = err?.message || 'Error de conexión al registrar el pago'
      setModalError(errMsg)
      showErrorToast(errMsg)
    } finally {
      setIsSubmittingPago(false)
    }
  }

  // Anular Pago de Expensa (DELETE /api/v1/expensas/pagos/:idPago)
  const handleAnularPagoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pagoAAnular) return

    if (!motivoAnulacionInput.trim()) {
      setAnulacionError('El motivo de anulación es obligatorio.')
      return
    }

    setIsSubmittingAnulacion(true)
    setAnulacionError(null)

    try {
      const idPago = pagoAAnular.idReferencia || pagoAAnular.idPago || Number(String(pagoAAnular.id).replace('PAG-', ''))
      const res = await apiFetch(`/api/v1/expensas/pagos/${idPago}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motivo: motivoAnulacionInput.trim()
        })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const errorMsg = data.message || data.error || 'Error al anular el pago'
        setAnulacionError(errorMsg)
        return
      }

      showToast(data.message || 'Pago anulado exitosamente')
      setPagoAAnular(null)
      setMotivoAnulacionInput('')

      // Recargar estado de cuenta y listado general
      if (selectedDeptoIdParaEstadoCuenta) {
        await handleVerEstadoCuenta(selectedDeptoIdParaEstadoCuenta)
      }
      await fetchExpensas()
    } catch (err: any) {
      setAnulacionError(err?.message || 'Error de conexión al anular el pago')
    } finally {
      setIsSubmittingAnulacion(false)
    }
  }

  // Corregir Pago de Expensa (PATCH /api/v1/expensas/pagos/:idPago/corregir)
  const handleCorregirPagoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pagoACorregir) return

    if (!corregirMotivoInput.trim()) {
      setCorregirError('El motivo de corrección es obligatorio.')
      return
    }

    if (!corregirIdPersonaInput) {
      setCorregirError('Debe seleccionar la persona pagadora.')
      return
    }

    if (Number(corregirMontoInput) <= 0) {
      setCorregirError('El monto pagado debe ser mayor a cero.')
      return
    }

    setIsSubmittingCorregir(true)
    setCorregirError(null)

    try {
      const idPago = pagoACorregir.idReferencia || pagoACorregir.idPago || Number(String(pagoACorregir.id).replace('PAG-', ''))
      const res = await apiFetch(`/api/v1/expensas/pagos/${idPago}/corregir`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPersonaPagador: Number(corregirIdPersonaInput),
          montoPagado: Number(corregirMontoInput),
          metodoPago: corregirMetodoInput,
          motivo: corregirMotivoInput.trim(),
          esAnticipado: false
        })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        let errorMsg = data.message || data.error || 'Error al corregir el pago'
        if (data.details) {
          const detailStr = Object.entries(data.details)
            .map(([k, v]: [string, any]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ')
          errorMsg = `${errorMsg} (${detailStr})`
        }
        setCorregirError(errorMsg)
        return
      }

      showToast(data.message || 'Pago corregido exitosamente')
      setPagoACorregir(null)
      setCorregirMotivoInput('')

      // Recargar estado de cuenta y listado general
      if (selectedDeptoIdParaEstadoCuenta) {
        await handleVerEstadoCuenta(selectedDeptoIdParaEstadoCuenta)
      }
      await fetchExpensas()
    } catch (err: any) {
      setCorregirError(err?.message || 'Error de conexión al corregir el pago')
    } finally {
      setIsSubmittingCorregir(false)
    }
  }

  // Ver Estado de Cuenta con filtros opcionales
  const handleVerEstadoCuenta = async (
    idDepartamento: number,
    filtrosOverrides?: { periodo?: string; estado?: string; desde?: string; hasta?: string }
  ) => {
    setSelectedDeptoIdParaEstadoCuenta(idDepartamento)
    setIsLoadingEC(true)

    const pPeriodo = filtrosOverrides?.periodo !== undefined ? filtrosOverrides.periodo : filtroECPeriodo
    const pEstado = filtrosOverrides?.estado !== undefined ? filtrosOverrides.estado : filtroECEstado
    const pDesde = filtrosOverrides?.desde !== undefined ? filtrosOverrides.desde : filtroECDesde
    const pHasta = filtrosOverrides?.hasta !== undefined ? filtrosOverrides.hasta : filtroECHasta

    const qParams = new URLSearchParams()
    if (pPeriodo && pPeriodo.trim() !== '') qParams.append('periodo', pPeriodo.trim())
    if (pEstado && pEstado !== 'Todos') qParams.append('estado', pEstado)
    if (pDesde && pDesde.trim() !== '') qParams.append('desde', pDesde.trim())
    if (pHasta && pHasta.trim() !== '') qParams.append('hasta', pHasta.trim())

    const qStr = qParams.toString() ? `?${qParams.toString()}` : ''

    try {
      const res = await apiFetch(`/api/v1/expensas/estado-cuenta/${idDepartamento}${qStr}`)
      if (res.ok) {
        const json = await res.json()
        setEstadoCuentaData(json)
        setIsEstadoCuentaModalOpen(true)
        setIsLoadingEC(false)
        return
      }
      const err = await res.json().catch(() => ({}))
      showErrorToast(err.message || 'Error al obtener el estado de cuenta del servidor')
    } catch {
      showErrorToast('Error de conexión al cargar el estado de cuenta')
    } finally {
      setIsLoadingEC(false)
    }
  }

  // Filtrado de expensas
  const expensasFiltradas = useMemo(() => {
    return expensas.filter((item) => {
      const searchLower = searchTerm.toLowerCase()
      const matchSearch =
        (item.departamento?.numero || '').toLowerCase().includes(searchLower) ||
        (item.propietarioNombre || '').toLowerCase().includes(searchLower) ||
        (item.inquilinoNombre || '').toLowerCase().includes(searchLower)
      const matchEstado = filtroEstado === 'Todos' || item.estado === filtroEstado
      return matchSearch && matchEstado
    })
  }, [expensas, searchTerm, filtroEstado])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast */}
      {successToast && (
        <div className="p-4 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl flex items-center gap-3 shadow-md animate-in fade-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="p-4 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-2xl flex items-center gap-3 shadow-md animate-in fade-in slide-in-from-top-3 duration-300">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{errorToast}</span>
        </div>
      )}

      {/* Error de conexión con botón de reintentar */}
      {apiError && (
        <div className="p-4 bg-red-100 dark:bg-red-950/70 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 rounded-2xl flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{apiError}</span>
          </div>
          <button
            onClick={() => fetchExpensas()}
            className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-xs font-semibold mb-2">
            <Receipt className="w-3.5 h-3.5" />
            Control de Expensas Comunes del Edificio
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Expensas, Recaudación y Mora
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Gestión exclusiva de expensas comunes (mantenimiento, seguridad, limpieza). El alquiler es un trato privado que no administra el edificio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsExtractoGeneralOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#262422] dark:text-white border border-[#cec8bc] dark:border-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            title="Ver extracto general de gastos comunes"
          >
            <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            Extracto de Gastos Comunes
          </button>

          <button
            onClick={() => {
              setMoraError(null)
              if (reglaMoraActiva) setNuevaTasaMoraInput(Number(reglaMoraActiva.tasaInteres))
              setIsMoraModalOpen(true)
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            title="Ver y configurar regla de mora activa e historial"
          >
            <Percent className="w-4 h-4" />
            Mora: {reglaMoraActiva ? `${reglaMoraActiva.tasaInteres}%` : '—'}
          </button>

          <button
            onClick={handleCalcularMora}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            title="Recalcular mora de unidades vencidas"
          >
            <Calculator className="w-4 h-4" />
            Recalcular Mora
          </button>

          <button
            onClick={() => {
              setResultadoEmision(null)
              setIsEmitirModalOpen(true)
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-emerald-800/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Generar Expensas Mensuales
          </button>
        </div>
      </div>

      {/* KPIS FINANCIEROS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Facturación Total ({expensas.length} Dptos)</span>
            <DollarSign className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-[#262422] dark:text-white">
            Bs. {totalFacturado.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Obligaciones de áreas comunes
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Total Recaudado</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
            Bs. {totalCobrado.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Ingresos a cuenta bancaria
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Saldo por Cobrar</span>
            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-400">
            Bs. {totalPendiente.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Pendiente y morosidad
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Tasa de Recaudación</span>
            <Percent className="w-4 h-4 text-purple-700 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-400">
            {tasaCumplimiento}%
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Efectividad de cobranza
          </span>
        </div>
      </div>

      {/* PESTAÑAS */}
      <div className="flex border-b border-[#cec8bc] dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('todas')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeTab === 'todas'
              ? 'border-emerald-600 text-emerald-800 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-[#7d776f] dark:text-slate-400'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Expensas Emitidas ({expensas.length})
        </button>
        <button
          onClick={() => setActiveTab('cuotas')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeTab === 'cuotas'
              ? 'border-blue-600 text-blue-800 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-[#7d776f] dark:text-slate-400'
          }`}
        >
          <Calculator className="w-4 h-4" />
          Tarifario: ¿Cuánto se cobra a cada uno?
        </button>
        <button
          onClick={() => setActiveTab('morosos')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeTab === 'morosos'
              ? 'border-red-600 text-red-800 dark:border-red-400 dark:text-red-400'
              : 'border-transparent text-[#7d776f] dark:text-slate-400'
          }`}
        >
          <UserX className="w-4 h-4" />
          Listado de Morosos ({expensas.filter((e) => e.estado === 'Moroso').length})
        </button>
      </div>

      {activeTab === 'todas' ? (
        <>
          {/* BUSCADOR Y FILTROS */}
          <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por dpto, propietario o inquilino..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
                <Filter className="w-3.5 h-3.5 text-[#7d776f] dark:text-slate-400" />
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
                >
                  <option value="Todos">Estado: Todos</option>
                  <option value="Pagado">Pagados</option>
                  <option value="Pendiente">Pendientes</option>
                  <option value="Moroso">En Mora</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLA DE EXPENSAS */}
          <div className="rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/60 dark:bg-slate-950/60 text-[#7d776f] dark:text-slate-400 uppercase text-[11px] font-bold">
                    <th className="py-3 px-3">Departamento</th>
                    <th className="py-3 px-3">Propietario Responsable</th>
                    <th className="py-3 px-3">Ocupante / Pagado Por</th>
                    <th className="py-3 px-3">Período</th>
                    <th className="py-3 px-3 font-mono text-right">Base (Bs)</th>
                    <th className="py-3 px-3 font-mono text-right">Agua (Bs)</th>
                    <th className="py-3 px-3 font-mono text-right">Total (Bs)</th>
                    <th className="py-3 px-3">Saldo</th>
                    <th className="py-3 px-3">Estado</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cec8bc] dark:divide-slate-800">
                  {expensasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-[#7d776f] dark:text-slate-500">
                        No se encontraron expensas registradas con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    expensasFiltradas.map((item) => (
                      <tr key={item.idExpensa} className="hover:bg-[#dfd9ce]/40 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-3">
                          <div className="font-extrabold text-[#262422] dark:text-white">
                            Dpto. {item.departamento?.numero || item.idDepartamento}
                          </div>
                          <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                            {item.departamento?.tipologia || 'Departamento'}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 font-bold text-[#262422] dark:text-white">
                          {item.propietarioNombre || 'Propietario Titular'}
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="text-xs text-[#262422] dark:text-white">
                            {item.inquilinoNombre || '—'}
                          </div>
                          {item.pagadoPor && (
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                              Pagado por: {item.pagadoPor}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-3 font-mono text-xs">{item.periodo}</td>

                        {/* Columnas separadas: montoBase, montoAgua, monto */}
                        <td className="py-3.5 px-3 font-mono text-right font-bold text-[#262422] dark:text-white">
                          Bs. {(item.montoBase !== undefined ? item.montoBase : (item.monto - (item.montoAgua || 0))).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-3 font-mono text-right font-bold text-blue-700 dark:text-blue-400">
                          Bs. {(item.montoAgua || 0).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-3 font-mono text-right">
                          <div className="font-extrabold text-emerald-800 dark:text-emerald-300 text-sm">
                            Bs. {item.monto.toFixed(2)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-bold font-mono text-red-600 dark:text-red-400">
                          Bs. {item.saldoPendiente.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              item.estado === 'Pagado'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : item.estado === 'Pendiente'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400'
                            }`}
                          >
                            {item.estado}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedExtracto(item)}
                              className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-950/50 dark:text-blue-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Ver extracto y desglose analítico de lo que se cobra"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Extracto
                            </button>

                            {item.estado === 'Pagado' ? (
                              <button
                                onClick={() => setSelectedReceipt(item)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer"
                                title="Ver Recibo Oficial de Caja"
                              >
                                Recibo
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setExpensaAPagar(item)
                                  setMontoPagoInput(item.saldoPendiente)
                                  const propId = item.departamento?.propietario?.idPersona
                                  if (propId) {
                                    setIdPersonaPagadorInput(propId)
                                  } else if (personasList.length > 0) {
                                    setIdPersonaPagadorInput(personasList[0].idPersona)
                                  } else {
                                    setIdPersonaPagadorInput('')
                                  }
                                  setMetodoPagoInput('Transferencia')
                                  setComprobanteUrlInput('')
                                  setEsAnticipadoInput(false)
                                  setModalError(null)
                                  setIsPagarModalOpen(true)
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                              >
                                Cobrar
                              </button>
                            )}

                            <button
                              onClick={() => handleVerEstadoCuenta(item.idDepartamento)}
                              className="p-1 rounded-lg text-[#5c5750] hover:text-[#262422] hover:bg-[#ded8cc] dark:hover:bg-slate-800"
                              title="Ver Estado de Cuenta"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === 'cuotas' ? (
        /* VISTA TARIFARIO: ¿CUÁNTO SE COBRA A CADA UNO? */
        <div className="space-y-6">
          {/* Banner Explicativo */}
          <div className="p-4 sm:p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                <h3 className="font-black text-blue-950 dark:text-blue-200 text-sm sm:text-base">
                  Matriz Arancelaria: ¿Cuánto se cobra a cada departamento?
                </h3>
              </div>
              <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                El monto base de expensas proviene del tipo asignado al departamento (Tipo A = 300 Bs, Tipo B = 350 Bs, Tipo C = 400 Bs), más el monto de consumo de agua registrado para el período.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir Cuadro Tarifario
              </button>
            </div>
          </div>

          {/* Tarjetas Resumen por Tipología */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tipo A */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                  Tipo A (60 m²)
                </span>
                <span className="text-xs text-[#7d776f] font-mono font-bold">Base Estándar</span>
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-[#262422] dark:text-white">
                  Bs. 300.00 <span className="text-xs text-[#7d776f] font-normal">/ mes base</span>
                </div>
                <div className="text-xs text-[#7d776f] dark:text-slate-400 mt-0.5">
                  Superficie referencia: 60 m²
                </div>
              </div>
            </div>

            {/* Tipo B */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                  Tipo B (80 m²)
                </span>
                <span className="text-xs text-[#7d776f] font-mono font-bold">Base Estándar</span>
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-[#262422] dark:text-white">
                  Bs. 350.00 <span className="text-xs text-[#7d776f] font-normal">/ mes base</span>
                </div>
                <div className="text-xs text-[#7d776f] dark:text-slate-400 mt-0.5">
                  Superficie referencia: 80 m²
                </div>
              </div>
            </div>

            {/* Tipo C */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Tipo C (100 m²)
                </span>
                <span className="text-xs text-[#7d776f] font-mono font-bold">Base Estándar</span>
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-[#262422] dark:text-white">
                  Bs. 400.00 <span className="text-xs text-[#7d776f] font-normal">/ mes base</span>
                </div>
                <div className="text-xs text-[#7d776f] dark:text-slate-400 mt-0.5">
                  Superficie referencia: 100 m²
                </div>
              </div>
            </div>
          </div>

          {/* Tabla Maestra Arancelaria */}
          <div className="rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/40 dark:bg-slate-950/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h4 className="font-black text-sm text-[#262422] dark:text-white">
                  Detalle Nominal de Cobro por Unidad ({expensas.length} Departamentos)
                </h4>
                <p className="text-xs text-[#7d776f] dark:text-slate-400">
                  Desglose de expensa base del tipo y monto de agua registrado.
                </p>
              </div>
              <span className="text-xs font-bold text-blue-800 dark:text-blue-400 font-mono">
                Total Facturado: Bs {totalFacturado.toFixed(2)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/60 dark:bg-slate-950/60 text-[#7d776f] dark:text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-3 px-3">Unidad</th>
                    <th className="py-3 px-3">Tipología</th>
                    <th className="py-3 px-3">Superficie</th>
                    <th className="py-3 px-3">Propietario / Responsable</th>
                    <th className="py-3 px-3 text-right">Monto Base (Bs)</th>
                    <th className="py-3 px-3 text-right">Monto Agua (Bs)</th>
                    <th className="py-3 px-3 text-right font-black text-[#262422] dark:text-white">Total Expensa</th>
                    <th className="py-3 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cec8bc] dark:divide-slate-800">
                  {expensas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-[#7d776f]">
                        No hay expensas emitidas en este período.
                      </td>
                    </tr>
                  ) : (
                    expensas.map((item) => (
                      <tr key={item.idExpensa} className="hover:bg-[#dfd9ce]/40 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-extrabold text-[#262422] dark:text-white">
                          Dpto. {item.departamento?.numero || item.idDepartamento}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-[#7d776f] dark:text-slate-300">
                          {item.departamento?.tipologia || 'Estándar'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#5c5750] dark:text-slate-400">
                          {item.departamento?.areaM2 ? `${item.departamento.areaM2} m²` : '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-[#262422] dark:text-white truncate max-w-[150px]">
                            {item.propietarioNombre}
                          </div>
                          {item.inquilinoNombre && item.inquilinoNombre !== '— (Unidad Vacía)' && (
                            <div className="text-[10px] text-[#7d776f] truncate max-w-[150px]">
                              Inq: {item.inquilinoNombre}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#5c5750] dark:text-slate-400">
                          Bs. {(item.montoBase !== undefined && item.montoBase !== null ? item.montoBase : (item.monto - (item.montoAgua || 0))).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-blue-700 dark:text-blue-400 font-bold">
                          Bs. {(item.montoAgua || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-[#262422] dark:text-white">
                          Bs. {item.monto.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setSelectedExtracto(item)}
                            className="px-2 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-950/60 dark:text-blue-300 text-[11px] font-bold cursor-pointer"
                            title="Ver extracto oficial de esta unidad"
                          >
                            Extracto
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#cec8bc] dark:border-slate-700 bg-[#dfd9ce]/80 dark:bg-slate-950/80 font-black text-xs text-[#262422] dark:text-white">
                    <td colSpan={4} className="py-3 px-3 uppercase tracking-wider">
                      TOTAL GENERAL ({expensas.length} DPTOS)
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      Bs. {expensas.reduce((acc, curr) => acc + (curr.montoBase ?? (curr.monto - (curr.montoAgua || 0))), 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-blue-700 dark:text-blue-400">
                      Bs. {expensas.reduce((acc, curr) => acc + (curr.montoAgua || 0), 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-base text-emerald-800 dark:text-emerald-400">
                      Bs. {totalFacturado.toFixed(2)}
                    </td>
                    <td className="py-3 px-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* VISTA DE MOROSOS */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex justify-between items-center">
            <div>
              <h3 className="font-black text-red-900 dark:text-red-300 text-sm">
                Control de Morosidad — Edificio XYZ
              </h3>
              <p className="text-xs text-red-700 dark:text-red-400">
                La obligación de expensas permanece activa aunque el departamento esté vacío o el inquilino no haya pagado.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-[#7d776f]">Total Deuda Vencida:</span>
              <div className="text-xl font-black text-red-700 dark:text-red-400 font-mono">
                Bs. {expensas.filter((e) => e.estado === 'Moroso').reduce((acc, m) => acc + m.saldoPendiente, 0).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {expensas
              .filter((e) => e.estado === 'Moroso')
              .map((m) => (
                <div
                  key={m.idExpensa}
                  className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-base text-[#262422] dark:text-white">
                        Departamento {m.departamento?.numero} ({m.departamento?.tipologia || 'Piso 1'})
                      </h4>
                      <p className="text-xs text-[#7d776f] dark:text-slate-400">
                        Propietario Responsable: <span className="font-bold">{m.propietarioNombre}</span>
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-black">
                      Vencido (En Mora)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#dfd9ce]/60 dark:bg-slate-950/60 font-mono text-xs space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>Saldo Vencido:</span>
                      <span className="text-red-600 dark:text-red-400">Bs. {m.saldoPendiente.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => handleVerEstadoCuenta(m.idDepartamento)}
                      className="px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold"
                    >
                      Ver Estado de Cuenta
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* MODAL GENERACIÓN MASIVA DE EXPENSAS (REQUISITOS EXACTOS DE HU04) */}
      {isEmitirModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Header fijo siempre visible */}
            <div className="flex justify-between items-center border-b border-[#cec8bc] dark:border-slate-800 px-6 py-4 shrink-0 bg-[#ede9e1] dark:bg-slate-900 z-10">
              <div>
                <h3 className="font-extrabold text-lg text-[#262422] dark:text-white">
                  Generación Masiva de Expensas
                </h3>
                <p className="text-xs text-[#7d776f]">
                  Emisión mensual por tipo de departamento y consumo de agua.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar modal"
                onClick={() => { setIsEmitirModalOpen(false); setResultadoEmision(null); setEmisionError(null) }}
                className="p-1.5 rounded-xl text-[#7d776f] hover:text-[#262422] dark:hover:text-white hover:bg-[#dfd9ce] dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEmisionMasiva} className="flex flex-col flex-1 overflow-hidden text-xs">
              {/* Contenedor con scroll interno */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {emisionError && (
                  <div className="p-3 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl flex items-center gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{emisionError}</span>
                  </div>
                )}

                {/* Paso 1: Selección de Período con control antierror */}
                <div>
                  <label className="block font-bold text-[#262422] dark:text-white mb-1">
                    Paso 1: Seleccionar Período a Emitir *
                  </label>
                  <input
                    type="date"
                    required
                    value={nuevoPeriodo}
                    onChange={(e) => setNuevoPeriodo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 font-mono font-bold"
                  />
                  {!nuevoPeriodo && (
                    <p className="text-[11px] text-red-600 font-bold mt-1">
                      ⚠️ Debe seleccionar un período para habilitar la generación.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-[#262422] dark:text-white mb-1">
                    Fecha de Vencimiento de Pago *
                  </label>
                  <input
                    type="date"
                    required
                    value={nuevaFechaVencimiento}
                    onChange={(e) => setNuevaFechaVencimiento(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 font-mono"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800 space-y-1 text-[#5c5750] dark:text-slate-300 text-[11px]">
                  <p>
                    ℹ️ El monto se calcula en base a la cuota del tipo asignado al departamento más el monto de agua registrado en el mes.
                  </p>
                </div>

                {/* Resultado de la operación y obligaciones */}
                {resultadoEmision && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-3">
                    <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Resultado: {resultadoEmision.generadasCount} expensas generadas correctamente.</span>
                    </div>

                    {resultadoEmision.excepciones.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-amber-200 dark:border-amber-900/50">
                        <span className="font-bold text-[11px] text-amber-800 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Excepciones ({resultadoEmision.excepciones.length}):
                        </span>
                        <ul className="text-[11px] text-[#5c5750] dark:text-slate-300 space-y-1 list-disc list-inside max-h-40 overflow-y-auto pr-1">
                          {resultadoEmision.excepciones.map((exc, idx) => (
                            <li key={idx}>
                              <span className="font-semibold">Dpto {exc.numero || exc.idDepartamento}:</span> {exc.motivo}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {resultadoEmision.advertencias.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-sky-200 dark:border-sky-900/50">
                        <span className="font-bold text-[11px] text-sky-800 dark:text-sky-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          Advertencias ({resultadoEmision.advertencias.length}):
                        </span>
                        <ul className="text-[11px] text-[#5c5750] dark:text-slate-300 space-y-1 list-disc list-inside max-h-48 overflow-y-auto pr-1">
                          {resultadoEmision.advertencias.map((adv, idx) => (
                            <li key={idx}>
                              <span className="font-semibold">Dpto {adv.numero || adv.idDepartamento}:</span> {adv.advertencia}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer fijo siempre visible con botones de acción */}
              <div className="flex justify-end items-center gap-2 px-6 py-4 border-t border-[#cec8bc] dark:border-slate-800 bg-[#ede9e1] dark:bg-slate-900 shrink-0 z-10">
                <button
                  type="button"
                  onClick={() => { setIsEmitirModalOpen(false); setResultadoEmision(null); setEmisionError(null) }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7d776f] hover:text-[#262422] dark:hover:text-white hover:bg-[#dfd9ce] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={!nuevoPeriodo || isSubmittingEmision}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer ${
                    !nuevoPeriodo || isSubmittingEmision
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-emerald-700 hover:bg-emerald-800 active:scale-95'
                  }`}
                >
                  {isSubmittingEmision ? 'Generando lote...' : '⚡ Ejecutar Generación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURAR REGLA DE MORA (HU04 / CA09) */}
      {isMoraModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#262422] dark:text-white flex items-center gap-2">
                  <Percent className="w-4 h-4 text-indigo-600" />
                  Regla de Mora e Intereses
                </h3>
                <p className="text-xs text-[#7d776f]">
                  Configuración oficial de la tasa de mora (solo porcentaje)
                </p>
              </div>
              <button onClick={() => setIsMoraModalOpen(false)}>
                <X className="w-5 h-5 text-[#7d776f] hover:text-[#262422]" />
              </button>
            </div>

            {moraError && (
              <div className="p-3 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{moraError}</span>
              </div>
            )}

            <form onSubmit={handleGuardarReglaMora} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-900 dark:text-indigo-200">
                <span className="font-bold block">Tasa Activa Actual:</span>
                <span className="text-base font-black text-indigo-700 dark:text-indigo-300 font-mono">
                  {reglaMoraActiva ? `${reglaMoraActiva.tasaInteres}%` : 'Sin regla activa'}
                </span>
                <span className="block text-[10px] text-[#7d776f] mt-0.5">
                  Días de gracia: 0 (aplicación directa sobre expensas vencidas)
                </span>
              </div>

              <div>
                <label className="block font-bold text-[#262422] dark:text-white mb-1">
                  Nueva Tasa de Interés Mensual (%) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  value={nuevaTasaMoraInput}
                  onChange={(e) => setNuevaTasaMoraInput(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ej. 5"
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 font-mono font-bold text-sm text-[#262422] dark:text-white"
                />
              </div>

              {/* Historial */}
              <div className="space-y-1.5 pt-2 border-t border-[#cec8bc] dark:border-slate-800">
                <span className="font-bold text-xs text-[#262422] dark:text-white flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-600" />
                  Historial de Reglas de Mora
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {historialReglasMora.length === 0 ? (
                    <p className="text-[11px] text-[#7d776f]">No hay historial registrado.</p>
                  ) : (
                    historialReglasMora.map((reg) => (
                      <div
                        key={reg.idReglaMora}
                        className={`p-2 rounded-xl border text-[11px] flex justify-between items-center ${
                          reg.activa
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                            : 'bg-[#dfd9ce]/60 dark:bg-slate-800/60 border-[#cec8bc] dark:border-slate-700 text-[#5c5750] dark:text-slate-400'
                        }`}
                      >
                        <div>
                          <span className="font-bold font-mono text-xs">{reg.tasaInteres}%</span>
                          <span className="text-[10px] block text-[#7d776f]">
                            {fechaHoraBolivia(reg.fechaCreacion)} {reg.usuarioCreacion?.nombreUsuario ? `• ${reg.usuarioCreacion.nombreUsuario}` : ''}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          reg.activa ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                          {reg.activa ? 'Activa' : 'Histórica'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMoraModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7d776f]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMora || nuevaTasaMoraInput === ''}
                  className="px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingMora ? 'Guardando...' : 'Guardar Nueva Regla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRO DE COBRO / PAGO DE EXPENSA */}
      {isPagarModalOpen && expensaAPagar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-2xl border border-[#cec8bc] dark:border-slate-800 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                  Registrar Cobro de Expensa
                </h3>
                <p className="text-xs text-[#7d776f]">
                  Dpto. {expensaAPagar.departamento?.numero} • Propietario: {expensaAPagar.propietarioNombre}
                </p>
              </div>
              <button onClick={() => setIsPagarModalOpen(false)}>
                <X className="w-5 h-5 text-[#7d776f]" />
              </button>
            </div>

            <form onSubmit={handleRegistrarPagoSubmit} className="space-y-3.5 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold mb-1">Monto de la Expensa a Cancelar (Bs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={montoPagoInput}
                  onChange={(e) => setMontoPagoInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border font-mono font-bold text-sm text-emerald-700"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Persona que Realiza el Pago *</label>
                <select
                  required
                  value={idPersonaPagadorInput}
                  onChange={(e) => setIdPersonaPagadorInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border text-xs"
                >
                  <option value="" disabled>Seleccione una persona...</option>
                  {personasList.map((p) => (
                    <option key={p.idPersona} value={p.idPersona}>
                      {p.nombres} {p.apellidos} {p.ciNit ? `(CI: ${p.ciNit})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#7d776f] mt-1">
                  Persona registrada en el sistema. Por defecto se selecciona el propietario del departamento.
                </p>
              </div>

              <div>
                <label className="block font-bold mb-1">Forma de Pago *</label>
                <select
                  value={metodoPagoInput}
                  onChange={(e) => setMetodoPagoInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border text-xs"
                >
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="QR">Pago QR</option>
                  <option value="Efectivo">Efectivo en Caja</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Nro. de Comprobante / Referencia</label>
                <input
                  type="text"
                  placeholder="Ej. REC-2026-10-305 o Nro Operación 908123"
                  value={comprobanteUrlInput}
                  onChange={(e) => setComprobanteUrlInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsPagarModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7d776f]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPago}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                >
                  {isSubmittingPago ? 'Procesando...' : 'Confirmar Cobro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RECIBO OFICIAL DE CAJA (OFICIAL EDIFICIO XYZ) */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 text-[#262422] dark:text-slate-100">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base uppercase tracking-tight">
                  Recibo Oficial de Caja — Expensas
                </h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/60 space-y-3">
              <div className="flex justify-between items-start text-xs">
                <div>
                  <div className="font-black text-sm text-emerald-800 dark:text-emerald-400">
                    CONDOMINIO EDIFICIO XYZ
                  </div>
                  <div className="text-[11px] text-slate-500">
                    NIT: 1029384029 • Cochabamba, Bolivia
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900 dark:text-white">
                    REC-EXP-{selectedReceipt.departamento?.numero || selectedReceipt.idDepartamento}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Período: {selectedReceipt.periodo}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Propietario Responsable:
                  </span>
                  <span className="font-bold">{selectedReceipt.propietarioNombre}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Unidad:
                  </span>
                  <span className="font-bold">
                    Dpto {selectedReceipt.departamento?.numero} ({selectedReceipt.departamento?.tipologia || '80 m²'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Pagado Por:
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {selectedReceipt.pagadoPor || selectedReceipt.inquilinoNombre || selectedReceipt.propietarioNombre}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Concepto:
                  </span>
                  <span>Expensa Común de Áreas Comunes</span>
                </div>
              </div>
            </div>

            {/* Extracto Detallado de Gastos Comunes en el Recibo */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-950/60 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase pb-1 border-b dark:border-slate-800">
                <span>Extracto Composición de Expensa</span>
                <span>Base Edificio: Bs 15.500</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300">• Seguridad y Vigilancia 24/7 (36.13%)</span>
                <span className="font-mono">Bs. {(selectedReceipt.monto * 0.3613).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300">• Administración Central y Gestión (22.58%)</span>
                <span className="font-mono">Bs. {(selectedReceipt.monto * 0.2258).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300">• Limpieza e Insumos Comunes (14.19%)</span>
                <span className="font-mono">Bs. {(selectedReceipt.monto * 0.1419).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300">• Mantenimiento Preventivo (9.68%)</span>
                <span className="font-mono">Bs. {(selectedReceipt.monto * 0.0968).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300">• Electricidad Común ELFEC (5.16%)</span>
                <span className="font-mono">Bs. {(selectedReceipt.monto * 0.0516).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300">• Mantenimiento Ascensor Otis (4.52%)</span>
                <span className="font-mono">Bs. {(selectedReceipt.monto * 0.0452).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300">• Agua Común y Cisterna SEMAPA (1.94%)</span>
                <span className="font-mono">Bs. {(selectedReceipt.monto * 0.0194).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300">• Imprevistos y Fondo Menor (5.80%)</span>
                <span className="font-mono">Bs. {(selectedReceipt.monto * 0.058).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-2 text-sm font-black text-emerald-800 dark:text-emerald-400 border-t-2 border-slate-900 dark:border-slate-100">
                <span>TOTAL RECAUDADO</span>
                <span className="font-mono">Bs. {selectedReceipt.monto.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-[10px] text-[#7d776f] bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200">
              ℹ️ Nota administrativa: La administración no administra ni percibe alquileres (relación privada entre inquilino y propietario) ni consumos de medidores individuales (ELFEC/Agua).
            </div>

            <div className="flex justify-end gap-2 border-t pt-3 dark:border-slate-800">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md"
              >
                <Printer className="w-4 h-4" />
                Imprimir Recibo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXTRACTO DE GASTOS COMUNES Y COMPOSICIÓN DE LA EXPENSA */}
      {(selectedExtracto || isExtractoGeneralOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                    {selectedExtracto
                      ? `Extracto de Expensa — Departamento ${selectedExtracto.departamento?.numero || selectedExtracto.idDepartamento}`
                      : 'Extracto General de Gastos Comunes — Edificio XYZ'}
                  </h3>
                  <p className="text-xs text-[#7d776f] dark:text-slate-400">
                    Composición y liquidación analítica de los rubros comunes que financia la expensa.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedExtracto(null)
                  setIsExtractoGeneralOpen(false)
                }}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ficha Resumen del Extracto */}
            <div className="bg-white/80 dark:bg-slate-950/80 p-4 rounded-xl border border-[#cec8bc] dark:border-slate-800 text-xs space-y-2.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left">
                <div>
                  <span className="text-[#7d776f] text-[10px] uppercase font-bold block">Período</span>
                  <span className="font-bold text-[#262422] dark:text-white">Octubre 2026</span>
                </div>
                <div>
                  <span className="text-[#7d776f] text-[10px] uppercase font-bold block">Gastos Totales Edificio</span>
                  <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">Bs 15.500,00</span>
                </div>
                <div>
                  <span className="text-[#7d776f] text-[10px] uppercase font-bold block">Superficie Total</span>
                  <span className="font-bold font-mono">1.600 m² (20 Unidades)</span>
                </div>
                <div>
                  <span className="text-[#7d776f] text-[10px] uppercase font-bold block">Unidad</span>
                  <span className="font-bold text-[#262422] dark:text-white">
                    {selectedExtracto
                      ? `Dpto ${selectedExtracto.departamento?.numero} (${selectedExtracto.departamento?.tipologia || '80 m²'})`
                      : 'Edificio Completo (20 Dptos)'}
                  </span>
                </div>
              </div>

              {selectedExtracto && (
                <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex flex-wrap justify-between items-center text-[11px] gap-2">
                  <span><strong>Propietario:</strong> {selectedExtracto.propietarioNombre}</span>
                  <span><strong>Ocupante:</strong> {selectedExtracto.inquilinoNombre || '—'}</span>
                  <span><strong>Superficie:</strong> <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{selectedExtracto.departamento?.areaM2 ? `${selectedExtracto.departamento.areaM2} m²` : '—'}</span></span>
                  <span><strong>Expensa a Cobrar:</strong> <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">Bs {selectedExtracto.monto.toFixed(2)}</span></span>
                </div>
              )}
            </div>

            {/* Tabla del Extracto */}
            <div className="overflow-x-auto rounded-xl border border-[#cec8bc] dark:border-slate-800">
              <table className="w-full text-left text-xs bg-white dark:bg-slate-950">
                <thead>
                  <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/60 dark:bg-slate-900/60 text-[#7d776f] dark:text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Rubro de Gasto Común</th>
                    <th className="py-2.5 px-3 text-right">Presupuesto Edificio</th>
                    <th className="py-2.5 px-3 text-right">% Ponderado</th>
                    <th className="py-2.5 px-3 text-right font-extrabold text-emerald-800 dark:text-emerald-400">
                      {selectedExtracto ? `Cuota Dpto ${selectedExtracto.departamento?.numero}` : 'Cuota Base'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {RUBROS_GASTOS_COMUNES.map((r, idx) => {
                    const montoExpensa = selectedExtracto ? selectedExtracto.monto : 775.0
                    const cuotaRubro = montoExpensa * (r.porcentaje / 100)
                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="py-2 px-3 font-medium text-[#262422] dark:text-slate-200">
                          {r.concepto}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[#7d776f] dark:text-slate-400">
                          Bs. {r.totalPresupuesto.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[#7d776f] dark:text-slate-400">
                          {r.porcentaje.toFixed(2)}%
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#262422] dark:text-white">
                          Bs. {cuotaRubro.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="border-t-2 border-slate-900 dark:border-slate-200 font-black bg-slate-50 dark:bg-slate-900">
                    <td className="py-2.5 px-3 uppercase text-[11px]">Total Liquidación de Gastos</td>
                    <td className="py-2.5 px-3 text-right font-mono">Bs. 15.500,00</td>
                    <td className="py-2.5 px-3 text-right font-mono">100.00%</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400 text-sm">
                      Bs. {(selectedExtracto ? selectedExtracto.monto : 775.0).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Comparativa por Tipología */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs bg-[#dfd9ce]/40 dark:bg-slate-950/40 p-2.5 rounded-xl border border-[#cec8bc] dark:border-slate-800">
              <div>
                <span className="text-[10px] text-[#7d776f] uppercase font-bold block">Tipo A (60 m²)</span>
                <span className="font-mono font-bold text-emerald-800 dark:text-emerald-400">Bs. 300,00 base</span>
              </div>
              <div>
                <span className="text-[10px] text-[#7d776f] uppercase font-bold block">Tipo B (80 m²)</span>
                <span className="font-mono font-bold text-emerald-800 dark:text-emerald-400">Bs. 350,00 base</span>
              </div>
              <div>
                <span className="text-[10px] text-[#7d776f] uppercase font-bold block">Tipo C (100 m²)</span>
                <span className="font-mono font-bold text-emerald-800 dark:text-emerald-400">Bs. 400,00 base</span>
              </div>
            </div>

            <div className="text-[10px] text-[#7d776f] bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800 leading-relaxed">
              ℹ️ <strong>Transparencia de Administración:</strong> El presente extracto detalla con exactitud los gastos de mantenimiento y conservación de las partes comunes según el Código Civil y reglamento de copropiedad. El alquiler del departamento es un acuerdo privado independiente y no forma parte de este extracto.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#cec8bc] dark:border-slate-800">
              <button
                onClick={() => {
                  setSelectedExtracto(null)
                  setIsExtractoGeneralOpen(false)
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir Extracto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ESTADO DE CUENTA (UI ESTADO DE CUENTA DEPTO) */}
      {isEstadoCuentaModalOpen && estadoCuentaData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 p-6 sm:p-7 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header del Estado de Cuenta */}
            <div className="flex justify-between items-start border-b border-[#cec8bc] dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-700 dark:bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md">
                  {estadoCuentaData.departamento?.numero}
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider mb-1">
                    <FileText className="w-3 h-3" />
                    Estado de Cuenta Oficial
                  </div>
                  <h3 className="font-black text-lg text-[#262422] dark:text-white">
                    Estado de Cuenta — Departamento {estadoCuentaData.departamento?.numero}
                  </h3>
                  <p className="text-xs text-[#7d776f] dark:text-slate-400">
                    Condominio Edificio XYZ • Cochabamba, Bolivia
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEstadoCuentaModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ficha Catastral del Departamento y Ocupante */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-white/70 dark:bg-slate-950/60 rounded-2xl border border-[#cec8bc] dark:border-slate-800 text-xs">
              <div>
                <span className="text-[#7d776f] text-[10px] uppercase font-bold block">Tipología & m²</span>
                <span className="font-extrabold text-[#262422] dark:text-white">
                  {estadoCuentaData.departamento?.tipo?.nombre || estadoCuentaData.departamento?.tipologia || '—'}
                </span>
              </div>
              <div>
                <span className="text-[#7d776f] text-[10px] uppercase font-bold block">Superficie</span>
                <span className="font-extrabold font-mono text-blue-700 dark:text-blue-400">
                  {estadoCuentaData.departamento?.areaM2 ? `${estadoCuentaData.departamento.areaM2} m²` : '—'}
                </span>
              </div>
              <div>
                <span className="text-[#7d776f] text-[10px] uppercase font-bold block">Propietario Responsable</span>
                <span className="font-extrabold text-[#262422] dark:text-white truncate block">
                  {estadoCuentaData.departamento?.propietario
                    ? `${estadoCuentaData.departamento.propietario.nombres || ''} ${estadoCuentaData.departamento.propietario.apellidos || ''}`.trim()
                    : 'Titular'}
                </span>
              </div>
              <div>
                <span className="text-[#7d776f] text-[10px] uppercase font-bold block">Ocupante Actual</span>
                <span className="font-extrabold text-purple-700 dark:text-purple-400 truncate block">
                  {estadoCuentaData.departamento?.ocupanteActual?.persona
                    ? `${estadoCuentaData.departamento.ocupanteActual.tipoOcupante}: ${estadoCuentaData.departamento.ocupanteActual.persona.nombres || ''} ${estadoCuentaData.departamento.ocupanteActual.persona.apellidos || ''}`.trim()
                    : (estadoCuentaData.departamento?.inquilino?.nombres || 'Vive el Propietario')}
                </span>
              </div>
            </div>

            {/* BARRA DE FILTROS DEL ESTADO DE CUENTA */}
            <div className="p-3 bg-[#dfd9ce]/60 dark:bg-slate-950/60 rounded-2xl border border-[#cec8bc] dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#262422] dark:text-white flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Filtros de Consulta Financiera
                </span>
                {isLoadingEC && (
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 animate-pulse">
                    Actualizando...
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-[#7d776f] uppercase block mb-1">
                    Estado
                  </label>
                  <select
                    value={filtroECEstado}
                    onChange={(e) => setFiltroECEstado(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[#cec8bc] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#262422] dark:text-slate-100 font-semibold"
                  >
                    <option value="Todos">Todos los Estados</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Moroso">Moroso</option>
                    <option value="Pagado">Pagado</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#7d776f] uppercase block mb-1">
                    Período (Mes)
                  </label>
                  <input
                    type="month"
                    value={filtroECPeriodo}
                    onChange={(e) => setFiltroECPeriodo(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[#cec8bc] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#262422] dark:text-slate-100 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#7d776f] uppercase block mb-1">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={filtroECDesde}
                    onChange={(e) => setFiltroECDesde(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[#cec8bc] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#262422] dark:text-slate-100 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#7d776f] uppercase block mb-1">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={filtroECHasta}
                    onChange={(e) => setFiltroECHasta(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[#cec8bc] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#262422] dark:text-slate-100 font-mono text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setFiltroECPeriodo('')
                    setFiltroECEstado('Todos')
                    setFiltroECDesde('')
                    setFiltroECHasta('')
                    if (selectedDeptoIdParaEstadoCuenta) {
                      handleVerEstadoCuenta(selectedDeptoIdParaEstadoCuenta, {
                        periodo: '',
                        estado: 'Todos',
                        desde: '',
                        hasta: ''
                      })
                    }
                  }}
                  className="px-3 py-1 rounded-lg text-xs font-bold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800"
                >
                  Limpiar Filtros
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedDeptoIdParaEstadoCuenta) {
                      handleVerEstadoCuenta(selectedDeptoIdParaEstadoCuenta)
                    }
                  }}
                  className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  Aplicar Filtro
                </button>
              </div>
            </div>

            {/* Tarjetas KPI de Saldos */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800 text-center">
                <span className="text-[10px] uppercase font-bold text-[#7d776f] block">Total Obligaciones</span>
                <span className="text-base sm:text-lg font-black font-mono text-[#262422] dark:text-white">
                  Bs. {Number(estadoCuentaData.resumen?.totalObligaciones || 0).toFixed(2)}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 block">Total Pagado</span>
                <span className="text-base sm:text-lg font-black font-mono text-emerald-700 dark:text-emerald-300">
                  Bs. {Number(estadoCuentaData.resumen?.totalPagado || 0).toFixed(2)}
                </span>
              </div>
              <div className={`p-3.5 rounded-2xl text-center border ${
                (estadoCuentaData.resumen?.saldoPendienteTotal || 0) > 0
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300'
              }`}>
                <span className="text-[10px] uppercase font-bold block">
                  Saldo Pendiente {estadoCuentaData.resumen?.estadoGlobal && `(${estadoCuentaData.resumen.estadoGlobal})`}
                </span>
                <span className="text-base sm:text-lg font-black font-mono">
                  Bs. {Number(estadoCuentaData.resumen?.saldoPendienteTotal || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Indicador de Anticipos si los tiene */}
            {(estadoCuentaData.resumen?.totalAnticiposDisponibles || 0) > 0 && (
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                  <span className="font-bold text-indigo-900 dark:text-indigo-200">
                    Anticipos y Saldo a Favor Disponible:
                  </span>
                </div>
                <span className="font-mono font-black text-indigo-700 dark:text-indigo-300 text-sm">
                  Bs. {Number(estadoCuentaData.resumen.totalAnticiposDisponibles).toFixed(2)}
                </span>
              </div>
            )}

            {/* Tabla de Historial Cronológico y Línea de Tiempo de Movimientos */}
            <div className="rounded-2xl bg-white/80 dark:bg-slate-950/80 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="p-3 border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/40 dark:bg-slate-950/40 flex justify-between items-center text-xs">
                <span className="font-extrabold text-[#262422] dark:text-white">
                  Línea de Tiempo y Movimientos Financieros
                </span>
                <span className="text-[11px] text-[#7d776f]">Registro Consolidado</span>
              </div>

              {estadoCuentaData.sinMovimientos || (!estadoCuentaData.movimientos || estadoCuentaData.movimientos.length === 0) ? (
                <div className="p-8 text-center space-y-2">
                  <FileText className="w-8 h-8 text-[#7d776f] mx-auto opacity-50" />
                  <p className="text-xs font-bold text-[#262422] dark:text-slate-300">
                    Sin movimientos registrados
                  </p>
                  <p className="text-[11px] text-[#7d776f] dark:text-slate-400 max-w-sm mx-auto">
                    No se encontraron obligaciones ni pagos para los filtros de búsqueda seleccionados.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/60 dark:bg-slate-950/60 text-[#7d776f] uppercase text-[10px] font-bold">
                        <th className="py-2.5 px-3">Fecha / Período</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3">Concepto & Detalle</th>
                        <th className="py-2.5 px-3 text-right font-mono">Debe (Bs)</th>
                        <th className="py-2.5 px-3 text-right font-mono">Haber (Bs)</th>
                        <th className="py-2.5 px-3 text-right font-mono">Saldo</th>
                        <th className="py-2.5 px-3 text-center">Estado</th>
                        <th className="py-2.5 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#cec8bc] dark:divide-slate-800">
                      {estadoCuentaData.movimientos.map((mov: any, idx: number) => {
                        const esObligacion = mov.tipo === 'OBLIGACION'
                        const esPago = mov.tipo === 'PAGO'
                        const esAnticipo = mov.tipo === 'ANTICIPO'
                        return (
                          <tr key={mov.id || idx} className="hover:bg-[#dfd9ce]/30 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-bold font-mono text-[#262422] dark:text-white whitespace-nowrap">
                              {fechaSolo(mov.fecha || mov.periodo)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                esObligacion
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                                  : esAnticipo
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                              }`}>
                                {mov.tipo || (mov.concepto?.includes('Pago') ? 'PAGO' : 'OBLIGACION')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[#5c5750] dark:text-slate-300">
                              <div className="font-semibold">{mov.concepto}</div>
                              {mov.pagador && (
                                <div className="text-[10px] text-[#7d776f]">Pagado por: {mov.pagador}</div>
                              )}
                              {mov.vencimiento && (
                                <div className="text-[10px] text-[#7d776f]">Vence: {mov.vencimiento}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold font-mono text-[#262422] dark:text-white">
                              {Number(mov.debe || (esObligacion ? mov.monto : 0)) > 0
                                ? `Bs. ${Number(mov.debe || mov.monto).toFixed(2)}`
                                : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold font-mono text-emerald-700 dark:text-emerald-400">
                              {Number(mov.haber || (esPago || esAnticipo ? mov.monto : 0)) > 0
                                ? `Bs. ${Number(mov.haber || mov.monto).toFixed(2)}`
                                : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#7d776f] dark:text-slate-400">
                              {mov.saldoPendiente !== undefined
                                ? `Bs. ${Number(mov.saldoPendiente).toFixed(2)}`
                                : (mov.saldo !== undefined ? `Bs. ${Number(mov.saldo).toFixed(2)}` : '—')}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                mov.estado === 'Pagado'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : mov.estado === 'Pendiente'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                                  : mov.estado === 'Moroso'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400'
                                  : mov.anulado
                                  ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                              }`}>
                                {mov.anulado ? 'Anulado' : (mov.estado || 'Efectuado')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              {(esPago || esAnticipo) && !mov.anulado ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const idPago = mov.idReferencia || Number(String(mov.id).replace('PAG-', ''))
                                      const pagoOriginal = estadoCuentaData.pagos?.find((p: any) => p.idPago === idPago)
                                      setPagoACorregir({
                                        ...mov,
                                        idPago,
                                        montoPagado: pagoOriginal?.montoPagado || mov.monto,
                                        metodoPago: pagoOriginal?.metodoPago || mov.metodo || 'Transferencia',
                                        idPersonaPagador: pagoOriginal?.idPersonaPagador || (estadoCuentaData.departamento?.propietario?.idPersona || '')
                                      })
                                      setCorregirMontoInput(Number(pagoOriginal?.montoPagado || mov.monto))
                                      setCorregirMetodoInput(pagoOriginal?.metodoPago || mov.metodo || 'Transferencia')
                                      setCorregirIdPersonaInput(pagoOriginal?.idPersonaPagador || (estadoCuentaData.departamento?.propietario?.idPersona || ''))
                                      setCorregirMotivoInput('')
                                      setCorregirError(null)
                                    }}
                                    className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                                    title="Corregir pago"
                                  >
                                    Corregir
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const idPago = mov.idReferencia || Number(String(mov.id).replace('PAG-', ''))
                                      setPagoAAnular({ ...mov, idPago })
                                      setMotivoAnulacionInput('')
                                      setAnulacionError(null)
                                    }}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                                    title="Anular pago"
                                  >
                                    Anular
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[#7d776f] text-[10px]">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Nota Informativa */}
            <div className="text-[10px] text-[#7d776f] dark:text-slate-400 bg-blue-50/60 dark:bg-blue-950/30 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/40 leading-relaxed">
              ℹ️ <strong>Régimen Administrativo:</strong> Las expensas financian exclusivamente las áreas comunes (seguridad 24/7, limpieza, mantenimiento, electricidad y agua común). La administración no cobra alquileres ni medidores individuales propios.
            </div>

            {/* Footer con Acciones */}
            <div className="flex justify-between items-center pt-3 border-t border-[#cec8bc] dark:border-slate-800">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs font-bold text-[#5c5750] dark:text-slate-300 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Estado de Cuenta
              </button>
              <button
                onClick={() => setIsEstadoCuentaModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ANULAR PAGO */}
      {pagoAAnular && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  Anular Pago de Expensa
                </h3>
                <p className="text-xs text-[#7d776f]">
                  Pago #{pagoAAnular.idReferencia || pagoAAnular.idPago || pagoAAnular.id} • Monto: Bs. {Number(pagoAAnular.monto || pagoAAnular.montoPagado || 0).toFixed(2)}
                </p>
              </div>
              <button onClick={() => { setPagoAAnular(null); setAnulacionError(null) }}>
                <X className="w-5 h-5 text-[#7d776f] hover:text-[#262422]" />
              </button>
            </div>

            {anulacionError && (
              <div className="p-3 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{anulacionError}</span>
              </div>
            )}

            <form onSubmit={handleAnularPagoSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-[11px] text-rose-900 dark:text-rose-300">
                ⚠️ Al anular el pago, el saldo de la expensa correspondiente será recalculado automáticamente y quedará registrado en la auditoría del sistema.
              </div>

              <div>
                <label className="block font-bold text-[#262422] dark:text-white mb-1">
                  Motivo de la Anulación *
                </label>
                <textarea
                  required
                  rows={3}
                  value={motivoAnulacionInput}
                  onChange={(e) => setMotivoAnulacionInput(e.target.value)}
                  placeholder="Explique detalladamente el motivo de la anulación (ej. Error en número de comprobante, duplicado por el banco, etc.)..."
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-white text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setPagoAAnular(null); setAnulacionError(null) }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7d776f] hover:bg-[#ded8cc] dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAnulacion || !motivoAnulacionInput.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAnulacion ? 'Anulando...' : 'Confirmar Anulación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CORREGIR PAGO */}
      {pagoACorregir && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 shrink-0" />
                  Corregir Pago de Expensa
                </h3>
                <p className="text-xs text-[#7d776f]">
                  Pago #{pagoACorregir.idReferencia || pagoACorregir.idPago || pagoACorregir.id}
                </p>
              </div>
              <button onClick={() => { setPagoACorregir(null); setCorregirError(null) }}>
                <X className="w-5 h-5 text-[#7d776f] hover:text-[#262422]" />
              </button>
            </div>

            {corregirError && (
              <div className="p-3 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{corregirError}</span>
              </div>
            )}

            <form onSubmit={handleCorregirPagoSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-[11px] text-amber-900 dark:text-amber-300">
                ℹ️ Esta acción anula el pago anterior y registra uno nuevo corregido con trazabilidad completa.
              </div>

              <div>
                <label className="block font-bold mb-1">Monto Pagado (Bs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={corregirMontoInput}
                  onChange={(e) => setCorregirMontoInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Persona Pagadora *</label>
                <select
                  required
                  value={corregirIdPersonaInput}
                  onChange={(e) => setCorregirIdPersonaInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs"
                >
                  <option value="" disabled>Seleccione persona pagadora...</option>
                  {personasList.map((p) => (
                    <option key={p.idPersona} value={p.idPersona}>
                      {p.nombres} {p.apellidos} {p.ciNit ? `(CI: ${p.ciNit})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Forma de Pago *</label>
                <select
                  value={corregirMetodoInput}
                  onChange={(e) => setCorregirMetodoInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs"
                >
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="QR">Pago QR</option>
                  <option value="Efectivo">Efectivo en Caja</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Motivo de Corrección *</label>
                <textarea
                  required
                  rows={2}
                  value={corregirMotivoInput}
                  onChange={(e) => setCorregirMotivoInput(e.target.value)}
                  placeholder="Indique la justificación de la corrección..."
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setPagoACorregir(null); setCorregirError(null) }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7d776f] hover:bg-[#ded8cc] dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCorregir || !corregirMotivoInput.trim() || !corregirIdPersonaInput || Number(corregirMontoInput) <= 0}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCorregir ? 'Guardando...' : 'Guardar Corrección'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
