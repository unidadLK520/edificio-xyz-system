// frontend/app/(admin)/departamentos/page.tsx
// HU 4: Módulo de Gestión de Departamentos y Catastro de Unidades Habitacionales
// Arquitectura modular y desacoplada con componentes reutilizables

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
  CheckCircle2
} from 'lucide-react'
import { DepartamentoItem, DepartamentoFormData } from '@/components/departamentos/types'
import DepartamentosKpis from '@/components/departamentos/DepartamentosKpis'
import CrearDepartamentoModal from '@/components/departamentos/CrearDepartamentoModal'
import EditarDepartamentoModal from '@/components/departamentos/EditarDepartamentoModal'
import FichaTecnicaModal from '@/components/departamentos/FichaTecnicaModal'

const DEPARTAMENTOS_SEED: DepartamentoItem[] = [
  {
    id: 1,
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
    parqueo: 'P-01 (Subsuelo 1)',
    baulera: 'B-01',
    fechaRegistro: '2023-01-15',
    historialOcupantes: [
      { periodo: '2023 - Presente', residente: 'Carlos Mendoza Rojas', tipo: 'Propietario' },
      { periodo: '2020 - 2022', residente: 'Juan Pérez García', tipo: 'Inquilino' }
    ]
  },
  {
    id: 2,
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
    inquilinoActual: {
      nombre: 'Roberto Gómez',
      telefono: '+591 70123456'
    },
    parqueo: 'P-02 (Subsuelo 1)',
    baulera: 'Sin baulera',
    fechaRegistro: '2023-02-01',
    historialOcupantes: [
      { periodo: '2024 - Presente', residente: 'Roberto Gómez', tipo: 'Inquilino' },
      { periodo: '2023 - 2024', residente: 'Mariana Flores Soliz', tipo: 'Propietario' }
    ]
  },
  {
    id: 3,
    numero: '201',
    piso: 2,
    areaM2: 125.0,
    alicuota: 4.71,
    estado: 'Ocupado',
    propietario: {
      id: 3,
      nombre: 'Alejandro Vargas Morales',
      ci: '3948120 LPZ',
      telefono: '+591 67123980',
      correo: 'alejandro.vargas@email.com'
    },
    parqueo: 'P-05 (Subsuelo 2)',
    baulera: 'B-03',
    fechaRegistro: '2022-06-10',
    historialOcupantes: [
      { periodo: '2022 - Presente', residente: 'Alejandro Vargas Morales', tipo: 'Propietario' }
    ]
  },
  {
    id: 4,
    numero: '202',
    piso: 2,
    areaM2: 95.0,
    alicuota: 3.58,
    estado: 'Disponible',
    propietario: {
      id: 4,
      nombre: 'Valeria Torrico Camacho',
      ci: '6129841 CBBA',
      telefono: '+591 75432198',
      correo: 'valeria.torrico@email.com'
    },
    parqueo: 'Sin parqueo',
    baulera: 'B-04',
    fechaRegistro: '2021-11-20',
    historialOcupantes: [
      { periodo: '2021 - 2025', residente: 'Valeria Torrico Camacho', tipo: 'Propietario' }
    ]
  },
  {
    id: 5,
    numero: '301',
    piso: 3,
    areaM2: 140.0,
    alicuota: 5.28,
    estado: 'En Alquiler',
    propietario: {
      id: 5,
      nombre: 'Fernando Castro Ortiz',
      ci: '4918230 CBBA',
      telefono: '+591 72198450',
      correo: 'fernando.castro@email.com'
    },
    parqueo: 'P-08 (Subsuelo 1)',
    baulera: 'B-07',
    fechaRegistro: '2024-08-01',
    historialOcupantes: []
  },
  {
    id: 6,
    numero: '302',
    piso: 3,
    areaM2: 88.5,
    alicuota: 3.34,
    estado: 'Mantenimiento',
    propietario: null,
    parqueo: 'Sin parqueo',
    baulera: 'Sin baulera',
    fechaRegistro: '2024-09-01',
    historialOcupantes: []
  }
]

