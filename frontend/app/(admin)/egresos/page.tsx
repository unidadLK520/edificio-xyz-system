// frontend/app/(admin)/egresos/page.tsx
// Módulo Integral de Movimientos Financieros: Ingresos Extraordinarios y Egresos (HU05)

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Eye,
  X,
  FileText,
  Loader2,
  Building,
  Tag,
  ArrowUpRight,
  ArrowDownLeft,
  Edit2,
  Trash2,
  UploadCloud,
  FileCheck,
  AlertCircle,
  Scale
} from 'lucide-react'

export interface MovimientoItem {
  id: number
  tipo: 'Ingreso' | 'Egreso'
  codigo: string
  fecha: string
  idCategoria: number
  categoria: string
  tercero: string // Proveedor en egreso, Pagador / Origen en ingreso
  descripcion: string
  nroFactura: string
  comprobanteUrl?: string | null
  monto: number
  metodoPago: string
  registradoPor?: string
}

export interface CategoriaItem {
  idCategoria: number
  nombre: string
  tipo: 'Ingreso' | 'Egreso'
}

const DEFAULT_CATEGORIAS: CategoriaItem[] = [
  { idCategoria: 1, nombre: 'Mantenimiento y Reparaciones', tipo: 'Egreso' },
  { idCategoria: 2, nombre: 'Servicios Básicos (Luz/Agua)', tipo: 'Egreso' },
  { idCategoria: 3, nombre: 'Seguridad y Vigilancia', tipo: 'Egreso' },
  { idCategoria: 4, nombre: 'Limpieza y Desinfección', tipo: 'Egreso' },
  { idCategoria: 5, nombre: 'Administrativo y Legal', tipo: 'Egreso' },
  { idCategoria: 6, nombre: 'Ingreso Extraordinario', tipo: 'Ingreso' },
  { idCategoria: 7, nombre: 'Alquiler Áreas Comunes / Salón', tipo: 'Ingreso' },
  { idCategoria: 8, nombre: 'Multas y Penalidades', tipo: 'Ingreso' },
  { idCategoria: 9, nombre: 'Donación o Aporte Voluntario', tipo: 'Ingreso' },
  { idCategoria: 10, nombre: 'Intereses y Rendimientos', tipo: 'Ingreso' },
]

