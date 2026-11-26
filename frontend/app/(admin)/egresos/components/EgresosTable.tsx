import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Building, FileCheck, Eye, Trash2, Loader2, Edit2 } from 'lucide-react';

interface EgresosTableProps {
  loading: boolean;
  movimientosFiltrados: any[];
  setSelectedMovimiento: (mov: any) => void;
  handleOpenEditModal: (mov: any) => void;
  setMovimientoParaEliminar: (mov: any) => void;
  hasFinancialPermission: boolean;
}

export const EgresosTable: React.FC<EgresosTableProps> = ({
  loading,
  movimientosFiltrados,
  setSelectedMovimiento,
  handleOpenEditModal,
  setMovimientoParaEliminar,
  hasFinancialPermission,
}) => {
  return (
    <div className="rounded-2xl border border-[#cec8bc] dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#e3ded4] dark:bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-[#5c5750] dark:text-slate-400">
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Código / Fecha</th>
              <th className="py-3 px-4">Tercero / Origen / Beneficiario</th>
              <th className="py-3 px-4">Categoría</th>
              <th className="py-3 px-4">Concepto / Descripción</th>
              <th className="py-3 px-4">Monto (Bs.)</th>
              <th className="py-3 px-4">Factura / Recibo</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#cec8bc]/60 dark:divide-slate-800 text-xs">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[#7d776f] dark:text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-700" />
                    <span>Cargando movimientos financieros...</span>
                  </div>
                </td>
              </tr>
            ) : movimientosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[#7d776f] dark:text-slate-500">
                  No se encontraron movimientos financieros con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              movimientosFiltrados.map((mov) => {
                const esIngreso = mov.tipo === 'Ingreso';
                return (
                  <tr
                    key={mov.id}
                    className={`transition-colors ${
                      mov.anulado
                        ? 'bg-rose-50/20 dark:bg-rose-950/10 opacity-75 hover:opacity-100'
                        : 'hover:bg-[#e6e1d6]/5 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Tipo */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          mov.anulado
                            ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : esIngreso
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                            : 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
                        }`}
                      >
                        {esIngreso ? (
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                        {mov.tipo}
                      </span>
                    </td>
                    {/* Código / Fecha */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#262422] dark:text-white font-mono text-xs">
                          {mov.codigo}
                        </span>
                        {mov.anulado && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                            Anulado
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#7d776f] dark:text-slate-400">{mov.fecha}</div>
                    </td>
                    {/* Tercero */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#262422] dark:text-white flex items-center gap-1.5 max-w-[180px] truncate">
                        <Building className="w-3.5 h-3.5 text-[#7d776f] shrink-0" />
                        <span className="truncate">{mov.tercero || 'Sin especificar'}</span>
                      </div>
                      {mov.metodoPago && (
                        <div className="text-[10px] text-[#7d776f] dark:text-slate-400">Método: {mov.metodoPago}</div>
                      )}
                    </td>
                    {/* Categoría */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#dfd9ce] dark:bg-slate-800 text-[#4a4641] dark:text-slate-300 font-semibold text-[11px] inline-block max-w-[150px] truncate">
                        {mov.categoria}
                      </span>
                    </td>
                    {/* Concepto / Descripción */}
                    <td className="py-3 px-4 text-[#5c5750] dark:text-slate-300 max-w-xs truncate" title={mov.descripcion}>
                      {mov.descripcion}
                    </td>
                    {/* Monto */}
                    <td
                      className={`py-3 px-4 font-black text-sm font-mono ${
                        mov.anulado
                          ? 'text-[#7d776f] line-through'
                          : esIngreso
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {esIngreso ? '+' : '-'} Bs. {mov.monto.toFixed(2)}
                    </td>
                    {/* Nro Factura / Comprobante */}
                    <td className="py-3 px-4">
                      {mov.nroFactura ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-white/70 dark:bg-slate-950/70 border border-[#cec8bc] dark:border-slate-800 text-[#4a4641] dark:text-slate-300">
                          <FileCheck className="w-3 h-3 text-blue-600" />
                          <span className="max-w-[100px] truncate">{mov.nroFactura}</span>
                        </span>
                      ) : mov.comprobanteUrl ? (
                        <span className="text-[11px] text-blue-600 font-semibold">Adjunto</span>
                      ) : (
                        <span className="text-[10px] text-[#7d776f]">Ninguno</span>
                      )}
                    </td>
                    {/* Acciones */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedMovimiento(mov)}
                          className="p-1.5 rounded-lg text-[#5c5750] hover:text-[#262422] hover:bg-[#ded8cc] dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Ver Detalle y Comprobante"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {mov.anulado ? (
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold px-1 italic">Anulado</span>
                        ) : mov.idPago ? (
                          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-md whitespace-nowrap">
                            Cobro de expensa: se anula desde Expensas
                          </span>
                        ) : (
                          <> 
                            {hasFinancialPermission ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(mov)}
                                  className="p-1.5 rounded-lg text-blue-700 hover:text-blue-900 hover:bg-blue-100/60 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Editar Movimiento"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMovimientoParaEliminar(mov)}
                                  className="p-1.5 rounded-lg text-rose-700 hover:text-rose-900 hover:bg-rose-100/60 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Anular Movimiento"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <div className="inline-flex items-center">
                                <button type="button" disabled className="p-1.5 rounded-lg text-[#7d776f] opacity-50 cursor-not-allowed" title="Sin permisos para anular">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <span className="text-[10px] text-[#7d776f] italic ml-1">Sin permisos</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
