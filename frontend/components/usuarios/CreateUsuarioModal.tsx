// frontend/components/usuarios/CreateUsuarioModal.tsx
'use client'

import React, { useState } from 'react'
import { UserPlus, X } from 'lucide-react'

interface CreateUsuarioModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
  onRefresh: () => void
}

export const CreateUsuarioModal: React.FC<CreateUsuarioModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
  onRefresh
}) => {
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

  if (!isOpen) return null

  const handleCreateUserAndPersona = async (e: React.FormEvent) => {
    e.preventDefault()
    onError('')

    if (
      !nombres.trim() ||
      !apellidos.trim() ||
      !ciNit.trim() ||
      !nombreUsuario.trim() ||
      !correo.trim() ||
      !password.trim()
    ) {
      onError('Por favor completa todos los campos requeridos (*)')
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
        onSuccess(
          `¡Usuario '${data.nombreUsuario}' y Persona '${nombres} ${apellidos}' registrados correctamente con rol ${data.rol}!`
        )
        onClose()
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
        onRefresh()
      } else {
        onError(data.message || 'Error al registrar usuario y persona')
      }
    } catch {
      onError('Ocurrió un error inesperado al conectar con el servidor')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-500 shrink-0" />
              Registro Unificado de Persona y Usuario
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Los datos personales y la cuenta de acceso serán vinculados en el sistema.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
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
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
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
  )
}
