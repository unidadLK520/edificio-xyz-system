'use client'

import React, { useState } from 'react'
import {
  CalendarCheck,
  Calendar,
  Clock,
  Users,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Flame,
  PartyPopper,
  Waves,
  Briefcase,
  ShieldAlert,
  FileCheck2,
  Trash2,
  Info
} from 'lucide-react'

interface CommonArea {
  id: string
  name: string
  category: string
  capacity: number
  costoGarantia: number
  costoLimpieza: number
  horario: string
  icon: any
  description: string
  equipamiento: string[]
}

interface Reservation {
  id: string
  areaId: string
  areaName: string
  fecha: string
  turno: string
  invitados: number
  estado: 'CONFIRMADA' | 'PENDIENTE' | 'CANCELADA'
  montoGarantia: number
  montoLimpieza: number
  fechaSolicitud: string
}

const COMMON_AREAS: CommonArea[] = [
  {
    id: 'parrillero',
    name: 'Churrasquera & Parrillero VIP',
    category: 'Quincho / Terraza',
    capacity: 25,
    costoGarantia: 200,
    costoLimpieza: 80,
    horario: '11:00 a 23:00 (Turnos Almuerzo y Cena)',
    icon: Flame,
    description:
      'Parrilla de acero inoxidable con mesones de granito, juego de comedor y congeladora.',
    equipamiento: [
      'Parrilla a carbón',
      'Mesas y sillas para 25 pers.',
      'Visicooler / Congeladora',
      'Lavaplatos'
    ]
  },
  {
    id: 'salon',
    name: 'Salón de Eventos & Multiuso',
    category: 'Eventos Sociales',
    capacity: 60,
    costoGarantia: 500,
    costoLimpieza: 150,
    horario: '14:00 a 01:00',
    icon: PartyPopper,
    description: 'Espacio climatizado ideal para cumpleaños, aniversarios y reuniones familiares.',
    equipamiento: [
      'Aire Acondicionado',
      'Sistema de Sonido Bluetooth',
      'Cocineta equipada',
      'Baños privados'
    ]
  },
  {
    id: 'piscina',
    name: 'Piscina Climatizada & Deck',
    category: 'Recreación',
    capacity: 15,
    costoGarantia: 100,
    costoLimpieza: 0,
    horario: '09:00 a 19:00',
    icon: Waves,
    description: 'Piscina temperada con deck de descanso y vestidores con duchas higiénicas.',
    equipamiento: [
      'Reposeras de descanso',
      'Duchas solares',
      'Vestidores H/M',
      'Reglamento de flotadores'
    ]
  },
  {
    id: 'cowork',
    name: 'Sala de Co-Work & Directorio',
    category: 'Trabajo y Reuniones',
    capacity: 10,
    costoGarantia: 0,
    costoLimpieza: 0,
    horario: '07:00 a 22:00',
    icon: Briefcase,
    description:
      'Ambiente silencioso con conexión de fibra óptica de alta velocidad y pantalla Smart TV.',
    equipamiento: [
      'WiFi 500 Mbps',
      'Pantalla 65" para presentaciones',
      'Pizarra acrílica',
      'Tomas USB'
    ]
  }
]

const INITIAL_RESERVATIONS: Reservation[] = [
  {
    id: 'RES-2026-0901',
    areaId: 'parrillero',
    areaName: 'Churrasquera & Parrillero VIP',
    fecha: '2026-09-26',
    turno: 'Turno Noche (18:00 - 23:00)',
    invitados: 18,
    estado: 'CONFIRMADA',
    montoGarantia: 200,
    montoLimpieza: 80,
    fechaSolicitud: '2026-09-15'
  },
  {
    id: 'RES-2026-0902',
    areaId: 'cowork',
    areaName: 'Sala de Co-Work & Directorio',
    fecha: '2026-09-23',
    turno: 'Turno Tarde (14:00 - 17:00)',
    invitados: 4,
    estado: 'CONFIRMADA',
    montoGarantia: 0,
    montoLimpieza: 0,
    fechaSolicitud: '2026-09-18'
  }
]

