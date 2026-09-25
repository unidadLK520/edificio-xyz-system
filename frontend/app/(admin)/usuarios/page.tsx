// frontend/app/(admin)/usuarios/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { ShieldCheck, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { PersonaItem, UsuarioItem } from '@/components/usuarios/types'
import { UsuariosTable } from '@/components/usuarios/UsuariosTable'
import { CreateUsuarioModal } from '@/components/usuarios/CreateUsuarioModal'

export type { PersonaItem, UsuarioItem }

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('TODOS')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const fetchUsuarios = async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const res = await fetch('/api/v1/usuarios')
      if (res.ok) {
        const data = await res.json()
        setUsuarios(data)
      } else {
        const err = await res.json().catch(() => ({}))
        setErrorMessage(err.message || 'No se pudo obtener la lista de usuarios')
      }
    } catch {
      setErrorMessage('Error de conexión al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsuarios()
  }, [])

  const handleToggleEstado = async (idUsuario: number, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual
    try {
      const res = await fetch(`/api/v1/usuarios/${idUsuario}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nuevoEstado })
      })

      if (res.ok) {
        setSuccessMessage(
          `Estado de usuario actualizado a ${nuevoEstado ? 'Habilitado (Activo)' : 'Inhabilitado (Inactivo)'}`
        )
        fetchUsuarios()
      } else {
        const err = await res.json().catch(() => ({}))
        setErrorMessage(err.message || 'Error al actualizar el estado del usuario')
      }
    } catch {
      setErrorMessage('Error de conexión al cambiar el estado')
    }
  }

  const handleChangeRol = async (idUsuario: number, nuevoRol: string) => {
    try {
      const res = await fetch(`/api/v1/usuarios/${idUsuario}/rol`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol: nuevoRol })
      })

      if (res.ok) {
        setSuccessMessage(`Rol de usuario actualizado a ${nuevoRol}`)
        fetchUsuarios()
      } else {
        const err = await res.json().catch(() => ({}))
        setErrorMessage(err.message || 'Error al cambiar el rol')
      }
    } catch {
      setErrorMessage('Error de conexión al cambiar el rol')
    }
  }

  const filteredUsuarios = usuarios.filter((u) => {
    const matchSearch =
      u.nombreUsuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.persona &&
        `${u.persona.nombres} ${u.persona.apellidos} ${u.persona.ciNit}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()))
    const matchRole =
      filterRole === 'TODOS' || u.rol.nombre.toUpperCase() === filterRole.toUpperCase()
    return matchSearch && matchRole
  })

  const totalUsuarios = usuarios.length
  const activos = usuarios.filter((u) => u.activo).length
  const inactivos = usuarios.filter((u) => !u.activo).length
  const admins = usuarios.filter((u) => u.rol.nombre.toUpperCase() === 'ADMINISTRADOR').length

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* HEADER DE LA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Registro Unificado: Personas & Usuarios
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Gestión de Usuarios y Personas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Solo el Administrador puede registrar datos personales (CI/NIT, Nombres, Teléfono) y
            crear la cuenta de usuario asociada.
          </p>
        </div>

        {/* BOTÓN REGISTRAR USUARIO + PERSONA */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
          <span>Registrar Usuario y Persona</span>
        </button>
      </div>

      {/* ALERTAS */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="font-bold">Error:</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage('')}
            className="text-rose-400 hover:text-rose-600 cursor-pointer p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-bold">Éxito:</span>
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-emerald-400 hover:text-emerald-600 cursor-pointer p-1 rounded-lg hover:bg-emerald-500/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Cuentas
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalUsuarios}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Habilitados (Activos)
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {activos}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">
            Inhabilitados (Inactivos)
          </p>
          <p className="text-2xl font-bold text-rose-500 mt-1">{inactivos}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">
            Administradores
          </p>
          <p className="text-2xl font-bold text-indigo-500 mt-1">{admins}</p>
        </div>
      </div>

      {/* FILTROS Y BARRA DE BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Buscar por nombre, CI/NIT, usuario o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <svg
            className="w-4 h-4 absolute left-3 top-3 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Filtrar por Rol:
          </label>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="py-2 px-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="TODOS">Todos los roles</option>
            <option value="ADMINISTRADOR">Administrador</option>
            <option value="DIRECTORIO">Directorio</option>
            <option value="CONSULTA">Consulta</option>
            <option value="COPROPIETARIO">Copropietario</option>
          </select>
        </div>
      </div>

      {/* TABLA DE USUARIOS Y PERSONAS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <UsuariosTable
          usuarios={filteredUsuarios}
          loading={loading}
          onChangeRol={handleChangeRol}
          onToggleEstado={handleToggleEstado}
        />
      </div>

      {/* MODAL REGISTRAR USUARIO Y PERSONA */}
      <CreateUsuarioModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(msg) => setSuccessMessage(msg)}
        onError={(msg) => setErrorMessage(msg)}
        onRefresh={fetchUsuarios}
      />
    </div>
  )
}
