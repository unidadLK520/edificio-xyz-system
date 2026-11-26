import React from 'react';
import { Landmark, Scale, Download, RefreshCw } from 'lucide-react';
import type { CuentaBancariaItem } from '@/lib/services/finanzas.service';

interface HeaderProps {
  cuentasBancarias: CuentaBancariaItem[];
  cuentaSeleccionadaId: number | null;
  setCuentaSeleccionadaId: (id: number | null) => void;
  handleExportCSVConciliacion: () => void;
  loading: boolean;
  fetchConciliacionData: (isManual?: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  cuentasBancarias,
  cuentaSeleccionadaId,
  setCuentaSeleccionadaId,
  handleExportCSVConciliacion,
  loading,
  fetchConciliacionData,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-400 text-xs font-semibold mb-2">
          <Scale className="w-3.5 h-3.5" />
          Auditoría y Conciliación Bancaria US2.4
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
          Conciliación Bancaria
        </h1>
        <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
          Cotejo sistemático entre el extracto bancario oficial y los movimientos registrados en el sistema.
        </p>
      </div>

      {/* Selector de cuenta */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#dfd9ce] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800">
          <Landmark className="w-4 h-4 text-blue-600 ml-2 shrink-0" />
          <select
            value={cuentaSeleccionadaId || ''}
            onChange={(e) => setCuentaSeleccionadaId(Number(e.target.value) || null)}
            className="bg-transparent border-0 text-xs font-bold text-[#262422] dark:text-white pr-2 py-1 focus:ring-0 cursor-pointer"
          >
            {cuentasBancarias.length === 0 ? (
              <option value="">Sin cuentas registradas</option>
            ) : (
              cuentasBancarias.map((c) => (
                <option key={c.idCuenta} value={c.idCuenta} className="dark:bg-slate-900">
                  {c.banco} ({c.numeroCuenta})
                </option>
              ))
            )}
          </select>
        </div>

        <button
          type="button"
          onClick={handleExportCSVConciliacion}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer border border-[#cec8bc] dark:border-slate-700"
          title="Exportar reporte de conciliación a CSV"
        >
          <Download className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
          <span>Descargar CSV</span>
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => fetchConciliacionData(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer border border-[#cec8bc] dark:border-slate-700 disabled:opacity-60"
          title="Sincronizar extracto bancario y libro interno con el backend"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Sincronizando...' : 'Sincronizar'}</span>
        </button>
      </div>
    </div>
  );
};
