// frontend/components/egresos/DetalleEgresoModal.tsx
'use client'

import React from 'react'
import {
  X,
  Receipt,
  Building,
  Calendar,
  CreditCard,
  Tag,
  FileText,
  Printer,
  CheckCircle2
} from 'lucide-react'
import { EgresoItem } from './types'

interface DetalleEgresoModalProps {
  egreso: EgresoItem | null
  onClose: () => void
}

export default function DetalleEgresoModal({ egreso, onClose }: DetalleEgresoModalProps) {
  if (!egreso) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-[#262422] dark:text-white">
                Comprobante de Egreso
              </h3>
              <p className="text-[11px] font-mono text-[#7d776f] dark:text-slate-400">
                {egreso.codigo}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Voucher Content */}
        <div className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800">
            <div>
              <span className="text-[11px] text-[#7d776f] dark:text-slate-400 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
                Proveedor / Beneficiario
              </span>
              <span className="font-bold text-[#262422] dark:text-white text-sm block mt-0.5">
                {egreso.proveedor}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#7d776f] dark:text-slate-400 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                Nro. Factura / Recibo
              </span>
              <span className="font-mono font-bold text-[#262422] dark:text-white text-sm block mt-0.5">
                {egreso.nroFactura}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-[#cec8bc] dark:border-slate-800">
              <span className="text-[11px] text-[#7d776f] dark:text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Fecha de Desembolso
              </span>
              <span className="font-bold text-[#262422] dark:text-white block mt-0.5">
                {egreso.fecha}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-[#cec8bc] dark:border-slate-800">
              <span className="text-[11px] text-[#7d776f] dark:text-slate-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                Rubro / Categoría
              </span>
              <span className="font-bold text-[#262422] dark:text-white block mt-0.5">
                {egreso.categoria}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-[#cec8bc] dark:border-slate-800">
              <span className="text-[11px] text-[#7d776f] dark:text-slate-400 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" />
                Método de Pago
              </span>
              <span className="font-bold text-[#262422] dark:text-white block mt-0.5">
                {egreso.metodoPago}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-[#cec8bc] dark:border-slate-800">
              <span className="text-[11px] text-[#7d776f] dark:text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Estado del Desembolso
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full text-[11px] font-bold ${
                  egreso.estado === 'Pagado'
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : egreso.estado === 'Pendiente'
                      ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
                      : 'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300'
                }`}
              >
                {egreso.estado}
              </span>
            </div>
          </div>

          {/* Concepto / Descripción */}
          <div className="p-3.5 rounded-xl bg-white/60 dark:bg-slate-950/60 border border-[#cec8bc] dark:border-slate-800 space-y-1">
            <span className="font-bold block text-[10px] uppercase tracking-wider text-[#7d776f] dark:text-slate-400">
              Concepto / Detalle Operativo
            </span>
            <p className="text-[#383430] dark:text-slate-200 leading-relaxed text-xs">
              {egreso.descripcion || 'Sin descripción adicional registrada.'}
            </p>
          </div>

          {/* Monto Total */}
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
            <span className="font-bold text-xs text-[#262422] dark:text-white">
              Total Desembolsado
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-800 dark:text-rose-400">
              Bs. {egreso.monto.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#cec8bc] dark:border-slate-800">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 hover:bg-[#cec8bc] dark:hover:bg-slate-700 text-xs font-bold text-[#262422] dark:text-white transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Comprobante
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
