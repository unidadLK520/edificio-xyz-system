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
  AlertTriangle,
  RotateCcw,
  Scale,
  ExternalLink,
  Save,
  Check
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { fechaSolo } from '@/lib/fecha'

export interface MovimientoItem {
  id: number
  tipo: 'Ingreso' | 'Egreso'
  codigo: string
  fecha: string
  idCategoria: number
  categoria: string
  tercero?: string | null
  descripcion: string
  nroFactura?: string | null
  comprobanteUrl?: string | null
  monto: number
  metodoPago?: string | null
  registradoPor?: string
}

export interface CategoriaItem {
  idCategoria: number
  nombre: string
  tipo: 'Ingreso' | 'Egreso'
}

const DEFAULT_CATEGORIAS: CategoriaItem[] = [
  { idCategoria: 1, nombre: 'Mantenimiento y Reparaciones', tipo: 'Egreso' },
  { idCategoria: 2, nombre: 'Servicios Básicos Comunes (Luz/Agua)', tipo: 'Egreso' },
  { idCategoria: 3, nombre: 'Seguridad y Vigilancia', tipo: 'Egreso' },
  { idCategoria: 4, nombre: 'Limpieza y Desinfección', tipo: 'Egreso' },
  { idCategoria: 5, nombre: 'Administrativo y Operativo', tipo: 'Egreso' },
  { idCategoria: 6, nombre: 'Cobro de Expensas Ordinarias', tipo: 'Ingreso' },
  { idCategoria: 7, nombre: 'Fondo de Reserva / Cuota Extraordinaria', tipo: 'Ingreso' },
  { idCategoria: 8, nombre: 'Multas y Penalidades Reglamentarias', tipo: 'Ingreso' },
  { idCategoria: 9, nombre: 'Intereses y Rendimientos', tipo: 'Ingreso' },
]

