import React from 'react';
import { Building2, Car, Box, Eye, Edit, UserCheck, KeyRound, LockOpen } from 'lucide-react';
import { UnidadItem } from '@/components/departamentos/types';

interface CatastroDesktopTableProps {
  unidadesFiltradas: UnidadItem[];
  subTipoCatastro: 'Departamentos' | 'Parqueos' | 'Bauleras' | 'Todos';
  onSelectUnidad: (u: UnidadItem) => void;
  onAssignUnidad: (u: UnidadItem) => void;
  onEditUnidad: (u: UnidadItem) => void;
  onLiberarUnidad: (u: UnidadItem) => void;
}

const getEstadoBadgeClass = (estado: string) => {
  if (estado === 'Ocupado por Propietario' || estado === 'Disponible') {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300';
  }
  if (estado === 'Alquilado') {
    return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-300';
  }
  if (estado === 'Asignado') {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-300';
  }
  return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300';
};

export const CatastroDesktopTable: React.FC<CatastroDesktopTableProps> = ({
  unidadesFiltradas,
  subTipoCatastro,
  onSelectUnidad,
  onAssignUnidad,
  onEditUnidad,
  onLiberarUnidad,
}) => {
  return (
    <div className="hidden md:block overflow-x-auto scrollbar-thin">
      <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[800px]">
        <thead>
          <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/60 dark:bg-slate-950/60 text-[#7d776f] dark:text-slate-400 uppercase text-[11px] font-bold">
            {subTipoCatastro === 'Departamentos' ? (
              <>
                <th className="py-3 px-4">Departamento / Tipo</th>
                <th className="py-3 px-4">Propietario Responsable</th>
                <th className="py-3 px-4">Ocupante / Inquilino</th>
                <th className="py-3 px-4">Superficie</th>
                <th className="py-3 px-4">Parqueo / Baulera</th>
                <th className="py-3 px-4">Estado Ocupación</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </>
            ) : subTipoCatastro === 'Parqueos' || subTipoCatastro === 'Bauleras' ? (
              <>
                <th className="py-3 px-4">{subTipoCatastro === 'Parqueos' ? 'Código Parqueo' : 'Código Baulera'}</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Departamento Vinculado</th>
                <th className="py-3 px-4">Titular Asignado</th>
                <th className="py-3 px-4">Fecha Asignación</th>
                <th className="py-3 px-4 text-right">Acciones (Editar / Vincular)</th>
              </>
            ) : (
              <>
                <th className="py-3 px-4">Unidad & Tipo</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Vinculación Inmobiliaria</th>
                <th className="py-3 px-4">Titular / Responsable</th>
                <th className="py-3 px-4">Detalle / Superficie</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#cec8bc] dark:divide-slate-800">
          {unidadesFiltradas.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-[#7d776f] dark:text-slate-500 font-medium">
                No se encontraron unidades con los filtros aplicados.
              </td>
            </tr>
          ) : (
            unidadesFiltradas.map((unidad, index) => {
              const isUnidadDepto = unidad.tipoUnidad === 'Departamento';
              const isUnidadParqueo = unidad.tipoUnidad === 'Parqueo';
              const isUnidadBaulera = unidad.tipoUnidad === 'Baulera';

              if (subTipoCatastro === 'Departamentos') {
                return (
                  <tr key={`depto-${unidad.id}-${index}`} className="hover:bg-[#dfd9ce]/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-[#262422] dark:text-white flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-blue-700 dark:text-indigo-400 shrink-0" />
                        <span>Dpto. {unidad.numero}</span>
                      </div>
                      <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                        {unidad.tipologia || 'Tipo Estándar'} • Piso {unidad.piso || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {unidad.propietario ? (
                        <div>
                          <div className="font-bold text-[#262422] dark:text-white flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            {unidad.propietario.nombre}
                          </div>
                          <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                            CI: {unidad.propietario.ci}
                            {unidad.propietario.estadoCivil && (
                              <span className="font-medium text-slate-800 dark:text-slate-200"> • {unidad.propietario.estadoCivil}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400 italic text-xs">Sin Propietario Asignado</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {unidad.estado === 'Alquilado' && unidad.inquilinoActual ? (
                        <div>
                          <div className="font-bold text-[#262422] dark:text-white flex items-center gap-1">
                            <KeyRound className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            {unidad.inquilinoActual.nombre}
                          </div>
                          <span className="text-[10px] px-2 py-0.2 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 font-bold">
                            Inquilino (Contrato)
                          </span>
                        </div>
                      ) : unidad.estado === 'Ocupado por Propietario' ? (
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">Vive el Propietario</span>
                      ) : (
                        <span className="text-[11px] text-[#7d776f] dark:text-slate-400 italic">Desocupado / Vacío</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#262422] dark:text-white font-mono">
                        {unidad.areaM2 ? `${unidad.areaM2} m²` : '—'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs font-semibold text-[#262422] dark:text-white flex items-center gap-1">
                        <Car className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                        <span>{unidad.parqueo || 'Sin parqueo'}</span>
                      </div>
                      <div className="text-[11px] font-semibold text-[#7d776f] dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Box className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        <span>{unidad.baulera || 'Sin baulera'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${getEstadoBadgeClass(unidad.estado)}`}>
                        {unidad.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectUnidad(unidad)}
                          className="px-2 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="Ver Ficha y Extracto de Expensa"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Extracto
                        </button>
                        <button
                          onClick={() => onAssignUnidad(unidad)}
                          className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Gestionar Asignación de Propietario / Inquilino"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditUnidad(unidad)}
                          className="p-1.5 rounded-lg text-blue-700 hover:text-blue-900 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Editar Departamento, Parqueo y Baulera"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              if (subTipoCatastro === 'Parqueos' || subTipoCatastro === 'Bauleras') {
                const isParqueo = subTipoCatastro === 'Parqueos';
                const label = isParqueo ? 'Parqueo' : 'Baulera';
                const deptoVinculado = unidad.departamento?.numero;
                const titular = unidad.persona ? `${unidad.persona.nombres || ''} ${unidad.persona.apellidos || ''}`.trim() : null;

                return (
                  <tr key={`${label.toLowerCase()}-${unidad.id}`} className="hover:bg-[#dfd9ce]/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-[#262422] dark:text-white flex items-center gap-2">
                        {isParqueo ? <Car className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" /> : <Box className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                        <span className="font-mono text-sm">{label} {unidad.numero}</span>
                      </div>
                      <span className="text-[10px] text-[#7d776f] dark:text-slate-400">ID Unidad: #{unidad.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${getEstadoBadgeClass(unidad.estado)}`}>
                        {unidad.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {deptoVinculado ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 font-bold text-xs text-blue-900 dark:text-blue-300">
                          <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Departamento {deptoVinculado}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Sin departamento vinculado (Libre)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {titular ? (
                        <div className="text-xs font-bold text-[#262422] dark:text-white flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{titular}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Sin titular asignado</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-[#7d776f] dark:text-slate-400">
                      {unidad.fechaAsignacion ? new Date(unidad.fechaAsignacion).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onAssignUnidad(unidad)}
                          className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          title={`Asignar o Transferir ${label}`}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          Asignar
                        </button>
                        <button
                          onClick={() => onEditUnidad(unidad)}
                          className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title={`Editar ${label}`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {(unidad.estado === 'Asignado' || deptoVinculado || titular) && (
                          <button
                            onClick={() => onLiberarUnidad(unidad)}
                            className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={`Liberar y Desvincular ${label}`}
                          >
                            <LockOpen className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={`unidad-${unidad.tipoUnidad}-${unidad.id}`} className="hover:bg-[#dfd9ce]/40 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-extrabold text-[#262422] dark:text-white flex items-center gap-2">
                      {isUnidadDepto && <Building2 className="w-4 h-4 text-blue-700 shrink-0" />}
                      {isUnidadParqueo && <Car className="w-4 h-4 text-amber-600 shrink-0" />}
                      {isUnidadBaulera && <Box className="w-4 h-4 text-emerald-600 shrink-0" />}
                      <span>{unidad.tipoUnidad} {unidad.numero}</span>
                    </div>
                    <span className="text-[10px] text-[#7d776f] dark:text-slate-400">{unidad.tipoUnidad} #{unidad.id}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${getEstadoBadgeClass(unidad.estado)}`}>
                      {unidad.estado}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {isUnidadDepto ? (
                      <div className="text-xs">
                        <div>Parqueo: <strong className="text-[#262422] dark:text-white">{unidad.parqueo || 'Sin parqueo'}</strong></div>
                        <div>Baulera: <strong className="text-[#262422] dark:text-white">{unidad.baulera || 'Sin baulera'}</strong></div>
                      </div>
                    ) : unidad.departamento ? (
                      <span className="font-bold text-xs text-blue-800 dark:text-blue-300">Asignado a Dpto {unidad.departamento.numero}</span>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Libre</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {isUnidadDepto && unidad.propietario ? (
                      <span className="font-bold text-xs text-[#262422] dark:text-white">{unidad.propietario.nombre}</span>
                    ) : unidad.persona ? (
                      <span className="font-bold text-xs text-[#262422] dark:text-white">{unidad.persona.nombres} {unidad.persona.apellidos}</span>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Sin titular</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {isUnidadDepto && unidad.areaM2 ? <span className="font-mono text-xs font-bold">{unidad.areaM2} m²</span> : <span className="text-xs text-slate-500">—</span>}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onEditUnidad(unidad)}
                      className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Editar Unidad"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
