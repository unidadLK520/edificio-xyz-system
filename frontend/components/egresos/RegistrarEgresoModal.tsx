// frontend/components/egresos/RegistrarEgresoModal.tsx
'use client'

import React, { useState } from 'react'
import { Wallet, X, Upload } from 'lucide-react'
import { EgresoFormData, CategoriaEgreso, MetodoPagoEgreso } from './types'

interface RegistrarEgresoModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: EgresoFormData) => void
}

export default function RegistrarEgresoModal({
  isOpen,
  onClose,
  onSubmit
}: RegistrarEgresoModalProps) {
  const [formData, setFormData] = useState<EgresoFormData>({
    proveedor: '',
    categoria: 'Mantenimiento',
    descripcion: '',
    nroFactura: '',
    monto: 0,
    metodoPago: 'Transferencia Bancaria (BNB)',
    estado: 'Pagado',
    fecha: new Date().toISOString().split('T')[0]
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.proveedor.trim() || Number(formData.monto) <= 0) return
    onSubmit({
      ...formData,
      monto: Number(formData.monto)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-rose-700 dark:text-rose-400" />
            <h3 className="font-extrabold text-base text-[#262422] dark:text-white">
              Registrar Nuevo Egreso / Factura
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
              Proveedor / Empresa / Beneficiario *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Otis Elevadores, ELFEC S.A., Seguritas Ltda."
              value={formData.proveedor}
              onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Rubro / Categoría
              </label>
              <select
                value={formData.categoria}
                onChange={(e) =>
                  setFormData({ ...formData, categoria: e.target.value as CategoriaEgreso })
                }
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-600 cursor-pointer"
              >
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Servicios Básicos">Servicios Básicos</option>
                <option value="Seguridad">Seguridad</option>
                <option value="Limpieza">Limpieza</option>
                <option value="Administrativo">Administrativo</option>
                <option value="Fondo de Reserva">Fondo de Reserva</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Monto Desembolsado (Bs.) *
              </label>
              <input
                type="number"
                step="0.5"
                required
                placeholder="0.00"
                value={formData.monto || ''}
                onChange={(e) => setFormData({ ...formData, monto: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-600 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Nro Factura / Recibo
              </label>
              <input
                type="text"
                placeholder="FAC-89012"
                value={formData.nroFactura}
                onChange={(e) => setFormData({ ...formData, nroFactura: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
                Forma de Pago
              </label>
              <select
                value={formData.metodoPago}
                onChange={(e) =>
                  setFormData({ ...formData, metodoPago: e.target.value as MetodoPagoEgreso })
                }
                className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-600 cursor-pointer"
              >
                <option value="Transferencia Bancaria (BNB)">Transferencia Bancaria (BNB)</option>
                <option value="Transferencia Bancaria (BMSC)">Transferencia Bancaria (BMSC)</option>
                <option value="Cheque de Gerencia">Cheque de Gerencia</option>
                <option value="Débito Automático">Débito Automático</option>
                <option value="Efectivo Caja Chica">Efectivo Caja Chica</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
              Descripción / Concepto del Desembolso
            </label>
            <textarea
              rows={2}
              placeholder="Detalle sobre el trabajo, repuestos o insumos adquiridos..."
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs text-[#262422] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5c5750] dark:text-slate-300 mb-1">
              Adjuntar Comprobante / Factura Digital (Opcional)
            </label>
            <div className="border border-dashed border-[#cec8bc] dark:border-slate-700 rounded-xl p-3 text-center bg-[#ded8cc]/40 dark:bg-slate-800/40 hover:border-rose-600 transition-colors cursor-pointer">
              <Upload className="w-5 h-5 mx-auto text-[#7d776f] mb-1" />
              <span className="text-[11px] text-[#5c5750] dark:text-slate-300">
                Arrastra o haz clic para subir factura en PDF o PNG
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#cec8bc] dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#5c5750] dark:text-slate-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-xs font-bold text-white shadow-md cursor-pointer transition-all active:scale-95"
            >
              Guardar Egreso
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
