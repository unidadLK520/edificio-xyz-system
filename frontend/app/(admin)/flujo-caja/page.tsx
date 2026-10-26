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
  Download,
  Building,
  CreditCard,
  Layers,
  FileText,
  BarChart3,
  PieChart,
  LineChart,
  Sliders,
  RefreshCw,
  TrendingUp,
  TrendingDown
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

export interface MesFlujoData {
  mes: string
  mesCorto: string
  saldoInicial: number
  ingresosOrdinarios: number // Expensas A, B, C y agua
  ingresosExtraordinarios: number // Salón de eventos, multas, intereses
  totalIngresos: number
  egresosOperativos: number // Servicios, seguridad, limpieza
  egresosMantenimiento: number // Ascensores, bombas, reparaciones
  egresosAdministrativos: number // Software, suministros, honorarios
  totalEgresos: number
  flujoNeto: number // totalIngresos - totalEgresos
  saldoFinal: number
}

// Datos anuales reales basados en el modelo de 20 departamentos del Edificio XYZ
export const FLUX_DATA_2026: MesFlujoData[] = [
  {
    mes: 'Enero 2026',
    mesCorto: 'Ene',
    saldoInicial: 15000,
    ingresosOrdinarios: 7420,
    ingresosExtraordinarios: 1200,
    totalIngresos: 8620,
    egresosOperativos: 3800,
    egresosMantenimiento: 1600,
    egresosAdministrativos: 850,
    totalEgresos: 6250,
    flujoNeto: 2370,
    saldoFinal: 17370
  },
  {
    mes: 'Febrero 2026',
    mesCorto: 'Feb',
    saldoInicial: 17370,
    ingresosOrdinarios: 7150,
    ingresosExtraordinarios: 950,
    totalIngresos: 8100,
    egresosOperativos: 3950,
    egresosMantenimiento: 2100,
    egresosAdministrativos: 780,
    totalEgresos: 6830,
    flujoNeto: 1270,
    saldoFinal: 18640
  },
  {
    mes: 'Marzo 2026',
    mesCorto: 'Mar',
    saldoInicial: 18640,
    ingresosOrdinarios: 7600,
    ingresosExtraordinarios: 1500,
    totalIngresos: 9100,
    egresosOperativos: 3750,
    egresosMantenimiento: 1400,
    egresosAdministrativos: 900,
    totalEgresos: 6050,
    flujoNeto: 3050,
    saldoFinal: 21690
  },
  {
    mes: 'Abril 2026',
    mesCorto: 'Abr',
    saldoInicial: 21690,
    ingresosOrdinarios: 6980,
    ingresosExtraordinarios: 800,
    totalIngresos: 7780,
    egresosOperativos: 4100,
    egresosMantenimiento: 2800,
    egresosAdministrativos: 820,
    totalEgresos: 7720,
    flujoNeto: 60,
    saldoFinal: 21750
  },
  {
    mes: 'Mayo 2026',
    mesCorto: 'May',
    saldoInicial: 21750,
    ingresosOrdinarios: 7750,
    ingresosExtraordinarios: 1800,
    totalIngresos: 9550,
    egresosOperativos: 3850,
    egresosMantenimiento: 1550,
    egresosAdministrativos: 890,
    totalEgresos: 6290,
    flujoNeto: 3260,
    saldoFinal: 25010
  },
  {
    mes: 'Junio 2026',
    mesCorto: 'Jun',
    saldoInicial: 25010,
    ingresosOrdinarios: 7300,
    ingresosExtraordinarios: 1100,
    totalIngresos: 8400,
    egresosOperativos: 3900,
    egresosMantenimiento: 1900,
    egresosAdministrativos: 850,
    totalEgresos: 6650,
    flujoNeto: 1750,
    saldoFinal: 26760
  },
  {
    mes: 'Julio 2026',
    mesCorto: 'Jul',
    saldoInicial: 26760,
    ingresosOrdinarios: 7550,
    ingresosExtraordinarios: 1400,
    totalIngresos: 8950,
    egresosOperativos: 3800,
    egresosMantenimiento: 1350,
    egresosAdministrativos: 910,
    totalEgresos: 6060,
    flujoNeto: 2890,
    saldoFinal: 29650
  },
  {
    mes: 'Agosto 2026',
    mesCorto: 'Ago',
    saldoInicial: 29650,
    ingresosOrdinarios: 7400,
    ingresosExtraordinarios: 1300,
    totalIngresos: 8700,
    egresosOperativos: 3950,
    egresosMantenimiento: 2200,
    egresosAdministrativos: 840,
    totalEgresos: 6990,
    flujoNeto: 1710,
    saldoFinal: 31360
  },
  {
    mes: 'Septiembre 2026',
    mesCorto: 'Sep',
    saldoInicial: 31360,
    ingresosOrdinarios: 7850,
    ingresosExtraordinarios: 1650,
    totalIngresos: 9500,
    egresosOperativos: 3820,
    egresosMantenimiento: 1450,
    egresosAdministrativos: 880,
    totalEgresos: 6150,
    flujoNeto: 3350,
    saldoFinal: 34710
  },
  {
    mes: 'Octubre 2026',
    mesCorto: 'Oct',
    saldoInicial: 34710,
    ingresosOrdinarios: 7600,
    ingresosExtraordinarios: 1250,
    totalIngresos: 8850,
    egresosOperativos: 3900,
    egresosMantenimiento: 1750,
    egresosAdministrativos: 900,
    totalEgresos: 6550,
    flujoNeto: 2300,
    saldoFinal: 37010
  },
  {
    mes: 'Noviembre 2026 (Proy.)',
    mesCorto: 'Nov',
    saldoInicial: 37010,
    ingresosOrdinarios: 7500,
    ingresosExtraordinarios: 1100,
    totalIngresos: 8600,
    egresosOperativos: 3920,
    egresosMantenimiento: 1600,
    egresosAdministrativos: 860,
    totalEgresos: 6380,
    flujoNeto: 2220,
    saldoFinal: 39230
  },
  {
    mes: 'Diciembre 2026 (Proy.)',
    mesCorto: 'Dic',
    saldoInicial: 39230,
    ingresosOrdinarios: 7900,
    ingresosExtraordinarios: 2200,
    totalIngresos: 10100,
    egresosOperativos: 4500,
    egresosMantenimiento: 1800,
    egresosAdministrativos: 1200,
    totalEgresos: 7500,
    flujoNeto: 2600,
    saldoFinal: 41830
  }
]

