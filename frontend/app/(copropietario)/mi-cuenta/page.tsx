// frontend/app/(copropietario)/mi-cuenta/page.tsx
// Módulo de Estado de Cuenta, Extracto Detallado y Pagos de Expensas para Copropietarios e Inquilinos
// Reglas de Negocio Oficiales:
// 1. La Administración cobra y gestiona EXCLUSIVAMENTE las Expensas Comunes del edificio (mantenimiento, seguridad, limpieza, luz y agua común).
// 2. El Alquiler (ej. Bs 3,000) es un acuerdo estrictamente privado entre Propietario e Inquilino; la administración NO lo administra ni percibe.
// 3. Los consumos individuales (medidor de luz ELFEC, agua/gas individual) NO forman parte del sistema ni de la administración.
// 4. Cada departamento genera expensa mensual siempre (ocupado por dueño, alquilado o desocupado).
// 5. El extracto de liquidación muestra el desglose exacto de los gastos comunes del edificio (Bs 15.500) y la cuota por alícuota.

'use client'

import React, { useState } from 'react'
import {
  Receipt,
  CreditCard,
  QrCode,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  Calendar,
  DollarSign,
  Printer,
  X,
  FileText,
  ShieldCheck,
  Eye,
  Info,
  User,
  Building2,
  Home
} from 'lucide-react'

export interface ExpensaResidenteItem {
  id: string
  periodo: string
  vencimiento: string
  deptoNumero: string
  tipologia: string
  alicuota: number
  montoExpensa: number
  total: number
  estado: 'PAGADA' | 'PENDIENTE' | 'EN_REVISION' | 'EN_MORA'
  fechaPago?: string
  metodoPago?: string
  nroComprobante?: string
  pagadoPor?: string
  propietario: string
  inquilino?: string | null
}

export interface UnidadPropietarioItem {
  numero: string
  tipo: string
  areaM2: number
  alicuota: number
  estadoOcupacion: 'Ocupado por Propietario' | 'Alquilado' | 'Desocupado'
  inquilinoNombre?: string
  expensaMes: number
  estadoExpensa: 'Al Día' | 'Pendiente' | 'En Mora'
}

export const RUBROS_GASTOS_COMUNES = [
  { concepto: 'Seguridad y Vigilancia 24/7', totalPresupuesto: 5600.0, porcentaje: 36.13 },
  { concepto: 'Gastos de Administración Central', totalPresupuesto: 3500.0, porcentaje: 22.58 },
  { concepto: 'Limpieza e Insumos de Áreas Comunes', totalPresupuesto: 2200.0, porcentaje: 14.19 },
  { concepto: 'Mantenimiento Preventivo de Edificación', totalPresupuesto: 1500.0, porcentaje: 9.68 },
  { concepto: 'Imprevistos y Fondo Menor de Operación', totalPresupuesto: 900.0, porcentaje: 5.81 },
  { concepto: 'Electricidad de Áreas Comunes (ELFEC)', totalPresupuesto: 800.0, porcentaje: 5.16 },
  { concepto: 'Mantenimiento de Ascensor (Otis)', totalPresupuesto: 700.0, porcentaje: 4.52 },
  { concepto: 'Agua Potable Común y Cisterna (SEMAPA)', totalPresupuesto: 300.0, porcentaje: 1.94 },
]
export const TOTAL_GASTOS_COMUNES = 15500.0