export default function DepartamentosPage() {
  const [departamentos, setDepartamentos] = useState<DepartamentoItem[]>(DEPARTAMENTOS_SEED)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [filtroPiso, setFiltroPiso] = useState('Todos')

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedDepto, setSelectedDepto] = useState<DepartamentoItem | null>(null)
  const [deptoToEdit, setDeptoToEdit] = useState<DepartamentoItem | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Fetch inicial desde API
  const fetchDepartamentos = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/departamentos')
      if (res.ok) {
        const json = await res.json()
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: DepartamentoItem[] = json.data.map((item: any) => ({
            id: item.idDepartamento || item.id,
            numero: item.numero,
            piso: item.piso,
            areaM2: item.areaM2,
            alicuota: item.alicuota || Number(((item.areaM2 / 2650) * 100).toFixed(2)),
            estado: item.estado || 'Disponible',
            parqueo: item.parqueo || 'Sin parqueo',
            baulera: item.baulera || 'Sin baulera',
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
            inquilinoActual: item.ocupaciones?.find((o: any) => o.tipoOcupante === 'Inquilino')
              ?.persona
              ? {
                  nombre: `${item.ocupaciones[0].persona.nombres} ${item.ocupaciones[0].persona.apellidos}`,
                  telefono: item.ocupaciones[0].persona.telefono
                }
              : null,
            fechaRegistro: item.fechaRegistro || '2024-01-01',
            historialOcupantes: item.historialOcupantes || []
          }))
          setDepartamentos(mapped)
        }
      }
    } catch {
      // Fallback local ya disponible
    }
  }, [])

  useEffect(() => {
    fetchDepartamentos()
  }, [fetchDepartamentos])

  const totalAreaConstruida = useMemo(() => {
    return departamentos.reduce((acc, d) => acc + d.areaM2, 0)
  }, [departamentos])

  // Filtrado reactivo
  const deptosFiltrados = useMemo(() => {
    return departamentos.filter((d) => {
      const matchSearch =
        d.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.propietario &&
          (d.propietario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.propietario.ci.toLowerCase().includes(searchTerm.toLowerCase())))

      const matchEstado = filtroEstado === 'Todos' || d.estado === filtroEstado
      const matchPiso = filtroPiso === 'Todos' || d.piso === Number(filtroPiso)

      return matchSearch && matchEstado && matchPiso
    })
  }, [departamentos, searchTerm, filtroEstado, filtroPiso])

  // KPIs
  const totalDeptos = departamentos.length
  const ocupados = departamentos.filter((d) => d.estado === 'Ocupado').length
  const disponibles = departamentos.filter(
    (d) => d.estado === 'Disponible' || d.estado === 'En Alquiler'
  ).length
  const conParqueo = departamentos.filter((d) => d.parqueo !== 'Sin parqueo').length

  const showToast = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 3500)
  }

  const handleCreateSubmit = async (formData: DepartamentoFormData) => {
    const nuevo: DepartamentoItem = {
      id: Date.now(),
      numero: formData.numero.trim(),
      piso: Number(formData.piso),
      areaM2: Number(formData.areaM2),
      alicuota: formData.alicuota,
      estado: formData.estado,
      parqueo: formData.parqueo || 'Sin parqueo',
      baulera: formData.baulera || 'Sin baulera',
      fechaRegistro: new Date().toISOString().split('T')[0],
      propietario: formData.propietarioNombre.trim()
        ? {
            id: Date.now() + 1,
            nombre: formData.propietarioNombre.trim(),
            ci: formData.propietarioCi.trim() || 'S/CI',
            telefono: formData.propietarioTel.trim() || 'S/Telf',
            correo:
              formData.propietarioCorreo.trim() ||
              `${formData.numero.trim().toLowerCase()}@edificioxyz.com`
          }
        : null,
      historialOcupantes: formData.propietarioNombre.trim()
        ? [
            {
              periodo: `${new Date().getFullYear()} - Presente`,
              residente: formData.propietarioNombre.trim(),
              tipo: 'Propietario'
            }
          ]
        : []
    }

    try {
      await fetch('/api/v1/departamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevo)
      })
    } catch {}

    setDepartamentos([nuevo, ...departamentos])
    setIsCreateModalOpen(false)
    showToast(`¡Departamento ${nuevo.numero} registrado exitosamente!`)
  }

  const handleUpdateSubmit = async (updated: DepartamentoItem) => {
    try {
      await fetch('/api/v1/departamentos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      })
    } catch {}

    setDepartamentos(departamentos.map((d) => (d.id === updated.id ? updated : d)))
    setIsEditModalOpen(false)
    showToast(`¡Departamento ${updated.numero} actualizado correctamente!`)
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
            HU 4: Catastro de Inmuebles & Unidades Habitacionales
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#262422] dark:text-white tracking-tight">
            Departamentos y Unidades
          </h1>
          <p className="text-xs sm:text-sm text-[#7d776f] dark:text-slate-400">
            Registro catastral interno, áreas en m², cálculo de alícuotas (%), parqueos y asignación
            de titulares.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
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

      {/* BUSCADOR Y FILTROS */}
      <div className="p-4 rounded-2xl bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nro de dpto, propietario o CI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs text-[#262422] dark:text-slate-100 placeholder-[#7d776f] focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Estado */}
          <div className="flex items-center gap-1.5 bg-[#ded8cc] dark:bg-slate-800 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#7d776f] dark:text-slate-400" />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-bold"
            >
              <option value="Todos">Estado: Todos</option>
              <option value="Ocupado">Ocupado</option>
              <option value="Disponible">Disponible</option>
              <option value="En Alquiler">En Alquiler</option>
              <option value="Mantenimiento">Mantenimiento</option>
            </select>
          </div>

          {/* Filtro Piso */}
          <div className="flex items-center gap-1.5 bg-[#ded8cc] dark:bg-slate-800 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Layers className="w-3.5 h-3.5 text-[#7d776f] dark:text-slate-400" />
            <select
              value={filtroPiso}
              onChange={(e) => setFiltroPiso(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-bold"
            >
              <option value="Todos">Piso: Todos</option>
              <option value="1">Piso 1</option>
              <option value="2">Piso 2</option>
              <option value="3">Piso 3</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLA DE DEPARTAMENTOS */}
      <div className="rounded-2xl bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/70 dark:bg-slate-800/70 text-[11px] font-bold uppercase tracking-wider text-[#7d776f] dark:text-slate-400">
                <th className="py-3.5 px-4">Depto / Piso</th>
                <th className="py-3.5 px-4">Superficie & Alícuota</th>
                <th className="py-3.5 px-4">Propietario / Titular</th>
                <th className="py-3.5 px-4">Parqueo & Baulera</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cec8bc]/50 dark:divide-slate-800/60">
              {deptosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#7d776f] dark:text-slate-500">
                    No se encontraron departamentos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                deptosFiltrados.map((depto) => (
                  <tr
                    key={depto.id}
                    className="hover:bg-[#e4ded4]/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-700/15 text-blue-900 dark:bg-indigo-600/20 dark:text-indigo-300 font-extrabold flex items-center justify-center border border-blue-600/30 text-xs">
                          {depto.numero}
                        </div>
                        <div>
                          <div className="font-bold text-[#262422] dark:text-white text-sm">
                            Dpto {depto.numero}
                          </div>
                          <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                            Piso {depto.piso} • Torre A
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#262422] dark:text-slate-200 font-mono">
                        {depto.areaM2} m²
                      </div>
                      <div className="text-[10px] text-blue-700 dark:text-indigo-400 font-semibold flex items-center gap-0.5">
                        <Percent className="w-3 h-3" />
                        Alícuota: {depto.alicuota || ((depto.areaM2 / 2650) * 100).toFixed(2)}%
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {depto.propietario ? (
                        <div>
                          <div className="font-bold text-[#262422] dark:text-white flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-blue-700 dark:text-indigo-400" />
                            {depto.propietario.nombre}
                          </div>
                          <div className="text-[11px] text-[#7d776f] dark:text-slate-400 font-mono">
                            CI: {depto.propietario.ci} • {depto.propietario.telefono}
                          </div>
                          {depto.inquilinoActual && (
                            <div className="text-[10px] text-purple-800 dark:text-purple-300 font-semibold mt-0.5">
                              Inquilino: {depto.inquilinoActual.nombre}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#7d776f] dark:text-slate-500 italic">
                          Sin propietario asignado
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 text-[11px]">
                        <span className="flex items-center gap-1 text-[#262422] dark:text-slate-300 font-medium">
                          <Car className="w-3.5 h-3.5 text-[#7d776f]" />
                          {depto.parqueo}
                        </span>
                        <span className="flex items-center gap-1 text-[#262422] dark:text-slate-300 font-medium">
                          <Box className="w-3.5 h-3.5 text-[#7d776f]" />
                          {depto.baulera}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          depto.estado === 'Ocupado'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : depto.estado === 'Disponible'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                              : depto.estado === 'En Alquiler'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}
                      >
                        {depto.estado}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setDeptoToEdit({ ...depto })
                            setIsEditModalOpen(true)
                          }}
                          className="p-1.5 rounded-lg text-[#5c5750] hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Editar Departamento"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedDepto(depto)}
                          className="p-1.5 rounded-lg text-[#5c5750] hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Ver Ficha Técnica"
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

      {/* MODALES MODULARES */}
      <CrearDepartamentoModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        totalAreaConstruida={totalAreaConstruida}
      />

      <EditarDepartamentoModal
        isOpen={isEditModalOpen}
        depto={deptoToEdit}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={handleUpdateSubmit}
        onChange={(d) => setDeptoToEdit(d)}
      />

      <FichaTecnicaModal
        isOpen={!!selectedDepto}
        depto={selectedDepto}
        onClose={() => setSelectedDepto(null)}
      />
    </div>
  )
}
