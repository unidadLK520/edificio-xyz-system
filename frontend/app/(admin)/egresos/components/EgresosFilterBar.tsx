import React from 'react';
import { Search, Filter, Tag } from 'lucide-react';

interface EgresosFilterBarProps {
  tabTipo: 'Todos' | 'Ingreso' | 'Egreso';
  setTabTipo: (t: 'Todos' | 'Ingreso' | 'Egreso') => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  filtroCategoria: string;
  setFiltroCategoria: (c: string) => void;
  categorias: { idCategoria: number; nombre: string; tipo: 'Ingreso' | 'Egreso' }[];
  filtroPeriodo: 'todos' | 'mes_actual' | 'mes_anterior' | 'personalizado';
  setFiltroPeriodo: (p: 'todos' | 'mes_actual' | 'mes_anterior' | 'personalizado') => void;
  fechaDesde: string;
  setFechaDesde: (d: string) => void;
  fechaHasta: string;
  setFechaHasta: (d: string) => void;
}

export const EgresosFilterBar: React.FC<EgresosFilterBarProps> = ({
  tabTipo,
  setTabTipo,
  searchTerm,
  setSearchTerm,
  filtroCategoria,
  setFiltroCategoria,
  categorias,
  filtroPeriodo,
  setFiltroPeriodo,
  fechaDesde,
  setFechaDesde,
  fechaHasta,
  setFechaHasta,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* TABS TIPO */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 self-start">
          {(['Todos', 'Ingreso', 'Egreso'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTabTipo(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tabTipo === t
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-[#5c5750] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white'
              }`}
            >
              {t === 'Todos' ? 'Todos los Flujos' : t === 'Ingreso' ? 'Ingresos' : 'Egresos'}
            </button>
          ))}
        </div>

        {/* BÚSQUEDA */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#7d776f] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por tercero, detalle, factura o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs text-[#1c1917] dark:text-white placeholder-[#7d776f] focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* SELECTOR CATEGORÍA */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#7d776f] shrink-0" />
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs font-semibold text-[#1c1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
          >
            <option value="Todos">Todas las Categorías</option>
            {categorias.map((cat) => (
              <option key={cat.idCategoria} value={cat.idCategoria}>
                [{cat.tipo}] {cat.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* FILTROS POR FECHA */}
      <div className="flex items-center gap-3 pt-2 border-t border-[#cec8bc]/50 dark:border-slate-800 text-xs flex-wrap">
        <span className="font-semibold text-[#7d776f]">Período:</span>
        {(['todos', 'mes_actual', 'mes_anterior'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setFiltroPeriodo(p)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              filtroPeriodo === p
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                : 'text-[#7d776f] hover:text-[#262422] dark:hover:text-white'
            }`}
          >
            {p === 'todos' ? 'Histórico Completo' : p === 'mes_actual' ? 'Mes Actual' : 'Mes Anterior'}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[11px] text-[#7d776f]">Desde:</span>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => {
              setFechaDesde(e.target.value);
              setFiltroPeriodo('personalizado');
            }}
            className="px-2 py-1 rounded-lg bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs"
          />
          <span className="text-[11px] text-[#7d776f]">Hasta:</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => {
              setFechaHasta(e.target.value);
              setFiltroPeriodo('personalizado');
            }}
            className="px-2 py-1 rounded-lg bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs"
          />
        </div>
      </div>
    </div>
  );
};
