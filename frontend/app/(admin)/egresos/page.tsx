// frontend/app/(admin)/egresos/page.tsx
// Módulo de Gestión de Egresos, Gastos Operativos y Facturas (HU 5)

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Building,
  Eye,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { EgresoItem, EgresoFormData } from '@/components/egresos/types';
import EgresosKpis from '@/components/egresos/EgresosKpis';
import RegistrarEgresoModal from '@/components/egresos/RegistrarEgresoModal';
import DetalleEgresoModal from '@/components/egresos/DetalleEgresoModal';

const EGRESOS_FALLBACK: EgresoItem[] = [
  {
    id: 1,
    codigo: 'EGR-2026-081',
    fecha: '2026-09-18',
    categoria: 'Mantenimiento',
    proveedor: 'Otis Elevadores Bolivia S.A.',
    descripcion: 'Mantenimiento preventivo bimensual de ascensores torre A y B.',
    nroFactura: 'FAC-90182',
    monto: 3500.0,
    estado: 'Pagado',
    metodoPago: 'Transferencia Bancaria (BNB)',
  },
  {
    id: 2,
    codigo: 'EGR-2026-082',
    fecha: '2026-09-15',
    categoria: 'Servicios Básicos',
    proveedor: 'ELFEC S.A.',
    descripcion: 'Energía eléctrica de áreas comunes, bombas de agua y pasillos.',
    nroFactura: 'FAC-349012',
    monto: 2450.0,
    estado: 'Pagado',
    metodoPago: 'Débito Automático',
  },
  {
    id: 3,
    codigo: 'EGR-2026-083',
    fecha: '2026-09-14',
    categoria: 'Seguridad',
    proveedor: 'Seguritas Integral Ltda.',
    descripcion: 'Servicio de vigilancia física y monitoreo de circuito cerrado.',
    nroFactura: 'FAC-11928',
    monto: 4200.0,
    estado: 'Pagado',
    metodoPago: 'Cheque de Gerencia',
  },
  {
    id: 4,
    codigo: 'EGR-2026-084',
    fecha: '2026-09-20',
    categoria: 'Limpieza',
    proveedor: 'Distribuidora Química del Valle',
    descripcion: 'Insumos de limpieza, desinfectantes industriales y bolsas.',
    nroFactura: 'FAC-4891',
    monto: 850.0,
    estado: 'Pendiente',
    metodoPago: 'Efectivo Caja Chica',
  },
  {
    id: 5,
    codigo: 'EGR-2026-085',
    fecha: '2026-09-21',
    categoria: 'Mantenimiento',
    proveedor: 'Plomería & Bombas Express',
    descripcion: 'Reparación de válvula de presión en tanque subterráneo principal.',
    nroFactura: 'REC-0982',
    monto: 620.0,
    estado: 'En Revisión',
    metodoPago: 'Transferencia Bancaria (BMSC)',
  },
];