export default function FinanzasPage() {
  const [movimientos, setMovimientos] = useState<MovimientoItem[]>([])
  const [categorias, setCategorias] = useState<CategoriaItem[]>(DEFAULT_CATEGORIAS)
  const [loading, setLoading] = useState<boolean>(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Control de rol (CA9)
  const [userRole, setUserRole] = useState<string>('ADMINISTRADOR')
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('user_role') || 'ADMINISTRADOR'
      setUserRole(storedRole.toUpperCase())

      // Detectar parámetro ?tipo=Ingreso o ?tipo=Egreso desde URL
      const urlParams = new URLSearchParams(window.location.search)
      const tipoParam = urlParams.get('tipo')
      if (tipoParam === 'Ingreso' || tipoParam === 'Egreso') {
        setTabTipo(tipoParam)
      }
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
  const [isCategoriasModalOpen, setIsCategoriasModalOpen] = useState(false)
  const [selectedMovimiento, setSelectedMovimiento] = useState<MovimientoItem | null>(null)
  const [movimientoParaEditar, setMovimientoParaEditar] = useState<MovimientoItem | null>(null)
  const [movimientoParaEliminar, setMovimientoParaEliminar] = useState<MovimientoItem | null>(null)

  // Errores específicos dentro de los modales (no cierran el modal si falla)
  const [createModalError, setCreateModalError] = useState<string | null>(null)
  const [editModalError, setEditModalError] = useState<string | null>(null)
  const [catModalError, setCatModalError] = useState<string | null>(null)
  const [catModalSuccess, setCatModalSuccess] = useState<string | null>(null)
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null)
  const [motivoEliminarInput, setMotivoEliminarInput] = useState<string>('')
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  // Resumen financiero oficial desde GET /api/v1/movimientos/resumen
  const [resumenData, setResumenData] = useState<{
    totalIngresos: number
    totalEgresos: number
    balance: number
    cantidadIngresos: number
    cantidadEgresos: number
  } | null>(null)

  // Formulario de Registro / Edición
  const [formTipo, setFormTipo] = useState<'Ingreso' | 'Egreso'>('Egreso')
  const [formIdCategoria, setFormIdCategoria] = useState<number>(1)
  const [formTercero, setFormTercero] = useState('')
  const [formDescripcion, setFormDescripcion] = useState('')
  const [formMonto, setFormMonto] = useState<number>(0)
  const [formFecha, setFormFecha] = useState(fechaSolo(new Date()))
  const [formNroFactura, setFormNroFactura] = useState('')
  const [formMetodoPago, setFormMetodoPago] = useState('')
  const [formComprobanteUrl, setFormComprobanteUrl] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileNameAttached, setFileNameAttached] = useState<string>('')

  // Estado para gestión de categorías
  const [newCatNombre, setNewCatNombre] = useState('')
  const [newCatTipo, setNewCatTipo] = useState<'Ingreso' | 'Egreso'>('Egreso')
  const [editingCatId, setEditingCatId] = useState<number | null>(null)
  const [editingCatNombre, setEditingCatNombre] = useState('')
  const [catFiltroTipo, setCatFiltroTipo] = useState<'Todos' | 'Ingreso' | 'Egreso'>('Todos')

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text })
    setTimeout(() => setFeedbackMsg(null), 5000)
  }

  // Cargar categorías disponibles desde API
  const fetchCategorias = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/movimientos/categorias')
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

  // Cargar resumen financiero oficial (GET /api/v1/movimientos/resumen)
  const fetchResumen = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filtroCategoria !== 'Todos') params.append('idCategoria', filtroCategoria)
      if (fechaDesde) params.append('fechaDesde', fechaDesde)
      if (fechaHasta) params.append('fechaHasta', fechaHasta)

      const res = await apiFetch(`/api/v1/movimientos/resumen?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setResumenData({
          totalIngresos: Number(json.totalIngresos || 0),
          totalEgresos: Number(json.totalEgresos || 0),
          balance: Number(json.balance || 0),
          cantidadIngresos: Number(json.cantidadIngresos || 0),
          cantidadEgresos: Number(json.cantidadEgresos || 0)
        })
      }
    } catch {
      // Si falla, se calculará automáticamente en el cliente
    }
  }, [filtroCategoria, fechaDesde, fechaHasta])

  // Cargar movimientos desde backend API
  const fetchMovimientos = useCallback(async () => {
    setLoading(true)
    setApiError(null)
    try {
      const params = new URLSearchParams()
      if (tabTipo !== 'Todos') params.append('tipo', tabTipo)
      if (filtroCategoria !== 'Todos') params.append('idCategoria', filtroCategoria)
      if (fechaDesde) params.append('fechaDesde', fechaDesde)
      if (fechaHasta) params.append('fechaHasta', fechaHasta)
      if (searchTerm.trim()) params.append('q', searchTerm.trim())

      const url = `/api/v1/movimientos?${params.toString()}`
      const res = await apiFetch(url)
      if (res.ok) {
        const json = await res.json()
        const rawData = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []

        const mapped: MovimientoItem[] = rawData.map((item: any) => {
          let tercero = item.tercero ?? item.proveedor ?? null
          let descripcionClean = item.descripcion || ''

          if (!tercero && descripcionClean.includes('|')) {
            const parts = descripcionClean.split('|')
            tercero = parts[0].trim()
            descripcionClean = parts.slice(1).join('|').trim()
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
            fecha: fechaSolo(item.fecha) || fechaSolo(new Date()),
            idCategoria: catId,
            categoria: catName,
            tercero: tercero || '',
            descripcion: descripcionClean || 'Sin descripción',
            nroFactura: item.nroFactura ?? item.nro_factura ?? '',
            comprobanteUrl: item.comprobanteUrl || null,
            monto: Number(item.monto || 0),
            metodoPago: item.metodoPago ?? item.metodo_pago ?? '',
            registradoPor: item.usuarioRegistro?.nombreUsuario || 'admin'
          }
        })
        setMovimientos(mapped)
      } else {
        const errJson = await res.json().catch(() => ({}))
        setApiError(errJson.message || 'Error al conectar con el servidor de movimientos.')
        setMovimientos([])
      }
    } catch (err: any) {
      console.error('Error al cargar movimientos desde la API:', err)
      setApiError(err?.message || 'Error de conexión al cargar movimientos financieros.')
      setMovimientos([])
    } finally {
      setLoading(false)
    }
  }, [tabTipo, filtroCategoria, fechaDesde, fechaHasta, searchTerm])

  useEffect(() => {
    fetchCategorias()
  }, [fetchCategorias])

  useEffect(() => {
    fetchMovimientos()
    fetchResumen()
  }, [fetchMovimientos, fetchResumen])

  // Manejar selector de archivo para comprobantes (CA5)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setFileNameAttached(file.name)
    if (!formNroFactura) {
      setFormNroFactura(`DOC-${file.name.slice(0, 15)}`)
    }
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
      setFechaDesde(fechaSolo(inicio))
      setFechaHasta(fechaSolo(fin))
    } else if (filtroPeriodo === 'mes_anterior') {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
      setFechaDesde(fechaSolo(inicio))
      setFechaHasta(fechaSolo(fin))
    }
  }, [filtroPeriodo])

  // Filtrado reactivo en cliente para búsqueda y categoría
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((m) => {
      const matchTipo = tabTipo === 'Todos' || m.tipo === tabTipo
      const matchCat = filtroCategoria === 'Todos' || String(m.idCategoria) === filtroCategoria || m.categoria === filtroCategoria
      const matchSearch =
        (m.tercero || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.nroFactura || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.codigo.toLowerCase().includes(searchTerm.toLowerCase())

      let matchFecha = true
      if (fechaDesde && m.fecha < fechaDesde) matchFecha = false
      if (fechaHasta && m.fecha > fechaHasta) matchFecha = false

      return matchTipo && matchCat && matchSearch && matchFecha
    })
  }, [movimientos, tabTipo, filtroCategoria, searchTerm, fechaDesde, fechaHasta])

  // Cálculos dinámicos de totales y resumen consistente (CA10) con datos oficiales del backend
  const totalIngresos = useMemo(
    () =>
      resumenData !== null && !searchTerm.trim()
        ? Number(resumenData.totalIngresos || 0)
        : movimientosFiltrados
            .filter((m) => m.tipo === 'Ingreso')
            .reduce((acc, curr) => acc + curr.monto, 0),
    [resumenData, searchTerm, movimientosFiltrados]
  )

  const totalEgresos = useMemo(
    () =>
      resumenData !== null && !searchTerm.trim()
        ? Number(resumenData.totalEgresos || 0)
        : movimientosFiltrados
            .filter((m) => m.tipo === 'Egreso')
            .reduce((acc, curr) => acc + curr.monto, 0),
    [resumenData, searchTerm, movimientosFiltrados]
  )

  const balanceNeto = useMemo(() => totalIngresos - totalEgresos, [totalIngresos, totalEgresos])

  const cantidadIngresos = useMemo(
    () =>
      resumenData !== null && !searchTerm.trim()
        ? Number(resumenData.cantidadIngresos || 0)
        : movimientosFiltrados.filter((m) => m.tipo === 'Ingreso').length,
    [resumenData, searchTerm, movimientosFiltrados]
  )

  const cantidadEgresos = useMemo(
    () =>
      resumenData !== null && !searchTerm.trim()
        ? Number(resumenData.cantidadEgresos || 0)
        : movimientosFiltrados.filter((m) => m.tipo === 'Egreso').length,
    [resumenData, searchTerm, movimientosFiltrados]
  )

  // Categorías filtradas para el modal según el tipo seleccionado
  const categoriasParaModal = useMemo(() => {
    return categorias.filter((c) => c.tipo === formTipo)
  }, [categorias, formTipo])

  // Subir archivo al endpoint de comprobantes
  const uploadArchivoComprobante = async (file: File): Promise<string> => {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    const uploadRes = await apiFetch('/api/v1/movimientos/upload-comprobante', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        archivoBase64: base64Data,
        nombreArchivo: file.name
      })
    })

    const uploadData = await uploadRes.json().catch(() => ({}))
    if (!uploadRes.ok) {
      throw new Error(uploadData.message || uploadData.error || 'Error al subir el comprobante')
    }

    return uploadData.comprobanteUrl || ''
  }

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
    setFormFecha(fechaSolo(new Date()))
    setFormNroFactura('')
    setFormMetodoPago('')
    setFormComprobanteUrl('')
    setSelectedFile(null)
    setFileNameAttached('')
    setCreateModalError(null)
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
    setFormTercero(mov.tercero || '')
    setFormDescripcion(mov.descripcion || '')
    setFormMonto(mov.monto)
    setFormFecha(mov.fecha)
    setFormNroFactura(mov.nroFactura || '')
    setFormMetodoPago(mov.metodoPago || '')
    setFormComprobanteUrl(mov.comprobanteUrl || '')
    setSelectedFile(null)
    setFileNameAttached(mov.comprobanteUrl ? 'Comprobante digital adjunto' : '')
    setEditModalError(null)
    setIsEditModalOpen(true)
  }

  // Guardar nuevo movimiento (Campos obligatorios: fecha, descripcion, monto; opcionales: tercero, nroFactura, metodoPago)
  const handleCrearMovimiento = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateModalError(null)

    if (!hasFinancialPermission) {
      setCreateModalError('Operación impedida: Permisos insuficientes.')
      return
    }

    // Validaciones obligatorias de contrato
    if (!formFecha) {
      setCreateModalError('La fecha del movimiento es estrictamente obligatoria.')
      return
    }
    if (!formDescripcion.trim()) {
      setCreateModalError('La descripción o concepto es estrictamente obligatoria.')
      return
    }
    if (formMonto <= 0) {
      setCreateModalError('El monto debe ser un valor numérico mayor a cero.')
      return
    }

    setIsSubmitting(true)
    try {
      let finalComprobanteUrl = formComprobanteUrl.trim() || undefined

      // Si seleccionó un archivo nuevo, subirlo al endpoint dedicado
      if (selectedFile) {
        try {
          finalComprobanteUrl = await uploadArchivoComprobante(selectedFile)
        } catch (uploadErr: any) {
          setCreateModalError(`Error en subida de comprobante: ${uploadErr.message}`)
          setIsSubmitting(false)
          return // No cerrar el modal
        }
      }

      const bodyPayload = {
        tipo: formTipo,
        idCategoria: formIdCategoria,
        monto: Number(formMonto),
        fecha: formFecha ? new Date(formFecha).toISOString() : new Date().toISOString(),
        descripcion: formDescripcion.trim(),
        tercero: formTercero.trim() || undefined,
        nroFactura: formNroFactura.trim() || undefined,
        metodoPago: formMetodoPago.trim() || undefined,
        comprobanteUrl: finalComprobanteUrl
      }

      const res = await apiFetch('/api/v1/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      })

      if (res.ok) {
        showNotification('success', `¡${formTipo} registrado correctamente!`)
        setIsCreateModalOpen(false)
        await fetchMovimientos()
        await fetchResumen()
      } else {
        const errorJson = await res.json().catch(() => ({}))
        let errorMsg = errorJson.message || errorJson.error || 'Error al procesar el registro.'
        if (errorJson.details && typeof errorJson.details === 'object') {
          const detailEntries = Object.entries(errorJson.details)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ')
          if (detailEntries) {
            errorMsg = `${errorMsg} (${detailEntries})`
          }
        }
        // Mostrar mensaje exacto del backend y NO cerrar modal
        setCreateModalError(errorMsg)
        showNotification('error', errorMsg)
      }
    } catch (err: any) {
      console.error('Error creando movimiento:', err)
      const errTxt = err?.message || 'Ocurrió un error al procesar el registro.'
      setCreateModalError(errTxt)
      showNotification('error', errTxt)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Guardar edición de movimiento
  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditModalError(null)

    if (!movimientoParaEditar) return
    if (!hasFinancialPermission) {
      setEditModalError('Operación impedida: Permisos insuficientes.')
      return
    }

    if (!formFecha) {
      setEditModalError('La fecha del movimiento es estrictamente obligatoria.')
      return
    }
    if (!formDescripcion.trim()) {
      setEditModalError('La descripción o concepto es estrictamente obligatoria.')
      return
    }
    if (formMonto <= 0) {
      setEditModalError('El monto debe ser un valor numérico mayor a cero.')
      return
    }

    setIsSubmitting(true)
    try {
      let finalComprobanteUrl = formComprobanteUrl.trim() || undefined

      if (selectedFile) {
        try {
          finalComprobanteUrl = await uploadArchivoComprobante(selectedFile)
        } catch (uploadErr: any) {
          setEditModalError(`Error en subida de comprobante: ${uploadErr.message}`)
          setIsSubmitting(false)
          return
        }
      }

      const bodyPayload = {
        tipo: formTipo,
        idCategoria: formIdCategoria,
        monto: Number(formMonto),
        fecha: formFecha ? new Date(formFecha).toISOString() : new Date().toISOString(),
        descripcion: formDescripcion.trim(),
        tercero: formTercero.trim() || undefined,
        nroFactura: formNroFactura.trim() || undefined,
        metodoPago: formMetodoPago.trim() || undefined,
        comprobanteUrl: finalComprobanteUrl
      }

      const res = await apiFetch(`/api/v1/movimientos/${movimientoParaEditar.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      })

      if (res.ok) {
        showNotification('success', 'Movimiento financiero actualizado correctamente.')
        setIsEditModalOpen(false)
        setMovimientoParaEditar(null)
        await fetchMovimientos()
      } else {
        const errorJson = await res.json().catch(() => ({}))
        let errorMsg = errorJson.message || errorJson.error || 'Error al actualizar el registro financiero.'
        if (errorJson.details && typeof errorJson.details === 'object') {
          const detailEntries = Object.entries(errorJson.details)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ')
          if (detailEntries) {
            errorMsg = `${errorMsg} (${detailEntries})`
          }
        }
        setEditModalError(errorMsg)
        showNotification('error', errorMsg)
      }
    } catch (err: any) {
      console.error('Error al editar movimiento:', err)
      const errTxt = err?.message || 'Error al guardar los cambios.'
      setEditModalError(errTxt)
      showNotification('error', errTxt)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Eliminar / anular movimiento con motivo obligatorio (DELETE /api/v1/movimientos/:id)
  const handleConfirmarEliminacion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!movimientoParaEliminar) return
    if (!hasFinancialPermission) {
      setDeleteModalError('Acceso denegado: No posee permisos para anular movimientos.')
      return
    }

    if (!motivoEliminarInput.trim()) {
      setDeleteModalError('El motivo de la anulación es obligatorio.')
      return
    }

    setIsDeleting(true)
    setDeleteModalError(null)

    try {
      const res = await apiFetch(`/api/v1/movimientos/${movimientoParaEliminar.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoEliminarInput.trim() })
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        showNotification('success', data.message || 'Movimiento anulado correctamente.')
        setMovimientoParaEliminar(null)
        setMotivoEliminarInput('')
        await fetchMovimientos()
        await fetchResumen()
      } else {
        const errMsg = data.message || data.error || 'Error al anular movimiento.'
        setDeleteModalError(errMsg)
        showNotification('error', errMsg)
      }
    } catch (err: any) {
      console.error('Error eliminando movimiento:', err)
      const errMsg = err?.message || 'No se pudo eliminar el registro.'
      setDeleteModalError(errMsg)
      showNotification('error', errMsg)
    } finally {
      setIsDeleting(false)
    }
  }

  // Crear categoría (POST /api/v1/movimientos/categorias)
  const handleCrearCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    setCatModalError(null)
    setCatModalSuccess(null)

    if (!newCatNombre.trim()) {
      setCatModalError('El nombre de la categoría es obligatorio.')
      return
    }

    try {
      const res = await apiFetch('/api/v1/movimientos/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: newCatNombre.trim(),
          tipo: newCatTipo
        })
      })

      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setCatModalSuccess(`Categoría "${newCatNombre.trim()}" creada exitosamente.`)
        setNewCatNombre('')
        await fetchCategorias()
      } else {
        const errMsg = data.message || data.error || 'Error al crear categoría'
        setCatModalError(errMsg)
      }
    } catch (err: any) {
      setCatModalError(err?.message || 'Error de conexión al crear categoría')
    }
  }

  // Editar categoría (PUT /api/v1/movimientos/categorias/:id)
  const handleEditarCategoria = async (idCat: number) => {
    setCatModalError(null)
    setCatModalSuccess(null)

    if (!editingCatNombre.trim()) {
      setCatModalError('El nombre no puede estar vacío.')
      return
    }

    try {
      const res = await apiFetch(`/api/v1/movimientos/categorias/${idCat}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editingCatNombre.trim()
        })
      })

      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setCatModalSuccess('Categoría actualizada correctamente.')
        setEditingCatId(null)
        setEditingCatNombre('')
        await fetchCategorias()
      } else {
        const errMsg = data.message || data.error || 'Error al actualizar categoría'
        setCatModalError(errMsg)
      }
    } catch (err: any) {
      setCatModalError(err?.message || 'Error de conexión al modificar categoría')
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

        {/* BOTONES DE ACCIÓN RÁPIDA */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasFinancialPermission && (
            <button
              type="button"
              onClick={() => {
                setCatModalError(null)
                setCatModalSuccess(null)
                setIsCategoriasModalOpen(true)
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#dfd9ce] dark:bg-slate-800 hover:bg-[#d5cfc2] dark:hover:bg-slate-700 text-[#262422] dark:text-white text-xs sm:text-sm font-bold rounded-xl border border-[#cec8bc] dark:border-slate-700 transition-all cursor-pointer shadow-xs"
              title="Crear y editar categorías de ingresos y egresos (Solo Administrador)"
            >
              <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Categorías</span>
            </button>
          )}

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

      {/* ERROR CON REINTENTAR SI LA API FALLA Y NO HAY MOVIMIENTOS */}
      {apiError && movimientos.length === 0 && !loading ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 max-w-xl mx-auto space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Error al cargar los movimientos financieros
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {apiError}
            </p>
          </div>
          <button
            onClick={fetchMovimientos}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer shadow-md shadow-rose-600/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>
        </div>
      ) : (
        <>
          {/* CARDS DE BALANCE Y TOTALES (CA10) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400">
                <span>Ingresos Extraordinarios</span>
                <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                Bs. {totalIngresos.toFixed(2)}
              </div>
              <div className="text-[11px] text-[#7d776f] dark:text-slate-500">
                {cantidadIngresos} movimiento(s) computado(s)
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400">
                <span>Egresos y Gastos Operativos</span>
                <ArrowUpRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 font-mono">
                Bs. {totalEgresos.toFixed(2)}
              </div>
              <div className="text-[11px] text-[#7d776f] dark:text-slate-500">
                {cantidadEgresos} gasto(s) computado(s)
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400">
                <span>Balance Neto del Filtro</span>
                <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div
                className={`text-xl sm:text-2xl font-black font-mono ${
                  balanceNeto >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                Bs. {balanceNeto.toFixed(2)}
              </div>
              <div className="text-[11px] text-[#7d776f] dark:text-slate-500">
                {balanceNeto >= 0 ? 'Superávit en el período' : 'Déficit en el período'}
              </div>
            </div>
          </div>

          {/* BARRA DE FILTROS Y BÚSQUEDA (CA6, CA7) */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* TABS TIPO */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 self-start">
                {(['Todos', 'Ingreso', 'Egreso'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTabTipo(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      tabTipo === t
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'text-[#5c5750] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white'
                    }`}
                  >
                    {t === 'Todos' ? 'Todos los Flujos' : t === 'Ingreso' ? 'Ingresos' : 'Egresos'}
                  </button>
                ))}
              </div>

              {/* BÚSQUEDA */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#7d776f] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por tercero, detalle, factura o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white placeholder-[#7d776f] focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* SELECTOR CATEGORÍA */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#7d776f] shrink-0" />
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs font-semibold text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="Todos">Todas las Categorías</option>
                  {categorias.map((cat) => (
                    <option key={cat.idCategoria} value={cat.idCategoria}>
                      [{cat.tipo}] {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* FILTROS POR FECHA */}
            <div className="flex items-center gap-3 pt-2 border-t border-[#cec8bc]/50 dark:border-slate-800 text-xs flex-wrap">
              <span className="font-semibold text-[#7d776f]">Período:</span>
              {(['todos', 'mes_actual', 'mes_anterior'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFiltroPeriodo(p)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    filtroPeriodo === p
                      ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                      : 'text-[#7d776f] hover:text-[#262422] dark:hover:text-white'
                  }`}
                >
                  {p === 'todos' ? 'Histórico Completo' : p === 'mes_actual' ? 'Mes Actual' : 'Mes Anterior'}
                </button>
              ))}

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[11px] text-[#7d776f]">Desde:</span>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => {
                    setFechaDesde(e.target.value)
                    setFiltroPeriodo('personalizado')
                  }}
                  className="px-2 py-1 rounded-lg bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs"
                />
                <span className="text-[11px] text-[#7d776f]">Hasta:</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => {
                    setFechaHasta(e.target.value)
                    setFiltroPeriodo('personalizado')
                  }}
                  className="px-2 py-1 rounded-lg bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs"
                />
              </div>
            </div>
          </div>

          {/* TABLA DE MOVIMIENTOS */}
          <div className="rounded-2xl border border-[#cec8bc] dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#e3ded4] dark:bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-[#5c5750] dark:text-slate-400">
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Código / Fecha</th>
                    <th className="py-3 px-4">Tercero / Origen / Beneficiario</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4">Concepto / Descripción</th>
                    <th className="py-3 px-4">Monto (Bs.)</th>
                    <th className="py-3 px-4">Factura / Recibo</th>
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

                          {/* Tercero */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#262422] dark:text-white flex items-center gap-1.5 max-w-[180px] truncate">
                              <Building className="w-3.5 h-3.5 text-[#7d776f] shrink-0" />
                              <span className="truncate">{mov.tercero || 'Sin especificar'}</span>
                            </div>
                            {mov.metodoPago && (
                              <div className="text-[10px] text-[#7d776f] dark:text-slate-400">
                                Método: {mov.metodoPago}
                              </div>
                            )}
                          </td>

                          {/* Categoría */}
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-[#dfd9ce] dark:bg-slate-800 text-[#4a4641] dark:text-slate-300 font-semibold text-[11px] inline-block max-w-[150px] truncate">
                              {mov.categoria}
                            </span>
                          </td>

                          {/* Concepto / Descripción */}
                          <td className="py-3 px-4 text-[#5c5750] dark:text-slate-300 max-w-xs truncate" title={mov.descripcion}>
                            {mov.descripcion}
                          </td>

                          {/* Monto */}
                          <td
                            className={`py-3 px-4 font-black text-sm font-mono ${
                              esIngreso
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {esIngreso ? '+' : '-'} Bs. {mov.monto.toFixed(2)}
                          </td>

                          {/* Nro Factura / Comprobante */}
                          <td className="py-3 px-4">
                            {mov.nroFactura ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-white/70 dark:bg-slate-950/70 border border-[#cec8bc] dark:border-slate-800 text-[#4a4641] dark:text-slate-300">
                                <FileCheck className="w-3 h-3 text-blue-600" />
                                <span className="max-w-[100px] truncate">{mov.nroFactura}</span>
                              </span>
                            ) : mov.comprobanteUrl ? (
                              <span className="text-[11px] text-blue-600 font-semibold">Adjunto</span>
                            ) : (
                              <span className="text-[10px] text-[#7d776f]">Ninguno</span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedMovimiento(mov)}
                                className="p-1.5 rounded-lg text-[#5c5750] hover:text-[#262422] hover:bg-[#ded8cc] dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Ver Detalle y Comprobante"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {hasFinancialPermission && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(mov)}
                                    className="p-1.5 rounded-lg text-blue-700 hover:text-blue-900 hover:bg-blue-100/60 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title="Editar Movimiento"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setMovimientoParaEliminar(mov)}
                                    className="p-1.5 rounded-lg text-rose-700 hover:text-rose-900 hover:bg-rose-100/60 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title="Anular Movimiento"
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
        </>
      )}

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
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error específico del backend dentro del modal */}
            {createModalError && (
              <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span className="font-semibold">{createModalError}</span>
              </div>
            )}

            <form onSubmit={handleCrearMovimiento} className="space-y-4">
              {/* Selector de Tipo */}
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

              {/* Categoría y Monto */}
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
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={formMonto || ''}
                    onChange={(e) => setFormMonto(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold font-mono"
                  />
                </div>
              </div>

              {/* Fecha OBLIGATORIA */}
              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Fecha del Movimiento * (Obligatoria)
                </label>
                <input
                  type="date"
                  required
                  value={formFecha}
                  onChange={(e) => setFormFecha(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Concepto / Descripción OBLIGATORIA */}
              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Descripción / Concepto * (Obligatoria)
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Detalles sobre el motivo del ingreso o egreso..."
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Campos Opcionales: Tercero, NroFactura, Método de Pago */}
              <div className="p-3.5 rounded-2xl bg-white/50 dark:bg-slate-950/50 border border-[#cec8bc]/70 dark:border-slate-800 space-y-3">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[#7d776f]">
                  Datos Adicionales (Opcionales)
                </span>

                <div>
                  <label className="block text-[11px] font-medium text-[#5c5750] dark:text-slate-400 mb-1">
                    Tercero / Proveedor / Beneficiario / Pagador (Opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    placeholder="Ej. Schindler Ascensores, Propietario Dpto 302..."
                    value={formTercero}
                    onChange={(e) => setFormTercero(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#5c5750] dark:text-slate-400 mb-1">
                      Nro Factura / Recibo (Opcional)
                    </label>
                    <input
                      type="text"
                      maxLength={50}
                      placeholder="Ej. FAC-9912, REC-001"
                      value={formNroFactura}
                      onChange={(e) => setFormNroFactura(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#5c5750] dark:text-slate-400 mb-1">
                      Método de Pago (Opcional)
                    </label>
                    <input
                      type="text"
                      maxLength={30}
                      placeholder="Ej. Transferencia QR, Efectivo..."
                      value={formMetodoPago}
                      onChange={(e) => setFormMetodoPago(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Subida de Comprobante */}
              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Comprobante de Respaldo (PDF, Imagen)
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
                        <span className="text-[10px] text-[#7d776f]">Formatos: JPG, PNG o PDF (se almacenará con URL oficial)</span>
                      </>
                    )}
                  </div>
                </div>
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

      {/* MODAL EDITAR MOVIMIENTO */}
      {isEditModalOpen && movimientoParaEditar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-[#262422] dark:text-white">
                  Modificar Movimiento Financiero
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
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error específico dentro del modal */}
            {editModalError && (
              <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span className="font-semibold">{editModalError}</span>
              </div>
            )}

            <form onSubmit={handleGuardarEdicion} className="space-y-4">
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
                    step="0.01"
                    min="0.01"
                    required
                    value={formMonto || ''}
                    onChange={(e) => setFormMonto(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold font-mono"
                  />
                </div>
              </div>

              {/* Fecha OBLIGATORIA */}
              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Fecha Registrada * (Obligatoria)
                </label>
                <input
                  type="date"
                  required
                  value={formFecha}
                  onChange={(e) => setFormFecha(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Concepto OBLIGATORIO */}
              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Descripción / Concepto * (Obligatoria)
                </label>
                <textarea
                  rows={2}
                  required
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Datos Opcionales */}
              <div className="p-3.5 rounded-2xl bg-white/50 dark:bg-slate-950/50 border border-[#cec8bc]/70 dark:border-slate-800 space-y-3">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[#7d776f]">
                  Datos Adicionales (Opcionales)
                </span>

                <div>
                  <label className="block text-[11px] font-medium text-[#5c5750] dark:text-slate-400 mb-1">
                    Tercero / Proveedor / Beneficiario
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={formTercero}
                    onChange={(e) => setFormTercero(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#5c5750] dark:text-slate-400 mb-1">
                      Nro Factura / Recibo
                    </label>
                    <input
                      type="text"
                      maxLength={50}
                      value={formNroFactura}
                      onChange={(e) => setFormNroFactura(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#5c5750] dark:text-slate-400 mb-1">
                      Método de Pago
                    </label>
                    <input
                      type="text"
                      maxLength={30}
                      value={formMetodoPago}
                      onChange={(e) => setFormMetodoPago(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Actualizar Archivo Comprobante */}
              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Reemplazar Archivo Comprobante
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
                  Detalle de {selectedMovimiento.tipo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMovimiento(null)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white cursor-pointer"
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
                  {selectedMovimiento.tipo === 'Ingreso' ? 'Pagador / Tercero:' : 'Proveedor / Beneficiario:'}
                </span>
                <span className="font-bold text-[#262422] dark:text-white">
                  {selectedMovimiento.tercero || 'No especificado'}
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
                <span className="font-bold font-mono">{selectedMovimiento.nroFactura || 'Sin factura'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#cec8bc]/40 dark:border-slate-800">
                <span className="text-[#7d776f]">Fecha de Operación:</span>
                <span className="font-bold">{selectedMovimiento.fecha}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#cec8bc]/40 dark:border-slate-800">
                <span className="text-[#7d776f]">Forma / Método de Pago:</span>
                <span className="font-bold">{selectedMovimiento.metodoPago || 'No especificado'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#cec8bc]/40 dark:border-slate-800">
                <span className="text-[#7d776f]">Registrado por:</span>
                <span className="font-medium text-[#5c5750] dark:text-slate-400">
                  {selectedMovimiento.registradoPor || 'admin'}
                </span>
              </div>

              {/* Concepto / Descripción */}
              <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-950/70 border border-[#cec8bc] dark:border-slate-800 mt-2">
                <span className="font-bold block text-[10px] uppercase text-[#7d776f] mb-1">
                  Concepto / Justificación
                </span>
                <p className="text-[#4a4641] dark:text-slate-200 leading-relaxed">
                  {selectedMovimiento.descripcion}
                </p>
              </div>

              {/* Enlace y Previsualización del Comprobante Adjunto (CA5) */}
              {selectedMovimiento.comprobanteUrl && (
                <div className="mt-3 p-3.5 rounded-xl bg-white/80 dark:bg-slate-950/80 border border-[#cec8bc] dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] uppercase text-[#7d776f] flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      Comprobante de Respaldo Oficial
                    </span>
                    <a
                      href={selectedMovimiento.comprobanteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ver Comprobante</span>
                    </a>
                  </div>

                  {selectedMovimiento.comprobanteUrl.match(/\.(jpg|jpeg|png|webp)($|\?)/i) ||
                  selectedMovimiento.comprobanteUrl.startsWith('data:image/') ? (
                    <div className="rounded-xl overflow-hidden max-h-56 flex items-center justify-center bg-black/5 dark:bg-white/5 border border-[#cec8bc]/50 dark:border-slate-800">
                      <img
                        src={selectedMovimiento.comprobanteUrl}
                        alt="Comprobante adjunto"
                        className="object-contain max-h-56 w-auto"
                      />
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-[#dfd9ce]/60 dark:bg-slate-900 flex items-center justify-between text-xs font-mono text-[#5c5750] dark:text-slate-400">
                      <span className="truncate max-w-xs">{selectedMovimiento.comprobanteUrl}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Total */}
              <div
                className={`flex justify-between font-black text-base pt-3 border-t border-[#cec8bc] dark:border-slate-800 font-mono ${
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

      {/* MODAL GESTIÓN DE CATEGORÍAS (POST / PUT /api/v1/movimientos/categorias) */}
      {isCategoriasModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                  Gestión de Categorías Financieras
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoriasModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alertas de error y éxito de categorías */}
            {catModalError && (
              <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{catModalError}</span>
              </div>
            )}
            {catModalSuccess && (
              <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{catModalSuccess}</span>
              </div>
            )}

            {/* Formulario para Crear Nueva Categoría */}
            <form onSubmit={handleCrearCategoria} className="p-4 rounded-2xl bg-white/70 dark:bg-slate-950/70 border border-[#cec8bc] dark:border-slate-800 space-y-3">
              <span className="block text-xs font-bold uppercase tracking-wider text-[#383430] dark:text-slate-300">
                + Crear Nueva Categoría (Solo Administrador)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-4">
                  <select
                    value={newCatTipo}
                    onChange={(e) => setNewCatTipo(e.target.value as 'Ingreso' | 'Egreso')}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white cursor-pointer font-bold"
                  >
                    <option value="Egreso">Egreso / Gasto</option>
                    <option value="Ingreso">Ingreso Extraordinario</option>
                  </select>
                </div>
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    maxLength={80}
                    placeholder="Nombre de la categoría..."
                    value={newCatNombre}
                    onChange={(e) => setNewCatNombre(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    className="w-full py-2 px-3 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Listado y Edición de Categorías */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#5c5750] dark:text-slate-400">
                  Catálogo Existente ({categorias.length})
                </span>
                <div className="flex items-center gap-1">
                  {(['Todos', 'Ingreso', 'Egreso'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCatFiltroTipo(t)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        catFiltroTipo === t
                          ? 'bg-blue-700 text-white'
                          : 'bg-[#dfd9ce] dark:bg-slate-800 text-[#5c5750] dark:text-slate-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {categorias
                  .filter((c) => catFiltroTipo === 'Todos' || c.tipo === catFiltroTipo)
                  .map((cat) => {
                    const isEditing = editingCatId === cat.idCategoria
                    return (
                      <div
                        key={cat.idCategoria}
                        className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-950/60 border border-[#cec8bc]/70 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              cat.tipo === 'Ingreso'
                                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {cat.tipo}
                          </span>
                          {isEditing ? (
                            <input
                              type="text"
                              maxLength={80}
                              value={editingCatNombre}
                              onChange={(e) => setEditingCatNombre(e.target.value)}
                              autoFocus
                              className="w-full px-2 py-1 rounded-lg bg-[#dfd9ce] dark:bg-slate-900 border border-blue-600 text-xs font-semibold"
                            />
                          ) : (
                            <span className="font-semibold text-[#262422] dark:text-white truncate">
                              {cat.nombre}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditarCategoria(cat.idCategoria)}
                                className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Save className="w-3 h-3" />
                                <span>Guardar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCatId(null)}
                                className="p-1 rounded-lg hover:bg-[#dfd9ce] dark:hover:bg-slate-800 text-[#7d776f] cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCatId(cat.idCategoria)
                                setEditingCatNombre(cat.nombre)
                              }}
                              className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-100/60 dark:text-blue-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Editar nombre de categoría"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#cec8bc] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCategoriasModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-bold text-[#262422] dark:text-white cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ANULACIÓN CON MOTIVO */}
      {movimientoParaEliminar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                  Anular Movimiento Financiero
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMovimientoParaEliminar(null)
                  setDeleteModalError(null)
                  setMotivoEliminarInput('')
                }}
                className="text-[#7d776f] hover:text-[#262422] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deleteModalError && (
              <div className="p-3 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{deleteModalError}</span>
              </div>
            )}

            <p className="text-xs text-[#5c5750] dark:text-slate-300">
              ¿Está seguro de que desea anular el movimiento{' '}
              <strong className="text-[#262422] dark:text-white font-mono">{movimientoParaEliminar.codigo}</strong> por Bs.{' '}
              {movimientoParaEliminar.monto.toFixed(2)}? Esta acción se registrará con auditoría formal en la base de datos.
            </p>

            <form onSubmit={handleConfirmarEliminacion} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#262422] dark:text-white mb-1">
                  Motivo de la Anulación *
                </label>
                <textarea
                  required
                  rows={2}
                  value={motivoEliminarInput}
                  onChange={(e) => setMotivoEliminarInput(e.target.value)}
                  placeholder="Especifique el motivo obligatorio (ej. Error en monto, duplicado, cancelado)..."
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-600 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMovimientoParaEliminar(null)
                    setDeleteModalError(null)
                    setMotivoEliminarInput('')
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-bold text-[#262422] dark:text-white cursor-pointer hover:bg-[#cec8bc] dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isDeleting || !motivoEliminarInput.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isDeleting ? 'Anulando...' : 'Confirmar Anulación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
