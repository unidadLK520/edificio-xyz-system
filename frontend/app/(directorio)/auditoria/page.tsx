// frontend/app/(directorio)/auditoria/page.tsx
// Módulo de Auditoría del Sistema (HU 1.3 - Requisito 10 del RFP)
// Registro de operaciones, modificaciones, historial de usuarios, fecha/hora y detalle de eventos.

'use client';

import React, { useState, useMemo, useEffect } from 'react';

import {
  ShieldAlert,
  Search,
  Filter,
  Clock,
  User,
  Activity,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Calendar,
  Layers,
  Terminal,
  Database,
  X,
  ArrowRight,
  Shield,
  Download,
} from 'lucide-react';

interface LogAuditoria {
  id: string;
  fechaHora: string;
  usuario: string;
  correo: string;
  rol: string;
  modulo: 'Copropietarios' | 'Expensas' | 'Finanzas' | 'Seguridad/Roles' | 'Personal';
  accion: 'CREACION' | 'MODIFICACION' | 'ELIMINACION' | 'LOGIN' | 'LOGOUT';
  severidad: 'INFO' | 'ADVERTENCIA' | 'CRITICO';
  descripcion: string;
  ip: string;
  detallesCambio?: {
    entidad: string;
    idRegistro: string | number;
    camposModificados?: Array<{ campo: string; antes: string; despues: string }>;
  };
}

