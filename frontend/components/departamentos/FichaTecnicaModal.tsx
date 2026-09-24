// frontend/components/departamentos/FichaTecnicaModal.tsx
'use client'

import React from 'react'
import { X, Printer, Car, Box, Users, ShieldCheck, Building } from 'lucide-react'
import { DepartamentoItem } from './types'

interface FichaTecnicaModalProps {
  isOpen: boolean
  depto: DepartamentoItem | null
  onClose: () => void
}

export default function FichaTecnicaModal({ isOpen, depto, onClose }: FichaTecnicaModalProps) {
  if (!isOpen || !depto) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-700 dark:bg-indigo-600 text-white flex items-center justify-center font-black">
              {depto.numero}
            </div>
            <div>
              <h3 className="font-black text-base text-[#262422] dark:text-white">
                Ficha Técnica Inmobiliaria — Dpto {depto.numero}
              </h3>
              <p className="text-xs text-[#7d776f] dark:text-slate-400">
                Piso {depto.piso || '-'} • {depto.areaM2 || 0} m² • Alícuota:{' '}
                <span className="font-bold text-blue-700 dark:text-indigo-400">
                  {depto.alicuota || ((Number(depto.areaM2 || 0) / 2650) * 100).toFixed(2)}%
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* Titular */}
          <div className="p-3.5 rounded-xl bg-[#ded8cc]/70 dark:bg-slate-800/70 border border-[#cec8bc] dark:border-slate-700 space-y-1.5">
            <span className="font-bold text-[#5c5750] dark:text-slate-400 block uppercase tracking-wider text-[10px]">
              Propietario Titular Registrado
            </span>
            {depto.propietario ? (
              <>
                <div className="text-sm font-extrabold text-[#262422] dark:text-white">
                  {depto.propietario.nombre}
                </div>
                <div className="text-[#5c5750] dark:text-slate-400 font-mono">
                  CI: {depto.propietario.ci} • Tel: {depto.propietario.telefono}
                </div>
                <div className="text-[#5c5750] dark:text-slate-400">
                  Correo: {depto.propietario.correo}
                </div>
              </>
            ) : (
              <div className="text-[#7d776f] dark:text-slate-500 italic">
                Unidad disponible sin titular asignado
              </div>
            )}
          </div>

          {/* Inquilino si existe */}
          {depto.inquilinoActual && (
            <div className="p-3 rounded-xl bg-purple-100/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50">
              <span className="text-[10px] uppercase font-bold text-purple-900 dark:text-purple-300 block">
                Inquilino / Residente Actual
              </span>
              <div className="font-bold text-[#262422] dark:text-white mt-0.5">
                {depto.inquilinoActual.nombre}
              </div>
              <div className="text-[11px] text-[#7d776f] dark:text-slate-400 font-mono">
                Tel: {depto.inquilinoActual.telefono}
              </div>
            </div>
          )}

          {/* Amenidades asignadas */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-[#ded8cc]/70 dark:bg-slate-800/70 border border-[#cec8bc] dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-[#7d776f] block">
                Espacio de Parqueo
              </span>
              <span className="font-bold text-[#262422] dark:text-white text-xs flex items-center gap-1 mt-0.5">
                <Car className="w-3.5 h-3.5 text-[#7d776f]" />
                {depto.parqueo}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#ded8cc]/70 dark:bg-slate-800/70 border border-[#cec8bc] dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-[#7d776f] block">
                Baulera Asignada
              </span>
              <span className="font-bold text-[#262422] dark:text-white text-xs flex items-center gap-1 mt-0.5">
                <Box className="w-3.5 h-3.5 text-[#7d776f]" />
                {depto.baulera}
              </span>
            </div>
          </div>

          {/* Historial de ocupación */}
          {depto.historialOcupantes && depto.historialOcupantes.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="font-bold text-[#5c5750] dark:text-slate-400 uppercase tracking-wider text-[10px] block">
                Historial de Ocupantes Anteriores
              </span>
              <div className="space-y-1">
                {depto.historialOcupantes.map((h, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-2 rounded-lg bg-[#dfd9ce]/60 dark:bg-slate-800/40 text-[11px]"
                  >
                    <span className="font-bold text-[#262422] dark:text-white">{h.residente}</span>
                    <span className="text-[#7d776f] dark:text-slate-400 font-mono">
                      {h.periodo} ({h.tipo})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-[#cec8bc] dark:border-slate-800">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs font-bold text-[#5c5750] dark:text-slate-300 hover:bg-[#ded8cc] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Ficha
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-colors shadow-md cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
