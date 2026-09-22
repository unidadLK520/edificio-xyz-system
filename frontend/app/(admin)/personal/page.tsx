// frontend/app/(admin)/personal/page.tsx
// Módulo de Gestión de Personal, Conserjería y Mantenimiento

'use client'

import React, { useState, useMemo } from 'react'
import {
  Users2,
  Shield,
  Clock,
  Phone,
  Mail,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  Calendar,
  X,
  BadgeCheck,
  Wrench,
  Sparkles
} from 'lucide-react'

export interface PersonalItem {
  id: number
  nombreCompleto: string
  ci: string
  cargo: 'Conserje' | 'Seguridad' | 'Limpieza' | 'Técnico de Mantenimiento' | 'Jardinería'
  turno: 'Mañana (06:00 - 14:00)' | 'Tarde (14:00 - 22:00)' | 'Noche (22:00 - 06:00)' | 'Completo'
  telefono: string
  fechaIngreso: string
  estado: 'En Turno' | 'Franco / Descanso' | 'Vacaciones' | 'Inactivo'
  contactoEmergencia: string
}

const PERSONAL_INICIAL: PersonalItem[] = [
  {
    id: 1,
    nombreCompleto: 'Eusebio Mamani Quispe',
    ci: '3829104 CBBA',
    cargo: 'Conserje',
    turno: 'Mañana (06:00 - 14:00)',
    telefono: '+591 76912340',
    fechaIngreso: '2022-03-01',
    estado: 'En Turno',
    contactoEmergencia: 'Esposa: 71209384'
  },
  {
    id: 2,
    nombreCompleto: 'Javier Condori Choque',
    ci: '4910283 LPZ',
    cargo: 'Seguridad',
    turno: 'Noche (22:00 - 06:00)',
    telefono: '+591 68102934',
    fechaIngreso: '2023-08-15',
    estado: 'Franco / Descanso',
    contactoEmergencia: 'Hermano: 77291034'
  },
  {
    id: 3,
    nombreCompleto: 'Rosa Morales Gutierrez',
    ci: '5820194 CBBA',
    cargo: 'Limpieza',
    turno: 'Mañana (06:00 - 14:00)',
    telefono: '+591 79102844',
    fechaIngreso: '2023-01-10',
    estado: 'En Turno',
    contactoEmergencia: 'Hija: 60192834'
  },
  {
    id: 4,
    nombreCompleto: 'Mauricio Siles Rocha',
    ci: '4192083 SCZ',
    cargo: 'Técnico de Mantenimiento',
    turno: 'Completo',
    telefono: '+591 70192837',
    fechaIngreso: '2024-02-01',
    estado: 'En Turno',
    contactoEmergencia: 'Esposa: 73918204'
  }
]