const LOGS_INICIALES: LogAuditoria[] = [
  {
    id: 'AUD-9021',
    fechaHora: '2026-09-18 21:45:12',
    usuario: 'Carlos Administrador',
    correo: 'admin@edificioxyz.com',
    rol: 'Administrador',
    modulo: 'Copropietarios',
    accion: 'CREACION',
    severidad: 'INFO',
    descripcion: 'Registro de nuevo residente e inquilino en Dpto 301.',
    ip: '192.168.1.45 (Cochabamba, BO)',
    detallesCambio: {
      entidad: 'Copropietario',
      idRegistro: 'RES-105',
      camposModificados: [
        { campo: 'Nombre', antes: '— (Nuevo)', despues: 'Gabriel Romero Soria' },
        { campo: 'Departamento', antes: '—', despues: 'Dpto 301 (Piso 3)' },
        { campo: 'Parqueo', antes: '—', despues: 'P-08' },
        { campo: 'Estado', antes: '—', despues: 'Activo' },
      ],
    },
  },
  {
    id: 'AUD-9020',
    fechaHora: '2026-09-18 20:12:05',
    usuario: 'Mesa Directiva',
    correo: 'directorio@edificioxyz.com',
    rol: 'Directorio',
    modulo: 'Finanzas',
    accion: 'MODIFICACION',
    severidad: 'ADVERTENCIA',
    descripcion: 'Aprobación y conciliación de gasto por mantenimiento de ascensores.',
    ip: '190.181.24.12 (Santa Cruz, BO)',
    detallesCambio: {
      entidad: 'Gasto / Egreso',
      idRegistro: 'EGR-412',
      camposModificados: [
        { campo: 'Estado Conciliación', antes: 'Pendiente', despues: 'Aprobado' },
        { campo: 'Monto Aprobado', antes: 'Bs. 0.00', despues: 'Bs. 3,500.00' },
        { campo: 'Aprobado Por', antes: 'Ninguno', despues: 'Directorio Finanzas' },
      ],
    },
  },
  {
    id: 'AUD-9019',
    fechaHora: '2026-09-18 19:30:44',
    usuario: 'Sistema Automático',
    correo: 'cron@edificioxyz.com',
    rol: 'Sistema',
    modulo: 'Expensas',
    accion: 'CREACION',
    severidad: 'INFO',
    descripcion: 'Generación automática del lote mensual de expensas período vigente.',
    ip: 'Servidor Central AWS sa-east-1',
    detallesCambio: {
      entidad: 'Lote Expensas',
      idRegistro: 'EXP-2026-09',
      camposModificados: [
        { campo: 'Total Unidades Emitidas', antes: '0', despues: '24 Departamentos' },
        { campo: 'Total Facturación', antes: 'Bs. 0.00', despues: 'Bs. 12,480.00' },
      ],
    },
  },
  {
    id: 'AUD-9018',
    fechaHora: '2026-09-18 18:05:19',
    usuario: 'Carlos Administrador',
    correo: 'admin@edificioxyz.com',
    rol: 'Administrador',
    modulo: 'Seguridad/Roles',
    accion: 'LOGIN',
    severidad: 'INFO',
    descripcion: 'Inicio de sesión exitoso mediante credenciales JWT.',
    ip: '192.168.1.45 (Cochabamba, BO)',
  },
  {
    id: 'AUD-9017',
    fechaHora: '2026-09-18 17:42:30',
    usuario: 'Intento Desconocido',
    correo: 'root@edificioxyz.com',
    rol: 'No Autenticado',
    modulo: 'Seguridad/Roles',
    accion: 'LOGIN',
    severidad: 'CRITICO',
    descripcion: 'Intento fallido de autenticación. Contraseña incorrecta rechazada.',
    ip: '185.220.101.5 (IP Bloqueada preventivamente)',
  },
  {
    id: 'AUD-9016',
    fechaHora: '2026-09-18 16:15:22',
    usuario: 'Carlos Administrador',
    correo: 'admin@edificioxyz.com',
    rol: 'Administrador',
    modulo: 'Copropietarios',
    accion: 'ELIMINACION',
    severidad: 'CRITICO',
    descripcion: 'Baja y desvinculación de ocupante en Dpto 202 por culminación de contrato.',
    ip: '192.168.1.45 (Cochabamba, BO)',
    detallesCambio: {
      entidad: 'Copropietario',
      idRegistro: 'RES-094',
      camposModificados: [
        { campo: 'Estado Residencia', antes: 'Activo', despues: 'Inactivo / Desvinculado' },
        { campo: 'Fecha Salida', antes: '—', despues: '2026-09-18' },
        { campo: 'Motivo', antes: '—', despues: 'Puesto en alquiler' },
      ],
    },
  },
];

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<LogAuditoria[]>(LOGS_INICIALES);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroModulo, setFiltroModulo] = useState<string>('Todos');
  const [filtroAccion, setFiltroAccion] = useState<string>('Todos');
  const [filtroSeveridad, setFiltroSeveridad] = useState<string>('Todos');
  const [selectedLog, setSelectedLog] = useState<LogAuditoria | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true);
        const res = await fetch('/api/v1/auditoria');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setLogs(data);
          }
        }
      } catch (err) {
        console.warn('Usando logs iniciales de auditoría:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);


  // Filtrado reactivo de logs
  const logsFiltrados = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        log.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip.toLowerCase().includes(searchTerm.toLowerCase());

      const matchModulo = filtroModulo === 'Todos' || log.modulo === filtroModulo;
      const matchAccion = filtroAccion === 'Todos' || log.accion === filtroAccion;
      const matchSeveridad = filtroSeveridad === 'Todos' || log.severidad === filtroSeveridad;

      return matchSearch && matchModulo && matchAccion && matchSeveridad;
    });
  }, [logs, searchTerm, filtroModulo, filtroAccion, filtroSeveridad]);

  // Contadores
  const totalEventos = logs.length;
  const totalCriticos = logs.filter((l) => l.severidad === 'CRITICO').length;
  const totalModificaciones = logs.filter((l) => l.accion === 'MODIFICACION' || l.accion === 'ELIMINACION').length;
  const totalCreaciones = logs.filter((l) => l.accion === 'CREACION').length;

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Encabezado del Módulo de Auditoría */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cec8bc] dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#262422] dark:text-white tracking-tight">
            Auditoría y Registro de Operaciones
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
            Supervisión integral de todas las modificaciones, accesos y operaciones realizadas en el sistema.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => alert('Generando exportación de logs de auditoría en formato PDF / Excel...')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#dfd9ce] hover:bg-[#d5cebf] dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-[#262422] dark:text-white transition-colors border border-[#cec8bc] dark:border-slate-700 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Exportar Auditoría
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Auditoría */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Total Operaciones</span>
            <Activity className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-[#262422] dark:text-white">{totalEventos}</div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">Eventos auditados en el período</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Modificaciones / Bajas</span>
            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-300">{totalModificaciones}</div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">Cambios de estado o registros</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Creaciones de Datos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-400">{totalCreaciones}</div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">Nuevos registros dados de alta</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#66615b] dark:text-slate-400 mb-1">
            <span>Eventos Críticos / Alertas</span>
            <ShieldAlert className="w-4 h-4 text-rose-700 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-800 dark:text-rose-400">{totalCriticos}</div>
          <span className="text-[11px] text-[#7d776f] dark:text-slate-500">Intentos o bajas sensibles</span>
        </div>
      </div>

      {/* Controles de Búsqueda y Filtros */}
      <div className="p-4 rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
        {/* Barra de Búsqueda */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por ID, usuario, descripción, IP o módulo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-[#ede9e1] dark:focus:bg-slate-950 transition-all"
          />
        </div>

        {/* Filtros Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Módulo */}
          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <Layers className="w-3.5 h-3.5 text-[#7d776f] dark:text-slate-400" />
            <select
              value={filtroModulo}
              onChange={(e) => setFiltroModulo(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
            >
              <option value="Todos">Módulo: Todos</option>
              <option value="Copropietarios">Copropietarios</option>
              <option value="Expensas">Expensas</option>
              <option value="Finanzas">Finanzas</option>
              <option value="Seguridad/Roles">Seguridad/Roles</option>
            </select>
          </div>

          {/* Acción */}
          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <select
              value={filtroAccion}
              onChange={(e) => setFiltroAccion(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
            >
              <option value="Todos">Acción: Todas</option>
              <option value="CREACION">Creación</option>
              <option value="MODIFICACION">Modificación</option>
              <option value="ELIMINACION">Eliminación</option>
              <option value="LOGIN">Autenticación</option>
            </select>
          </div>

          {/* Severidad */}
          <div className="flex items-center gap-1.5 bg-[#dfd9ce] dark:bg-slate-950 px-3 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700 text-xs">
            <select
              value={filtroSeveridad}
              onChange={(e) => setFiltroSeveridad(e.target.value)}
              className="bg-transparent text-[#262422] dark:text-white focus:outline-none cursor-pointer font-medium"
            >
              <option value="Todos">Severidad: Todas</option>
              <option value="INFO">Informativa</option>
              <option value="ADVERTENCIA">Advertencia</option>
              <option value="CRITICO">Crítica</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Registros de Auditoría */}
      <div className="rounded-2xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#cec8bc] dark:border-slate-800 bg-[#e3ded4] dark:bg-slate-950 text-xs font-semibold text-[#5c5750] dark:text-slate-400">
                <th className="py-3.5 px-4">Fecha y Hora</th>
                <th className="py-3.5 px-4">Usuario Responsable</th>
                <th className="py-3.5 px-4">Módulo</th>
                <th className="py-3.5 px-4 text-center">Tipo de Acción</th>
                <th className="py-3.5 px-4">Descripción del Evento</th>
                <th className="py-3.5 px-4">IP / Origen</th>
                <th className="py-3.5 px-4 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cec8bc]/70 dark:divide-slate-800">
              {logsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#7d776f] dark:text-slate-500 text-sm">
                    No se encontraron registros de auditoría con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                logsFiltrados.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-[#e4dfd5] dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Fecha y Hora */}
                    <td className="py-3.5 px-4 text-xs">
                      <div className="flex items-center gap-1.5 text-[#262422] dark:text-white font-mono font-medium">
                        <Clock className="w-3.5 h-3.5 text-[#7d776f]" />
                        <span>{log.fechaHora}</span>
                      </div>
                      <span className="text-[10px] text-[#7d776f] dark:text-slate-500 font-mono">
                        ID: {log.id}
                      </span>
                    </td>

                    {/* Usuario Responsable */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#d6cfc3] dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-blue-900 dark:text-blue-300">
                          {log.usuario.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-[#262422] dark:text-white block">
                            {log.usuario}
                          </span>
                          <span className="text-[11px] text-[#66615b] dark:text-slate-400 block">
                            {log.correo}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Módulo */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {log.modulo}
                      </span>
                    </td>

                    {/* Acción */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          log.accion === 'CREACION'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400'
                            : log.accion === 'MODIFICACION'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950 dark:text-blue-400'
                            : log.accion === 'ELIMINACION'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-400'
                            : 'bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950 dark:text-purple-300'
                        }`}
                      >
                        {log.accion}
                      </span>
                    </td>

                    {/* Descripción */}
                    <td className="py-3.5 px-4 text-xs text-[#383430] dark:text-slate-300 max-w-xs">
                      <p className="line-clamp-2">{log.descripcion}</p>
                    </td>

                    {/* IP */}
                    <td className="py-3.5 px-4 text-xs font-mono text-[#5c5750] dark:text-slate-400">
                      {log.ip}
                    </td>

                    {/* Botón Ver Detalle */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg bg-[#dfd9ce] hover:bg-[#d5cebf] dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-400 transition-colors inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
                        title="Ver detalle del cambio"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Detalle</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Detalle de la Operación y Diff de Cambios */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedLog(null)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-[#7d776f] hover:text-[#262422] dark:hover:text-white hover:bg-[#dfd9ce] dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-800/20">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#262422] dark:text-white">
                  Detalle del Evento de Auditoría
                </h2>
                <p className="text-xs text-[#66615b] dark:text-slate-400 font-mono">
                  Transacción: {selectedLog.id}
                </p>
              </div>
            </div>

            {/* Metadatos del evento */}
            <div className="space-y-3 mb-5 p-4 rounded-2xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs">
              <div className="flex justify-between py-1 border-b border-[#cec8bc]/70 dark:border-slate-800">
                <span className="font-semibold text-[#5c5750] dark:text-slate-400">Fecha y Hora:</span>
                <span className="font-mono text-[#262422] dark:text-white">{selectedLog.fechaHora}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#cec8bc]/70 dark:border-slate-800">
                <span className="font-semibold text-[#5c5750] dark:text-slate-400">Usuario Responsable:</span>
                <span className="font-bold text-[#262422] dark:text-white">{selectedLog.usuario} ({selectedLog.rol})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#cec8bc]/70 dark:border-slate-800">
                <span className="font-semibold text-[#5c5750] dark:text-slate-400">Módulo Afectado:</span>
                <span className="font-bold text-blue-800 dark:text-blue-300">{selectedLog.modulo}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#cec8bc]/70 dark:border-slate-800">
                <span className="font-semibold text-[#5c5750] dark:text-slate-400">Tipo de Acción:</span>
                <span className="font-bold">{selectedLog.accion}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-semibold text-[#5c5750] dark:text-slate-400">Dirección IP:</span>
                <span className="font-mono text-[#262422] dark:text-white">{selectedLog.ip}</span>
              </div>
            </div>

            {/* Comparativa de Modificaciones (Diff Antes vs Después) */}
            {selectedLog.detallesCambio?.camposModificados && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#383430] dark:text-slate-300 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-700" />
                  Registro de Modificaciones ({selectedLog.detallesCambio.entidad})
                </h3>
                <div className="space-y-2">
                  {selectedLog.detallesCambio.camposModificados.map((campo, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-[#e3ded4] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs"
                    >
                      <span className="font-bold text-[#262422] dark:text-white block mb-1">
                        Campo: {campo.campo}
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-300">
                          <span className="block font-semibold text-[10px] text-rose-700 dark:text-rose-400">Antes:</span>
                          {campo.antes}
                        </div>
                        <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-300">
                          <span className="block font-semibold text-[10px] text-emerald-700 dark:text-emerald-400">Después:</span>
                          {campo.despues}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-[#cec8bc] dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 text-xs font-semibold text-[#383430] dark:text-white hover:bg-[#d5cebf] transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
