// frontend/context/FechaSistemaContext.tsx
// Contexto global para simulación de fecha y hora del sistema (Requerimiento C 4 y Pizarra)
// Permite alternar la fecha actual simulada para comprobar cobros con y sin mora.

'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { fechaSolo } from '@/lib/fecha'

export interface PoliticaMoraLocal {
  tipoPenalidad: 'fijo' | 'porcentaje'
  montoFijo: number
  porcentaje: number
  diaVencimiento: number
  diasGracia: number
  diaGeneracion: number
}

export const POLITICA_MORA_DEFAULT: PoliticaMoraLocal = {
  tipoPenalidad: 'fijo',
  montoFijo: 50,
  porcentaje: 10,
  diaVencimiento: 10,
  diasGracia: 2,
  diaGeneracion: 1
}

export interface DetalleMesMora {
  mesNumero: number
  concepto: string
  penalidadMes: number
  moraAcumulada: number
  saldoTotalConMora: number
}

export interface ResultadoCalculoMora {
  aplicaMora: boolean
  estadoMora: 'ANTES_VENCIMIENTO' | 'EN_VENCIMIENTO' | 'EN_GRACIA' | 'CON_MORA'
  montoMora: number
  montoMoraMensual?: number
  mesesMora?: number
  descripcionMora: string
  diasExceso: number
  tipoPenalidad?: 'fijo' | 'porcentaje'
  tasaOValor?: number
  historialMensual?: DetalleMesMora[]
}

interface FechaSistemaContextType {
  fechaSistema: string // YYYY-MM-DD
  setFechaSistema: (fecha: string) => void
  resetFechaSistema: () => void
  isSimulada: boolean
  politicaMora: PoliticaMoraLocal
  setPoliticaMora: (politica: PoliticaMoraLocal) => void
  calcularMoraExpensa: (
    fechaVencimiento: string,
    saldoBase: number
  ) => ResultadoCalculoMora
}

const FechaSistemaContext = createContext<FechaSistemaContextType | undefined>(undefined)