const EXPENSAS_305_SEED: ExpensaResidenteItem[] = [
  {
    id: 'EXP-2026-10-305',
    periodo: 'Octubre 2026',
    vencimiento: '10/10/2026',
    deptoNumero: '305',
    tipologia: 'Tipo B (80 m²)',
    alicuota: 5.0,
    montoExpensa: 775.0,
    total: 775.0,
    estado: 'PENDIENTE',
    propietario: 'Juan Pérez',
    inquilino: 'María López'
  },
  {
    id: 'EXP-2026-09-305',
    periodo: 'Septiembre 2026',
    vencimiento: '10/09/2026',
    deptoNumero: '305',
    tipologia: 'Tipo B (80 m²)',
    alicuota: 5.0,
    montoExpensa: 775.0,
    total: 775.0,
    estado: 'PAGADA',
    fechaPago: '08/09/2026',
    metodoPago: 'Transferencia Bancaria (QR Simple)',
    nroComprobante: 'REC-2026-09-305',
    pagadoPor: 'María López',
    propietario: 'Juan Pérez',
    inquilino: 'María López'
  },
  {
    id: 'EXP-2026-08-305',
    periodo: 'Agosto 2026',
    vencimiento: '10/08/2026',
    deptoNumero: '305',
    tipologia: 'Tipo B (80 m²)',
    alicuota: 5.0,
    montoExpensa: 775.0,
    total: 775.0,
    estado: 'PAGADA',
    fechaPago: '05/08/2026',
    metodoPago: 'QR Simple Interbancario',
    nroComprobante: 'REC-2026-08-305',
    pagadoPor: 'María López',
    propietario: 'Juan Pérez',
    inquilino: 'María López'
  }
]

const UNIDADES_PROPIETARIO_JUAN_PEREZ: UnidadPropietarioItem[] = [
  {
    numero: '305',
    tipo: 'Tipo B (80 m²)',
    areaM2: 80.0,
    alicuota: 5.0,
    estadoOcupacion: 'Alquilado',
    inquilinoNombre: 'María López',
    expensaMes: 775.0,
    estadoExpensa: 'Pendiente'
  },
  {
    numero: '306',
    tipo: 'Tipo B (80 m²)',
    areaM2: 80.0,
    alicuota: 5.0,
    estadoOcupacion: 'Desocupado',
    inquilinoNombre: undefined,
    expensaMes: 775.0,
    estadoExpensa: 'Al Día'
  }
]

