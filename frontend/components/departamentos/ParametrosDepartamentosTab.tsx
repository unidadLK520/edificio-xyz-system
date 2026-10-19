// frontend/components/departamentos/ParametrosDepartamentosTab.tsx
// Pestaña de Parámetros y Medidores de Departamentos (Reglas de Cobro: Mora, Agua y Expensas Base)
'use client'

import React, { useState, useMemo } from 'react'
import {
  Calculator,
  Droplets,
  Calendar,
  Save,
  Printer,
  RotateCcw,
  Search,
  Filter,
  Edit,
  CheckCircle2,
  AlertTriangle,
  Gauge,
  Sliders,
  Building2,
  DollarSign,
  Percent,
  Info
} from 'lucide-react'
import { UnidadItem, ParametrosCobroConfig } from './types'
import EditarParametrosModal from './EditarParametrosModal'

interface ParametrosDepartamentosTabProps {
  unidades: UnidadItem[]
  onUpdateUnidad: (updated: UnidadItem) => void
  onUpdateMultiple: (updatedList: UnidadItem[]) => void
  showToast: (msg: string) => void
}

export const DEFAULT_CONFIG_PARAMETROS: ParametrosCobroConfig = {
  diaLimitePago: 10,
  tipoMora: 'porcentaje',
  valorMoraPorcentaje: 0,
  tarifaAguaM3: 5,
  expensaBaseTipoA: 300,
  expensaBaseTipoB: 350,
  expensaBaseTipoC: 400
}

