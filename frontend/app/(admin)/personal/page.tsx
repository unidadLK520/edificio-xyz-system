// frontend/app/(admin)/personal/page.tsx
// Módulo de Gestión de Personal, Planilla de Sueldos e Historial de Pagos de Empleados (Edificio XYZ)
// Conectado con la API real:
//   GET    /api/v1/personal                    - Listar empleados (Planilla)
//   GET    /api/v1/personal/pagos              - Historial general consolidado de pagos
//   GET    /api/v1/personal/:id                - Detalle de empleado
//   POST   /api/v1/personal                    - Registrar empleado
//   PUT    /api/v1/personal/:id                - Modificar empleado (datos generales)
//   PUT    /api/v1/personal/:id/salario        - Modificar salario base (con auditoría y motivo)
//   GET    /api/v1/personal/:id/salario        - Consultar salario actual
//   POST   /api/v1/personal/:id/pagos          - Registrar pago de sueldo
//   GET    /api/v1/personal/:id/pagos          - Historial de pagos de empleado (kardex)
//   POST   /api/v1/personal/:id/anticipos      - Registrar anticipo de sueldo
//   GET    /api/v1/personal/:id/anticipos      - Consultar anticipos de empleado
//   POST   /api/v1/personal/:id/bonificaciones - Registrar bonificación a empleado
//   GET    /api/v1/personal/:id/bonificaciones - Consultar bonificaciones de empleado
//   POST   /api/v1/personal/:id/descuentos     - Registrar descuento a empleado
//   GET    /api/v1/personal/:id/descuentos     - Consultar descuentos de empleado

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Users2,
  Shield,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  Calendar,
  X,
  BadgeCheck,
  Wrench,
  Sparkles,
  DollarSign,
  CreditCard,
  FileText,
  Printer,
  AlertCircle,
  RotateCcw,
  Edit2,
  Receipt,
  UserCheck,
  Gift,
  RefreshCw,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { fechaSolo, fechaHoraBolivia } from '@/lib/fecha'
import ModificarSalarioModal from '@/components/personal/ModificarSalarioModal'
import ConceptosEmpleadoModal from '@/components/personal/ConceptosEmpleadoModal'

export interface EmpleadoItem {
  idEmpleado: number
  nombres: string
  apellidos: string
  ci: string
  cargo?: string | null
  salarioBase: number
  fechaIngreso: string
  activo: boolean
  _count?: {
    pagos: number
  }
}

export interface PagoEmpleadoItem {
  idPagoEmpleado: number
  idEmpleado: number
  periodo: string // YYYY-MM-DD
  salarioPagado: number
  anticipos: number
  bonificaciones: number
  descuentos: number
  fechaPago: string
  idMovimiento?: number | null
  empleado?: {
    idEmpleado?: number
    nombres: string
    apellidos: string
    ci?: string
    cargo?: string | null
  }
  movimiento?: {
    idMovimiento: number
    descripcion: string
    fecha: string
  } | null
}

