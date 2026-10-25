// frontend/components/departamentos/AguaDepartamentosTab.tsx
// Gestión manual de montos de agua por departamento y período (Edificio XYZ)
// Conectado a GET /api/v1/agua/montos y PUT /api/v1/agua/montos
'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Droplets, Calendar, Save, RotateCcw, AlertTriangle, AlertCircle, CheckCircle2, DollarSign, Building2, Search } from 'lucide-react'
import { UnidadItem } from './types'
import { apiFetch } from '@/lib/api'

interface AguaDepartamentosTabProps {
  unidades: UnidadItem[]
  showToast: (msg: string) => void
}

interface MontoAguaItem {
  idDepartamento: number
  numero: string
  propietario?: string
  montoAgua: number
  idMonto?: number
}

export default function AguaDepartamentosTab({
  unidades,
  showToast
}: AguaDepartamentosTabProps) {
  // Periodo por defecto YYYY-MM
  const periodoActualDefault = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }, [])

  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(periodoActualDefault)
  const [montosAgua, setMontosAgua] = useState<MontoAguaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Departamentos tipo "Departamento"
  const deptosList = useMemo(() => {
    return unidades.filter((u) => u.tipoUnidad === 'Departamento')
  }, [unidades])

  // Cargar montos de agua para el período
  const fetchMontosAgua = useCallback(async (periodoStr: string) => {
    setLoading(true)
    setErrorBanner(null)
    try {
      const res = await apiFetch(`/api/v1/agua/montos?periodo=${periodoStr}`)
      if (res.ok) {
        const json = await res.json()
        const mapApi = new Map<number, { idMonto: number; montoAgua: number }>()
        if (json.data && Array.isArray(json.data)) {
          json.data.forEach((m: any) => {
            mapApi.set(Number(m.idDepartamento), {
              idMonto: m.idMonto,
              montoAgua: Number(m.montoAgua)
            })
          })
        }

        const items: MontoAguaItem[] = deptosList.map((d) => {
          const apiItem = mapApi.get(d.id)
          return {
            idDepartamento: d.id,
            numero: d.numero,
            propietario: d.propietario?.nombre || 'Propietario',
            montoAgua: apiItem !== undefined ? apiItem.montoAgua : 0,
            idMonto: apiItem?.idMonto
          }
        })
        setMontosAgua(items)
      } else {
        const errJson = await res.json().catch(() => ({}))
        setErrorBanner(errJson.message || 'Error al cargar montos de agua')
      }
    } catch {
      setErrorBanner('Error de conexión al cargar montos de agua')
    } finally {
      setLoading(false)
    }
  }, [deptosList])

  useEffect(() => {
    fetchMontosAgua(periodoSeleccionado)
  }, [periodoSeleccionado, fetchMontosAgua])

  const handleCambioMonto = (idDepto: number, valorStr: string) => {
    const valNum = valorStr === '' ? 0 : Number(valorStr)
    setMontosAgua((prev) =>
      prev.map((item) =>
        item.idDepartamento === idDepto
          ? { ...item, montoAgua: isNaN(valNum) ? 0 : valNum }
          : item
      )
    )
  }

  const handleGuardarTodos = async () => {
    setErrorBanner(null)
    setGuardando(true)

    // Validar que no haya montos negativos
    for (const item of montosAgua) {
      if (item.montoAgua < 0) {
        setErrorBanner(`El monto de agua para el Dpto. ${item.numero} no puede ser negativo.`)
        setGuardando(false)
        return
      }
    }

    try {
      const payload = {
        periodo: periodoSeleccionado,
        montos: montosAgua.map((m) => ({
          idDepartamento: m.idDepartamento,
          montoAgua: Number(m.montoAgua)
        }))
      }

      const res = await apiFetch('/api/v1/agua/montos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 409) {
          setErrorBanner(
            json.message ||
              'Conflicto (409): Ya existe una expensa emitida para uno o más departamentos en este período. No se puede modificar el monto de agua.'
          )
        } else {
          setErrorBanner(json.message || `Error al registrar montos de agua (${res.status})`)
        }
        showToast(json.message || 'Error al guardar montos de agua')
        return
      }

      await fetchMontosAgua(periodoSeleccionado)
      showToast(`¡Montos de agua del período ${periodoSeleccionado} guardados exitosamente!`)
    } catch {
      setErrorBanner('Error de conexión al guardar los montos de agua')
    } finally {
      setGuardando(false)
    }
  }

  const montosFiltrados = useMemo(() => {
    return montosAgua.filter((m) => {
      const q = searchTerm.toLowerCase()
      return (
        m.numero.toLowerCase().includes(q) ||
        (m.propietario && m.propietario.toLowerCase().includes(q))
      )
    })
  }, [montosAgua, searchTerm])

  const totalAguaPeriodo = useMemo(() => {
    return montosAgua.reduce((acc, m) => acc + (m.montoAgua || 0), 0)
  }, [montosAgua])

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* BANNER PRINCIPAL */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-800 dark:text-blue-400 border border-blue-500/20 text-xs font-bold mb-2">
            <Droplets className="w-3.5 h-3.5" />
            Consumo de Agua Manual por Departamento
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#262422] dark:text-white">
            Registro de Montos de Agua
          </h2>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Monto directo en bolivianos (Bs) por departamento y mes. Se integran automáticamente en la emisión de expensas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Calendar className="w-4 h-4 text-[#7d776f]" />
            <label htmlFor="periodoAgua" className="font-bold text-[#5c5750] dark:text-slate-300">
              Período:
            </label>
            <input
              id="periodoAgua"
              type="month"
              value={periodoSeleccionado}
              onChange={(e) => setPeriodoSeleccionado(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white font-mono font-bold focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleGuardarTodos}
            disabled={guardando || loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-900/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{guardando ? 'Guardando...' : 'Guardar Todos los Montos'}</span>
          </button>
        </div>
      </div>

      {/* ALERTA DE ERROR / CONFLICTO 409 */}
      {errorBanner && (
        <div className="p-4 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-2xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-xs sm:text-sm block">Aviso del Sistema</span>
            <p className="text-xs leading-relaxed">{errorBanner}</p>
          </div>
        </div>
      )}

      {/* METRICAS DEL PERÍODO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-[#7d776f] dark:text-slate-400">Total Departamentos</div>
          <div className="text-2xl font-extrabold text-[#262422] dark:text-white mt-1 font-mono">
            {deptosList.length}
          </div>
          <div className="text-[11px] text-[#7d776f] mt-0.5">Unidades habitacionales del edificio</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-[#7d776f] dark:text-slate-400">Total Agua Período</div>
          <div className="text-2xl font-extrabold text-blue-700 dark:text-blue-400 mt-1 font-mono">
            Bs. {totalAguaPeriodo.toFixed(2)}
          </div>
          <div className="text-[11px] text-[#7d776f] mt-0.5">Suma total a prorratear / cobrar en el mes</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-[#7d776f] dark:text-slate-400">Promedio por Dpto.</div>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
            Bs. {deptosList.length > 0 ? (totalAguaPeriodo / deptosList.length).toFixed(2) : '0.00'}
          </div>
          <div className="text-[11px] text-[#7d776f] mt-0.5">Monto medio mensual</div>
        </div>
      </div>

      {/* TABLA DE MONTOS */}
      <div className="rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/40 dark:bg-slate-950/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="w-4 h-4 text-[#7d776f] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por departamento o propietario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <button
            type="button"
            onClick={() => fetchMontosAgua(periodoSeleccionado)}
            className="text-xs text-[#5c5750] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white flex items-center gap-1 cursor-pointer font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Recargar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/70 dark:bg-slate-950/70 text-[#7d776f] uppercase text-[10px] font-bold">
                <th className="py-3 px-4">Departamento</th>
                <th className="py-3 px-4">Propietario</th>
                <th className="py-3 px-4">Período</th>
                <th className="py-3 px-4 text-right">Monto de Agua (Bs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cec8bc] dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#7d776f]">
                    Cargando montos de agua...
                  </td>
                </tr>
              ) : montosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#7d776f]">
                    No se encontraron departamentos.
                  </td>
                </tr>
              ) : (
                montosFiltrados.map((m) => (
                  <tr key={m.idDepartamento} className="hover:bg-[#dfd9ce]/40 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-extrabold text-[#262422] dark:text-white">
                      Dpto. {m.numero}
                    </td>
                    <td className="py-3 px-4 text-[#5c5750] dark:text-slate-300">
                      {m.propietario}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#7d776f]">
                      {periodoSeleccionado}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <span className="font-bold text-xs text-[#7d776f]">Bs.</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={m.montoAgua === 0 ? '' : m.montoAgua}
                          placeholder="0.00"
                          onChange={(e) => handleCambioMonto(m.idDepartamento, e.target.value)}
                          className="w-28 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 font-mono font-bold text-sm text-right text-blue-700 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#cec8bc] dark:border-slate-700 bg-[#dfd9ce]/80 dark:bg-slate-950/80 font-black text-xs text-[#262422] dark:text-white font-mono">
                <td colSpan={3} className="py-3 px-4 uppercase font-sans">
                  TOTAL AGUA REGISTRADO ({deptosList.length} DEPARTAMENTOS)
                </td>
                <td className="py-3 px-4 text-right text-sm text-blue-700 dark:text-blue-400">
                  Bs. {totalAguaPeriodo.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