// Categorías de egresos con porcentajes consolidados
export const CATEGORIAS_GASTO = [
  { nombre: 'Servicios Básicos & Limpieza', monto: 47240, porcentaje: 59.8, color: '#2563eb', darkColor: '#60a5fa' },
  { nombre: 'Mantenimiento & Ascensores', monto: 21700, porcentaje: 27.5, color: '#f59e0b', darkColor: '#fbbf24' },
  { nombre: 'Administración & Suministros', monto: 10080, porcentaje: 12.7, color: '#8b5cf6', darkColor: '#a78bfa' }
]

export default function CajaYBancosPage() {
  const [tabActiva, setTabActiva] = useState<'caja' | 'bancos' | 'graficos' | 'simulador'>('caja')
  const [loading, setLoading] = useState<boolean>(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Rol del usuario actual para MAPA_PERMISOS_FINANZAS
  const [rolUsuario, setRolUsuario] = useState<string>('Administrador')
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rol = localStorage.getItem('user_role') || 'Administrador'
      setRolUsuario(rol)
    }
  }, [])

  const puedeEscribirCaja = useMemo(() => puedeEscribirFinanzas('caja', rolUsuario), [rolUsuario])
  const puedeEscribirCuentas = useMemo(
    () => puedeEscribirFinanzas('cuentas_bancarias', rolUsuario),
    [rolUsuario]
  )
  const puedeEscribirMovimientos = useMemo(
    () => puedeEscribirFinanzas('movimientos_bancarios', rolUsuario),
    [rolUsuario]
  )

  // ----------------------------------------------------
  // ESTADO DE GRÁFICOS Y ANÁLISIS FINANCIERO INTERACTIVO
  // ----------------------------------------------------
  const [dataFlujo] = useState<MesFlujoData[]>(FLUX_DATA_2026)
  const [selectedMesIndex, setSelectedMesIndex] = useState<number>(9) // Octubre por defecto
  const [filtroPeriodoGrafico, setFiltroPeriodoGrafico] = useState<'todos' | 'q1' | 'q2' | 'q3' | 'q4'>('todos')
  const [vistaGraficoSub, setVistaGraficoSub] = useState<'graficos' | 'tabla'>('graficos')
  const [simulacionMorosidad, setSimulacionMorosidad] = useState<number>(0)
  const [simulacionGastoExtra, setSimulacionGastoExtra] = useState<number>(0)

  // Filtrado de datos por trimestre
  const datosFiltradosFlujo = useMemo(() => {
    if (filtroPeriodoGrafico === 'q1') return dataFlujo.slice(0, 3)
    if (filtroPeriodoGrafico === 'q2') return dataFlujo.slice(3, 6)
    if (filtroPeriodoGrafico === 'q3') return dataFlujo.slice(6, 9)
    if (filtroPeriodoGrafico === 'q4') return dataFlujo.slice(9, 12)
    return dataFlujo
  }, [dataFlujo, filtroPeriodoGrafico])

  const totalIngresosFlujo = useMemo(
    () => datosFiltradosFlujo.reduce((acc, m) => acc + m.totalIngresos, 0),
    [datosFiltradosFlujo]
  )
  const totalEgresosFlujo = useMemo(
    () => datosFiltradosFlujo.reduce((acc, m) => acc + m.totalEgresos, 0),
    [datosFiltradosFlujo]
  )
  const flujoNetoTotalFlujo = totalIngresosFlujo - totalEgresosFlujo
  const saldoFinalPeriodoFlujo =
    datosFiltradosFlujo[datosFiltradosFlujo.length - 1]?.saldoFinal || 0
  const mesSeleccionadoFlujo = dataFlujo[selectedMesIndex] || dataFlujo[0]

  const ingresosSimulados = totalIngresosFlujo * (1 - simulacionMorosidad / 100)
  const egresosSimulados = totalEgresosFlujo + simulacionGastoExtra * datosFiltradosFlujo.length
  const flujoNetoSimulado = ingresosSimulados - egresosSimulados
  const maxIngresoEgreso = Math.max(
    ...dataFlujo.map((d) => Math.max(d.totalIngresos, d.totalEgresos)),
    12000
  )

  const handleExportFlujoCSV = () => {
    const headers =
      'Mes,Saldo Inicial,Ingresos Ordinarios,Ingresos Extra,Total Ingresos,Egresos Operativos,Mantenimiento,Administrativo,Total Egresos,Flujo Neto,Saldo Final\n'
    const rows = datosFiltradosFlujo
      .map(
        (d) =>
          `"${d.mes}",${d.saldoInicial},${d.ingresosOrdinarios},${d.ingresosExtraordinarios},${d.totalIngresos},${d.egresosOperativos},${d.egresosMantenimiento},${d.egresosAdministrativos},${d.totalEgresos},${d.flujoNeto},${d.saldoFinal}`
      )
      .join('\n')

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `flujo_caja_edificio_xyz_${filtroPeriodoGrafico}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ----------------------------------------------------
  // ESTADO DE CAJA CHICA
  // ----------------------------------------------------
  const [movimientosCaja, setMovimientosCaja] = useState<MovimientoCajaItem[]>([])
  const [saldoCajaResumen, setSaldoCajaResumen] = useState<CajaSaldoResumen | null>(null)
  const [filtroTipoCaja, setFiltroTipoCaja] = useState<'Todos' | 'Ingreso' | 'Egreso'>('Todos')
  const [filtroPeriodoCaja, setFiltroPeriodoCaja] = useState<
    'todos' | 'mes_actual' | 'mes_anterior'
  >('mes_actual')
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
  const [filtroEstadoBanco, setFiltroEstadoBanco] = useState<
    'Todos' | 'Pendiente' | 'Conciliado' | 'Discrepancia'
  >('Todos')
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

      if (
        errores.length > 0 &&
        resMovimientos.status === 'rejected' &&
        resCuentas.status === 'rejected'
      ) {
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
        showNotification(
          'error',
          `Error al cargar movimientos bancarios: ${extractErrorMessage(resMovs.reason)}`
        )
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
      showNotification(
        'error',
        extractErrorMessage(err, 'Error al consultar detalle del movimiento')
      )
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
        (m.concepto || '').toLowerCase().includes(searchCaja.toLowerCase()) ||
        usuarioReg.toLowerCase().includes(searchCaja.toLowerCase())

      let matchPeriodo = true
      const hoy = new Date()
      const fechaMov = new Date(m.fecha)

      if (filtroPeriodoCaja === 'mes_actual') {
        matchPeriodo =
          fechaMov.getFullYear() === hoy.getFullYear() && fechaMov.getMonth() === hoy.getMonth()
      } else if (filtroPeriodoCaja === 'mes_anterior') {
        const mesAnt = hoy.getMonth() === 0 ? 11 : hoy.getMonth() - 1
        const anioAnt = hoy.getMonth() === 0 ? hoy.getFullYear() - 1 : hoy.getFullYear()
        matchPeriodo = fechaMov.getFullYear() === anioAnt && fechaMov.getMonth() === mesAnt
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
        (m.concepto || (m as any).descripcion || '').toLowerCase().includes(query) ||
        (m.referencia && m.referencia.toLowerCase().includes(query))
    )
  }, [movimientosBanco, searchBanco])

  // Saldo bancario total
  const saldoBancosTotal = useMemo(() => {
    return cuentasBancarias.reduce((acc, c) => acc + (Number(c.saldoActual) || 0), 0)
  }, [cuentasBancarias])

  // Exportar reporte de Caja Chica a CSV
  const handleExportCSVCaja = () => {
    if (movimientosCajaFiltrados.length === 0) {
      showNotification('error', 'No hay movimientos de caja para exportar.')
      return
    }
    const headers = ['Tipo', 'Fecha', 'Concepto', 'Registrado Por', 'Monto (Bs.)', 'Estado']
    const rows = movimientosCajaFiltrados.map((m) => [
      m.tipo,
      fechaSolo(m.fecha),
      `"${m.concepto.replace(/"/g, '""')}"`,
      `"${m.usuarioRegistro?.nombreUsuario || 'Sistema'}"`,
      Number(m.monto).toFixed(2),
      m.anulado ? 'Anulado' : 'Vigente'
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `caja_chica_${filtroPeriodoCaja}_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showNotification('success', 'Reporte CSV de Caja Chica descargado correctamente.')
  }

  // Exportar extracto bancario de la cuenta seleccionada a CSV
  const handleExportCSVBancos = () => {
    if (movimientosBancoFiltrados.length === 0) {
      showNotification('error', 'No hay movimientos bancarios para exportar.')
      return
    }
    const cuentaActual = cuentasBancarias.find((c) => c.idCuenta === cuentaSeleccionadaId)
    const headers = [
      'Banco',
      'Cuenta',
      'Tipo',
      'Fecha',
      'Referencia',
      'Concepto',
      'Monto (Bs.)',
      'Estado Conciliacion'
    ]
    const rows = movimientosBancoFiltrados.map((mb) => [
      `"${cuentaActual?.banco || ''}"`,
      `"${cuentaActual?.numeroCuenta || ''}"`,
      mb.tipo,
      fechaSolo(mb.fecha),
      `"${mb.referencia || 'S/R'}"`,
      `"${mb.concepto.replace(/"/g, '""')}"`,
      Number(mb.monto).toFixed(2),
      mb.estadoConciliacion
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `extracto_${cuentaActual?.banco || 'bancario'}_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showNotification('success', 'Extracto bancario exportado a CSV exitosamente.')
  }

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
            Gestión de disponibilidad líquida, arqueos de caja chica física y movimientos de cuentas
            bancarias.
          </p>
        </div>

        {/* TABS PRINCIPALES */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#dfd9ce] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setTabActiva('caja')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tabActiva === 'bancos'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-[#5c5750] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Cuentas Bancarias</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('graficos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tabActiva === 'graficos'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-[#5c5750] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Gráficos y Comparativas</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('simulador')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tabActiva === 'simulador'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-[#5c5750] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-500" />
            <span>Simulador Financiero</span>
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
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{apiError}</p>
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
                        {p === 'todos'
                          ? 'Histórico'
                          : p === 'mes_actual'
                            ? 'Mes Actual'
                            : 'Mes Anterior'}
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

                  <button
                    type="button"
                    onClick={handleExportCSVCaja}
                    className="px-3 py-2 bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#262422] dark:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-[#cec8bc] dark:border-slate-700 shadow-xs cursor-pointer shrink-0"
                    title="Exportar a archivo CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                    <span>Descargar CSV</span>
                  </button>

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
                          <td
                            colSpan={puedeEscribirCaja ? 7 : 6}
                            className="py-8 text-center text-[#7d776f]"
                          >
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-700" />
                          </td>
                        </tr>
                      ) : movimientosCajaFiltrados.length === 0 ? (
                        <tr>
                          <td
                            colSpan={puedeEscribirCaja ? 7 : 6}
                            className="py-8 text-center text-[#7d776f]"
                          >
                            No hay movimientos de caja registrados para este período.
                          </td>
                        </tr>
                      ) : (
                        movimientosCajaFiltrados.map((m) => {
                          const esIngreso = m.tipo === 'Ingreso'
                          return (
                            <tr
                              key={`caja-${m.idMovimientoCaja}`}
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
                                  {esIngreso ? (
                                    <ArrowDownLeft className="w-3 h-3" />
                                  ) : (
                                    <ArrowUpRight className="w-3 h-3" />
                                  )}
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
                                  esIngreso
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-rose-700 dark:text-rose-400'
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
                  <div className="text-xs font-semibold text-[#7d776f]">
                    Saldo Bancario Consolidado
                  </div>
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
                        key={`cuenta-${cuenta.idCuenta}`}
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
                        <span className="text-[#7d776f] font-semibold text-[11px] block">
                          Saldo Inicial Período
                        </span>
                        <div className="text-base sm:text-lg font-black font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                          Bs. {Number(saldoCuentaSeleccionada.saldoInicial || 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] block">
                          Depósitos (Abonos)
                        </span>
                        <div className="text-base sm:text-lg font-black font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                          + Bs. {Number(saldoCuentaSeleccionada.totalDepositos || 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-rose-700 dark:text-rose-400 font-semibold text-[11px] block">
                          Retiros (Cargos)
                        </span>
                        <div className="text-base sm:text-lg font-black font-mono text-rose-700 dark:text-rose-400 mt-0.5">
                          - Bs. {Number(saldoCuentaSeleccionada.totalRetiros || 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-blue-700 dark:text-blue-400 font-semibold text-[11px] block">
                          Disponible Cuenta
                        </span>
                        <div className="text-base sm:text-lg font-black font-mono text-blue-700 dark:text-blue-400 mt-0.5">
                          Bs.{' '}
                          {Number(saldoCuentaSeleccionada.saldoDisponibleActual || 0).toFixed(2)}
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
                        Cuenta:{' '}
                        {cuentasBancarias.find((c) => c.idCuenta === cuentaSeleccionadaId)?.banco} -{' '}
                        {
                          cuentasBancarias.find((c) => c.idCuenta === cuentaSeleccionadaId)
                            ?.numeroCuenta
                        }
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
                        {(['Todos', 'Pendiente', 'Conciliado', 'Discrepancia'] as const).map(
                          (st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setFiltroEstadoBanco(st)}
                              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                                filtroEstadoBanco === st
                                  ? 'bg-blue-700 text-white'
                                  : 'text-[#5c5750]'
                              }`}
                            >
                              {st}
                            </button>
                          )
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleExportCSVBancos}
                        className="px-3 py-1.5 bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#262422] dark:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-[#cec8bc] dark:border-slate-700 shadow-xs cursor-pointer"
                        title="Exportar extracto a archivo CSV"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                        <span>Descargar CSV</span>
                      </button>

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
                                <tr
                                  key={`mov-banco-${mb.idMovBancario}`}
                                  className="hover:bg-[#e6e1d6]/50 transition-colors"
                                >
                                  <td className="py-3 px-4">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                        esDeposito
                                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                                          : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300'
                                      }`}
                                    >
                                      {esDeposito ? (
                                        <ArrowDownLeft className="w-3 h-3" />
                                      ) : (
                                        <ArrowUpRight className="w-3 h-3" />
                                      )}
                                      {mb.tipo}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 font-mono">{fechaSolo(mb.fecha)}</td>
                                  <td className="py-3 px-4 font-mono text-[#5c5750]">
                                    {mb.referencia || 'S/R'}
                                  </td>
                                  <td
                                    className="py-3 px-4 font-medium max-w-xs truncate"
                                    title={mb.concepto}
                                  >
                                    {mb.concepto}
                                  </td>
                                  <td
                                    className={`py-3 px-4 font-mono font-bold ${
                                      esDeposito
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : 'text-rose-700 dark:text-rose-400'
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
                                      {puedeEscribirMovimientos &&
                                        (!yaConciliado ? (
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
                                          <span className="text-[10px] text-slate-400 italic">
                                            Conciliado
                                          </span>
                                        ))}
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
          {/* VISTA 3: GRÁFICOS Y ANÁLISIS COMPARATIVO INTERACTIVO */}
          {tabActiva === 'graficos' && (
            <div className="space-y-6">
              {/* SUB-HEADER CON CONTROLES */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVistaGraficoSub('graficos')}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      vistaGraficoSub === 'graficos'
                        ? 'bg-blue-700 text-white shadow-sm'
                        : 'bg-[#dfd9ce] dark:bg-slate-800 text-[#5c5750] dark:text-slate-400'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Vista Gráfica Interactiva</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVistaGraficoSub('tabla')}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      vistaGraficoSub === 'tabla'
                        ? 'bg-blue-700 text-white shadow-sm'
                        : 'bg-[#dfd9ce] dark:bg-slate-800 text-[#5c5750] dark:text-slate-400'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Planilla Mensual Desglosada</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Selector de Trimestre */}
                  <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-[#7d776f]" />
                    <select
                      value={filtroPeriodoGrafico}
                      onChange={(e) => setFiltroPeriodoGrafico(e.target.value as any)}
                      className="bg-transparent text-[#262422] dark:text-white font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="todos">Año Completo (2026)</option>
                      <option value="q1">1° Trimestre (Ene - Mar)</option>
                      <option value="q2">2° Trimestre (Abr - Jun)</option>
                      <option value="q3">3° Trimestre (Jul - Sep)</option>
                      <option value="q4">4° Trimestre (Oct - Dic)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportFlujoCSV}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar CSV</span>
                  </button>
                </div>
              </div>

              {/* KPIS PRINCIPALES DE FLUJO */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold text-[#66615b] dark:text-slate-400 mb-1">
                    <span>Ingresos Totales</span>
                    <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold text-emerald-800 dark:text-emerald-400 font-mono">
                    Bs. {totalIngresosFlujo.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-[#7d776f] dark:text-slate-500 mt-1">
                    Expensas + Agua + Extras ({datosFiltradosFlujo.length} meses)
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold text-[#66615b] dark:text-slate-400 mb-1">
                    <span>Egresos Totales</span>
                    <span className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                      <TrendingDown className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold text-rose-800 dark:text-rose-400 font-mono">
                    Bs. {totalEgresosFlujo.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-[#7d776f] dark:text-slate-500 mt-1">
                    Servicios + Mantenimiento + Gastos
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold text-[#66615b] dark:text-slate-400 mb-1">
                    <span>Flujo Neto (Superávit)</span>
                    <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
                      <Scale className="w-4 h-4" />
                    </span>
                  </div>
                  <div
                    className={`text-xl sm:text-2xl font-extrabold font-mono ${
                      flujoNetoTotalFlujo >= 0 ? 'text-emerald-800 dark:text-emerald-400' : 'text-rose-800 dark:text-rose-400'
                    }`}
                  >
                    {flujoNetoTotalFlujo >= 0 ? '+' : ''}Bs. {flujoNetoTotalFlujo.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-[#7d776f] dark:text-slate-500 mt-1">
                    Margen operativo: {totalIngresosFlujo > 0 ? ((flujoNetoTotalFlujo / totalIngresosFlujo) * 100).toFixed(1) : 0}%
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold text-[#66615b] dark:text-slate-400 mb-1">
                    <span>Fondo de Reserva</span>
                    <span className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400">
                      <Wallet className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold text-purple-800 dark:text-purple-300 font-mono">
                    Bs. {saldoFinalPeriodoFlujo.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Disponibilidad Proyectada
                  </div>
                </div>
              </div>

              {/* VISTA 3.1: GRÁFICOS VISUALES */}
              {vistaGraficoSub === 'graficos' && (
                <div className="space-y-6">
                  {/* GRÁFICO 1: EVOLUCIÓN MENSUAL (BARRAS COMPARATIVAS) */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#cec8bc] dark:border-slate-800 pb-3">
                      <div>
                        <h2 className="text-base sm:text-lg font-extrabold text-[#262422] dark:text-white flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                          Evolución Mensual: Ingresos vs. Egresos (2026)
                        </h2>
                        <p className="text-xs text-[#7d776f] dark:text-slate-400">
                          Haga clic en cualquier mes para ver el desglose en el panel inferior.
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-bold">
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                          <span className="w-3 h-3 rounded-md bg-emerald-600 inline-block" />
                          <span>Ingresos</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                          <span className="w-3 h-3 rounded-md bg-rose-600 inline-block" />
                          <span>Egresos</span>
                        </div>
                      </div>
                    </div>

                    {/* BARRAS MENSUALES */}
                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-4 items-end min-h-[260px]">
                      {dataFlujo.map((mesData, idx) => {
                        const isSelected = selectedMesIndex === idx
                        const heightIngreso = Math.round((mesData.totalIngresos / maxIngresoEgreso) * 180)
                        const heightEgreso = Math.round((mesData.totalEgresos / maxIngresoEgreso) * 180)

                        return (
                          <div
                            key={mesData.mes}
                            onClick={() => setSelectedMesIndex(idx)}
                            className={`flex flex-col items-center group cursor-pointer p-1.5 rounded-2xl transition-all ${
                              isSelected
                                ? 'bg-[#dfd9ce] dark:bg-slate-800/90 ring-2 ring-blue-600 shadow-md scale-105'
                                : 'hover:bg-[#dfd9ce]/50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <div className="text-[10px] font-mono font-bold text-[#7d776f] dark:text-slate-400 mb-1 text-center">
                              +{Math.round(mesData.flujoNeto / 1000)}k
                            </div>

                            <div className="flex items-end gap-1 h-[180px] w-full justify-center">
                              <div
                                style={{ height: `${heightIngreso}px` }}
                                className="w-2.5 sm:w-3.5 rounded-t-md bg-emerald-600 dark:bg-emerald-500 hover:brightness-110 transition-all shadow-xs"
                                title={`Ingresos: Bs. ${mesData.totalIngresos}`}
                              />
                              <div
                                style={{ height: `${heightEgreso}px` }}
                                className="w-2.5 sm:w-3.5 rounded-t-md bg-rose-600 dark:bg-rose-500 hover:brightness-110 transition-all shadow-xs"
                                title={`Egresos: Bs. ${mesData.totalEgresos}`}
                              />
                            </div>

                            <span
                              className={`text-[11px] font-bold mt-2 truncate ${
                                isSelected ? 'text-blue-700 dark:text-blue-400 font-extrabold' : 'text-[#5c5750] dark:text-slate-400'
                              }`}
                            >
                              {mesData.mesCorto}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {/* DETALLE DEL MES SELECCIONADO */}
                    <div className="p-4 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-blue-700 text-white font-bold flex items-center justify-center shrink-0">
                          {mesSeleccionadoFlujo.mesCorto}
                        </span>
                        <div>
                          <h4 className="font-extrabold text-sm text-[#262422] dark:text-white">
                            Detalle de {mesSeleccionadoFlujo.mes}
                          </h4>
                          <span className="text-[11px] text-[#7d776f]">
                            Saldo inicial: Bs. {mesSeleccionadoFlujo.saldoInicial.toLocaleString()} &bull; Saldo final: Bs.{' '}
                            {mesSeleccionadoFlujo.saldoFinal.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 font-mono font-bold">
                        <div>
                          <span className="block text-[10px] text-[#7d776f] uppercase font-sans">Ingresos</span>
                          <span className="text-emerald-700 dark:text-emerald-400">
                            Bs. {mesSeleccionadoFlujo.totalIngresos.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-[#7d776f] uppercase font-sans">Egresos</span>
                          <span className="text-rose-700 dark:text-rose-400">
                            Bs. {mesSeleccionadoFlujo.totalEgresos.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-[#7d776f] uppercase font-sans">Flujo Neto</span>
                          <span className="text-blue-700 dark:text-blue-400">
                            +Bs. {mesSeleccionadoFlujo.flujoNeto.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GRÁFICO 2: COMPOSICIÓN DE EGRESOS & CURVA DE RESERVA */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Donut Chart SVG de Categorías de Gastos */}
                    <div className="p-5 sm:p-6 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
                      <div>
                        <h3 className="font-extrabold text-base text-[#262422] dark:text-white flex items-center gap-2">
                          <PieChart className="w-4 h-4 text-amber-500" />
                          Distribución Acumulada de Gastos (Rubros)
                        </h3>
                        <p className="text-xs text-[#7d776f] dark:text-slate-400 mt-0.5">
                          Proporción de gastos operativos del Edificio XYZ en Bolivianos (Bs.).
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
                        <div className="relative w-40 h-40 shrink-0">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="38" fill="transparent" stroke="#cec8bc" strokeWidth="16" className="dark:stroke-slate-800" />
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke="#2563eb"
                              strokeWidth="16"
                              strokeDasharray="238.76"
                              strokeDashoffset="95.5"
                              strokeLinecap="round"
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke="#f59e0b"
                              strokeWidth="16"
                              strokeDasharray="238.76"
                              strokeDashoffset="173"
                              strokeLinecap="round"
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke="#8b5cf6"
                              strokeWidth="16"
                              strokeDasharray="238.76"
                              strokeDashoffset="208"
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] text-[#7d776f] uppercase font-bold">Total Gastos</span>
                            <span className="font-extrabold text-sm text-[#262422] dark:text-white font-mono">
                              Bs. 79.0k
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3 flex-1">
                          {CATEGORIAS_GASTO.map((cat) => (
                            <div key={cat.nombre} className="text-xs">
                              <div className="flex items-center justify-between font-bold mb-1">
                                <span className="flex items-center gap-1.5 text-[#262422] dark:text-white">
                                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: cat.color }} />
                                  {cat.nombre}
                                </span>
                                <span className="font-mono text-[#7d776f] dark:text-slate-400">
                                  {cat.porcentaje}%
                                </span>
                              </div>
                              <div className="w-full bg-[#dfd9ce] dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${cat.porcentaje}%`, backgroundColor: cat.color }}
                                />
                              </div>
                              <div className="text-[11px] text-[#7d776f] text-right font-mono mt-0.5">
                                Bs. {cat.monto.toLocaleString('es-BO')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Curva de Proyección de Liquidez y Reserva */}
                    <div className="p-5 sm:p-6 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
                      <div>
                        <h3 className="font-extrabold text-base text-[#262422] dark:text-white flex items-center gap-2">
                          <LineChart className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          Curva de Proyección de Reserva & Liquidez (2026)
                        </h3>
                        <p className="text-xs text-[#7d776f] dark:text-slate-400 mt-0.5">
                          Evolución del saldo en bolivianos mostrando el incremento del fondo de reserva.
                        </p>
                      </div>

                      <div className="w-full h-44 relative flex items-end">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="liquidezGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          <path
                            d="M 0 120 Q 125 100 250 65 T 500 15 L 500 160 L 0 160 Z"
                            fill="url(#liquidezGrad)"
                          />
                          <path
                            d="M 0 120 Q 125 100 250 65 T 500 15"
                            fill="transparent"
                            stroke="#8b5cf6"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                          <circle cx="0" cy="120" r="5" fill="#8b5cf6" stroke="#fff" strokeWidth="2" />
                          <circle cx="250" cy="65" r="5" fill="#8b5cf6" stroke="#fff" strokeWidth="2" />
                          <circle cx="500" cy="15" r="6" fill="#10b981" stroke="#fff" strokeWidth="2" />
                        </svg>
                      </div>

                      <div className="flex items-center justify-between text-xs text-[#7d776f] font-mono pt-2 border-t border-[#cec8bc] dark:border-slate-800">
                        <div>
                          <span className="block text-[10px] uppercase font-sans">Ene 2026</span>
                          <span className="font-bold text-[#262422] dark:text-white">Bs. 15.000</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-sans">Jun 2026</span>
                          <span className="font-bold text-[#262422] dark:text-white">Bs. 26.760</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] uppercase font-sans">Dic 2026</span>
                          <span className="font-extrabold text-emerald-700 dark:text-emerald-400">Bs. 41.830</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VISTA 3.2: ESTADO DE FLUJO DESGLOSADO (TABLA) */}
              {vistaGraficoSub === 'tabla' && (
                <div className="rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="p-4 bg-[#dfd9ce]/60 dark:bg-slate-950/60 border-b border-[#cec8bc] dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-[#262422] dark:text-white">
                        Planilla Mensual de Flujo de Efectivo
                      </h3>
                      <p className="text-xs text-[#7d776f] dark:text-slate-400">
                        Auditoría detallada mes a mes de ingresos ordinarios, extraordinarios y partidas de egresos.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportFlujoCSV}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs font-bold text-[#5c5750] dark:text-slate-300 hover:bg-[#ded8cc] transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Exportar</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/40 dark:bg-slate-950/40 text-[#7d776f] dark:text-slate-400 uppercase text-[10px] font-bold">
                          <th className="py-3 px-3.5">Mes</th>
                          <th className="py-3 px-3 text-right">Saldo Inicial</th>
                          <th className="py-3 px-3 text-right text-emerald-800 dark:text-emerald-400">Ingr. Expensas</th>
                          <th className="py-3 px-3 text-right text-emerald-800 dark:text-emerald-400">Ingr. Extras</th>
                          <th className="py-3 px-3.5 text-right font-extrabold text-emerald-900 dark:text-emerald-300 bg-emerald-500/5">
                            Total Ingresos
                          </th>
                          <th className="py-3 px-3 text-right text-rose-800 dark:text-rose-400">Servicios</th>
                          <th className="py-3 px-3 text-right text-rose-800 dark:text-rose-400">Mantenimiento</th>
                          <th className="py-3 px-3 text-right text-rose-800 dark:text-rose-400">Administrativo</th>
                          <th className="py-3 px-3.5 text-right font-extrabold text-rose-900 dark:text-rose-300 bg-rose-500/5">
                            Total Egresos
                          </th>
                          <th className="py-3 px-3.5 text-right font-extrabold text-blue-900 dark:text-blue-300">
                            Flujo Neto
                          </th>
                          <th className="py-3 px-3.5 text-right font-extrabold text-purple-900 dark:text-purple-300">
                            Saldo Final
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#cec8bc] dark:divide-slate-800 font-mono">
                        {datosFiltradosFlujo.map((fila) => (
                          <tr key={fila.mes} className="hover:bg-[#dfd9ce]/40 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-3.5 font-bold font-sans text-[#262422] dark:text-white">
                              {fila.mes}
                            </td>
                            <td className="py-3 px-3 text-right text-[#5c5750] dark:text-slate-400">
                              Bs. {fila.saldoInicial.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400 font-semibold">
                              +{fila.ingresosOrdinarios.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400">
                              +{fila.ingresosExtraordinarios.toLocaleString()}
                            </td>
                            <td className="py-3 px-3.5 text-right font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/5">
                              Bs. {fila.totalIngresos.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right text-rose-700 dark:text-rose-400">
                              -{fila.egresosOperativos.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right text-rose-700 dark:text-rose-400">
                              -{fila.egresosMantenimiento.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right text-rose-700 dark:text-rose-400">
                              -{fila.egresosAdministrativos.toLocaleString()}
                            </td>
                            <td className="py-3 px-3.5 text-right font-bold text-rose-800 dark:text-rose-300 bg-rose-500/5">
                              Bs. {fila.totalEgresos.toLocaleString()}
                            </td>
                            <td
                              className={`py-3 px-3.5 text-right font-extrabold ${
                                fila.flujoNeto >= 0 ? 'text-emerald-800 dark:text-emerald-400' : 'text-rose-800 dark:text-rose-400'
                              }`}
                            >
                              {fila.flujoNeto >= 0 ? '+' : ''}Bs. {fila.flujoNeto.toLocaleString()}
                            </td>
                            <td className="py-3 px-3.5 text-right font-extrabold text-purple-800 dark:text-purple-300">
                              Bs. {fila.saldoFinal.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[#cec8bc] dark:border-slate-700 bg-[#dfd9ce]/80 dark:bg-slate-950/80 font-bold font-mono text-xs">
                          <td className="py-3 px-3.5 font-sans uppercase text-[#262422] dark:text-white">
                            TOTALES ACUMULADOS
                          </td>
                          <td className="py-3 px-3 text-right text-[#7d776f]">-</td>
                          <td className="py-3 px-3 text-right text-emerald-700">
                            +{datosFiltradosFlujo.reduce((a, b) => a + b.ingresosOrdinarios, 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-700">
                            +{datosFiltradosFlujo.reduce((a, b) => a + b.ingresosExtraordinarios, 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-extrabold text-emerald-800 bg-emerald-500/10">
                            Bs. {totalIngresosFlujo.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right text-rose-700">
                            -{datosFiltradosFlujo.reduce((a, b) => a + b.egresosOperativos, 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right text-rose-700">
                            -{datosFiltradosFlujo.reduce((a, b) => a + b.egresosMantenimiento, 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right text-rose-700">
                            -{datosFiltradosFlujo.reduce((a, b) => a + b.egresosAdministrativos, 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-extrabold text-rose-800 bg-rose-500/10">
                            Bs. {totalEgresosFlujo.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-extrabold text-blue-800">
                            +Bs. {flujoNetoTotalFlujo.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right font-extrabold text-purple-800">
                            Bs. {saldoFinalPeriodoFlujo.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VISTA 4: SIMULADOR DE ESCENARIOS FINANCIEROS */}
          {tabActiva === 'simulador' && (
            <div className="p-6 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-6">
              <div className="border-b border-[#cec8bc] dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-lg text-[#262422] dark:text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-500" />
                  Simulador Interactivo de Sensibilidad Financiera
                </h3>
                <p className="text-xs text-[#7d776f] dark:text-slate-400 mt-1">
                  Ajuste los controles para proyectar cómo impactarían aumentos de morosidad o gastos imprevistos de mantenimiento en la liquidez del edificio.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Control 1: Morosidad */}
                <div className="p-5 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#262422] dark:text-white">
                      Tasa de Morosidad Proyectada
                    </label>
                    <span className="font-mono font-extrabold text-sm text-rose-700 dark:text-rose-400">
                      {simulacionMorosidad}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="5"
                    value={simulacionMorosidad}
                    onChange={(e) => setSimulacionMorosidad(Number(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                  <p className="text-[11px] text-[#7d776f]">
                    {simulacionMorosidad === 0
                      ? 'Escenario ideal: 100% de recaudación oportuna.'
                      : `Reducción estimada de ingresos: -Bs. ${((totalIngresosFlujo * simulacionMorosidad) / 100).toLocaleString('es-BO')}`}
                  </p>
                </div>

                {/* Control 2: Gasto Extra */}
                <div className="p-5 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#262422] dark:text-white">
                      Gasto Extraordinario Mensual Imprevisto
                    </label>
                    <span className="font-mono font-extrabold text-sm text-amber-600 dark:text-amber-400">
                      +Bs. {simulacionGastoExtra} / mes
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3000"
                    step="250"
                    value={simulacionGastoExtra}
                    onChange={(e) => setSimulacionGastoExtra(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                  <p className="text-[11px] text-[#7d776f]">
                    {simulacionGastoExtra === 0
                      ? 'Sin gastos no presupuestados.'
                      : `Impacto anual en caja: -Bs. ${(simulacionGastoExtra * datosFiltradosFlujo.length).toLocaleString('es-BO')}`}
                  </p>
                </div>
              </div>

              {/* Resultado de la Simulación */}
              <div className="p-5 rounded-2xl bg-[#dfd9ce]/90 dark:bg-slate-950/80 border border-[#cec8bc] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div>
                  <span className="text-[11px] font-bold text-[#7d776f] uppercase block">
                    Ingresos Simulados
                  </span>
                  <span className="text-lg font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
                    Bs. {ingresosSimulados.toLocaleString('es-BO', { maximumFractionDigits: 0 })}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-[#7d776f] uppercase block">
                    Egresos Simulados
                  </span>
                  <span className="text-lg font-mono font-extrabold text-rose-700 dark:text-rose-400">
                    Bs. {egresosSimulados.toLocaleString('es-BO', { maximumFractionDigits: 0 })}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-[#7d776f] uppercase block">
                    Flujo Neto Proyectado
                  </span>
                  <span
                    className={`text-lg font-mono font-extrabold ${
                      flujoNetoSimulado >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {flujoNetoSimulado >= 0 ? '+' : ''}Bs.{' '}
                    {flujoNetoSimulado.toLocaleString('es-BO', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSimulacionMorosidad(0)
                    setSimulacionGastoExtra(0)
                  }}
                  className="px-4 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs font-bold text-[#5c5750] dark:text-slate-300 hover:bg-[#ded8cc] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restablecer Simulación</span>
                </button>
              </div>
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
                  onChange={(e) =>
                    setFormCajaMonto(e.target.value === '' ? '' : Number(e.target.value))
                  }
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
                  onChange={(e) =>
                    setFormCuentaSaldoInicial(e.target.value === '' ? '' : Number(e.target.value))
                  }
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
                  onChange={(e) =>
                    setFormMovBancoMonto(e.target.value === '' ? '' : Number(e.target.value))
                  }
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
                    <p className="font-bold text-sm text-[#262422] dark:text-white">
                      {movBancoDetalle.tipo}
                    </p>
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
                    <span className="text-[10px] text-[#7d776f] uppercase font-bold">
                      Concepto:
                    </span>
                    <p className="font-medium text-[#262422] dark:text-white mt-0.5">
                      {movBancoDetalle.concepto}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#cec8bc]/40 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-[#7d776f] uppercase font-bold">Fecha:</span>
                      <p className="font-mono">{fechaSolo(movBancoDetalle.fecha)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#7d776f] uppercase font-bold">
                        Referencia:
                      </span>
                      <p className="font-mono">{movBancoDetalle.referencia || 'Sin referencia'}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#cec8bc]/40 dark:border-slate-800">
                    <span className="text-[10px] text-[#7d776f] uppercase font-bold">
                      Estado de Conciliación:
                    </span>
                    <p className="font-bold mt-0.5 text-blue-800 dark:text-blue-300">
                      {movBancoDetalle.estadoConciliacion}
                    </p>
                    {movBancoDetalle.diferencia !== null &&
                      movBancoDetalle.diferencia !== undefined && (
                        <p className="text-rose-600 font-semibold text-[11px] mt-0.5">
                          Diferencia con libro interno: Bs.{' '}
                          {Number(movBancoDetalle.diferencia).toFixed(2)}
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
