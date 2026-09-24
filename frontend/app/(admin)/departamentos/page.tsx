// frontend/app/(admin)/departamentos/page.tsx
// HU03: Módulo de Gestión de Unidades (Departamentos, Parqueos y Bauleras) y Asignaciones
// Arquitectura modular con integración a la API unificada de unidades /api/v1/unidades

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
  UserCheck
} from 'lucide-react'
import { UnidadItem, DepartamentoFormData, TipoUnidad } from '@/components/departamentos/types'
import DepartamentosKpis from '@/components/departamentos/DepartamentosKpis'
import CrearDepartamentoModal from '@/components/departamentos/CrearDepartamentoModal'
import EditarDepartamentoModal from '@/components/departamentos/EditarDepartamentoModal'
import FichaTecnicaModal from '@/components/departamentos/FichaTecnicaModal'
import AsignarUnidadModal from '@/components/departamentos/AsignarUnidadModal'

const UNIDADES_SEED: UnidadItem[] = [
  {
    id: 1,
    tipoUnidad: 'Departamento',
    numero: '101',
    piso: 1,
    areaM2: 110.5,
    alicuota: 4.16,
    estado: 'Ocupado',
    propietario: {
      id: 1,
      nombre: 'Carlos Mendoza Rojas',
      ci: '4829103 CBBA',
      telefono: '+591 71234567',
      correo: 'carlos.mendoza@email.com'
    },
    parqueo: 'P-01',
    baulera: 'B-01',
    fechaRegistro: '2023-01-15'
  },
  {
    id: 2,
    tipoUnidad: 'Departamento',
    numero: '102',
    piso: 1,
    areaM2: 85.0,
    alicuota: 3.2,
    estado: 'Ocupado',
    propietario: {
      id: 2,
      nombre: 'Mariana Flores Soliz',
      ci: '5920144 SCZ',
      telefono: '+591 79876543',
      correo: 'mariana.flores@email.com'
    },
    parqueo: 'P-02',
    baulera: 'Sin baulera',
    fechaRegistro: '2023-02-01'
  },
  {
    id: 3,
    tipoUnidad: 'Parqueo',
    numero: 'P-01',
    estado: 'Asignado',
    departamento: { idDepartamento: 1, numero: '101' },
    fechaRegistro: '2023-01-15'
  },
  {
    id: 4,
    tipoUnidad: 'Parqueo',
    numero: 'P-02',
    estado: 'Disponible',
    fechaRegistro: '2023-01-15'
  },
  {
    id: 5,
    tipoUnidad: 'Baulera',
    numero: 'B-01',
    estado: 'Asignado',
    departamento: { idDepartamento: 1, numero: '101' },
    fechaRegistro: '2023-01-15'
  },
  {
    id: 6,
    tipoUnidad: 'Baulera',
    numero: 'B-02',
    estado: 'Disponible',
    fechaRegistro: '2023-01-15'
  }
]

