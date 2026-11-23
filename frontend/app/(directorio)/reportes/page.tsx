// frontend/app/(directorio)/reportes/page.tsx
// Módulo 8: Visores de Reportes Financieros y Balances Ejecutivos - Edificio XYZ
// Diseñado para ser extremadamente amigable, visual, intuitivo y comprensible para todos los usuarios.
// Cumple con los requerimientos de evaluación TIS:
//   8.1 Estado financiero ejecutivo
//   8.2 Balance mensual (ingresos vs. egresos)
//   8.3 Flujo de caja y posición de liquidez
//   8.4 Lista oficial de morosos con notificación por WhatsApp y extracto
//   8.5 Reporte de ingresos y gastos desglosado por categorías
//   8.6 Historial de pagos por departamento con estado de cuenta detallado
//   Modal de exportación e impresión formal para asamblea y rendición de cuentas

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FileBarChart,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Building,
  Printer,
  X,
  Search,
  ShieldCheck,
  MessageCircle,
  RefreshCw,
  Wallet,
  Landmark,
  Phone,
  FileText,
  AlertCircle,
  ChevronDown
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { fechaSolo } from '@/lib/fecha'

// ── Tipos e Interfaces ──────────────────────────────────────────────────────────

export type TabVisor = 'balance' | 'morosos' | 'flujo' | 'historial_dpto'

export interface MesFinanciero {
  mes: string
  mesCorto: string
  anio: number
  claveMes: string // YYYY-MM
  ingresos: number
  egresos: number
  balance: number
  tasaMorosidad: number
}

export interface CategoriaGasto {
  nombre: string
  monto: number
  porcentaje: number
  color: string
  textClass: string
}

export interface CategoriaIngreso {
  nombre: string
  monto: number
  porcentaje: number
  color: string
}

export interface MorosoItem {
  idDepartamento: number
  numero: string
  piso?: number
  propietario: {
    idPersona?: number
    nombres: string
    apellidos: string
    ciNit?: string
    telefono?: string
    correo?: string
  } | null
  totalDeuda: number
  expensasMoraCount: number
  detalleExpensas: Array<{
    idExpensa: number
    periodo: string
    montoTotal: number
    capitalPendiente: number
    saldoPendiente: number
    fechaVencimiento: string
  }>
}

export interface MovimientoOperativo {
  idMovimiento: number
  fecha: string
  tipo: 'Ingreso' | 'Egreso'
  monto: number
  descripcion: string
  tercero?: string | null
  categoria?: {
    idCategoria: number
    nombre: string
    tipo: string
  } | null
  nroFactura?: string | null
}

export interface ExpensaResumen {
  idExpensa: number
  idDepartamento: number
  periodo: string
  monto: number
  montoAgua?: number
  montoExtras?: number
  montoTotal?: number
  saldoPendiente: number
  estado: string
  fechaVencimiento: string
  vencida?: boolean
  moraCalculada?: number
  mesesMora?: number
  totalAdeudado?: number
}

export interface CuentaBancariaItem {
  idCuenta: number
  banco: string
  numeroCuenta: string
  tipoCuenta?: string | null
  saldoInicial?: number
  saldoCalculado: number
  saldoActual: number
  totalDepositos?: number
  totalRetiros?: number
}

export interface DepartamentoSimple {
  idDepartamento: number
  numero: string
  piso?: number
  areaM2?: number
  tipo?: { nombre: string } | null
  propietario?: {
    nombres: string
    apellidos: string
    telefono?: string
    correo?: string
  } | null
}

export interface EstadoCuentaDpto {
  departamento: {
    idDepartamento: number
    numero: string
    piso?: number
    areaM2?: number
    tipo?: { nombre: string } | null
    propietario?: {
      nombres: string
      apellidos: string
      telefono?: string
      correo?: string
    } | null
  }
  resumen: {
    totalObligaciones: number
    totalPagado: number
    saldoPendienteTotal: number
    totalAnticiposDisponibles: number
  }
  movimientos: Array<{
    id: string
    idReferencia: number
    tipo: 'OBLIGACION' | 'PAGO' | 'ANTICIPO'
    fecha: string
    periodo?: string
    concepto: string
    monto: number
    debe: number
    haber: number
    saldoProgresivo: number
    metodoPago?: string
    comprobanteUrl?: string | null
    estado?: string
  }>
}

// ── Helpers de Fechas y Meses ─────────────────────────────────────────────────

const NOMBRES_MESES = [
  { mesNumero: '01', nombre: 'Enero', corto: 'Ene' },
  { mesNumero: '02', nombre: 'Febrero', corto: 'Feb' },
  { mesNumero: '03', nombre: 'Marzo', corto: 'Mar' },
  { mesNumero: '04', nombre: 'Abril', corto: 'Abr' },
  { mesNumero: '05', nombre: 'Mayo', corto: 'May' },
  { mesNumero: '06', nombre: 'Junio', corto: 'Jun' },
  { mesNumero: '07', nombre: 'Julio', corto: 'Jul' },
  { mesNumero: '08', nombre: 'Agosto', corto: 'Ago' },
  { mesNumero: '09', nombre: 'Septiembre', corto: 'Sep' },
  { mesNumero: '10', nombre: 'Octubre', corto: 'Oct' },
  { mesNumero: '11', nombre: 'Noviembre', corto: 'Nov' },
  { mesNumero: '12', nombre: 'Diciembre', corto: 'Dic' },
]

