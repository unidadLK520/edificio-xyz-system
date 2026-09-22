// frontend/app/(admin)/residentes/page.tsx
// Módulo de Administración de Copropietarios: Registro y Lista de Residentes
// Entregables: Dev Frontend 1 (UI Registro) y Dev Frontend 2 (UI Lista)

'use client'

import React, { useState, useMemo } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Home,
  Car,
  Box,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Plus,
  Eye,
  History,
  ShieldCheck,
  Building2,
  Calendar,
  X,
  FileText,
  BadgeCheck
} from 'lucide-react'

interface Copropietario {
  id: number
  nombreCompleto: string
  ci: string
  tipo: 'Propietario' | 'Inquilino'
  deptoNumero: string
  piso: number
  parqueo?: string
  baulera?: string
  telefono: string
  correo: string
  fechaIngreso: string
  estado: 'Activo' | 'Inactivo'
  historialOcupacion?: Array<{
    periodo: string
    ocupante: string
    tipo: string
    motivoSalida?: string
  }>
}

const RESIDENTES_INICIALES: Copropietario[] = [
  {
    id: 1,
    nombreCompleto: 'Carlos Mendoza Rojas',
    ci: '4829103 CBBA',
    tipo: 'Propietario',
    deptoNumero: '101',
    piso: 1,
    parqueo: 'P-01',
    baulera: 'B-01',
    telefono: '+591 71234567',
    correo: 'carlos.mendoza@email.com',
    fechaIngreso: '2023-01-15',
    estado: 'Activo',
    historialOcupacion: [
      { periodo: '2023 - Presente', ocupante: 'Carlos Mendoza Rojas', tipo: 'Propietario' },
      {
        periodo: '2020 - 2022',
        ocupante: 'Juan Pérez García',
        tipo: 'Inquilino',
        motivoSalida: 'Fin de contrato'
      }
    ]
  },
  {
    id: 2,
    nombreCompleto: 'Mariana Flores Soliz',
    ci: '5920144 SCZ',
    tipo: 'Inquilino',
    deptoNumero: '102',
    piso: 1,
    parqueo: 'P-02',
    baulera: 'Sin baulera',
    telefono: '+591 79876543',
    correo: 'mariana.flores@email.com',
    fechaIngreso: '2024-03-01',
    estado: 'Activo',
    historialOcupacion: [
      { periodo: '2024 - Presente', ocupante: 'Mariana Flores Soliz', tipo: 'Inquilino' },
      {
        periodo: '2021 - 2024',
        ocupante: 'Roberto Gómez',
        tipo: 'Inquilino',
        motivoSalida: 'Traslado laboral'
      }
    ]
  },
  {
    id: 3,
    nombreCompleto: 'Alejandro Vargas Morales',
    ci: '3948120 LPZ',
    tipo: 'Propietario',
    deptoNumero: '201',
    piso: 2,
    parqueo: 'P-05',
    baulera: 'B-03',
    telefono: '+591 67123980',
    correo: 'alejandro.vargas@email.com',
    fechaIngreso: '2022-06-10',
    estado: 'Activo',
    historialOcupacion: [
      { periodo: '2022 - Presente', ocupante: 'Alejandro Vargas Morales', tipo: 'Propietario' }
    ]
  },
  {
    id: 4,
    nombreCompleto: 'Valeria Torrico Camacho',
    ci: '6129841 CBBA',
    tipo: 'Propietario',
    deptoNumero: '202',
    piso: 2,
    parqueo: 'Sin parqueo',
    baulera: 'B-04',
    telefono: '+591 75432198',
    correo: 'valeria.torrico@email.com',
    fechaIngreso: '2021-11-20',
    estado: 'Inactivo',
    historialOcupacion: [
      {
        periodo: '2021 - 2025',
        ocupante: 'Valeria Torrico Camacho',
        tipo: 'Propietario',
        motivoSalida: 'Puesto en alquiler'
      }
    ]
  },
  {
    id: 5,
    nombreCompleto: 'Gabriel Romero Soria',
    ci: '5319802 CBBA',
    tipo: 'Inquilino',
    deptoNumero: '301',
    piso: 3,
    parqueo: 'P-08',
    baulera: 'B-07',
    telefono: '+591 70192834',
    correo: 'gabriel.romero@email.com',
    fechaIngreso: '2024-08-01',
    estado: 'Activo',
    historialOcupacion: [
      { periodo: '2024 - Presente', ocupante: 'Gabriel Romero Soria', tipo: 'Inquilino' }
    ]
  }
]