export default function PersonalPage() {
  const [activeTab, setActiveTab] = useState<'planilla' | 'pagos'>('planilla')

  // Datos de empleados y pagos
  const [empleados, setEmpleados] = useState<EmpleadoItem[]>([])
  const [historialPagos, setHistorialPagos] = useState<PagoEmpleadoItem[]>([])
  const [totalPagosMeta, setTotalPagosMeta] = useState<number>(0)
  const [isHistorialPagosTruncado, setIsHistorialPagosTruncado] = useState(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoadingPagos, setIsLoadingPagos] = useState<boolean>(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Filtros - Planilla
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('Todos')
  const [filtroEstado, setFiltroEstado] = useState('Todos')

  // Filtros - Historial Pagos
  const [filtroAnioPago, setFiltroAnioPago] = useState<string>(() => String(new Date().getFullYear()))
  const [filtroEmpleadoPago, setFiltroEmpleadoPago] = useState<string>('Todos')
  const [searchPago, setSearchPago] = useState('')
  const [filtroPeriodoPago, setFiltroPeriodoPago] = useState('')

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false)
  const [selectedEmpleadoDetalle, setSelectedEmpleadoDetalle] = useState<(EmpleadoItem & { pagos?: PagoEmpleadoItem[] }) | null>(null)
  const [empleadoParaEditar, setEmpleadoParaEditar] = useState<EmpleadoItem | null>(null)
  const [empleadoParaPagar, setEmpleadoParaPagar] = useState<EmpleadoItem | null>(null)
  const [selectedBoletaPago, setSelectedBoletaPago] = useState<PagoEmpleadoItem | null>(null)

  // Modales específicos US3.1
  const [isSalarioModalOpen, setIsSalarioModalOpen] = useState(false)
  const [empleadoParaSalario, setEmpleadoParaSalario] = useState<EmpleadoItem | null>(null)
  const [isConceptosModalOpen, setIsConceptosModalOpen] = useState(false)
  const [empleadoParaConceptos, setEmpleadoParaConceptos] = useState<EmpleadoItem | null>(null)
  const [isLoadingKardex, setIsLoadingKardex] = useState(false)
  const [totalKardexPagos, setTotalKardexPagos] = useState<number>(0)

  // Errores en modales
  const [createModalError, setCreateModalError] = useState<string | null>(null)
  const [editModalError, setEditModalError] = useState<string | null>(null)
  const [pagoModalError, setPagoModalError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Formulario Crear Empleado (Salario inicial vacío y obligatorio)
  const [nuevoNombres, setNuevoNombres] = useState('')
  const [nuevoApellidos, setNuevoApellidos] = useState('')
  const [nuevoCi, setNuevoCi] = useState('')
  const [nuevoCargo, setNuevoCargo] = useState('Conserje')
  const [nuevoSalarioBase, setNuevoSalarioBase] = useState<number | ''>('')
  const [nuevoFechaIngreso, setNuevoFechaIngreso] = useState<string>(fechaSolo(new Date()))

  // Formulario Editar Empleado (salarioBase removido, se gestiona con ModificarSalarioModal)
  const [editNombres, setEditNombres] = useState('')
  const [editApellidos, setEditApellidos] = useState('')
  const [editCi, setEditCi] = useState('')
  const [editCargo, setEditCargo] = useState('')
  const [editFechaIngreso, setEditFechaIngreso] = useState('')
  const [editActivo, setEditActivo] = useState(true)

  // Formulario Pago de Sueldo
  const [pagoPeriodoMes, setPagoPeriodoMes] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [pagoSalario, setPagoSalario] = useState<number>(0)
  const [pagoAnticipos, setPagoAnticipos] = useState<number>(0)
  const [pagoBonificaciones, setPagoBonificaciones] = useState<number>(0)
  const [pagoDescuentos, setPagoDescuentos] = useState<number>(0)

  // Sugerencias de conceptos en modal de pago
  const [sugerenciasCargando, setSugerenciasCargando] = useState(false)
  const [sugerenciasBono, setSugerenciasBono] = useState<{ total: number; items: any[] }>({ total: 0, items: [] })
  const [sugerenciasAnticipo, setSugerenciasAnticipo] = useState<{ total: number; items: any[] }>({ total: 0, items: [] })
  const [sugerenciasDescuento, setSugerenciasDescuento] = useState<{ total: number; items: any[] }>({ total: 0, items: [] })

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text })
    setTimeout(() => setToastMessage(null), 4500)
  }

  // 1. Cargar lista de empleados desde la API
  const fetchEmpleados = useCallback(async () => {
    setIsLoading(true)
    setApiError(null)
    try {
      const res = await apiFetch('/api/v1/personal?limit=100')
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        const msg = errJson.message || 'Error al conectar con el servidor de personal.'
        setApiError(msg)
        setEmpleados([])
        return
      }

      const json = await res.json()
      const rawList = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []
      const mapped: EmpleadoItem[] = rawList.map((emp: any) => ({
        idEmpleado: Number(emp.idEmpleado),
        nombres: emp.nombres || '',
        apellidos: emp.apellidos || '',
        ci: emp.ci || '',
        cargo: emp.cargo || 'General',
        salarioBase: Number(emp.salarioBase || 0),
        fechaIngreso: fechaSolo(emp.fechaIngreso),
        activo: emp.activo !== undefined ? Boolean(emp.activo) : true,
        _count: emp._count || { pagos: 0 }
      }))

      setEmpleados(mapped)
    } catch (err: any) {
      console.error('Error al cargar personal:', err)
      setApiError(err?.message || 'Error de conexión con el servidor.')
      setEmpleados([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 2. Cargar historial consolidado de pagos (GET /personal/pagos?limit=200&anio=...)
  const fetchHistorialPagos = useCallback(async (anio?: string) => {
    setIsLoadingPagos(true)
    try {
      const year = anio || filtroAnioPago
      const query = year ? `&anio=${year}` : ''
      const res = await apiFetch(`/api/v1/personal/pagos?limit=200${query}`)
      if (!res.ok) {
        console.error('Error al cargar historial consolidado de pagos.')
        return
      }

      const json = await res.json()
      const rawList = Array.isArray(json.data) ? json.data : []
      const mapped: PagoEmpleadoItem[] = rawList.map((p: any) => ({
        idPagoEmpleado: Number(p.idPagoEmpleado),
        idEmpleado: Number(p.idEmpleado),
        periodo: fechaSolo(p.periodo),
        salarioPagado: Number(p.salarioPagado || 0),
        anticipos: Number(p.anticipos || 0),
        bonificaciones: Number(p.bonificaciones || 0),
        descuentos: Number(p.descuentos || 0),
        fechaPago: p.fechaPago,
        idMovimiento: p.idMovimiento,
        empleado: p.empleado
          ? {
              idEmpleado: p.empleado.idEmpleado,
              nombres: p.empleado.nombres || '',
              apellidos: p.empleado.apellidos || '',
              ci: p.empleado.ci,
              cargo: p.empleado.cargo,
            }
          : undefined,
        movimiento: p.movimiento,
      }))

      setHistorialPagos(mapped)
      const total = Number(json.meta?.total ?? mapped.length)
      const limit = Number(json.meta?.limit ?? 200)
      setTotalPagosMeta(total)
      setIsHistorialPagosTruncado(total > limit)
    } catch (err) {
      console.error('Error al cargar historial consolidado de pagos:', err)
    } finally {
      setIsLoadingPagos(false)
    }
  }, [filtroAnioPago])

  useEffect(() => {
    fetchEmpleados()
  }, [fetchEmpleados])

  useEffect(() => {
    fetchHistorialPagos(filtroAnioPago)
  }, [filtroAnioPago, fetchHistorialPagos])

  // Filtrado reactivo de planilla de personal
  const personalFiltrado = useMemo(() => {
    return empleados.filter((p) => {
      const q = searchTerm.toLowerCase()
      const nombreCompleto = `${p.nombres} ${p.apellidos}`.toLowerCase()
      const matchSearch =
        nombreCompleto.includes(q) ||
        p.ci.toLowerCase().includes(q) ||
        (p.cargo || '').toLowerCase().includes(q)

      const matchCargo = filtroCargo === 'Todos' || p.cargo === filtroCargo
      const matchEstado =
        filtroEstado === 'Todos' ||
        (filtroEstado === 'Activo' && p.activo) ||
        (filtroEstado === 'Inactivo' && !p.activo)

      return matchSearch && matchCargo && matchEstado
    })
  }, [empleados, searchTerm, filtroCargo, filtroEstado])

  // Filtrado reactivo de historial de pagos
  const pagosFiltrados = useMemo(() => {
    return historialPagos.filter((p) => {
      const q = searchPago.toLowerCase()
      const nombreEmp = p.empleado ? `${p.empleado.nombres} ${p.empleado.apellidos}`.toLowerCase() : ''
      const ciEmp = p.empleado?.ci?.toLowerCase() || ''
      const matchSearch = nombreEmp.includes(q) || ciEmp.includes(q) || p.periodo.includes(q)

      const matchEmpleado =
        filtroEmpleadoPago === 'Todos' || String(p.idEmpleado) === filtroEmpleadoPago

      const matchPeriodo =
        !filtroPeriodoPago || p.periodo.startsWith(filtroPeriodoPago)

      return matchSearch && matchEmpleado && matchPeriodo
    })
  }, [historialPagos, searchPago, filtroEmpleadoPago, filtroPeriodoPago])

  // Métricas y KPIs de Planilla
  const totalStaff = empleados.length
  const empleadosActivos = empleados.filter((p) => p.activo).length
  const masaSalarialBase = empleados
    .filter((p) => p.activo)
    .reduce((acc, curr) => acc + curr.salarioBase, 0)
  const totalPagosRealizados = totalPagosMeta || historialPagos.length

  // Métricas de Historial de Pagos
  const totalDesembolsadoPagos = useMemo(() => {
    return pagosFiltrados.reduce((acc, p) => {
      const neto = p.salarioPagado + p.bonificaciones - p.anticipos - p.descuentos
      return acc + (neto > 0 ? neto : 0)
    }, 0)
  }, [pagosFiltrados])

  // Crear Empleado (POST /api/v1/personal)
  const handleCrearEmpleadoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateModalError(null)

    if (!nuevoNombres.trim() || !nuevoApellidos.trim()) {
      setCreateModalError('Nombres y apellidos son obligatorios.')
      return
    }
    if (!nuevoCi.trim()) {
      setCreateModalError('El CI es obligatorio.')
      return
    }
    if (nuevoSalarioBase === '' || Number(nuevoSalarioBase) <= 0) {
      setCreateModalError('El salario base es obligatorio y debe ser mayor a 0 Bs.')
      return
    }
    if (!nuevoFechaIngreso) {
      setCreateModalError('La fecha de ingreso es obligatoria.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await apiFetch('/api/v1/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombres: nuevoNombres.trim(),
          apellidos: nuevoApellidos.trim(),
          ci: nuevoCi.trim(),
          cargo: nuevoCargo.trim() || undefined,
          salarioBase: Number(nuevoSalarioBase),
          fechaIngreso: nuevoFechaIngreso,
          activo: true
        })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        let msg = data.message || data.error || 'Error al registrar colaborador.'
        if (data.details) {
          const detailStr = Object.entries(data.details)
            .map(([k, v]: [string, any]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ')
          msg = `${msg} (${detailStr})`
        }
        setCreateModalError(msg)
        return
      }

      showToast('success', `¡Empleado "${nuevoNombres} ${nuevoApellidos}" registrado exitosamente en la planilla!`)
      setIsCreateModalOpen(false)
      // Reset form (salario inicial vacío)
      setNuevoNombres('')
      setNuevoApellidos('')
      setNuevoCi('')
      setNuevoSalarioBase('')
      setNuevoFechaIngreso(fechaSolo(new Date()))
      await fetchEmpleados()
    } catch (err: any) {
      setCreateModalError(err?.message || 'Error de conexión al guardar el registro.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Abrir Modal de Edición General (sin salarioBase)
  const handleOpenEditModal = (emp: EmpleadoItem) => {
    setEmpleadoParaEditar(emp)
    setEditNombres(emp.nombres)
    setEditApellidos(emp.apellidos)
    setEditCi(emp.ci)
    setEditCargo(emp.cargo || '')
    setEditFechaIngreso(emp.fechaIngreso)
    setEditActivo(emp.activo)
    setEditModalError(null)
    setIsEditModalOpen(true)
  }

  // Guardar Edición Empleado (PUT /api/v1/personal/:id)
  const handleEditarEmpleadoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empleadoParaEditar) return
    setEditModalError(null)

    if (!editNombres.trim() || !editApellidos.trim()) {
      setEditModalError('Nombres y apellidos son obligatorios.')
      return
    }
    if (!editCi.trim()) {
      setEditModalError('El CI es obligatorio.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await apiFetch(`/api/v1/personal/${empleadoParaEditar.idEmpleado}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombres: editNombres.trim(),
          apellidos: editApellidos.trim(),
          ci: editCi.trim(),
          cargo: editCargo.trim() || undefined,
          fechaIngreso: editFechaIngreso,
          activo: editActivo
        })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        let msg = data.message || data.error || 'Error al actualizar empleado.'
        if (data.details) {
          const detailStr = Object.entries(data.details)
            .map(([k, v]: [string, any]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ')
          msg = `${msg} (${detailStr})`
        }
        setEditModalError(msg)
        return
      }

      showToast('success', '¡Datos del colaborador actualizados correctamente!')
      setIsEditModalOpen(false)
      setEmpleadoParaEditar(null)
      await fetchEmpleados()
    } catch (err: any) {
      setEditModalError(err?.message || 'Error de conexión al actualizar.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Consulta de sugerencias de conceptos para liquidación (editable, nunca automática)
  const cargarSugerenciasPago = useCallback(async (idEmp: number, periodoMes: string) => {
    setSugerenciasCargando(true)
    const periodoExacto = `${periodoMes}-01`
    const anio = periodoMes.slice(0, 4)

    try {
      const [resBonos, resDescuentos, resAnticipos] = await Promise.all([
        apiFetch(`/api/v1/personal/${idEmp}/bonificaciones?periodo=${periodoExacto}&limit=50`),
        apiFetch(`/api/v1/personal/${idEmp}/descuentos?periodo=${periodoExacto}&limit=50`),
        apiFetch(`/api/v1/personal/${idEmp}/anticipos?anio=${anio}&limit=50`),
      ])

      let bonosList: any[] = []
      if (resBonos.ok) {
        const jsonB = await resBonos.json()
        bonosList = Array.isArray(jsonB.data) ? jsonB.data : []
      }

      let descuentosList: any[] = []
      if (resDescuentos.ok) {
        const jsonD = await resDescuentos.json()
        descuentosList = Array.isArray(jsonD.data) ? jsonD.data : []
      }

      let anticiposList: any[] = []
      if (resAnticipos.ok) {
        const jsonA = await resAnticipos.json()
        const rawA = Array.isArray(jsonA.data) ? jsonA.data : []
        // Filtrar en cliente los anticipos correspondientes al mes del período
        anticiposList = rawA.filter((a: any) => fechaSolo(a.fecha).startsWith(periodoMes))
      }

      const totalBono = bonosList.reduce((acc, b) => acc + Number(b.monto || 0), 0)
      const totalDescuento = descuentosList.reduce((acc, d) => acc + Number(d.monto || 0), 0)
      const totalAnticipo = anticiposList.reduce((acc, a) => acc + Number(a.monto || 0), 0)

      setSugerenciasBono({ total: totalBono, items: bonosList })
      setSugerenciasDescuento({ total: totalDescuento, items: descuentosList })
      setSugerenciasAnticipo({ total: totalAnticipo, items: anticiposList })
    } catch (err) {
      console.error('Error al consultar sugerencias de conceptos:', err)
      setSugerenciasBono({ total: 0, items: [] })
      setSugerenciasDescuento({ total: 0, items: [] })
      setSugerenciasAnticipo({ total: 0, items: [] })
    } finally {
      setSugerenciasCargando(false)
    }
  }, [])

  // Abrir Modal de Pago de Sueldo
  const handleOpenPagoModal = (emp?: EmpleadoItem) => {
    const targetEmp = emp || empleados.find((e) => e.activo) || empleados[0]
    if (!targetEmp) {
      showToast('error', 'No hay empleados registrados para procesar pagos.')
      return
    }
    setEmpleadoParaPagar(targetEmp)
    setPagoSalario(targetEmp.salarioBase)
    setPagoAnticipos(0)
    setPagoBonificaciones(0)
    setPagoDescuentos(0)
    setPagoModalError(null)
    setIsPagoModalOpen(true)
    cargarSugerenciasPago(targetEmp.idEmpleado, pagoPeriodoMes)
  }

  // Guardar Pago de Sueldo (POST /api/v1/personal/:id/pagos)
  const handleRegistrarPagoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empleadoParaPagar) return
    setPagoModalError(null)

    if (Number(pagoSalario) <= 0) {
      setPagoModalError('El salario pagado debe ser mayor a 0 Bs.')
      return
    }
    if (!pagoPeriodoMes) {
      setPagoModalError('Debe seleccionar el período de la planilla.')
      return
    }

    const periodoNormalizado = `${pagoPeriodoMes}-01`

    setIsSubmitting(true)
    try {
      const res = await apiFetch(`/api/v1/personal/${empleadoParaPagar.idEmpleado}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodo: periodoNormalizado,
          salarioPagado: Number(pagoSalario),
          anticipos: Number(pagoAnticipos || 0),
          bonificaciones: Number(pagoBonificaciones || 0),
          descuentos: Number(pagoDescuentos || 0)
        })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        let msg = data.message || data.error || 'Error al registrar el pago de sueldo.'
        if (data.details) {
          const detailStr = Object.entries(data.details)
            .map(([k, v]: [string, any]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ')
          msg = `${msg} (${detailStr})`
        }
        setPagoModalError(msg)
        return
      }

      showToast('success', `¡Pago de sueldo registrado exitosamente para ${empleadoParaPagar.nombres} ${empleadoParaPagar.apellidos}!`)
      setIsPagoModalOpen(false)
      setEmpleadoParaPagar(null)
      await fetchEmpleados()
      await fetchHistorialPagos(filtroAnioPago)
    } catch (err: any) {
      setPagoModalError(err?.message || 'Error de conexión al registrar el pago.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ver detalle de empleado con kardex completo de pagos (GET /personal/:id/pagos?limit=50)
  const handleVerDetalleEmpleado = async (emp: EmpleadoItem) => {
    setSelectedEmpleadoDetalle(emp)
    setIsLoadingKardex(true)
    try {
      const [resDetalle, resPagos] = await Promise.all([
        apiFetch(`/api/v1/personal/${emp.idEmpleado}`),
        apiFetch(`/api/v1/personal/${emp.idEmpleado}/pagos?limit=50`),
      ])

      let empData: EmpleadoItem = emp
      if (resDetalle.ok) {
        const jsonDetalle = await resDetalle.json()
        empData = {
          idEmpleado: Number(jsonDetalle.idEmpleado),
          nombres: jsonDetalle.nombres || '',
          apellidos: jsonDetalle.apellidos || '',
          ci: jsonDetalle.ci || '',
          cargo: jsonDetalle.cargo || 'General',
          salarioBase: Number(jsonDetalle.salarioBase || 0),
          fechaIngreso: fechaSolo(jsonDetalle.fechaIngreso),
          activo: jsonDetalle.activo !== undefined ? Boolean(jsonDetalle.activo) : true,
          _count: jsonDetalle._count || emp._count,
        }
      }

      let kardexPagos: PagoEmpleadoItem[] = []
      if (resPagos.ok) {
        const jsonPagos = await resPagos.json()
        const rawPagos = Array.isArray(jsonPagos.data) ? jsonPagos.data : []
        setTotalKardexPagos(Number(jsonPagos.meta?.total ?? rawPagos.length))
        kardexPagos = rawPagos.map((p: any) => ({
          idPagoEmpleado: Number(p.idPagoEmpleado),
          idEmpleado: Number(emp.idEmpleado),
          periodo: fechaSolo(p.periodo),
          salarioPagado: Number(p.salarioPagado || 0),
          anticipos: Number(p.anticipos || 0),
          bonificaciones: Number(p.bonificaciones || 0),
          descuentos: Number(p.descuentos || 0),
          fechaPago: p.fechaPago,
          idMovimiento: p.idMovimiento,
          empleado: {
            idEmpleado: emp.idEmpleado,
            nombres: emp.nombres,
            apellidos: emp.apellidos,
            ci: emp.ci,
            cargo: emp.cargo,
          },
          movimiento: p.movimiento,
        }))
      }

      setSelectedEmpleadoDetalle({
        ...empData,
        pagos: kardexPagos,
      })
    } catch (err) {
      console.error('Error al cargar kardex de pagos:', err)
      setSelectedEmpleadoDetalle(emp)
    } finally {
      setIsLoadingKardex(false)
    }
  }

  // Abrir Modal de Salario
  const handleOpenSalarioModal = (emp: EmpleadoItem) => {
    setEmpleadoParaSalario(emp)
    setIsSalarioModalOpen(true)
  }

  // Éxito al modificar salario
  const handleSalarioSuccess = (nuevoSalario: number, mensaje: string) => {
    showToast('success', mensaje)
    fetchEmpleados()
    if (selectedEmpleadoDetalle && empleadoParaSalario && selectedEmpleadoDetalle.idEmpleado === empleadoParaSalario.idEmpleado) {
      setSelectedEmpleadoDetalle((prev) => (prev ? { ...prev, salarioBase: nuevoSalario } : null))
    }
  }

  // Abrir Modal de Conceptos
  const handleOpenConceptosModal = (emp: EmpleadoItem) => {
    setEmpleadoParaConceptos(emp)
    setIsConceptosModalOpen(true)
  }

  // Cálculo en vivo del líquido pagable en el modal de pago
  const liquidoPagableCalculado = useMemo(() => {
    const s = Number(pagoSalario) || 0
    const b = Number(pagoBonificaciones) || 0
    const a = Number(pagoAnticipos) || 0
    const d = Number(pagoDescuentos) || 0
    return Math.max(0, s + b - a - d)
  }, [pagoSalario, pagoBonificaciones, pagoAnticipos, pagoDescuentos])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ALERTA O NOTIFICACIÓN TOAST */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg transition-all animate-in fade-in slide-in-from-top duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER DEL MÓDULO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-400 text-xs font-semibold mb-2">
            <Users2 className="w-3.5 h-3.5" />
            Recursos Humanos & Administración de Sueldos
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Planilla de Personal y Sueldos
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Gestión oficial de colaboradores, planilla salarial mensual y registro de pagos de sueldos con boleta digital.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenPagoModal()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            Registrar Pago de Sueldo
          </button>
          <button
            onClick={() => {
              setCreateModalError(null)
              setIsCreateModalOpen(true)
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Registrar Colaborador
          </button>
        </div>
      </div>

      {/* NAVEGACIÓN ENTRE PLANILLA Y HISTORIAL DE PAGOS */}
      <div className="flex items-center gap-2 border-b border-[#cec8bc] dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('planilla')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'planilla'
              ? 'bg-blue-700 text-white shadow-md shadow-blue-900/20'
              : 'bg-[#ede9e1] dark:bg-slate-900 text-[#66615b] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white border border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <Users2 className="w-4 h-4" />
          <span>Planilla de Personal</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-white/20 dark:bg-white/10">
            {empleados.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pagos')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'pagos'
              ? 'bg-blue-700 text-white shadow-md shadow-blue-900/20'
              : 'bg-[#ede9e1] dark:bg-slate-900 text-[#66615b] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white border border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Historial Pagos Empleados</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-white/20 dark:bg-white/10">
            {totalPagosRealizados}
          </span>
        </button>
      </div>

      {/* ESTADO DE ERROR DE API CON BOTÓN REINTENTAR */}
      {apiError && (
        <div className="p-4 rounded-2xl bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <div>
              <p className="font-bold">Error de sincronización con el servidor</p>
              <p className="text-[11px] opacity-90">{apiError}</p>
            </div>
          </div>
          <button
            onClick={() => {
              fetchEmpleados()
              fetchHistorialPagos(filtroAnioPago)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reintentar
          </button>
        </div>
      )}

      {/* VISTA 1: PLANILLA DE PERSONAL */}
      {activeTab === 'planilla' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* KPIS DE PLANILLA */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
                <span>Total Colaboradores</span>
                <Users2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-[#262422] dark:text-white">{totalStaff}</div>
              <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
                Padrón general registrado
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
                <span>Personal Activo</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
                {empleadosActivos}
              </div>
              <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
                En servicio vigente
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
                <span>Masa Salarial Base</span>
                <DollarSign className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-900 dark:text-amber-400">
                Bs. {masaSalarialBase.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
                Costo mensual base en personal
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
                <span>Pagos Registrados</span>
                <CreditCard className="w-4 h-4 text-purple-700 dark:text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-400">
                {totalPagosRealizados}
              </div>
              <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
                Boletas y liquidaciones
              </span>
            </div>
          </div>

          {/* BUSCADOR Y FILTROS PLANILLA */}
          <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nombre, apellido, CI o cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
                <Filter className="w-3.5 h-3.5 text-[#7d776f]" />
                <select
                  value={filtroCargo}
                  onChange={(e) => setFiltroCargo(e.target.value)}
                  className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
                >
                  <option value="Todos">Cargo: Todos</option>
                  <option value="Conserje">Conserje</option>
                  <option value="Seguridad">Seguridad</option>
                  <option value="Limpieza">Limpieza</option>
                  <option value="Técnico de Mantenimiento">Técnico de Mantenimiento</option>
                  <option value="Administración">Administración</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
                >
                  <option value="Todos">Estado: Todos</option>
                  <option value="Activo">Activos</option>
                  <option value="Inactivo">Inactivos</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLA DE PLANILLA DE PERSONAL */}
          <div className="rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#e3ded4] dark:bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-[#5c5750] dark:text-slate-400">
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Cargo</th>
                    <th className="py-3 px-4 text-right">Salario Base</th>
                    <th className="py-3 px-4">Fecha Ingreso</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Pagos Reg.</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cec8bc]/60 dark:divide-slate-800 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-[#7d776f] dark:text-slate-400">
                        Cargando planilla de personal desde el servidor...
                      </td>
                    </tr>
                  ) : personalFiltrado.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-[#7d776f] dark:text-slate-500">
                        No se encontraron colaboradores registrados en la planilla.
                      </td>
                    </tr>
                  ) : (
                    personalFiltrado.map((p) => (
                      <tr
                        key={p.idEmpleado}
                        className="hover:bg-[#e6e1d6]/50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#262422] dark:text-white">
                            {p.nombres} {p.apellidos}
                          </div>
                          <div className="text-[11px] font-mono text-[#7d776f] dark:text-slate-400">
                            CI: {p.ci}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-[#4a4641] dark:text-slate-200">
                            {p.cargo?.toLowerCase().includes('seguridad') && (
                              <Shield className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                            )}
                            {p.cargo?.toLowerCase().includes('conserje') && (
                              <BadgeCheck className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                            )}
                            {p.cargo?.toLowerCase().includes('limpieza') && (
                              <Sparkles className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                            )}
                            {p.cargo?.toLowerCase().includes('mantenimiento') && (
                              <Wrench className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                            )}
                            {p.cargo || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800 dark:text-emerald-400 text-sm">
                          Bs. {Number(p.salarioBase).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-[#5c5750] dark:text-slate-400 font-mono text-[11px]">
                          {p.fechaIngreso}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              p.activo
                                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${p.activo ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`}
                            />
                            {p.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-bold font-mono text-[11px]">
                            {p._count?.pagos || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenPagoModal(p)}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer flex items-center gap-1"
                              title="Registrar Pago de Sueldo"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Pagar</span>
                            </button>
                            <button
                              onClick={() => handleOpenConceptosModal(p)}
                              className="px-2 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer flex items-center gap-1"
                              title="Conceptos (Anticipos, Bonificaciones, Descuentos)"
                            >
                              <Gift className="w-3.5 h-3.5" />
                              <span>Conceptos</span>
                            </button>
                            <button
                              onClick={() => handleOpenSalarioModal(p)}
                              className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Ajustar Salario Base (auditoría obligatoria)"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleVerDetalleEmpleado(p)}
                              className="p-1.5 rounded-lg text-[#5c5750] hover:text-[#262422] hover:bg-[#ded8cc] dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Ver Ficha e Historial"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Editar Datos Generales"
                            >
                              <Edit2 className="w-4 h-4" />
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
        </div>
      )}

      {/* VISTA 2: HISTORIAL DE PAGOS DE EMPLEADOS */}
      {activeTab === 'pagos' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* AVISO SI HAY MÁS PAGOS QUE EL LÍMITE */}
          {isHistorialPagosTruncado && (
            <div className="p-3 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                Aviso: Se están mostrando los primeros 200 pagos de un total de {totalPagosMeta} registrados para el año {filtroAnioPago}. Use los filtros para acotar la búsqueda.
              </span>
            </div>
          )}

          {/* KPIS DE PAGOS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
                <span>Total Boletas Emitidas</span>
                <Receipt className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-[#262422] dark:text-white">
                {totalPagosMeta || historialPagos.length}
              </div>
              <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
                Histórico del año {filtroAnioPago}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
                <span>Total Desembolsado</span>
                <DollarSign className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-400">
                Bs. {totalDesembolsadoPagos.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-[#7d776f] dark:text-slate-500">Líquido pagable acumulado</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
                <span>Empleados con Pago</span>
                <UserCheck className="w-4 h-4 text-purple-700 dark:text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-400">
                {new Set(historialPagos.map((p) => p.idEmpleado)).size}
              </div>
              <span className="text-[11px] text-[#7d776f] dark:text-slate-500">Beneficiarios de sueldo</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
                <span>Último Desembolso</span>
                <Calendar className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              </div>
              <div className="text-sm font-bold font-mono text-[#262422] dark:text-white truncate">
                {historialPagos[0] ? historialPagos[0].periodo : 'Sin registros'}
              </div>
              <span className="text-[11px] text-[#7d776f] dark:text-slate-500">Período más reciente</span>
            </div>
          </div>

          {/* FILTROS DE HISTORIAL DE PAGOS */}
          <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por colaborador, CI o período..."
                value={searchPago}
                onChange={(e) => setSearchPago(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* SELECTOR DE AÑO */}
              <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
                <span className="text-[10px] uppercase font-bold text-[#7d776f]">Año:</span>
                <select
                  value={filtroAnioPago}
                  onChange={(e) => setFiltroAnioPago(e.target.value)}
                  className="bg-transparent text-[#262422] dark:text-white focus:outline-none font-mono text-xs cursor-pointer font-bold"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>

              {/* FILTRO COLABORADOR */}
              <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
                <Filter className="w-3.5 h-3.5 text-[#7d776f]" />
                <select
                  value={filtroEmpleadoPago}
                  onChange={(e) => setFiltroEmpleadoPago(e.target.value)}
                  className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
                >
                  <option value="Todos">Colaborador: Todos</option>
                  {empleados.map((emp) => (
                    <option key={emp.idEmpleado} value={String(emp.idEmpleado)}>
                      {emp.nombres} {emp.apellidos}
                    </option>
                  ))}
                </select>
              </div>

              {/* FILTRO MES */}
              <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
                <span className="text-[10px] uppercase font-bold text-[#7d776f]">Mes:</span>
                <input
                  type="month"
                  value={filtroPeriodoPago}
                  onChange={(e) => setFiltroPeriodoPago(e.target.value)}
                  className="bg-transparent text-[#262422] dark:text-white focus:outline-none font-mono text-xs cursor-pointer"
                />
                {filtroPeriodoPago && (
                  <button onClick={() => setFiltroPeriodoPago('')} className="p-0.5 text-[#7d776f] hover:text-[#262422] cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* TABLA DE HISTORIAL DE PAGOS */}
          <div className="rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#e3ded4] dark:bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-[#5c5750] dark:text-slate-400">
                    <th className="py-3 px-4">Período</th>
                    <th className="py-3 px-4">Colaborador Beneficiario</th>
                    <th className="py-3 px-4 text-right">Salario Pagado</th>
                    <th className="py-3 px-4 text-right">Bonos (+)</th>
                    <th className="py-3 px-4 text-right">Anticipos (-)</th>
                    <th className="py-3 px-4 text-right">Descuentos (-)</th>
                    <th className="py-3 px-4 text-right font-mono font-bold">Líquido Pagable</th>
                    <th className="py-3 px-4 text-center">Fecha Pago</th>
                    <th className="py-3 px-4 text-right">Boleta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cec8bc]/60 dark:divide-slate-800">
                  {isLoadingPagos ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-[#7d776f]">
                        Cargando historial de pagos desde el servidor...
                      </td>
                    </tr>
                  ) : pagosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-[#7d776f] dark:text-slate-500">
                        No se encontraron registros de pagos de sueldos con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    pagosFiltrados.map((p) => {
                      const liquido = p.salarioPagado + p.bonificaciones - p.anticipos - p.descuentos
                      return (
                        <tr
                          key={p.idPagoEmpleado}
                          className="hover:bg-[#e6e1d6]/50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-[#262422] dark:text-white whitespace-nowrap">
                            {p.periodo}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#262422] dark:text-white">
                              {p.empleado ? `${p.empleado.nombres} ${p.empleado.apellidos}` : `Empleado #${p.idEmpleado}`}
                            </div>
                            <div className="text-[10px] text-[#7d776f] dark:text-slate-400">
                              {p.empleado?.cargo || 'General'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[#262422] dark:text-white">
                            Bs. {p.salarioPagado.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-700 dark:text-emerald-400">
                            {p.bonificaciones > 0 ? `+ Bs. ${p.bonificaciones.toFixed(2)}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-purple-700 dark:text-purple-400">
                            {p.anticipos > 0 ? `- Bs. ${p.anticipos.toFixed(2)}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-rose-700 dark:text-rose-400">
                            {p.descuentos > 0 ? `- Bs. ${p.descuentos.toFixed(2)}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-sm text-emerald-800 dark:text-emerald-400">
                            Bs. {liquido.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-[10px] text-[#7d776f] dark:text-slate-400 whitespace-nowrap">
                            {fechaHoraBolivia(p.fechaPago)}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedBoletaPago(p)}
                              className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer inline-flex items-center gap-1"
                              title="Ver Boleta de Pago Oficial"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Boleta</span>
                            </button>
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

      {/* MODAL 1: REGISTRAR COLABORADOR EN PLANILLA (Salario inicial vacío) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white flex items-center gap-2">
                <Users2 className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                Registrar Colaborador en Planilla
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createModalError && (
              <div className="p-3 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{createModalError}</span>
              </div>
            )}

            <form onSubmit={handleCrearEmpleadoSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Carlos"
                    value={nuevoNombres}
                    onChange={(e) => setNuevoNombres(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Mamani Quispe"
                    value={nuevoApellidos}
                    onChange={(e) => setNuevoApellidos(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Documento de Identidad (CI) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 4910283 CBBA"
                    value={nuevoCi}
                    onChange={(e) => setNuevoCi(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Cargo o Función *
                  </label>
                  <select
                    value={nuevoCargo}
                    onChange={(e) => setNuevoCargo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer font-medium"
                  >
                    <option value="Conserje">Conserje</option>
                    <option value="Seguridad">Seguridad y Vigilancia 24/7</option>
                    <option value="Limpieza">Cuadrilla de Limpieza</option>
                    <option value="Técnico de Mantenimiento">Técnico de Mantenimiento</option>
                    <option value="Jardinería">Jardinería</option>
                    <option value="Administración">Administración Central</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Salario Base Mensual (Bs.) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="Ej. 2800.00"
                    value={nuevoSalarioBase}
                    onChange={(e) => setNuevoSalarioBase(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-emerald-700 dark:text-emerald-400 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Fecha de Ingreso *
                  </label>
                  <input
                    type="date"
                    required
                    value={nuevoFechaIngreso}
                    onChange={(e) => setNuevoFechaIngreso(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-semibold text-[#262422] dark:text-white hover:bg-[#cec8bc] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-xs font-bold text-white shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar en Planilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR DATOS GENERALES (salarioBase removido por US3.1) */}
      {isEditModalOpen && empleadoParaEditar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                Modificar Datos del Colaborador
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editModalError && (
              <div className="p-3 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{editModalError}</span>
              </div>
            )}

            <form onSubmit={handleEditarEmpleadoSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    required
                    value={editNombres}
                    onChange={(e) => setEditNombres(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    value={editApellidos}
                    onChange={(e) => setEditApellidos(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    CI *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCi}
                    onChange={(e) => setEditCi(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Cargo o Función
                  </label>
                  <input
                    type="text"
                    value={editCargo}
                    onChange={(e) => setEditCargo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Fecha de Ingreso *
                </label>
                <input
                  type="date"
                  required
                  value={editFechaIngreso}
                  onChange={(e) => setEditFechaIngreso(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              <div className="p-3 bg-white/60 dark:bg-slate-950/60 rounded-xl border border-[#cec8bc] dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#262422] dark:text-white block">Estado del Colaborador</span>
                  <span className="text-[11px] text-[#7d776f]">Activar o suspender de la planilla activa</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editActivo}
                    onChange={(e) => setEditActivo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-semibold text-[#262422] dark:text-white hover:bg-[#cec8bc] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-xs font-bold text-white shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Actualizar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REGISTRAR PAGO DE SUELDO (POST /api/v1/personal/:id/pagos) CON SUGERENCIAS EDITABLES */}
      {isPagoModalOpen && empleadoParaPagar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#262422] dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                  Liquidación y Pago de Sueldo
                </h3>
                <p className="text-xs text-[#7d776f]">
                  Colaborador: <strong className="text-[#262422] dark:text-white">{empleadoParaPagar.nombres} {empleadoParaPagar.apellidos}</strong> • Cargo: {empleadoParaPagar.cargo}
                </p>
              </div>
              <button
                onClick={() => setIsPagoModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pagoModalError && (
              <div className="p-3 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{pagoModalError}</span>
              </div>
            )}

            <form onSubmit={handleRegistrarPagoSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Seleccionar Colaborador *
                </label>
                <select
                  value={empleadoParaPagar.idEmpleado}
                  onChange={(e) => {
                    const sel = empleados.find((emp) => emp.idEmpleado === Number(e.target.value))
                    if (sel) {
                      setEmpleadoParaPagar(sel)
                      setPagoSalario(sel.salarioBase)
                      cargarSugerenciasPago(sel.idEmpleado, pagoPeriodoMes)
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white cursor-pointer font-semibold"
                >
                  {empleados.map((emp) => (
                    <option key={emp.idEmpleado} value={emp.idEmpleado}>
                      {emp.nombres} {emp.apellidos} (CI: {emp.ci} • Bs. {emp.salarioBase})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Período de Planilla (Mes / Año) *
                </label>
                <input
                  type="month"
                  required
                  value={pagoPeriodoMes}
                  onChange={(e) => {
                    const nuevoMes = e.target.value
                    setPagoPeriodoMes(nuevoMes)
                    if (empleadoParaPagar) {
                      cargarSugerenciasPago(empleadoParaPagar.idEmpleado, nuevoMes)
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white font-mono font-bold"
                />
              </div>

              {/* PANEL DE CONCEPTOS SUGERIDOS (EDITABLE, NUNCA AUTOMÁTICO) */}
              <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-950/70 border border-[#cec8bc] dark:border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#383430] dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Conceptos registrados para {pagoPeriodoMes}:
                  </span>
                  {sugerenciasCargando && (
                    <span className="text-[10px] text-[#7d776f] animate-pulse">Consultando...</span>
                  )}
                </div>

                {sugerenciasCargando ? (
                  <p className="text-[11px] text-[#7d776f]">Buscando conceptos previos de este mes...</p>
                ) : sugerenciasBono.items.length === 0 &&
                  sugerenciasAnticipo.items.length === 0 &&
                  sugerenciasDescuento.items.length === 0 ? (
                  <p className="text-[11px] text-[#7d776f]">
                    No se encontraron bonificaciones, anticipos ni descuentos registrados en el sistema para {pagoPeriodoMes}.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {/* Lista detallada de registros de origen */}
                    <div className="space-y-1 text-[11px]">
                      {sugerenciasBono.items.map((b: any) => (
                        <div key={b.idConceptoEmpleado} className="flex justify-between text-emerald-800 dark:text-emerald-400">
                          <span>• Bono: {b.motivo}</span>
                          <span className="font-mono font-bold">+ Bs. {Number(b.monto).toFixed(2)}</span>
                        </div>
                      ))}
                      {sugerenciasAnticipo.items.map((a: any) => (
                        <div key={a.idConceptoEmpleado} className="flex justify-between text-purple-800 dark:text-purple-400">
                          <span>• Anticipo ({fechaSolo(a.fecha)}): {a.motivo}</span>
                          <span className="font-mono font-bold">- Bs. {Number(a.monto).toFixed(2)}</span>
                        </div>
                      ))}
                      {sugerenciasDescuento.items.map((d: any) => (
                        <div key={d.idConceptoEmpleado} className="flex justify-between text-rose-800 dark:text-rose-400">
                          <span>• Descuento: {d.motivo}</span>
                          <span className="font-mono font-bold">- Bs. {Number(d.monto).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-1.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setPagoBonificaciones(sugerenciasBono.total)
                          setPagoAnticipos(sugerenciasAnticipo.total)
                          setPagoDescuentos(sugerenciasDescuento.total)
                          showToast('success', 'Valores sugeridos cargados en los campos de liquidación. Puede editarlos libremente.')
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Cargar sugerencias en los campos</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* INPUTS EDITABLES DEL CONTRATO POST /personal/:id/pagos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Salario Base Pagado (Bs.) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={pagoSalario}
                    onChange={(e) => setPagoSalario(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-emerald-700 dark:text-emerald-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Bonificaciones (+)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pagoBonificaciones}
                    onChange={(e) => setPagoBonificaciones(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-emerald-800 dark:text-emerald-400 font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Anticipos Otorgados (-)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pagoAnticipos}
                    onChange={(e) => setPagoAnticipos(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-purple-700 dark:text-purple-400 font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Descuentos (-)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pagoDescuentos}
                    onChange={(e) => setPagoDescuentos(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-rose-700 dark:text-rose-400 font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* RESUMEN DE LIQUIDACIÓN / LÍQUIDO PAGABLE */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-[#5c5750] dark:text-slate-300">
                  <span>Salario Base:</span>
                  <span className="font-mono">Bs. {Number(pagoSalario).toFixed(2)}</span>
                </div>
                {pagoBonificaciones > 0 && (
                  <div className="flex justify-between items-center text-emerald-800 dark:text-emerald-300">
                    <span>(+) Bonos y Rendimientos:</span>
                    <span className="font-mono">+ Bs. {Number(pagoBonificaciones).toFixed(2)}</span>
                  </div>
                )}
                {pagoAnticipos > 0 && (
                  <div className="flex justify-between items-center text-purple-800 dark:text-purple-300">
                    <span>(-) Anticipos de Quincena:</span>
                    <span className="font-mono">- Bs. {Number(pagoAnticipos).toFixed(2)}</span>
                  </div>
                )}
                {pagoDescuentos > 0 && (
                  <div className="flex justify-between items-center text-rose-800 dark:text-rose-300">
                    <span>(-) Descuentos / Faltas:</span>
                    <span className="font-mono">- Bs. {Number(pagoDescuentos).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-emerald-300 dark:border-emerald-800 pt-1.5 flex justify-between items-center text-sm font-black text-emerald-900 dark:text-emerald-200">
                  <span>Líquido Pagable Final:</span>
                  <span className="font-mono text-base">Bs. {liquidoPagableCalculado.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPagoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-semibold text-[#262422] dark:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || liquidoPagableCalculado <= 0}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-xs font-bold text-white shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Procesando...' : 'Confirmar y Pagar Sueldo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: FICHA DE PERSONAL Y SU KARDEX INDIVIDUAL (GET /personal/:id/pagos?limit=50) */}
      {selectedEmpleadoDetalle && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-[#262422] dark:text-white">
                  Ficha Oficial del Colaborador
                </h3>
                <p className="text-xs text-[#7d776f]">Registro de personal y kardex de pagos de sueldo</p>
              </div>
              <button
                onClick={() => setSelectedEmpleadoDetalle(null)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DATOS GENERALES */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-white/70 dark:bg-slate-950/70 rounded-2xl border border-[#cec8bc] dark:border-slate-800 text-xs">
              <div>
                <span className="text-[#7d776f] text-[10px] uppercase font-bold block">Nombres y Apellidos</span>
                <span className="font-bold text-[#262422] dark:text-white text-sm">
                  {selectedEmpleadoDetalle.nombres} {selectedEmpleadoDetalle.apellidos}
                </span>
              </div>
              <div>
                <span className="text-[#7d776f] text-[10px] uppercase font-bold block">Documento de Identidad</span>
                <span className="font-mono font-bold text-[#262422] dark:text-white">
                  CI: {selectedEmpleadoDetalle.ci}
                </span>
              </div>
              <div>
                <span className="text-[#7d776f] text-[10px] uppercase font-bold block">Cargo / Función</span>
                <span className="font-semibold text-blue-700 dark:text-blue-400">
                  {selectedEmpleadoDetalle.cargo || 'General'}
                </span>
              </div>
              <div>
                <span className="text-[#7d776f] text-[10px] uppercase font-bold block">Salario Base Pactado</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                    Bs. {Number(selectedEmpleadoDetalle.salarioBase).toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleOpenSalarioModal(selectedEmpleadoDetalle)}
                    className="p-1 text-amber-700 hover:bg-amber-100 dark:text-amber-400 rounded-md transition-colors cursor-pointer"
                    title="Ajustar Salario Base"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div>
                <span className="text-[#7d776f] text-[10px] uppercase font-bold block">Fecha de Ingreso</span>
                <span className="font-mono text-[#262422] dark:text-white">
                  {selectedEmpleadoDetalle.fechaIngreso}
                </span>
              </div>
              <div>
                <span className="text-[#7d776f] text-[10px] uppercase font-bold block">Estado en Planilla</span>
                <span className={`inline-flex items-center gap-1 font-bold ${selectedEmpleadoDetalle.activo ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {selectedEmpleadoDetalle.activo ? 'Vigente / Activo' : 'Inactivo'}
                </span>
              </div>
            </div>

            {/* TABLA HISTORIAL INDIVIDUAL DE PAGOS (KARDEX) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <h4 className="font-bold text-[#262422] dark:text-white flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  Historial de Sueldos Desembolsados ({totalKardexPagos || selectedEmpleadoDetalle.pagos?.length || 0})
                  {totalKardexPagos > 50 && (
                    <span className="text-[10px] text-[#7d776f] font-normal">(mostrando los 50 más recientes)</span>
                  )}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenConceptosModal(selectedEmpleadoDetalle)}
                    className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>Conceptos</span>
                  </button>
                  <button
                    onClick={() => {
                      handleOpenPagoModal(selectedEmpleadoDetalle)
                      setSelectedEmpleadoDetalle(null)
                    }}
                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                  >
                    + Liquidar Nuevo Mes
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[#cec8bc] dark:border-slate-800 overflow-hidden bg-white/60 dark:bg-slate-950/60">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/60 dark:bg-slate-950 text-[10px] font-bold uppercase text-[#7d776f]">
                      <th className="py-2.5 px-3">Período</th>
                      <th className="py-2.5 px-3 text-right">Salario Pagado</th>
                      <th className="py-2.5 px-3 text-right">Bonos (+)</th>
                      <th className="py-2.5 px-3 text-right">Descuentos (-)</th>
                      <th className="py-2.5 px-3 text-right font-bold">Líquido Final</th>
                      <th className="py-2.5 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#cec8bc] dark:divide-slate-800">
                    {isLoadingKardex ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-[#7d776f]">
                          Cargando kardex de pagos...
                        </td>
                      </tr>
                    ) : !selectedEmpleadoDetalle.pagos || selectedEmpleadoDetalle.pagos.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-[#7d776f]">
                          No cuenta con pagos de sueldo registrados todavía.
                        </td>
                      </tr>
                    ) : (
                      selectedEmpleadoDetalle.pagos.map((p) => {
                        const neto = Number(p.salarioPagado) + Number(p.bonificaciones) - Number(p.anticipos) - Number(p.descuentos)
                        return (
                          <tr key={p.idPagoEmpleado} className="hover:bg-[#dfd9ce]/30">
                            <td className="py-2.5 px-3 font-mono font-bold">{fechaSolo(p.periodo)}</td>
                            <td className="py-2.5 px-3 text-right font-mono">Bs. {Number(p.salarioPagado).toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                              {Number(p.bonificaciones) > 0 ? `+ Bs. ${Number(p.bonificaciones).toFixed(2)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                              {Number(p.descuentos) + Number(p.anticipos) > 0
                                ? `- Bs. ${(Number(p.descuentos) + Number(p.anticipos)).toFixed(2)}`
                                : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800 dark:text-emerald-400">
                              Bs. {neto.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => {
                                  setSelectedBoletaPago({
                                    ...p,
                                    empleado: {
                                      nombres: selectedEmpleadoDetalle.nombres,
                                      apellidos: selectedEmpleadoDetalle.apellidos,
                                      ci: selectedEmpleadoDetalle.ci,
                                      cargo: selectedEmpleadoDetalle.cargo
                                    }
                                  })
                                }}
                                className="px-2 py-0.5 rounded bg-blue-700 hover:bg-blue-800 text-white font-bold text-[10px] cursor-pointer"
                              >
                                Boleta
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#cec8bc] dark:border-slate-800">
              <button
                onClick={() => setSelectedEmpleadoDetalle(null)}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: BOLETA OFICIAL DE PAGO DE SUELDO (FORMATO RECIBO IMPRIMIBLE) */}
      {selectedBoletaPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 text-[#262422] dark:text-slate-100">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base uppercase tracking-tight">
                  Boleta Oficial de Pago de Sueldo
                </h3>
              </div>
              <button
                onClick={() => setSelectedBoletaPago(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/60 space-y-3 text-xs">
              <div className="flex justify-between items-start">
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
                    BOL-SUE-{selectedBoletaPago.idPagoEmpleado}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Período: {selectedBoletaPago.periodo}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Colaborador:
                  </span>
                  <span className="font-bold">
                    {selectedBoletaPago.empleado?.nombres} {selectedBoletaPago.empleado?.apellidos}
                  </span>
                  {selectedBoletaPago.empleado?.ci && (
                    <span className="text-[11px] font-mono text-slate-500 block">
                      CI: {selectedBoletaPago.empleado.ci}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Cargo / Función:
                  </span>
                  <span className="font-bold">{selectedBoletaPago.empleado?.cargo || 'General'}</span>
                  <span className="text-[11px] font-mono text-slate-500 block">
                    Fecha Pago: {fechaHoraBolivia(selectedBoletaPago.fechaPago)}
                  </span>
                </div>
              </div>

              {/* DETALLE FINANCIERO */}
              <div className="space-y-1.5 border-t pt-2 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Salario Base Acordado:</span>
                  <span className="font-mono font-bold">Bs. {selectedBoletaPago.salarioPagado.toFixed(2)}</span>
                </div>
                {selectedBoletaPago.bonificaciones > 0 && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                    <span>(+) Bonificaciones / Rendimiento:</span>
                    <span className="font-mono font-bold">+ Bs. {selectedBoletaPago.bonificaciones.toFixed(2)}</span>
                  </div>
                )}
                {selectedBoletaPago.anticipos > 0 && (
                  <div className="flex justify-between text-purple-700 dark:text-purple-400">
                    <span>(-) Anticipos Recibidos:</span>
                    <span className="font-mono font-bold">- Bs. {selectedBoletaPago.anticipos.toFixed(2)}</span>
                  </div>
                )}
                {selectedBoletaPago.descuentos > 0 && (
                  <div className="flex justify-between text-rose-700 dark:text-rose-400">
                    <span>(-) Descuentos por Ley / Faltas:</span>
                    <span className="font-mono font-bold">- Bs. {selectedBoletaPago.descuentos.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t-2 border-slate-900 dark:border-slate-200 pt-2 flex justify-between text-sm font-black text-emerald-800 dark:text-emerald-300">
                  <span>TOTAL LÍQUIDO PAGABLE:</span>
                  <span className="font-mono text-base">
                    Bs. {(selectedBoletaPago.salarioPagado + selectedBoletaPago.bonificaciones - selectedBoletaPago.anticipos - selectedBoletaPago.descuentos).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* LÍNEAS DE FIRMAS */}
              <div className="grid grid-cols-2 gap-6 pt-8 pb-2 text-center text-[10px] text-slate-500">
                <div className="border-t border-slate-400 pt-1">
                  Firma de Conformidad Colaborador
                </div>
                <div className="border-t border-slate-400 pt-1">
                  Administración Central Edificio XYZ
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
              <button
                onClick={() => setSelectedBoletaPago(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir Boleta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: MODIFICAR SALARIO BASE (PUT /api/v1/personal/:id/salario) */}
      <ModificarSalarioModal
        isOpen={isSalarioModalOpen}
        onClose={() => setIsSalarioModalOpen(false)}
        onSuccess={handleSalarioSuccess}
        empleado={empleadoParaSalario}
      />

      {/* MODAL 7: GESTIÓN DE CONCEPTOS (ANTICIPOS, BONIFICACIONES, DESCUENTOS) */}
      <ConceptosEmpleadoModal
        isOpen={isConceptosModalOpen}
        onClose={() => setIsConceptosModalOpen(false)}
        empleado={empleadoParaConceptos}
      />
    </div>
  )
}
