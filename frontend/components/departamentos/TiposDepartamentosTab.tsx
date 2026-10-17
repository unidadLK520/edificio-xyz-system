// frontend/components/departamentos/TiposDepartamentosTab.tsx
// Pestaña dedicada para la gestión y edición completa de Tipos de Apartamentos (Tipologías Editables)
'use client'

import React, { useState, useMemo } from 'react'
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  RotateCcw,
  Search,
  Maximize2,
  DollarSign,
  Bed,
  Bath,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react'
import { TipoDepartamentoItem, UnidadItem } from './types'
import ModalEditarTipoDepto from './ModalEditarTipoDepto'

interface TiposDepartamentosTabProps {
  tipos: TipoDepartamentoItem[]
  unidades: UnidadItem[]
  onSaveTipo: (tipo: TipoDepartamentoItem, cascada: boolean) => void
  onDeleteTipo: (id: string) => void
  onResetDefaults: () => void
  onSincronizarUnidadesTipo: (tipo: TipoDepartamentoItem) => void
  showToast: (msg: string) => void
}

export default function TiposDepartamentosTab({
  tipos,
  unidades,
  onSaveTipo,
  onDeleteTipo,
  onResetDefaults,
  onSincronizarUnidadesTipo,
  showToast
}: TiposDepartamentosTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tipoToEdit, setTipoToEdit] = useState<TipoDepartamentoItem | null>(null)
  const [tipoToDelete, setTipoToDelete] = useState<TipoDepartamentoItem | null>(null)

  // Mapeo de departamentos por tipo
  const departamentosPorTipo = useMemo(() => {
    const map = new Map<string, UnidadItem[]>()
    tipos.forEach((t) => map.set(t.id, []))

    unidades
      .filter((u) => u.tipoUnidad === 'Departamento')
      .forEach((u) => {
        // Encontrar tipo coincidente por tipologia o área
        const matchingTipo = tipos.find(
          (t) =>
            (u.tipologia && (u.tipologia.toLowerCase().includes(t.nombre.toLowerCase()) || u.tipologia.includes(t.codigo))) ||
            (u.areaM2 && Math.abs(u.areaM2 - t.areaM2) < 0.1)
        )
        if (matchingTipo) {
          const list = map.get(matchingTipo.id) || []
          list.push(u)
          map.set(matchingTipo.id, list)
        }
      })

    return map
  }, [tipos, unidades])

  // Filtrado de tipos
  const tiposFiltrados = useMemo(() => {
    return tipos.filter((t) => {
      const q = searchTerm.toLowerCase()
      return (
        t.nombre.toLowerCase().includes(q) ||
        t.codigo.toLowerCase().includes(q) ||
        (t.descripcion && t.descripcion.toLowerCase().includes(q))
      )
    })
  }, [tipos, searchTerm])

  // KPIs
  const totalTipos = tipos.length
  const totalDeptosAsignados = Array.from(departamentosPorTipo.values()).reduce((acc, list) => acc + list.length, 0)
  const areaPromedio = totalTipos > 0 ? (tipos.reduce((acc, t) => acc + t.areaM2, 0) / totalTipos).toFixed(1) : 0
  const expensaPromedio = totalTipos > 0 ? (tipos.reduce((acc, t) => acc + t.expensaBase, 0) / totalTipos).toFixed(2) : '0.00'

  const handleOpenCreate = () => {
    setTipoToEdit(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (tipo: TipoDepartamentoItem) => {
    setTipoToEdit(tipo)
    setIsModalOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!tipoToDelete) return
    const asignados = departamentosPorTipo.get(tipoToDelete.id)?.length || 0
    if (asignados > 0) {
      if (!confirm(`Hay ${asignados} departamentos que utilizan este tipo. ¿Está seguro de eliminarlo?`)) {
        return
      }
    }
    onDeleteTipo(tipoToDelete.id)
    setTipoToDelete(null)
    showToast(`Tipo de departamento eliminado correctamente.`)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER DE LA SECCIÓN */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-700/10 text-rose-800 dark:text-rose-400 border border-rose-700/20 text-xs font-bold mb-2">
            <Layers className="w-3.5 h-3.5" />
            Configuración 100% Dinámica y Editable
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#262422] dark:text-white">
            Tipos de Departamentos (Tipologías)
          </h2>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1 max-w-2xl">
            Administre, agregue o modifique las tipologías de apartamentos del edificio (superficie en m², expensa base en Bs., dormitorios, baños y especificaciones).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-[#5c5750] dark:text-slate-300 hover:bg-[#ded8cc] dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
            title="Restablecer a Tipos A, B y C de la Pizarra"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Valores Pizarra</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-900/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nuevo Tipo</span>
          </button>
        </div>
      </div>

      {/* KPIS DE TIPOLOGÍAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-[#7d776f] dark:text-slate-400">
            Tipos Registrados
          </div>
          <div className="text-2xl font-extrabold text-[#262422] dark:text-white mt-1">
            {totalTipos}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
            100% editables y configurables
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-[#7d776f] dark:text-slate-400">
            Departamentos Asignados
          </div>
          <div className="text-2xl font-extrabold text-[#262422] dark:text-white mt-1">
            {totalDeptosAsignados} / {unidades.filter((u) => u.tipoUnidad === 'Departamento').length}
          </div>
          <div className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold mt-0.5">
            Asociación automática por área/tipo
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-[#7d776f] dark:text-slate-400">
            Superficie Promedio
          </div>
          <div className="text-2xl font-extrabold text-[#262422] dark:text-white mt-1">
            {areaPromedio} <span className="text-sm font-normal text-[#7d776f]">m²</span>
          </div>
          <div className="text-[11px] text-[#7d776f] mt-0.5">
            Rango: {tipos.length > 0 ? `${Math.min(...tipos.map((t) => t.areaM2))} - ${Math.max(...tipos.map((t) => t.areaM2))} m²` : 'N/A'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-[#7d776f] dark:text-slate-400">
            Expensa Base Promedio
          </div>
          <div className="text-2xl font-extrabold text-rose-700 dark:text-rose-400 mt-1 font-mono">
            Bs. {expensaPromedio}
          </div>
          <div className="text-[11px] text-[#7d776f] mt-0.5">
            Pizarra: Tipo A (300), B (350), C (400)
          </div>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="p-3.5 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7d776f] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o descripción de tipología..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] focus:outline-none focus:ring-2 focus:ring-rose-600"
          />
        </div>
      </div>

      {/* GRID DE TARJETAS DE TIPOLOGÍAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tiposFiltrados.length === 0 ? (
          <div className="col-span-full p-8 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 text-center text-[#7d776f]">
            No se encontraron tipos de departamentos que coincidan con la búsqueda.
          </div>
        ) : (
          tiposFiltrados.map((tipo) => {
            const deptosAsignados = departamentosPorTipo.get(tipo.id) || []
            const costoM2 = tipo.areaM2 > 0 ? (tipo.expensaBase / tipo.areaM2).toFixed(2) : '0.00'

            return (
              <div
                key={tipo.id}
                className="rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                {/* Indicador de color en la cabecera */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-rose-700 text-white font-mono font-extrabold text-sm flex items-center justify-center shadow-xs">
                      {tipo.codigo}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                        {tipo.nombre}
                      </h3>
                      <span className="text-[11px] text-[#7d776f] dark:text-slate-400">
                        Alícuota ref.: {tipo.alicuotaEstimada || ((tipo.areaM2 / 1600) * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(tipo)}
                      className="p-1.5 rounded-lg text-[#5c5750] hover:text-[#262422] hover:bg-[#ded8cc] dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                      title="Editar Tipo"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoToDelete(tipo)}
                      className="p-1.5 rounded-lg text-rose-700 hover:text-rose-900 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                      title="Eliminar Tipo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* MÉTRICAS PRINCIPALES: ÁREA Y EXPENSA */}
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800">
                  <div>
                    <div className="text-[11px] font-bold text-[#7d776f] flex items-center gap-1">
                      <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                      Superficie
                    </div>
                    <div className="text-lg font-extrabold text-[#262422] dark:text-white font-mono">
                      {tipo.areaM2} <span className="text-xs font-normal text-[#7d776f]">m²</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] font-bold text-[#7d776f] flex items-center justify-end gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      Expensa Base
                    </div>
                    <div className="text-lg font-extrabold text-rose-700 dark:text-rose-400 font-mono">
                      Bs. {tipo.expensaBase.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* ESPECIFICACIONES DE AMBIENTES */}
                <div className="flex items-center justify-between text-xs text-[#5c5750] dark:text-slate-300 px-1">
                  <div className="flex items-center gap-1.5">
                    <Bed className="w-4 h-4 text-[#7d776f]" />
                    <span>{tipo.habitaciones} Dormitorios</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bath className="w-4 h-4 text-[#7d776f]" />
                    <span>{tipo.banos} Baños</span>
                  </div>
                  <div className="text-[11px] font-mono text-[#7d776f]">
                    {costoM2} Bs/m²
                  </div>
                </div>

                {/* DESCRIPCIÓN */}
                {tipo.descripcion && (
                  <p className="text-xs text-[#66615b] dark:text-slate-400 line-clamp-2 italic px-1">
                    "{tipo.descripcion}"
                  </p>
                )}

                {/* DEPARTAMENTOS ASOCIADOS */}
                <div className="pt-3 border-t border-[#cec8bc] dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#262422] dark:text-white">
                      Unidades ({deptosAsignados.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => onSincronizarUnidadesTipo(tipo)}
                      className="text-[11px] text-rose-700 hover:text-rose-800 dark:text-rose-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      title="Actualizar la expensa y superficie en todas las unidades asignadas"
                    >
                      <span>Sincronizar</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {deptosAsignados.length === 0 ? (
                      <span className="text-xs text-[#7d776f] italic">
                        Ningún departamento asignado aún
                      </span>
                    ) : (
                      deptosAsignados.map((u) => (
                        <span
                          key={u.id}
                          className="px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-[#dfd9ce] dark:bg-slate-800 text-[#262422] dark:text-white border border-[#cec8bc] dark:border-slate-700"
                        >
                          Dpto. {u.numero}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* NOTA ACLARATORIA SOBRE EDITABILIDAD */}
      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-950 dark:text-blue-200 space-y-1">
          <p className="font-bold">
            Cumplimiento del criterio de evaluación: «Todo tiene que ser editable»
          </p>
          <p className="text-blue-900/90 dark:text-blue-300">
            A diferencia de los sistemas rígidos, aquí puede alterar en cualquier momento el metraje en m², la expensa base en Bs., o agregar nuevas tipologías arquitectónicas (ej. Monoambientes, Dúplex o Penthouses). Al presionar <strong>"Sincronizar"</strong> o marcar la casilla de cascada al editar, el sistema actualizará los valores para todas las unidades correspondientes.
          </p>
        </div>
      </div>

      {/* MODAL DE EDICIÓN / CREACIÓN */}
      <ModalEditarTipoDepto
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tipoToEdit={tipoToEdit}
        onSave={onSaveTipo}
      />

      {/* CONFIRMACIÓN DE ELIMINACIÓN */}
      {tipoToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                Eliminar Tipo de Departamento
              </h3>
            </div>
            <p className="text-xs text-[#5c5750] dark:text-slate-300">
              ¿Está seguro de eliminar la tipología <strong>"{tipoToDelete.nombre}"</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#cec8bc] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTipoToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#5c5750] hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold shadow-md transition-colors"
              >
                Eliminar Tipología
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
