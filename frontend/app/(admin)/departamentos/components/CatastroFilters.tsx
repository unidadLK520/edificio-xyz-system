import React from 'react';
import { Building2, Car, Box, Layers, Search, Filter } from 'lucide-react';

interface CatastroFiltersProps {
  subTipoCatastro: 'Departamentos' | 'Parqueos' | 'Bauleras' | 'Todos';
  setSubTipoCatastro: (val: 'Departamentos' | 'Parqueos' | 'Bauleras' | 'Todos') => void;
  totalDeptos: number;
  totalParqueos: number;
  parqueosLibresCount: number;
  totalBauleras: number;
  baulerasLibresCount: number;
  totalUnidades: number;
  unidadesFiltradasCount: number;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filtroEstado: string;
  setFiltroEstado: (val: string) => void;
  filtroPiso: string;
  setFiltroPiso: (val: string) => void;
}

export const CatastroFilters: React.FC<CatastroFiltersProps> = ({
  subTipoCatastro,
  setSubTipoCatastro,
  totalDeptos,
  totalParqueos,
  parqueosLibresCount,
  totalBauleras,
  baulerasLibresCount,
  totalUnidades,
  unidadesFiltradasCount,
  searchTerm,
  setSearchTerm,
  filtroEstado,
  setFiltroEstado,
  filtroPiso,
  setFiltroPiso,
}) => {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-[#dfd9ce]/60 dark:bg-slate-900/90 rounded-2xl border border-[#cec8bc] dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTipoCatastro('Departamentos')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              subTipoCatastro === 'Departamentos'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-[#ede9e1] dark:bg-slate-800 text-[#5c5750] dark:text-slate-300 hover:bg-[#ded8cc] dark:hover:bg-slate-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Departamentos ({totalDeptos})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTipoCatastro('Parqueos')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              subTipoCatastro === 'Parqueos'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-[#ede9e1] dark:bg-slate-800 text-[#5c5750] dark:text-slate-300 hover:bg-[#ded8cc] dark:hover:bg-slate-700'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Parqueos ({totalParqueos})</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20">
              {parqueosLibresCount} libres
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTipoCatastro('Bauleras')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              subTipoCatastro === 'Bauleras'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-[#ede9e1] dark:bg-slate-800 text-[#5c5750] dark:text-slate-300 hover:bg-[#ded8cc] dark:hover:bg-slate-700'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Bauleras ({totalBauleras})</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20">
              {baulerasLibresCount} libres
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTipoCatastro('Todos')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              subTipoCatastro === 'Todos'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-[#ede9e1] dark:bg-slate-800 text-[#5c5750] dark:text-slate-300 hover:bg-[#ded8cc] dark:hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todas las Unidades ({totalUnidades})</span>
          </button>
        </div>

        <div className="text-[11px] text-[#7d776f] dark:text-slate-400 font-medium px-2">
          Mostrando <strong className="text-[#262422] dark:text-white">{unidadesFiltradasCount}</strong> unidades
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={
              subTipoCatastro === 'Departamentos'
                ? 'Buscar departamento por número, propietario o inquilino...'
                : subTipoCatastro === 'Parqueos'
                  ? 'Buscar parqueo (ej. P-01, Dpto 101, o titular)...'
                  : subTipoCatastro === 'Bauleras'
                    ? 'Buscar baulera (ej. B-01, Dpto 101, o titular)...'
                    : 'Buscar por número, código, propietario o inquilino...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] focus:outline-none focus:ring-2 focus:ring-rose-600 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#7d776f]" />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-bold"
            >
              <option value="Todos">Estado: Todos</option>
              {subTipoCatastro === 'Departamentos' ? (
                <>
                  <option value="Ocupado por Propietario">Ocupado por Dueño</option>
                  <option value="Alquilado">Alquilado a Inquilino</option>
                  <option value="Desocupado">Desocupado / Vacío</option>
                </>
              ) : subTipoCatastro === 'Parqueos' || subTipoCatastro === 'Bauleras' ? (
                <>
                  <option value="Disponible">Disponible (Libre)</option>
                  <option value="Asignado">Asignado</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                </>
              ) : (
                <>
                  <option value="Disponible">Disponible / Desocupado</option>
                  <option value="Asignado">Asignado</option>
                  <option value="Ocupado por Propietario">Ocupado por Dueño</option>
                  <option value="Alquilado">Alquilado</option>
                </>
              )}
            </select>
          </div>

          {(subTipoCatastro === 'Departamentos' || subTipoCatastro === 'Todos') && (
            <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
              <Layers className="w-3.5 h-3.5 text-[#7d776f]" />
              <select
                value={filtroPiso}
                onChange={(e) => setFiltroPiso(e.target.value)}
                className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-bold"
              >
                <option value="Todos">Piso: Todos</option>
                <option value="1">Piso 1</option>
                <option value="2">Piso 2</option>
                <option value="3">Piso 3</option>
                <option value="4">Piso 4</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
