// frontend/components/DetalleMoraModal.tsx
// Modal explicativo y analítico del cálculo y acumulación mensual de mora (Requerimiento C 3 y Pizarra)

'use client'

import React, { useState, useMemo } from 'react'
import {
  Calculator,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Printer,
  Sparkles,
  TrendingUp,
  Info,
  DollarSign,
  Building2,
  User,
  QrCode
} from 'lucide-react'
import { useFechaSistema } from '@/context/FechaSistemaContext'
import { fechaSolo } from '@/lib/fecha'

interface DetalleMoraModalProps {
  isOpen: boolean
  onClose: () => void
  expensa: any
  onOpenQr?: (expensa: any) => void
}

export default function DetalleMoraModal({
  isOpen,
  onClose,
  expensa,
  onOpenQr
}: DetalleMoraModalProps) {
  const { fechaSistema, politicaMora, calcularMoraExpensa } = useFechaSistema()
  const [proyeccionMeses, setProyeccionMeses] = useState<number>(4)

  const saldoBase = Number(expensa?.montoBase || expensa?.saldoPendiente || expensa?.monto || 0)
  const fechaVenc = expensa?.fechaVencimiento || `${fechaSistema.slice(0, 7)}-10`

  // Cálculo real a la fecha del sistema
  const calculoReal = useMemo(() => {
    return calcularMoraExpensa(fechaVenc, saldoBase)
  }, [calcularMoraExpensa, fechaVenc, saldoBase])

  // Desglose de meses proyectados (de 1 hasta proyeccionMeses)
  const mesesProyectados = useMemo(() => {
    const list = []
    const tipo = politicaMora.tipoPenalidad || 'fijo'
    const penalidadMensual =
      tipo === 'fijo'
        ? Number(politicaMora.montoFijo || 50)
        : Math.round(((saldoBase * Number(politicaMora.porcentaje || 10)) / 100) * 100) / 100

    let acumulado = 0
    const mesesMoraReal = calculoReal.mesesMora || 0
    for (let i = 1; i <= Math.max(proyeccionMeses, mesesMoraReal || 1); i++) {
      acumulado = Math.round((acumulado + penalidadMensual) * 100) / 100
      const esMesActual = i === mesesMoraReal && calculoReal.aplicaMora
      const esMesPasado = i < mesesMoraReal && calculoReal.aplicaMora
      list.push({
        mesNumero: i,
        rangoDias: `Día +${(i - 1) * 30 + 1} a +${i * 30}`,
        penalidadMes: penalidadMensual,
        moraAcumulada: acumulado,
        totalAdeudado: Math.round((saldoBase + acumulado) * 100) / 100,
        estado: esMesActual ? 'VIGENTE' : esMesPasado ? 'DEVENGADO' : 'PROYECCION'
      })
    }
    return list
  }, [politicaMora, saldoBase, proyeccionMeses, calculoReal])

  if (!isOpen || !expensa) return null

  const dptoNum = expensa.departamento?.numero || expensa.idDepartamento || '—'
  const propietario =
    expensa.propietarioNombre ||
    expensa.propietario ||
    (expensa.departamento?.propietario
      ? `${expensa.departamento.propietario.nombres || ''} ${expensa.departamento.propietario.apellidos || ''}`.trim()
      : 'Propietario Responsable')
  const tipologia = expensa.departamento?.tipologia || expensa.tipologia || 'Departamento'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 my-6 max-h-[92vh] overflow-y-auto">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-700 text-white flex items-center justify-center shadow-md shadow-rose-700/20 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-[#262422] dark:text-white">
                  Desglose de Aplicación y Acumulación de Mora
                </h3>
              </div>
              <p className="text-xs text-[#7d776f] dark:text-slate-400">
                Dpto. <strong className="text-[#262422] dark:text-white">{dptoNum}</strong> • {tipologia} • Titular: {propietario}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7d776f] hover:text-[#262422] dark:hover:text-white hover:bg-[#dfd9ce] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tarjeta de Resumen Rápido de Estado */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#dfd9ce]/80 dark:bg-slate-800/80 border border-[#cec8bc] dark:border-slate-700 space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#7d776f] dark:text-slate-400 block">
              Capital Original (Base)
            </span>
            <div className="text-xl font-black font-mono text-[#262422] dark:text-white">
              Bs. {saldoBase.toFixed(2)}
            </div>
            <span className="text-[10px] text-[#7d776f] dark:text-slate-400">
              Período: {fechaSolo(expensa.periodo) || expensa.periodo}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 space-y-1">
            <span className="text-[10px] font-bold uppercase text-rose-800 dark:text-rose-400 block">
              Mora Acumulada
            </span>
            <div className="text-xl font-black font-mono text-rose-700 dark:text-rose-400">
              +Bs. {calculoReal.montoMora.toFixed(2)}
            </div>
            <span className="text-[10px] text-rose-800 dark:text-rose-300 font-semibold">
              {calculoReal.aplicaMora
                ? `${calculoReal.mesesMora || 1} mes${(calculoReal.mesesMora || 1) > 1 ? 'es' : ''} de retraso (+${calculoReal.diasExceso}d)`
                : 'Sin mora (al día o en gracia)'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 space-y-1">
            <span className="text-[10px] font-bold uppercase text-indigo-800 dark:text-indigo-400 block">
              Total Liquidado
            </span>
            <div className="text-xl font-black font-mono text-indigo-700 dark:text-indigo-300">
              Bs. {(saldoBase + calculoReal.montoMora).toFixed(2)}
            </div>
            <span className="text-[10px] text-indigo-800 dark:text-indigo-300">
              Capital + Mora acumulada
            </span>
          </div>
        </div>

        {/* Explicación de la Regla de Negocio */}
        <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-blue-950 dark:text-blue-200">
            <Info className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
            <span>¿Cómo se aplica la regla de mora en el Edificio XYZ?</span>
          </div>
          <div className="text-blue-900 dark:text-blue-300 space-y-1 text-[11px] leading-relaxed">
            <p>
              • <strong>Fecha límite sin mora:</strong> Hasta el día <strong>{politicaMora.diaVencimiento || 10}</strong> de cada mes.
            </p>
            <p>
              • <strong>Período de gracia:</strong> Se otorgan <strong>{politicaMora.diasGracia || 2} días adicionales</strong> (hasta el día {(politicaMora.diaVencimiento || 10) + (politicaMora.diasGracia || 2)}) sin penalidad económica.
            </p>
            <p>
              • <strong>Fórmula de penalidad:</strong>{' '}
              {politicaMora.tipoPenalidad === 'fijo' ? (
                <>Se cobra una <strong>multa fija de Bs. {politicaMora.montoFijo || 50} por cada mes</strong> que la expensa permanezca impaga.</>
              ) : (
                <>Se aplica un <strong>interés mensual del {politicaMora.porcentaje || 10}% sobre el saldo deudor</strong> por cada mes transcurrido (Bs. {((saldoBase * (politicaMora.porcentaje || 10)) / 100).toFixed(2)} / mes).</>
              )}
            </p>
            <p>
              • <strong>Acumulación progresiva:</strong> Cada 30 días de mora que transcurren sin pagar, se añade un nuevo mes de penalidad acumulativa al saldo del departamento.
            </p>
          </div>
        </div>

        {/* TABLA DE ACUMULACIÓN MES A MES */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-extrabold text-xs text-[#262422] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-indigo-600" />
                Cronograma de Acumulación Mensual de Mora
              </h4>
              <p className="text-[11px] text-[#7d776f] dark:text-slate-400">
                Visualización mes a mes de la mora devengada y el total liquidado resultante.
              </p>
            </div>

            {/* Selector de Proyección */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-[#7d776f] font-semibold">Proyectar hasta:</span>
              <select
                value={proyeccionMeses}
                onChange={(e) => setProyeccionMeses(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-white font-bold cursor-pointer"
              >
                <option value={3}>3 Meses</option>
                <option value={4}>4 Meses</option>
                <option value={6}>6 Meses</option>
                <option value={12}>12 Meses (1 año)</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce] dark:bg-slate-900 text-[#7d776f] dark:text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-2.5 px-3">Mes Retraso</th>
                    <th className="py-2.5 px-3">Rango Días</th>
                    <th className="py-2.5 px-3 text-right">Capital Base</th>
                    <th className="py-2.5 px-3 text-right">Mora del Mes</th>
                    <th className="py-2.5 px-3 text-right font-black">Mora Acumulada</th>
                    <th className="py-2.5 px-3 text-right font-black">Total Deuda</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cec8bc]/60 dark:divide-slate-800/60 font-mono text-xs">
                  {/* Fila Mes 0 (A tiempo) */}
                  <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 text-[#262422] dark:text-slate-200">
                    <td className="py-2.5 px-3 font-bold font-sans">Mes 0 (A tiempo)</td>
                    <td className="py-2.5 px-3 text-[#7d776f] dark:text-slate-400 font-sans">Día 1 al 12 (Gracia)</td>
                    <td className="py-2.5 px-3 text-right">Bs. {saldoBase.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">Bs. 0.00</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">Bs. 0.00</td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-800 dark:text-emerald-400">
                      Bs. {saldoBase.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Sin Mora
                      </span>
                    </td>
                  </tr>

                  {/* Filas de acumulación mes a mes */}
                  {mesesProyectados.map((m) => {
                    const esVigente = m.estado === 'VIGENTE'
                    const esDevengado = m.estado === 'DEVENGADO'

                    return (
                      <tr
                        key={m.mesNumero}
                        className={
                          esVigente
                            ? 'bg-rose-100/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 font-bold'
                            : esDevengado
                              ? 'bg-rose-50/40 dark:bg-rose-950/20 text-[#262422] dark:text-slate-200'
                              : 'hover:bg-[#ede9e1]/40 dark:hover:bg-slate-800/40 text-[#5c5750] dark:text-slate-300'
                        }
                      >
                        <td className="py-2.5 px-3 font-sans font-extrabold flex items-center gap-1.5">
                          {esVigente && <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping shrink-0" />}
                          <span>Mes {m.mesNumero} en mora</span>
                        </td>
                        <td className="py-2.5 px-3 text-[#7d776f] dark:text-slate-400 font-sans">
                          {m.rangoDias}
                        </td>
                        <td className="py-2.5 px-3 text-right">Bs. {saldoBase.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right text-rose-700 dark:text-rose-400 font-bold">
                          +Bs. {m.penalidadMes.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-rose-700 dark:text-rose-400">
                          +Bs. {m.moraAcumulada.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-sm text-[#262422] dark:text-white">
                          Bs. {m.totalAdeudado.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          {esVigente ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white animate-pulse">
                              Activo Hoy
                            </span>
                          ) : esDevengado ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                              Devengado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#ded8cc] text-[#5c5750] dark:bg-slate-800 dark:text-slate-400">
                              Proyección
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-[#7d776f]">
            <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Evaluado a la fecha del sistema: <strong>{fechaSistema}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onOpenQr && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenQr(expensa)
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                Pagar con QR (Bs. {(saldoBase + calculoReal.montoMora).toFixed(2)})
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#262422] dark:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