export default function ResidentesPage() {
  const [residentes, setResidentes] = useState<Copropietario[]>(RESIDENTES_INICIALES)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | 'Propietario' | 'Inquilino'>('Todos')
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | 'Activo' | 'Inactivo'>('Todos')

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedResidenteHistory, setSelectedResidenteHistory] = useState<Copropietario | null>(
    null
  )

  // Formulario de nuevo copropietario
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    ci: '',
    tipo: 'Propietario' as 'Propietario' | 'Inquilino',
    deptoNumero: '',
    piso: 1,
    parqueo: '',
    baulera: '',
    telefono: '',
    correo: '',
    fechaIngreso: new Date().toISOString().split('T')[0]
  })

  const [formSuccess, setFormSuccess] = useState(false)

  // Filtrado reactivo
  const residentesFiltrados = useMemo(() => {
    return residentes.filter((r) => {
      const matchSearch =
        r.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.ci.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.deptoNumero.includes(searchTerm) ||
        r.telefono.includes(searchTerm) ||
        r.correo.toLowerCase().includes(searchTerm.toLowerCase())

      const matchTipo = filtroTipo === 'Todos' || r.tipo === filtroTipo
      const matchEstado = filtroEstado === 'Todos' || r.estado === filtroEstado

      return matchSearch && matchTipo && matchEstado
    })
  }, [residentes, searchTerm, filtroTipo, filtroEstado])

  // Contadores métricos
  const totalResidentes = residentes.length
  const totalPropietarios = residentes.filter((r) => r.tipo === 'Propietario').length
  const totalInquilinos = residentes.filter((r) => r.tipo === 'Inquilino').length
  const totalActivos = residentes.filter((r) => r.estado === 'Activo').length

  const handleCreateCopropietario = (e: React.FormEvent) => {
    e.preventDefault()
    const nuevo: Copropietario = {
      id: Date.now(),
      nombreCompleto: formData.nombreCompleto,
      ci: formData.ci,
      tipo: formData.tipo,
      deptoNumero: formData.deptoNumero,
      piso: Number(formData.piso) || 1,
      parqueo: formData.parqueo ? `P-${formData.parqueo}` : 'Sin parqueo',
      baulera: formData.baulera ? `B-${formData.baulera}` : 'Sin baulera',
      telefono: formData.telefono,
      correo: formData.correo,
      fechaIngreso: formData.fechaIngreso,
      estado: 'Activo',
      historialOcupacion: [
        {
          periodo: `${new Date().getFullYear()} - Presente`,
          ocupante: formData.nombreCompleto,
          tipo: formData.tipo
        }
      ]
    }

    setResidentes([nuevo, ...residentes])
    setFormSuccess(true)
    setTimeout(() => {
      setFormSuccess(false)
      setIsModalOpen(false)
      setFormData({
        nombreCompleto: '',
        ci: '',
        tipo: 'Propietario',
        deptoNumero: '',
        piso: 1,
        parqueo: '',
        baulera: '',
        telefono: '',
        correo: '',
        fechaIngreso: new Date().toISOString().split('T')[0]
      })
    }, 800)
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Encabezado del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#262422] dark:text-white tracking-tight">
            Directorio de Residentes e Inmuebles
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Gestión de propietarios, inquilinos, asignación de unidades y trazabilidad histórica.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-800/20 active:scale-95 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Registrar Copropietario / Inquilino
        </button>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Total Residentes</span>
            <Users className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-[#262422] dark:text-white">{totalResidentes}</div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            {totalActivos} activos en el edificio
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Propietarios</span>
            <ShieldCheck className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-300">
            {totalPropietarios}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Titulares de unidades
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Inquilinos</span>
            <Home className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">
            {totalInquilinos}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Arrendatarios vigentes
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Unidades Asignadas</span>
            <Building2 className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-800 dark:text-amber-400">
            {totalActivos} / 24
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Departamentos ocupados
          </span>
        </div>
      </div>

      {/* Controles de Búsqueda y Filtros */}
      <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
        {/* Barra de Búsqueda */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre, CI, departamento, teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-[#ede9e1] dark:focus:bg-slate-950 transition-all"
          />
        </div>

        {/* Filtros Dropdowns */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#7d776f] dark:text-slate-400" />
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
            >
              <option value="Todos">Tipo: Todos</option>
              <option value="Propietario">Propietarios</option>
              <option value="Inquilino">Inquilinos</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
            >
              <option value="Todos">Estado: Todos</option>
              <option value="Activo">Activos</option>
              <option value="Inactivo">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* UI Lista de Copropietarios (Tabla y Cards) */}
      <div className="rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#e3ded4] dark:bg-slate-950 text-xs font-semibold text-[#5c5750] dark:text-slate-400">
                <th className="py-3.5 px-4">Residente</th>
                <th className="py-3.5 px-4">Depto / Inmueble</th>
                <th className="py-3.5 px-4">Parqueo / Baulera</th>
                <th className="py-3.5 px-4">Contacto</th>
                <th className="py-3.5 px-4">Ingreso</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-right">Historial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cec8bc]/70 dark:divide-slate-800">
              {residentesFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-[#7d776f] dark:text-slate-500 text-sm"
                  >
                    No se encontraron copropietarios con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                residentesFiltrados.map((residente) => (
                  <tr
                    key={residente.id}
                    className="hover:bg-[#e4dfd5] dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Residente */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#d6cfc3] dark:bg-blue-950 flex items-center justify-center text-xs font-bold text-blue-900 dark:text-blue-300">
                          {residente.nombreCompleto.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-[#262422] dark:text-white block">
                            {residente.nombreCompleto}
                          </span>
                          <span className="text-xs text-[#66615b] dark:text-slate-400">
                            CI: {residente.ci}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Depto */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-blue-900 dark:text-blue-300 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-800/50 text-xs">
                          Dpto {residente.deptoNumero}
                        </span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                            residente.tipo === 'Propietario'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                          }`}
                        >
                          {residente.tipo}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#7d776f] dark:text-slate-500 block mt-0.5">
                        Piso {residente.piso}
                      </span>
                    </td>

                    {/* Parqueo / Baulera */}
                    <td className="py-3.5 px-4 text-xs">
                      <div className="flex items-center gap-1 text-[#383430] dark:text-slate-300">
                        <Car className="w-3.5 h-3.5 text-[#7d776f]" />
                        <span>{residente.parqueo}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[#66615b] dark:text-slate-400 mt-0.5">
                        <Box className="w-3.5 h-3.5 text-[#7d776f]" />
                        <span>{residente.baulera}</span>
                      </div>
                    </td>

                    {/* Contacto */}
                    <td className="py-3.5 px-4 text-xs">
                      <div className="flex items-center gap-1.5 text-[#262422] dark:text-slate-200">
                        <Phone className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                        <span>{residente.telefono}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#66615b] dark:text-slate-400 mt-0.5">
                        <Mail className="w-3.5 h-3.5 text-[#7d776f]" />
                        <span>{residente.correo}</span>
                      </div>
                    </td>

                    {/* Fecha de Ingreso */}
                    <td className="py-3.5 px-4 text-xs text-[#5c5750] dark:text-slate-400">
                      {residente.fechaIngreso}
                    </td>

                    {/* Estado */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          residente.estado === 'Activo'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800/50'
                            : 'bg-stone-200 text-stone-700 border border-stone-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {residente.estado === 'Activo' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle className="w-3 h-3 text-stone-500" />
                        )}
                        {residente.estado}
                      </span>
                    </td>

                    {/* Botón Historial */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedResidenteHistory(residente)}
                        className="p-1.5 rounded-lg bg-[#dfd9ce] hover:bg-[#d5cebf] dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-400 transition-colors inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
                        title="Ver historial de ocupantes"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Historial</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: UI Registro de Copropietarios / Inquilinos (Dev Frontend 1) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-[#7d776f] hover:text-[#262422] dark:hover:text-white hover:bg-[#dfd9ce] dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-800/20">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#262422] dark:text-white">
                  Registrar Nuevo Copropietario
                </h2>
                <p className="text-xs text-[#66615b] dark:text-slate-400">
                  Completa los datos del residente y asignación de inmueble.
                </p>
              </div>
            </div>

            {formSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                ¡Copropietario registrado exitosamente!
              </div>
            )}

            <form onSubmit={handleCreateCopropietario} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#383430] dark:text-slate-300 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombreCompleto}
                  onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
                  placeholder="Ej. Roberto Arce Balderrama"
                  className="w-full px-3.5 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-sm text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-[#ede9e1]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#383430] dark:text-slate-300 mb-1">
                    C.I. / Documento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ci}
                    onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
                    placeholder="Ej. 5123980 CBBA"
                    className="w-full px-3.5 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-sm text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-[#ede9e1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#383430] dark:text-slate-300 mb-1">
                    Tipo de Ocupante *
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-sm text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  >
                    <option value="Propietario">Propietario</option>
                    <option value="Inquilino">Inquilino</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#383430] dark:text-slate-300 mb-1">
                    Número de Departamento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.deptoNumero}
                    onChange={(e) => setFormData({ ...formData, deptoNumero: e.target.value })}
                    placeholder="Ej. 402"
                    className="w-full px-3.5 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-sm text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-[#ede9e1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#383430] dark:text-slate-300 mb-1">
                    Piso
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.piso}
                    onChange={(e) => setFormData({ ...formData, piso: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-sm text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-[#ede9e1]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#383430] dark:text-slate-300 mb-1">
                    Parqueo Asignado
                  </label>
                  <input
                    type="text"
                    value={formData.parqueo}
                    onChange={(e) => setFormData({ ...formData, parqueo: e.target.value })}
                    placeholder="Ej. 10 (se guardará como P-10)"
                    className="w-full px-3.5 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-sm text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-[#ede9e1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#383430] dark:text-slate-300 mb-1">
                    Baulera Asignada
                  </label>
                  <input
                    type="text"
                    value={formData.baulera}
                    onChange={(e) => setFormData({ ...formData, baulera: e.target.value })}
                    placeholder="Ej. 08 (se guardará como B-08)"
                    className="w-full px-3.5 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-sm text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-[#ede9e1]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#383430] dark:text-slate-300 mb-1">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="+591 7XXXXXXX"
                    className="w-full px-3.5 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-sm text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-[#ede9e1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#383430] dark:text-slate-300 mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    placeholder="residente@email.com"
                    className="w-full px-3.5 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-sm text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-[#ede9e1]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs font-semibold text-[#5c5750] dark:text-slate-300 hover:bg-[#dfd9ce] dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-800/20 active:scale-95 transition-all"
                >
                  Guardar Residente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Historial de Ocupantes por Departamento (Requisito RFP) */}
      {selectedResidenteHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              type="button"
              onClick={() => setSelectedResidenteHistory(null)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-[#7d776f] hover:text-[#262422] dark:hover:text-white hover:bg-[#dfd9ce] dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow-md shadow-purple-800/20">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#262422] dark:text-white">
                  Historial de Ocupación · Depto {selectedResidenteHistory.deptoNumero}
                </h2>
                <p className="text-xs text-[#66615b] dark:text-slate-400">
                  Trazabilidad de ocupantes y arrendatarios de la unidad.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {selectedResidenteHistory.historialOcupacion?.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-[#262422] dark:text-white">
                        {item.ocupante}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 font-semibold">
                        {item.tipo}
                      </span>
                    </div>
                    {item.motivoSalida && (
                      <p className="text-xs text-[#66615b] dark:text-slate-400">
                        Motivo salida: {item.motivoSalida}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-[#5c5750] dark:text-slate-400 shrink-0">
                    {item.periodo}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-[#cec8bc] dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedResidenteHistory(null)}
                className="px-4 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-semibold text-[#383430] dark:text-white hover:bg-[#d5cebf] transition-colors"
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
