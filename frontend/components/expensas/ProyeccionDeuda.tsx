// frontend/components/expensas/ProyeccionDeuda.tsx
// Componente de cálculo de deuda proyectada a una fecha según endpoint oficial de cobro

'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, AlertTriangle, Loader2, Info, Clock } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface CargoProyeccion {
  tipo: 'EXISTENTE' | 'PROYECTADA'
  idExpensa: number | null
  periodo: string
  fechaVencimiento: string
  capital: number
  agua: number
  mesesMora: number
  mora: number
  total: number
}

interface TotalesProyeccion {
  capital: number
  mora: number
  anticipos: number
  totalAPagar: number
}

interface ProyeccionResponse {
  idDepartamento: number
  departamentoNumero: string
  fecha: string
  cargos: CargoProyeccion[]
  anticiposAFavor: number
  aguaSugerida: number | null
  totales: TotalesProyeccion
  avisos: string[]
}

interface ProyeccionDeudaProps {
  idDepartamento: number
  fechaInicial: string
  fechaVencimientoRef?: string
}

function parseYMD(s?: string): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return isNaN(dt.getTime()) ? null : dt
}

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

export default function ProyeccionDeuda({
  idDepartamento,
  fechaInicial,
  fechaVencimientoRef
}: ProyeccionDeudaProps) {
  const [fecha, setFecha] = useState<string>(fechaInicial || '')
  const [agua, setAgua] = useState<number | ''>('')
  const [aguaEditada, setAguaEditada] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proyeccion, setProyeccion] = useState<ProyeccionResponse | null>(null)

  useEffect(() => {
    if (fechaInicial) {
      setFecha(fechaInicial)
    }
  }, [fechaInicial])

  useEffect(() => {
    if (!idDepartamento || !fecha) return
    let activo = true
    const timer = setTimeout(async () => {
      setCargando(true)
      setError(null)
      try {
        const aguaNum = agua === '' ? 0 : Number(agua)
        const res = await apiFetch(
          `/api/v1/cobro/proyeccion/${idDepartamento}?fecha=${fecha}&aguaMensual=${aguaNum}`
        )
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.message || data.error || 'Error al obtener la proyección de deuda')
        }
        if (activo) {
          setProyeccion(data)
          if (!aguaEditada && data.aguaSugerida !== null && data.aguaSugerida !== undefined) {
            setAgua(Number(data.aguaSugerida))
          }
        }
      } catch (err: any) {
        if (activo) {
          setError(err.message || 'Error al consultar proyección de deuda')
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }, 400)

    return () => {
      activo = false
      clearTimeout(timer)
    }
  }, [idDepartamento, fecha, agua, aguaEditada])

  const refDate = parseYMD(fechaVencimientoRef || fecha)

  const aplicarDiasAntes = () => {
    if (!refDate) return
    const d = new Date(refDate)
    d.setDate(d.getDate() - 5)
    setFecha(toYMD(d))
  }

  const aplicarEnVencimiento = () => {
    if (!refDate) return
    setFecha(toYMD(refDate))
  }

  const aplicarDiasDespues = () => {
    if (!refDate) return
    const d = new Date(refDate)
    d.setDate(d.getDate() + 15)
    setFecha(toYMD(d))
  }

  return (
    <div className="space-y-3.5 p-4 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-800/60 border border-[#cec8bc] dark:border-slate-700 text-xs">
      {/* Controles de Proyección: Fecha y Presets dinámicos */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="font-bold text-[#262422] dark:text-white flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            Fecha de proyección del cálculo:
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-white font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 3 botones calculados dinámicamente con Date desde fechaVencimientoRef */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={aplicarDiasAntes}
            className="px-2.5 py-1.5 rounded-xl font-semibold border transition-all cursor-pointer bg-[#ede9e1] dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-center"
          >
            5 dias antes
          </button>
          <button
            type="button"
            onClick={aplicarEnVencimiento}
            className="px-2.5 py-1.5 rounded-xl font-semibold border transition-all cursor-pointer bg-[#ede9e1] dark:bg-slate-900 text-blue-800 dark:text-blue-300 border-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60 text-center"
          >
            En el vencimiento
          </button>
          <button
            type="button"
            onClick={aplicarDiasDespues}
            className="px-2.5 py-1.5 rounded-xl font-semibold border transition-all cursor-pointer bg-[#ede9e1] dark:bg-slate-900 text-rose-800 dark:text-rose-300 border-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-center"
          >
            15 dias despues
          </button>
        </div>

        {/* Input numérico de agua estimada */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#cec8bc]/50 dark:border-slate-700">
          <label className="text-[#5c5750] dark:text-slate-300 font-medium">
            Agua estimada por mes (Bs.):
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={agua}
            onChange={(e) => {
              setAguaEditada(true)
              setAgua(e.target.value === '' ? '' : Number(e.target.value))
            }}
            placeholder="0.00"
            className="w-full sm:w-36 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-white font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Estado: Cargando */}
      {cargando && (
        <div className="p-4 flex items-center justify-center gap-2 text-xs text-[#7d776f] dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Calculando proyección de deuda...</span>
        </div>
      )}

      {/* Estado: Error */}
      {error && !cargando && (
        <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Contenido Proyectado */}
      {!cargando && !error && proyeccion && (
        <div className="space-y-3 pt-1">
          {/* Tabla de Cargos */}
          <div className="overflow-x-auto rounded-xl border border-[#cec8bc] dark:border-slate-700 bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead>
                <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#ede9e1]/70 dark:bg-slate-800/70 text-[#7d776f] dark:text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2 px-2.5">Período</th>
                  <th className="py-2 px-2.5">Vencimiento</th>
                  <th className="py-2 px-2.5">Tipo</th>
                  <th className="py-2 px-2.5 text-right">Capital</th>
                  <th className="py-2 px-2.5 text-right">Agua</th>
                  <th className="py-2 px-2.5 text-right">Mora</th>
                  <th className="py-2 px-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cec8bc]/40 dark:divide-slate-800">
                {proyeccion.cargos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-[#7d776f] dark:text-slate-400 italic">
                      Sin cargos pendientes ni proyectados a esta fecha.
                    </td>
                  </tr>
                ) : (
                  proyeccion.cargos.map((c, idx) => (
                    <tr key={`${c.periodo}-${idx}`} className="hover:bg-[#dfd9ce]/30 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-2.5 font-bold text-[#262422] dark:text-white">
                        {c.periodo}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-[#5c5750] dark:text-slate-400">
                        {c.fechaVencimiento}
                      </td>
                      <td className="py-2 px-2.5">
                        {c.tipo === 'PROYECTADA' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                            Proyectada
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400">
                            Existente
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono">
                        Bs. {c.capital.toFixed(2)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-[#5c5750] dark:text-slate-400">
                        {c.agua > 0 ? `Bs. ${c.agua.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono">
                        {c.mora > 0 ? (
                          <span className="text-rose-600 font-bold">
                            +Bs. {c.mora.toFixed(2)}
                            {c.mesesMora > 0 && (
                              <span className="text-[10px] font-normal block text-[#7d776f]">
                                ({c.mesesMora} m)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">Bs. 0.00</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-[#262422] dark:text-white">
                        Bs. {c.total.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Anticipos y Desglose de Totales */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-[#5c5750] dark:text-slate-400">
              <span>Capital acumulado:</span>
              <span className="font-bold text-[#262422] dark:text-white">
                Bs. {proyeccion.totales.capital.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-[#5c5750] dark:text-slate-400">
              <span>Mora calculada:</span>
              <span
                className={`font-bold ${
                  proyeccion.totales.mora > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                + Bs. {proyeccion.totales.mora.toFixed(2)}
              </span>
            </div>
            {proyeccion.anticiposAFavor > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                <span>Anticipos a favor aplicados:</span>
                <span className="font-bold">
                  - Bs. {proyeccion.totales.anticipos.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-[#cec8bc] dark:border-slate-800 text-sm font-black text-emerald-700 dark:text-emerald-400">
              <span className="text-xs uppercase text-[#262422] dark:text-white font-black">
                TOTAL A COBRAR:
              </span>
              <span className="text-base">
                Bs. {proyeccion.totales.totalAPagar.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Avisos del Backend */}
          {proyeccion.avisos && proyeccion.avisos.length > 0 && (
            <div className="space-y-1">
              {proyeccion.avisos.map((aviso, idx) => (
                <div
                  key={`aviso-${idx}`}
                  className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-300 flex items-start gap-1.5"
                >
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                  <span>{aviso}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
