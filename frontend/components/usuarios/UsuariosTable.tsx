// frontend/components/usuarios/UsuariosTable.tsx
'use client'

import React from 'react'
import { UsuarioItem } from './types'

interface UsuariosTableProps {
  usuarios: UsuarioItem[]
  loading: boolean
  onChangeRol: (idUsuario: number, nuevoRol: string) => void
  onToggleEstado: (idUsuario: number, estadoActual: boolean) => void
}

export const UsuariosTable: React.FC<UsuariosTableProps> = ({
  usuarios,
  loading,
  onChangeRol,
  onToggleEstado
}) => {
  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Cargando usuarios y datos personales...</span>
      </div>
    )
  }

  if (usuarios.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500">
        <p className="text-base font-semibold">No se encontraron usuarios</p>
        <p className="text-xs text-slate-400 mt-1">
          Prueba ajustando el término de búsqueda o el filtro de rol.
        </p>
      </div>
    )
  }

  return (
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
          {usuarios.map((user) => (
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
                  onChange={(e) => onChangeRol(user.idUsuario, e.target.value)}
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
                  onClick={() => onToggleEstado(user.idUsuario, user.activo)}
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
  )
}
