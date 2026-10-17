// frontend/components/departamentos/EditarParametrosModal.tsx
// Modal de Edición Completa de Parámetros de Departamento (Expensas Base, Medidores de Agua y Mora)
'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Save,
  Gauge,
  Calculator,
  Droplets,
  Calendar,
  User,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react'
import { UnidadItem, ParametrosCobroConfig } from './types'

interface EditarParametrosModalProps {
  isOpen: boolean
  depto: UnidadItem | null
  config: ParametrosCobroConfig
  onClose: () => void
  onSave: (updated: UnidadItem) => void
}

export default function EditarParametrosModal({
  isOpen,
  depto,
  config,
  onClose,
  onSave
}: EditarParametrosModalProps) {
  if (!isOpen || !depto) return null

  // Estados locales editables
  const [expensaBase, setExpensaBase] = useState<number>(
    depto.expensaBase ??
      (depto.tipologia?.includes('Tipo A')
        ? config.expensaBaseTipoA
        : depto.tipologia?.includes('Tipo B')
          ? config.expensaBaseTipoB
          : config.expensaBaseTipoC)
  )
  const [codigoMedidor, setCodigoMedidor] = useState<string>(
    depto.codigoMedidor || `MED-${depto.numero}`
  )
  const [lecturaAnteriorAgua, setLecturaAnteriorAgua] = useState<number>(
    depto.lecturaAnteriorAgua ?? 940
  )
  const [lecturaActualAgua, setLecturaActualAgua] = useState<number>(depto.lecturaActualAgua ?? 945)
  const [tarifaAguaM3, setTarifaAguaM3] = useState<number>(
    depto.tarifaAguaM3 ?? config.tarifaAguaM3
  )
  const [otrosExtras, setOtrosExtras] = useState<number>(depto.otrosExtras ?? 0)
  const [fechaLecturaAnterior, setFechaLecturaAnterior] = useState<string>(
    depto.fechaLecturaAnterior || '30/Sep/2026'
  )
  const [fechaLecturaActual, setFechaLecturaActual] = useState<string>(
    depto.fechaLecturaActual || '31/Oct/2026'
  )

  // Cálculos en tiempo real según reglas de cobro
  const consumoCubos = Math.max(0, lecturaActualAgua - lecturaAnteriorAgua)
  const totalAgua = consumoCubos * tarifaAguaM3
  const subtotalBaseAgua = expensaBase + totalAgua + otrosExtras

  // Mora según configuración (< 10 -> 0; >= 10 -> mora)
  const moraProyectada =
    config.tipoMora === 'porcentaje'
      ? subtotalBaseAgua * (config.valorMoraPorcentaje / 100)
      : config.valorMoraFijo
  const totalConMora = subtotalBaseAgua + moraProyectada

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const updated: UnidadItem = {
      ...depto,
      expensaBase: Number(expensaBase),
      codigoMedidor,
      lecturaAnteriorAgua: Number(lecturaAnteriorAgua),
      lecturaActualAgua: Number(lecturaActualAgua),
      tarifaAguaM3: Number(tarifaAguaM3),
      consumoAguaM3: consumoCubos,
      montoAgua: totalAgua,
      otrosExtras: Number(otrosExtras),
      fechaLecturaAnterior,
      fechaLecturaActual
    }
    onSave(updated)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 text-[#262422] dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-700 dark:bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-md">
              {depto.numero}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider mb-0.5">
                <Gauge className="w-3 h-3" />
                Parámetros y Medidor de Agua
              </div>
              <h3 className="font-black text-lg text-[#262422] dark:text-white leading-tight">
                Editar Datos de Cobro — Dpto {depto.numero}
              </h3>
              <p className="text-xs text-[#7d776f] dark:text-slate-400">
                {depto.tipologia || 'Tipo A (60 m²)'} • Titular:{' '}
                {depto.propietario?.nombre || 'Sin titular'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* SECCIÓN 1: EXPENSA BASE */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-[#262422] dark:text-white text-xs flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-blue-600" />
                1. Expensa Base Fijada
              </span>
              <span className="text-[11px] text-[#7d776f]">
                Valores base: Tipo A (Bs 300), Tipo B (Bs 350), Tipo C (Bs 400)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1 text-[#5c5750] dark:text-slate-300">
                  Monto Expensa Base (Bs.) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={expensaBase}
                  onChange={(e) => setExpensaBase(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 font-mono font-bold text-sm text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-[#5c5750] dark:text-slate-300">
                  Otros Extras / Cargos Específicos (Bs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={otrosExtras}
                  onChange={(e) => setOtrosExtras(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 font-mono text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Ej. +10, +12, +18 (cargo adicional)"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: MEDIDOR DE AGUA INDIVIDUAL */}
          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-blue-950 dark:text-blue-200 text-xs flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-blue-600" />
                2. Medidor de Agua Individual (Lecturas y Consumo en Cubos)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-200 dark:bg-blue-900/80 text-blue-900 dark:text-blue-300 font-mono font-bold text-[10px]">
                Tarifa: Bs. {tarifaAguaM3.toFixed(2)} / m³
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1 text-[#5c5750] dark:text-slate-300">
                  Código de Medidor *
                </label>
                <input
                  type="text"
                  required
                  value={codigoMedidor}
                  onChange={(e) => setCodigoMedidor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 font-mono text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Ej. MED-A1"
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-[#5c5750] dark:text-slate-300">
                  Lectura Anterior (m³)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={lecturaAnteriorAgua}
                  onChange={(e) => setLecturaAnteriorAgua(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 font-mono font-bold text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Ej. 940 (30/Sep)"
                />
                <span className="text-[10px] text-[#7d776f] mt-0.5 block font-mono">
                  Toma: {fechaLecturaAnterior}
                </span>
              </div>
              <div>
                <label className="block font-bold mb-1 text-[#5c5750] dark:text-slate-300">
                  Lectura Actual (m³)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={lecturaActualAgua}
                  onChange={(e) => setLecturaActualAgua(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 font-mono font-bold text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Ej. 945 (31/Oct)"
                />
                <span className="text-[10px] text-[#7d776f] mt-0.5 block font-mono">
                  Toma: {fechaLecturaActual}
                </span>
              </div>
            </div>

            {/* Resultado del Consumo de Agua */}
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#5c5750] dark:text-slate-400">Consumo Calculado:</span>
                <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-black">
                  {consumoCubos.toFixed(1)} cubos (m³)
                </span>
                <span className="text-[#7d776f] text-[11px]">(945 - 940)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#5c5750] dark:text-slate-400">Costo Agua:</span>
                <span className="font-extrabold text-blue-900 dark:text-blue-300 text-sm">
                  Bs. {totalAgua.toFixed(2)}
                </span>
                <span className="text-[#7d776f] text-[11px]">
                  ({consumoCubos} × Bs {tarifaAguaM3})
                </span>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: RESUMEN DE COBRO Y SIMULACIÓN DE MORA */}
          <div className="p-4 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800 space-y-2.5">
            <span className="font-extrabold text-[#262422] dark:text-white text-xs block">
              3. Resumen Liquidado según Reglas Administrativas
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-xs">
              <div className="p-2.5 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-[#cec8bc] dark:border-slate-800">
                <span className="text-[10px] text-[#7d776f] block uppercase">Expensa Base</span>
                <span className="font-bold">Bs. {expensaBase.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-[#cec8bc] dark:border-slate-800">
                <span className="text-[10px] text-[#7d776f] block uppercase">Agua / Extras</span>
                <span className="font-bold text-blue-700 dark:text-blue-400">
                  Bs. {(totalAgua + otrosExtras).toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 block uppercase font-bold">
                  &lt; Día 10 (Sin Mora)
                </span>
                <span className="font-black text-sm text-emerald-700 dark:text-emerald-300">
                  Bs. {subtotalBaseAgua.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800">
                <span className="text-[10px] text-red-800 dark:text-red-300 block uppercase font-bold">
                  &ge; Día 10 (
                  {config.tipoMora === 'porcentaje'
                    ? `${config.valorMoraPorcentaje}%`
                    : `+Bs ${config.valorMoraFijo}`}
                  )
                </span>
                <span className="font-black text-sm text-red-700 dark:text-red-300">
                  Bs. {totalConMora.toFixed(2)}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-[#7d776f] dark:text-slate-400">
              ℹ️ <strong>Ejemplo de Cobro:</strong> Para Depto 101 (Base Bs 300 + Agua Bs 25 = Total
              Bs 325.00). Si no paga antes del día 10, se aplica el recargo de mora configurado.
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs font-bold text-[#5c5750] dark:text-slate-300 hover:bg-[#ded8cc] dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-xs font-bold shadow-md shadow-blue-800/20 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              Guardar Parámetros de la Unidad
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
