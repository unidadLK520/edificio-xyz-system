import React from 'react';
import { AlertCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Tag } from 'lucide-react';

interface EgresosHeaderProps {
  hasFinancialPermission: boolean;
  userRole: string;
  handleOpenCreateModal: (tipoInicial: 'Ingreso' | 'Egreso') => void;
  setCatModalError: (msg: string | null) => void;
  setCatModalSuccess: (msg: string | null) => void;
  setIsCategoriasModalOpen: (open: boolean) => void;
}

export const EgresosHeader: React.FC<EgresosHeaderProps> = ({
  hasFinancialPermission,
  userRole,
  handleOpenCreateModal,
  setCatModalError,
  setCatModalSuccess,
  setIsCategoriasModalOpen,
}) => {
  return (
    <>
      {/* HEADER DEL MÓDULO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-400 text-xs font-semibold mb-2">
            <Tag className="w-3.5 h-3.5" />
            Control de Finanzas del Edificio &bull; HU05
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Ingresos y Egresos
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Registro, clasificación y consulta de ingresos extraordinarios, gastos operativos y comprobantes de respaldo.
          </p>
        </div>

        {/* BOTONES DE ACCIÓN RÁPIDA */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasFinancialPermission && (
            <button
              type="button"
              onClick={() => {
                setCatModalError(null);
                setCatModalSuccess(null);
                setIsCategoriasModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#dfd9ce] dark:bg-slate-800 hover:bg-[#d5cfc2] dark:hover:bg-slate-700 text-[#262422] dark:text-white text-xs sm:text-sm font-bold rounded-xl border border-[#cec8bc] dark:border-slate-700 transition-all cursor-pointer shadow-xs"
              title="Crear y editar categorías de ingresos y egresos (Solo Administrador)"
            >
              <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Categorías</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenCreateModal('Ingreso')}
            disabled={!hasFinancialPermission}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-emerald-800/20 transition-all cursor-pointer"
            title={!hasFinancialPermission ? 'Requiere rol Administrador' : 'Registrar nuevo ingreso extraordinario'}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Ingreso</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenCreateModal('Egreso')}
            disabled={!hasFinancialPermission}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-rose-800/20 transition-all cursor-pointer"
            title={!hasFinancialPermission ? 'Requiere rol Administrador' : 'Registrar nuevo egreso o gasto'}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>+ Egreso</span>
          </button>
        </div>
      </div>

      {/* BANNER INFORMATIVO SI NO TIENE PERMISOS (CA9) */}
      {!hasFinancialPermission && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Modo Solo Consulta:</strong> Su rol actual ({userRole}) no posee permisos para registrar ni modificar movimientos financieros (CA9).
          </span>
        </div>
      )}
    </>
  );
};
