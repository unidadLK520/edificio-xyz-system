import React from 'react';
import { Search } from 'lucide-react';

interface FiltersBarProps {
  filtroEstado: 'Todos' | 'Conciliado' | 'Pendiente' | 'Discrepancia';
  setFiltroEstado: (estado: 'Todos' | 'Conciliado' | 'Pendiente' | 'Discrepancia') => void;
  filtroDesde: string;
  setFiltroDesde: (val: string) => void;
  filtroHasta: string;
  setFiltroHasta: (val: string) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  filtroEstado,
  setFiltroEstado,
  filtroDesde,
  setFiltroDesde,
  filtroHasta,
  setFiltroHasta,
  searchTerm,
  setSearchTerm,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs">
        {(['Todos', 'Conciliado', 'Pendiente', 'Discrepancia'] as const).map((est) => (
          <button
            key={est}
            type="button"
            onClick={() => setFiltroEstado(est)}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              filtroEstado === est
                ? 'bg-blue-700 text-white'
                : 'text-[#5c5750] dark:text-slate-400'
            }`}
          >
            {est}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-[#7d776f]">
          <span>Desde:</span>
          <input
            type="date"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="px-2 py-1 rounded-lg bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs"
          />
          <span>Hasta:</span>
          <input
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="px-2 py-1 rounded-lg bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs"
          />
        </div>

        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-[#7d776f] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por concepto o ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs"
          />
        </div>
      </div>
    </div>
  );
};
