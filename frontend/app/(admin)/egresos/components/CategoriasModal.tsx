// frontend/app/(admin)\egresos/components/CategoriasModal.tsx
// Modal for managing financial categories (CRUD)

import React from 'react'
import { X, Plus, Save, AlertCircle, Check, Edit2, Tag } from 'lucide-react'
import type { CategoriaItem } from '../types'

interface CategoriasModalProps {
  categorias: CategoriaItem[]
  isOpen: boolean
  onClose: () => void
  // Create
  newCatNombre: string
  setNewCatNombre: (v: string) => void
  newCatTipo: 'Ingreso' | 'Egreso'
  setNewCatTipo: (v: 'Ingreso' | 'Egreso') => void
  catModalError: string | null
  catModalSuccess: string | null
  onCreate: (e: React.FormEvent) => void
  // Edit
  editingCatId: number | null
  editingCatNombre: string
  setEditingCatNombre: (v: string) => void
  onEdit: (id: number) => void
  onCancelEdit: () => void
  onStartEdit: (cat: { idCategoria: number; nombre: string }) => void
  // Filter
  catFiltroTipo: 'Todos' | 'Ingreso' | 'Egreso'
  setCatFiltroTipo: (v: 'Todos' | 'Ingreso' | 'Egreso') => void
}

export const CategoriasModal: React.FC<CategoriasModalProps> = ({
  categorias,
  isOpen,
  onClose,
  newCatNombre,
  setNewCatNombre,
  newCatTipo,
  setNewCatTipo,
  catModalError,
  catModalSuccess,
  onCreate,
  editingCatId,
  editingCatNombre,
  setEditingCatNombre,
  onEdit,
  onCancelEdit,
  onStartEdit,
  catFiltroTipo,
  setCatFiltroTipo
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
              Gestión de Categorías Financieras
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {catModalError && (
          <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{catModalError}</span>
          </div>
        )}
        {catModalSuccess && (
          <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{catModalSuccess}</span>
          </div>
        )}

        {/* Create form */}
        <form onSubmit={onCreate} className="p-4 rounded-2xl bg-white/70 dark:bg-slate-950/70 border border-[#cec8bc] dark:border-slate-800 space-y-3">
          <span className="block text-xs font-bold uppercase tracking-wider text-[#383430] dark:text-slate-300">
            + Crear Nueva Categoría (Solo Administrador)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-4">
              <select
                value={newCatTipo}
                onChange={(e) => setNewCatTipo(e.target.value as 'Ingreso' | 'Egreso')}
                className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white cursor-pointer font-bold"
              >
                <option value="Egreso">Egreso / Gasto</option>
                <option value="Ingreso">Ingreso Extraordinario</option>
              </select>
            </div>
            <div className="sm:col-span-5">
              <input
                type="text"
                maxLength={80}
                placeholder="Nombre de la categoría..."
                value={newCatNombre}
                onChange={(e) => setNewCatNombre(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear</span>
              </button>
            </div>
          </div>
        </form>

        {/* Categories list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#5c5750] dark:text-slate-400">
              Catálogo Existente ({categorias.length})
            </span>
            <div className="flex items-center gap-1">
              {(['Todos', 'Ingreso', 'Egreso'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCatFiltroTipo(t)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    catFiltroTipo === t
                      ? 'bg-blue-700 text-white'
                      : 'bg-[#dfd9ce] dark:bg-slate-800 text-[#5c5750] dark:text-slate-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {categorias
              .filter(c => catFiltroTipo === 'Todos' || c.tipo === catFiltroTipo)
              .map(cat => {
                const isEditing = editingCatId === cat.idCategoria
                return (
                  <div
                    key={cat.idCategoria}
                    className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-950/60 border border-[#cec8bc]/70 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          cat.tipo === 'Ingreso'
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {cat.tipo}
                      </span>
                      {isEditing ? (
                        <input
                          type="text"
                          maxLength={80}
                          value={editingCatNombre}
                          onChange={(e) => setEditingCatNombre(e.target.value)}
                          autoFocus
                          className="w-full px-2 py-1 rounded-lg bg-[#dfd9ce] dark:bg-slate-900 border border-blue-600 text-xs font-semibold"
                        />
                      ) : (
                        <span className="font-semibold text-[#262422] dark:text-white truncate">
                          {cat.nombre}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onEdit(cat.idCategoria)}
                            className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3 h-3" />
                            <span>Guardar</span>
                          </button>
                          <button
                            type="button"
                            onClick={onCancelEdit}
                            className="p-1 rounded-lg hover:bg-[#dfd9ce] dark:hover:bg-slate-800 text-[#7d776f] cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStartEdit(cat)}
                          className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-100/60 dark:text-blue-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Editar nombre de categoría"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-[#cec8bc] dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-bold text-[#262422] dark:text-white cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
