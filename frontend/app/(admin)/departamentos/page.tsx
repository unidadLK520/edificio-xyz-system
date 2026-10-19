// frontend/app/(admin)/departamentos/page.tsx
// HU03: Módulo de Gestión de Unidades (Departamentos, Parqueos y Bauleras) y Catastro
// Modelo Edificio XYZ: 20 Departamentos (Tipos A, B y C), 20 Parqueos, 10 Bauleras

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Building2,
  Users,
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  Car,
  Box,
  Layers,
  Percent,
  CheckCircle2,
  UserCheck,
  KeyRound,
  AlertCircle,
  Sliders,
  Gauge
} from 'lucide-react'
import {
  UnidadItem,
  DepartamentoFormData,
  TipoUnidad,
  TipoDepartamentoItem
} from '@/components/departamentos/types'
import DepartamentosKpis from '@/components/departamentos/DepartamentosKpis'
import CrearDepartamentoModal from '@/components/departamentos/CrearDepartamentoModal'
import EditarDepartamentoModal from '@/components/departamentos/EditarDepartamentoModal'
import FichaTecnicaModal from '@/components/departamentos/FichaTecnicaModal'
import AsignarUnidadModal from '@/components/departamentos/AsignarUnidadModal'
import ParametrosDepartamentosTab from '@/components/departamentos/ParametrosDepartamentosTab'
import TiposDepartamentosTab from '@/components/departamentos/TiposDepartamentosTab'
import AguaDepartamentosTab from '@/components/departamentos/AguaDepartamentosTab'