export default function PersonalPage() {
  const [personal, setPersonal] = useState<PersonalItem[]>(PERSONAL_INICIAL)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('Todos')
  const [filtroEstado, setFiltroEstado] = useState('Todos')

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedPersonal, setSelectedPersonal] = useState<PersonalItem | null>(null)

  // Formulario
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoCi, setNuevoCi] = useState('')
  const [nuevoCargo, setNuevoCargo] = useState<PersonalItem['cargo']>('Conserje')
  const [nuevoTurno, setNuevoTurno] = useState<PersonalItem['turno']>('Mañana (06:00 - 14:00)')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [nuevoContactoEmergencia, setNuevoContactoEmergencia] = useState('')

  // Filtrado
  const personalFiltrado = useMemo(() => {
    return personal.filter((p) => {
      const matchSearch =
        p.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.ci.toLowerCase().includes(searchTerm.toLowerCase())
      const matchCargo = filtroCargo === 'Todos' || p.cargo === filtroCargo
      const matchEstado = filtroEstado === 'Todos' || p.estado === filtroEstado
      return matchSearch && matchCargo && matchEstado
    })
  }, [personal, searchTerm, filtroCargo, filtroEstado])

  // Totales
  const totalStaff = personal.length
  const enTurno = personal.filter((p) => p.estado === 'En Turno').length
  const seguridad = personal.filter((p) => p.cargo === 'Seguridad').length
  const mantenimiento = personal.filter(
    (p) => p.cargo === 'Técnico de Mantenimiento' || p.cargo === 'Limpieza'
  ).length

  const handleCrearPersonal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoNombre.trim() || !nuevoCi.trim()) return

    const nuevo: PersonalItem = {
      id: Date.now(),
      nombreCompleto: nuevoNombre.trim(),
      ci: nuevoCi.trim(),
      cargo: nuevoCargo,
      turno: nuevoTurno,
      telefono: nuevoTelefono.trim() || 'S/Telf',
      fechaIngreso: new Date().toISOString().split('T')[0],
      estado: 'En Turno',
      contactoEmergencia: nuevoContactoEmergencia.trim() || 'No especificado'
    }

    setPersonal([nuevo, ...personal])
    setIsCreateModalOpen(false)
    // Limpiar
    setNuevoNombre('')
    setNuevoCi('')
    setNuevoTelefono('')
    setNuevoContactoEmergencia('')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-400 text-xs font-semibold mb-2">
            <Users2 className="w-3.5 h-3.5" />
            Recursos Humanos & Conserjería
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Personal y Conserjería
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Registro de conserjes, personal de seguridad 24/7, cuadrillas de limpieza y turnos de
            guardia.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-800/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Registrar Colaborador
        </button>
      </div>

      {/* KPIS PERSONAL */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Total Empleados</span>
            <Users2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-[#262422] dark:text-white">{totalStaff}</div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">Plantilla activa</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>En Turno Ahora</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">{enTurno}</div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Presentes en el edificio
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Seguridad & Guardia</span>
            <Shield className="w-4 h-4 text-purple-700 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-400">{seguridad}</div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Vigilancia diurna/nocturna
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Mantenimiento & Limpieza</span>
            <Wrench className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-400">
            {mantenimiento}
          </div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">
            Operaciones técnicas
          </span>
        </div>
      </div>

      {/* BUSCADOR Y FILTROS */}
      <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre o CI de colaborador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#7d776f]" />
            <select
              value={filtroCargo}
              onChange={(e) => setFiltroCargo(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
            >
              <option value="Todos">Cargo: Todos</option>
              <option value="Conserje">Conserje</option>
              <option value="Seguridad">Seguridad</option>
              <option value="Limpieza">Limpieza</option>
              <option value="Técnico de Mantenimiento">Técnico de Mantenimiento</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
            >
              <option value="Todos">Estado: Todos</option>
              <option value="En Turno">En Turno</option>
              <option value="Franco / Descanso">Franco / Descanso</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLA DE PERSONAL */}
      <div className="rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#e3ded4] dark:bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-[#5c5750] dark:text-slate-400">
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">Cargo / Función</th>
                <th className="py-3 px-4">Turno Asignado</th>
                <th className="py-3 px-4">Contacto Telefónico</th>
                <th className="py-3 px-4">Estado Actual</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cec8bc]/60 dark:divide-slate-800 text-xs">
              {personalFiltrado.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#7d776f] dark:text-slate-500">
                    No se encontró personal registrado con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                personalFiltrado.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[#e6e1d6]/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#262422] dark:text-white">
                        {p.nombreCompleto}
                      </div>
                      <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                        CI: {p.ci}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#4a4641] dark:text-slate-200">
                        {p.cargo === 'Seguridad' && (
                          <Shield className="w-3.5 h-3.5 text-purple-700" />
                        )}
                        {p.cargo === 'Conserje' && (
                          <BadgeCheck className="w-3.5 h-3.5 text-blue-700" />
                        )}
                        {p.cargo === 'Limpieza' && (
                          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                        )}
                        {p.cargo === 'Técnico de Mantenimiento' && (
                          <Wrench className="w-3.5 h-3.5 text-amber-700" />
                        )}
                        {p.cargo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#5c5750] dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#7d776f]" />
                        {p.turno}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#262422] dark:text-white flex items-center gap-1">
                        <Phone className="w-3 h-3 text-blue-700" />
                        {p.telefono}
                      </div>
                      <div className="text-[10px] text-[#7d776f]">{p.contactoEmergencia}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          p.estado === 'En Turno'
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                            : 'bg-[#dfd9ce] text-[#5c5750] dark:bg-slate-800 dark:text-slate-400 border border-[#cec8bc] dark:border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${p.estado === 'En Turno' ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`}
                        />
                        {p.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedPersonal(p)}
                        className="p-1.5 rounded-lg text-[#5c5750] hover:text-[#262422] hover:bg-[#ded8cc] dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Ver Perfil"
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

      {/* MODAL CREAR PERSONAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-lg text-[#262422] dark:text-white">
                Registrar Colaborador
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearPersonal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Nombres y Apellidos *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Carlos Ramos"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    CI *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="4910293 CBBA"
                    value={nuevoCi}
                    onChange={(e) => setNuevoCi(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Cargo
                  </label>
                  <select
                    value={nuevoCargo}
                    onChange={(e) => setNuevoCargo(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="Conserje">Conserje</option>
                    <option value="Seguridad">Seguridad</option>
                    <option value="Limpieza">Limpieza</option>
                    <option value="Técnico de Mantenimiento">Técnico de Mantenimiento</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Turno
                  </label>
                  <select
                    value={nuevoTurno}
                    onChange={(e) => setNuevoTurno(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="Mañana (06:00 - 14:00)">Mañana (06:00 - 14:00)</option>
                    <option value="Tarde (14:00 - 22:00)">Tarde (14:00 - 22:00)</option>
                    <option value="Noche (22:00 - 06:00)">Noche (22:00 - 06:00)</option>
                    <option value="Completo">Completo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    placeholder="+591 7XXXXXXX"
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Contacto de Emergencia
                </label>
                <input
                  type="text"
                  placeholder="Ej. Esposa: 71234567"
                  value={nuevoContactoEmergencia}
                  onChange={(e) => setNuevoContactoEmergencia(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
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
                  Guardar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE PERSONAL */}
      {selectedPersonal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                Ficha de Personal
              </h3>
              <button
                onClick={() => setSelectedPersonal(null)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Colaborador:</span>
                <span className="font-bold text-sm text-[#262422] dark:text-white">
                  {selectedPersonal.nombreCompleto}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Cargo:</span>
                <span className="font-bold">{selectedPersonal.cargo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Turno:</span>
                <span className="font-bold">{selectedPersonal.turno}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Teléfono:</span>
                <span className="font-bold">{selectedPersonal.telefono}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Contacto Emergencia:</span>
                <span className="font-bold">{selectedPersonal.contactoEmergencia}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Fecha Ingreso:</span>
                <span className="font-bold">{selectedPersonal.fechaIngreso}</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#cec8bc] dark:border-slate-800">
              <button
                onClick={() => setSelectedPersonal(null)}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold cursor-pointer"
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
