// frontend/app/(admin)/egresos/hooks/useEgresos.ts
// Custom hook for Egresos/Ingresos data management

import { useState, useEffect, useMemo, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { fechaSolo } from '@/lib/fecha'
import type { MovimientoItem, CategoriaItem, ResumenData, MovimientoFormData, TabTipo, FiltroPeriodo } from '../types'

const DEFAULT_CATEGORIAS: CategoriaItem[] = [
  { idCategoria: 1, nombre: 'Mantenimiento y Reparaciones', tipo: 'Egreso' },
  { idCategoria: 2, nombre: 'Servicios Básicos Comunes (Luz/Agua)', tipo: 'Egreso' },
  { idCategoria: 3, nombre: 'Seguridad y Vigilancia', tipo: 'Egreso' },
  { idCategoria: 4, nombre: 'Limpieza y Desinfección', tipo: 'Egreso' },
  { idCategoria: 5, nombre: 'Administrativo y Operativo', tipo: 'Egreso' },
  { idCategoria: 6, nombre: 'Cobro de Expensas Ordinarias', tipo: 'Ingreso' },
  { idCategoria: 7, nombre: 'Fondo de Reserva / Cuota Extraordinaria', tipo: 'Ingreso' },
  { idCategoria: 8, nombre: 'Multas y Penalidades Reglamentarias', tipo: 'Ingreso' },
  { idCategoria: 9, nombre: 'Intereses y Rendimientos', tipo: 'Ingreso' }
]

export function useEgresos() {
  // Main state
  const [movimientos, setMovimientos] = useState<MovimientoItem[]>([])
  const [categorias, setCategorias] = useState<CategoriaItem[]>(DEFAULT_CATEGORIAS)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // User role
  const [userRole, setUserRole] = useState('ADMINISTRADOR')

  // Filters
  const [tabTipo, setTabTipo] = useState<TabTipo>('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('Todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>('todos')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCategoriasModalOpen, setIsCategoriasModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedMovimiento, setSelectedMovimiento] = useState<MovimientoItem | null>(null)
  const [movimientoParaEditar, setMovimientoParaEditar] = useState<MovimientoItem | null>(null)
  const [movimientoParaEliminar, setMovimientoParaEliminar] = useState<MovimientoItem | null>(null)

  // Modal errors
  const [createModalError, setCreateModalError] = useState<string | null>(null)
  const [editModalError, setEditModalError] = useState<string | null>(null)
  const [catModalError, setCatModalError] = useState<string | null>(null)
  const [catModalSuccess, setCatModalSuccess] = useState<string | null>(null)
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null)
  const [motivoEliminarInput, setMotivoEliminarInput] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // Resumen
  const [resumenData, setResumenData] = useState<ResumenData | null>(null)

  // Form state
  const [formData, setFormData] = useState<MovimientoFormData>({
    tipo: 'Egreso',
    idCategoria: 1,
    tercero: '',
    descripcion: '',
    monto: 0,
    fecha: fechaSolo(new Date()),
    nroFactura: '',
    metodoPago: '',
    comprobanteUrl: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileNameAttached, setFileNameAttached] = useState('')

  // Categories management
  const [newCatNombre, setNewCatNombre] = useState('')
  const [newCatTipo, setNewCatTipo] = useState<'Ingreso' | 'Egreso'>('Egreso')
  const [editingCatId, setEditingCatId] = useState<number | null>(null)
  const [editingCatNombre, setEditingCatNombre] = useState('')
  const [catFiltroTipo, setCatFiltroTipo] = useState<'Todos' | 'Ingreso' | 'Egreso'>('Todos')

  const hasFinancialPermission =
    userRole === 'ADMINISTRADOR' ||
    userRole === 'SUPERADMIN' ||
    userRole === 'ADMIN'

  // Load user role and URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('user_role') || 'ADMINISTRADOR'
      setUserRole(storedRole.toUpperCase())
      const urlParams = new URLSearchParams(window.location.search)
      const tipoParam = urlParams.get('tipo')
      if (tipoParam === 'Ingreso' || tipoParam === 'Egreso') {
        setTabTipo(tipoParam)
      }
    }
  }, [])

  // Fetch categories
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
      // Use default categories
    }
  }, [])

  // Fetch resumen
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
      // Client-side calculation fallback
    }
  }, [filtroCategoria, fechaDesde, fechaHasta])

  // Fetch movimientos
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
      params.append('limit', '500')

      const res = await apiFetch(`/api/v1/movimientos?${params.toString()}`)
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
              `${item.tipo === 'Ingreso' ? 'ING' : 'EGR'}-2026-${String(item.idMovimiento || item.id || 1).padStart(3, '0')}`,
            fecha: fechaSolo(item.fecha) || fechaSolo(new Date()),
            idCategoria: catId,
            categoria: catName,
            tercero: tercero || '',
            descripcion: descripcionClean || 'Sin descripción',
            nroFactura: item.nroFactura ?? item.nro_factura ?? '',
            comprobanteUrl: item.comprobanteUrl || null,
            monto: Number(item.monto || 0),
            metodoPago: item.metodoPago ?? item.metodo_pago ?? '',
            registradoPor: item.usuarioRegistro?.nombreUsuario || 'admin',
            anulado: Boolean(item.anulado),
            motivoAnulacion: item.motivoAnulacion || null,
            idPago: item.idPago ? Number(item.idPago) : item.id_pago ? Number(item.id_pago) : null
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

  useEffect(() => { fetchCategorias() }, [fetchCategorias])
  useEffect(() => { fetchMovimientos(); fetchResumen() }, [fetchMovimientos, fetchResumen])

  // Date filter sync
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

  // Filtered movements
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

  // Calculations
  const totalIngresos = useMemo(() => {
    if (tabTipo === 'Egreso') return 0
    if (resumenData !== null && !searchTerm.trim()) return resumenData.totalIngresos
    return movimientosFiltrados.filter((m) => m.tipo === 'Ingreso' && !m.anulado).reduce((acc, c) => acc + c.monto, 0)
  }, [resumenData, searchTerm, tabTipo, movimientosFiltrados])

  const totalEgresos = useMemo(() => {
    if (tabTipo === 'Ingreso') return 0
    if (resumenData !== null && !searchTerm.trim()) return resumenData.totalEgresos
    return movimientosFiltrados.filter((m) => m.tipo === 'Egreso' && !m.anulado).reduce((acc, c) => acc + c.monto, 0)
  }, [resumenData, searchTerm, tabTipo, movimientosFiltrados])

  const balanceNeto = useMemo(() => totalIngresos - totalEgresos, [totalIngresos, totalEgresos])

  const cantidadIngresos = useMemo(() => {
    if (tabTipo === 'Egreso') return 0
    if (resumenData !== null && !searchTerm.trim()) return resumenData.cantidadIngresos
    return movimientosFiltrados.filter((m) => m.tipo === 'Ingreso' && !m.anulado).length
  }, [resumenData, searchTerm, tabTipo, movimientosFiltrados])

  const cantidadEgresos = useMemo(() => {
    if (tabTipo === 'Ingreso') return 0
    if (resumenData !== null && !searchTerm.trim()) return resumenData.cantidadEgresos
    return movimientosFiltrados.filter((m) => m.tipo === 'Egreso' && !m.anulado).length
  }, [resumenData, searchTerm, tabTipo, movimientosFiltrados])

  const categoriasParaModal = useMemo(() => {
    return categorias.filter((c) => c.tipo === formData.tipo)
  }, [categorias, formData.tipo])

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setFileNameAttached(file.name)
    if (!formData.nroFactura) {
      setFormData(prev => ({ ...prev, nroFactura: `DOC-${file.name.slice(0, 15)}` }))
    }
  }

  // Upload file to server
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
      body: JSON.stringify({ archivoBase64: base64Data, nombreArchivo: file.name })
    })

    const uploadData = await uploadRes.json().catch(() => ({}))
    if (!uploadRes.ok) {
      throw new Error(uploadData.message || uploadData.error || 'Error al subir el comprobante')
    }
    return uploadData.comprobanteUrl || ''
  }

  // Modal handlers
  const handleOpenCreateModal = (tipoInicial: 'Ingreso' | 'Egreso') => {
    if (!hasFinancialPermission) return
    setFormData({
      tipo: tipoInicial,
      idCategoria: tipoInicial === 'Ingreso' ? 6 : 1,
      tercero: '', descripcion: '', monto: 0, fecha: fechaSolo(new Date()),
      nroFactura: '', metodoPago: '', comprobanteUrl: ''
    })
    setSelectedFile(null)
    setFileNameAttached('')
    setCreateModalError(null)
    setIsCreateModalOpen(true)
  }

  const handleOpenEditModal = (mov: MovimientoItem) => {
    if (!hasFinancialPermission) return
    setMovimientoParaEditar(mov)
    setFormData({
      tipo: mov.tipo, idCategoria: mov.idCategoria, tercero: mov.tercero || '',
      descripcion: mov.descripcion || '', monto: mov.monto, fecha: mov.fecha,
      nroFactura: mov.nroFactura || '', metodoPago: mov.metodoPago || '',
      comprobanteUrl: mov.comprobanteUrl || ''
    })
    setSelectedFile(null)
    setFileNameAttached(mov.comprobanteUrl ? 'Comprobante digital adjunto' : '')
    setEditModalError(null)
    setIsEditModalOpen(true)
  }

  // CRUD operations
  const handleCrearMovimiento = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault()
    setCreateModalError(null)
    if (!hasFinancialPermission) { setCreateModalError('Operación impedida: Permisos insuficientes.'); return false }
    if (!formData.fecha) { setCreateModalError('La fecha del movimiento es estrictamente obligatoria.'); return false }
    if (!formData.descripcion.trim()) { setCreateModalError('La descripción o concepto es estrictamente obligatoria.'); return false }
    if (formData.monto <= 0) { setCreateModalError('El monto debe ser un valor numérico mayor a cero.'); return false }

    setIsSubmitting(true)
    try {
      let finalComprobanteUrl = formData.comprobanteUrl.trim() || undefined
      if (selectedFile) {
        finalComprobanteUrl = await uploadArchivoComprobante(selectedFile)
      }

      const res = await apiFetch('/api/v1/movimientos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: formData.tipo, idCategoria: formData.idCategoria, monto: Number(formData.monto),
          fecha: formData.fecha ? new Date(formData.fecha).toISOString() : new Date().toISOString(),
          descripcion: formData.descripcion.trim(), tercero: formData.tercero.trim() || undefined,
          nroFactura: formData.nroFactura.trim() || undefined, metodoPago: formData.metodoPago.trim() || undefined,
          comprobanteUrl: finalComprobanteUrl
        })
      })

      if (res.ok) {
        setIsCreateModalOpen(false)
        await fetchMovimientos(); await fetchResumen()
        return true
      } else {
        const errorJson = await res.json().catch(() => ({}))
        setCreateModalError(errorJson.message || errorJson.error || 'Error al procesar el registro.')
        return false
      }
    } catch (err: any) {
      setCreateModalError(err?.message || 'Ocurrió un error al procesar el registro.')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGuardarEdicion = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault()
    setEditModalError(null)
    if (!movimientoParaEditar) return false
    if (!hasFinancialPermission) { setEditModalError('Operación impedida: Permisos insuficientes.'); return false }
    if (!formData.fecha) { setEditModalError('La fecha del movimiento es estrictamente obligatoria.'); return false }
    if (!formData.descripcion.trim()) { setEditModalError('La descripción o concepto es estrictamente obligatoria.'); return false }
    if (formData.monto <= 0) { setEditModalError('El monto debe ser un valor numérico mayor a cero.'); return false }

    setIsSubmitting(true)
    try {
      let finalComprobanteUrl = formData.comprobanteUrl.trim() || undefined
      if (selectedFile) {
        finalComprobanteUrl = await uploadArchivoComprobante(selectedFile)
      }

      const res = await apiFetch(`/api/v1/movimientos/${movimientoParaEditar.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: formData.tipo, idCategoria: formData.idCategoria, monto: Number(formData.monto),
          fecha: formData.fecha ? new Date(formData.fecha).toISOString() : new Date().toISOString(),
          descripcion: formData.descripcion.trim(), tercero: formData.tercero.trim() || undefined,
          nroFactura: formData.nroFactura.trim() || undefined, metodoPago: formData.metodoPago.trim() || undefined,
          comprobanteUrl: finalComprobanteUrl
        })
      })

      if (res.ok) {
        setIsEditModalOpen(false)
        setMovimientoParaEditar(null)
        await fetchMovimientos(); await fetchResumen()
        return true
      } else {
        const errorJson = await res.json().catch(() => ({}))
        setEditModalError(errorJson.message || errorJson.error || 'Error al actualizar el registro financiero.')
        return false
      }
    } catch (err: any) {
      setEditModalError(err?.message || 'Error al guardar los cambios.')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmarEliminacion = async (): Promise<boolean> => {
    if (!movimientoParaEliminar) return false
    if (!hasFinancialPermission) { setDeleteModalError('Acceso denegado: No posee permisos para anular movimientos.'); return false }
    if (!motivoEliminarInput.trim()) { setDeleteModalError('El motivo de la anulación es obligatorio.'); return false }

    setIsDeleting(true)
    setDeleteModalError(null)
    try {
      const res = await apiFetch(`/api/v1/movimientos/${movimientoParaEliminar.id}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoEliminarInput.trim() })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMovimientoParaEliminar(null)
        setMotivoEliminarInput('')
        await fetchMovimientos(); await fetchResumen()
        return true
      } else {
        setDeleteModalError(data.message || data.error || 'Error al anular movimiento.')
        return false
      }
    } catch (err: any) {
      setDeleteModalError(err?.message || 'No se pudo eliminar el registro.')
      return false
    } finally {
      setIsDeleting(false)
    }
  }

  // Categories CRUD
  const handleCrearCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    setCatModalError(null); setCatModalSuccess(null)
    if (!newCatNombre.trim()) { setCatModalError('El nombre de la categoría es obligatorio.'); return }
    try {
      const res = await apiFetch('/api/v1/movimientos/categorias', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: newCatNombre.trim(), tipo: newCatTipo })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setCatModalSuccess(`Categoría "${newCatNombre.trim()}" creada exitosamente.`)
        setNewCatNombre('')
        await fetchCategorias()
      } else {
        setCatModalError(data.message || data.error || 'Error al crear categoría')
      }
    } catch (err: any) {
      setCatModalError(err?.message || 'Error de conexión al crear categoría')
    }
  }

  const handleEditarCategoria = async (idCat: number) => {
    setCatModalError(null); setCatModalSuccess(null)
    if (!editingCatNombre.trim()) { setCatModalError('El nombre no puede estar vacío.'); return }
    try {
      const res = await apiFetch(`/api/v1/movimientos/categorias/${idCat}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: editingCatNombre.trim() })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setCatModalSuccess('Categoría actualizada correctamente.')
        setEditingCatId(null); setEditingCatNombre('')
        await fetchCategorias()
      } else {
        setCatModalError(data.message || data.error || 'Error al actualizar categoría')
      }
    } catch (err: any) {
      setCatModalError(err?.message || 'Error de conexión al modificar categoría')
    }
  }

  return {
    // Data
    movimientos, movimientosFiltrados, categorias, loading, apiError, resumenData,
    // Filters
    tabTipo, setTabTipo, searchTerm, setSearchTerm, filtroCategoria, setFiltroCategoria,
    filtroPeriodo, setFiltroPeriodo, fechaDesde, setFechaDesde, fechaHasta, setFechaHasta,
    // Totals
    totalIngresos, totalEgresos, balanceNeto, cantidadIngresos, cantidadEgresos,
    // User
    userRole, hasFinancialPermission,
    // Modals
    isCreateModalOpen, setIsCreateModalOpen, isEditModalOpen, setIsEditModalOpen,
    isCategoriasModalOpen, setIsCategoriasModalOpen, isDetailModalOpen, setIsDetailModalOpen,
    selectedMovimiento, setSelectedMovimiento, movimientoParaEditar, setMovimientoParaEditar,
    movimientoParaEliminar, setMovimientoParaEliminar,
    // Modal errors
    createModalError, setCreateModalError, editModalError, setEditModalError,
    catModalError, setCatModalError, catModalSuccess, setCatModalSuccess,
    deleteModalError, setDeleteModalError, motivoEliminarInput, setMotivoEliminarInput, isDeleting,
    // Form
    formData, setFormData, selectedFile, fileNameAttached, handleFileUpload,
    isSubmitting,
    // Categories management
    newCatNombre, setNewCatNombre, newCatTipo, setNewCatTipo,
    editingCatId, setEditingCatId, editingCatNombre, setEditingCatNombre,
    catFiltroTipo, setCatFiltroTipo,
    // Actions
    fetchMovimientos, fetchResumen, fetchCategorias,
    handleOpenCreateModal, handleOpenEditModal, handleCrearMovimiento,
    handleGuardarEdicion, handleConfirmarEliminacion,
    handleCrearCategoria, handleEditarCategoria,
    categoriasParaModal
  }
}
