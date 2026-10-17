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
  diaLimitePago: 10, // < 10/Mes -> Mora = 0; >= 10/Mes -> Mora
  tipoMora: 'porcentaje', // 'porcentaje' (10%) o 'monto_fijo' (Bs 50)
  valorMoraPorcentaje: 10,
  valorMoraFijo: 50,
  frecuenciaMora: 'mes', // 'mes' o 'dia'
  tarifaAguaM3: 5, // 5 Bs / m3
  expensaBaseTipoA: 300, // 300 Bs
  expensaBaseTipoB: 350, // 350 Bs
  expensaBaseTipoC: 400 // 400 Bs
}

export default function ParametrosDepartamentosTab({
  unidades,
  onUpdateUnidad,
  onUpdateMultiple,
  showToast
}: ParametrosDepartamentosTabProps) {
  // Configuración global de parámetros
  const [config, setConfig] = useState<ParametrosCobroConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved =
        localStorage.getItem('edificio_xyz_config_parametros') ||
        localStorage.getItem('edificio_xyz_config_cobros')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {}
      }
    }
    return DEFAULT_CONFIG_PARAMETROS
  })

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

      // Valores de lecturas de agua
      const lectAnt = u.lecturaAnteriorAgua ?? 240 + idx * 8
      const lectAct = u.lecturaActualAgua ?? lectAnt + (idx % 3 === 0 ? 5 : idx % 2 === 0 ? 3 : 4)
      const cubos = Math.max(0, lectAct - lectAnt)
      const montoAg = cubos * config.tarifaAguaM3
      const extras = u.otrosExtras ?? 0

      return {
        ...u,
        expensaBase: u.expensaBase ?? baseDefault,
        codigoMedidor: u.codigoMedidor || `MED-${u.numero}`,
        lecturaAnteriorAgua: lectAnt,
        lecturaActualAgua: lectAct,
        tarifaAguaM3: u.tarifaAguaM3 ?? config.tarifaAguaM3,
        consumoAguaM3: cubos,
        montoAgua: montoAg,
        otrosExtras: extras,
        fechaLecturaAnterior: u.fechaLecturaAnterior || '30/Sep/2026',
        fechaLecturaActual: u.fechaLecturaActual || '31/Oct/2026'
      }
    })
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('Todos')
  const [deptoParaEdicionCompleta, setDeptoParaEdicionCompleta] = useState<UnidadItem | null>(null)

  // Guardar configuración global
  const handleGuardarConfig = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('edificio_xyz_config_parametros', JSON.stringify(config))
    }
    showToast('¡Parámetros globales de cobro y mora guardados correctamente!')
  }

  // Modificación en línea de una fila
  const handleCambioFila = (id: number, campo: keyof UnidadItem, valor: any) => {
    setUnidadesLocales((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const updated = { ...u, [campo]: valor }

          // Si cambiaron las lecturas, recalcular cubos y monto de agua
          if (campo === 'lecturaAnteriorAgua' || campo === 'lecturaActualAgua') {
            const ant =
              campo === 'lecturaAnteriorAgua' ? Number(valor) : updated.lecturaAnteriorAgua || 0
            const act =
              campo === 'lecturaActualAgua' ? Number(valor) : updated.lecturaActualAgua || 0
            const consumo = Math.max(0, act - ant)
            updated.consumoAguaM3 = consumo
            updated.montoAgua = consumo * (updated.tarifaAguaM3 || config.tarifaAguaM3)
          }

          return updated
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
          (u.inquilinoActual && u.inquilinoActual.nombre.toLowerCase().includes(searchLower)) ||
          (u.codigoMedidor && u.codigoMedidor.toLowerCase().includes(searchLower))

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
    const totalCubosAgua = list.reduce((acc, u) => acc + (u.consumoAguaM3 || 0), 0)
    const totalMontoAgua = list.reduce((acc, u) => acc + (u.montoAgua || 0), 0)
    const totalExtras = list.reduce((acc, u) => acc + (u.otrosExtras || 0), 0)
    const totalSinMora = totalBase + totalMontoAgua + totalExtras

    // Mora proyectada total
    const totalMora = list.reduce((acc, u) => {
      const sub = (u.expensaBase || 0) + (u.montoAgua || 0) + (u.otrosExtras || 0)
      const mora =
        config.tipoMora === 'porcentaje'
          ? sub * (config.valorMoraPorcentaje / 100)
          : config.valorMoraFijo
      return acc + mora
    }, 0)

    return {
      totalBase,
      totalCubosAgua,
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
              Configuración de Parámetros de Cobro & Lecturas de Agua
            </h2>
          </div>
          <p className="text-xs text-blue-800 dark:text-blue-300 mt-1 max-w-3xl leading-relaxed">
            Administración de cuotas base por tipología, tarifas de medidores de agua potable y
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
        {/* TARJETA 1: REGLAS DE MORA */}
        <div className="p-5 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-600 dark:text-red-400" />
              <h3 className="font-extrabold text-sm text-[#262422] dark:text-white">
                1. Regla de Mora e Intereses
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300">
              &lt; 10 = Mora 0
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Día de Corte / Gracia sin Mora *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={config.diaLimitePago}
                  onChange={(e) => setConfig({ ...config, diaLimitePago: Number(e.target.value) })}
                  className="w-20 px-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 font-mono font-bold text-center text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-[#7d776f]">de cada mes (antes de este día: Mora = 0)</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Tipo de Recargo (&ge; Día {config.diaLimitePago}) *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, tipoMora: 'porcentaje' })}
                  className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    config.tipoMora === 'porcentaje'
                      ? 'bg-blue-700 text-white shadow-md'
                      : 'bg-[#dfd9ce] dark:bg-slate-800 text-[#5c5750] dark:text-slate-400'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  10% Porcentual
                </button>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, tipoMora: 'monto_fijo' })}
                  className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    config.tipoMora === 'monto_fijo'
                      ? 'bg-blue-700 text-white shadow-md'
                      : 'bg-[#dfd9ce] dark:bg-slate-800 text-[#5c5750] dark:text-slate-400'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Bs. 50 Fijo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                  {config.tipoMora === 'porcentaje' ? 'Porcentaje (%)' : 'Monto Fijo (Bs)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={
                    config.tipoMora === 'porcentaje'
                      ? config.valorMoraPorcentaje
                      : config.valorMoraFijo
                  }
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      [config.tipoMora === 'porcentaje' ? 'valorMoraPorcentaje' : 'valorMoraFijo']:
                        Number(e.target.value)
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 font-mono font-bold text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                  Frecuencia (Conf.)
                </label>
                <select
                  value={config.frecuenciaMora}
                  onChange={(e) => setConfig({ ...config, frecuenciaMora: e.target.value as any })}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 font-bold text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option
                    value="mes"
                    className="bg-[#ede9e1] dark:bg-slate-900 text-[#262422] dark:text-white"
                  >
                    Por Mes (Mes)
                  </option>
                  <option
                    value="dia"
                    className="bg-[#ede9e1] dark:bg-slate-900 text-[#262422] dark:text-white"
                  >
                    Por Día (Día)
                  </option>
                </select>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#dfd9ce]/60 dark:bg-slate-800/60 border border-[#cec8bc] dark:border-slate-700 text-[11px] text-[#5c5750] dark:text-slate-300">
              El recargo configurado se aplica automáticamente a partir del día siguiente al límite
              fijado.
            </div>
          </div>
        </div>

        {/* TARJETA 2: TARIFA DE AGUA Y MEDIDORES */}
        <div className="p-5 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-extrabold text-sm text-[#262422] dark:text-white">
                2. Medidor de Agua (Cubos)
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
              5 Bs / Cubo
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Tarifa por Cubo (Metro Cúbico m³) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  value={config.tarifaAguaM3}
                  onChange={(e) => setConfig({ ...config, tarifaAguaM3: Number(e.target.value) })}
                  className="w-24 px-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 font-mono font-bold text-sm text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-[#7d776f]">Bs. por cada m³ consumido</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800 text-[11px] space-y-1">
              <span className="font-bold text-xs text-[#262422] dark:text-white block">
                Cálculo de Consumo
              </span>
              <p className="text-[#5c5750] dark:text-slate-400 leading-relaxed">
                Consumo = Lectura Actual − Lectura Anterior (m³). El importe a cobrar se liquida
                multiplicando el consumo por la tarifa unitaria fijada.
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
                <th className="py-3 px-3">Medidor</th>
                <th className="py-3 px-2">Lect. Anterior</th>
                <th className="py-3 px-2">Lect. Actual</th>
                <th className="py-3 px-2 text-center">Consumo (Cubos)</th>
                <th className="py-3 px-2">Agua / Extras (Bs)</th>
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
                  <td colSpan={11} className="py-8 text-center text-[#7d776f]">
                    No se encontraron departamentos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                deptosFiltrados.map((u, idx) => {
                  const subtotalFila =
                    (u.expensaBase || 0) + (u.montoAgua || 0) + (u.otrosExtras || 0)
                  const moraFila =
                    config.tipoMora === 'porcentaje'
                      ? subtotalFila * (config.valorMoraPorcentaje / 100)
                      : config.valorMoraFijo
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

                      {/* Medidor Código */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#5c5750] dark:text-slate-400">
                        {u.codigoMedidor || `MED-${u.numero}`}
                      </td>

                      {/* Lectura Anterior Editable */}
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={u.lecturaAnteriorAgua ?? 0}
                          onChange={(e) =>
                            handleCambioFila(u.id, 'lecturaAnteriorAgua', Number(e.target.value))
                          }
                          className="w-18 px-2 py-1 rounded-lg bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-800 font-mono text-xs text-[#262422] dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                      </td>

                      {/* Lectura Actual Editable */}
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={u.lecturaActualAgua ?? 0}
                          onChange={(e) =>
                            handleCambioFila(u.id, 'lecturaActualAgua', Number(e.target.value))
                          }
                          className="w-18 px-2 py-1 rounded-lg bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-800 font-mono font-bold text-xs text-[#262422] dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                      </td>

                      {/* Consumo Calculado en Cubos */}
                      <td className="py-2.5 px-2 text-center font-mono">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 font-extrabold text-[11px]">
                          {(u.consumoAguaM3 || 0).toFixed(1)} m³
                        </span>
                      </td>

                      {/* Cobro Agua + Extras */}
                      <td className="py-2.5 px-2 font-mono">
                        <div className="font-bold text-blue-800 dark:text-blue-300">
                          Bs. {((u.montoAgua || 0) + (u.otrosExtras || 0)).toFixed(2)}
                        </div>
                        <div className="text-[9px] text-[#7d776f]">
                          ({u.consumoAguaM3 || 0}×5 {u.otrosExtras ? `+${u.otrosExtras}` : ''})
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
                  TOTAL GENERAL (20 DEPARTAMENTOS)
                </td>
                <td className="py-3 px-3">Bs. {totales.totalBase.toFixed(2)}</td>
                <td colSpan={3} className="py-3 px-2 text-right">
                  Consumo Total:
                </td>
                <td className="py-3 px-2 text-center text-blue-800 dark:text-blue-300">
                  {totales.totalCubosAgua.toFixed(1)} m³
                </td>
                <td className="py-3 px-2 text-blue-900 dark:text-blue-300">
                  Bs. {(totales.totalMontoAgua + totales.totalExtras).toFixed(2)}
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
            handleCambioFila(updated.id, 'codigoMedidor', updated.codigoMedidor)
            handleCambioFila(updated.id, 'lecturaAnteriorAgua', updated.lecturaAnteriorAgua)
            handleCambioFila(updated.id, 'lecturaActualAgua', updated.lecturaActualAgua)
            handleCambioFila(updated.id, 'otrosExtras', updated.otrosExtras)
            onUpdateUnidad(updated)
            showToast(`¡Parámetros del Dpto. ${updated.numero} actualizados correctamente!`)
          }}
        />
      )}
    </div>
  )
}