export default function ParametrosDepartamentosTab({
  unidades,
  onUpdateUnidad,
  onUpdateMultiple,
  showToast
}: ParametrosDepartamentosTabProps) {
  // Configuración global de parámetros
  const [config, setConfig] = useState<ParametrosCobroConfig>(DEFAULT_CONFIG_PARAMETROS)

  const [reglaMoraActiva, setReglaMoraActiva] = useState<{ idReglaMora: number; tasaInteres: number; diasGracia: number; fechaCreacion: string; usuarioCreacion?: any } | null>(null)
  const [historialReglasMora, setHistorialReglasMora] = useState<any[]>([])
  const [tasaMoraInput, setTasaMoraInput] = useState<number | ''>('')
  const [guardandoMora, setGuardandoMora] = useState(false)

  const fetchReglasMora = React.useCallback(async () => {
    try {
      const res = await fetch('/api/v1/expensas/reglas-mora')
      if (res.ok) {
        const json = await res.json()
        setReglaMoraActiva(json.activa || null)
        setHistorialReglasMora(json.historial || [])
        if (json.activa) {
          const tasa = Number(json.activa.tasaInteres)
          setTasaMoraInput(tasa)
          setConfig((prev) => ({ ...prev, valorMoraPorcentaje: tasa }))
        }
      }
    } catch (err) {
      console.error('Error al cargar reglas de mora:', err)
    }
  }, [])

  React.useEffect(() => {
    fetchReglasMora()
  }, [fetchReglasMora])

  const handleGuardarReglaMora = async () => {
    if (tasaMoraInput === '' || isNaN(Number(tasaMoraInput)) || Number(tasaMoraInput) < 0 || Number(tasaMoraInput) > 100) {
      showToast('La tasa de mora debe ser un porcentaje entre 0 y 100.')
      return
    }

    setGuardandoMora(true)
    try {
      const res = await fetch('/api/v1/expensas/reglas-mora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasaInteres: Number(tasaMoraInput),
          diasGracia: 0
        })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.message || data.error || 'Error al guardar la regla de mora'
        showToast(`Error: ${msg}`)
        return
      }

      await fetchReglasMora()
      showToast('¡Regla de mora actualizada exitosamente!')
    } catch (err: any) {
      showToast('Error de conexión al actualizar la regla de mora.')
    } finally {
      setGuardandoMora(false)
    }
  }

  // Estado local editable de unidades para permitir edición en línea rápida
  const [unidadesLocales, setUnidadesLocales] = useState<UnidadItem[]>(() => {
    return unidades.map((u, idx) => {
      const tipo = u.tipologia?.includes('Tipo A')
        ? 'Tipo A'
        : u.tipologia?.includes('Tipo B')
          ? 'Tipo B'
          : 'Tipo C'
      const baseDefault =
        tipo === 'Tipo A'
          ? config.expensaBaseTipoA
          : tipo === 'Tipo B'
            ? config.expensaBaseTipoB
            : config.expensaBaseTipoC

      return {
        ...u,
        expensaBase: u.expensaBase ?? baseDefault,
        montoAgua: u.montoAgua ?? 0,
        otrosExtras: u.otrosExtras ?? 0
      }
    })
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('Todos')
  const [deptoParaEdicionCompleta, setDeptoParaEdicionCompleta] = useState<UnidadItem | null>(null)

  // Guardar configuración global
  const handleGuardarConfig = () => {
    showToast('¡Parámetros globales de cobro y mora actualizados correctamente!')
  }

  // Modificación en línea de una fila
  const handleCambioFila = (id: number, campo: keyof UnidadItem, valor: any) => {
    setUnidadesLocales((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          return { ...u, [campo]: valor }
        }
        return u
      })
    )
  }

  // Guardar una fila individual
  const handleGuardarFila = (unidad: UnidadItem) => {
    onUpdateUnidad(unidad)
    showToast(`¡Parámetros del Dpto. ${unidad.numero} actualizados correctamente!`)
  }

  // Guardar todas las unidades locales
  const handleGuardarTodos = () => {
    onUpdateMultiple(unidadesLocales)
    showToast('¡Todos los departamentos y lecturas de agua fueron guardados!')
  }

  // Filtrado de la tabla interactiva
  const deptosFiltrados = useMemo(() => {
    return unidadesLocales
      .filter((u) => u.tipoUnidad === 'Departamento')
      .filter((u) => {
        const searchLower = searchTerm.toLowerCase()
        const matchSearch =
          u.numero.toLowerCase().includes(searchLower) ||
          (u.propietario && u.propietario.nombre.toLowerCase().includes(searchLower)) ||
          (u.inquilinoActual && u.inquilinoActual.nombre.toLowerCase().includes(searchLower))

        const matchTipo =
          filtroTipo === 'Todos' ||
          (filtroTipo === 'Tipo A' && u.tipologia?.includes('Tipo A')) ||
          (filtroTipo === 'Tipo B' && u.tipologia?.includes('Tipo B')) ||
          (filtroTipo === 'Tipo C' && u.tipologia?.includes('Tipo C'))

        return matchSearch && matchTipo
      })
  }, [unidadesLocales, searchTerm, filtroTipo])

  // Totales y Estadísticas de Cobro
  const totales = useMemo(() => {
    const list = unidadesLocales.filter((u) => u.tipoUnidad === 'Departamento')
    const totalBase = list.reduce((acc, u) => acc + (u.expensaBase || 0), 0)
    const totalMontoAgua = list.reduce((acc, u) => acc + (u.montoAgua || 0), 0)
    const totalExtras = list.reduce((acc, u) => acc + (u.otrosExtras || 0), 0)
    const totalSinMora = totalBase + totalMontoAgua + totalExtras

    // Mora proyectada total
    const totalMora = list.reduce((acc, u) => {
      const sub = (u.expensaBase || 0) + (u.montoAgua || 0) + (u.otrosExtras || 0)
      const mora = sub * ((config.valorMoraPorcentaje || 0) / 100)
      return acc + mora
    }, 0)

    return {
      totalBase,
      totalMontoAgua,
      totalExtras,
      totalSinMora,
      totalMora,
      totalConMora: totalSinMora + totalMora
    }
  }, [unidadesLocales, config])

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* BANNER INFORMATIVO DE PARÁMETROS */}
      <div className="p-5 rounded-3xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <h2 className="font-black text-base sm:text-lg text-blue-950 dark:text-blue-200">
              Configuración de Parámetros de Cobro & Reglas de Mora
            </h2>
          </div>
          <p className="text-xs text-blue-800 dark:text-blue-300 mt-1 max-w-3xl leading-relaxed">
            Administración de cuotas base por tipología y regla de mora porcentual oficial del edificio.
            políticas de recargos por mora.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-800/20"
          >
            <Printer className="w-4 h-4" />
            Imprimir Planilla
          </button>
        </div>
      </div>

      {/* SECCIÓN 1: TARJETAS DE CONFIGURACIÓN GLOBAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* TARJETA 1: REGLAS DE MORA (CONECTADA A LA API) */}
        <div className="p-5 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-extrabold text-sm text-[#262422] dark:text-white">
                1. Regla de Mora Oficial
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
              {reglaMoraActiva ? `${reglaMoraActiva.tasaInteres}% activa` : 'Sin regla'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Tasa de Interés Mensual (%) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={tasaMoraInput}
                  onChange={(e) => setTasaMoraInput(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-24 px-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 font-mono font-bold text-center text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <span className="font-bold text-xs">%</span>
                <button
                  type="button"
                  disabled={guardandoMora}
                  onClick={handleGuardarReglaMora}
                  className="px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {guardandoMora ? 'Guardando...' : 'Guardar Tasa'}
                </button>
              </div>
              <p className="text-[10px] text-[#7d776f] mt-1">
                Aplica a expensas vencidas sin días de gracia (según configuración de la API).
              </p>
            </div>

            {/* Historial */}
            {historialReglasMora.length > 0 && (
              <div className="pt-2 border-t border-[#cec8bc] dark:border-slate-800 space-y-1.5">
                <span className="font-bold text-[11px] text-[#5c5750] dark:text-slate-300 block">
                  Historial de Tasas:
                </span>
                <div className="max-h-24 overflow-y-auto space-y-1 text-[10px]">
                  {historialReglasMora.map((r: any) => (
                    <div key={r.idReglaMora} className="flex justify-between items-center py-0.5 px-2 rounded-lg bg-[#dfd9ce]/60 dark:bg-slate-800/60 font-mono">
                      <span>{new Date(r.fechaCreacion).toLocaleDateString()} — {r.tasaInteres}%</span>
                      <span className={r.activa ? 'text-emerald-600 font-bold' : 'text-[#7d776f]'}>
                        {r.activa ? 'Activa' : 'Histórica'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TARJETA 2: AGUA MANUAL POR DEPARTAMENTO */}
        <div className="p-5 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-extrabold text-sm text-[#262422] dark:text-white">
                2. Agua Manual por Departamento
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
              PUT /agua/montos
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800 text-[11px] space-y-1">
              <span className="font-bold text-xs text-[#262422] dark:text-white block">
                Monto Fijo Mensual Directo
              </span>
              <p className="text-[#5c5750] dark:text-slate-400 leading-relaxed">
                El monto de agua se registra manualmente por departamento y mes en la pestaña dedicada "Consumo de Agua (Bs)". No se utilizan medidores ni tarifas por metro cúbico.
              </p>
            </div>
          </div>
        </div>

        {/* TARJETA 3: EXPENSAS BASE POR TIPOLOGÍA */}
        <div className="p-5 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-extrabold text-sm text-[#262422] dark:text-white">
                3. Expensas Base por Tipología
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              A: 300 | B: 350 | C: 400
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/70 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800">
              <div>
                <span className="font-bold text-[#262422] dark:text-white block">Tipo A</span>
                <span className="text-[10px] text-[#7d776f]">4 departamentos (60 m²)</span>
              </div>
              <div className="flex items-center gap-1 font-mono font-bold">
                <span>Bs.</span>
                <input
                  type="number"
                  value={config.expensaBaseTipoA}
                  onChange={(e) =>
                    setConfig({ ...config, expensaBaseTipoA: Number(e.target.value) })
                  }
                  className="w-20 px-2 py-1 rounded-lg bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-right font-bold text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-white/70 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800">
              <div>
                <span className="font-bold text-[#262422] dark:text-white block">Tipo B</span>
                <span className="text-[10px] text-[#7d776f]">10 departamentos (80 m²)</span>
              </div>
              <div className="flex items-center gap-1 font-mono font-bold">
                <span>Bs.</span>
                <input
                  type="number"
                  value={config.expensaBaseTipoB}
                  onChange={(e) =>
                    setConfig({ ...config, expensaBaseTipoB: Number(e.target.value) })
                  }
                  className="w-20 px-2 py-1 rounded-lg bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-right font-bold text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-white/70 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800">
              <div>
                <span className="font-bold text-[#262422] dark:text-white block">Tipo C</span>
                <span className="text-[10px] text-[#7d776f]">6 departamentos (100 m²)</span>
              </div>
              <div className="flex items-center gap-1 font-mono font-bold">
                <span>Bs.</span>
                <input
                  type="number"
                  value={config.expensaBaseTipoC}
                  onChange={(e) =>
                    setConfig({ ...config, expensaBaseTipoC: Number(e.target.value) })
                  }
                  className="w-20 px-2 py-1 rounded-lg bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-right font-bold text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleGuardarConfig}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                Guardar Parámetros Globales
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: BARRA DE BÚSQUEDA Y TOTALES */}
      <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por departamento, medidor, propietario o inquilino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#7d776f]" />
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
            >
              <option
                value="Todos"
                className="bg-[#ede9e1] dark:bg-slate-900 text-[#262422] dark:text-white"
              >
                Tipología: Todas
              </option>
              <option
                value="Tipo A"
                className="bg-[#ede9e1] dark:bg-slate-900 text-[#262422] dark:text-white"
              >
                Tipo A (300 Bs)
              </option>
              <option
                value="Tipo B"
                className="bg-[#ede9e1] dark:bg-slate-900 text-[#262422] dark:text-white"
              >
                Tipo B (350 Bs)
              </option>
              <option
                value="Tipo C"
                className="bg-[#ede9e1] dark:bg-slate-900 text-[#262422] dark:text-white"
              >
                Tipo C (400 Bs)
              </option>
            </select>
          </div>

          <button
            onClick={handleGuardarTodos}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar Todos los Cambios
          </button>
        </div>
      </div>

      {/* SECCIÓN 3: TABLA INTERACTIVA DE DEPARTAMENTOS CON EDICIÓN RÁPIDA */}
      <div className="rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/40 dark:bg-slate-950/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h4 className="font-black text-sm text-[#262422] dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-700" />
              Edición Interactiva de Departamentos (20 Unidades)
            </h4>
            <p className="text-xs text-[#7d776f] dark:text-slate-400">
              Edita las lecturas de medidor y expensas base directamente en las celdas de la tabla.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-blue-800 dark:text-blue-300">
            Total Estimado: Bs.{' '}
            {totales.totalSinMora.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/70 dark:bg-slate-950/70 text-[#7d776f] uppercase text-[10px] font-bold">
                <th className="py-3 px-3">Departamento</th>
                <th className="py-3 px-3">Titular / Ocupante</th>
                <th className="py-3 px-3">Exp. Base (Bs)</th>
                <th className="py-3 px-3">Monto Agua (Bs)</th>
                <th className="py-3 px-3">Otros Extras (Bs)</th>
                <th className="py-3 px-3 font-black text-[#262422] dark:text-white">
                  Subtotal (&lt; 10)
                </th>
                <th className="py-3 px-3 text-red-700 dark:text-red-400 font-bold">
                  Mora (&ge; 10)
                </th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cec8bc] dark:divide-slate-800">
              {deptosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#7d776f]">
                    No se encontraron departamentos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                deptosFiltrados.map((u) => {
                  const subtotalFila =
                    (u.expensaBase || 0) + (u.montoAgua || 0) + (u.otrosExtras || 0)
                  const moraFila = subtotalFila * ((config.valorMoraPorcentaje || 0) / 100)
                  const totalConMoraFila = subtotalFila + moraFila

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-[#dfd9ce]/40 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Depto */}
                      <td className="py-2.5 px-3">
                        <div className="font-black text-[#262422] dark:text-white">
                          Dpto. {u.numero}
                        </div>
                        <div className="text-[10px] text-[#7d776f]">
                          {u.tipologia?.split(' ')[0] || 'Tipo B'} • Piso {u.piso || 1}
                        </div>
                      </td>

                      {/* Titular */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-[#262422] dark:text-white truncate max-w-[140px]">
                          {u.propietario?.nombre || 'Sin titular'}
                        </div>
                        {u.inquilinoActual && (
                          <div className="text-[10px] text-purple-700 dark:text-purple-400 truncate max-w-[140px]">
                            Inq: {u.inquilinoActual.nombre}
                          </div>
                        )}
                      </td>

                      {/* Expensa Base Editable */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[#7d776f] font-mono text-[11px]">Bs.</span>
                          <input
                            type="number"
                            step="0.01"
                            value={u.expensaBase ?? 0}
                            onChange={(e) =>
                              handleCambioFila(u.id, 'expensaBase', Number(e.target.value))
                            }
                            className="w-20 px-2 py-1 rounded-lg bg-white dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 font-mono font-bold text-xs text-[#262422] dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          />
                        </div>
                      </td>

                      {/* Monto Agua Editable */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[#7d776f] font-mono text-[11px]">Bs.</span>
                          <input
                            type="number"
                            step="0.01"
                            value={u.montoAgua ?? 0}
                            onChange={(e) =>
                              handleCambioFila(u.id, 'montoAgua', Number(e.target.value))
                            }
                            className="w-20 px-2 py-1 rounded-lg bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-800 font-mono text-xs text-[#262422] dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          />
                        </div>
                      </td>

                      {/* Otros Extras Editable */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[#7d776f] font-mono text-[11px]">Bs.</span>
                          <input
                            type="number"
                            step="0.01"
                            value={u.otrosExtras ?? 0}
                            onChange={(e) =>
                              handleCambioFila(u.id, 'otrosExtras', Number(e.target.value))
                            }
                            className="w-20 px-2 py-1 rounded-lg bg-white dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 font-mono text-xs text-[#262422] dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          />
                        </div>
                      </td>

                      {/* Subtotal sin mora (< 10 día) */}
                      <td className="py-2.5 px-3 font-mono">
                        <div className="font-black text-sm text-emerald-800 dark:text-emerald-300">
                          Bs. {subtotalFila.toFixed(2)}
                        </div>
                        <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-semibold">
                          Sin mora
                        </span>
                      </td>

                      {/* Mora (>= 10 día) */}
                      <td className="py-2.5 px-3 font-mono">
                        <div className="font-bold text-xs text-red-700 dark:text-red-400">
                          +Bs. {moraFila.toFixed(2)}
                        </div>
                        <div className="text-[9px] text-[#7d776f]">
                          Total: Bs. {totalConMoraFila.toFixed(2)}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleGuardarFila(u)}
                            className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 cursor-pointer transition-all"
                            title="Guardar cambios de este departamento"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeptoParaEdicionCompleta(u)}
                            className="p-1.5 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300 cursor-pointer transition-all"
                            title="Abrir formulario de edición completa"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#cec8bc] dark:border-slate-700 bg-[#dfd9ce]/80 dark:bg-slate-950/80 font-black text-xs text-[#262422] dark:text-white font-mono">
                <td colSpan={2} className="py-3 px-3 uppercase font-sans">
                  TOTAL GENERAL ({deptosFiltrados.length} DEPARTAMENTOS)
                </td>
                <td className="py-3 px-3">Bs. {totales.totalBase.toFixed(2)}</td>
                <td className="py-3 px-3 text-blue-900 dark:text-blue-300">
                  Bs. {totales.totalMontoAgua.toFixed(2)}
                </td>
                <td className="py-3 px-3">
                  Bs. {totales.totalExtras.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-emerald-800 dark:text-emerald-300 text-sm">
                  Bs. {totales.totalSinMora.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-red-700 dark:text-red-400">
                  +Bs. {totales.totalMora.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right font-sans">
                  <span className="text-[10px] text-[#7d776f] block">Con Mora Total:</span>
                  <span className="font-mono font-black text-xs">
                    Bs. {totales.totalConMora.toFixed(2)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* MODAL DE EDICIÓN COMPLETA */}
      {deptoParaEdicionCompleta && (
        <EditarParametrosModal
          isOpen={!!deptoParaEdicionCompleta}
          depto={deptoParaEdicionCompleta}
          config={config}
          onClose={() => setDeptoParaEdicionCompleta(null)}
          onSave={(updated) => {
            handleCambioFila(updated.id, 'expensaBase', updated.expensaBase)
            handleCambioFila(updated.id, 'montoAgua', updated.montoAgua)
            handleCambioFila(updated.id, 'otrosExtras', updated.otrosExtras)
            onUpdateUnidad(updated)
            showToast(`¡Parámetros del Dpto. ${updated.numero} actualizados correctamente!`)
          }}
        />
      )}
    </div>
  )
}
