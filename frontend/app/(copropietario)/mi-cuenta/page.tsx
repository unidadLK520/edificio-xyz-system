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
  ChevronRight,
  Eye,
  Info
} from 'lucide-react'

interface ExpensaItem {
  id: string
  mes: string
  vencimiento: string
  alicuotaBase: number
  serviciosComunes: number
  fondoReserva: number
  mora: number
  total: number
  estado: 'PAGADO' | 'PENDIENTE' | 'EN_REVISION'
  fechaPago?: string
  metodoPago?: string
  nroComprobante?: string
}

const INITIAL_EXPENSAS: ExpensaItem[] = [
  {
    id: 'EXP-2026-09',
    mes: 'Septiembre 2026',
    vencimiento: '10/10/2026',
    alicuotaBase: 420.0,
    serviciosComunes: 70.0,
    fondoReserva: 30.0,
    mora: 0.0,
    total: 520.0,
    estado: 'PENDIENTE'
  },
  {
    id: 'EXP-2026-08',
    mes: 'Agosto 2026',
    vencimiento: '10/09/2026',
    alicuotaBase: 420.0,
    serviciosComunes: 70.0,
    fondoReserva: 30.0,
    mora: 0.0,
    total: 520.0,
    estado: 'PAGADO',
    fechaPago: '08/09/2026',
    metodoPago: 'Transferencia BMSC (QR Simple)',
    nroComprobante: 'REC-2026-08-402'
  },
  {
    id: 'EXP-2026-07',
    mes: 'Julio 2026',
    vencimiento: '10/08/2026',
    alicuotaBase: 420.0,
    serviciosComunes: 70.0,
    fondoReserva: 30.0,
    mora: 0.0,
    total: 520.0,
    estado: 'PAGADO',
    fechaPago: '05/08/2026',
    metodoPago: 'Pago Móvil QR',
    nroComprobante: 'REC-2026-07-402'
  },
  {
    id: 'EXP-2026-06',
    mes: 'Junio 2026',
    vencimiento: '10/07/2026',
    alicuotaBase: 420.0,
    serviciosComunes: 70.0,
    fondoReserva: 30.0,
    mora: 0.0,
    total: 520.0,
    estado: 'PAGADO',
    fechaPago: '09/07/2026',
    metodoPago: 'Depósito en Efectivo',
    nroComprobante: 'REC-2026-06-402'
  }
]