export default function DepartamentosPage() {
  const [unidades, setUnidades] = useState<UnidadItem[]>([])
  const [activeTab, setActiveTab] = useState<'catastro' | 'tipos' | 'parametros' | 'agua'>('catastro')
  const [tiposDepto, setTiposDepto] = useState<TipoDepartamentoItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('Todos')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [filtroPiso, setFiltroPiso] = useState('Todos')

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedUnidad, setSelectedUnidad] = useState<UnidadItem | null>(null)
  const [unidadToEdit, setUnidadToEdit] = useState<UnidadItem | null>(null)
  const [unidadToAssign, setUnidadToAssign] = useState<UnidadItem | null>(null)
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Cargar tipos de departamentos desde la API
  const fetchTiposDepto = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/tipos-departamento')
      if (res.ok) {
        const json = await res.json()
        if (json.data && Array.isArray(json.data)) {
          const mapped: TipoDepartamentoItem[] = json.data.map((t: any) => ({
            id: String(t.idTipo),
            idTipo: t.idTipo,
            nombre: t.nombre,
            codigo: t.nombre.slice(0, 3).toUpperCase(),
            areaM2: t.areaM2 || 0,
            expensaBase: t.montoExpensa,
            montoExpensa: t.montoExpensa,
            activo: t.activo !== false,
            departamentosAsignados: t.departamentosAsignados || 0
          }))
          setTiposDepto(mapped)
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchTiposDepto()
  }, [fetchTiposDepto])

  // Manejadores para Tipos de Departamentos conectados a la API
  const handleSaveTipoDepto = async (tipoGuardado: TipoDepartamentoItem, cascada: boolean): Promise<string | null> => {
    try {
      const idNumerico = tipoGuardado.idTipo || (!isNaN(Number(tipoGuardado.id)) ? Number(tipoGuardado.id) : null)
      const isEdit = !!idNumerico

      const url = isEdit ? `/api/v1/tipos-departamento/${idNumerico}` : '/api/v1/tipos-departamento'
      const method = isEdit ? 'PUT' : 'POST'
      const payload: any = {
        nombre: tipoGuardado.nombre.trim(),
        montoExpensa: tipoGuardado.expensaBase,
        areaM2: tipoGuardado.areaM2 > 0 ? tipoGuardado.areaM2 : null,
        activo: tipoGuardado.activo !== false
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        const errorMsg = json.message || (res.status === 409 ? 'Conflicto: Ya existe un tipo con ese nombre o no se puede desactivar con unidades asignadas.' : 'Error al guardar el tipo de departamento')
        showToast(errorMsg)
        return errorMsg
      }

      await fetchTiposDepto()
      await fetchUnidades()
      showToast(`¡Tipo de departamento "${tipoGuardado.nombre}" guardado exitosamente!`)
      return null
    } catch (e: any) {
      const msg = 'Error de conexión al guardar tipo de departamento'
      showToast(msg)
      return msg
    }
  }

  const handleDeleteTipoDepto = async (id: string): Promise<string | null> => {
    try {
      const idNumerico = Number(id)
      if (isNaN(idNumerico)) {
        setTiposDepto((prev) => prev.filter((t) => t.id !== id))
        return null
      }

      const res = await fetch(`/api/v1/tipos-departamento/${idNumerico}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: false })
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg = json.message || 'No se puede desactivar el tipo de departamento'
        showToast(msg)
        return msg
      }

      await fetchTiposDepto()
      showToast('Tipo de departamento desactivado correctamente.')
      return null
    } catch {
      const msg = 'Error de conexión al desactivar tipo de departamento'
      showToast(msg)
      return msg
    }
  }

  const handleResetDefaultTipos = () => {
    fetchTiposDepto()
    showToast('Tipologías recargadas desde el servidor.')
  }

  const handleSincronizarUnidadesTipo = async (tipo: TipoDepartamentoItem) => {
    try {
      const idTipoNum = tipo.idTipo || Number(tipo.id)
      if (!idTipoNum || isNaN(idTipoNum)) {
        showToast('Tipo no válido para sincronización masiva')
        return
      }

      const deptosCoincidentes = unidades.filter((u) => {
        if (u.tipoUnidad !== 'Departamento') return false
        return (
          (u.tipologia && u.tipologia.toLowerCase().includes(tipo.nombre.toLowerCase())) ||
          (u.tipologia && tipo.codigo && u.tipologia.includes(tipo.codigo)) ||
          (u.areaM2 && tipo.areaM2 && Math.abs(u.areaM2 - tipo.areaM2) < 0.1)
        )
      })

      if (deptosCoincidentes.length === 0) {
        showToast(`No se encontraron departamentos para asociar a "${tipo.nombre}".`)
        return
      }

      const asignaciones = deptosCoincidentes.map((d) => ({
        idDepartamento: d.id,
        idTipo: idTipoNum
      }))

      const res = await fetch('/api/v1/departamentos/asignar-tipo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignaciones })
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        showToast(json.message || `Error al sincronizar departamentos con "${tipo.nombre}" (Código ${res.status})`)
        return
      }

      await fetchUnidades()
      await fetchTiposDepto()
      showToast(`¡${asignaciones.length} departamentos sincronizados y asignados a "${tipo.nombre}"!`)
    } catch {
      showToast('Error de conexión al sincronizar tipologías')
    }
  }

  const handleUpdateUnidadParametros = (updated: UnidadItem) => {
    setUnidades((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)))
  }

  const handleUpdateMultipleParametros = (updatedList: UnidadItem[]) => {
    const updatedMap = new Map(updatedList.map((u) => [u.id, u]))
    setUnidades((prev) => prev.map((u) => updatedMap.get(u.id) || u))
  }

  // Fetch unidades desde la API
  const fetchUnidades = useCallback(async () => {
    setIsLoading(true)
    setApiError(null)
    try {
      const res = await fetch(
        `/api/v1/unidades?tipo=${filtroTipo}&estado=${filtroEstado}&search=${encodeURIComponent(searchTerm)}`
      )
      if (!res.ok) {
        setApiError('Error al conectar con el servidor de unidades.')
        setUnidades([])
        return
      }
      const json = await res.json()
      if (json.data && Array.isArray(json.data)) {
        const mapped: UnidadItem[] = json.data.map((item: any) => ({
          id: item.id,
          tipoUnidad: item.tipoUnidad,
          numero: item.numero,
          piso: item.piso,
          areaM2: item.areaM2,
          tipologia:
            item.tipologia ||
            item.departamento?.tipo?.nombre ||
            (item.areaM2 === 60
              ? 'Tipo A (60 m²)'
              : item.areaM2 === 80
                ? 'Tipo B (80 m²)'
                : item.areaM2 === 100
                  ? 'Tipo C (100 m²)'
                  : undefined),
          estado: item.estado || 'Desocupado',
          parqueo: item.parqueos?.[0]?.numero || item.parqueo || 'Sin parqueo',
          baulera: item.bauleras?.[0]?.numero || item.baulera || 'Sin baulera',
          propietario: item.propietario
            ? {
                id: item.propietario.idPersona,
                nombre:
                  `${item.propietario.nombres || ''} ${item.propietario.apellidos || ''}`.trim() ||
                  item.propietario.nombre,
                ci: item.propietario.ciNit || item.propietario.ci,
                telefono: item.propietario.telefono,
                correo: item.propietario.correo
              }
            : null,
          inquilinoActual: item.inquilinoActual || null,
          persona: item.persona,
          departamento: item.departamento,
          fechaRegistro: item.fechaRegistro || '2023-01-01'
        }))
        setUnidades(mapped)
      } else {
        setUnidades([])
      }
    } catch {
      setApiError('Error de red al conectar con el servidor de unidades.')
      setUnidades([])
    } finally {
      setIsLoading(false)
    }
  }, [filtroTipo, filtroEstado, searchTerm])

  useEffect(() => {
    fetchUnidades()
  }, [fetchUnidades])

  const totalAreaConstruida = useMemo(() => {
    return unidades
      .filter((u) => u.tipoUnidad === 'Departamento')
      .reduce((acc, d) => acc + (d.areaM2 || 0), 0)
  }, [unidades])

  // Filtrado reactivo
  const unidadesFiltradas = useMemo(() => {
    return unidades.filter((u) => {
      const searchLower = searchTerm.toLowerCase()
      const matchSearch =
        u.numero.toLowerCase().includes(searchLower) ||
        (u.propietario &&
          (u.propietario.nombre.toLowerCase().includes(searchLower) ||
            u.propietario.ci.toLowerCase().includes(searchLower))) ||
        (u.inquilinoActual && u.inquilinoActual.nombre.toLowerCase().includes(searchLower))

      const matchTipo = filtroTipo === 'Todos' || u.tipoUnidad === filtroTipo
      const matchEstado = filtroEstado === 'Todos' || u.estado === filtroEstado
      const matchPiso = filtroPiso === 'Todos' || u.piso === Number(filtroPiso)

      return matchSearch && matchTipo && matchEstado && matchPiso
    })
  }, [unidades, searchTerm, filtroTipo, filtroEstado, filtroPiso])

  // KPIs reales del modelo (20 unidades)
  const deptos = unidades.filter((u) => u.tipoUnidad === 'Departamento')
  const totalDeptos = deptos.length
  const ocupadosPropietario = deptos.filter((u) => u.estado === 'Ocupado por Propietario').length
  const alquilados = deptos.filter((u) => u.estado === 'Alquilado').length
  const desocupados = deptos.filter(
    (u) => u.estado === 'Desocupado' || u.estado === 'Disponible'
  ).length
  const conParqueo = deptos.filter((u) => u.parqueo !== 'Sin parqueo').length

  const showToast = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 4000)
  }

  const handleCreateSubmit = async (formData: DepartamentoFormData) => {
    setCreateErrorMessage(null)

    const payload = {
      tipoUnidad: formData.tipoUnidad || 'Departamento',
      numero: formData.numero.trim(),
      piso: formData.piso ? Number(formData.piso) : undefined,
      areaM2: formData.areaM2 ? Number(formData.areaM2) : undefined,
      estado: formData.estado
    }

    try {
      const res = await fetch('/api/v1/unidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      if (!res.ok) {
        if (res.status === 409 || json.message?.includes('utilizado')) {
          setCreateErrorMessage('El identificador ya se encuentra utilizado')
        } else {
          setCreateErrorMessage(json.message || 'Error al registrar unidad')
        }
        return
      }

      await fetchUnidades()
      setIsCreateModalOpen(false)
      showToast(`¡Unidad ${payload.tipoUnidad} ${payload.numero} registrada exitosamente!`)
    } catch {
      setCreateErrorMessage('Error de conexión al servidor')
    }
  }

  const handleEditSubmit = async (formData: DepartamentoFormData) => {
    if (!unidadToEdit) return

    // Actualizar estado local y parámetros inmediatamente
    const updatedUnidad: UnidadItem = {
      ...unidadToEdit,
      numero: formData.numero,
      piso: formData.piso,
      areaM2: formData.areaM2,
      tipologia: formData.tipologia || unidadToEdit.tipologia,
      expensaBase: formData.expensaBase ?? unidadToEdit.expensaBase,
      estado: formData.estado
    }
    handleUpdateUnidadParametros(updatedUnidad)

    // Si es departamento y cambió tipología, asignar tipo en backend (PUT /api/v1/departamentos/:id/tipo)
    if (unidadToEdit.tipoUnidad === 'Departamento' && formData.tipologia) {
      const tipoSel = tiposDepto.find((t) => t.nombre === formData.tipologia)
      const idTipoNum = tipoSel?.idTipo || (tipoSel ? Number(tipoSel.id) : null)
      if (idTipoNum && !isNaN(idTipoNum)) {
        try {
          const resTipo = await fetch(`/api/v1/departamentos/${unidadToEdit.id}/tipo`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idTipo: idTipoNum })
          })
          if (!resTipo.ok) {
            const errJson = await resTipo.json().catch(() => ({}))
            showToast(errJson.message || `Error 422: No se pudo asignar el tipo al departamento`)
          }
        } catch {}
      }
    }

    try {
      const tipoUnidadParam = unidadToEdit.tipoUnidad || 'Departamento'
      const res = await fetch(`/api/v1/unidades/${tipoUnidadParam}/${unidadToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: formData.numero,
          piso: formData.piso !== undefined ? Number(formData.piso) : undefined,
          areaM2: formData.areaM2 !== undefined ? Number(formData.areaM2) : undefined,
          estado: formData.estado
        })
      })

      if (res.ok) {
        await fetchUnidades()
      }
    } catch {}

    setIsEditModalOpen(false)
    setUnidadToEdit(null)
    showToast(`¡Unidad ${formData.numero} actualizada correctamente!`)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast de confirmación */}
      {successToast && (
        <div className="p-4 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl flex items-center gap-3 shadow-md animate-in fade-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{successToast}</span>
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
            onClick={() => fetchUnidades()}
            className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-400 text-xs font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Catastro de Departamentos & Unidades
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Unidades, Propietarios e Inquilinos
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Catastro del Edificio XYZ ({totalDeptos} departamentos). Todas las unidades generan
            expensas sin importar si están ocupadas o vacías.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-rose-800/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Registrar Nueva Unidad
        </button>
      </div>

      {/* PESTAÑAS PRINCIPALES: CATASTRO VS PARÁMETROS Y MEDIDORES */}
      <div className="flex items-center gap-2 border-b border-[#cec8bc] dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('catastro')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'catastro'
              ? 'bg-rose-700 text-white shadow-md shadow-rose-900/20'
              : 'bg-[#ede9e1] dark:bg-slate-900 text-[#66615b] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white border border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Catastro de Unidades</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-white/20 dark:bg-white/10">
            {totalDeptos}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tipos')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'tipos'
              ? 'bg-rose-700 text-white shadow-md shadow-rose-900/20'
              : 'bg-[#ede9e1] dark:bg-slate-900 text-[#66615b] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white border border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-500" />
          <span>Tipos de Departamentos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('agua')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'agua'
              ? 'bg-rose-700 text-white shadow-md shadow-rose-900/20'
              : 'bg-[#ede9e1] dark:bg-slate-900 text-[#66615b] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white border border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-500" />
          <span>Consumo de Agua (Bs)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('parametros')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'parametros'
              ? 'bg-rose-700 text-white shadow-md shadow-rose-900/20'
              : 'bg-[#ede9e1] dark:bg-slate-900 text-[#66615b] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white border border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-500" />
          <span>Reglas & Mora</span>
        </button>
      </div>

      {activeTab === 'catastro' ? (
        <>
          {/* KPIS DE OCUPACIÓN REAL */}
          <DepartamentosKpis
            totalDeptos={totalDeptos}
            ocupadosPropietario={ocupadosPropietario}
            alquilados={alquilados}
            desocupados={desocupados}
            conParqueo={conParqueo}
            totalAreaConstruida={totalAreaConstruida}
          />

          {/* BUSCADOR Y FILTROS */}
          <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por número, propietario o inquilino..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] focus:outline-none focus:ring-2 focus:ring-rose-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro Estado de Ocupación */}
              <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
                <Filter className="w-3.5 h-3.5 text-[#7d776f]" />
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
                >
                  <option value="Todos">Ocupación: Todas</option>
                  <option value="Ocupado por Propietario">Ocupado por Dueño</option>
                  <option value="Alquilado">Alquilado a Inquilino</option>
                  <option value="Desocupado">Desocupado / Vacío</option>
                </select>
              </div>

              {/* Filtro Piso */}
              <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
                <Layers className="w-3.5 h-3.5 text-[#7d776f]" />
                <select
                  value={filtroPiso}
                  onChange={(e) => setFiltroPiso(e.target.value)}
                  className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
                >
                  <option value="Todos">Piso: Todos</option>
                  <option value="1">Piso 1</option>
                  <option value="2">Piso 2</option>
                  <option value="3">Piso 3</option>
                  <option value="4">Piso 4</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLA CATASTRAL DE UNIDADES */}
          <div className="rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/60 dark:bg-slate-950/60 text-[#7d776f] dark:text-slate-400 uppercase text-[11px] font-bold">
                    <th className="py-3 px-4">Unidad / Tipología</th>
                    <th className="py-3 px-4">Propietario Responsable</th>
                    <th className="py-3 px-4">Ocupante / Inquilino</th>
                    <th className="py-3 px-4">Superficie</th>
                    <th className="py-3 px-4">Parqueo / Baulera</th>
                    <th className="py-3 px-4">Estado Ocupación</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cec8bc] dark:divide-slate-800">
                  {unidadesFiltradas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-[#7d776f] dark:text-slate-500"
                      >
                        No se encontraron departamentos con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    unidadesFiltradas.map((unidad) => (
                      <tr
                        key={unidad.id}
                        className="hover:bg-[#dfd9ce]/40 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-[#262422] dark:text-white flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" />
                            <span>Dpto. {unidad.numero}</span>
                          </div>
                          <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                            {unidad.tipologia ||
                              (unidad.areaM2 === 60
                                ? 'Tipo A (60 m²)'
                                : unidad.areaM2 === 80
                                  ? 'Tipo B (80 m²)'
                                  : 'Tipo C (100 m²)')}{' '}
                            • Piso {unidad.piso || '-'}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {unidad.propietario ? (
                            <div>
                              <div className="font-bold text-[#262422] dark:text-white flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                {unidad.propietario.nombre}
                              </div>
                              <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                                CI: {unidad.propietario.ci}
                              </div>
                            </div>
                          ) : (
                            <span className="text-amber-700 dark:text-amber-400 italic text-xs">
                              Sin Propietario Asignado
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {unidad.estado === 'Alquilado' && unidad.inquilinoActual ? (
                            <div>
                              <div className="font-bold text-[#262422] dark:text-white flex items-center gap-1">
                                <KeyRound className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                {unidad.inquilinoActual.nombre}
                              </div>
                              <span className="text-[10px] px-2 py-0.2 rounded-md bg-purple-100 text-purple-800 font-bold">
                                Inquilino (Contrato Privado)
                              </span>
                            </div>
                          ) : unidad.estado === 'Ocupado por Propietario' ? (
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                              Vive el Propietario
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#7d776f] dark:text-slate-400 italic">
                              Desocupado / Vacío
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-[#262422] dark:text-white font-mono">
                            {unidad.areaM2 ? `${unidad.areaM2} m²` : '—'}
                          </div>
                          {unidad.tipologia && (
                            <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                              {unidad.tipologia}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-xs text-[#262422] dark:text-white flex items-center gap-1">
                            <Car className="w-3.5 h-3.5 text-[#7d776f]" />
                            <span>{unidad.parqueo || 'Sin parqueo'}</span>
                          </div>
                          <div className="text-[11px] text-[#7d776f] dark:text-slate-400 flex items-center gap-1">
                            <Box className="w-3.5 h-3.5 text-[#7d776f]" />
                            <span>{unidad.baulera || 'Sin baulera'}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              unidad.estado === 'Ocupado por Propietario'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300'
                                : unidad.estado === 'Alquilado'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300'
                            }`}
                          >
                            {unidad.estado}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedUnidad(unidad)}
                              className="px-2 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Ver Ficha y Extracto de Expensa"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Extracto
                            </button>
                            <button
                              onClick={() => {
                                setUnidadToEdit(unidad)
                                setIsEditModalOpen(true)
                              }}
                              className="p-1.5 rounded-lg text-[#5c5750] hover:text-[#262422] hover:bg-[#ded8cc] dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
                              title="Editar Unidad"
                            >
                              <Edit className="w-4 h-4" />
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
      ) : activeTab === 'tipos' ? (
        <TiposDepartamentosTab
          tipos={tiposDepto}
          unidades={unidades}
          onSaveTipo={handleSaveTipoDepto}
          onDeleteTipo={handleDeleteTipoDepto}
          onResetDefaults={handleResetDefaultTipos}
          onSincronizarUnidadesTipo={handleSincronizarUnidadesTipo}
          showToast={showToast}
        />
      ) : activeTab === 'agua' ? (
        <AguaDepartamentosTab
          unidades={unidades}
          showToast={showToast}
        />
      ) : (
        <ParametrosDepartamentosTab
          unidades={unidades}
          onUpdateUnidad={handleUpdateUnidadParametros}
          onUpdateMultiple={handleUpdateMultipleParametros}
          showToast={showToast}
        />
      )}

      {/* MODAL CREAR DEPARTAMENTO */}
      <CrearDepartamentoModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        totalAreaConstruida={totalAreaConstruida}
        errorMessage={createErrorMessage}
        tiposDisponibles={tiposDepto}
      />

      {/* MODAL EDITAR DEPARTAMENTO */}
      {unidadToEdit && (
        <EditarDepartamentoModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setUnidadToEdit(null)
          }}
          depto={unidadToEdit}
          onChange={(updated) => setUnidadToEdit(updated)}
          tiposDisponibles={tiposDepto}
          onUpdate={async (updated) => {
            await handleEditSubmit({
              numero: updated.numero,
              piso: updated.piso || 1,
              areaM2: updated.areaM2 || 0,
              tipologia: updated.tipologia,
              expensaBase: updated.expensaBase,
              estado: updated.estado,
              parqueo: updated.parqueo,
              baulera: updated.baulera
            })
          }}
        />
      )}

      {/* MODAL FICHA TÉCNICA */}
      {selectedUnidad && (
        <FichaTecnicaModal
          isOpen={!!selectedUnidad}
          depto={selectedUnidad}
          onClose={() => setSelectedUnidad(null)}
        />
      )}

      {/* MODAL ASIGNAR RESIDENTE / UNIDAD */}
      <AsignarUnidadModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false)
          setUnidadToAssign(null)
        }}
        onSuccess={async () => {
          await fetchUnidades()
          showToast('¡Asignación actualizada correctamente!')
        }}
        unidad={unidadToAssign}
      />
    </div>
  )
}
