// frontend/app/(admin)/departamentos/page.tsx
// Módulo de Gestión de Departamentos y Unidades Habitacionales
// Control de pisos, áreas m2, asignación de propietarios, parqueos y bauleras

'use client'

import React, { useState, useMemo } from 'react'
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
  ArrowRight
} from 'lucide-react'

export interface DepartamentoItem {
  id: number
  numero: string
  piso: number
  areaM2: number
  estado: 'Ocupado' | 'Disponible' | 'En Alquiler' | 'Mantenimiento'
  propietario: {
    id: number
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
}

const DEPARTAMENTOS_INICIALES: DepartamentoItem[] = [
  {
    id: 1,
    numero: '101',
    piso: 1,
    areaM2: 110.5,
    estado: 'Ocupado',
    propietario: {
      id: 1,
      nombre: 'Carlos Mendoza Rojas',
      ci: '4829103 CBBA',
      telefono: '+591 71234567',
      correo: 'carlos.mendoza@email.com'
    },
    parqueo: 'P-01 (Subsuelo 1)',
    baulera: 'B-01'
  },
  {
    id: 2,
    numero: '102',
    piso: 1,
    areaM2: 85.0,
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
    baulera: 'Sin baulera'
  },
  {
    id: 3,
    numero: '201',
    piso: 2,
    areaM2: 125.0,
    estado: 'Ocupado',
    propietario: {
      id: 3,
      nombre: 'Alejandro Vargas Morales',
      ci: '3948120 LPZ',
      telefono: '+591 67123980',
      correo: 'alejandro.vargas@email.com'
    },
    parqueo: 'P-05 (Subsuelo 2)',
    baulera: 'B-03'
  },
  {
    id: 4,
    numero: '202',
    piso: 2,
    areaM2: 95.0,
    estado: 'Disponible',
    propietario: {
      id: 4,
      nombre: 'Valeria Torrico Camacho',
      ci: '6129841 CBBA',
      telefono: '+591 75432198',
      correo: 'valeria.torrico@email.com'
    },
    parqueo: 'Sin parqueo',
    baulera: 'B-04'
  },
  {
    id: 5,
    numero: '301',
    piso: 3,
    areaM2: 140.0,
    estado: 'En Alquiler',
    propietario: {
      id: 5,
      nombre: 'Fernando Castro Ortiz',
      ci: '4918230 CBBA',
      telefono: '+591 72198450',
      correo: 'fernando.castro@email.com'
    },
    parqueo: 'P-08 (Subsuelo 1)',
    baulera: 'B-07'
  },
  {
    id: 6,
    numero: '302',
    piso: 3,
    areaM2: 88.5,
    estado: 'Mantenimiento',
    propietario: null,
    parqueo: 'Sin parqueo',
    baulera: 'Sin baulera'
  }
]

export default function DepartamentosPage() {
  const [departamentos, setDepartamentos] = useState<DepartamentoItem[]>(DEPARTAMENTOS_INICIALES)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [filtroPiso, setFiltroPiso] = useState('Todos')

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedDepto, setSelectedDepto] = useState<DepartamentoItem | null>(null)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)

  // Formulario Nueva Unidad
  const [nuevoNumero, setNuevoNumero] = useState('')
  const [nuevoPiso, setNuevoPiso] = useState(1)
  const [nuevaArea, setNuevaArea] = useState(100)
  const [nuevoParqueo, setNuevoParqueo] = useState('Sin parqueo')
  const [nuevaBaulera, setNuevaBaulera] = useState('Sin baulera')
  const [nuevoPropietarioNombre, setNuevoPropietarioNombre] = useState('')
  const [nuevoPropietarioCi, setNuevoPropietarioCi] = useState('')
  const [nuevoPropietarioTel, setNuevoPropietarioTel] = useState('')
  const [nuevoEstado, setNuevoEstado] = useState<'Ocupado' | 'Disponible' | 'En Alquiler'>(
    'Ocupado'
  )

  // Filtrado
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

  // Contadores
  const totalDeptos = departamentos.length
  const ocupados = departamentos.filter((d) => d.estado === 'Ocupado').length
  const disponibles = departamentos.filter(
    (d) => d.estado === 'Disponible' || d.estado === 'En Alquiler'
  ).length
  const conParqueo = departamentos.filter((d) => d.parqueo !== 'Sin parqueo').length

  const handleCrearDepartamento = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoNumero.trim()) return

    const nuevo: DepartamentoItem = {
      id: Date.now(),
      numero: nuevoNumero.trim(),
      piso: Number(nuevoPiso),
      areaM2: Number(nuevaArea),
      estado: nuevoEstado,
      parqueo: nuevoParqueo,
      baulera: nuevaBaulera,
      propietario: nuevoPropietarioNombre.trim()
        ? {
            id: Date.now() + 1,
            nombre: nuevoPropietarioNombre.trim(),
            ci: nuevoPropietarioCi.trim() || 'S/CI',
            telefono: nuevoPropietarioTel.trim() || 'S/Telf',
            correo: `${nuevoNumero.trim().toLowerCase()}@edificioxyz.com`
          }
        : null
    }

    setDepartamentos([nuevo, ...departamentos])
    setIsCreateModalOpen(false)
    // Limpiar
    setNuevoNumero('')
    setNuevoPropietarioNombre('')
    setNuevoPropietarioCi('')
    setNuevoPropietarioTel('')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-400 text-xs font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Control de Inmuebles & Unidades
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Departamentos y Unidades
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Registro catastral interno, áreas en m², asignación de titulares, parqueos y bauleras.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-800/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Registrar Nueva Unidad
        </button>
      </div>

      {/* TARJETAS KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Total Unidades</span>
            <Home className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-[#262422] dark:text-white">{totalDeptos}</div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Departamentos registrados
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Ocupados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
            {ocupados}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Con residentes habituales
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Disponibles / Alquiler</span>
            <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-400">{disponibles}</div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">Libres o en oferta</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Parqueos Asignados</span>
            <Car className="w-4 h-4 text-purple-700 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-400">
            {conParqueo}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Unidades vehiculares
          </span>
        </div>
      </div>

      {/* BUSCADOR Y FILTROS */}
      <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nro de dpto, propietario o CI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Estado */}
          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#7d776f] dark:text-slate-400" />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
            >
              <option value="Todos">Estado: Todos</option>
              <option value="Ocupado">Ocupado</option>
              <option value="Disponible">Disponible</option>
              <option value="En Alquiler">En Alquiler</option>
              <option value="Mantenimiento">Mantenimiento</option>
            </select>
          </div>

          {/* Filtro Piso */}
          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Layers className="w-3.5 h-3.5 text-[#7d776f] dark:text-slate-400" />
            <select
              value={filtroPiso}
              onChange={(e) => setFiltroPiso(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
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
      <div className="rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#e3ded4] dark:bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-[#5c5750] dark:text-slate-400">
                <th className="py-3 px-4">Depto / Piso</th>
                <th className="py-3 px-4">Superficie</th>
                <th className="py-3 px-4">Propietario / Titular</th>
                <th className="py-3 px-4">Parqueo & Baulera</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cec8bc]/60 dark:divide-slate-800 text-xs">
              {deptosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#7d776f] dark:text-slate-500">
                    No se encontraron departamentos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                deptosFiltrados.map((depto) => (
                  <tr
                    key={depto.id}
                    className="hover:bg-[#e6e1d6]/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-700/10 text-blue-800 dark:bg-indigo-600/20 dark:text-indigo-300 font-bold flex items-center justify-center border border-blue-600/20">
                          {depto.numero}
                        </div>
                        <div>
                          <div className="font-bold text-[#262422] dark:text-white">
                            Dpto {depto.numero}
                          </div>
                          <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                            Piso {depto.piso}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#262422] dark:text-slate-200">
                      {depto.areaM2} m²
                    </td>
                    <td className="py-3 px-4">
                      {depto.propietario ? (
                        <div>
                          <div className="font-bold text-[#262422] dark:text-white flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-blue-700 dark:text-indigo-400" />
                            {depto.propietario.nombre}
                          </div>
                          <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
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
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 text-[11px]">
                        <span className="flex items-center gap-1 text-[#4a4641] dark:text-slate-300 font-medium">
                          <Car className="w-3.5 h-3.5 text-[#7d776f]" />
                          {depto.parqueo}
                        </span>
                        <span className="flex items-center gap-1 text-[#4a4641] dark:text-slate-300 font-medium">
                          <Box className="w-3.5 h-3.5 text-[#7d776f]" />
                          {depto.baulera}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          depto.estado === 'Ocupado'
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                            : depto.estado === 'Disponible'
                              ? 'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30'
                              : depto.estado === 'En Alquiler'
                                ? 'bg-purple-100 text-purple-900 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30'
                                : 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                        }`}
                      >
                        {depto.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedDepto(depto)}
                        className="p-1.5 rounded-lg text-[#5c5750] hover:text-[#262422] hover:bg-[#ded8cc] dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Ver Ficha Técnica"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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
          <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-lg text-[#262422] dark:text-white">
                Registrar Nueva Unidad
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearDepartamento} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Nro Departamento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 401"
                    value={nuevoNumero}
                    onChange={(e) => setNuevoNumero(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Piso *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={nuevoPiso}
                    onChange={(e) => setNuevoPiso(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Área (m²) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={nuevaArea}
                    onChange={(e) => setNuevaArea(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Estado
                  </label>
                  <select
                    value={nuevoEstado}
                    onChange={(e) => setNuevoEstado(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="Ocupado">Ocupado</option>
                    <option value="Disponible">Disponible</option>
                    <option value="En Alquiler">En Alquiler</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Parqueo
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. P-12 o Sin parqueo"
                    value={nuevoParqueo}
                    onChange={(e) => setNuevoParqueo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Baulera
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. B-05 o Sin baulera"
                    value={nuevaBaulera}
                    onChange={(e) => setNuevaBaulera(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="border-t border-[#cec8bc] dark:border-slate-800 pt-3 space-y-2">
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300">
                  Datos del Propietario (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Nombre y Apellidos"
                  value={nuevoPropietarioNombre}
                  onChange={(e) => setNuevoPropietarioNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="CI / NIT"
                    value={nuevoPropietarioCi}
                    onChange={(e) => setNuevoPropietarioCi(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <input
                    type="text"
                    placeholder="Teléfono"
                    value={nuevoPropietarioTel}
                    onChange={(e) => setNuevoPropietarioTel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-semibold text-[#262422] dark:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-xs font-bold text-white shadow-md cursor-pointer"
                >
                  Guardar Departamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FICHA TÉCNICA */}
      {selectedDepto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-700 dark:bg-indigo-600 text-white flex items-center justify-center font-bold">
                  {selectedDepto.numero}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#262422] dark:text-white">
                    Ficha Técnica Dpto {selectedDepto.numero}
                  </h3>
                  <p className="text-xs text-[#7d776f] dark:text-slate-400">
                    Piso {selectedDepto.piso} • {selectedDepto.areaM2} m²
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDepto(null)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 space-y-1.5">
                <span className="font-bold text-[#383430] dark:text-slate-300 block uppercase tracking-wider text-[10px]">
                  Titular Registrado
                </span>
                {selectedDepto.propietario ? (
                  <>
                    <div className="text-sm font-extrabold text-[#262422] dark:text-white">
                      {selectedDepto.propietario.nombre}
                    </div>
                    <div className="text-[#5c5750] dark:text-slate-400">
                      CI: {selectedDepto.propietario.ci}
                    </div>
                    <div className="text-[#5c5750] dark:text-slate-400">
                      Tel: {selectedDepto.propietario.telefono}
                    </div>
                    <div className="text-[#5c5750] dark:text-slate-400">
                      Email: {selectedDepto.propietario.correo}
                    </div>
                  </>
                ) : (
                  <div className="text-[#7d776f] dark:text-slate-500 italic">
                    Unidad disponible sin titular asignado
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-[#7d776f] block">
                    Espacio de Parqueo
                  </span>
                  <span className="font-bold text-[#262422] dark:text-white text-xs">
                    {selectedDepto.parqueo}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-[#7d776f] block">
                    Baulera Asignada
                  </span>
                  <span className="font-bold text-[#262422] dark:text-white text-xs">
                    {selectedDepto.baulera}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#cec8bc] dark:border-slate-800">
              <button
                onClick={() => setSelectedDepto(null)}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold cursor-pointer"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