export default function DepartamentosPage() {
  const [unidades, setUnidades] = useState<UnidadItem[]>(UNIDADES_SEED)
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

  // Fetch unidades desde la API
  const fetchUnidades = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/unidades?tipo=${filtroTipo}&estado=${filtroEstado}&search=${encodeURIComponent(searchTerm)}`)
      if (res.ok) {
        const json = await res.json()
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: UnidadItem[] = json.data.map((item: any) => ({
            id: item.id,
            tipoUnidad: item.tipoUnidad,
            numero: item.numero,
            piso: item.piso,
            areaM2: item.areaM2,
            alicuota: item.alicuota || (item.areaM2 ? Number(((item.areaM2 / 2650) * 100).toFixed(2)) : undefined),
            estado: item.estado || 'Disponible',
            parqueo: item.parqueos?.[0]?.numero || 'Sin parqueo',
            baulera: item.bauleras?.[0]?.numero || 'Sin baulera',
            propietario: item.propietario
              ? {
                  id: item.propietario.idPersona,
                  nombre: `${item.propietario.nombres || ''} ${item.propietario.apellidos || ''}`.trim(),
                  ci: item.propietario.ciNit,
                  telefono: item.propietario.telefono,
                  correo: item.propietario.correo
                }
              : null,
            persona: item.persona,
            departamento: item.departamento,
            fechaRegistro: item.fechaRegistro || '2024-01-01'
          }))
          setUnidades(mapped)
        }
      }
    } catch {}
  }, [filtroTipo, filtroEstado, searchTerm])

  useEffect(() => {
    fetchUnidades()
  }, [fetchUnidades])

  const totalAreaConstruida = useMemo(() => {
    return unidades.filter((u) => u.tipoUnidad === 'Departamento').reduce((acc, d) => acc + (d.areaM2 || 0), 0)
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
        (u.persona &&
          `${u.persona.nombres} ${u.persona.apellidos}`.toLowerCase().includes(searchLower))

      const matchTipo = filtroTipo === 'Todos' || u.tipoUnidad === filtroTipo
      const matchEstado = filtroEstado === 'Todos' || u.estado === filtroEstado
      const matchPiso = filtroPiso === 'Todos' || u.piso === Number(filtroPiso)

      return matchSearch && matchTipo && matchEstado && matchPiso
    })
  }, [unidades, searchTerm, filtroTipo, filtroEstado, filtroPiso])

  // KPIs
  const totalDeptos = unidades.filter((u) => u.tipoUnidad === 'Departamento').length
  const ocupados = unidades.filter((u) => u.tipoUnidad === 'Departamento' && u.estado === 'Ocupado').length
  const disponibles = unidades.filter(
    (u) => u.estado === 'Disponible' || u.estado === 'En Alquiler'
  ).length
  const conParqueo = unidades.filter((u) => u.tipoUnidad === 'Departamento' && u.parqueo !== 'Sin parqueo').length

  const showToast = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 4000)
  }

  // CA1 & CA4: Crear unidad con verificación de duplicado
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

      // CA4: Manejo de error duplicado
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

  // CA3: Modificar datos de unidad
  const handleUpdateSubmit = async (updated: UnidadItem) => {
    try {
      const res = await fetch(`/api/v1/unidades/${updated.tipoUnidad}/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: updated.numero,
          piso: updated.piso,
          areaM2: updated.areaM2,
          estado: updated.estado
        })
      })

      if (res.ok) {
        await fetchUnidades()
        showToast(`¡Unidad ${updated.numero} actualizada correctamente!`)
      }
    } catch {}

    setIsEditModalOpen(false)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast */}
      {successToast && (
        <div className="p-4 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl flex items-center gap-3 shadow-md animate-in fade-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{successToast}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#ede9e1]/90 dark:bg-slate-900/90 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-blue-700 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            HU03: Catastro & Gestión de Unidades Inmobiliarias
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#262422] dark:text-white tracking-tight">
            Departamentos, Parqueos y Bauleras
          </h1>
          <p className="text-xs sm:text-sm text-[#7d776f] dark:text-slate-400">
            Administración unificada de departamentos, espacios de parqueo y bauleras con historial de antecedentes de asignación.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateErrorMessage(null)
            setIsCreateModalOpen(true)
          }}
          className="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-900/20 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Registrar Nueva Unidad
        </button>
      </div>

      {/* TARJETAS KPI MODULAR */}
      <DepartamentosKpis
        totalDeptos={totalDeptos}
        ocupados={ocupados}
        disponibles={disponibles}
        conParqueo={conParqueo}
        totalAreaConstruida={totalAreaConstruida}
      />

      {/* PESTAÑAS DE TIPO DE UNIDAD (CA1, CA08) */}
      <div className="flex border-b border-[#cec8bc] dark:border-slate-800 gap-2 overflow-x-auto pb-1">
        {[
          { label: 'Todas las Unidades', value: 'Todos', icon: Building2 },
          { label: 'Departamentos', value: 'Departamento', icon: Building2 },
          { label: 'Parqueos', value: 'Parqueo', icon: Car },
          { label: 'Bauleras', value: 'Baulera', icon: Box }
        ].map((tab) => {
          const IconComponent = tab.icon
          const isActive = filtroTipo === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => setFiltroTipo(tab.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition-all cursor-pointer border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-blue-700 text-blue-700 dark:border-indigo-400 dark:text-indigo-400 bg-[#ede9e1]/50 dark:bg-slate-800/40'
                  : 'border-transparent text-[#7d776f] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* BUSCADOR Y FILTROS */}
      <div className="p-4 rounded-2xl bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por identificador (ej. 101, P-01, B-01) o titular..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs text-[#262422] dark:text-slate-100 placeholder-[#7d776f] focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* CA08: Filtro Estado */}
          <div className="flex items-center gap-1.5 bg-[#ded8cc] dark:bg-slate-800 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#7d776f] dark:text-slate-400" />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-bold"
            >
              <option value="Todos">Estado: Todos</option>
              <option value="Disponible">Disponible</option>
              <option value="Asignado">Asignado</option>
              <option value="Ocupado">Ocupado</option>
              <option value="Desocupado">Desocupado</option>
              <option value="En Alquiler">En Alquiler</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLA DE UNIDADES */}
      <div className="rounded-2xl bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/70 dark:bg-slate-800/70 text-[11px] font-bold uppercase tracking-wider text-[#7d776f] dark:text-slate-400">
                <th className="py-3.5 px-4">Tipo & Identificador</th>
                <th className="py-3.5 px-4">Detalle / Superficie</th>
                <th className="py-3.5 px-4">Titular / Asignado A</th>
                <th className="py-3.5 px-4">Estado Actual</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cec8bc]/50 dark:divide-slate-800/60">
              {unidadesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#7d776f] dark:text-slate-500">
                    No se encontraron unidades registradas con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                unidadesFiltradas.map((unidad) => (
                  <tr
                    key={`${unidad.tipoUnidad}-${unidad.id}`}
                    className="hover:bg-[#e4ded4]/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl font-extrabold flex items-center justify-center border text-xs ${
                            unidad.tipoUnidad === 'Departamento'
                              ? 'bg-blue-700/15 text-blue-900 border-blue-600/30'
                              : unidad.tipoUnidad === 'Parqueo'
                                ? 'bg-amber-600/15 text-amber-900 border-amber-600/30'
                                : 'bg-emerald-600/15 text-emerald-900 border-emerald-600/30'
                          }`}
                        >
                          {unidad.numero}
                        </div>
                        <div>
                          <div className="font-bold text-[#262422] dark:text-white text-sm">
                            {unidad.tipoUnidad} {unidad.numero}
                          </div>
                          <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                            {unidad.tipoUnidad === 'Departamento' ? `Piso ${unidad.piso || '-'}` : 'Espacio de Edificio'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {unidad.tipoUnidad === 'Departamento' ? (
                        <div>
                          <div className="font-bold text-[#262422] dark:text-slate-200 font-mono">
                            {unidad.areaM2} m²
                          </div>
                          <div className="text-[10px] text-blue-700 dark:text-indigo-400 font-semibold flex items-center gap-0.5">
                            <Percent className="w-3 h-3" />
                            Alícuota: {unidad.alicuota || ((Number(unidad.areaM2) / 2650) * 100).toFixed(2)}%
                          </div>
                        </div>
                      ) : (
                        <div className="text-[#7d776f] dark:text-slate-400 font-medium">
                          {unidad.departamento ? `Asignado a Dpto ${unidad.departamento.numero}` : 'Sin depto asignado'}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {unidad.propietario ? (
                        <div>
                          <div className="font-bold text-[#262422] dark:text-white flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-blue-700 dark:text-indigo-400" />
                            {unidad.propietario.nombre}
                          </div>
                          <div className="text-[11px] text-[#7d776f] dark:text-slate-400 font-mono">
                            CI: {unidad.propietario.ci} • {unidad.propietario.telefono}
                          </div>
                        </div>
                      ) : unidad.persona ? (
                        <div className="font-bold text-[#262422] dark:text-white flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-700 dark:text-indigo-400" />
                          {unidad.persona.nombres} {unidad.persona.apellidos}
                        </div>
                      ) : (
                        <span className="text-[#7d776f] dark:text-slate-500 italic">
                          Sin titular asignado
                        </span>
                      )}
                    </td>

                    {/* CA08: Distinción visual de estados */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          unidad.estado === 'Ocupado' || unidad.estado === 'Asignado'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : unidad.estado === 'Disponible'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                              : unidad.estado === 'En Alquiler'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}
                      >
                        {unidad.estado}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* CA5, CA6: Botón de Asignación */}
                        <button
                          onClick={() => {
                            setUnidadToAssign(unidad)
                            setIsAssignModalOpen(true)
                          }}
                          className="p-1.5 rounded-lg text-[#5c5750] hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Gestionar Asignación"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setUnidadToEdit({ ...unidad })
                            setIsEditModalOpen(true)
                          }}
                          className="p-1.5 rounded-lg text-[#5c5750] hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Editar Unidad"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedUnidad(unidad)}
                          className="p-1.5 rounded-lg text-[#5c5750] hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Ver Ficha Técnica & Historial"
                        >
                          <Eye className="w-4 h-4" />
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

      {/* MODALES */}
      <CrearDepartamentoModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        totalAreaConstruida={totalAreaConstruida}
        errorMessage={createErrorMessage}
      />

      <EditarDepartamentoModal
        isOpen={isEditModalOpen}
        depto={unidadToEdit as any}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={handleUpdateSubmit as any}
        onChange={(u) => setUnidadToEdit(u as any)}
      />

      <FichaTecnicaModal
        isOpen={!!selectedUnidad}
        depto={selectedUnidad as any}
        onClose={() => setSelectedUnidad(null)}
      />

      <AsignarUnidadModal
        isOpen={isAssignModalOpen}
        unidad={unidadToAssign}
        onClose={() => setIsAssignModalOpen(false)}
        onSuccess={() => {
          fetchUnidades()
          showToast(`¡Asignación de ${unidadToAssign?.tipoUnidad} ${unidadToAssign?.numero} actualizada correctamente!`)
        }}
      />
    </div>
  )
}