export default function MiCuentaPage() {
  const [expensas, setExpensas] = useState<ExpensaItem[]>(INITIAL_EXPENSAS)
  const [selectedReceipt, setSelectedReceipt] = useState<ExpensaItem | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState(false)

  // Formulario de pago
  const [paymentForm, setPaymentForm] = useState({
    expensaId: 'EXP-2026-09',
    metodo: 'QR_SIMPLE',
    nroReferencia: '',
    monto: '520.00',
    fecha: new Date().toISOString().split('T')[0],
    bancoOrigen: 'Banco Mercantil Santa Cruz'
  })

  const pendingExpensas = expensas.filter((e) => e.estado === 'PENDIENTE')
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
                  : 'Transferencia Bancaria',
              nroComprobante: `PEND-${paymentForm.nroReferencia || '77891'}`,
              fechaPago: paymentForm.fecha
            }
          : item
      )
    )
    setIsPaymentModalOpen(false)
    setPaymentSuccessMsg(true)
    setTimeout(() => setPaymentSuccessMsg(false), 4000)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Alerta de confirmación */}
      {paymentSuccessMsg && (
        <div className="p-4 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl flex items-center gap-3 shadow-md animate-in fade-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold">¡Comprobante de pago registrado exitosamente!</span> La
            administración revisará y acreditará tu pago en las próximas 24 horas hábiles.
          </div>
        </div>
      )}

      {/* Tarjeta de Identificación del Residente */}
      <div className="bg-[#ede9e1]/90 dark:bg-slate-900/90 p-5 sm:p-6 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-sm backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-700 dark:bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-800/20">
            402
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-[#262422] dark:text-white">
                Departamento 402 — Torre A
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                Propietario Titular
              </span>
            </div>
            <p className="text-xs text-[#7d776f] dark:text-slate-400 mt-0.5">
              Alejandro Gómez Salces • Alícuota: <span className="font-bold font-mono">4.16%</span>{' '}
              • Parqueo: <span className="font-bold font-mono">P-12</span> • Baulera:{' '}
              <span className="font-bold font-mono">B-04</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsQRModalOpen(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-[#ded8cc] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#262422] dark:text-slate-100 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-[#cec8bc] dark:border-slate-700"
          >
            <QrCode className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            Ver QR de Pago
          </button>
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/20 active:scale-95"
          >
            <Upload className="w-4 h-4" />
            Reportar Pago
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Estado de Cuenta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Pendiente */}
        <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase">
              Saldo Pendiente
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
              {totalDeuda > 0 ? (
                <span>1 cuota por cancelar</span>
              ) : (
                <span>¡Estás al día con tus expensas!</span>
              )}
            </div>
          </div>
        </div>

        {/* Expensa del Mes Vigente */}
        <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase">
              Mes Vigente
            </span>
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#262422] dark:text-white">
              Septiembre 2026
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-700 dark:text-blue-400 font-semibold">
              <span>Vencimiento: 10 de Octubre</span>
            </div>
          </div>
        </div>

        {/* Último Pago Registrado */}
        <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase">
              Último Pago Validado
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#262422] dark:text-white">Bs. 520.00</div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              <span>08/09/2026 • Agosto 2026</span>
            </div>
          </div>
        </div>

        {/* Alícuota y Metraje */}
        <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7d776f] dark:text-slate-400 uppercase">
              Superficie Privada
            </span>
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#262422] dark:text-white">128.50 m²</div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[#7d776f] dark:text-slate-400 font-medium">
              <span>Piso 4 • Vista Panorámica</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Historial y Emisión de Expensas */}
      <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-[#262422] dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              Detalle de Facturación & Historial de Expensas
            </h2>
            <p className="text-xs text-[#7d776f] dark:text-slate-400">
              Consulta el desglose de cuotas mensuales, conceptos de mantenimiento y descarga tus
              comprobantes oficiales.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#cec8bc] dark:border-slate-800 text-[#7d776f] dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3 px-3">Período</th>
                <th className="pb-3 px-3">Vencimiento</th>
                <th className="pb-3 px-3">Alícuota Base</th>
                <th className="pb-3 px-3">Servicios Comunes</th>
                <th className="pb-3 px-3">Fondo Reserva</th>
                <th className="pb-3 px-3">Total a Pagar</th>
                <th className="pb-3 px-3">Estado</th>
                <th className="pb-3 px-3 text-right">Comprobante</th>
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
                      <span>{item.mes}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[#7d776f] dark:text-slate-400">
                    {item.vencimiento}
                  </td>
                  <td className="py-3.5 px-3 font-mono">Bs. {item.alicuotaBase.toFixed(2)}</td>
                  <td className="py-3.5 px-3 font-mono">Bs. {item.serviciosComunes.toFixed(2)}</td>
                  <td className="py-3.5 px-3 font-mono">Bs. {item.fondoReserva.toFixed(2)}</td>
                  <td className="py-3.5 px-3 font-mono font-bold text-sm text-[#262422] dark:text-white">
                    Bs. {item.total.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.estado === 'PAGADO'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : item.estado === 'EN_REVISION'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                      }`}
                    >
                      {item.estado === 'PAGADO' && <CheckCircle2 className="w-3 h-3" />}
                      {item.estado === 'EN_REVISION' && <Clock className="w-3 h-3" />}
                      {item.estado === 'PENDIENTE' && <AlertCircle className="w-3 h-3" />}
                      {item.estado === 'PAGADO'
                        ? 'PAGADO'
                        : item.estado === 'EN_REVISION'
                          ? 'EN REVISIÓN'
                          : 'PENDIENTE'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    {item.estado === 'PAGADO' ? (
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-xs font-bold transition-all shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Pagar Ahora
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Reportar Pago */}
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
                    Reportar Comprobante de Pago
                  </h3>
                  <p className="text-xs text-[#7d776f] dark:text-slate-400">
                    Ingresa los datos de tu transferencia o depósito bancario.
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
                    Expensa a Pagar
                  </label>
                  <select
                    value={paymentForm.expensaId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, expensaId: e.target.value })}
                    className="w-full bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {expensas.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.mes} — Bs. {e.total.toFixed(2)} ({e.estado})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                    Monto Transferido (Bs.)
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
                    Canal / Método de Pago
                  </label>
                  <select
                    value={paymentForm.metodo}
                    onChange={(e) => setPaymentForm({ ...paymentForm, metodo: e.target.value })}
                    className="w-full bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="QR_SIMPLE">QR Simple Interbancario</option>
                    <option value="TRANSFERENCIA">Transferencia Bancaria (BMSC)</option>
                    <option value="DEPOSITO">Depósito por Ventanilla / Cajero</option>
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

              <div>
                <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                  Adjuntar Captura del Comprobante (Voucher)
                </label>
                <div className="border-2 border-dashed border-[#cec8bc] dark:border-slate-700 rounded-xl p-4 text-center hover:bg-[#ded8cc]/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer">
                  <Upload className="w-6 h-6 mx-auto text-[#7d776f] mb-1" />
                  <p className="text-xs font-semibold text-[#262422] dark:text-slate-200">
                    Haz clic para seleccionar comprobante (PNG, JPG o PDF)
                  </p>
                  <p className="text-[10px] text-[#7d776f]">Tamaño máximo: 5MB</p>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#cec8bc] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-md active:scale-95"
                >
                  Enviar para Validación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: QR de Pago y Datos Bancarios */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-left">
                <QrCode className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <h3 className="font-bold text-base text-[#262422] dark:text-white">
                  QR Simple — Pago de Expensas
                </h3>
              </div>
              <button
                onClick={() => setIsQRModalOpen(false)}
                className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Código QR Simulado */}
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
                <span className="text-[#7d776f]">Tipo de Cuenta:</span>
                <span className="font-bold text-[#262422] dark:text-white">
                  Cuenta Corriente (M/N)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d776f]">Nro. de Cuenta:</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  4010-928374-2-01
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
              Al transferir, coloca en el concepto de pago tu número de departamento (Ej:{' '}
              <span className="font-bold">Dpto 402</span>).
            </p>

            <button
              onClick={() => setIsQRModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors shadow-md"
            >
              Cerrar y Regresar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Recibo Oficial Digital */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 text-[#262422] dark:text-slate-100">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base uppercase tracking-tight">
                  Comprobante Oficial de Pago
                </h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Encabezado del Recibo */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/60 space-y-3">
              <div className="flex justify-between items-start text-xs">
                <div>
                  <div className="font-black text-sm text-emerald-800 dark:text-emerald-400">
                    CONDOMINIO EDIFICIO XYZ
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
                    Emisión: {selectedReceipt.fechaPago}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Copropietario:
                  </span>
                  <span className="font-bold">Alejandro Gómez Salces</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Unidad:
                  </span>
                  <span className="font-bold">Dpto 402 — Piso 4</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Concepto:
                  </span>
                  <span>Expensa Ordinaria {selectedReceipt.mes}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Forma de Pago:
                  </span>
                  <span>{selectedReceipt.metodoPago}</span>
                </div>
              </div>
            </div>

            {/* Desglose de Rubros */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-dashed dark:border-slate-800">
                <span>Alícuota Base de Mantenimiento</span>
                <span className="font-mono">Bs. {selectedReceipt.alicuotaBase.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed dark:border-slate-800">
                <span>Servicios Comunes (Agua/Luz)</span>
                <span className="font-mono">Bs. {selectedReceipt.serviciosComunes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed dark:border-slate-800">
                <span>Aporte a Fondo de Reserva</span>
                <span className="font-mono">Bs. {selectedReceipt.fondoReserva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-black text-emerald-800 dark:text-emerald-400 border-t-2 border-slate-900 dark:border-slate-100">
                <span>TOTAL CANCELADO</span>
                <span className="font-mono">Bs. {selectedReceipt.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Validado y conciliado por Administración Central.</span>
              </div>
              <span className="font-mono font-bold">Firma Digital OK</span>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3 dark:border-slate-800">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-md"
              >
                <Printer className="w-4 h-4" />
                Imprimir Recibo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