function extraerClaveMes(fechaStr?: string | Date | null): string | null {
  if (!fechaStr) return null
  const str = String(fechaStr).trim()
  if (/^\d{4}-\d{2}$/.test(str.substring(0, 7))) {
    return str.substring(0, 7)
  }
  const d = new Date(str)
  if (isNaN(d.getTime())) return null
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

// ── Componente Principal ───────────────────────────────────────────────────────

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState<TabVisor>('balance')
  const [selectedYear, setSelectedYear] = useState<number>(2026)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Septiembre 2026')
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false)
  const [isNotificationSent, setIsNotificationSent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [lastSyncTime, setLastSyncTime] = useState<string>('')
  const [isRealData, setIsRealData] = useState<boolean>(false)

  // Datos financieros dinámicos provistos por la API del Backend
  const [morososList, setMorososList] = useState<MorosoItem[]>([])
  const [movimientosList, setMovimientosList] = useState<MovimientoOperativo[]>([])
  const [expensasList, setExpensasList] = useState<ExpensaResumen[]>([])
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancariaItem[]>([])
  const [departamentos, setDepartamentos] = useState<DepartamentoSimple[]>([])
  const [saldoCajaChica, setSaldoCajaChica] = useState<number>(0)

  // Filtros de tabla morosos
  const [searchMoroso, setSearchMoroso] = useState<string>('')
  const [filtroSeveridad, setFiltroSeveridad] = useState<'TODOS' | 'AVISO' | 'MORA' | 'CRITICO'>('TODOS')

  // Filtros de movimientos / flujo
  const [searchMovimiento, setSearchMovimiento] = useState<string>('')
  const [filtroTipoMov, setFiltroTipoMov] = useState<'TODOS' | 'Ingreso' | 'Egreso'>('TODOS')

  // Estado del Visor de Historial por Departamento
  const [selectedDptoId, setSelectedDptoId] = useState<number | null>(null)
  const [estadoCuentaDpto, setEstadoCuentaDpto] = useState<EstadoCuentaDpto | null>(null)
  const [isLoadingDpto, setIsLoadingDpto] = useState<boolean>(false)

  // ── Carga Dinámica desde las APIs Reales del Backend ──────────────────────────

  const cargarDatos = useCallback(async () => {
    setIsLoading(true)
    let sincronizadoExitoso = false

    try {
      // 1. Cargar Lista Real de Morosos desde /api/v1/expensas/morosos
      const resMorosos = await apiFetch('/api/v1/expensas/morosos')
      if (resMorosos.ok) {
        const jsonMorosos = await resMorosos.json()
        if (jsonMorosos.data && Array.isArray(jsonMorosos.data)) {
          setMorososList(jsonMorosos.data)
          sincronizadoExitoso = true
        }
      }

      // 2. Cargar Movimientos Operativos Reales desde /api/v1/movimientos
      const resMovs = await apiFetch('/api/v1/movimientos?limit=1000')
      if (resMovs.ok) {
        const jsonMovs = await resMovs.json()
        if (jsonMovs.data && Array.isArray(jsonMovs.data)) {
          setMovimientosList(jsonMovs.data)
          sincronizadoExitoso = true
        }
      }

      // 3. Cargar Expensas Emitidas Reales para cálculo de morosidad
      const resExp = await apiFetch('/api/v1/expensas?limit=1000')
      if (resExp.ok) {
        const jsonExp = await resExp.json()
        if (jsonExp.data && Array.isArray(jsonExp.data)) {
          setExpensasList(jsonExp.data)
          sincronizadoExitoso = true
        }
      }

      // 4. Cargar Departamentos para el Visor 8.6 desde /api/v1/departamentos
      const resDptos = await apiFetch('/api/v1/departamentos?limit=100')
      if (resDptos.ok) {
        const jsonDptos = await resDptos.json()
        if (jsonDptos.data && Array.isArray(jsonDptos.data)) {
          setDepartamentos(jsonDptos.data)
          if (!selectedDptoId && jsonDptos.data.length > 0) {
            setSelectedDptoId(jsonDptos.data[0].idDepartamento)
          }
          sincronizadoExitoso = true
        }
      }

      // 5. Cargar Saldo Real de Caja Chica desde /api/v1/caja/saldo
      const resCaja = await apiFetch('/api/v1/caja/saldo')
      if (resCaja.ok) {
        const jsonCaja = await resCaja.json()
        const disp =
          jsonCaja.data?.saldoDisponibleActual ??
          jsonCaja.data?.saldoFinal ??
          jsonCaja.saldoDisponible ??
          0
        setSaldoCajaChica(Number(disp) || 0)
        sincronizadoExitoso = true
      }

      // 6. Cargar Cuentas Bancarias Reales desde /api/v1/cuentas-bancarias
      const resBancos = await apiFetch('/api/v1/cuentas-bancarias')
      if (resBancos.ok) {
        const jsonBancos = await resBancos.json()
        if (jsonBancos.data && Array.isArray(jsonBancos.data)) {
          setCuentasBancarias(jsonBancos.data)
          sincronizadoExitoso = true
        }
      }
    } catch (err) {
      console.error('Error cargando reportes financieros:', err)
    } finally {
      setIsRealData(sincronizadoExitoso)
      setLastSyncTime(new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setIsLoading(false)
    }
  }, [selectedDptoId])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // Cargar estado de cuenta real al cambiar de departamento en el Visor 8.6
  useEffect(() => {
    if (!selectedDptoId) return

    let isMounted = true
    const fetchEstadoCuenta = async () => {
      setIsLoadingDpto(true)
      try {
        const res = await apiFetch(`/api/v1/expensas/estado-cuenta/${selectedDptoId}`)
        if (res.ok && isMounted) {
          const json = await res.json()
          setEstadoCuentaDpto(json)
        } else if (isMounted) {
          setEstadoCuentaDpto(null)
        }
      } catch {
        if (isMounted) {
          setEstadoCuentaDpto(null)
        }
      } finally {
        if (isMounted) setIsLoadingDpto(false)
      }
    }

    fetchEstadoCuenta()
    return () => {
      isMounted = false
    }
  }, [selectedDptoId])

  // ── Cálculo Reactivo de Balance Mensual (12 Meses del Año) ────────────────────

  const mesesData = useMemo<MesFinanciero[]>(() => {
    return NOMBRES_MESES.map((info) => {
      const claveMes = `${selectedYear}-${info.mesNumero}`

      // Suma reactiva de ingresos del mes
      const ingresosMes = movimientosList
        .filter((m) => m.tipo === 'Ingreso' && extraerClaveMes(m.fecha) === claveMes)
        .reduce((acc, m) => acc + (Number(m.monto) || 0), 0)

      // Suma reactiva de egresos del mes
      const egresosMes = movimientosList
        .filter((m) => m.tipo === 'Egreso' && extraerClaveMes(m.fecha) === claveMes)
        .reduce((acc, m) => acc + (Number(m.monto) || 0), 0)

      // Tasa de morosidad real desde expensas del período
      const expensasDelMes = expensasList.filter((e) => extraerClaveMes(e.periodo) === claveMes)
      const totalExp = expensasDelMes.length
      const enMora = expensasDelMes.filter(
        (e) =>
          e.estado === 'Vencida' ||
          (e.moraCalculada !== undefined && Number(e.moraCalculada) > 0) ||
          (Number(e.saldoPendiente) > 0 && e.vencida)
      ).length

      const tasaMorosidad = totalExp > 0 ? Math.round((enMora / totalExp) * 1000) / 10 : 0

      return {
        mes: `${info.nombre} ${selectedYear}`,
        mesCorto: info.corto,
        anio: selectedYear,
        claveMes,
        ingresos: ingresosMes,
        egresos: egresosMes,
        balance: ingresosMes - egresosMes,
        tasaMorosidad,
      }
    })
  }, [movimientosList, expensasList, selectedYear])

  // Clave YYYY-MM del período seleccionado actualmente
  const clavePeriodoSeleccionado = useMemo(() => {
    const encontrado = mesesData.find((d) => d.mes === selectedPeriod)
    return encontrado?.claveMes || null
  }, [mesesData, selectedPeriod])

  // Datos del período seleccionado
  const currentPeriodData = useMemo<MesFinanciero>(() => {
    return (
      mesesData.find((d) => d.mes === selectedPeriod) ||
      mesesData[mesesData.length - 1] || {
        mes: selectedPeriod,
        mesCorto: selectedPeriod.slice(0, 3),
        anio: selectedYear,
        claveMes: `${selectedYear}-01`,
        ingresos: 0,
        egresos: 0,
        balance: 0,
        tasaMorosidad: 0,
      }
    )
  }, [mesesData, selectedPeriod, selectedYear])

  // Totales anuales reactivos
  const totalIngresosAnual = useMemo(() => mesesData.reduce((acc, curr) => acc + curr.ingresos, 0), [mesesData])
  const totalEgresosAnual = useMemo(() => mesesData.reduce((acc, curr) => acc + curr.egresos, 0), [mesesData])
  const superavitAnual = totalIngresosAnual - totalEgresosAnual
  const fondoReservaAcumulado = Math.round(totalIngresosAnual * 0.05)

  // ── Cálculo Reactivo de Categorías de Ingreso y Gasto del Período ─────────────

  const categoriasGasto = useMemo<CategoriaGasto[]>(() => {
    const egresosPeriodo = movimientosList.filter(
      (m) =>
        m.tipo === 'Egreso' &&
        (clavePeriodoSeleccionado ? extraerClaveMes(m.fecha) === clavePeriodoSeleccionado : true)
    )
    const totalEgresos = egresosPeriodo.reduce((acc, m) => acc + (Number(m.monto) || 0), 0)

    const agrupado: Record<string, number> = {}
    for (const m of egresosPeriodo) {
      const nombre = m.categoria?.nombre || m.descripcion || 'Gastos Operativos Varios'
      agrupado[nombre] = (agrupado[nombre] || 0) + (Number(m.monto) || 0)
    }

    const estilos = [
      { color: 'bg-indigo-600', textClass: 'text-indigo-600' },
      { color: 'bg-blue-600', textClass: 'text-blue-600' },
      { color: 'bg-emerald-600', textClass: 'text-emerald-600' },
      { color: 'bg-amber-600', textClass: 'text-amber-600' },
      { color: 'bg-teal-600', textClass: 'text-teal-600' },
      { color: 'bg-purple-600', textClass: 'text-purple-600' },
      { color: 'bg-rose-600', textClass: 'text-rose-600' },
    ]

    const entries = Object.entries(agrupado).sort((a, b) => b[1] - a[1])
    return entries.map(([nombre, monto], idx) => {
      const estilo = estilos[idx % estilos.length]
      const porcentaje = totalEgresos > 0 ? Math.round((monto / totalEgresos) * 1000) / 10 : 0
      return {
        nombre,
        monto,
        porcentaje,
        color: estilo.color,
        textClass: estilo.textClass,
      }
    })
  }, [movimientosList, clavePeriodoSeleccionado])

  const categoriasIngreso = useMemo<CategoriaIngreso[]>(() => {
    const ingresosPeriodo = movimientosList.filter(
      (m) =>
        m.tipo === 'Ingreso' &&
        (clavePeriodoSeleccionado ? extraerClaveMes(m.fecha) === clavePeriodoSeleccionado : true)
    )
    const totalIngresos = ingresosPeriodo.reduce((acc, m) => acc + (Number(m.monto) || 0), 0)

    const agrupado: Record<string, number> = {}
    for (const m of ingresosPeriodo) {
      const nombre = m.categoria?.nombre || m.descripcion || 'Ingresos por Expensas Comunes'
      agrupado[nombre] = (agrupado[nombre] || 0) + (Number(m.monto) || 0)
    }

    const colores = ['bg-emerald-600', 'bg-blue-600', 'bg-indigo-600', 'bg-purple-600', 'bg-teal-600', 'bg-amber-600']
    const entries = Object.entries(agrupado).sort((a, b) => b[1] - a[1])

    return entries.map(([nombre, monto], idx) => {
      const color = colores[idx % colores.length]
      const porcentaje = totalIngresos > 0 ? Math.round((monto / totalIngresos) * 1000) / 10 : 0
      return {
        nombre,
        monto,
        porcentaje,
        color,
      }
    })
  }, [movimientosList, clavePeriodoSeleccionado])

  // ── Saldos de Bancos y Liquidez ──────────────────────────────────────────────

  const saldoBancoTotal = useMemo(() => {
    return cuentasBancarias.reduce(
      (acc, c) => acc + (Number(c.saldoCalculado) || Number(c.saldoActual) || 0),
      0
    )
  }, [cuentasBancarias])

  const liquidezTotal = saldoBancoTotal + saldoCajaChica

  // ── Morosos Filtrados ────────────────────────────────────────────────────────

  const morososFiltrados = useMemo(() => {
    return morososList.filter((m) => {
      const cumpleFiltroSeveridad =
        filtroSeveridad === 'TODOS' ||
        (filtroSeveridad === 'AVISO' && m.expensasMoraCount === 1) ||
        (filtroSeveridad === 'MORA' && m.expensasMoraCount === 2) ||
        (filtroSeveridad === 'CRITICO' && m.expensasMoraCount >= 3)

      if (!cumpleFiltroSeveridad) return false
      if (!searchMoroso.trim()) return true

      const s = searchMoroso.toLowerCase()
      const nomCompleto = `${m.propietario?.nombres || ''} ${m.propietario?.apellidos || ''}`.toLowerCase()
      return (
        m.numero.toLowerCase().includes(s) ||
        nomCompleto.includes(s) ||
        (m.propietario?.telefono || '').includes(s)
      )
    })
  }, [morososList, searchMoroso, filtroSeveridad])

  const totalDeudaMorosos = useMemo(() => {
    return morososList.reduce((acc, m) => acc + (Number(m.totalDeuda) || 0), 0)
  }, [morososList])

  // ── Movimientos Filtrados para el Visor 8.3 ───────────────────────────────────

  const movimientosFiltrados = useMemo(() => {
    return movimientosList.filter((mov) => {
      if (filtroTipoMov !== 'TODOS' && mov.tipo !== filtroTipoMov) return false
      if (!searchMovimiento.trim()) return true

      const s = searchMovimiento.toLowerCase()
      return (
        mov.descripcion.toLowerCase().includes(s) ||
        (mov.tercero || '').toLowerCase().includes(s) ||
        (mov.categoria?.nombre || '').toLowerCase().includes(s)
      )
    })
  }, [movimientosList, filtroTipoMov, searchMovimiento])

  // Escala máxima del gráfico de barras mes a mes
  const maxValGrafico = useMemo(() => {
    const vals = mesesData.map((m) => Math.max(m.ingresos, m.egresos))
    return Math.max(1000, ...vals)
  }, [mesesData])

  // Notificación por WhatsApp oficial a deudor
  const handleNotificarWhatsApp = (m: MorosoItem) => {
    const tel = m.propietario?.telefono?.replace(/\D/g, '') || ''
    const numeroTel = tel.length === 8 ? `591${tel}` : tel
    const nombre = m.propietario ? `${m.propietario.nombres} ${m.propietario.apellidos}` : 'Copropietario'
    const texto = `Estimado(a) *${nombre}*,\n\nLe saludamos cordialmente de la Administración del *Condominio Edificio XYZ*.\n\nLe recordamos amablemente que la unidad *Dpto ${m.numero}* cuenta con un saldo pendiente de expensas por *Bs. ${m.totalDeuda.toLocaleString('es-BO', { minimumFractionDigits: 2 })}* (${m.expensasMoraCount} ${m.expensasMoraCount === 1 ? 'mes' : 'meses'} pendientes).\n\nPuede realizar el pago al instante mediante Código QR o transferencia directa a la cuenta del edificio. Para mayor información o enviar su comprobante, quedamos a su entera disposición.\n\n¡Agradecemos mucho su gentil colaboración y compromiso con nuestro edificio!`

    const url = `https://wa.me/${numeroTel}?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
    setIsNotificationSent(m.numero)
    setTimeout(() => setIsNotificationSent(null), 4000)
  }

  // Navegar a Historial de Departamento desde la lista de morosos
  const handleVerHistorialDpto = (idDpto: number) => {
    setSelectedDptoId(idDpto)
    setActiveTab('historial_dpto')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      {/* ── ENCABEZADO Y SELECTOR DE PERÍODO ─────────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            EDIFICIO XYZ · Fiscalización y Finanzas
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#262422] dark:text-white tracking-tight">
            Centro de Reportes Financieros y Balances
          </h1>
          <p className="text-xs sm:text-sm text-[#7d776f] dark:text-slate-400">
            Supervisión integral de recaudación de expensas, balance mensual, flujo de caja, morosidad e historial por departamento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Indicador de Estado de Conexión */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-[11px] font-semibold text-[#5c5750] dark:text-slate-300 border border-[#cec8bc] dark:border-slate-700">
            <span
              className={`w-2 h-2 rounded-full ${isRealData ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
            />
            <span>{isRealData ? 'Datos en Vivo' : 'Modo Seguro'}</span>
            {lastSyncTime && <span className="text-[#7d776f] font-mono">({lastSyncTime})</span>}
          </div>

          <button
            onClick={cargarDatos}
            disabled={isLoading}
            title="Recargar datos"
            className="p-2 rounded-xl bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#5c5750] dark:text-slate-300 border border-[#cec8bc] dark:border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
          </button>

          {/* Selector de Gestión / Año */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => {
                const anio = Number(e.target.value)
                setSelectedYear(anio)
                const mesActualTexto = selectedPeriod.split(' ')[0]
                setSelectedPeriod(`${mesActualTexto} ${anio}`)
              }}
              className="bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-600 appearance-none pr-7 cursor-pointer shadow-xs"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  Gestión {y}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-[#7d776f] pointer-events-none" />
          </div>

          {/* Selector de Mes */}
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-600 appearance-none pr-8 cursor-pointer shadow-xs"
            >
              {mesesData.map((d) => (
                <option key={d.mes} value={d.mes}>
                  Período: {d.mes}
                </option>
              ))}
            </select>
            <Calendar className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7d776f] pointer-events-none" />
          </div>

          {/* Botón de Exportación e Impresión Oficial */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-2 bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-900/20 active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Emitir Informe Oficial</span>
          </button>
        </div>
      </div>

      {/* ── TARJETAS KPI SUPERIORES (EJECUTIVAS REACTIVAS) ───────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ingresos */}
        <div className="bg-[#ede9e1] dark:bg-slate-900 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase tracking-wider">
              Ingresos Recaudados ({currentPeriodData.mesCorto})
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#262422] dark:text-white">
              Bs. {currentPeriodData.ingresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Expensas comunes y recaudación</span>
            </div>
          </div>
        </div>

        {/* Total Egresos */}
        <div className="bg-[#ede9e1] dark:bg-slate-900 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase tracking-wider">
              Egresos Ejecutados ({currentPeriodData.mesCorto})
            </span>
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#262422] dark:text-white">
              Bs. {currentPeriodData.egresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-rose-700 dark:text-rose-400 font-semibold">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Operación, servicios y mantenimiento</span>
            </div>
          </div>
        </div>

        {/* Balance Neto / Superávit */}
        <div className="bg-[#ede9e1] dark:bg-slate-900 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase tracking-wider">
              Balance Neto ({currentPeriodData.mesCorto})
            </span>
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-purple-700 dark:text-purple-400">
              {currentPeriodData.balance >= 0 ? '+' : ''}Bs. {currentPeriodData.balance.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[#7d776f] dark:text-slate-400 font-medium">
              <span>Fondo de reserva: Bs. {fondoReservaAcumulado.toLocaleString('es-BO')} (5%)</span>
            </div>
          </div>
        </div>

        {/* Tasa y Total Morosidad */}
        <div className="bg-[#ede9e1] dark:bg-slate-900 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase tracking-wider">
              Cartera Morosa Total
            </span>
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700 dark:text-rose-400">
              Bs. {totalDeudaMorosos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-700 dark:text-amber-400 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{morososList.length} departamentos en mora ({currentPeriodData.tasaMorosidad}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SELECTOR DE PESTAÑAS (LOS 4 VISORES FINANCIEROS OFICIALES) ───────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => setActiveTab('balance')}
          className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${activeTab === 'balance'
            ? 'bg-purple-700 text-white border-purple-600 shadow-lg shadow-purple-900/20 ring-2 ring-purple-500/30'
            : 'bg-[#ede9e1] hover:bg-[#e4ded3] dark:bg-slate-900 dark:hover:bg-slate-800/80 text-[#5c5750] dark:text-slate-400 border-[#cec8bc] dark:border-slate-800'
            }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activeTab === 'balance' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800 dark:bg-slate-800 dark:text-purple-400'
              }`}
          >
            <FileBarChart className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-black truncate">1. Balance Mensual</div>
            <div className={`text-[11px] truncate ${activeTab === 'balance' ? 'text-purple-100' : 'text-[#7d776f]'}`}>
              Ingresos vs. Egresos (8.1 / 8.2)
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('morosos')}
          className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${activeTab === 'morosos'
            ? 'bg-purple-700 text-white border-purple-600 shadow-lg shadow-purple-900/20 ring-2 ring-purple-500/30'
            : 'bg-[#ede9e1] hover:bg-[#e4ded3] dark:bg-slate-900 dark:hover:bg-slate-800/80 text-[#5c5750] dark:text-slate-400 border-[#cec8bc] dark:border-slate-800'
            }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activeTab === 'morosos' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 dark:bg-slate-800 dark:text-amber-400'
              }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-black truncate">2. Lista de Morosos</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${activeTab === 'morosos' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-900 dark:bg-slate-800 dark:text-rose-300'
                  }`}
              >
                {morososList.length}
              </span>
            </div>
            <div className={`text-[11px] truncate ${activeTab === 'morosos' ? 'text-purple-100' : 'text-[#7d776f]'}`}>
              Cobranza y WhatsApp (8.4 Crítico)
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('flujo')}
          className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${activeTab === 'flujo'
            ? 'bg-purple-700 text-white border-purple-600 shadow-lg shadow-purple-900/20 ring-2 ring-purple-500/30'
            : 'bg-[#ede9e1] hover:bg-[#e4ded3] dark:bg-slate-900 dark:hover:bg-slate-800/80 text-[#5c5750] dark:text-slate-400 border-[#cec8bc] dark:border-slate-800'
            }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activeTab === 'flujo' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800 dark:bg-slate-800 dark:text-blue-400'
              }`}
          >
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-black truncate">3. Flujo de Caja</div>
            <div className={`text-[11px] truncate ${activeTab === 'flujo' ? 'text-purple-100' : 'text-[#7d776f]'}`}>
              Liquidez y Cuentas (8.3)
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('historial_dpto')}
          className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${activeTab === 'historial_dpto'
            ? 'bg-purple-700 text-white border-purple-600 shadow-lg shadow-purple-900/20 ring-2 ring-purple-500/30'
            : 'bg-[#ede9e1] hover:bg-[#e4ded3] dark:bg-slate-900 dark:hover:bg-slate-800/80 text-[#5c5750] dark:text-slate-400 border-[#cec8bc] dark:border-slate-800'
            }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activeTab === 'historial_dpto' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800 dark:bg-slate-800 dark:text-teal-400'
              }`}
          >
            <Building className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-black truncate">4. Historial por Dpto</div>
            <div className={`text-[11px] truncate ${activeTab === 'historial_dpto' ? 'text-purple-100' : 'text-[#7d776f]'}`}>
              Extractos individuales (8.6 Crítico)
            </div>
          </div>
        </button>
      </div>

      {/* ── VISOR 1: BALANCE MENSUAL Y ESTADO FINANCIERO (8.1, 8.2, 8.5) ────── */}
      {activeTab === 'balance' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico Comparativo Mes a Mes */}
            <div className="lg:col-span-2 bg-[#ede9e1] dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-[#262422] dark:text-white flex items-center gap-2">
                    <FileBarChart className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                    Comparativa Histórica Mensual: Ingresos vs. Egresos ({selectedYear})
                  </h2>
                  <p className="text-xs text-[#7d776f] dark:text-slate-400">
                    Haz clic sobre cualquier mes para seleccionar y visualizar su auditoría detallada.
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-xs font-bold">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <span className="w-3 h-3 rounded-md bg-emerald-600 inline-block" /> Ingresos
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                    <span className="w-3 h-3 rounded-md bg-rose-600 inline-block" /> Egresos
                  </div>
                </div>
              </div>

              {/* Lista interactiva de barras mes a mes */}
              <div className="space-y-2.5 pt-1">
                {mesesData.map((item) => {
                  const ingresosPercent = Math.min((item.ingresos / maxValGrafico) * 100, 100)
                  const egresosPercent = Math.min((item.egresos / maxValGrafico) * 100, 100)
                  const isSelected = item.mes === selectedPeriod

                  return (
                    <div
                      key={item.mes}
                      onClick={() => setSelectedPeriod(item.mes)}
                      className={`p-3 rounded-2xl transition-all cursor-pointer border ${isSelected
                        ? 'bg-[#ded8cc] dark:bg-slate-800 border-purple-600/50 ring-2 ring-purple-600/20 shadow-xs'
                        : 'bg-[#ede9e1]/50 hover:bg-[#e3ded4] dark:bg-slate-900/40 dark:hover:bg-slate-800/60 border-transparent'
                        }`}
                    >
                      <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                        <span className="text-[#262422] dark:text-white flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-purple-600' : 'bg-transparent'}`} />
                          {item.mes}
                        </span>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-xs text-[#7d776f] dark:text-slate-400">
                            Superávit:{' '}
                            <span
                              className={`font-bold ${item.balance >= 0 ? 'text-purple-700 dark:text-purple-400' : 'text-rose-700 dark:text-rose-400'
                                }`}
                            >
                              {item.balance >= 0 ? '+' : ''}Bs. {item.balance.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {/* Barra Ingresos */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] w-12 text-[#7d776f] dark:text-slate-400 font-mono font-bold">
                            Ingreso
                          </span>
                          <div className="flex-1 bg-[#d5cfc2] dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${ingresosPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400 font-bold w-24 text-right">
                            Bs. {item.ingresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Barra Egresos */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] w-12 text-[#7d776f] dark:text-slate-400 font-mono font-bold">
                            Egreso
                          </span>
                          <div className="flex-1 bg-[#d5cfc2] dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-rose-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${egresosPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-rose-800 dark:text-rose-400 font-bold w-24 text-right">
                            Bs. {item.egresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Totalizador Acumulado */}
              <div className="pt-3 border-t border-[#cec8bc] dark:border-slate-800 flex flex-wrap justify-between items-center text-xs font-bold text-[#5c5750] dark:text-slate-300 gap-2">
                <span>Total Consolidado Gestión {selectedYear}:</span>
                <div className="flex flex-wrap gap-4 font-mono">
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Ingresos: Bs. {totalIngresosAnual.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-rose-700 dark:text-rose-400">
                    Egresos: Bs. {totalEgresosAnual.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-purple-700 dark:text-purple-400 font-black">
                    Superávit Neto: {superavitAnual >= 0 ? '+' : ''}Bs. {superavitAnual.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Desglose de Gastos por Rubro (8.5) & Origen de Ingresos */}
            <div className="space-y-6">
              {/* Egresos por Rubro */}
              <div className="bg-[#ede9e1] dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-xs space-y-4">
                <div className="border-b border-[#cec8bc] dark:border-slate-800 pb-3">
                  <h2 className="text-base font-extrabold text-[#262422] dark:text-white flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                    Egresos por Rubro ({currentPeriodData.mesCorto})
                  </h2>
                  <p className="text-xs text-[#7d776f] dark:text-slate-400">
                    Distribución porcentual de los costos operativos del edificio.
                  </p>
                </div>

                <div className="space-y-3.5">
                  {categoriasGasto.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#7d776f] dark:text-slate-400 font-semibold">
                      No se registraron egresos en este período.
                    </div>
                  ) : (
                    categoriasGasto.map((cat) => (
                      <div key={cat.nombre} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-[#262422] dark:text-slate-200 truncate pr-2">
                            {cat.nombre}
                          </span>
                          <span className="font-mono font-bold text-[#5c5750] dark:text-slate-300">
                            Bs. {cat.monto.toLocaleString('es-BO', { minimumFractionDigits: 2 })} ({cat.porcentaje}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#d5cfc2] dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className={`${cat.color} h-full rounded-full transition-all duration-500`} style={{ width: `${cat.porcentaje}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Origen de Ingresos */}
              <div className="bg-[#ede9e1] dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-xs space-y-4">
                <div className="border-b border-[#cec8bc] dark:border-slate-800 pb-3">
                  <h2 className="text-base font-extrabold text-[#262422] dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    Origen de Ingresos ({currentPeriodData.mesCorto})
                  </h2>
                  <p className="text-xs text-[#7d776f] dark:text-slate-400">
                    Conceptos de recaudación ordinaria y extraordinaria.
                  </p>
                </div>

                <div className="space-y-3.5">
                  {categoriasIngreso.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#7d776f] dark:text-slate-400 font-semibold">
                      No se registraron ingresos en este período.
                    </div>
                  ) : (
                    categoriasIngreso.map((cat) => (
                      <div key={cat.nombre} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-[#262422] dark:text-slate-200 truncate pr-2">
                            {cat.nombre}
                          </span>
                          <span className="font-mono font-bold text-[#5c5750] dark:text-slate-300">
                            Bs. {cat.monto.toLocaleString('es-BO', { minimumFractionDigits: 2 })} ({cat.porcentaje}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#d5cfc2] dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className={`${cat.color} h-full rounded-full transition-all duration-500`} style={{ width: `${cat.porcentaje}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-100/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-300">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    Fondo de Reserva Blindado (5%)
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    De cada pago de expensa, el 5% es resguardado de forma inembargable en la cuenta de emergencia para contingencias mayores del ascensor o bombas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VISOR 2: LISTA OFICIAL DE MOROSOS (8.4 - CRÍTICO) ───────────────── */}
      {activeTab === 'morosos' && (
        <div className="bg-[#ede9e1] dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#cec8bc] dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#262422] dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Lista Oficial de Departamentos en Mora
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 text-xs font-black">
                  Total Deuda: Bs. {totalDeudaMorosos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-xs text-[#7d776f] dark:text-slate-400 mt-0.5">
                Control de retrasos, liquidación de deuda y notificación formal directa por WhatsApp.
              </p>
            </div>

            {/* Filtros de búsqueda y severidad */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex rounded-xl p-1 bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFiltroSeveridad('TODOS')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${filtroSeveridad === 'TODOS'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-[#5c5750] dark:text-slate-300 hover:text-[#262422]'
                    }`}
                >
                  Todos ({morososList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroSeveridad('AVISO')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${filtroSeveridad === 'AVISO'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-[#5c5750] dark:text-slate-300 hover:text-[#262422]'
                    }`}
                >
                  Aviso 30d
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroSeveridad('MORA')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${filtroSeveridad === 'MORA'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-[#5c5750] dark:text-slate-300 hover:text-[#262422]'
                    }`}
                >
                  Mora 60d
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroSeveridad('CRITICO')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${filtroSeveridad === 'CRITICO'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-[#5c5750] dark:text-slate-300 hover:text-[#262422]'
                    }`}
                >
                  Crítico +90d
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7d776f]" />
                <input
                  type="text"
                  placeholder="Buscar dpto o propietario..."
                  value={searchMoroso}
                  onChange={(e) => setSearchMoroso(e.target.value)}
                  className="bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600 w-full sm:w-56"
                />
              </div>
            </div>
          </div>

          {/* Tabla de Morosos */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#cec8bc] dark:border-slate-800 text-[#7d776f] dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 px-3">Unidad</th>
                  <th className="pb-3 px-3">Propietario / Contacto</th>
                  <th className="pb-3 px-3">Meses de Retraso</th>
                  <th className="pb-3 px-3">Deuda Acumulada</th>
                  <th className="pb-3 px-3">Detalle de Meses</th>
                  <th className="pb-3 px-3 text-right">Acciones de Cobranza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cec8bc]/50 dark:divide-slate-800/60">
                {morososFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#7d776f] dark:text-slate-400 font-semibold">
                      🎉 No se encontraron unidades en mora con los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  morososFiltrados.map((item) => {
                    const nombre = item.propietario
                      ? `${item.propietario.nombres} ${item.propietario.apellidos}`
                      : 'Propietario No Registrado'
                    const tel = item.propietario?.telefono || 'Sin teléfono'
                    const isNotified = isNotificationSent === item.numero

                    return (
                      <tr key={item.idDepartamento} className="hover:bg-[#e4ded4]/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-bold text-[#262422] dark:text-white">
                          <span className="px-2.5 py-1 rounded-xl bg-[#ded8cc] dark:bg-slate-800 font-mono text-xs border border-[#cec8bc] dark:border-slate-700 inline-block font-extrabold">
                            Dpto {item.numero}
                          </span>
                          {item.piso && (
                            <span className="text-[10px] text-[#7d776f] dark:text-slate-400 block mt-0.5">
                              Piso {item.piso}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-[#262422] dark:text-slate-200">{nombre}</div>
                          <div className="text-[11px] text-[#7d776f] dark:text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3" />
                            <span>{tel}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${item.expensasMoraCount >= 3
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                              : item.expensasMoraCount === 2
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                              }`}
                          >
                            <Clock className="w-3 h-3" />
                            {item.expensasMoraCount} {item.expensasMoraCount === 1 ? 'mes' : 'meses'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-rose-700 dark:text-rose-400 text-sm">
                          Bs. {item.totalDeuda.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {item.detalleExpensas.map((d) => (
                              <span
                                key={d.idExpensa}
                                className="px-2 py-0.5 rounded-md bg-[#ded8cc] dark:bg-slate-800 text-[10px] font-mono text-[#5c5750] dark:text-slate-300"
                              >
                                {d.periodo}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleVerHistorialDpto(item.idDepartamento)}
                              title="Ver extracto e historial"
                              className="px-2.5 py-1.5 rounded-xl bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#5c5750] dark:text-slate-300 text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Extracto</span>
                            </button>

                            <button
                              onClick={() => handleNotificarWhatsApp(item)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isNotified
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                                }`}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>{isNotified ? '¡Enviado!' : 'WhatsApp'}</span>
                            </button>
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
      )}

      {/* ── VISOR 3: FLUJO DE CAJA Y CUENTAS INSTITUCIONALES (8.3) ────────────────── */}
      {activeTab === 'flujo' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Cuentas de Liquidez */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#ede9e1] dark:bg-slate-900 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase">
                  {cuentasBancarias.length > 0 ? (cuentasBancarias[0].banco || 'Cuentas Institucionales') : 'Cuentas Institucionales'}
                </span>
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400">
                  <Landmark className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-[#262422] dark:text-white">
                  Bs. {saldoBancoTotal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-[#7d776f] dark:text-slate-400 mt-1 font-semibold truncate">
                  {cuentasBancarias.length > 0
                    ? `Cta: ${cuentasBancarias[0].numeroCuenta}${cuentasBancarias.length > 1 ? ` (+${cuentasBancarias.length - 1} más)` : ''}`
                    : 'Sin cuentas registradas'}
                </div>
              </div>
            </div>

            <div className="bg-[#ede9e1] dark:bg-slate-900 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase">
                  Caja Chica del Edificio
                </span>
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-[#262422] dark:text-white">
                  Bs. {saldoCajaChica.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-[#7d776f] dark:text-slate-400 mt-1 font-semibold">
                  Gastos menores, compras de limpieza y suministros
                </div>
              </div>
            </div>

            <div className="bg-[#ede9e1] dark:bg-slate-900 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase">
                  Liquidez Total Disponible
                </span>
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-purple-700 dark:text-purple-400">
                  Bs. {liquidezTotal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-[#7d776f] dark:text-slate-400 mt-1 font-semibold">
                  Fondos activos conciliados al 100%
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Movimientos Financieros */}
          <div className="bg-[#ede9e1] dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#cec8bc] dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-[#262422] dark:text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                  Registro de Movimientos Financieros Operativos
                </h2>
                <p className="text-xs text-[#7d776f] dark:text-slate-400">
                  Ingresos de recaudación y egresos hacia proveedores de servicios y mantenimiento.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="inline-flex rounded-xl p-1 bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFiltroTipoMov('TODOS')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${filtroTipoMov === 'TODOS'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-[#5c5750] dark:text-slate-300'
                      }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroTipoMov('Ingreso')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${filtroTipoMov === 'Ingreso'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-[#5c5750] dark:text-slate-300'
                      }`}
                  >
                    Ingresos
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroTipoMov('Egreso')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${filtroTipoMov === 'Egreso'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-[#5c5750] dark:text-slate-300'
                      }`}
                  >
                    Egresos
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7d776f]" />
                  <input
                    type="text"
                    placeholder="Buscar proveedor o concepto..."
                    value={searchMovimiento}
                    onChange={(e) => setSearchMovimiento(e.target.value)}
                    className="bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 text-xs rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600 w-full sm:w-56"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#cec8bc] dark:border-slate-800 text-[#7d776f] dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 px-3">Fecha</th>
                    <th className="pb-3 px-3">Tipo</th>
                    <th className="pb-3 px-3">Concepto</th>
                    <th className="pb-3 px-3">Categoría</th>
                    <th className="pb-3 px-3">Tercero / Proveedor</th>
                    <th className="pb-3 px-3 text-right">Monto (Bs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cec8bc]/50 dark:divide-slate-800/60">
                  {movimientosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#7d776f] dark:text-slate-400 font-semibold">
                        No se registraron movimientos en este período.
                      </td>
                    </tr>
                  ) : (
                    movimientosFiltrados.map((mov) => (
                      <tr key={mov.idMovimiento} className="hover:bg-[#e4ded4]/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono text-[#5c5750] dark:text-slate-300">
                          {fechaSolo(mov.fecha)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${mov.tipo === 'Ingreso'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                              }`}
                          >
                            {mov.tipo === 'Ingreso' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {mov.tipo}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#262422] dark:text-slate-200 max-w-xs truncate">
                          {mov.descripcion}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-[#ded8cc] dark:bg-slate-800 text-[10px] font-semibold text-[#5c5750] dark:text-slate-300">
                            {mov.categoria?.nombre || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#5c5750] dark:text-slate-300">
                          {mov.tercero || 'Edificio XYZ'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-sm">
                          <span className={mov.tipo === 'Ingreso' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                            {mov.tipo === 'Ingreso' ? '+' : '-'}Bs. {Number(mov.monto).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── VISOR 4: HISTORIAL DE PAGOS POR DEPARTAMENTO (8.6 - CRÍTICO) ─────── */}
      {activeTab === 'historial_dpto' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Selector de Departamento */}
          <div className="no-print bg-[#ede9e1] dark:bg-slate-900 p-5 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-[#262422] dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                Consulta Individual de Historial y Estado de Cuenta por Departamento
              </h2>
              <p className="text-xs text-[#7d776f] dark:text-slate-400">
                Selecciona la unidad habitacional para auditar todos sus cargos, abonos y extracto histórico cronológico.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <select
                value={selectedDptoId || ''}
                onChange={(e) => setSelectedDptoId(Number(e.target.value))}
                className="w-full bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-600 appearance-none pr-8 cursor-pointer shadow-xs"
              >
                {departamentos.length > 0 ? (
                  departamentos.map((d) => (
                    <option key={d.idDepartamento} value={d.idDepartamento}>
                      Departamento {d.numero} {d.propietario ? `(${d.propietario.nombres} ${d.propietario.apellidos})` : ''}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    Cargando departamentos...
                  </option>
                )}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#7d776f] pointer-events-none" />
            </div>
          </div>

          {/* Contenedor Imprimible del Extracto de Unidad */}
          <div
            id={!isExportModalOpen && activeTab === 'historial_dpto' ? "area-impresion" : undefined}
            className="space-y-6"
          >
            <style dangerouslySetInnerHTML={{
              __html: `
              @media print {
                body * { visibility: hidden !important; }
                #area-impresion, #area-impresion * { visibility: visible !important; color: #000 !important; }
                #area-impresion { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: #fff !important; color: #000 !important; }
                .no-print { display: none !important; }
              }
            `}} />

            {/* Ficha Resumen del Departamento Seleccionado */}
            {estadoCuentaDpto ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#ede9e1] dark:bg-slate-900 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-bold text-[#7d776f] dark:text-slate-400 uppercase">
                    Unidad Habitacional
                  </span>
                  <div className="text-xl font-black text-[#262422] dark:text-white mt-1">
                    Dpto {estadoCuentaDpto.departamento.numero}
                  </div>
                  <div className="text-xs text-[#7d776f] dark:text-slate-400 mt-0.5">
                    Piso {estadoCuentaDpto.departamento.piso || 1} · {estadoCuentaDpto.departamento.tipo?.nombre || 'Tipo A'}
                  </div>
                </div>

                <div className="bg-[#ede9e1] dark:bg-slate-900 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-bold text-[#7d776f] dark:text-slate-400 uppercase">
                    Propietario Registrado
                  </span>
                  <div className="text-sm font-black text-[#262422] dark:text-white mt-1 truncate">
                    {estadoCuentaDpto.departamento.propietario
                      ? `${estadoCuentaDpto.departamento.propietario.nombres} ${estadoCuentaDpto.departamento.propietario.apellidos}`
                      : 'Sin Propietario'}
                  </div>
                  <div className="text-xs text-[#7d776f] dark:text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3" />
                    <span>{estadoCuentaDpto.departamento.propietario?.telefono || 'Sin teléfono'}</span>
                  </div>
                </div>

                <div className="bg-[#ede9e1] dark:bg-slate-900 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-bold text-[#7d776f] dark:text-slate-400 uppercase">
                    Total Pagado Histórico
                  </span>
                  <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
                    Bs. {estadoCuentaDpto.resumen.totalPagado.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-[#7d776f] dark:text-slate-400 mt-0.5">
                    Obligaciones: Bs. {estadoCuentaDpto.resumen.totalObligaciones.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="bg-[#ede9e1] dark:bg-slate-900 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-bold text-[#7d776f] dark:text-slate-400 uppercase">
                    Saldo Actual de la Unidad
                  </span>
                  <div
                    className={`text-xl font-black mt-1 font-mono ${estadoCuentaDpto.resumen.saldoPendienteTotal > 0
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                  >
                    Bs. {estadoCuentaDpto.resumen.saldoPendienteTotal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs font-bold mt-0.5">
                    {estadoCuentaDpto.resumen.saldoPendienteTotal === 0 ? (
                      <span className="text-emerald-700 dark:text-emerald-400">✅ Al día (Sin deudas)</span>
                    ) : (
                      <span className="text-rose-700 dark:text-rose-400">⚠️ Saldo Pendiente por regularizar</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#ede9e1] dark:bg-slate-900 p-8 rounded-3xl border border-[#cec8bc] dark:border-slate-800 text-center text-[#7d776f] dark:text-slate-400">
                <Building className="w-10 h-10 mx-auto mb-2 opacity-40 text-purple-600" />
                <div className="font-extrabold text-sm text-[#262422] dark:text-slate-200">
                  Sin movimientos registrados para esta unidad
                </div>
                <div className="text-xs mt-1">
                  Este departamento aún no cuenta con obligaciones emitidas o pagos registrados en el sistema.
                </div>
              </div>
            )}

            {/* Tabla Cronológica de Movimientos del Departamento */}
            {estadoCuentaDpto && (
              <div className="bg-[#ede9e1] dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#262422] dark:text-white">
                      Línea de Tiempo Financiera: Expensas Emitidas y Pagos Registrados
                    </h3>
                    <p className="text-xs text-[#7d776f] dark:text-slate-400">
                      Trazabilidad de cada obligación y abono con saldo progresivo.
                    </p>
                  </div>

                  <button
                    onClick={() => window.print()}
                    className="no-print px-3 py-1.5 rounded-xl bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#5c5750] dark:text-slate-300 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Extracto</span>
                  </button>
                </div>

                {isLoadingDpto ? (
                  <div className="py-12 text-center text-[#7d776f] dark:text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                    <span>Cargando extracto de la unidad...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#cec8bc] dark:border-slate-800 text-[#7d776f] dark:text-slate-400 font-bold uppercase tracking-wider">
                          <th className="pb-3 px-3">Fecha</th>
                          <th className="pb-3 px-3">Concepto / Obligación</th>
                          <th className="pb-3 px-3">Medio de Pago</th>
                          <th className="pb-3 px-3 text-right">Cargo (Debe)</th>
                          <th className="pb-3 px-3 text-right">Abono (Haber)</th>
                          <th className="pb-3 px-3 text-right">Saldo Progresivo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#cec8bc]/50 dark:divide-slate-800/60 font-mono">
                        {estadoCuentaDpto.movimientos.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-[#7d776f] font-sans">
                              No se registran movimientos en la cuenta de este departamento.
                            </td>
                          </tr>
                        ) : (
                          estadoCuentaDpto.movimientos.map((m) => (
                            <tr key={m.id} className="hover:bg-[#e4ded4]/60 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-3 text-[#5c5750] dark:text-slate-300">
                                {fechaSolo(m.fecha)}
                              </td>
                              <td className="py-3 px-3 font-sans">
                                <div className="font-extrabold text-[#262422] dark:text-slate-200">
                                  {m.concepto}
                                </div>
                                {m.periodo && (
                                  <span className="text-[10px] text-[#7d776f] dark:text-slate-400">
                                    Período fiscal: {m.periodo}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 font-sans">
                                {m.metodoPago ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 text-[10px] font-black">
                                    {m.metodoPago}
                                  </span>
                                ) : (
                                  <span className="text-[#7d776f] dark:text-slate-400 text-[11px]">—</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right text-rose-700 dark:text-rose-400 font-bold">
                                {m.debe > 0 ? `Bs. ${Number(m.debe).toFixed(2)}` : '—'}
                              </td>
                              <td className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold">
                                {m.haber > 0 ? `Bs. ${Number(m.haber).toFixed(2)}` : '—'}
                              </td>
                              <td className="py-3 px-3 text-right font-black text-[#262422] dark:text-white">
                                Bs. {Number(m.saldoProgresivo).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Línea de firma vacía */}
                <div className="pt-8 flex justify-end">
                  <div className="w-48 border-t border-slate-400 pt-1 text-center text-xs text-[#5c5750] dark:text-slate-400 font-bold">
                    Firma
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL DE VISTA PREVIA IMPRIMIBLE Y EXPORTACIÓN OFICIAL ─────────────── */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecera del Modal */}
            <div className="no-print flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-700 text-white">
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-[#262422] dark:text-white">
                    Informe Financiero y Rendición de Cuentas Oficial
                  </h3>
                  <p className="text-xs text-[#7d776f] dark:text-slate-400">
                    Formato oficial para asamblea general ordinaria y archivo fiscal.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Documento Imprimible Formal */}
            <div
              id="area-impresion"
              className="p-6 rounded-2xl bg-white dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 space-y-5 text-[#262422] dark:text-slate-100 font-sans shadow-inner"
            >
              <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  body * { visibility: hidden !important; }
                  #area-impresion, #area-impresion * { visibility: visible !important; color: #000 !important; }
                  #area-impresion { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: #fff !important; color: #000 !important; }
                  .no-print { display: none !important; }
                }
              `}} />

              {/* Membrete Oficial */}
              <div className="border-b-2 border-purple-700 pb-3 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-purple-900 dark:text-purple-300">
                    EDIFICIO XYZ
                  </h2>
                </div>
                <div className="text-right text-xs">
                  <div className="font-extrabold uppercase text-purple-900 dark:text-purple-300">
                    Estado de Resultados
                  </div>
                  <div className="font-mono text-[#7d776f]">Gestión: {selectedYear}</div>
                  <div className="text-[11px] text-[#7d776f]">Emisión: {fechaSolo(new Date().toISOString())}</div>
                </div>
              </div>

              {/* Cuadro Resumen Ejecutivo */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border">
                  <div className="text-[10px] font-bold uppercase text-[#7d776f]">Ingresos Recaudados</div>
                  <div className="text-base font-black text-emerald-700 font-mono mt-0.5">
                    Bs. {totalIngresosAnual.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border">
                  <div className="text-[10px] font-bold uppercase text-[#7d776f]">Egresos Operativos</div>
                  <div className="text-base font-black text-rose-700 font-mono mt-0.5">
                    Bs. {totalEgresosAnual.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border">
                  <div className="text-[10px] font-bold uppercase text-[#7d776f]">Superávit Operativo</div>
                  <div className="text-base font-black text-purple-700 font-mono mt-0.5">
                    {superavitAnual >= 0 ? '+' : ''}Bs. {superavitAnual.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Desglose de Gastos en Formato Auditoría */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#5c5750] dark:text-slate-300 mb-2">
                  1. Desglose de Egresos por Rubro ({selectedPeriod}):
                </h4>
                <div className="space-y-1.5 text-xs">
                  {categoriasGasto.length === 0 ? (
                    <div className="text-xs text-[#7d776f] py-2">Sin egresos registrados en este período.</div>
                  ) : (
                    categoriasGasto.map((c) => (
                      <div key={c.nombre} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span>{c.nombre}</span>
                        <span className="font-mono font-bold">
                          Bs. {c.monto.toLocaleString('es-BO', { minimumFractionDigits: 2 })} ({c.porcentaje}%)
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Resumen de Cartera Morosa */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#5c5750] dark:text-slate-300 mb-2">
                  2. Cartera Vencida y Morosidad (Total: Bs. {morososFiltrados.reduce((acc, m) => acc + (Number(m.totalDeuda) || 0), 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}):
                </h4>
                <div className="space-y-1.5 text-xs">
                  {morososFiltrados.length === 0 ? (
                    <div className="text-xs text-emerald-700 font-semibold py-1">
                      No existen departamentos en mora en este período.
                    </div>
                  ) : (
                    morososFiltrados.slice(0, 5).map((m) => (
                      <div key={m.idDepartamento} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span>Dpto {m.numero} ({m.propietario?.nombres || ''} {m.propietario?.apellidos || ''})</span>
                        <span className="font-mono font-bold text-rose-700">
                          Bs. {Number(m.totalDeuda).toLocaleString('es-BO', { minimumFractionDigits: 2 })} ({m.expensasMoraCount} {m.expensasMoraCount === 1 ? 'mes' : 'meses'})
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Firmas de Conformidad */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="border-t border-slate-400 pt-2">
                  <div className="text-xs font-bold text-[#5c5750] dark:text-slate-400">Firma</div>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <div className="text-xs font-bold text-[#5c5750] dark:text-slate-400">Firma</div>
                </div>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="no-print flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#cec8bc] dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  // Exportar a CSV
                  const csvContent =
                    'data:text/csv;charset=utf-8,' +
                    'Mes,Ingresos,Egresos,Balance,TasaMorosidad\n' +
                    mesesData.map((e) => `${e.mes},${e.ingresos},${e.egresos},${e.balance},${e.tasaMorosidad}%`).join('\n')
                  const encodedUri = encodeURI(csvContent)
                  const link = document.createElement('a')
                  link.setAttribute('href', encodedUri)
                  link.setAttribute('download', `reporte_financiero_edificio_xyz_${selectedYear}.csv`)
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
                className="no-print px-4 py-2 rounded-xl bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#262422] dark:text-white text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV (Excel)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="no-print px-4 py-2 rounded-xl text-xs font-bold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="no-print px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold inline-flex items-center gap-2 transition-all shadow-md shadow-purple-900/20 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Guardar en PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