export default function ReservasPage() {
  const [reservations, setReservations] = useState<Reservation[]>(INITIAL_RESERVATIONS)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [selectedAreaForModal, setSelectedAreaForModal] = useState<string>('parrillero')
  const [activeTab, setActiveTab] = useState<'AREAS' | 'MIS_RESERVAS'>('MIS_RESERVAS')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Formulario nueva reserva
  const [formData, setFormData] = useState({
    areaId: 'parrillero',
    fecha: '2026-09-27',
    turno: 'Turno Noche (18:00 - 23:00)',
    invitados: 15,
    motivo: 'Reunión familiar de fin de semana',
    aceptaReglamento: false
  })

  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.aceptaReglamento) {
      alert('Debes aceptar las normas del reglamento de áreas comunes.')
      return
    }

    const area = COMMON_AREAS.find((a) => a.id === formData.areaId)
    const newRes: Reservation = {
      id: `RES-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      areaId: formData.areaId,
      areaName: area ? area.name : 'Área Común',
      fecha: formData.fecha,
      turno: formData.turno,
      invitados: Number(formData.invitados),
      estado: 'PENDIENTE',
      montoGarantia: area ? area.costoGarantia : 0,
      montoLimpieza: area ? area.costoLimpieza : 0,
      fechaSolicitud: new Date().toISOString().split('T')[0]
    }

    setReservations([newRes, ...reservations])
    setIsNewModalOpen(false)
    setActiveTab('MIS_RESERVAS')
    setSuccessMessage(
      '¡Solicitud de reserva enviada! La administración validará la disponibilidad en breve.'
    )
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  const handleCancelReservation = (id: string) => {
    if (confirm('¿Estás seguro de cancelar esta reserva?')) {
      setReservations(reservations.map((r) => (r.id === id ? { ...r, estado: 'CANCELADA' } : r)))
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Alerta de Éxito */}
      {successMessage && (
        <div className="p-4 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl flex items-center gap-3 shadow-md animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="text-xs sm:text-sm font-semibold">{successMessage}</div>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#ede9e1]/90 dark:bg-slate-900/90 p-5 sm:p-6 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <CalendarCheck className="w-4 h-4" />
            Copropietario & Áreas Comunes
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#262422] dark:text-white tracking-tight">
            Reserva de Amenidades y Espacios
          </h1>
          <p className="text-xs sm:text-sm text-[#7d776f] dark:text-slate-400">
            Agenda el parrillero, salón multiuso o co-work directamente desde tu portal con
            confirmación digital.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedAreaForModal('parrillero')
              setFormData((prev) => ({ ...prev, areaId: 'parrillero' }))
              setIsNewModalOpen(true)
            }}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nueva Reserva
          </button>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex border-b border-[#cec8bc] dark:border-slate-800 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('MIS_RESERVAS')}
          className={`pb-3 flex items-center gap-2 transition-all relative ${
            activeTab === 'MIS_RESERVAS'
              ? 'text-emerald-800 dark:text-emerald-400 font-extrabold border-b-2 border-emerald-700 dark:border-emerald-500'
              : 'text-[#7d776f] hover:text-[#262422] dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          Mis Reservas Solicitadas ({reservations.filter((r) => r.estado !== 'CANCELADA').length})
        </button>
        <button
          onClick={() => setActiveTab('AREAS')}
          className={`pb-3 flex items-center gap-2 transition-all relative ${
            activeTab === 'AREAS'
              ? 'text-emerald-800 dark:text-emerald-400 font-extrabold border-b-2 border-emerald-700 dark:border-emerald-500'
              : 'text-[#7d776f] hover:text-[#262422] dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Catálogo de Espacios y Tarifas
        </button>
      </div>

      {/* Tab: Mis Reservas */}
      {activeTab === 'MIS_RESERVAS' && (
        <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-[#cec8bc] dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-[#262422] dark:text-white">
              Historial de Mis Reservas
            </h2>
            <span className="text-xs text-[#7d776f] dark:text-slate-400">Unidad 402</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#cec8bc] dark:border-slate-800 text-[#7d776f] dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 px-3">Código</th>
                  <th className="pb-3 px-3">Área Común</th>
                  <th className="pb-3 px-3">Fecha de Evento</th>
                  <th className="pb-3 px-3">Horario / Turno</th>
                  <th className="pb-3 px-3">Invitados</th>
                  <th className="pb-3 px-3">Garantía / Limpieza</th>
                  <th className="pb-3 px-3">Estado</th>
                  <th className="pb-3 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cec8bc]/50 dark:divide-slate-800/60">
                {reservations.map((res) => (
                  <tr
                    key={res.id}
                    className="hover:bg-[#e4ded4]/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-3 font-mono font-bold text-[11px] text-[#262422] dark:text-white">
                      {res.id}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-[#262422] dark:text-white">
                      {res.areaName}
                    </td>
                    <td className="py-3.5 px-3 font-mono">{res.fecha}</td>
                    <td className="py-3.5 px-3">{res.turno}</td>
                    <td className="py-3.5 px-3">
                      <span className="font-semibold">{res.invitados} pers.</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      Bs. {(res.montoGarantia + res.montoLimpieza).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          res.estado === 'CONFIRMADA'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : res.estado === 'PENDIENTE'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}
                      >
                        {res.estado === 'CONFIRMADA' && <CheckCircle2 className="w-3 h-3" />}
                        {res.estado === 'PENDIENTE' && <Clock className="w-3 h-3" />}
                        {res.estado === 'CANCELADA' && <X className="w-3 h-3" />}
                        {res.estado}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {res.estado !== 'CANCELADA' && (
                        <button
                          onClick={() => handleCancelReservation(res.id)}
                          className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 p-1 rounded-md hover:bg-rose-100/50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Cancelar reserva"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Catálogo de Espacios */}
      {activeTab === 'AREAS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {COMMON_AREAS.map((area) => {
            const IconComp = area.icon
            return (
              <div
                key={area.id}
                className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-emerald-700 dark:bg-emerald-600 text-white shadow-md shadow-emerald-900/20">
                        <IconComp className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 tracking-wider">
                          {area.category}
                        </span>
                        <h3 className="text-base font-bold text-[#262422] dark:text-white leading-tight">
                          {area.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[#5c5750] dark:text-slate-300 leading-relaxed">
                    {area.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded-xl bg-[#dfd9ce]/60 dark:bg-slate-800/60 border border-[#cec8bc] dark:border-slate-700">
                      <span className="text-[10px] text-[#7d776f] block uppercase font-bold">
                        Capacidad Máx:
                      </span>
                      <span className="font-bold text-[#262422] dark:text-white flex items-center gap-1 mt-0.5">
                        <Users className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        {area.capacity} personas
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#dfd9ce]/60 dark:bg-slate-800/60 border border-[#cec8bc] dark:border-slate-700">
                      <span className="text-[10px] text-[#7d776f] block uppercase font-bold">
                        Garantía / Limpieza:
                      </span>
                      <span className="font-bold text-[#262422] dark:text-white mt-0.5 block font-mono">
                        Bs. {area.costoGarantia} / Bs. {area.costoLimpieza}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold text-[#7d776f] uppercase">
                      Equipamiento incluido:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {area.equipamiento.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-[#ded8cc] dark:bg-slate-800 text-[10px] font-medium text-[#262422] dark:text-slate-300 border border-[#cec8bc] dark:border-slate-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#cec8bc] dark:border-slate-800 flex justify-between items-center">
                  <span className="text-[11px] text-[#7d776f] dark:text-slate-400 font-mono">
                    {area.horario}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedAreaForModal(area.id)
                      setFormData((prev) => ({ ...prev, areaId: area.id }))
                      setIsNewModalOpen(true)
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-xs"
                  >
                    Reservar Este Espacio
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Formulario de Nueva Reserva */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-700 text-white">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#262422] dark:text-white">
                    Nueva Solicitud de Reserva
                  </h3>
                  <p className="text-xs text-[#7d776f] dark:text-slate-400">
                    Completa la información para reservar el área común.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReservation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                  Espacio a Reservar
                </label>
                <select
                  value={formData.areaId}
                  onChange={(e) => setFormData({ ...formData, areaId: e.target.value })}
                  className="w-full bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {COMMON_AREAS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Capacidad: {a.capacity} pers.)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Fecha del Evento
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Horario / Turno
                  </label>
                  <select
                    value={formData.turno}
                    onChange={(e) => setFormData({ ...formData, turno: e.target.value })}
                    className="w-full bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="Turno Almuerzo (11:00 - 16:00)">
                      Turno Almuerzo (11:00 - 16:00)
                    </option>
                    <option value="Turno Noche (18:00 - 23:00)">Turno Noche (18:00 - 23:00)</option>
                    <option value="Jornada Completa (12:00 - 23:30)">
                      Jornada Completa (12:00 - 23:30)
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                  Cantidad Estimada de Asistentes
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  required
                  value={formData.invitados}
                  onChange={(e) => setFormData({ ...formData, invitados: Number(e.target.value) })}
                  className="w-full bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-amber-100/60 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Reglamento de Convivencia y Ruido
                </div>
                <p className="text-[11px] leading-relaxed">
                  El volumen de música moderado es obligatorio a partir de las 22:00. El depósito de
                  garantía será reintegrado tras la inspección de entrega del área en condiciones
                  limpias e intactas.
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={formData.aceptaReglamento}
                  onChange={(e) => setFormData({ ...formData, aceptaReglamento: e.target.checked })}
                  className="rounded border-[#cec8bc] text-emerald-700 focus:ring-emerald-600"
                />
                <span className="text-[#262422] dark:text-slate-200">
                  Acepto los términos de uso y el depósito de garantía.
                </span>
              </label>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-md active:scale-95"
                >
                  Confirmar Solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
