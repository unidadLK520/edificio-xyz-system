// frontend/app/(admin)/departamentos/page.tsx
// HU03: Módulo de Gestión de Unidades (Departamentos, Parqueos y Bauleras) y Catastro
// Modelo Edificio XYZ: 20 Departamentos (Tipos A, B y C), 20 Parqueos, 10 Bauleras (50 unidades totales)

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
  CheckCircle2,
  UserCheck,
  KeyRound,
  AlertCircle,
  Sliders,
  LockOpen,
  Link2
} from 'lucide-react'
import {
  UnidadItem,
  DepartamentoFormData,
  TipoUnidad,
  TipoDepartamentoItem
} from '@/components/departamentos/types'
import DepartamentosKpis from '@/components/departamentos/DepartamentosKpis'
import CrearDepartamentoModal from '@/components/departamentos/CrearDepartamentoModal'
import EditarDepartamentoModal, { AssignmentsChangeData } from '@/components/departamentos/EditarDepartamentoModal'
import FichaTecnicaModal from '@/components/departamentos/FichaTecnicaModal'
import AsignarUnidadModal from '@/components/departamentos/AsignarUnidadModal'
import ParametrosDepartamentosTab from '@/components/departamentos/ParametrosDepartamentosTab'
import TiposDepartamentosTab from '@/components/departamentos/TiposDepartamentosTab'
import AguaDepartamentosTab from '@/components/departamentos/AguaDepartamentosTab'
import { apiFetch } from '@/lib/api'

