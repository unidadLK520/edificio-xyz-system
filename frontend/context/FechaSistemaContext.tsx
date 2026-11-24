// frontend/context/FechaSistemaContext.tsx
// Contexto global para simulación de fecha y hora del sistema (Requerimiento C 4 y Pizarra)
// Permite alternar la fecha actual simulada para comprobar cobros con y sin mora.

'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { fechaSolo } from '@/lib/fecha'
import { apiFetch } from '@/lib/api'

export interface PoliticaMoraLocal {
  tipoPenalidad: 'fijo' | 'porcentaje'
  montoFijo: number
  porcentaje: number
  diaVencimiento: number
  diasGracia: number
  diaGeneracion: number
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
  setPoliticaMora: (politica: PoliticaMoraLocal) => Promise<{ ok: boolean; mensaje?: string }>
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

  const [politicaMora, setPoliticaMoraState] = useState<PoliticaMoraLocal>({
    tipoPenalidad: 'porcentaje',
    montoFijo: 0,
    porcentaje: 0,
    diaVencimiento: 0,
    diasGracia: 0,
    diaGeneracion: 0,
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/login')) {
        return
      }
      const hasToken =
        localStorage.getItem('auth_token') ||
        document.cookie
          .split('; ')
          .find((row) => row.startsWith('auth_token='))
      if (!hasToken) {
        return
      }
    }
    let isMounted = true
      ; (async () => {
        try {
          const res = await apiFetch('/api/v1/expensas/reglas-mora')
          if (!res.ok) return
          const data = await res.json()
          const regla = data?.activa
          if (!isMounted || !regla) return
          setPoliticaMoraState({
            tipoPenalidad: regla.tipoCalculo === 'FIJO' ? 'fijo' : 'porcentaje',
            montoFijo: Number(regla.montoFijo ?? 0),
            porcentaje: Number(regla.tasaInteres ?? 0),
            diaVencimiento: Number(regla.diaVencimiento ?? 0),
            diasGracia: Number(regla.diasGracia ?? 0),
            diaGeneracion: Number(regla.diaGeneracion ?? 0),
          })
        } catch (e) {
          console.error('Error cargando la regla de mora:', e)
        }
      })()
    return () => {
      isMounted = false
    }
  }, [])

  const setPoliticaMora = useCallback(async (nuevaPolitica: PoliticaMoraLocal) => {
    try {
      const res = await apiFetch('/api/v1/expensas/reglas-mora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoCalculo: nuevaPolitica.tipoPenalidad === 'fijo' ? 'FIJO' : 'PORCENTAJE',
          montoFijo: Number(nuevaPolitica.montoFijo),
          tasaInteres: Number(nuevaPolitica.porcentaje),
          diaVencimiento: Number(nuevaPolitica.diaVencimiento),
          diaGeneracion: Number(nuevaPolitica.diaGeneracion),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, mensaje: err?.message || `No se pudo guardar (HTTP ${res.status})` }
      }
      setPoliticaMoraState(nuevaPolitica)
      return { ok: true }
    } catch {
      return { ok: false, mensaje: 'Error de conexión al guardar la regla de mora' }
    }
  }, [])

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
      const tasaOValor = tipoPenalidad === 'fijo' ? Number(politicaMora.montoFijo || 0) : Number(politicaMora.porcentaje || 0)

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

      const mesesMora = Math.max(1, Math.ceil(diffDias / 30))

      let montoMoraMensual = 0
      if (tipoPenalidad === 'fijo') {
        montoMoraMensual = Number(politicaMora.montoFijo || 0)
      } else {
        const pct = Number(politicaMora.porcentaje || 0)
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