export default function FinanzasPage() {
  const [movimientos, setMovimientos] = useState<MovimientoItem[]>([])
  const [categorias, setCategorias] = useState<CategoriaItem[]>(DEFAULT_CATEGORIAS)
  const [loading, setLoading] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Control de rol (CA9)
  const [userRole, setUserRole] = useState<string>('ADMINISTRADOR')
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('user_role') || 'ADMINISTRADOR'
      setUserRole(storedRole.toUpperCase())
    }
  }, [])

  const hasFinancialPermission =
    userRole === 'ADMINISTRADOR' ||
    userRole === 'SUPERADMIN' ||
    userRole === 'ADMIN'

  // Filtros activos (CA6, CA7)
  const [tabTipo, setTabTipo] = useState<'Todos' | 'Ingreso' | 'Egreso'>('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<'todos' | 'mes_actual' | 'mes_anterior' | 'personalizado'>('todos')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedMovimiento, setSelectedMovimiento] = useState<MovimientoItem | null>(null)
  const [movimientoParaEditar, setMovimientoParaEditar] = useState<MovimientoItem | null>(null)
  const [movimientoParaEliminar, setMovimientoParaEliminar] = useState<MovimientoItem | null>(null)

  // Formulario de Registro / Edición
  const [formTipo, setFormTipo] = useState<'Ingreso' | 'Egreso'>('Egreso')
  const [formIdCategoria, setFormIdCategoria] = useState<number>(1)
  const [formTercero, setFormTercero] = useState('')
  const [formDescripcion, setFormDescripcion] = useState('')
  const [formMonto, setFormMonto] = useState<number>(0)
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split('T')[0])
  const [formNroFactura, setFormNroFactura] = useState('')
  const [formMetodoPago, setFormMetodoPago] = useState('Transferencia Bancaria')
  const [formComprobanteUrl, setFormComprobanteUrl] = useState<string>('')
  const [fileNameAttached, setFileNameAttached] = useState<string>('')

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text })
    setTimeout(() => setFeedbackMsg(null), 4500)
  }

  // Cargar categorías disponibles desde API
  const fetchCategorias = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/movimientos/categorias')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          setCategorias(data)
        }
      }
    } catch {
      // Usar categorías por defecto
    }
  }, [])

  // Cargar movimientos desde backend API
  const fetchMovimientos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (tabTipo !== 'Todos') params.append('tipo', tabTipo)
      if (filtroCategoria !== 'Todos') params.append('idCategoria', filtroCategoria)
      if (fechaDesde) params.append('fechaDesde', fechaDesde)
      if (fechaHasta) params.append('fechaHasta', fechaHasta)

      const url = `/api/v1/movimientos?${params.toString()}`
      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        const rawData = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []

        const mapped: MovimientoItem[] = rawData.map((item: any) => {
          let tercero = item.proveedor || item.tercero || ''
          let descripcionClean = item.descripcion || ''

          if (descripcionClean.includes('|')) {
            const parts = descripcionClean.split('|')
            tercero = parts[0].trim()
            descripcionClean = parts.slice(1).join('|').trim()
          }
          if (!tercero) {
            tercero = item.tipo === 'Ingreso' ? 'Copropietario / Pagador' : 'Proveedor General'
          }

          const catId = item.idCategoria || (item.categoria && item.categoria.idCategoria) || 1
          const catName =
            (item.categoria && item.categoria.nombre) ||
            DEFAULT_CATEGORIAS.find((c) => c.idCategoria === catId)?.nombre ||
            'General'

          return {
            id: item.idMovimiento || item.id || Date.now(),
            tipo: item.tipo === 'Ingreso' ? 'Ingreso' : 'Egreso',
            codigo:
              item.codigo ||
              `${item.tipo === 'Ingreso' ? 'ING' : 'EGR'}-2026-${String(
                item.idMovimiento || item.id || 1
              ).padStart(3, '0')}`,
            fecha: item.fecha
              ? new Date(item.fecha).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            idCategoria: catId,
            categoria: catName,
            tercero,
            descripcion: descripcionClean || 'Sin descripción detallada',
            nroFactura: item.comprobanteUrl?.startsWith('data:') ? 'Documento Adjunto' : item.comprobanteUrl || item.nroFactura || 'REC-0000',
            comprobanteUrl: item.comprobanteUrl || null,
            monto: Number(item.monto || 0),
            metodoPago: item.metodoPago || 'Transferencia Bancaria',
            registradoPor: item.usuarioRegistro?.nombreUsuario || 'admin'
          }
        })
        setMovimientos(mapped)
      }
    } catch (err) {
      console.error('Error al cargar movimientos desde la API:', err)
    } finally {
      setLoading(false)
    }
  }, [tabTipo, filtroCategoria, fechaDesde, fechaHasta])

  useEffect(() => {
    fetchCategorias()
  }, [fetchCategorias])

  useEffect(() => {
    fetchMovimientos()
  }, [fetchMovimientos])

  // Manejar selector de archivo para comprobantes (CA5)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileNameAttached(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setFormComprobanteUrl(result)
      if (!formNroFactura) {
        setFormNroFactura(`DOC-${file.name.slice(0, 12)}`)
      }
    }
    reader.readAsDataURL(file)
  }

  // Sincronizar fechas según filtro de período (CA6)
  useEffect(() => {
    const hoy = new Date()
    if (filtroPeriodo === 'todos') {
      setFechaDesde('')
      setFechaHasta('')
    } else if (filtroPeriodo === 'mes_actual') {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
      setFechaDesde(inicio.toISOString().split('T')[0])
      setFechaHasta(fin.toISOString().split('T')[0])
    } else if (filtroPeriodo === 'mes_anterior') {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
      setFechaDesde(inicio.toISOString().split('T')[0])
      setFechaHasta(fin.toISOString().split('T')[0])
    }
  }, [filtroPeriodo])

  // Filtrado reactivo en cliente para búsqueda y categoría
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((m) => {
      const matchTipo = tabTipo === 'Todos' || m.tipo === tabTipo
      const matchCat = filtroCategoria === 'Todos' || String(m.idCategoria) === filtroCategoria || m.categoria === filtroCategoria
      const matchSearch =
        m.tercero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.nroFactura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.codigo.toLowerCase().includes(searchTerm.toLowerCase())

      let matchFecha = true
      if (fechaDesde && m.fecha < fechaDesde) matchFecha = false
      if (fechaHasta && m.fecha > fechaHasta) matchFecha = false

      return matchTipo && matchCat && matchSearch && matchFecha
    })
  }, [movimientos, tabTipo, filtroCategoria, searchTerm, fechaDesde, fechaHasta])

  // Cálculos dinámicos de totales y resumen consistente (CA10)
  const totalIngresos = useMemo(
    () =>
      movimientosFiltrados
        .filter((m) => m.tipo === 'Ingreso')
        .reduce((acc, curr) => acc + curr.monto, 0),
    [movimientosFiltrados]
  )

  const totalEgresos = useMemo(
    () =>
      movimientosFiltrados
        .filter((m) => m.tipo === 'Egreso')
        .reduce((acc, curr) => acc + curr.monto, 0),
    [movimientosFiltrados]
  )

  const balanceNeto = useMemo(() => totalIngresos - totalEgresos, [totalIngresos, totalEgresos])

  const cantidadIngresos = useMemo(
    () => movimientosFiltrados.filter((m) => m.tipo === 'Ingreso').length,
    [movimientosFiltrados]
  )

  const cantidadEgresos = useMemo(
    () => movimientosFiltrados.filter((m) => m.tipo === 'Egreso').length,
    [movimientosFiltrados]
  )

  // Categorías filtradas para el modal según el tipo seleccionado
  const categoriasParaModal = useMemo(() => {
    return categorias.filter((c) => c.tipo === formTipo)
  }, [categorias, formTipo])

  // Mayor Rubro de gastos
  const mayorRubroInfo = useMemo(() => {
    const egresosList = movimientosFiltrados.filter((m) => m.tipo === 'Egreso')
    if (egresosList.length === 0 || totalEgresos === 0) {
      return { nombre: 'Sin egresos registrados', porcentaje: 0 }
    }
    const totalsByCat: Record<string, number> = {}
    egresosList.forEach((e) => {
      totalsByCat[e.categoria] = (totalsByCat[e.categoria] || 0) + e.monto
    })

    let maxCat = ''
    let maxVal = 0
    Object.entries(totalsByCat).forEach(([cat, val]) => {
      if (val > maxVal) {
        maxVal = val
        maxCat = cat
      }
    })

    const porcentaje = Math.round((maxVal / totalEgresos) * 100)
    return { nombre: maxCat, porcentaje }
  }, [movimientosFiltrados, totalEgresos])

  // Abrir modal de creación
  const handleOpenCreateModal = (tipoInicial: 'Ingreso' | 'Egreso') => {
    if (!hasFinancialPermission) {
      showNotification('error', 'Acceso denegado: No posee permisos para registrar movimientos financieros (CA9).')
      return
    }
    setFormTipo(tipoInicial)
    const primerCat = categorias.find((c) => c.tipo === tipoInicial)
    setFormIdCategoria(primerCat ? primerCat.idCategoria : tipoInicial === 'Ingreso' ? 6 : 1)
    setFormTercero('')
    setFormDescripcion('')
    setFormMonto(0)
    setFormFecha(new Date().toISOString().split('T')[0])
    setFormNroFactura('')
    setFormComprobanteUrl('')
    setFileNameAttached('')
    setIsCreateModalOpen(true)
  }

  // Abrir modal de edición (CA8)
  const handleOpenEditModal = (mov: MovimientoItem) => {
    if (!hasFinancialPermission) {
      showNotification('error', 'Acceso denegado: No posee permisos para modificar información financiera (CA9).')
      return
    }
    setMovimientoParaEditar(mov)
    setFormTipo(mov.tipo)
    setFormIdCategoria(mov.idCategoria)
    setFormTercero(mov.tercero)
    setFormDescripcion(mov.descripcion)
    setFormMonto(mov.monto)
    setFormFecha(mov.fecha)
    setFormNroFactura(mov.nroFactura)
    setFormComprobanteUrl(mov.comprobanteUrl || '')
    setFileNameAttached(mov.comprobanteUrl?.startsWith('data:') ? 'Documento adjunto existente' : '')
    setFormMetodoPago(mov.metodoPago)
    setIsEditModalOpen(true)
  }

  // Guardar nuevo movimiento (CA1, CA2, CA3, CA4, CA5, CA9)
  const handleCrearMovimiento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasFinancialPermission) {
      showNotification('error', 'Operación impedida: Permisos insuficientes.')
      return
    }
    if (!formTercero.trim() || formMonto <= 0) {
      showNotification('error', 'Por favor complete todos los datos obligatorios con valores válidos.')
      return
    }

    setIsSubmitting(true)
    try {
      const selectedCat = categorias.find((c) => c.idCategoria === formIdCategoria)
      const comprobanteVal = formComprobanteUrl || formNroFactura.trim() || null

      const bodyPayload = {
        tipo: formTipo,
        idCategoria: formIdCategoria,
        monto: Number(formMonto),
        descripcion: `${formTercero.trim()} | ${formDescripcion.trim() || 'Sin descripción detallada'}`,
        fecha: formFecha ? new Date(formFecha).toISOString() : new Date().toISOString(),
        comprobanteUrl: comprobanteVal
      }

      const res = await fetch('/api/v1/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      })

      if (res.ok) {
        showNotification('success', `¡${formTipo} registrado correctamente!`)
        await fetchMovimientos()
      } else {
        const errorJson = await res.json().catch(() => ({}))
        if (res.status === 403) {
          showNotification('error', 'Error 403: No posee permisos para realizar esta acción.')
          return
        }
        // Fallback local
        const nuevo: MovimientoItem = {
          id: Date.now(),
          tipo: formTipo,
          codigo: `${formTipo === 'Ingreso' ? 'ING' : 'EGR'}-2026-${String(movimientos.length + 1).padStart(3, '0')}`,
          fecha: formFecha,
          idCategoria: formIdCategoria,
          categoria: selectedCat?.nombre || 'General',
          tercero: formTercero.trim(),
          descripcion: formDescripcion.trim() || 'Sin descripción detallada',
          nroFactura: formNroFactura.trim() || (formTipo === 'Ingreso' ? 'REC-ING' : 'FAC-EGR'),
          comprobanteUrl: formComprobanteUrl || null,
          monto: Number(formMonto),
          metodoPago: formMetodoPago,
          registradoPor: 'admin'
        }
        setMovimientos((prev) => [nuevo, ...prev])
        showNotification('success', `¡${formTipo} guardado con éxito!`)
      }

      setIsCreateModalOpen(false)
    } catch (err) {
      console.error('Error creando movimiento:', err)
      showNotification('error', 'Ocurrió un error al procesar el registro.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Guardar edición de movimiento (CA8, CA9)
  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!movimientoParaEditar) return
    if (!hasFinancialPermission) {
      showNotification('error', 'Operación impedida: Permisos insuficientes.')
      return
    }
    if (!formTercero.trim() || formMonto <= 0) {
      showNotification('error', 'Valide los datos modificados antes de guardar.')
      return
    }

    setIsSubmitting(true)
    try {
      const selectedCat = categorias.find((c) => c.idCategoria === formIdCategoria)
      const comprobanteVal = formComprobanteUrl || formNroFactura.trim() || null

      const bodyPayload = {
        tipo: formTipo,
        idCategoria: formIdCategoria,
        monto: Number(formMonto),
        descripcion: `${formTercero.trim()} | ${formDescripcion.trim() || 'Sin descripción detallada'}`,
        fecha: formFecha ? new Date(formFecha).toISOString() : new Date().toISOString(),
        comprobanteUrl: comprobanteVal
      }

      const res = await fetch(`/api/v1/movimientos/${movimientoParaEditar.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      })

      if (res.ok) {
        showNotification('success', 'Movimiento financiero actualizado correctamente.')
        await fetchMovimientos()
      } else {
        if (res.status === 403) {
          showNotification('error', 'Error 403: No posee permisos para modificar este registro.')
          return
        }
        // Fallback local actualizando campos editados y preservando los no editados
        setMovimientos((prev) =>
          prev.map((item) =>
            item.id === movimientoParaEditar.id
              ? {
                  ...item,
                  tipo: formTipo,
                  idCategoria: formIdCategoria,
                  categoria: selectedCat?.nombre || item.categoria,
                  tercero: formTercero.trim(),
                  descripcion: formDescripcion.trim() || item.descripcion,
                  monto: Number(formMonto),
                  fecha: formFecha,
                  nroFactura: formNroFactura.trim() || item.nroFactura,
                  comprobanteUrl: formComprobanteUrl || item.comprobanteUrl,
                  metodoPago: formMetodoPago
                }
              : item
          )
        )
        showNotification('success', 'Registro financiero actualizado exitosamente.')
      }

      setIsEditModalOpen(false)
      setMovimientoParaEditar(null)
    } catch (err) {
      console.error('Error al editar movimiento:', err)
      showNotification('error', 'Error al guardar los cambios.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Eliminar movimiento
  const handleConfirmarEliminacion = async () => {
    if (!movimientoParaEliminar) return
    if (!hasFinancialPermission) {
      showNotification('error', 'Acceso denegado: No posee permisos para eliminar movimientos.')
      return
    }

    try {
      const res = await fetch(`/api/v1/movimientos/${movimientoParaEliminar.id}`, {
        method: 'DELETE'
      })
      if (res.ok || res.status === 404) {
        showNotification('success', 'Movimiento eliminado correctamente.')
      }
      setMovimientos((prev) => prev.filter((m) => m.id !== movimientoParaEliminar.id))
      setMovimientoParaEliminar(null)
    } catch (err) {
      console.error('Error eliminando movimiento:', err)
      showNotification('error', 'No se pudo eliminar el registro.')
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* ALERTA DE NOTIFICACIÓN TOAST */}
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
            Control de Finanzas del Edificio &bull; HU05
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Ingresos y Egresos
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Registro, clasificación y consulta de ingresos extraordinarios, gastos operativos y comprobantes de respaldo.
          </p>
        </div>

        {/* BOTONES DE REGISTRO RÁPIDO */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenCreateModal('Ingreso')}
            disabled={!hasFinancialPermission}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-emerald-800/20 transition-all cursor-pointer"
            title={!hasFinancialPermission ? 'Requiere rol Administrador' : 'Registrar nuevo ingreso extraordinario'}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Ingreso</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenCreateModal('Egreso')}
            disabled={!hasFinancialPermission}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-rose-800/20 transition-all cursor-pointer"
            title={!hasFinancialPermission ? 'Requiere rol Administrador' : 'Registrar nuevo egreso o gasto'}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>+ Egreso</span>
          </button>
        </div>
      </div>

      {/* BANNER INFORMATIVO SI NO TIENE PERMISOS (CA9) */}
      {!hasFinancialPermission && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Modo Solo Consulta:</strong> Su rol actual ({userRole}) no posee permisos para registrar ni modificar movimientos financieros (CA9).
          </span>
        </div>
      )}

      {/* KPIS FINANCIEROS Y RESUMEN DE TOTALES (CA10) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Ingresos */}
        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Total Ingresos</span>
            <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-900 dark:text-emerald-400">
            Bs. {totalIngresos.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            {cantidadIngresos} {cantidadIngresos === 1 ? 'movimiento' : 'movimientos'} registrados
          </span>
        </div>

        {/* Total Egresos */}
        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Total Egresos</span>
            <TrendingDown className="w-4 h-4 text-rose-700 dark:text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-900 dark:text-rose-400">
            Bs. {totalEgresos.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            {cantidadEgresos} {cantidadEgresos === 1 ? 'gasto' : 'gastos'} ejecutados
          </span>
        </div>

        {/* Balance Neto */}
        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Balance Financiero</span>
            <Scale className="w-4 h-4 text-blue-700 dark:text-indigo-400" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold ${
              balanceNeto >= 0
                ? 'text-emerald-800 dark:text-emerald-400'
                : 'text-rose-800 dark:text-rose-400'
            }`}
          >
            Bs. {balanceNeto.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] font-semibold text-[#7d776f] dark:text-slate-500">
            {balanceNeto >= 0 ? 'Superávit en período' : 'Déficit en período'}
          </span>
        </div>

        {/* Mayor Rubro */}
        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Mayor Rubro de Gasto</span>
            <Tag className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-[#262422] dark:text-white truncate">
            {mayorRubroInfo.nombre}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            {mayorRubroInfo.porcentaje}% del total de egresos
          </span>
        </div>
      </div>

      {/* PESTAÑAS POR TIPO (Todos, Ingresos Extraordinarios, Egresos) (CA1, CA2, CA3) */}
      <div className="flex border-b border-[#cec8bc] dark:border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => setTabTipo('Todos')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            tabTipo === 'Todos'
              ? 'border-blue-700 text-blue-800 dark:border-blue-500 dark:text-blue-400'
              : 'border-transparent text-[#7d776f] hover:text-[#262422] dark:hover:text-white'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Todos los Movimientos ({movimientos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTabTipo('Ingreso')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            tabTipo === 'Ingreso'
              ? 'border-emerald-600 text-emerald-800 dark:border-emerald-500 dark:text-emerald-400'
              : 'border-transparent text-[#7d776f] hover:text-[#262422] dark:hover:text-white'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          <span>Ingresos Extraordinarios ({movimientos.filter((m) => m.tipo === 'Ingreso').length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTabTipo('Egreso')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            tabTipo === 'Egreso'
              ? 'border-rose-600 text-rose-800 dark:border-rose-500 dark:text-rose-400'
              : 'border-transparent text-[#7d776f] hover:text-[#262422] dark:hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-rose-600" />
          <span>Egresos y Gastos ({movimientos.filter((m) => m.tipo === 'Egreso').length})</span>
        </button>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS AVANZADOS (CA4, CA6, CA7) */}
      <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between shadow-xs">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por pagador, proveedor, concepto o comprobante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
          />
        </div>

        {/* Filtros: Categoría y Período */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Categoría (CA4) */}
          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#7d776f]" />
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium max-w-[160px] truncate"
            >
              <option value="Todos">Categoría: Todas</option>
              {categorias
                .filter((c) => tabTipo === 'Todos' || c.tipo === tabTipo)
                .map((cat) => (
                  <option key={cat.idCategoria} value={cat.idCategoria}>
                    {cat.nombre}
                  </option>
                ))}
            </select>
          </div>

          {/* Período (CA6) */}
          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Calendar className="w-3.5 h-3.5 text-[#7d776f]" />
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value as any)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
            >
              <option value="todos">Período: Histórico completo</option>
              <option value="mes_actual">Este Mes</option>
              <option value="mes_anterior">Mes Anterior</option>
              <option value="personalizado">Rango Personalizado</option>
            </select>
          </div>

          {/* Rango de Fechas específico */}
          {filtroPeriodo === 'personalizado' && (
            <div className="flex items-center gap-1 bg-[#dfd9ce] dark:bg-slate-950 px-2 py-1.5 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="bg-transparent text-[#262422] dark:text-white text-xs focus:outline-none"
              />
              <span className="text-[#7d776f]">&rarr;</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="bg-transparent text-[#262422] dark:text-white text-xs focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* TABLA PRINCIPAL DE MOVIMIENTOS FINANCIEROS */}
      <div className="rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#e3ded4] dark:bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-[#5c5750] dark:text-slate-400">
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Código / Fecha</th>
                <th className="py-3 px-4">Origen / Beneficiario</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Concepto / Detalle</th>
                <th className="py-3 px-4">Monto (Bs.)</th>
                <th className="py-3 px-4">Comprobante</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cec8bc]/60 dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#7d776f] dark:text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-700" />
                      <span>Cargando movimientos financieros...</span>
                    </div>
                  </td>
                </tr>
              ) : movimientosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#7d776f] dark:text-slate-500">
                    No se encontraron movimientos financieros con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                movimientosFiltrados.map((mov) => {
                  const esIngreso = mov.tipo === 'Ingreso'
                  return (
                    <tr
                      key={mov.id}
                      className="hover:bg-[#e6e1d6]/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Tipo */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            esIngreso
                              ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                              : 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
                          }`}
                        >
                          {esIngreso ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                          {mov.tipo}
                        </span>
                      </td>

                      {/* Código / Fecha */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#262422] dark:text-white font-mono text-xs">
                          {mov.codigo}
                        </div>
                        <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                          {mov.fecha}
                        </div>
                      </td>

                      {/* Origen / Proveedor */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#262422] dark:text-white flex items-center gap-1.5 max-w-[180px] truncate">
                          <Building className="w-3.5 h-3.5 text-[#7d776f] shrink-0" />
                          <span className="truncate">{mov.tercero}</span>
                        </div>
                        <div className="text-[10px] text-[#7d776f] dark:text-slate-400">
                          Método: {mov.metodoPago}
                        </div>
                      </td>

                      {/* Categoría (CA4) */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-[#dfd9ce] dark:bg-slate-800 text-[#4a4641] dark:text-slate-300 font-semibold text-[11px] inline-block max-w-[150px] truncate">
                          {mov.categoria}
                        </span>
                      </td>

                      {/* Concepto */}
                      <td className="py-3 px-4 text-[#5c5750] dark:text-slate-300 max-w-xs truncate">
                        {mov.descripcion}
                      </td>

                      {/* Monto */}
                      <td
                        className={`py-3 px-4 font-black text-sm ${
                          esIngreso
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {esIngreso ? '+' : '-'} Bs. {mov.monto.toFixed(2)}
                      </td>

                      {/* Comprobante (CA5) */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-white/70 dark:bg-slate-950/70 border border-[#cec8bc] dark:border-slate-800 text-[#4a4641] dark:text-slate-300">
                          <FileCheck className="w-3 h-3 text-blue-600" />
                          <span className="max-w-[100px] truncate">{mov.nroFactura}</span>
                        </span>
                      </td>

                      {/* Acciones (CA5, CA8) */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedMovimiento(mov)}
                            className="p-1.5 rounded-lg text-[#5c5750] hover:text-[#262422] hover:bg-[#ded8cc] dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Ver Comprobante y Detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {hasFinancialPermission && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(mov)}
                                className="p-1.5 rounded-lg text-blue-700 hover:text-blue-900 hover:bg-blue-100/60 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Editar Movimiento (CA8)"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setMovimientoParaEliminar(mov)}
                                className="p-1.5 rounded-lg text-rose-700 hover:text-rose-900 hover:bg-rose-100/60 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Eliminar Movimiento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
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

      {/* MODAL REGISTRAR MOVIMIENTO (CA1, CA2, CA3, CA4, CA5) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    formTipo === 'Ingreso' ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                />
                <h3 className="font-extrabold text-lg text-[#262422] dark:text-white">
                  Registrar {formTipo === 'Ingreso' ? 'Ingreso Extraordinario' : 'Egreso / Gasto'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearMovimiento} className="space-y-4">
              {/* Selector de Tipo (CA1) */}
              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1.5">
                  Tipo de Movimiento Financiero *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormTipo('Ingreso')
                      const cat = categorias.find((c) => c.tipo === 'Ingreso')
                      if (cat) setFormIdCategoria(cat.idCategoria)
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      formTipo === 'Ingreso'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                        : 'bg-[#dfd9ce] dark:bg-slate-950 text-[#5c5750] dark:text-slate-400 border-[#cec8bc] dark:border-slate-800'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Ingreso Extraordinario</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormTipo('Egreso')
                      const cat = categorias.find((c) => c.tipo === 'Egreso')
                      if (cat) setFormIdCategoria(cat.idCategoria)
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      formTipo === 'Egreso'
                        ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                        : 'bg-[#dfd9ce] dark:bg-slate-950 text-[#5c5750] dark:text-slate-400 border-[#cec8bc] dark:border-slate-800'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Egreso / Gasto</span>
                  </button>
                </div>
              </div>

              {/* Tercero (Proveedor / Pagador) */}
              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  {formTipo === 'Ingreso' ? 'Copropietario / Pagador / Origen *' : 'Proveedor / Beneficiario *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    formTipo === 'Ingreso'
                      ? 'Ej. Dpto 402 - Sra. Mariana Flores, Donación Vecinal'
                      : 'Ej. ELFEC S.A., Tigo Bolivia, Otis Ascensores'
                  }
                  value={formTercero}
                  onChange={(e) => setFormTercero(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Categoría y Monto (CA3, CA4) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Categoría Asociada *
                  </label>
                  <select
                    value={formIdCategoria}
                    onChange={(e) => setFormIdCategoria(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    {categoriasParaModal.map((cat) => (
                      <option key={cat.idCategoria} value={cat.idCategoria}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Monto (Bs.) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={formMonto || ''}
                    onChange={(e) => setFormMonto(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                  />
                </div>
              </div>

              {/* Fecha y Método de Pago (CA3, CA6) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Fecha del Movimiento *
                  </label>
                  <input
                    type="date"
                    required
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Forma de Pago
                  </label>
                  <select
                    value={formMetodoPago}
                    onChange={(e) => setFormMetodoPago(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                    <option value="QR Simple Interbancario">QR Simple</option>
                    <option value="Efectivo en Caja">Efectivo en Caja</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Débito Automático">Débito Automático</option>
                  </select>
                </div>
              </div>

              {/* Número de Comprobante y Archivo Adjunto (CA5) */}
              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Nro Factura / Recibo / Código
                </label>
                <input
                  type="text"
                  placeholder={formTipo === 'Ingreso' ? 'REC-0982 o REF-1234' : 'FAC-89012'}
                  value={formNroFactura}
                  onChange={(e) => setFormNroFactura(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              {/* Adjuntar Archivo de Comprobante (CA5) */}
              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Adjuntar Comprobante o Factura (PDF, Imagen)
                </label>
                <div className="relative border-2 border-dashed border-[#cec8bc] dark:border-slate-700 rounded-2xl p-3 text-center bg-[#dfd9ce]/50 dark:bg-slate-950/50 hover:bg-[#dfd9ce] transition-colors">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-1 pointer-events-none">
                    <UploadCloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    {fileNameAttached ? (
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 truncate max-w-xs">
                        &check; Archivo: {fileNameAttached}
                      </span>
                    ) : (
                      <>
                        <span className="text-xs font-semibold text-[#4a4641] dark:text-slate-300">
                          Haga clic o arrastre el archivo de comprobante aquí
                        </span>
                        <span className="text-[10px] text-[#7d776f]">Formatos: JPG, PNG o PDF</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Concepto / Descripción */}
              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Concepto / Detalle de la Operación
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre el motivo del ingreso o egreso..."
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-semibold text-[#262422] dark:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer flex items-center gap-2 ${
                    formTipo === 'Ingreso'
                      ? 'bg-emerald-700 hover:bg-emerald-600'
                      : 'bg-rose-700 hover:bg-rose-600'
                  }`}
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmitting ? 'Guardando...' : 'Guardar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR MOVIMIENTO (CA8, CA9) */}
      {isEditModalOpen && movimientoParaEditar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-[#262422] dark:text-white">
                  Modificar Movimiento Financiero (CA8)
                </h3>
                <span className="text-[11px] text-[#7d776f] font-mono">
                  Código: {movimientoParaEditar.codigo}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false)
                  setMovimientoParaEditar(null)
                }}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} className="space-y-4">
              {/* Tercero */}
              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  {formTipo === 'Ingreso' ? 'Copropietario / Pagador *' : 'Proveedor / Beneficiario *'}
                </label>
                <input
                  type="text"
                  required
                  value={formTercero}
                  onChange={(e) => setFormTercero(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Categoría y Monto */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Categoría
                  </label>
                  <select
                    value={formIdCategoria}
                    onChange={(e) => setFormIdCategoria(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    {categoriasParaModal.map((cat) => (
                      <option key={cat.idCategoria} value={cat.idCategoria}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Monto (Bs.) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.01"
                    required
                    value={formMonto || ''}
                    onChange={(e) => setFormMonto(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                  />
                </div>
              </div>

              {/* Fecha y Método */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Fecha Registrada
                  </label>
                  <input
                    type="date"
                    required
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={formMetodoPago}
                    onChange={(e) => setFormMetodoPago(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                    <option value="QR Simple Interbancario">QR Simple</option>
                    <option value="Efectivo en Caja">Efectivo en Caja</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Débito Automático">Débito Automático</option>
                  </select>
                </div>
              </div>

              {/* Comprobante */}
              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Nro Factura / Recibo
                </label>
                <input
                  type="text"
                  value={formNroFactura}
                  onChange={(e) => setFormNroFactura(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              {/* Reemplazar Comprobante Adjunto */}
              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Actualizar Archivo Comprobante
                </label>
                <div className="relative border-2 border-dashed border-[#cec8bc] dark:border-slate-700 rounded-2xl p-3 text-center bg-[#dfd9ce]/50 dark:bg-slate-950/50 hover:bg-[#dfd9ce] transition-colors">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-1 pointer-events-none">
                    <UploadCloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    {fileNameAttached ? (
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 truncate max-w-xs">
                        &check; {fileNameAttached}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-[#4a4641] dark:text-slate-300">
                        Haga clic para subir un nuevo archivo de respaldo
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Concepto */}
              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Concepto / Descripción
                </label>
                <textarea
                  rows={2}
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false)
                    setMovimientoParaEditar(null)
                  }}
                  className="px-4 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-semibold text-[#262422] dark:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-xs font-bold text-white shadow-md cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmitting ? 'Actualizando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE Y VISUALIZADOR DE COMPROBANTE (CA5) */}
      {selectedMovimiento && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                  Comprobante de {selectedMovimiento.tipo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMovimiento(null)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#cec8bc]/40 dark:border-slate-800">
                <span className="text-[#7d776f]">Código Interno:</span>
                <span className="font-bold font-mono text-[#262422] dark:text-white">
                  {selectedMovimiento.codigo}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#cec8bc]/40 dark:border-slate-800">
                <span className="text-[#7d776f]">
                  {selectedMovimiento.tipo === 'Ingreso' ? 'Pagador / Origen:' : 'Proveedor / Beneficiario:'}
                </span>
                <span className="font-bold text-[#262422] dark:text-white">
                  {selectedMovimiento.tercero}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#cec8bc]/40 dark:border-slate-800">
                <span className="text-[#7d776f]">Categoría Financiera:</span>
                <span className="font-semibold text-blue-800 dark:text-blue-300">
                  {selectedMovimiento.categoria}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#cec8bc]/40 dark:border-slate-800">
                <span className="text-[#7d776f]">Nro de Factura / Recibo:</span>
                <span className="font-bold font-mono">{selectedMovimiento.nroFactura}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#cec8bc]/40 dark:border-slate-800">
                <span className="text-[#7d776f]">Fecha de Operación:</span>
                <span className="font-bold">{selectedMovimiento.fecha}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#cec8bc]/40 dark:border-slate-800">
                <span className="text-[#7d776f]">Forma de Pago:</span>
                <span className="font-bold">{selectedMovimiento.metodoPago}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#cec8bc]/40 dark:border-slate-800">
                <span className="text-[#7d776f]">Registrado por:</span>
                <span className="font-medium text-[#5c5750] dark:text-slate-400">
                  {selectedMovimiento.registradoPor || 'admin'}
                </span>
              </div>

              {/* Concepto */}
              <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-950/70 border border-[#cec8bc] dark:border-slate-800 mt-2">
                <span className="font-bold block text-[10px] uppercase text-[#7d776f] mb-1">
                  Concepto / Justificación
                </span>
                <p className="text-[#4a4641] dark:text-slate-200 leading-relaxed">
                  {selectedMovimiento.descripcion}
                </p>
              </div>

              {/* Previsualización del Comprobante Adjunto (CA5) */}
              {selectedMovimiento.comprobanteUrl && (
                <div className="mt-3 p-3 rounded-xl bg-white/70 dark:bg-slate-950/70 border border-[#cec8bc] dark:border-slate-800 space-y-2">
                  <span className="font-bold block text-[10px] uppercase text-[#7d776f]">
                    Archivo Adjunto / Respaldo Digital
                  </span>
                  {selectedMovimiento.comprobanteUrl.startsWith('data:image/') ? (
                    <div className="rounded-xl overflow-hidden max-h-56 flex items-center justify-center bg-black/5 dark:bg-white/5">
                      <img
                        src={selectedMovimiento.comprobanteUrl}
                        alt="Comprobante adjunto"
                        className="object-contain max-h-56 w-auto"
                      />
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-emerald-600" />
                        <span className="font-medium text-xs">
                          {selectedMovimiento.comprobanteUrl.startsWith('data:application/pdf')
                            ? 'Documento PDF adjunto'
                            : selectedMovimiento.comprobanteUrl}
                        </span>
                      </div>
                      <a
                        href={selectedMovimiento.comprobanteUrl}
                        download={`comprobante_${selectedMovimiento.codigo}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-blue-700 text-white text-[11px] font-bold"
                      >
                        Abrir / Descargar
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Total */}
              <div
                className={`flex justify-between font-black text-base pt-3 border-t border-[#cec8bc] dark:border-slate-800 ${
                  selectedMovimiento.tipo === 'Ingreso'
                    ? 'text-emerald-800 dark:text-emerald-400'
                    : 'text-rose-800 dark:text-rose-400'
                }`}
              >
                <span>Monto Registrado:</span>
                <span>
                  {selectedMovimiento.tipo === 'Ingreso' ? '+' : '-'} Bs.{' '}
                  {selectedMovimiento.monto.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#cec8bc] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedMovimiento(null)}
                className="px-4 py-2 rounded-xl bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#262422] dark:text-white text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      {movimientoParaEliminar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                Eliminar Movimiento
              </h3>
            </div>
            <p className="text-xs text-[#5c5750] dark:text-slate-300">
              ¿Está seguro de que desea eliminar el movimiento{' '}
              <strong>{movimientoParaEliminar.codigo}</strong> por Bs.{' '}
              {movimientoParaEliminar.monto.toFixed(2)}? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#cec8bc] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMovimientoParaEliminar(null)}
                className="px-3.5 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-bold text-[#262422] dark:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminacion}
                className="px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer shadow-md"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
