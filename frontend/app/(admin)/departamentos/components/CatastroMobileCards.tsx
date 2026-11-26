import React from 'react';
import { Building2, Car, Box, Eye, Edit, UserCheck, KeyRound, LockOpen } from 'lucide-react';
import { UnidadItem } from '@/components/departamentos/types';

interface CatastroMobileCardsProps {
  unidadesFiltradas: UnidadItem[];
  subTipoCatastro: 'Departamentos' | 'Parqueos' | 'Bauleras' | 'Todos';
  onSelectUnidad: (u: UnidadItem) => void;
  onAssignUnidad: (u: UnidadItem) => void;
  onEditUnidad: (u: UnidadItem) => void;
  onLiberarUnidad: (u: UnidadItem) => void;
}

export const CatastroMobileCards: React.FC<CatastroMobileCardsProps> = ({
  unidadesFiltradas,
  subTipoCatastro,
  onSelectUnidad,
  onAssignUnidad,
  onEditUnidad,
  onLiberarUnidad,
}) => {
  if (unidadesFiltradas.length === 0) {
    return (
      <div className="block md:hidden p-3">
        <div className="py-8 text-center text-xs text-[#7d776f] dark:text-slate-500 bg-[#dfd9ce]/30 dark:bg-slate-950/40 rounded-xl">
          No se encontraron unidades con los filtros aplicados.
        </div>
      </div>
    );
  }

  return (
    <div className="block md:hidden p-3 space-y-3">
      {unidadesFiltradas.map((unidad) => {
        const isDepto = unidad.tipoUnidad === 'Departamento';
        const isParqueo = unidad.tipoUnidad === 'Parqueo';
        const isBaulera = unidad.tipoUnidad === 'Baulera';

        if (subTipoCatastro === 'Departamentos' || (subTipoCatastro === 'Todos' && isDepto)) {
          return (
            <div
              key={`card-depto-${unidad.id}`}
              className="p-3.5 rounded-2xl bg-[#dfd9ce]/40 dark:bg-slate-950/40 border border-[#cec8bc] dark:border-slate-800 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2 border-b border-[#cec8bc]/50 dark:border-slate-800 pb-2">
                <div>
                  <div className="font-extrabold text-[#262422] dark:text-white flex items-center gap-1.5 text-sm">
                    <Building2 className="w-4 h-4 text-blue-700 dark:text-indigo-400 shrink-0" />
                    <span>Dpto. {unidad.numero}</span>
                  </div>
                  <span className="text-[11px] text-[#7d776f] dark:text-slate-400">
                    {unidad.tipologia || 'Tipo Estándar'} • Piso {unidad.piso || '-'}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                    unidad.estado === 'Ocupado por Propietario'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300'
                      : unidad.estado === 'Alquilado'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300'
                  }`}
                >
                  {unidad.estado}
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-[#5c5750] dark:text-slate-300">
                  <span className="text-[#7d776f] text-[11px]">Propietario:</span>
                  {unidad.propietario ? (
                    <span className="font-bold text-[#262422] dark:text-white flex items-center gap-1 text-right">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {unidad.propietario.nombre}
                    </span>
                  ) : (
                    <span className="text-amber-700 italic text-[11px]">Sin asignar</span>
                  )}
                </div>

                {unidad.estado === 'Alquilado' && unidad.inquilinoActual && (
                  <div className="flex items-center justify-between text-[#5c5750] dark:text-slate-300">
                    <span className="text-[#7d776f] text-[11px]">Inquilino:</span>
                    <span className="font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1 text-right">
                      <KeyRound className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      {unidad.inquilinoActual.nombre}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-[#cec8bc]/40 dark:border-slate-800/60 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-1 text-[#262422] dark:text-white font-medium">
                    <Car className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                    <span className="truncate">{unidad.parqueo || 'Sin parqueo'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#262422] dark:text-white font-medium">
                    <Box className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">{unidad.baulera || 'Sin baulera'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[#cec8bc]/40 dark:border-slate-800/60">
                <button
                  onClick={() => onSelectUnidad(unidad)}
                  className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Extracto
                </button>
                <button
                  onClick={() => onAssignUnidad(unidad)}
                  className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Gestionar Asignación"
                >
                  <UserCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEditUnidad(unidad)}
                  className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Editar
                </button>
              </div>
            </div>
          );
        }

        if (
          subTipoCatastro === 'Parqueos' ||
          subTipoCatastro === 'Bauleras' ||
          (subTipoCatastro === 'Todos' && (isParqueo || isBaulera))
        ) {
          const deptoVinculado = unidad.departamento?.numero;
          const titular = unidad.persona
            ? `${unidad.persona.nombres || ''} ${unidad.persona.apellidos || ''}`.trim()
            : null;
          const label = isParqueo ? 'Parqueo' : 'Baulera';

          return (
            <div
              key={`card-${unidad.tipoUnidad}-${unidad.id}`}
              className="p-3.5 rounded-2xl bg-[#dfd9ce]/40 dark:bg-slate-950/40 border border-[#cec8bc] dark:border-slate-800 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2 border-b border-[#cec8bc]/50 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  {isParqueo ? (
                    <Car className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : (
                    <Box className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-extrabold text-[#262422] dark:text-white font-mono text-sm block">
                      {label} {unidad.numero}
                    </span>
                    <span className="text-[10px] text-[#7d776f] dark:text-slate-400">
                      ID Unidad: #{unidad.id}
                    </span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                    unidad.estado === 'Disponible'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300'
                      : unidad.estado === 'Asignado'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300'
                  }`}
                >
                  {unidad.estado}
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-[#5c5750] dark:text-slate-300">
                  <span className="text-[#7d776f] text-[11px]">Dpto. Vinculado:</span>
                  {deptoVinculado ? (
                    <span className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      Departamento {deptoVinculado}
                    </span>
                  ) : (
                    <span className="text-slate-500 italic text-[11px]">Libre (Sin dpto)</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[#5c5750] dark:text-slate-300">
                  <span className="text-[#7d776f] text-[11px]">Titular Asignado:</span>
                  {titular ? (
                    <span className="font-bold text-[#262422] dark:text-white flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {titular}
                    </span>
                  ) : (
                    <span className="text-slate-500 italic text-[11px]">Sin titular</span>
                  )}
                </div>

                {unidad.fechaAsignacion && (
                  <div className="flex items-center justify-between text-[#5c5750] dark:text-slate-300 text-[11px]">
                    <span className="text-[#7d776f]">Fecha Asignación:</span>
                    <span className="font-mono text-[#262422] dark:text-white">
                      {new Date(unidad.fechaAsignacion).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[#cec8bc]/40 dark:border-slate-800/60">
                <button
                  onClick={() => onAssignUnidad(unidad)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Asignar
                </button>
                <button
                  onClick={() => onEditUnidad(unidad)}
                  className="px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Editar
                </button>
                {(unidad.estado === 'Asignado' || deptoVinculado || titular) && (
                  <button
                    onClick={() => onLiberarUnidad(unidad)}
                    className="p-1 rounded-lg text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title={`Liberar ${label}`}
                  >
                    <LockOpen className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};
