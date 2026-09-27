// frontend/components/departamentos/FichaTecnicaModal.tsx
'use client'

import React from 'react'
import { X, Printer, Car, Box, Building2, UserCheck, ShieldCheck, Home } from 'lucide-react'
import { UnidadItem } from './types'

interface FichaTecnicaModalProps {
  isOpen: boolean
  depto: UnidadItem | null
  totalAreaConstruida?: number
  onClose: () => void
}

export default function FichaTecnicaModal({ isOpen, depto, totalAreaConstruida, onClose }: FichaTecnicaModalProps) {
  if (!isOpen || !depto) return null

  const tipo = depto.tipoUnidad || 'Departamento'
  const isDepto = tipo === 'Departamento'
  const isParqueo = tipo === 'Parqueo'
  const isBaulera = tipo === 'Baulera'

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#ede9e1] dark:bg-slate-900 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                isDepto
                  ? 'bg-blue-700 text-white'
                  : isParqueo
                    ? 'bg-amber-600 text-white'
                    : 'bg-emerald-600 text-white'
              }`}
            >
              {depto.numero}
            </div>
            <div>
              <h3 className="font-black text-base text-[#262422] dark:text-white">
                Ficha Técnica Inmobiliaria — {tipo} {depto.numero}
              </h3>
              <p className="text-xs text-[#7d776f] dark:text-slate-400">
                {isDepto ? (
                  <>
                    Piso {depto.piso || '-'} • {depto.areaM2 || 0} m² • Alícuota:{' '}
                    <span className="font-bold text-blue-700 dark:text-indigo-400">
                      {totalAreaConstruida && totalAreaConstruida > 0 && depto.areaM2
                        ? `${((Number(depto.areaM2) / totalAreaConstruida) * 100).toFixed(2)}%`
                        : `${depto.alicuota || 0}%`}
                    </span>
                  </>
                ) : (
                  <>
                    Espacio de Edificio • Estado:{' '}
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {depto.estado}
                    </span>{' '}
                    • Reg: {depto.fechaRegistro || '2024-01-01'}
                  </>
                )}
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
          {/* Asignación a Departamento si es Parqueo o Baulera */}
          {!isDepto && (
            <div className="p-3.5 rounded-xl bg-[#ded8cc]/70 dark:bg-slate-800/70 border border-[#cec8bc] dark:border-slate-700 space-y-1">
              <span className="font-bold text-[#5c5750] dark:text-slate-400 block uppercase tracking-wider text-[10px]">
                Departamento Asignado / Vinculado
              </span>
              {depto.departamento ? (
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-blue-700 dark:text-indigo-400" />
                  <span className="text-sm font-extrabold text-[#262422] dark:text-white">
                    Departamento {depto.departamento.numero}
                  </span>
                </div>
              ) : (
                <div className="text-[#7d776f] dark:text-slate-500 italic">
                  Esta unidad no se encuentra vinculada a ningún departamento.
                </div>
              )}
            </div>
          )}

          {/* Titular */}
          <div className="p-3.5 rounded-xl bg-[#ded8cc]/70 dark:bg-slate-800/70 border border-[#cec8bc] dark:border-slate-700 space-y-1.5">
            <span className="font-bold text-[#5c5750] dark:text-slate-400 block uppercase tracking-wider text-[10px]">
              {isDepto ? 'Propietario Titular Registrado' : 'Titular / Persona Asignada'}
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
            ) : depto.ocupanteActual ? (
              <>
                <div className="text-sm font-extrabold text-[#262422] dark:text-white flex items-center gap-2">
                  <span>{depto.ocupanteActual.nombre}</span>
                  <span className="text-[9px] px-2 py-0.5 bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 rounded font-bold uppercase">
                    {depto.tipoOcupante || 'Inquilino / Ocupante Activo'}
                  </span>
                </div>
                {depto.ocupanteActual.ci && (
                  <div className="text-[#5c5750] dark:text-slate-400 font-mono">
                    CI: {depto.ocupanteActual.ci} • Tel: {depto.ocupanteActual.telefono}
                  </div>
                )}
                {depto.ocupanteActual.correo && (
                  <div className="text-[#5c5750] dark:text-slate-400">
                    Correo: {depto.ocupanteActual.correo}
                  </div>
                )}
              </>
            ) : depto.persona ? (
              <>
                <div className="text-sm font-extrabold text-[#262422] dark:text-white">
                  {depto.persona.nombres} {depto.persona.apellidos}
                </div>
                {depto.persona.ciNit && (
                  <div className="text-[#5c5750] dark:text-slate-400 font-mono">
                    CI: {depto.persona.ciNit}
                  </div>
                )}
              </>
            ) : (
              <div className="text-[#7d776f] dark:text-slate-500 italic">
                Unidad disponible sin titular asignado
              </div>
            )}
          </div>

          {/* Inquilino si existe y es departamento */}
          {isDepto && (depto.inquilinoActual || (depto.propietario && depto.ocupanteActual && depto.ocupanteActual.id !== depto.propietario.id)) && (
            <div className="p-3 rounded-xl bg-purple-100/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50">
              <span className="text-[10px] uppercase font-bold text-purple-900 dark:text-purple-300 block">
                Inquilino / Residente Actual
              </span>
              <div className="font-bold text-[#262422] dark:text-white mt-0.5">
                {depto.inquilinoActual?.nombre || depto.ocupanteActual?.nombre}
              </div>
              <div className="text-[11px] text-[#7d776f] dark:text-slate-400 font-mono">
                Tel: {depto.inquilinoActual?.telefono || depto.ocupanteActual?.telefono || 'Sin tel'}
              </div>
            </div>
          )}

          {/* Amenidades asignadas solo para departamento */}
          {isDepto && (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-[#ded8cc]/70 dark:bg-slate-800/70 border border-[#cec8bc] dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-[#7d776f] block">
                  Espacio de Parqueo
                </span>
                <span className="font-bold text-[#262422] dark:text-white text-xs flex items-center gap-1 mt-0.5">
                  <Car className="w-3.5 h-3.5 text-[#7d776f]" />
                  {depto.parqueo || 'Sin parqueo'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#ded8cc]/70 dark:bg-slate-800/70 border border-[#cec8bc] dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-[#7d776f] block">
                  Baulera Asignada
                </span>
                <span className="font-bold text-[#262422] dark:text-white text-xs flex items-center gap-1 mt-0.5">
                  <Box className="w-3.5 h-3.5 text-[#7d776f]" />
                  {depto.baulera || 'Sin baulera'}
                </span>
              </div>
            </div>
          )}

          {/* Historial de ocupación */}
          {depto.historialOcupantes && depto.historialOcupantes.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="font-bold text-[#5c5750] dark:text-slate-400 uppercase tracking-wider text-[10px] block">
                Historial de Antecedentes y Asignaciones
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
