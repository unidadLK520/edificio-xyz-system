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
  ) => {
    aplicaMora: boolean
    estadoMora: 'ANTES_VENCIMIENTO' | 'EN_VENCIMIENTO' | 'EN_GRACIA' | 'CON_MORA'
    montoMora: number
    descripcionMora: string
    diasExceso: number
  }
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
          descripcionMora: 'Sin fecha de vencimiento',
          diasExceso: 0
        }
      }

      const fActual = new Date(`${fechaSistema}T00:00:00`)
      const fVenc = new Date(`${fechaSolo(fechaVencimiento)}T00:00:00`)

      // Diferencia en días
      const diffMs = fActual.getTime() - fVenc.getTime()
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      const diasGracia = politicaMora.diasGracia || 0

      if (diffDias < 0) {
        return {
          aplicaMora: false,
          estadoMora: 'ANTES_VENCIMIENTO' as const,
          montoMora: 0,
          descripcionMora: `A tiempo (${Math.abs(diffDias)} días antes del vencimiento)`,
          diasExceso: 0
        }
      }

      if (diffDias === 0) {
        return {
          aplicaMora: false,
          estadoMora: 'EN_VENCIMIENTO' as const,
          montoMora: 0,
          descripcionMora: 'Día exacto de vencimiento (Sin mora)',
          diasExceso: 0
        }
      }

      if (diffDias <= diasGracia) {
        return {
          aplicaMora: false,
          estadoMora: 'EN_GRACIA' as const,
          montoMora: 0,
          descripcionMora: `Dentro del período de gracia (+${diffDias}d de ${diasGracia}d permitidos - Sin mora)`,
          diasExceso: 0
        }
      }

      // Aplica mora porque superó el vencimiento y los días de gracia
      let montoMora = 0
      let descripcionMora = ''

      if (politicaMora.tipoPenalidad === 'fijo') {
        montoMora = Number(politicaMora.montoFijo || 50)
        descripcionMora = `Mora fija de Bs ${montoMora} aplicada (+${diffDias} días de mora)`
      } else {
        const pct = Number(politicaMora.porcentaje || 10)
        montoMora = Math.round(((saldoBase * pct) / 100) * 100) / 100
        descripcionMora = `Mora del ${pct}% (Bs ${montoMora.toFixed(2)}) aplicada (+${diffDias} días de mora)`
      }

      return {
        aplicaMora: true,
        estadoMora: 'CON_MORA' as const,
        montoMora,
        descripcionMora,
        diasExceso: diffDias
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