export function FechaSistemaProvider({ children }: { children: React.ReactNode }) {
  const getFechaRealHoy = () => fechaSolo(new Date()) || '2026-11-04'

  const [fechaSistema, setFechaSistemaState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const guardada = localStorage.getItem('fecha_sistema_simulada')
      if (guardada && /^\d{4}-\d{2}-\d{2}$/.test(guardada)) {
        return guardada
      }
    }
    return getFechaRealHoy()
  })

  const [politicaMora, setPoliticaMoraState] = useState<PoliticaMoraLocal>(() => {
    if (typeof window !== 'undefined') {
      try {
        const guardada = localStorage.getItem('politica_mora_edificio')
        if (guardada) {
          return { ...POLITICA_MORA_DEFAULT, ...JSON.parse(guardada) }
        }
      } catch {}
    }
    return POLITICA_MORA_DEFAULT
  })

  const setFechaSistema = useCallback((fecha: string) => {
    setFechaSistemaState(fecha)
    if (typeof window !== 'undefined') {
      localStorage.setItem('fecha_sistema_simulada', fecha)
    }
  }, [])

  const resetFechaSistema = useCallback(() => {
    const hoy = getFechaRealHoy()
    setFechaSistemaState(hoy)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fecha_sistema_simulada')
    }
  }, [])

  const setPoliticaMora = useCallback((nuevaPolitica: PoliticaMoraLocal) => {
    setPoliticaMoraState(nuevaPolitica)
    if (typeof window !== 'undefined') {
      localStorage.setItem('politica_mora_edificio', JSON.stringify(nuevaPolitica))
    }
  }, [])

  const isSimulada = useMemo(() => {
    return fechaSistema !== getFechaRealHoy()
  }, [fechaSistema])

  /**
   * Calcula si aplica mora según la fecha del sistema, fecha de vencimiento y política activa
   */
  const calcularMoraExpensa = useCallback(
    (fechaVencimiento: string, saldoBase: number) => {
      if (!fechaVencimiento) {
        return {
          aplicaMora: false,
          estadoMora: 'ANTES_VENCIMIENTO' as const,
          montoMora: 0,
          montoMoraMensual: 0,
          mesesMora: 0,
          descripcionMora: 'Sin fecha de vencimiento',
          diasExceso: 0,
          tipoPenalidad: politicaMora.tipoPenalidad || 'fijo',
          tasaOValor: 0,
          historialMensual: []
        }
      }

      const fActual = new Date(`${fechaSistema}T00:00:00`)
      const fVenc = new Date(`${fechaSolo(fechaVencimiento)}T00:00:00`)

      // Diferencia en días
      const diffMs = fActual.getTime() - fVenc.getTime()
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      const diasGracia = politicaMora.diasGracia || 0

      const tipoPenalidad = politicaMora.tipoPenalidad || 'fijo'
      const tasaOValor = tipoPenalidad === 'fijo' ? Number(politicaMora.montoFijo || 50) : Number(politicaMora.porcentaje || 10)

      if (diffDias < 0) {
        return {
          aplicaMora: false,
          estadoMora: 'ANTES_VENCIMIENTO' as const,
          montoMora: 0,
          montoMoraMensual: 0,
          mesesMora: 0,
          descripcionMora: `A tiempo (${Math.abs(diffDias)} días antes del vencimiento)`,
          diasExceso: 0,
          tipoPenalidad,
          tasaOValor,
          historialMensual: []
        }
      }

      if (diffDias === 0) {
        return {
          aplicaMora: false,
          estadoMora: 'EN_VENCIMIENTO' as const,
          montoMora: 0,
          montoMoraMensual: 0,
          mesesMora: 0,
          descripcionMora: 'Día exacto de vencimiento (Sin mora)',
          diasExceso: 0,
          tipoPenalidad,
          tasaOValor,
          historialMensual: []
        }
      }

      if (diffDias <= diasGracia) {
        return {
          aplicaMora: false,
          estadoMora: 'EN_GRACIA' as const,
          montoMora: 0,
          montoMoraMensual: 0,
          mesesMora: 0,
          descripcionMora: `Dentro del período de gracia (+${diffDias}d de ${diasGracia}d permitidos - Sin mora)`,
          diasExceso: 0,
          tipoPenalidad,
          tasaOValor,
          historialMensual: []
        }
      }

      // Aplica mora porque superó el vencimiento y los días de gracia
      // Se calcula cuántos meses de retraso han transcurrido (1 mes por cada bloque de 30 días o fracción)
      const mesesMora = Math.max(1, Math.ceil(diffDias / 30))

      let montoMoraMensual = 0
      if (tipoPenalidad === 'fijo') {
        montoMoraMensual = Number(politicaMora.montoFijo || 50)
      } else {
        const pct = Number(politicaMora.porcentaje || 10)
        montoMoraMensual = Math.round(((saldoBase * pct) / 100) * 100) / 100
      }

      const montoMoraTotal = Math.round((montoMoraMensual * mesesMora) * 100) / 100

      // Generar desglose cronológico mes a mes de la acumulación
      const historialMensual: DetalleMesMora[] = []
      let acumulado = 0
      for (let i = 1; i <= mesesMora; i++) {
        acumulado = Math.round((acumulado + montoMoraMensual) * 100) / 100
        const diasRangoDesde = (i - 1) * 30 + 1
        const diasRangoHasta = i * 30
        historialMensual.push({
          mesNumero: i,
          concepto: `Mes ${i} de retraso (Día +${diasRangoDesde} a +${diasRangoHasta})`,
          penalidadMes: montoMoraMensual,
          moraAcumulada: acumulado,
          saldoTotalConMora: Math.round((saldoBase + acumulado) * 100) / 100
        })
      }

      let descripcionMora = ''
      if (tipoPenalidad === 'fijo') {
        descripcionMora = `Mora fija de Bs. ${montoMoraMensual}/mes acumulada por ${mesesMora} mes${mesesMora > 1 ? 'es' : ''} (+${diffDias} días) = Total mora Bs. ${montoMoraTotal}`
      } else {
        descripcionMora = `Mora del ${tasaOValor}% mensual (Bs. ${montoMoraMensual}/mes) acumulada por ${mesesMora} mes${mesesMora > 1 ? 'es' : ''} (+${diffDias} días) = Total mora Bs. ${montoMoraTotal.toFixed(2)}`
      }

      return {
        aplicaMora: true,
        estadoMora: 'CON_MORA' as const,
        montoMora: montoMoraTotal,
        montoMoraMensual,
        mesesMora,
        descripcionMora,
        diasExceso: diffDias,
        tipoPenalidad,
        tasaOValor,
        historialMensual
      }
    },
    [fechaSistema, politicaMora]
  )

  const value = useMemo(
    () => ({
      fechaSistema,
      setFechaSistema,
      resetFechaSistema,
      isSimulada,
      politicaMora,
      setPoliticaMora,
      calcularMoraExpensa
    }),
    [
      fechaSistema,
      setFechaSistema,
      resetFechaSistema,
      isSimulada,
      politicaMora,
      setPoliticaMora,
      calcularMoraExpensa
    ]
  )

  return (
    <FechaSistemaContext.Provider value={value}>
      {children}
    </FechaSistemaContext.Provider>
  )
}

export function useFechaSistema() {
  const context = useContext(FechaSistemaContext)
  if (!context) {
    throw new Error('useFechaSistema debe ser utilizado dentro de un FechaSistemaProvider')
  }
  return context
}

