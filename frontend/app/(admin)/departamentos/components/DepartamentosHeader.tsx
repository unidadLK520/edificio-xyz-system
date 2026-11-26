import React from 'react';
import { Building2, Plus, Layers, Sliders, CheckCircle2, AlertCircle } from 'lucide-react';

interface DepartamentosHeaderProps {
  successToast: string | null;
  apiError: string | null;
  onRetry: () => void;
  totalDeptos: number;
  totalParqueos: number;
  totalBauleras: number;
  totalUnidades: number;
  onOpenCreate: () => void;
  activeTab: 'catastro' | 'tipos' | 'parametros' | 'agua';
  setActiveTab: (tab: 'catastro' | 'tipos' | 'parametros' | 'agua') => void;
}

export const DepartamentosHeader: React.FC<DepartamentosHeaderProps> = ({
  successToast,
  apiError,
  onRetry,
  totalDeptos,
  totalParqueos,
  totalBauleras,
  totalUnidades,
  onOpenCreate,
  activeTab,
  setActiveTab,
}) => {
  return (
    <>
      {successToast && (
        <div className="p-4 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl flex items-center gap-3 shadow-md animate-in fade-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{successToast}</span>
        </div>
      )}

      {apiError && (
        <div className="p-4 bg-red-100 dark:bg-red-950/70 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 rounded-2xl flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{apiError}</span>
          </div>
          <button
            onClick={onRetry}
            className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-400 text-xs font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Catastro de Departamentos, Parqueos y Bauleras
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Unidades, Propietarios e Inquilinos
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Catastro integral del Edificio XYZ: {totalDeptos} Departamentos, {totalParqueos} Parqueos y {totalBauleras} Bauleras ({totalUnidades} unidades totales).
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-rose-800/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Registrar Nueva Unidad
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-[#cec8bc] dark:border-slate-800 pb-2 overflow-x-auto scrollbar-thin">
        <button
          type="button"
          onClick={() => setActiveTab('catastro')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'catastro'
              ? 'bg-rose-700 text-white shadow-md shadow-rose-900/20'
              : 'bg-[#ede9e1] dark:bg-slate-900 text-[#66615b] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white border border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Catastro Inmobiliario</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-white/20 dark:bg-white/10">
            {totalUnidades}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tipos')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'tipos'
              ? 'bg-rose-700 text-white shadow-md shadow-rose-900/20'
              : 'bg-[#ede9e1] dark:bg-slate-900 text-[#66615b] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white border border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-500" />
          <span>Tipos de Departamentos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('agua')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'agua'
              ? 'bg-rose-700 text-white shadow-md shadow-rose-900/20'
              : 'bg-[#ede9e1] dark:bg-slate-900 text-[#66615b] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white border border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-500" />
          <span>Consumo de Agua (Bs)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('parametros')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'parametros'
              ? 'bg-rose-700 text-white shadow-md shadow-rose-900/20'
              : 'bg-[#ede9e1] dark:bg-slate-900 text-[#66615b] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white border border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-500" />
          <span>Reglas & Mora</span>
        </button>
      </div>
    </>
  );
};
