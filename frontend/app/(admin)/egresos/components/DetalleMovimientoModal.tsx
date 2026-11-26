// frontend/app/(admin)/egresos/components/DetalleMovimientoModal.tsx
// Modal for viewing movimiento details

import React from 'react'
import { X, FileCheck, ExternalLink } from 'lucide-react'
import type { MovimientoItem } from '../types'

interface DetalleMovimientoModalProps {
  movimiento: MovimientoItem
  onClose: () => void
}

export const DetalleMovimientoModal: React.FC<DetalleMovimientoModalProps> = ({
  movimiento,
  onClose
}) => {
  const esIngreso = movimiento.tipo === 'Ingreso'

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-3xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
              Detalle de {movimiento.tipo}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between py-1 border-b border-[#cec8bc]/40 dark:border-slate-800">
            <span className="text-[#7d776f]">Código Interno:</span>
            <span className="font-bold font-mono text-[#262422] dark:text-white">{movimiento.codigo}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#cec8bc]/40 dark:border-slate-800">
            <span className="text-[#7d776f]">
              {esIngreso ? 'Pagador / Tercero:' : 'Proveedor / Beneficiario:'}
            </span>
            <span className="font-bold text-[#262422] dark:text-white">
              {movimiento.tercero || 'No especificado'}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#cec8bc]/40 dark:border-slate-800">
            <span className="text-[#7d776f]">Categoría Financiera:</span>
            <span className="font-semibold text-blue-800 dark:text-blue-300">{movimiento.categoria}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#cec8bc]/40 dark:border-slate-800">
            <span className="text-[#7d776f]">Nro de Factura / Recibo:</span>
            <span className="font-bold font-mono">{movimiento.nroFactura || 'Sin factura'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#cec8bc]/40 dark:border-slate-800">
            <span className="text-[#7d776f]">Fecha de Operación:</span>
            <span className="font-bold">{movimiento.fecha}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#cec8bc]/40 dark:border-slate-800">
            <span className="text-[#7d776f]">Forma / Método de Pago:</span>
            <span className="font-bold">{movimiento.metodoPago || 'No especificado'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#cec8bc]/40 dark:border-slate-800">
            <span className="text-[#7d776f]">Registrado por:</span>
            <span className="font-medium text-[#5c5750] dark:text-slate-400">
              {movimiento.registradoPor || 'admin'}
            </span>
          </div>

          {/* Concepto / Descripción */}
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-950/70 border border-[#cec8bc] dark:border-slate-800 mt-2">
            <span className="font-bold block text-[10px] uppercase text-[#7d776f] mb-1">Concepto / Justificación</span>
            <p className="text-[#4a4641] dark:text-slate-200 leading-relaxed">{movimiento.descripcion}</p>
          </div>

          {/* Comprobante Adjunto */}
          {movimiento.comprobanteUrl && (
            <div className="mt-3 p-3.5 rounded-xl bg-white/80 dark:bg-slate-950/80 border border-[#cec8bc] dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] uppercase text-[#7d776f] flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Comprobante de Respaldo Oficial
                </span>
                <a
                  href={movimiento.comprobanteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver Comprobante</span>
                </a>
              </div>

              {movimiento.comprobanteUrl.match(/\.(jpg|jpeg|png|webp)($|\?)/i) ||
               movimiento.comprobanteUrl.startsWith('data:image/') ? (
                <div className="rounded-xl overflow-hidden max-h-56 flex items-center justify-center bg-black/5 dark:bg-white/5 border border-[#cec8bc]/50 dark:border-slate-800">
                  <img src={movimiento.comprobanteUrl} alt="Comprobante adjunto" className="object-contain max-h-56 w-auto" />
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-[#dfd9ce]/60 dark:bg-slate-900 flex items-center justify-between text-xs font-mono text-[#5c5750] dark:text-slate-400">
                  <span className="truncate max-w-xs">{movimiento.comprobanteUrl}</span>
                </div>
              )}
            </div>
          )}

          {/* Total */}
          <div className={`flex justify-between font-black text-base pt-3 border-t border-[#cec8bc] dark:border-slate-800 font-mono ${
            esIngreso ? 'text-emerald-800 dark:text-emerald-400' : 'text-rose-800 dark:text-rose-400'
          }`}>
            <span>Monto Registrado:</span>
            <span>{esIngreso ? '+' : '-'} Bs. {movimiento.monto.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-[#cec8bc] dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#262422] dark:text-white text-xs font-bold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
