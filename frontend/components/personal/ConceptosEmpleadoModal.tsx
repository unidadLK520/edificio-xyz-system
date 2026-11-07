// frontend/components/personal/ConceptosEmpleadoModal.tsx
// Modal de gestión de conceptos de empleado: Anticipos, Bonificaciones y Descuentos
// Endpoints conectados:
//   GET/POST /api/v1/personal/:id/anticipos
//   GET/POST /api/v1/personal/:id/bonificaciones
//   GET/POST /api/v1/personal/:id/descuentos

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  X,
  CreditCard,
  Gift,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { fechaSolo } from '@/lib/fecha'

export interface ConceptoItem {
  idConceptoEmpleado: number
  idEmpleado: number
  tipo: 'ANTICIPO' | 'BONIFICACION' | 'DESCUENTO'
  monto: number | string
  fecha: string
  periodo?: string | null
  motivo: string
  fechaCreacion: string
}

export interface ConceptosEmpleadoModalProps {
  isOpen: boolean
  onClose: () => void
  empleado: {
    idEmpleado: number
    nombres: string
    apellidos: string
    salarioBase: number
    cargo?: string | null
  } | null
}

export default function ConceptosEmpleadoModal({
  isOpen,
  onClose,
  empleado,
}: ConceptosEmpleadoModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'anticipos' | 'bonificaciones' | 'descuentos'>('anticipos')

  // Listas de conceptos
  const [anticipos, setAnticipos] = useState<ConceptoItem[]>([])
  const [bonificaciones, setBonificaciones] = useState<ConceptoItem[]>([])
  const [descuentos, setDescuentos] = useState<ConceptoItem[]>([])

  const [isLoadingList, setIsLoadingList] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Campos Formulario Anticipo
  const [anticipoMonto, setAnticipoMonto] = useState<number | ''>('')
  const [anticipoFecha, setAnticipoFecha] = useState<string>(() => fechaSolo(new Date()))
  const [anticipoMotivo, setAnticipoMotivo] = useState('')

  // Campos Formulario Bonificación
  const [bonoMonto, setBonoMonto] = useState<number | ''>('')
  const [bonoPeriodoMes, setBonoPeriodoMes] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [bonoMotivo, setBonoMotivo] = useState('')

  // Campos Formulario Descuento
  const [descuentoMonto, setDescuentoMonto] = useState<number | ''>('')
  const [descuentoPeriodoMes, setDescuentoPeriodoMes] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [descuentoMotivo, setDescuentoMotivo] = useState('')

  // Cargar lista según la pestaña activa
  const fetchConceptos = useCallback(async () => {
    if (!empleado) return
    setIsLoadingList(true)
    setListError(null)

    const endpoint = `/api/v1/personal/${empleado.idEmpleado}/${activeSubTab}?limit=12`
    try {
      const res = await apiFetch(endpoint)
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        setListError(json.message || json.error || `Error al cargar ${activeSubTab}.`)
        return
      }

      const items: ConceptoItem[] = Array.isArray(json.data) ? json.data : []
      if (activeSubTab === 'anticipos') setAnticipos(items)
      else if (activeSubTab === 'bonificaciones') setBonificaciones(items)
      else setDescuentos(items)
    } catch (err: any) {
      setListError(err?.message || 'Error de conexión al cargar conceptos.')
    } finally {
      setIsLoadingList(false)
    }
  }, [empleado, activeSubTab])

  useEffect(() => {
    if (isOpen && empleado) {
      fetchConceptos()
      setFormError(null)
      setFormSuccess(null)
    }
  }, [isOpen, empleado, activeSubTab, fetchConceptos])

  if (!isOpen || !empleado) return null

  const salarioBaseNum = Number(empleado.salarioBase)

  // Submit Anticipo (POST /api/v1/personal/:id/anticipos)
  const handleCrearAnticipo = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (anticipoMonto === '' || Number(anticipoMonto) <= 0) {
      setFormError('El monto del anticipo debe ser mayor a 0 Bs.')
      return
    }

    if (Number(anticipoMonto) > salarioBaseNum) {
      setFormError(
        `El monto del anticipo (Bs. ${Number(anticipoMonto).toFixed(2)}) no puede ser mayor al salario base del empleado (Bs. ${salarioBaseNum.toFixed(2)}).`
      )
      return
    }

    if (!anticipoFecha) {
      setFormError('Debe ingresar una fecha válida (YYYY-MM-DD).')
      return
    }

    if (!anticipoMotivo.trim()) {
      setFormError('El motivo es obligatorio (máximo 200 caracteres).')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await apiFetch(`/api/v1/personal/${empleado.idEmpleado}/anticipos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: Number(anticipoMonto),
          fecha: anticipoFecha,
          motivo: anticipoMotivo.trim(),
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        let msg = data.message || data.error || 'Error al registrar anticipo.'
        if (data.details) {
          const detailStr = Object.entries(data.details)
            .map(([k, v]: [string, any]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ')
          msg = `${msg} (${detailStr})`
        }
        setFormError(msg)
        return
      }

      setFormSuccess('¡Anticipo de sueldo registrado exitosamente!')
      setAnticipoMonto('')
      setAnticipoMotivo('')
      await fetchConceptos()
    } catch (err: any) {
      setFormError(err?.message || 'Error de conexión al guardar anticipo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit Bonificación (POST /api/v1/personal/:id/bonificaciones)
  const handleCrearBonificacion = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (bonoMonto === '' || Number(bonoMonto) <= 0) {
      setFormError('El monto de la bonificación debe ser mayor a 0 Bs.')
      return
    }

    if (!bonoPeriodoMes) {
      setFormError('Debe seleccionar el período de aplicación.')
      return
    }

    if (!bonoMotivo.trim()) {
      setFormError('El motivo es obligatorio (máximo 200 caracteres).')
      return
    }

    const periodoNormalizado = `${bonoPeriodoMes}-01`

    setIsSubmitting(true)
    try {
      const res = await apiFetch(`/api/v1/personal/${empleado.idEmpleado}/bonificaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: Number(bonoMonto),
          periodo: periodoNormalizado,
          motivo: bonoMotivo.trim(),
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        let msg = data.message || data.error || 'Error al registrar bonificación.'
        if (data.details) {
          const detailStr = Object.entries(data.details)
            .map(([k, v]: [string, any]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ')
          msg = `${msg} (${detailStr})`
        }
        setFormError(msg)
        return
      }

      setFormSuccess('¡Bonificación registrada exitosamente!')
      setBonoMonto('')
      setBonoMotivo('')
      await fetchConceptos()
    } catch (err: any) {
      setFormError(err?.message || 'Error de conexión al registrar bonificación.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit Descuento (POST /api/v1/personal/:id/descuentos)
  const handleCrearDescuento = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (descuentoMonto === '' || Number(descuentoMonto) <= 0) {
      setFormError('El monto del descuento debe ser mayor a 0 Bs.')
      return
    }

    if (!descuentoPeriodoMes) {
      setFormError('Debe seleccionar el período de aplicación.')
      return
    }

    if (!descuentoMotivo.trim()) {
      setFormError('El motivo es obligatorio (máximo 200 caracteres).')
      return
    }

    const periodoNormalizado = `${descuentoPeriodoMes}-01`

    setIsSubmitting(true)
    try {
      const res = await apiFetch(`/api/v1/personal/${empleado.idEmpleado}/descuentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: Number(descuentoMonto),
          periodo: periodoNormalizado,
          motivo: descuentoMotivo.trim(),
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        let msg = data.message || data.error || 'Error al registrar descuento.'
        if (data.details) {
          const detailStr = Object.entries(data.details)
            .map(([k, v]: [string, any]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ')
          msg = `${msg} (${detailStr})`
        }
        setFormError(msg)
        return
      }

      setFormSuccess('¡Descuento registrado exitosamente!')
      setDescuentoMonto('')
      setDescuentoMotivo('')
      await fetchConceptos()
    } catch (err: any) {
      setFormError(err?.message || 'Error de conexión al registrar descuento.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentList =
    activeSubTab === 'anticipos'
      ? anticipos
      : activeSubTab === 'bonificaciones'
      ? bonificaciones
      : descuentos

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in duration-150">
        {/* ENCABEZADO */}
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-[#262422] dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-700 dark:text-purple-400" />
              Gestión de Conceptos del Colaborador
            </h3>
            <p className="text-xs text-[#7d776f]">
              Colaborador:{' '}
              <strong className="text-[#262422] dark:text-white">
                {empleado.nombres} {empleado.apellidos}
              </strong>{' '}
              • Salario Base:{' '}
              <strong className="text-emerald-800 dark:text-emerald-400 font-mono">
                Bs. {salarioBaseNum.toFixed(2)}
              </strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 rounded-lg cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PESTAÑAS (ANTICIPOS | BONIFICACIONES | DESCUENTOS) */}
        <div className="flex items-center gap-2 border-b border-[#cec8bc] dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('anticipos')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'anticipos'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-[#dfd9ce] dark:bg-slate-800 text-[#5c5750] dark:text-slate-300 hover:text-black'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Anticipos de Sueldo</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-md text-[10px] bg-white/20">
              {anticipos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('bonificaciones')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'bonificaciones'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-[#dfd9ce] dark:bg-slate-800 text-[#5c5750] dark:text-slate-300 hover:text-black'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Bonificaciones</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-md text-[10px] bg-white/20">
              {bonificaciones.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('descuentos')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'descuentos'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-[#dfd9ce] dark:bg-slate-800 text-[#5c5750] dark:text-slate-300 hover:text-black'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Descuentos</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-md text-[10px] bg-white/20">
              {descuentos.length}
            </span>
          </button>
        </div>

        {/* MENSAJES DE ALERTA O ERROR */}
        {formError && (
          <div className="p-3 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-xl flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{formSuccess}</span>
          </div>
        )}

        {listError && (
          <div className="p-3 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-xl flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{listError}</span>
            </div>
            <button
              onClick={() => fetchConceptos()}
              className="p-1 hover:opacity-75 cursor-pointer"
              title="Reintentar"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* FORMULARIO DE REGISTRO SEGÚN PESTAÑA */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-950/70 border border-[#cec8bc] dark:border-slate-800 space-y-3">
          <h4 className="font-bold text-xs text-[#262422] dark:text-white flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            {activeSubTab === 'anticipos' && 'Registrar Nuevo Anticipo de Sueldo'}
            {activeSubTab === 'bonificaciones' && 'Registrar Nueva Bonificación'}
            {activeSubTab === 'descuentos' && 'Registrar Nuevo Descuento'}
          </h4>

          {activeSubTab === 'anticipos' && (
            <form onSubmit={handleCrearAnticipo} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Monto (Bs.) * (Máx. Bs. {salarioBaseNum.toFixed(2)})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={salarioBaseNum}
                    required
                    placeholder="Ej. 500.00"
                    value={anticipoMonto}
                    onChange={(e) => setAnticipoMonto(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-purple-800 dark:text-purple-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Fecha del Anticipo *
                  </label>
                  <input
                    type="date"
                    required
                    value={anticipoFecha}
                    onChange={(e) => setAnticipoFecha(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#1c1917] dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Motivo o Justificación * (1 a 200 caracteres)
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  placeholder="Ej. Anticipo de quincena solicitado por emergencia médica familiar..."
                  value={anticipoMotivo}
                  onChange={(e) => setAnticipoMotivo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Anticipo'}
                </button>
              </div>
            </form>
          )}

          {activeSubTab === 'bonificaciones' && (
            <form onSubmit={handleCrearBonificacion} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Monto (Bs.) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="Ej. 250.00"
                    value={bonoMonto}
                    onChange={(e) => setBonoMonto(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-emerald-800 dark:text-emerald-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Período de Aplicación (Mes / Año) *
                  </label>
                  <input
                    type="month"
                    required
                    value={bonoPeriodoMes}
                    onChange={(e) => setBonoPeriodoMes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#1c1917] dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Motivo del Bono * (1 a 200 caracteres)
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  placeholder="Ej. Bono extraordinario por apoyo en mantenimiento general del edificio..."
                  value={bonoMotivo}
                  onChange={(e) => setBonoMotivo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Bonificación'}
                </button>
              </div>
            </form>
          )}

          {activeSubTab === 'descuentos' && (
            <form onSubmit={handleCrearDescuento} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Monto (Bs.) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="Ej. 100.00"
                    value={descuentoMonto}
                    onChange={(e) => setDescuentoMonto(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-rose-800 dark:text-rose-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                    Período de Aplicación (Mes / Año) *
                  </label>
                  <input
                    type="month"
                    required
                    value={descuentoPeriodoMes}
                    onChange={(e) => setDescuentoPeriodoMes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#1c1917] dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#383430] dark:text-slate-300 mb-1">
                  Motivo del Descuento * (1 a 200 caracteres)
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  placeholder="Ej. Descuento por inasistencia injustificada el día 12..."
                  value={descuentoMotivo}
                  onChange={(e) => setDescuentoMotivo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-600"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Descuento'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* TABLA DE CONCEPTOS REGISTRADOS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <h4 className="font-bold text-[#262422] dark:text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#7d776f]" />
              Historial de {activeSubTab} ({currentList.length} registros recientes)
            </h4>
            <button
              onClick={() => fetchConceptos()}
              className="text-xs text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Actualizar
            </button>
          </div>

          <div className="rounded-2xl border border-[#cec8bc] dark:border-slate-800 overflow-hidden bg-white/60 dark:bg-slate-950/60">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/60 dark:bg-slate-950 text-[10px] font-bold uppercase text-[#7d776f]">
                  <th className="py-2 px-3">
                    {activeSubTab === 'anticipos' ? 'Fecha' : 'Período'}
                  </th>
                  <th className="py-2 px-3 text-right">Monto</th>
                  <th className="py-2 px-3">Motivo / Concepto</th>
                  <th className="py-2 px-3 text-right">Registrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cec8bc] dark:divide-slate-800">
                {isLoadingList ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-[#7d776f]">
                      Cargando registros...
                    </td>
                  </tr>
                ) : currentList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-[#7d776f]">
                      No hay {activeSubTab} registrados para este colaborador.
                    </td>
                  </tr>
                ) : (
                  currentList.map((item) => (
                    <tr key={item.idConceptoEmpleado} className="hover:bg-[#dfd9ce]/30">
                      <td className="py-2 px-3 font-mono font-bold whitespace-nowrap">
                        {activeSubTab === 'anticipos'
                          ? fechaSolo(item.fecha)
                          : item.periodo
                          ? fechaSolo(item.periodo)
                          : fechaSolo(item.fecha)}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-mono font-bold whitespace-nowrap ${
                          activeSubTab === 'bonificaciones'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : activeSubTab === 'descuentos'
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-purple-700 dark:text-purple-400'
                        }`}
                      >
                        Bs. {Number(item.monto).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-[#262422] dark:text-white max-w-xs truncate" title={item.motivo}>
                        {item.motivo}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[10px] text-[#7d776f] whitespace-nowrap">
                        {fechaSolo(item.fechaCreacion)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PIE DEL MODAL */}
        <div className="flex justify-end pt-3 border-t border-[#cec8bc] dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