export default function EgresosPage() {
  const [egresos, setEgresos] = useState<EgresoItem[]>(EGRESOS_FALLBACK);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEgreso, setSelectedEgreso] = useState<EgresoItem | null>(null);

  // Carga desde API /api/v1/movimientos?tipo=Egreso o /api/v1/egresos
  const fetchEgresos = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/movimientos?tipo=Egreso');
      if (res.ok) {
        const json = await res.json();
        const rawData = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json)
            ? json
            : [];

        if (rawData.length > 0) {
          const mapped: EgresoItem[] = rawData.map((item: any) => {
            let proveedor = item.proveedor || '';
            let descripcionClean = item.descripcion || '';

            if (descripcionClean.includes('|')) {
              const parts = descripcionClean.split('|');
              proveedor = parts[0].trim();
              descripcionClean = parts.slice(1).join('|').trim();
            }
            if (!proveedor) proveedor = 'Proveedor General';

            return {
              id: item.idMovimiento || item.id || Date.now(),
              codigo:
                item.codigo ||
                `EGR-2026-${String(item.idMovimiento || item.id || 1).padStart(3, '0')}`,
              fecha: item.fecha
                ? new Date(item.fecha).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
              categoria:
                (item.categoria?.nombre as EgresoItem['categoria']) ||
                item.categoria ||
                'Mantenimiento',
              proveedor: proveedor,
              descripcion: descripcionClean || 'Sin descripción detallada',
              nroFactura: item.comprobanteUrl || item.nroFactura || 'FAC-0000',
              monto: Number(item.monto || 0),
              estado: item.estado || 'Pagado',
              metodoPago: item.metodoPago || 'Transferencia Bancaria (BNB)',
            };
          });
          setEgresos(mapped);
          return;
        }
      }

      // Fallback secundario directo a /api/v1/egresos
      const resEgresos = await fetch('/api/v1/egresos');
      if (resEgresos.ok) {
        const data = await resEgresos.json();
        if (Array.isArray(data) && data.length > 0) {
          setEgresos(data);
          return;
        }
      }
    } catch (err) {
      console.warn('Usando datos de respaldo para egresos:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEgresos();
  }, [fetchEgresos]);

  // Filtrado reactivo
  const egresosFiltrados = useMemo(() => {
    return egresos.filter((e) => {
      const matchSearch =
        e.proveedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.nroFactura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.codigo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = filtroCategoria === 'Todos' || e.categoria === filtroCategoria;
      const matchEst = filtroEstado === 'Todos' || e.estado === filtroEstado;
      return matchSearch && matchCat && matchEst;
    });
  }, [egresos, searchTerm, filtroCategoria, filtroEstado]);

  // Cálculos financieros
  const totalGastos = useMemo(
    () => egresos.reduce((acc, curr) => acc + curr.monto, 0),
    [egresos]
  );
  const totalPagados = useMemo(
    () =>
      egresos
        .filter((e) => e.estado === 'Pagado')
        .reduce((acc, curr) => acc + curr.monto, 0),
    [egresos]
  );
  const totalPendientes = totalGastos - totalPagados;

  const handleCrearEgreso = async (formData: EgresoFormData) => {
    const nuevo: EgresoItem = {
      id: Date.now(),
      codigo: `EGR-2026-0${egresos.length + 1}`,
      fecha: formData.fecha || new Date().toISOString().split('T')[0],
      categoria: formData.categoria,
      proveedor: formData.proveedor.trim(),
      descripcion: formData.descripcion.trim() || 'Sin descripción detallada',
      nroFactura: formData.nroFactura.trim() || `FAC-${Date.now().toString().slice(-4)}`,
      monto: Number(formData.monto),
      estado: formData.estado || 'Pagado',
      metodoPago: formData.metodoPago || 'Transferencia Bancaria (BNB)',
    };

    setEgresos((prev) => [nuevo, ...prev]);
    setIsCreateModalOpen(false);

    // Intentar persistir en API backend
    try {
      await fetch('/api/v1/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'Egreso',
          monto: nuevo.monto,
          descripcion: `${nuevo.proveedor} | ${nuevo.descripcion}`,
          comprobanteUrl: nuevo.nroFactura,
          fecha: nuevo.fecha,
          idCategoria: 1,
          idCaja: 1,
        }),
      });
    } catch (err) {
      console.warn('Registro local guardado con fallback:', err);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-400 text-xs font-semibold mb-2">
            <Wallet className="w-3.5 h-3.5" />
            HU-05 • Control de Egresos & Gastos Operativos
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
            Egresos, Facturas y Proveedores
          </h1>
          <p className="text-xs sm:text-sm text-[#7d776f] dark:text-slate-400 mt-1">
            Registro y conciliación de desembolsos a proveedores, servicios básicos y compras operativas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEgresos}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-[#cec8bc] dark:border-slate-700 bg-[#ede9e1] dark:bg-slate-800 text-[#5c5750] dark:text-slate-300 hover:bg-[#ded8cc] transition-colors cursor-pointer"
            title="Recargar egresos"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-rose-800/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Registrar Egreso
          </button>
        </div>
      </div>

      {/* KPIS FINANCIEROS */}
      <EgresosKpis
        totalGastos={totalGastos}
        totalPagados={totalPagados}
        totalPendientes={totalPendientes}
        mayorRubro="Seguridad & Mantenimiento"
      />

      {/* BUSCADOR Y FILTROS */}
      <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por proveedor, factura, código o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#ded8cc] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#262422] dark:text-white placeholder-[#7d776f] dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-600 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#ded8cc] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#7d776f]" />
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-semibold"
            >
              <option value="Todos">Rubro: Todos</option>
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="Servicios Básicos">Servicios Básicos</option>
              <option value="Seguridad">Seguridad</option>
              <option value="Limpieza">Limpieza</option>
              <option value="Administrativo">Administrativo</option>
              <option value="Fondo de Reserva">Fondo de Reserva</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#ded8cc] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-semibold"
            >
              <option value="Todos">Estado: Todos</option>
              <option value="Pagado">Pagado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En Revisión">En Revisión</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLA DE EGRESOS */}
      <div className="rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#dfd9ce]/70 dark:bg-slate-950/70 text-[11px] font-bold uppercase tracking-wider text-[#5c5750] dark:text-slate-400">
                <th className="py-3.5 px-4">Código / Fecha</th>
                <th className="py-3.5 px-4">Proveedor & Factura</th>
                <th className="py-3.5 px-4">Rubro / Categoría</th>
                <th className="py-3.5 px-4">Descripción</th>
                <th className="py-3.5 px-4">Monto (Bs.)</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cec8bc]/60 dark:divide-slate-800/80 text-xs">
              {isLoading && egresos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#7d776f] dark:text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-700" />
                    Cargando egresos del sistema...
                  </td>
                </tr>
              ) : egresosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#7d776f] dark:text-slate-500">
                    No se encontraron registros de egresos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                egresosFiltrados.map((egreso) => (
                  <tr
                    key={egreso.id}
                    className="hover:bg-[#ded8cc]/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#262422] dark:text-white font-mono text-xs">
                        {egreso.codigo}
                      </div>
                      <div className="text-[11px] text-[#7d776f] dark:text-slate-400">
                        {egreso.fecha}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#262422] dark:text-white flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400 shrink-0" />
                        <span>{egreso.proveedor}</span>
                      </div>
                      <div className="text-[11px] text-[#7d776f] dark:text-slate-400 font-mono">
                        Fact: {egreso.nroFactura}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#ded8cc] dark:bg-slate-800 text-[#4a4641] dark:text-slate-300 font-semibold text-[11px]">
                        {egreso.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#5c5750] dark:text-slate-400 max-w-xs truncate">
                      {egreso.descripcion}
                    </td>
                    <td className="py-3 px-4 font-black text-[#262422] dark:text-white text-sm">
                      Bs. {egreso.monto.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          egreso.estado === 'Pagado'
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                            : egreso.estado === 'Pendiente'
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                              : 'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30'
                        }`}
                      >
                        {egreso.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedEgreso(egreso)}
                        className="p-1.5 rounded-lg text-[#5c5750] hover:text-[#262422] hover:bg-[#ded8cc] dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Ver Comprobante de Desembolso"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRAR EGRESO */}
      <RegistrarEgresoModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCrearEgreso}
      />

      {/* MODAL DETALLE DE COMPROBANTE */}
      <DetalleEgresoModal
        egreso={selectedEgreso}
        onClose={() => setSelectedEgreso(null)}
      />
    </div>
  );
}
