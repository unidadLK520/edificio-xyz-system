// frontend/app/(admin)/departamentos/page.tsx
// HU 4: Módulo de Gestión de Departamentos y Catastro de Unidades Habitacionales
// Control de pisos, áreas m2, alícuotas (%), asignación de propietarios, parqueos y bauleras

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Building2,
  Home,
  Car,
  Box,
  Users,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit,
  UserCheck,
  X,
  Phone,
  Mail,
  Layers,
  ArrowRight,
  Printer,
  FileSpreadsheet,
  ShieldCheck,
  Clock,
  Sparkles,
  Percent
} from 'lucide-react'

export interface DepartamentoItem {
  id: number
  numero: string
  piso: number
  areaM2: number
  alicuota?: number
  estado: 'Ocupado' | 'Disponible' | 'En Alquiler' | 'Mantenimiento'
  propietario: {
    id?: number
    nombre: string
    ci: string
    telefono: string
    correo: string
  } | null
  inquilinoActual?: {
    nombre: string
    telefono: string
  } | null
  parqueo: string
  baulera: string
  fechaRegistro?: string
  historialOcupantes?: Array<{
    periodo: string
    residente: string
    tipo: 'Propietario' | 'Inquilino'
  }>
}

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
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [filtroPiso, setFiltroPiso] = useState('Todos')

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedDepto, setSelectedDepto] = useState<DepartamentoItem | null>(null)
  const [deptoToEdit, setDeptoToEdit] = useState<DepartamentoItem | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Formulario Nueva Unidad
  const [formData, setFormData] = useState({
    numero: '',
    piso: 1,
    areaM2: 100,
    alicuota: 3.75,
    parqueo: 'P-09',
    baulera: 'B-08',
    propietarioNombre: '',
    propietarioCi: '',
    propietarioTel: '',
    propietarioCorreo: '',
    estado: 'Ocupado' as 'Ocupado' | 'Disponible' | 'En Alquiler' | 'Mantenimiento'
  })

  // Fetch inicial desde API
  const fetchDepartamentos = useCallback(async () => {
    try {
      setLoading(true)
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
      // Si el backend no responde, el fallback local ya tiene los datos iniciales
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDepartamentos()
  }, [fetchDepartamentos])

  // Superficie total construida estimada
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

  const handleCrearDepartamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.numero.trim()) return

    // Calcular alícuota automática proporcional si no se especifica
    const alicuotaCalc = Number(
      ((Number(formData.areaM2) / (totalAreaConstruida + Number(formData.areaM2))) * 100).toFixed(2)
    )

    const nuevo: DepartamentoItem = {
      id: Date.now(),
      numero: formData.numero.trim(),
      piso: Number(formData.piso),
      areaM2: Number(formData.areaM2),
      alicuota: alicuotaCalc || formData.alicuota,
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

    // Reset
    setFormData({
      numero: '',
      piso: 1,
      areaM2: 100,
      alicuota: 3.75,
      parqueo: 'Sin parqueo',
      baulera: 'Sin baulera',
      propietarioNombre: '',
      propietarioCi: '',
      propietarioTel: '',
      propietarioCorreo: '',
      estado: 'Ocupado'
    })
  }

  const handleUpdateDepartamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deptoToEdit) return

    try {
      await fetch(`/api/v1/departamentos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deptoToEdit)
      })
    } catch {}

    setDepartamentos(departamentos.map((d) => (d.id === deptoToEdit.id ? deptoToEdit : d)))
    setIsEditModalOpen(false)
    showToast(`¡Datos del Departamento ${deptoToEdit.numero} actualizados!`)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Notificación Toast */}
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

      {/* TARJETAS KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400 mb-1">
            <span>Total Unidades</span>
            <Home className="w-4 h-4 text-blue-700 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-[#262422] dark:text-white">{totalDeptos}</div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500 font-mono">
            {totalAreaConstruida.toFixed(1)} m² construidos
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400 mb-1">
            <span>Ocupados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-800 dark:text-emerald-400">
            {ocupados}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            {((ocupados / (totalDeptos || 1)) * 100).toFixed(0)}% nivel de ocupación
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400 mb-1">
            <span>Disponibles / Alquiler</span>
            <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-800 dark:text-amber-400">
            {disponibles}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Listos para habitar
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7d776f] dark:text-slate-400 mb-1">
            <span>Parqueos Asignados</span>
            <Car className="w-4 h-4 text-purple-700 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-800 dark:text-purple-400">
            {conParqueo}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Espacios vehiculares
          </span>
        </div>
      </div>

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

      {/* MODAL CREAR DEPARTAMENTO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-700 dark:text-indigo-400" />
                <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                  Registrar Nueva Unidad Habitacional
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearDepartamento} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Nro Departamento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 401"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Piso *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={formData.piso}
                    onChange={(e) => setFormData({ ...formData, piso: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Área Construida (m²) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={formData.areaM2}
                    onChange={(e) => setFormData({ ...formData, areaM2: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Estado de Ocupación
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="Ocupado">Ocupado</option>
                    <option value="Disponible">Disponible</option>
                    <option value="En Alquiler">En Alquiler</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Parqueo Asignado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. P-12 o Sin parqueo"
                    value={formData.parqueo}
                    onChange={(e) => setFormData({ ...formData, parqueo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Baulera Asignada
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. B-05 o Sin baulera"
                    value={formData.baulera}
                    onChange={(e) => setFormData({ ...formData, baulera: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="border-t border-[#cec8bc] dark:border-slate-800 pt-3 space-y-2">
                <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300">
                  Datos del Propietario Titular (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Nombre completo y apellidos"
                  value={formData.propietarioNombre}
                  onChange={(e) => setFormData({ ...formData, propietarioNombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="CI / NIT"
                    value={formData.propietarioCi}
                    onChange={(e) => setFormData({ ...formData, propietarioCi: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Teléfono / Celular"
                    value={formData.propietarioTel}
                    onChange={(e) => setFormData({ ...formData, propietarioTel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-xs font-bold text-white shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Guardar Departamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR DEPARTAMENTO */}
      {isEditModalOpen && deptoToEdit && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-700 dark:text-indigo-400" />
                <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                  Editar Departamento {deptoToEdit.numero}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDepartamento} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Superficie (m²)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={deptoToEdit.areaM2}
                    onChange={(e) =>
                      setDeptoToEdit({ ...deptoToEdit, areaM2: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Estado
                  </label>
                  <select
                    value={deptoToEdit.estado}
                    onChange={(e) =>
                      setDeptoToEdit({ ...deptoToEdit, estado: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="Ocupado">Ocupado</option>
                    <option value="Disponible">Disponible</option>
                    <option value="En Alquiler">En Alquiler</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Parqueo
                  </label>
                  <input
                    type="text"
                    value={deptoToEdit.parqueo}
                    onChange={(e) => setDeptoToEdit({ ...deptoToEdit, parqueo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Baulera
                  </label>
                  <input
                    type="text"
                    value={deptoToEdit.baulera}
                    onChange={(e) => setDeptoToEdit({ ...deptoToEdit, baulera: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-indigo-600 text-xs font-bold text-white shadow-md transition-all active:scale-95"
                >
                  Actualizar Datos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FICHA TÉCNICA */}
      {selectedDepto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-700 dark:bg-indigo-600 text-white flex items-center justify-center font-black">
                  {selectedDepto.numero}
                </div>
                <div>
                  <h3 className="font-black text-base text-[#262422] dark:text-white">
                    Ficha Técnica Inmobiliaria — Dpto {selectedDepto.numero}
                  </h3>
                  <p className="text-xs text-[#7d776f] dark:text-slate-400">
                    Piso {selectedDepto.piso} • {selectedDepto.areaM2} m² • Alícuota:{' '}
                    <span className="font-bold text-blue-700 dark:text-indigo-400">
                      {selectedDepto.alicuota || ((selectedDepto.areaM2 / 2650) * 100).toFixed(2)}%
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDepto(null)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Titular */}
              <div className="p-3.5 rounded-xl bg-[#ded8cc]/70 dark:bg-slate-800/70 border border-[#cec8bc] dark:border-slate-700 space-y-1.5">
                <span className="font-bold text-[#5c5750] dark:text-slate-400 block uppercase tracking-wider text-[10px]">
                  Propietario Titular Registrado
                </span>
                {selectedDepto.propietario ? (
                  <>
                    <div className="text-sm font-extrabold text-[#262422] dark:text-white">
                      {selectedDepto.propietario.nombre}
                    </div>
                    <div className="text-[#5c5750] dark:text-slate-400 font-mono">
                      CI: {selectedDepto.propietario.ci} • Tel: {selectedDepto.propietario.telefono}
                    </div>
                    <div className="text-[#5c5750] dark:text-slate-400">
                      Correo: {selectedDepto.propietario.correo}
                    </div>
                  </>
                ) : (
                  <div className="text-[#7d776f] dark:text-slate-500 italic">
                    Unidad disponible sin titular asignado
                  </div>
                )}
              </div>

              {/* Inquilino si existe */}
              {selectedDepto.inquilinoActual && (
                <div className="p-3 rounded-xl bg-purple-100/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50">
                  <span className="text-[10px] uppercase font-bold text-purple-900 dark:text-purple-300 block">
                    Inquilino / Residente Actual
                  </span>
                  <div className="font-bold text-[#262422] dark:text-white mt-0.5">
                    {selectedDepto.inquilinoActual.nombre}
                  </div>
                  <div className="text-[11px] text-[#7d776f] dark:text-slate-400 font-mono">
                    Tel: {selectedDepto.inquilinoActual.telefono}
                  </div>
                </div>
              )}

              {/* Amenidades asignadas */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-[#ded8cc]/70 dark:bg-slate-800/70 border border-[#cec8bc] dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-[#7d776f] block">
                    Espacio de Parqueo
                  </span>
                  <span className="font-bold text-[#262422] dark:text-white text-xs">
                    {selectedDepto.parqueo}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#ded8cc]/70 dark:bg-slate-800/70 border border-[#cec8bc] dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-[#7d776f] block">
                    Baulera Asignada
                  </span>
                  <span className="font-bold text-[#262422] dark:text-white text-xs">
                    {selectedDepto.baulera}
                  </span>
                </div>
              </div>

              {/* Historial de ocupación */}
              {selectedDepto.historialOcupantes && selectedDepto.historialOcupantes.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="font-bold text-[#5c5750] dark:text-slate-400 uppercase tracking-wider text-[10px] block">
                    Historial de Ocupantes Anteriores
                  </span>
                  <div className="space-y-1">
                    {selectedDepto.historialOcupantes.map((h, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center p-2 rounded-lg bg-[#dfd9ce]/60 dark:bg-slate-800/40 text-[11px]"
                      >
                        <span className="font-bold text-[#262422] dark:text-white">
                          {h.residente}
                        </span>
                        <span className="text-[#7d776f] dark:text-slate-400 font-mono">
                          {h.periodo} ({h.tipo})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-[#cec8bc] dark:border-slate-800">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs font-bold text-[#5c5750] dark:text-slate-300 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Ficha
              </button>
              <button
                onClick={() => setSelectedDepto(null)}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-colors shadow-md"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