export default function MiCuentaPage() {
  // Selector de perspectiva para alternar entre Inquilino y Propietario
  const [rolPerspectiva, setRolPerspectiva] = useState<'INQUILINO' | 'PROPIETARIO'>('INQUILINO')

  const [expensas, setExpensas] = useState<ExpensaResidenteItem[]>(EXPENSAS_305_SEED)
  const [selectedReceipt, setSelectedReceipt] = useState<ExpensaResidenteItem | null>(null)
  const [isExtractoModalOpen, setIsExtractoModalOpen] = useState(false)
  const [selectedExtractoPeriodo, setSelectedExtractoPeriodo] = useState('Octubre 2026')
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState(false)

  // Formulario de pago
  const [paymentForm, setPaymentForm] = useState({
    expensaId: 'EXP-2026-10-305',
    metodo: 'QR_SIMPLE',
    nroReferencia: '',
    monto: '775.00',
    fecha: new Date().toISOString().split('T')[0],
    pagadoPorNombre: 'María López',
    pagadoPorRol: 'Inquilina'
  })

  const pendingExpensas = expensas.filter((e) => e.estado === 'PENDIENTE' || e.estado === 'EN_MORA')
  const totalDeuda = pendingExpensas.reduce((acc, curr) => acc + curr.total, 0)

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault()
    setExpensas((prev) =>
      prev.map((item) =>
        item.id === paymentForm.expensaId
          ? {
              ...item,
              estado: 'EN_REVISION',
              metodoPago:
                paymentForm.metodo === 'QR_SIMPLE'
                  ? 'QR Simple Interbancario'
                  : 'Transferencia Bancaria (BMSC)',
              nroComprobante: `PEND-${paymentForm.nroReferencia || '77891'}`,
              fechaPago: paymentForm.fecha,
              pagadoPor: `${paymentForm.pagadoPorNombre} (${paymentForm.pagadoPorRol})`
            }
          : item
      )
    )
    setIsPaymentModalOpen(false)
    setPaymentSuccessMsg(true)
    setTimeout(() => setPaymentSuccessMsg(false), 4500)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Alerta de confirmación */}
      {paymentSuccessMsg && (
        <div className="p-4 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl flex items-center gap-3 shadow-md animate-in fade-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold">¡Pago de expensa reportado exitosamente!</span> La
            administración del edificio validará el comprobante y emitirá el recibo oficial de caja.
          </div>
        </div>
      )}

      {/* Switch de Perspectiva (Inquilino vs Copropietario) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#ede9e1]/70 dark:bg-slate-900/70 p-3 rounded-2xl border border-[#cec8bc] dark:border-slate-800">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <span className="text-xs font-bold text-[#262422] dark:text-white">
            Perspectiva de Usuario en Edificio XYZ:
          </span>
        </div>
        <div className="inline-flex rounded-xl bg-[#ded8cc] dark:bg-slate-800 p-1 border border-[#cec8bc] dark:border-slate-700">
          <button
            onClick={() => setRolPerspectiva('INQUILINO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              rolPerspectiva === 'INQUILINO'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-[#5c5750] dark:text-slate-300 hover:text-[#262422]'
            }`}
          >
            Vista: Inquilino (María López • Dpto 305)
          </button>
          <button
            onClick={() => setRolPerspectiva('PROPIETARIO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              rolPerspectiva === 'PROPIETARIO'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-[#5c5750] dark:text-slate-300 hover:text-[#262422]'
            }`}
          >
            Vista: Propietario (Juan Pérez • Dptos 305 y 306)
          </button>
        </div>
      </div>

      {/* REGLA DE NEGOCIO DESTACADA: Aclaración Alquiler vs Expensa */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
          <span className="font-bold">Reglamento Administrativo Edificio XYZ:</span> La
          Administración gestiona y recauda <span className="underline font-bold">únicamente las expensas mensuales</span> destinadas
          al funcionamiento de áreas comunes (seguridad, limpieza, mantenimiento, luz y agua común). El <span className="font-bold">alquiler (Bs 3,000)</span> es un acuerdo privado entre Propietario e Inquilino que la administración NO cobra. Servicios de medidor individual (ELFEC / gas / agua de consumo propio) se pagan directamente a las empresas prestadoras.
        </div>
      </div>

      {/* ========================================================
          VISTA DE INQUILINO (María López)
         ======================================================== */}
      {rolPerspectiva === 'INQUILINO' && (
        <>
          {/* Tarjeta de Identificación del Inquilino */}
          <div className="bg-[#ede9e1]/90 dark:bg-slate-900/90 p-5 sm:p-6 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-sm backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-700 dark:bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-800/20">
                305
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-[#262422] dark:text-white">
                    Departamento 305 — Tipo B (80 m²)
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400">
                    Inquilina Residente
                  </span>
                </div>
                <p className="text-xs text-[#7d776f] dark:text-slate-400 mt-0.5">
                  María López • Propietario Responsable:{' '}
                  <span className="font-bold text-[#262422] dark:text-slate-200">Juan Pérez</span> • Alícuota:{' '}
                  <span className="font-bold font-mono">5.00%</span> • Expensa mensual fijada:{' '}
                  <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">Bs 775.00</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => {
                  setSelectedExtractoPeriodo('Octubre 2026')
                  setIsExtractoModalOpen(true)
                }}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-[#ded8cc] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#262422] dark:text-slate-100 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-[#cec8bc] dark:border-slate-700 cursor-pointer"
                title="Ver extracto y desglose analítico de la expensa"
              >
                <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Ver Extracto de Expensa
              </button>
              <button
                onClick={() => setIsQRModalOpen(true)}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-[#ded8cc] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#262422] dark:text-slate-100 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-[#cec8bc] dark:border-slate-700 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                QR de Pago
              </button>
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/20 active:scale-95 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Pagar Expensa
              </button>
            </div>
          </div>

          {/* Tarjetas KPI de Inquilino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Expensa Pendiente */}
            <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase">
                  Expensa a Pagar a Admin
                </span>
                <div
                  className={`p-2 rounded-xl ${
                    totalDeuda > 0
                      ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                      : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div
                  className={`text-2xl font-black ${
                    totalDeuda > 0
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  Bs. {totalDeuda.toFixed(2)}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-[#7d776f] dark:text-slate-400 font-medium">
                  <span>Expensa Octubre 2026</span>
                </div>
              </div>
            </div>

            {/* Período Vigente */}
            <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase">
                  Período en Curso
                </span>
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-[#262422] dark:text-white">
                  Octubre 2026
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-700 dark:text-blue-400 font-semibold">
                  <span>Vencimiento: 10 de Octubre</span>
                </div>
              </div>
            </div>

            {/* Último Pago Validado */}
            <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase">
                  Última Expensa Pagada
                </span>
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-[#262422] dark:text-white">Bs. 775.00</div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  <span>08/09/2026 • Pagado por María López</span>
                </div>
              </div>
            </div>

            {/* Alquiler Privado (Excluido de la administración) */}
            <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase">
                  Alquiler del Dpto.
                </span>
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400">
                  <Building className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-[#262422] dark:text-white">Bs. 3,000.00</div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-[#7d776f] dark:text-slate-400 font-medium">
                  <span>Trato privado directo con Juan Pérez</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Historial de Expensas con Botón de Extracto */}
          <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#262422] dark:text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  Historial de Expensas Comunes (Dpto 305)
                </h2>
                <p className="text-xs text-[#7d776f] dark:text-slate-400">
                  Desglose de cuotas mensuales de áreas comunes recaudadas por la administración del edificio.
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedExtractoPeriodo('Octubre 2026')
                  setIsExtractoModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#cec8bc] dark:border-slate-700 bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 text-xs font-bold text-[#262422] dark:text-white transition-all cursor-pointer self-start sm:self-auto"
              >
                <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                Ver Extracto de Gastos (Bs 15.500)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#cec8bc] dark:border-slate-800 text-[#7d776f] dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 px-3">Período</th>
                    <th className="pb-3 px-3">Vencimiento</th>
                    <th className="pb-3 px-3">Expensa Mensual</th>
                    <th className="pb-3 px-3">Total a Pagar</th>
                    <th className="pb-3 px-3">Pagado Por</th>
                    <th className="pb-3 px-3">Estado</th>
                    <th className="pb-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cec8bc]/50 dark:divide-slate-800/60">
                  {expensas.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#e4ded4]/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-3 font-bold text-[#262422] dark:text-white">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                          <span>{item.periodo}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[#7d776f] dark:text-slate-400">
                        {item.vencimiento}
                      </td>
                      <td className="py-3.5 px-3 font-mono">Bs. {item.montoExpensa.toFixed(2)}</td>
                      <td className="py-3.5 px-3 font-mono font-bold text-sm text-[#262422] dark:text-white">
                        Bs. {item.total.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-3 text-[#5c5750] dark:text-slate-300">
                        {item.pagadoPor || 'Pendiente'}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.estado === 'PAGADA'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : item.estado === 'EN_REVISION'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                          }`}
                        >
                          {item.estado === 'PAGADA' && <CheckCircle2 className="w-3 h-3" />}
                          {item.estado === 'EN_REVISION' && <Clock className="w-3 h-3" />}
                          {item.estado === 'PENDIENTE' && <AlertCircle className="w-3 h-3" />}
                          {item.estado}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedExtractoPeriodo(item.periodo)
                              setIsExtractoModalOpen(true)
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-950/50 dark:text-blue-300 text-xs font-bold transition-all cursor-pointer"
                            title="Ver extracto de lo que se cobra"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Extracto
                          </button>

                          {item.estado === 'PAGADA' ? (
                            <button
                              onClick={() => setSelectedReceipt(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50 text-xs font-bold transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ver Recibo
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setPaymentForm((prev) => ({
                                  ...prev,
                                  expensaId: item.id,
                                  monto: item.total.toFixed(2)
                                }))
                                setIsPaymentModalOpen(true)
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              Pagar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================
          VISTA DE PROPIETARIO (Juan Pérez)
         ======================================================== */}
      {rolPerspectiva === 'PROPIETARIO' && (
        <>
          {/* Tarjeta de Identificación del Propietario */}
          <div className="bg-[#ede9e1]/90 dark:bg-slate-900/90 p-5 sm:p-6 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-sm backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-700 dark:bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-800/20">
                <Home className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-[#262422] dark:text-white">
                    Juan Pérez — Propietario Titular
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-400">
                    2 Unidades Registradas
                  </span>
                </div>
                <p className="text-xs text-[#7d776f] dark:text-slate-400 mt-0.5">
                  CI: 5920144 SCZ • Responsable legal de las expensas de sus unidades frente a la administración.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => {
                  setSelectedExtractoPeriodo('Octubre 2026')
                  setIsExtractoModalOpen(true)
                }}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-[#ded8cc] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#262422] dark:text-slate-100 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-[#cec8bc] dark:border-slate-700 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                Extracto de Gastos Comunes
              </button>
              <button
                onClick={() => setIsQRModalOpen(true)}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-[#ded8cc] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#262422] dark:text-slate-100 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-[#cec8bc] dark:border-slate-700 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                QR Cuenta Edificio
              </button>
            </div>
          </div>

          {/* Tarjetas Resumen de Unidades del Propietario */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800">
              <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase">
                Unidades en Copropiedad
              </span>
              <div className="text-2xl font-black text-[#262422] dark:text-white mt-2">
                2 Departamentos
              </div>
              <p className="text-xs text-[#7d776f] mt-1">Dpto 305 y Dpto 306</p>
            </div>

            <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800">
              <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase">
                Estado de Ocupación
              </span>
              <div className="text-2xl font-black text-[#262422] dark:text-white mt-2">
                1 Alquilado • 1 Vacío
              </div>
              <p className="text-xs text-[#7d776f] mt-1">Dpto 305 (María López) / Dpto 306 (Desocupado)</p>
            </div>

            <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800">
              <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase">
                Expensa Total Mensual
              </span>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-2">
                Bs. 1,550.00
              </div>
              <p className="text-xs text-[#7d776f] mt-1">
                Bs. 775/mes por c/u (las unidades vacías generan expensa obligatoria)
              </p>
            </div>
          </div>

          {/* Listado de Unidades del Propietario con Estado de Expensas */}
          <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#262422] dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                Mis Unidades y Control de Expensas
              </h2>
              <p className="text-xs text-[#7d776f] dark:text-slate-400">
                Como propietario eres el responsable legal ante la administración, independientemente de si la unidad está alquilada o vacía.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {UNIDADES_PROPIETARIO_JUAN_PEREZ.map((u) => (
                <div
                  key={u.numero}
                  className="bg-[#ded8cc]/70 dark:bg-slate-800/70 p-4 rounded-xl border border-[#cec8bc] dark:border-slate-700 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-[#262422] dark:text-white">
                          Dpto. {u.numero}
                        </span>
                        <span className="text-xs text-[#7d776f]">({u.tipo})</span>
                      </div>
                      <p className="text-xs text-[#7d776f] mt-0.5">
                        Alícuota: <span className="font-bold">{u.alicuota}%</span> • Expensa:{' '}
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          Bs. {u.expensaMes.toFixed(2)}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.estadoOcupacion === 'Alquilado'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                      }`}
                    >
                      {u.estadoOcupacion}
                    </span>
                  </div>

                  <div className="border-t border-[#cec8bc] dark:border-slate-700 pt-2 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#7d776f]">Inquilino actual:</span>
                      <span className="font-bold text-[#262422] dark:text-white">
                        {u.inquilinoNombre || 'Ninguno (Unidad Desocupada)'}
                      </span>
                    </div>
                    {u.estadoOcupacion === 'Alquilado' && (
                      <div className="flex justify-between text-blue-800 dark:text-blue-400">
                        <span>Alquiler mensual convenido:</span>
                        <span className="font-bold">Bs. 3,000 (Trato Privado)</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[#7d776f]">Estado de Expensa:</span>
                      <span
                        className={`font-bold ${
                          u.estadoExpensa === 'Al Día'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {u.estadoExpensa} (Octubre 2026)
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Modal: Reportar Pago de Expensa */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-700 text-white">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#262422] dark:text-white">
                    Reportar Pago de Expensa (Dpto 305)
                  </h3>
                  <p className="text-xs text-[#7d776f] dark:text-slate-400">
                    Ingresa los datos del pago directo a la cuenta de la administración.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Expensa a Cancelar
                  </label>
                  <select
                    value={paymentForm.expensaId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, expensaId: e.target.value })}
                    className="w-full bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {expensas.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.periodo} — Bs. {e.total.toFixed(2)} ({e.estado})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Monto a Transferir (Bs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentForm.monto}
                    onChange={(e) => setPaymentForm({ ...paymentForm, monto: e.target.value })}
                    className="w-full bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Pagado Por (Nombre) *
                  </label>
                  <input
                    type="text"
                    required
                    value={paymentForm.pagadoPorNombre}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, pagadoPorNombre: e.target.value })
                    }
                    className="w-full bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Rol del Pagador
                  </label>
                  <select
                    value={paymentForm.pagadoPorRol}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, pagadoPorRol: e.target.value })
                    }
                    className="w-full bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="Inquilina">Inquilino (por acuerdo con dueño)</option>
                    <option value="Propietario">Propietario Titular</option>
                    <option value="Apoderado">Persona Autorizada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={paymentForm.metodo}
                    onChange={(e) => setPaymentForm({ ...paymentForm, metodo: e.target.value })}
                    className="w-full bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="QR_SIMPLE">QR Simple Interbancario</option>
                    <option value="TRANSFERENCIA">Transferencia Bancaria (BMSC)</option>
                    <option value="DEPOSITO">Depósito en Ventanilla</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Nro. de Operación / Ref.
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 902184712"
                    value={paymentForm.nroReferencia}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, nroReferencia: e.target.value })
                    }
                    className="w-full bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Enviar para Conciliación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: QR de Pago y Datos Bancarios Oficiales */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-left">
                <QrCode className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <h3 className="font-bold text-base text-[#262422] dark:text-white">
                  QR Simple — Cuenta Edificio XYZ
                </h3>
              </div>
              <button
                onClick={() => setIsQRModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner mx-auto border-4 border-emerald-600/30">
              <div className="w-48 h-48 bg-slate-950 flex flex-col items-center justify-center rounded-xl p-3 text-white space-y-2">
                <QrCode className="w-24 h-24 text-white" />
                <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-bold">
                  EDIFICIO-XYZ-EXPENSAS
                </span>
              </div>
            </div>

            <div className="bg-[#ded8cc]/70 dark:bg-slate-800/70 p-3.5 rounded-xl text-left text-xs space-y-1.5 border border-[#cec8bc] dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Banco:</span>
                <span className="font-bold text-[#262422] dark:text-white">
                  Banco Mercantil Santa Cruz
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Cuenta:</span>
                <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  4010-928374-2-01 (M/N)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Titular:</span>
                <span className="font-bold text-[#262422] dark:text-white">
                  Copropiedad Edificio XYZ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d776f]">NIT:</span>
                <span className="font-mono font-bold text-[#262422] dark:text-white">
                  1029384029
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#7d776f] dark:text-slate-400">
              Indica en la glosa de tu transferencia: <span className="font-bold">Dpto 305 - Expensa</span>.
            </p>

            <button
              onClick={() => setIsQRModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors shadow-md cursor-pointer"
            >
              Cerrar y Regresar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Recibo Oficial Digital de Caja con Extracto Integrado */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 text-[#262422] dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base uppercase tracking-tight">
                  Recibo Oficial de Caja — Expensas
                </h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Encabezado del Recibo */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/60 space-y-3">
              <div className="flex justify-between items-start text-xs">
                <div>
                  <div className="font-black text-sm text-emerald-800 dark:text-emerald-400">
                    EDIFICIO RESIDENCIAL XYZ
                  </div>
                  <div className="text-[11px] text-slate-500">
                    NIT: 1029384029 • Cochabamba, Bolivia
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900 dark:text-white">
                    {selectedReceipt.nroComprobante}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Fecha de Pago: {selectedReceipt.fechaPago}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Departamento:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    Dpto {selectedReceipt.deptoNumero} ({selectedReceipt.tipologia})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Propietario Responsable:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedReceipt.propietario}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Inquilino Asignado:
                  </span>
                  <span>{selectedReceipt.inquilino || 'Ninguno'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Pagado Por:
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {selectedReceipt.pagadoPor || 'Titular'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Concepto:
                  </span>
                  <span>Expensa Común {selectedReceipt.periodo}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Canal:
                  </span>
                  <span>{selectedReceipt.metodoPago}</span>
                </div>
              </div>
            </div>

            {/* Extracto Detallado de Gastos Comunes en el Recibo */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-950/60 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase pb-1 border-b dark:border-slate-800">
                <span>Extracto Composición de la Expensa</span>
                <span>Base Edificio: Bs 15.500 (Alícuota 5%)</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300">• Seguridad y Vigilancia 24/7 (36.13%)</span>
                <span className="font-mono">Bs. {(selectedReceipt.total * 0.3613).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300">• Administración Central y Gestión (22.58%)</span>
                <span className="font-mono">Bs. {(selectedReceipt.total * 0.2258).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300">• Limpieza e Insumos Comunes (14.19%)</span>
                <span className="font-mono">Bs. {(selectedReceipt.total * 0.1419).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300">• Mantenimiento de Edificación (9.68%)</span>
                <span className="font-mono">Bs. {(selectedReceipt.total * 0.0968).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300">• Electricidad Común ELFEC (5.16%)</span>
                <span className="font-mono">Bs. {(selectedReceipt.total * 0.0516).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300">• Mantenimiento Ascensor Otis (4.52%)</span>
                <span className="font-mono">Bs. {(selectedReceipt.total * 0.0452).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300">• Agua Común SEMAPA (1.94%)</span>
                <span className="font-mono">Bs. {(selectedReceipt.total * 0.0194).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300">• Imprevistos y Fondo Menor (5.80%)</span>
                <span className="font-mono">Bs. {(selectedReceipt.total * 0.058).toFixed(2)}</span>
              </div>
            </div>

            {/* Total Recaudado */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-2 text-sm font-black text-emerald-800 dark:text-emerald-400 border-t-2 border-slate-900 dark:border-slate-100">
                <span>TOTAL EXPENSA RECAUDADA</span>
                <span className="font-mono">Bs. {selectedReceipt.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              ℹ️ Comprobante oficial de expensas. La administración no cobra alquileres ni servicios de medidores individuales (ELFEC/Agua domiciliaria).
            </div>

            <div className="flex justify-end gap-2 border-t pt-3 dark:border-slate-800">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir Recibo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Extracto Oficial de Gastos Comunes y Liquidación */}
      {isExtractoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
                    Extracto de Gastos Comunes — Dpto 305 ({selectedExtractoPeriodo})
                  </h3>
                  <p className="text-xs text-[#7d776f] dark:text-slate-400">
                    Composición y liquidación analítica de los rubros comunes que financia la expensa.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExtractoModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ficha Resumen del Extracto */}
            <div className="bg-white/80 dark:bg-slate-950/80 p-4 rounded-xl border border-[#cec8bc] dark:border-slate-800 text-xs space-y-2.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left">
                <div>
                  <span className="text-[#7d776f] text-[10px] uppercase font-bold block">Período</span>
                  <span className="font-bold text-[#262422] dark:text-white">{selectedExtractoPeriodo}</span>
                </div>
                <div>
                  <span className="text-[#7d776f] text-[10px] uppercase font-bold block">Gastos Totales Edificio</span>
                  <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">Bs 15.500,00</span>
                </div>
                <div>
                  <span className="text-[#7d776f] text-[10px] uppercase font-bold block">Superficie Privada</span>
                  <span className="font-bold font-mono">80.00 m² (Tipo B)</span>
                </div>
                <div>
                  <span className="text-[#7d776f] text-[10px] uppercase font-bold block">Alícuota Aplicada</span>
                  <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">5.00%</span>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex flex-wrap justify-between items-center text-[11px] gap-2">
                <span><strong>Propietario Responsable:</strong> Juan Pérez</span>
                <span><strong>Ocupante Actual:</strong> María López (Inquilina)</span>
                <span><strong>Total Expensa Asignada:</strong> <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">Bs 775.00</span></span>
              </div>
            </div>

            {/* Tabla Analítica del Extracto */}
            <div className="overflow-x-auto rounded-xl border border-[#cec8bc] dark:border-slate-800">
              <table className="w-full text-left text-xs bg-white dark:bg-slate-950">
                <thead>
                  <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/60 dark:bg-slate-900/60 text-[#7d776f] dark:text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Rubro de Gasto Común</th>
                    <th className="py-2.5 px-3 text-right">Presupuesto Edificio</th>
                    <th className="py-2.5 px-3 text-right">% Ponderado</th>
                    <th className="py-2.5 px-3 text-right font-extrabold text-emerald-800 dark:text-emerald-400">
                      Cuota Dpto 305 (5%)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {RUBROS_GASTOS_COMUNES.map((r, idx) => {
                    const cuotaRubro = 775.0 * (r.porcentaje / 100)
                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="py-2 px-3 font-medium text-[#262422] dark:text-slate-200">
                          {r.concepto}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[#7d776f] dark:text-slate-400">
                          Bs. {r.totalPresupuesto.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[#7d776f] dark:text-slate-400">
                          {r.porcentaje.toFixed(2)}%
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#262422] dark:text-white">
                          Bs. {cuotaRubro.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="border-t-2 border-slate-900 dark:border-slate-200 font-black bg-slate-50 dark:bg-slate-900">
                    <td className="py-2.5 px-3 uppercase text-[11px]">Total Liquidación de Gastos</td>
                    <td className="py-2.5 px-3 text-right font-mono">Bs. 15.500,00</td>
                    <td className="py-2.5 px-3 text-right font-mono">100.00%</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400 text-sm">
                      Bs. 775,00
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Comparativa por Tipología */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs bg-[#dfd9ce]/40 dark:bg-slate-950/40 p-2.5 rounded-xl border border-[#cec8bc] dark:border-slate-800">
              <div>
                <span className="text-[10px] text-[#7d776f] uppercase font-bold block">Tipo A (60 m² • 3.75%)</span>
                <span className="font-mono font-bold text-emerald-800 dark:text-emerald-400">Bs. 581,25</span>
              </div>
              <div className="border-2 border-emerald-600/40 rounded-lg p-1 bg-emerald-50/50 dark:bg-emerald-950/20">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 uppercase font-black block">Tipo B (80 m² • 5.00%) ★</span>
                <span className="font-mono font-black text-emerald-800 dark:text-emerald-400">Bs. 775,00</span>
              </div>
              <div>
                <span className="text-[10px] text-[#7d776f] uppercase font-bold block">Tipo C (100 m² • 6.25%)</span>
                <span className="font-mono font-bold text-emerald-800 dark:text-emerald-400">Bs. 968,75</span>
              </div>
            </div>

            <div className="text-[10px] text-[#7d776f] bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800 leading-relaxed">
              ℹ️ <strong>Transparencia Administrativa:</strong> Este extracto demuestra a dónde se destina cada boliviano aportado en la expensa común del edificio. El alquiler de Bs 3,000 es un acuerdo privado directo entre propietario e inquilino y no forma parte de este cobro administrativo.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#cec8bc] dark:border-slate-800">
              <button
                onClick={() => setIsExtractoModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir Extracto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
