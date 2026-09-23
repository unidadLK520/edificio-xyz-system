'use client'

import React, { useState, useEffect } from 'react'

export interface PersonaItem {
  idPersona: number
  nombres: string
  apellidos: string
  ciNit: string
  telefono?: string | null
  correo?: string | null
  direccion?: string | null
}

export interface UsuarioItem {
  idUsuario: number
  nombreUsuario: string
  correo: string
  activo: boolean
  intentosFallidos: number
  bloqueadoHasta: string | null
  fechaCreacion: string
  ultimoAcceso: string | null
  idPersona?: number | null
  rol: {
    idRol: number
    nombre: string
    descripcion: string | null
  }
  persona?: PersonaItem | null
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('TODOS')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Modal para Crear Usuario + Persona
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Campos de Persona
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [ciNit, setCiNit] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')

  // Campos de Usuario
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('ADMINISTRADOR')
  const [activo, setActivo] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Cargar lista de usuarios
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

  // Manejar creación conjunta de Persona + Usuario (CA09)
  const handleCreateUserAndPersona = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (
      !nombres.trim() ||
      !apellidos.trim() ||
      !ciNit.trim() ||
      !nombreUsuario.trim() ||
      !correo.trim() ||
      !password.trim()
    ) {
      setErrorMessage('Por favor completa todos los campos requeridos (*)')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/v1/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreUsuario: nombreUsuario.trim(),
          correo: correo.trim(),
          password,
          rol,
          activo,
          persona: {
            nombres: nombres.trim(),
            apellidos: apellidos.trim(),
            ciNit: ciNit.trim(),
            telefono: telefono.trim() || null,
            direccion: direccion.trim() || null,
            correo: correo.trim()
          }
        })
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setSuccessMessage(
          `¡Usuario '${data.nombreUsuario}' y Persona '${nombres} ${apellidos}' registrados correctamente con rol ${data.rol}!`
        )
        setIsCreateModalOpen(false)
        // Limpiar formulario
        setNombres('')
        setApellidos('')
        setCiNit('')
        setTelefono('')
        setDireccion('')
        setNombreUsuario('')
        setCorreo('')
        setPassword('')
        setRol('ADMINISTRADOR')
        setActivo(true)
        fetchUsuarios()
      } else {
        setErrorMessage(data.message || 'Error al registrar usuario y persona')
      }
    } catch {
      setErrorMessage('Ocurrió un error inesperado al conectar con el servidor')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Alternar estado Activo/Inactivo (CA09)
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

  // Cambiar Rol de Usuario (CA09)
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

  // Filtrado de la lista
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
            <span>🛡️</span> Registro Unificado: Personas & Usuarios
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
            <span className="font-bold">⚠️ Error:</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage('')}
            className="text-rose-400 hover:text-rose-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold">✅ Éxito:</span>
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-emerald-400 hover:text-emerald-600 font-bold"
          >
            ✕
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
            className="py-2 px-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Cargando usuarios y datos personales...</span>
          </div>
        ) : filteredUsuarios.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-base font-semibold">No se encontraron usuarios</p>
            <p className="text-xs text-slate-400 mt-1">
              Prueba ajustando el término de búsqueda o el filtro de rol.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4">Datos Personales</th>
                  <th className="py-3.5 px-4">CI / NIT</th>
                  <th className="py-3.5 px-4">Cuenta / Usuario</th>
                  <th className="py-3.5 px-4">Rol Asignado</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {filteredUsuarios.map((user) => (
                  <tr
                    key={user.idUsuario}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* PERSONA */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-500/20">
                          {user.persona
                            ? `${user.persona.nombres[0]}${user.persona.apellidos[0]}`.toUpperCase()
                            : user.nombreUsuario.substring(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            {user.persona
                              ? `${user.persona.nombres} ${user.persona.apellidos}`
                              : user.nombreUsuario}
                          </span>
                          {user.persona?.telefono && (
                            <span className="text-xs text-slate-500 block">
                              📞 {user.persona.telefono}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* CI NIT */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {user.persona?.ciNit ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {user.persona.ciNit}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No registrado</span>
                      )}
                    </td>

                    {/* USUARIO Y CORREO */}
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-900 dark:text-slate-100 block">
                        @{user.nombreUsuario}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">
                        {user.correo}
                      </span>
                    </td>

                    {/* ROL */}
                    <td className="py-3.5 px-4">
                      <select
                        value={user.rol.nombre.toUpperCase()}
                        onChange={(e) => handleChangeRol(user.idUsuario, e.target.value)}
                        className="py-1 px-2.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="ADMINISTRADOR">Administrador</option>
                        <option value="DIRECTORIO">Directorio</option>
                        <option value="CONSULTA">Consulta</option>
                        <option value="COPROPIETARIO">Copropietario</option>
                      </select>
                    </td>

                    {/* ESTADO */}
                    <td className="py-3.5 px-4">
                      {user.activo ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          Habilitado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                          Inhabilitado
                        </span>
                      )}
                    </td>

                    {/* ACCIONES */}
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleEstado(user.idUsuario, user.activo)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          user.activo
                            ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50'
                        }`}
                      >
                        {user.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL REGISTRAR USUARIO Y PERSONA (CA09) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>👤</span> Registro Unificado de Persona y Usuario
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Los datos personales y la cuenta de acceso serán vinculados en el sistema.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUserAndPersona} className="space-y-5">
              {/* SECCIÓN 1: DATOS PERSONALES */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 border-b border-indigo-500/10 pb-1">
                  <span>1.</span> Datos Personales (Entidad Persona)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nombres *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Carlos Andrés"
                      value={nombres}
                      onChange={(e) => setNombres(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Apellidos *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Mendoza Vargas"
                      value={apellidos}
                      onChange={(e) => setApellidos(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      CI / NIT *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. 4920194 CB"
                      value={ciNit}
                      onChange={(e) => setCiNit(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="ej. +591 76543210"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dirección / Domicilio
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Av. Las Palmas #450, Dpto 101"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* SECCIÓN 2: DATOS DE USUARIO */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 border-b border-indigo-500/10 pb-1">
                  <span>2.</span> Cuenta de Usuario y Credenciales (Entidad Usuario)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nombre de Usuario *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. cmendoza"
                      value={nombreUsuario}
                      onChange={(e) => setNombreUsuario(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="carlos.mendoza@gmail.com"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contraseña Inicial *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Rol Asignado *
                    </label>
                    <select
                      value={rol}
                      onChange={(e) => setRol(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    >
                      <option value="ADMINISTRADOR">Administrador</option>
                      <option value="DIRECTORIO">Directorio</option>
                      <option value="CONSULTA">Consulta</option>
                      <option value="COPROPIETARIO">Copropietario</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="newActivoCheck"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="newActivoCheck"
                    className="text-xs text-slate-700 dark:text-slate-300 select-none cursor-pointer font-medium"
                  >
                    Habilitar inmediatamente la cuenta (Usuario Activo)
                  </label>
                </div>
              </div>

              {/* ACCIONES DEL MODAL */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <span>Guardar Persona y Usuario</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