export default function DepartamentosPage() {
  const [unidades, setUnidades] = useState<UnidadItem[]>([])
  const [activeTab, setActiveTab] = useState<'catastro' | 'tipos' | 'parametros' | 'agua'>('catastro')
  const [subTipoCatastro, setSubTipoCatastro] = useState<'Departamentos' | 'Parqueos' | 'Bauleras' | 'Todos'>('Departamentos')
  
  const [tiposDepto, setTiposDepto] = useState<TipoDepartamentoItem[]>([])
  const [personasList, setPersonasList] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
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
      const res = await apiFetch('/api/v1/tipos-departamento')
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

  // Cargar lista de personas para las asignaciones
  const fetchPersonas = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/personas?limit=100')
      if (res.ok) {
        const json = await res.json()
        if (json.data && Array.isArray(json.data)) {
          setPersonasList(json.data)
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchTiposDepto()
    fetchPersonas()
  }, [fetchTiposDepto, fetchPersonas])

  // Manejadores para Tipos de Departamentos conectados a la API
  const handleSaveTipoDepto = async (
    tipoGuardado: TipoDepartamentoItem,
    cascada: boolean
  ): Promise<string | null> => {
    try {
      const idNumerico =
        tipoGuardado.idTipo || (!isNaN(Number(tipoGuardado.id)) ? Number(tipoGuardado.id) : null)
      const isEdit = !!idNumerico

      const url = isEdit ? `/api/v1/tipos-departamento/${idNumerico}` : '/api/v1/tipos-departamento'
      const method = isEdit ? 'PUT' : 'POST'
      const payload: any = {
        nombre: tipoGuardado.nombre.trim(),
        montoExpensa: tipoGuardado.expensaBase,
        areaM2: tipoGuardado.areaM2 > 0 ? tipoGuardado.areaM2 : null,
        activo: tipoGuardado.activo !== false
      }

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        const errorMsg =
          json.message ||
          (res.status === 409
            ? 'Conflicto: Ya existe un tipo con ese nombre o no se puede desactivar con unidades asignadas.'
            : 'Error al guardar el tipo de departamento')
        showToast(errorMsg)
        return errorMsg
      }

      await fetchTiposDepto()
      await fetchUnidades()
      showToast(`¡Tipo de departamento "${tipoGuardado.nombre}" guardado exitosamente!`)
      return null
    } catch (e: any) {
      const msg = e?.message || 'Error de conexión al guardar tipo de departamento'
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

      const res = await apiFetch(`/api/v1/tipos-departamento/${idNumerico}`, {
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

      const res = await apiFetch('/api/v1/departamentos/asignar-tipo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignaciones })
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        showToast(
          json.message ||
            `Error al sincronizar departamentos con "${tipo.nombre}" (Código ${res.status})`
        )
        return
      }

      await fetchUnidades()
      await fetchTiposDepto()
      showToast(
        `¡${asignaciones.length} departamentos sincronizados y asignados a "${tipo.nombre}"!`
      )
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

  // Fetch unidades desde la API (obtiene todas las 50 unidades del edificio: 20 deptos, 20 parqueos, 10 bauleras)
  const fetchUnidades = useCallback(async () => {
    setIsLoading(true)
    setApiError(null)
    try {
      const res = await apiFetch('/api/v1/unidades?tipo=Todos&limit=100')
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
          parqueos: item.parqueos,
          bauleras: item.bauleras,
          parqueo:
            Array.isArray(item.parqueos) && item.parqueos.length > 0
              ? item.parqueos.map((p: any) => p.numero).join(', ')
              : item.parqueo || 'Sin parqueo',
          baulera:
            Array.isArray(item.bauleras) && item.bauleras.length > 0
              ? item.bauleras.map((b: any) => b.numero).join(', ')
              : item.baulera || 'Sin baulera',
          propietario: item.propietario
            ? (() => {
                const dirRaw = item.propietario.direccion || ''
                const matchEc = dirRaw.match(/\[Estado Civil: ([^|]+) \| Ocupantes: ([^\]]+)\]/)
                return {
                  id: item.propietario.idPersona,
                  nombre:
                    `${item.propietario.nombres || ''} ${item.propietario.apellidos || ''}`.trim() ||
                    item.propietario.nombre,
                  ci: item.propietario.ciNit || item.propietario.ci,
                  telefono: item.propietario.telefono,
                  correo: item.propietario.correo,
                  direccion: dirRaw,
                  estadoCivil: matchEc ? matchEc[1].trim() : undefined,
                  ocupantes: matchEc ? matchEc[2].trim() : undefined
                }
              })()
            : null,
          inquilinoActual: item.inquilinoActual || null,
          idDepartamento: item.idDepartamento,
          departamento: item.departamento,
          idPersona: item.idPersona,
          persona: item.persona,
          fechaAsignacion: item.fechaAsignacion || null,
          fechaRegistro: item.fechaRegistro || item.fechaAsignacion || '2023-01-01'
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
  }, [])

  useEffect(() => {
    fetchUnidades()
  }, [fetchUnidades])

  // Listas derivadas completas
  const deptosDisponibles = useMemo(() => {
    return unidades.filter((u) => u.tipoUnidad === 'Departamento')
  }, [unidades])

  const parqueosDisponibles = useMemo(() => {
    return unidades.filter((u) => u.tipoUnidad === 'Parqueo')
  }, [unidades])

  const baulerasDisponibles = useMemo(() => {
    return unidades.filter((u) => u.tipoUnidad === 'Baulera')
  }, [unidades])

  const totalAreaConstruida = useMemo(() => {
    return deptosDisponibles.reduce((acc, d) => acc + (d.areaM2 || 0), 0)
  }, [deptosDisponibles])

  // Métricas de Parqueos y Bauleras
  const parqueosAsignadosCount = useMemo(() => {
    return parqueosDisponibles.filter((p) => p.estado === 'Asignado' || p.idDepartamento || p.departamento).length
  }, [parqueosDisponibles])

  const parqueosLibresCount = useMemo(() => {
    return parqueosDisponibles.filter((p) => p.estado === 'Disponible').length
  }, [parqueosDisponibles])

  const baulerasAsignadasCount = useMemo(() => {
    return baulerasDisponibles.filter((b) => b.estado === 'Asignado' || b.idDepartamento || b.departamento).length
  }, [baulerasDisponibles])

  const baulerasLibresCount = useMemo(() => {
    return baulerasDisponibles.filter((b) => b.estado === 'Disponible').length
  }, [baulerasDisponibles])

  // Filtrado reactivo en memoria
  const unidadesFiltradas = useMemo(() => {
    return unidades.filter((u) => {
      // 1. Filtro por categoría de unidad
      if (subTipoCatastro === 'Departamentos' && u.tipoUnidad !== 'Departamento') return false
      if (subTipoCatastro === 'Parqueos' && u.tipoUnidad !== 'Parqueo') return false
      if (subTipoCatastro === 'Bauleras' && u.tipoUnidad !== 'Baulera') return false

      // 2. Búsqueda por texto libre
      const searchLower = searchTerm.toLowerCase().trim()
      if (searchLower) {
        const matchNumero = u.numero.toLowerCase().includes(searchLower)
        const matchProp = u.propietario && (
          u.propietario.nombre.toLowerCase().includes(searchLower) ||
          u.propietario.ci.toLowerCase().includes(searchLower)
        )
        const matchInq = u.inquilinoActual && u.inquilinoActual.nombre.toLowerCase().includes(searchLower)
        const matchDeptoVinculado = u.departamento && u.departamento.numero && u.departamento.numero.toLowerCase().includes(searchLower)
        const matchPersonaVinculada = u.persona && (
          (u.persona.nombres || '').toLowerCase().includes(searchLower) ||
          (u.persona.apellidos || '').toLowerCase().includes(searchLower) ||
          (u.persona.ciNit || '').toLowerCase().includes(searchLower)
        )
        if (!matchNumero && !matchProp && !matchInq && !matchDeptoVinculado && !matchPersonaVinculada) {
          return false
        }
      }

      // 3. Filtro por estado
      if (filtroEstado !== 'Todos') {
        const estadoNorm = u.estado.toLowerCase()
        const filtroNorm = filtroEstado.toLowerCase()
        if (filtroNorm === 'disponible' && estadoNorm !== 'disponible' && estadoNorm !== 'desocupado') return false
        if (filtroNorm === 'desocupado' && estadoNorm !== 'desocupado' && estadoNorm !== 'disponible') return false
        if (filtroNorm === 'asignado' && estadoNorm !== 'asignado') return false
        if (filtroNorm === 'ocupado por propietario' && estadoNorm !== 'ocupado por propietario') return false
        if (filtroNorm === 'alquilado' && estadoNorm !== 'alquilado') return false
      }

      // 4. Filtro por piso (aplica a departamentos)
      if (filtroPiso !== 'Todos' && u.tipoUnidad === 'Departamento') {
        if (u.piso !== Number(filtroPiso)) return false
      }

      return true
    })
  }, [unidades, subTipoCatastro, searchTerm, filtroEstado, filtroPiso])

  // KPIs reales de ocupación de departamentos
  const totalDeptos = deptosDisponibles.length
  const ocupadosPropietario = deptosDisponibles.filter((u) => u.estado === 'Ocupado por Propietario').length
  const alquilados = deptosDisponibles.filter((u) => u.estado === 'Alquilado').length
  const desocupados = deptosDisponibles.filter(
    (u) => u.estado === 'Desocupado' || u.estado === 'Disponible'
  ).length
  const conParqueo = deptosDisponibles.filter((u) => u.parqueo !== 'Sin parqueo').length

  const showToast = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 4000)
  }

  // Registrar nueva unidad (Departamento, Parqueo o Baulera)
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
      const res = await apiFetch('/api/v1/unidades', {
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

  // Actualizar unidad y gestionar asignaciones de Parqueo y Baulera
  const handleEditSubmit = async (
    formData: DepartamentoFormData,
    assignments?: AssignmentsChangeData
  ) => {
    if (!unidadToEdit) return

    const tipoUnidadParam = unidadToEdit.tipoUnidad || 'Departamento'
    const isDepto = tipoUnidadParam === 'Departamento'

    try {
      // 1. Si es departamento y cambió tipología, asignar tipo
      if (isDepto && formData.tipologia) {
        const tipoSel = tiposDepto.find((t) => t.nombre === formData.tipologia)
        const idTipoNum = tipoSel?.idTipo || (tipoSel ? Number(tipoSel.id) : null)
        if (idTipoNum && !isNaN(idTipoNum)) {
          try {
            await apiFetch(`/api/v1/departamentos/${unidadToEdit.id}/tipo`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idTipo: idTipoNum })
            })
          } catch {}
        }
      }

      // 2. Actualizar datos base de la unidad
      const updatePayload: any = {
        numero: formData.numero,
        estado: formData.estado
      }
      if (isDepto) {
        updatePayload.piso = formData.piso !== undefined ? Number(formData.piso) : undefined
        updatePayload.areaM2 = formData.areaM2 !== undefined ? Number(formData.areaM2) : undefined
      }

      const resBase = await apiFetch(`/api/v1/unidades/${tipoUnidadParam}/${unidadToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      })

      if (!resBase.ok) {
        const errJson = await resBase.json().catch(() => ({}))
        showToast(errJson.message || `Error al actualizar unidad ${formData.numero}`)
        return
      }

      // 3. Manejo de Parqueo y Baulera si se editó un Departamento
      if (isDepto && assignments) {
        // Encontrar parqueo anterior asignado a este departamento
        const oldParqueo = parqueosDisponibles.find(
          (p) =>
            p.idDepartamento === unidadToEdit.id ||
            p.departamento?.idDepartamento === unidadToEdit.id ||
            (p.numero === unidadToEdit.parqueo && unidadToEdit.parqueo !== 'Sin parqueo')
        )

        // Asignación / Desvinculación de Parqueo
        if (assignments.parqueoId !== undefined) {
          if (assignments.parqueoId === null) {
            // Desvincular parqueo
            if (oldParqueo) {
              await apiFetch('/api/v1/unidades/asignaciones/finalizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tipoUnidad: 'Parqueo',
                  idUnidad: oldParqueo.id,
                  notas: `Desvinculado desde edición de Dpto ${formData.numero}`
                })
              })
            }
          } else if (!oldParqueo || oldParqueo.id !== assignments.parqueoId) {
            // Finalizar parqueo previo si era distinto
            if (oldParqueo && oldParqueo.id !== assignments.parqueoId) {
              await apiFetch('/api/v1/unidades/asignaciones/finalizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tipoUnidad: 'Parqueo',
                  idUnidad: oldParqueo.id,
                  notas: `Reasignado para Dpto ${formData.numero}`
                })
              })
            }
            // Asignar nuevo parqueo al departamento
            await apiFetch('/api/v1/unidades/asignaciones', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tipoUnidad: 'Parqueo',
                idUnidad: assignments.parqueoId,
                idDepartamento: unidadToEdit.id,
                idPersona: unidadToEdit.propietario?.id || undefined,
                tipoRelacion: 'Asignado',
                notas: `Asignado a Dpto ${formData.numero}`
              })
            })
          }
        }

        // Encontrar baulera anterior asignada a este departamento
        const oldBaulera = baulerasDisponibles.find(
          (b) =>
            b.idDepartamento === unidadToEdit.id ||
            b.departamento?.idDepartamento === unidadToEdit.id ||
            (b.numero === unidadToEdit.baulera && unidadToEdit.baulera !== 'Sin baulera')
        )

        // Asignación / Desvinculación de Baulera
        if (assignments.bauleraId !== undefined) {
          if (assignments.bauleraId === null) {
            // Desvincular baulera
            if (oldBaulera) {
              await apiFetch('/api/v1/unidades/asignaciones/finalizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tipoUnidad: 'Baulera',
                  idUnidad: oldBaulera.id,
                  notas: `Desvinculada desde edición de Dpto ${formData.numero}`
                })
              })
            }
          } else if (!oldBaulera || oldBaulera.id !== assignments.bauleraId) {
            // Finalizar baulera previa si era distinta
            if (oldBaulera && oldBaulera.id !== assignments.bauleraId) {
              await apiFetch('/api/v1/unidades/asignaciones/finalizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tipoUnidad: 'Baulera',
                  idUnidad: oldBaulera.id,
                  notas: `Reasignada para Dpto ${formData.numero}`
                })
              })
            }
            // Asignar nueva baulera al departamento
            await apiFetch('/api/v1/unidades/asignaciones', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tipoUnidad: 'Baulera',
                idUnidad: assignments.bauleraId,
                idDepartamento: unidadToEdit.id,
                idPersona: unidadToEdit.propietario?.id || undefined,
                tipoRelacion: 'Asignado',
                notas: `Asignada a Dpto ${formData.numero}`
              })
            })
          }
        }
      }

      // 4. Si se editó directamente un Parqueo o Baulera
      if (!isDepto && assignments) {
        if (!assignments.departamentoId && !assignments.personaId) {
          // Desvincular si estaba asignado o se marcó Disponible
          if (unidadToEdit.estado === 'Asignado' || unidadToEdit.idDepartamento || unidadToEdit.idPersona) {
            await apiFetch('/api/v1/unidades/asignaciones/finalizar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tipoUnidad: tipoUnidadParam,
                idUnidad: unidadToEdit.id,
                notas: 'Desasignado desde panel de edición'
              })
            })
          }
        } else {
          // Asignar al departamento o persona seleccionada
          await apiFetch('/api/v1/unidades/asignaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipoUnidad: tipoUnidadParam,
              idUnidad: unidadToEdit.id,
              idDepartamento: assignments.departamentoId || undefined,
              idPersona: assignments.personaId || undefined,
              tipoRelacion: 'Asignado',
              notas: `Asignación actualizada desde edición`
            })
          })
        }
      }

      await fetchUnidades()
      showToast(`¡${tipoUnidadParam} ${formData.numero} actualizado correctamente!`)
    } catch {
      showToast(`Error al actualizar datos de ${tipoUnidadParam} ${formData.numero}`)
    } finally {
      setIsEditModalOpen(false)
      setUnidadToEdit(null)
    }
  }

  // Acción rápida: Liberar / Desvincular unidad (Parqueo o Baulera)
  const handleLiberarUnidad = async (unidad: UnidadItem) => {
    if (
      !confirm(
        `¿Está seguro de desvincular y liberar ${unidad.tipoUnidad} ${unidad.numero}? Quedará en estado Disponible y sin departamento vinculado.`
      )
    ) {
      return
    }

    try {
      const res = await apiFetch('/api/v1/unidades/asignaciones/finalizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoUnidad: unidad.tipoUnidad,
          idUnidad: unidad.id,
          notas: 'Liberado rápidamente desde panel de catastro'
        })
      })

      if (res.ok) {
        await fetchUnidades()
        showToast(`¡${unidad.tipoUnidad} ${unidad.numero} liberado y disponible!`)
      } else {
        const json = await res.json().catch(() => ({}))
        showToast(json.message || 'Error al liberar unidad')
      }
    } catch {
      showToast('Error de conexión al liberar unidad')
    }
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

      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-400 text-xs font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Catastro de Departamentos, Parqueos y Bauleras
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Unidades, Propietarios e Inquilinos
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Catastro integral del Edificio XYZ: {totalDeptos} Departamentos, {parqueosDisponibles.length} Parqueos y {baulerasDisponibles.length} Bauleras ({unidades.length} unidades totales).
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

      {/* PESTAÑAS PRINCIPALES DEL MÓDULO */}
      <div className="flex items-center gap-2 border-b border-[#cec8bc] dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('catastro')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'catastro'
              ? 'bg-rose-700 text-white shadow-md shadow-rose-900/20'
              : 'bg-[#ede9e1] dark:bg-slate-900 text-[#66615b] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white border border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Catastro Inmobiliario</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-white/20 dark:bg-white/10">
            {unidades.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tipos')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
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
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
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
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
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
          {/* KPIS DEPARTAMENTOS */}
          <DepartamentosKpis
            totalDeptos={totalDeptos}
            ocupadosPropietario={ocupadosPropietario}
            alquilados={alquilados}
            desocupados={desocupados}
            conParqueo={conParqueo}
            totalAreaConstruida={totalAreaConstruida}
          />

          {/* SUB-CONTROL SEGMENTADO DE UNIDADES: DEPARTAMENTOS, PARQUEOS, BAULERAS */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-[#dfd9ce]/60 dark:bg-slate-900/90 rounded-2xl border border-[#cec8bc] dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSubTipoCatastro('Departamentos')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  subTipoCatastro === 'Departamentos'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'bg-[#ede9e1] dark:bg-slate-800 text-[#5c5750] dark:text-slate-300 hover:bg-[#ded8cc] dark:hover:bg-slate-700'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Departamentos ({totalDeptos})</span>
              </button>

              <button
                type="button"
                onClick={() => setSubTipoCatastro('Parqueos')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  subTipoCatastro === 'Parqueos'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-[#ede9e1] dark:bg-slate-800 text-[#5c5750] dark:text-slate-300 hover:bg-[#ded8cc] dark:hover:bg-slate-700'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Parqueos ({parqueosDisponibles.length})</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20">
                  {parqueosLibresCount} libres
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSubTipoCatastro('Bauleras')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  subTipoCatastro === 'Bauleras'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-[#ede9e1] dark:bg-slate-800 text-[#5c5750] dark:text-slate-300 hover:bg-[#ded8cc] dark:hover:bg-slate-700'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>Bauleras ({baulerasDisponibles.length})</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20">
                  {baulerasLibresCount} libres
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSubTipoCatastro('Todos')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  subTipoCatastro === 'Todos'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'bg-[#ede9e1] dark:bg-slate-800 text-[#5c5750] dark:text-slate-300 hover:bg-[#ded8cc] dark:hover:bg-slate-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Todas las Unidades ({unidades.length})</span>
              </button>
            </div>

            <div className="text-[11px] text-[#7d776f] dark:text-slate-400 font-medium px-2">
              Mostrando <strong className="text-[#262422] dark:text-white">{unidadesFiltradas.length}</strong> unidades
            </div>
          </div>

          {/* BUSCADOR Y FILTROS */}
          <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  subTipoCatastro === 'Departamentos'
                    ? 'Buscar departamento por número, propietario o inquilino...'
                    : subTipoCatastro === 'Parqueos'
                      ? 'Buscar parqueo (ej. P-01, Dpto 101, o titular)...'
                      : subTipoCatastro === 'Bauleras'
                        ? 'Buscar baulera (ej. B-01, Dpto 101, o titular)...'
                        : 'Buscar por número, código, propietario o inquilino...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] focus:outline-none focus:ring-2 focus:ring-rose-600 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro Estado */}
              <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
                <Filter className="w-3.5 h-3.5 text-[#7d776f]" />
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-bold"
                >
                  <option value="Todos">Estado: Todos</option>
                  {subTipoCatastro === 'Departamentos' ? (
                    <>
                      <option value="Ocupado por Propietario">Ocupado por Dueño</option>
                      <option value="Alquilado">Alquilado a Inquilino</option>
                      <option value="Desocupado">Desocupado / Vacío</option>
                    </>
                  ) : subTipoCatastro === 'Parqueos' || subTipoCatastro === 'Bauleras' ? (
                    <>
                      <option value="Disponible">Disponible (Libre)</option>
                      <option value="Asignado">Asignado</option>
                      <option value="Mantenimiento">Mantenimiento</option>
                    </>
                  ) : (
                    <>
                      <option value="Disponible">Disponible / Desocupado</option>
                      <option value="Asignado">Asignado</option>
                      <option value="Ocupado por Propietario">Ocupado por Dueño</option>
                      <option value="Alquilado">Alquilado</option>
                    </>
                  )}
                </select>
              </div>

              {/* Filtro Piso (exclusivo para Departamentos) */}
              {(subTipoCatastro === 'Departamentos' || subTipoCatastro === 'Todos') && (
                <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
                  <Layers className="w-3.5 h-3.5 text-[#7d776f]" />
                  <select
                    value={filtroPiso}
                    onChange={(e) => setFiltroPiso(e.target.value)}
                    className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-bold"
                  >
                    <option value="Todos">Piso: Todos</option>
                    <option value="1">Piso 1</option>
                    <option value="2">Piso 2</option>
                    <option value="3">Piso 3</option>
                    <option value="4">Piso 4</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* TABLA CATASTRAL DE UNIDADES */}
          <div className="rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/60 dark:bg-slate-950/60 text-[#7d776f] dark:text-slate-400 uppercase text-[11px] font-bold">
                    {subTipoCatastro === 'Departamentos' ? (
                      <>
                        <th className="py-3 px-4">Departamento / Tipo</th>
                        <th className="py-3 px-4">Propietario Responsable</th>
                        <th className="py-3 px-4">Ocupante / Inquilino</th>
                        <th className="py-3 px-4">Superficie</th>
                        <th className="py-3 px-4">Parqueo / Baulera</th>
                        <th className="py-3 px-4">Estado Ocupación</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </>
                    ) : subTipoCatastro === 'Parqueos' ? (
                      <>
                        <th className="py-3 px-4">Código Parqueo</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4">Departamento Vinculado</th>
                        <th className="py-3 px-4">Titular Asignado</th>
                        <th className="py-3 px-4">Fecha Asignación</th>
                        <th className="py-3 px-4 text-right">Acciones (Editar / Vincular)</th>
                      </>
                    ) : subTipoCatastro === 'Bauleras' ? (
                      <>
                        <th className="py-3 px-4">Código Baulera</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4">Departamento Vinculado</th>
                        <th className="py-3 px-4">Titular Asignado</th>
                        <th className="py-3 px-4">Fecha Asignación</th>
                        <th className="py-3 px-4 text-right">Acciones (Editar / Vincular)</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3 px-4">Unidad & Tipo</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4">Vinculación Inmobiliaria</th>
                        <th className="py-3 px-4">Titular / Responsable</th>
                        <th className="py-3 px-4">Detalle / Superficie</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cec8bc] dark:divide-slate-800">
                  {unidadesFiltradas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-[#7d776f] dark:text-slate-500 font-medium"
                      >
                        No se encontraron unidades con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    unidadesFiltradas.map((unidad) => {
                      const isUnidadDepto = unidad.tipoUnidad === 'Departamento'
                      const isUnidadParqueo = unidad.tipoUnidad === 'Parqueo'
                      const isUnidadBaulera = unidad.tipoUnidad === 'Baulera'

                      // ============================================
                      // RENDERIZADO: VISTA ESPECÍFICA DE DEPARTAMENTOS
                      // ============================================
                      if (subTipoCatastro === 'Departamentos') {
                        return (
                          <tr
                            key={`depto-${unidad.id}`}
                            className="hover:bg-[#dfd9ce]/40 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="font-extrabold text-[#262422] dark:text-white flex items-center gap-1.5">
                                <Building2 className="w-4 h-4 text-blue-700 dark:text-indigo-400 shrink-0" />
                                <span>Dpto. {unidad.numero}</span>
                              </div>
                              <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                                {unidad.tipologia || 'Tipo Estándar'} • Piso {unidad.piso || '-'}
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
                                    {unidad.propietario.estadoCivil && (
                                      <span className="font-medium text-slate-800 dark:text-slate-200">
                                        {' '}• {unidad.propietario.estadoCivil}
                                      </span>
                                    )}
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
                                  <span className="text-[10px] px-2 py-0.2 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 font-bold">
                                    Inquilino (Contrato)
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
                            </td>

                            <td className="py-3 px-4">
                              <div className="text-xs font-semibold text-[#262422] dark:text-white flex items-center gap-1">
                                <Car className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                                <span>{unidad.parqueo || 'Sin parqueo'}</span>
                              </div>
                              <div className="text-[11px] font-semibold text-[#7d776f] dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                <Box className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
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
                                    setUnidadToAssign(unidad)
                                    setIsAssignModalOpen(true)
                                  }}
                                  className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-slate-800 transition-colors"
                                  title="Gestionar Asignación de Propietario / Inquilino"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setUnidadToEdit(unidad)
                                    setIsEditModalOpen(true)
                                  }}
                                  className="p-1.5 rounded-lg text-blue-700 hover:text-blue-900 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-slate-800 transition-colors"
                                  title="Editar Departamento, Parqueo y Baulera"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      }

                      // ============================================
                      // RENDERIZADO: VISTA ESPECÍFICA DE PARQUEOS
                      // ============================================
                      if (subTipoCatastro === 'Parqueos') {
                        const deptoVinculado = unidad.departamento?.numero
                        const titular = unidad.persona
                          ? `${unidad.persona.nombres || ''} ${unidad.persona.apellidos || ''}`.trim()
                          : null

                        return (
                          <tr
                            key={`parqueo-${unidad.id}`}
                            className="hover:bg-[#dfd9ce]/40 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="font-extrabold text-[#262422] dark:text-white flex items-center gap-2">
                                <Car className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span className="font-mono text-sm">Parqueo {unidad.numero}</span>
                              </div>
                              <span className="text-[10px] text-[#7d776f] dark:text-slate-400">
                                ID Unidad: #{unidad.id}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  unidad.estado === 'Disponible'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300'
                                    : unidad.estado === 'Asignado'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300'
                                }`}
                              >
                                {unidad.estado}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              {deptoVinculado ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 font-bold text-xs text-blue-900 dark:text-blue-300">
                                  <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>Departamento {deptoVinculado}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500 italic">
                                  Sin departamento vinculado (Libre)
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {titular ? (
                                <div className="text-xs font-bold text-[#262422] dark:text-white flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>{titular}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500 italic">
                                  Sin titular asignado
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-xs font-mono text-[#7d776f] dark:text-slate-400">
                              {unidad.fechaAsignacion
                                ? new Date(unidad.fechaAsignacion).toLocaleDateString()
                                : '—'}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setUnidadToAssign(unidad)
                                    setIsAssignModalOpen(true)
                                  }}
                                  className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                  title="Asignar o Transferir Parqueo"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                  Asignar
                                </button>
                                <button
                                  onClick={() => {
                                    setUnidadToEdit(unidad)
                                    setIsEditModalOpen(true)
                                  }}
                                  className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-slate-800 transition-colors"
                                  title="Editar Parqueo"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {(unidad.estado === 'Asignado' || deptoVinculado || titular) && (
                                  <button
                                    onClick={() => handleLiberarUnidad(unidad)}
                                    className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-slate-800 transition-colors"
                                    title="Liberar y Desvincular Parqueo"
                                  >
                                    <LockOpen className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      }

                      // ============================================
                      // RENDERIZADO: VISTA ESPECÍFICA DE BAULERAS
                      // ============================================
                      if (subTipoCatastro === 'Bauleras') {
                        const deptoVinculado = unidad.departamento?.numero
                        const titular = unidad.persona
                          ? `${unidad.persona.nombres || ''} ${unidad.persona.apellidos || ''}`.trim()
                          : null

                        return (
                          <tr
                            key={`baulera-${unidad.id}`}
                            className="hover:bg-[#dfd9ce]/40 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="font-extrabold text-[#262422] dark:text-white flex items-center gap-2">
                                <Box className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="font-mono text-sm">Baulera {unidad.numero}</span>
                              </div>
                              <span className="text-[10px] text-[#7d776f] dark:text-slate-400">
                                ID Unidad: #{unidad.id}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  unidad.estado === 'Disponible'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300'
                                    : unidad.estado === 'Asignado'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300'
                                }`}
                              >
                                {unidad.estado}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              {deptoVinculado ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 font-bold text-xs text-blue-900 dark:text-blue-300">
                                  <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>Departamento {deptoVinculado}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500 italic">
                                  Sin departamento vinculado (Libre)
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {titular ? (
                                <div className="text-xs font-bold text-[#262422] dark:text-white flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>{titular}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500 italic">
                                  Sin titular asignado
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-xs font-mono text-[#7d776f] dark:text-slate-400">
                              {unidad.fechaAsignacion
                                ? new Date(unidad.fechaAsignacion).toLocaleDateString()
                                : '—'}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setUnidadToAssign(unidad)
                                    setIsAssignModalOpen(true)
                                  }}
                                  className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                  title="Asignar o Transferir Baulera"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                  Asignar
                                </button>
                                <button
                                  onClick={() => {
                                    setUnidadToEdit(unidad)
                                    setIsEditModalOpen(true)
                                  }}
                                  className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-slate-800 transition-colors"
                                  title="Editar Baulera"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {(unidad.estado === 'Asignado' || deptoVinculado || titular) && (
                                  <button
                                    onClick={() => handleLiberarUnidad(unidad)}
                                    className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-slate-800 transition-colors"
                                    title="Liberar y Desvincular Baulera"
                                  >
                                    <LockOpen className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      }

                      // ============================================
                      // RENDERIZADO: VISTA "TODAS LAS UNIDADES" (50)
                      // ============================================
                      return (
                        <tr
                          key={`unidad-${unidad.tipoUnidad}-${unidad.id}`}
                          className="hover:bg-[#dfd9ce]/40 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-[#262422] dark:text-white flex items-center gap-2">
                              {isUnidadDepto && <Building2 className="w-4 h-4 text-blue-700 shrink-0" />}
                              {isUnidadParqueo && <Car className="w-4 h-4 text-amber-600 shrink-0" />}
                              {isUnidadBaulera && <Box className="w-4 h-4 text-emerald-600 shrink-0" />}
                              <span>
                                {unidad.tipoUnidad} {unidad.numero}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#7d776f] dark:text-slate-400">
                              {unidad.tipoUnidad} #{unidad.id}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                unidad.estado === 'Disponible'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300'
                                  : unidad.estado === 'Asignado'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300'
                              }`}
                            >
                              {unidad.estado}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            {isUnidadDepto ? (
                              <div className="text-xs">
                                <div>Parqueo: <strong className="text-[#262422] dark:text-white">{unidad.parqueo || 'Sin parqueo'}</strong></div>
                                <div>Baulera: <strong className="text-[#262422] dark:text-white">{unidad.baulera || 'Sin baulera'}</strong></div>
                              </div>
                            ) : unidad.departamento ? (
                              <span className="font-bold text-xs text-blue-800 dark:text-blue-300">
                                Asignado a Dpto {unidad.departamento.numero}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500 italic">Libre</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {isUnidadDepto && unidad.propietario ? (
                              <span className="font-bold text-xs text-[#262422] dark:text-white">
                                {unidad.propietario.nombre}
                              </span>
                            ) : unidad.persona ? (
                              <span className="font-bold text-xs text-[#262422] dark:text-white">
                                {unidad.persona.nombres} {unidad.persona.apellidos}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500 italic">Sin titular</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {isUnidadDepto && unidad.areaM2 ? (
                              <span className="font-mono text-xs font-bold">{unidad.areaM2} m²</span>
                            ) : (
                              <span className="text-xs text-slate-500">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setUnidadToEdit(unidad)
                                  setIsEditModalOpen(true)
                                }}
                                className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-slate-800 transition-colors"
                                title="Editar Unidad"
                              >
                                <Edit className="w-4 h-4" />
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
        <AguaDepartamentosTab unidades={unidades} showToast={showToast} />
      ) : (
        <ParametrosDepartamentosTab
          unidades={unidades}
          onUpdateUnidad={handleUpdateUnidadParametros}
          onUpdateMultiple={handleUpdateMultipleParametros}
          showToast={showToast}
        />
      )}

      {/* MODAL CREAR DEPARTAMENTO / PARQUEO / BAULERA */}
      <CrearDepartamentoModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        totalAreaConstruida={totalAreaConstruida}
        errorMessage={createErrorMessage}
        tiposDisponibles={tiposDepto}
      />

      {/* MODAL EDITAR DEPARTAMENTO, PARQUEO O BAULERA */}
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
          parqueosDisponibles={parqueosDisponibles}
          baulerasDisponibles={baulerasDisponibles}
          deptosDisponibles={deptosDisponibles}
          personasList={personasList}
          onUpdate={async (updated, assignments) => {
            await handleEditSubmit(
              {
                tipoUnidad: updated.tipoUnidad,
                numero: updated.numero,
                piso: updated.piso || 1,
                areaM2: updated.areaM2 || 0,
                tipologia: updated.tipologia,
                expensaBase: updated.expensaBase,
                estado: updated.estado,
                parqueo: updated.parqueo,
                baulera: updated.baulera
              },
              assignments
            )
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
