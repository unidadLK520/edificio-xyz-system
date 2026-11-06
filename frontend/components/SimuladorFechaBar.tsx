// frontend/components/SimuladorFechaBar.tsx
// Barra interactiva de simulación de fecha y hora para pruebas de mora y cobros QR (Requerimiento C 4 y Pizarra)

'use client'

import React, { useState } from 'react'
import { Calendar, Clock, RotateCcw, Sparkles, AlertCircle, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'
import { useFechaSistema } from '@/context/FechaSistemaContext'

export default function SimuladorFechaBar() {
  const { fechaSistema, setFechaSistema, resetFechaSistema, isSimulada, politicaMora } =
    useFechaSistema()
  const [isExpanded, setIsExpanded] = useState(false)

  // Presets calculados para el mes actual o noviembre 2026
  const añoMes = fechaSistema.slice(0, 7) || '2026-11'
  const presetAntes = `${añoMes}-05`
  const presetVencimiento = `${añoMes}-${String(politicaMora.diaVencimiento || 10).padStart(2, '0')}`
  const presetMora = `${añoMes}-15`

  return (
    <div className="w-full bg-[#dfd9ce] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm transition-all text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Lado izquierdo: Título y Fecha actual del sistema */}
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              isSimulada
                ? 'bg-amber-500 text-white shadow-amber-500/20 animate-pulse'
                : 'bg-blue-700 dark:bg-indigo-600 text-white shadow-blue-800/20'
            }`}
          >
            <Clock className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#262422] dark:text-white">
                Simulador de Fecha del Sistema
              </span>
              {isSimulada ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:border-amber-800 dark:text-amber-300 flex items-center gap-1">
                  ⚡ Simulación Activa
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle className="w-2.5 h-2.5" /> Fecha Real
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#66615b] dark:text-slate-400">
              Permite simular pagos QR antes, en fecha y después del vencimiento para comprobar la política de mora.
            </p>
          </div>
        </div>

        {/* Lado derecho: Selector de fecha y botón de reset */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#ede9e1] dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-[#cec8bc] dark:border-slate-800 font-mono text-xs">
            <Calendar className="w-3.5 h-3.5 text-[#7d776f] dark:text-slate-400 shrink-0" />
            <input
              type="date"
              value={fechaSistema}
              onChange={(e) => {
                if (e.target.value) setFechaSistema(e.target.value)
              }}
              className="bg-transparent text-[#262422] dark:text-white font-bold focus:outline-none cursor-pointer"
            />
          </div>

          {isSimulada && (
            <button
              onClick={resetFechaSistema}
              title="Restablecer a la fecha real de hoy"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#ede9e1] dark:bg-slate-800 hover:bg-[#ded8cc] text-[#66615b] dark:text-slate-300 font-semibold border border-[#cec8bc] dark:border-slate-700 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Hoy</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-[#ede9e1] dark:bg-slate-800 hover:bg-[#ded8cc] text-[#66615b] dark:text-slate-300 border border-[#cec8bc] dark:border-slate-700 cursor-pointer transition-colors"
            title="Ver botones rápidos de simulación de mora"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Panel desplegable con presets rápidos de la pizarra */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-[#cec8bc] dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-[#66615b] dark:text-slate-400 mr-1">Casos Rápidos:</span>
            
            <button
              onClick={() => setFechaSistema(presetAntes)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                fechaSistema === presetAntes
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-[#ede9e1] dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950 border border-emerald-300 dark:border-emerald-800'
              }`}
            >
              🟢 05/Nov: Antes de Vencimiento (Sin mora)
            </button>

            <button
              onClick={() => setFechaSistema(presetVencimiento)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                fechaSistema === presetVencimiento
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-[#ede9e1] dark:bg-slate-800 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950 border border-blue-300 dark:border-blue-800'
              }`}
            >
              🔵 10/Nov: Día de Vencimiento (Sin mora)
            </button>

            <button
              onClick={() => setFechaSistema(presetMora)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                fechaSistema === presetMora
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-[#ede9e1] dark:bg-slate-800 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950 border border-rose-300 dark:border-rose-800'
              }`}
            >
              🔴 15/Nov: Con Mora (+Bs {politicaMora.tipoPenalidad === 'fijo' ? politicaMora.montoFijo : `${politicaMora.porcentaje}%`})
            </button>
          </div>

          <div className="text-[10px] text-[#7d776f] dark:text-slate-500 font-mono">
            Vence día {politicaMora.diaVencimiento} | Gracia: {politicaMora.diasGracia}d | Penalidad:{' '}
            {politicaMora.tipoPenalidad === 'fijo' ? `Bs ${politicaMora.montoFijo}` : `${politicaMora.porcentaje}%`}
          </div>
        </div>
      )}
    </div>
  )
}

