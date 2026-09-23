// frontend/app/(admin)/residentes/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Home,
  Building2,
  Phone,
  Mail,
  Eye,
  Edit3,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  KeyRound,
} from 'lucide-react';
import ResidentesModal, { PersonaData } from '@/components/residentes/ResidentesModal';
import FichaResidenteModal from '@/components/residentes/FichaResidenteModal';
import AsignarUnidadModal from '@/components/residentes/AsignarUnidadModal';

export default function ResidentesPage() {
  const [personas, setPersonas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtros y Paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoOcupanteFilter, setTipoOcupanteFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Rol de usuario
  const [userRole, setUserRole] = useState<string>('Administrador');
  const isReadOnly = userRole === 'Consulta';

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [personaToEdit, setPersonaToEdit] = useState<PersonaData | null>(null);

  const [isFichaOpen, setIsFichaOpen] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);

  const [isAsignarOpen, setIsAsignarOpen] = useState(false);
  const [personaToAssign, setPersonaToAssign] = useState<{ idPersona: number; nombres: string; apellidos: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('user_role') || 'Administrador';
      setUserRole(storedRole);
    }
  }, []);

  const fetchPersonas = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(page));
      queryParams.set('limit', String(limit));
      if (searchTerm.trim()) queryParams.set('buscar', searchTerm.trim());
      if (tipoOcupanteFilter) queryParams.set('tipoOcupante', tipoOcupanteFilter);

      const res = await fetch(`/api/v1/personas?${queryParams.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || 'Error al obtener la lista de personas');
      }

      setPersonas(json.data || []);
      if (json.meta) {
        setTotal(json.meta.total || 0);
        setTotalPages(json.meta.totalPages || 1);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al conectar con la API de personas');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, tipoOcupanteFilter]);

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  const handleOpenCreate = () => {
    if (isReadOnly) return;
    setPersonaToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    if (isReadOnly) return;
    setPersonaToEdit({
      idPersona: p.idPersona,
      ciNit: p.ciNit,
      nombres: p.nombres,
      apellidos: p.apellidos,
      telefono: p.telefono,
      correo: p.correo,
      direccion: p.direccion,
    });
    setIsModalOpen(true);
  };

  const handleOpenFicha = (idPersona: number) => {
    setSelectedPersonaId(idPersona);
    setIsFichaOpen(true);
  };

  const handleOpenAsignar = (p: any) => {
    if (isReadOnly) return;
    setPersonaToAssign({
      idPersona: p.idPersona,
      nombres: p.nombres,
      apellidos: p.apellidos,
    });
    setIsAsignarOpen(true);
  };

  const totalPropietarios = personas.filter(
    (p) => (p.departamentosPropios && p.departamentosPropios.length > 0) || p.ocupaciones?.some((o: any) => o.tipoOcupante === 'Propietario')
  ).length;

  const totalInquilinos = personas.filter(
    (p) => p.ocupaciones?.some((o: any) => o.tipoOcupante === 'Inquilino')
  ).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#ede9e1]/90 dark:bg-slate-900/90 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            Padrón de Copropiedad (HU 1.4 & HU 2)
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#262422] dark:text-white tracking-tight">
            Administración de Residentes y Propietarios
          </h1>
          <p className="text-xs sm:text-sm text-[#7d776f] dark:text-slate-400">
            Control de datos personales, asignación de unidades y registro de ocupantes.
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-900/20 active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Registrar Residente
          </button>
        )}
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[#7d776f] dark:text-slate-400 uppercase tracking-wider block">
              Total Registrados
            </span>
            <span className="text-2xl font-extrabold text-[#262422] dark:text-white">{total || personas.length}</span>
          </div>
        </div>

        <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[#7d776f] dark:text-slate-400 uppercase tracking-wider block">
              Propietarios
            </span>
            <span className="text-2xl font-extrabold text-[#262422] dark:text-white">{totalPropietarios}</span>
          </div>
        </div>

        <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 flex items-center justify-center font-bold">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[#7d776f] dark:text-slate-400 uppercase tracking-wider block">
              Inquilinos
            </span>
            <span className="text-2xl font-extrabold text-[#262422] dark:text-white">{totalInquilinos}</span>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7d776f]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por CI, Nombre o Apellido..."
            className="w-full pl-10 pr-4 py-2 bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 text-[#262422] dark:text-slate-100 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-[#7d776f] dark:text-slate-400 whitespace-nowrap">
            Filtrar Tipo:
          </label>
          <select
            value={tipoOcupanteFilter}
            onChange={(e) => {
              setTipoOcupanteFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-48 px-3 py-2 bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 text-[#262422] dark:text-slate-100 transition-colors"
          >
            <option value="">Todos los residentes</option>
            <option value="Propietario">Solo Propietarios</option>
            <option value="Inquilino">Solo Inquilinos</option>
          </select>
        </div>
      </div>

      {/* Mensaje de Error */}
      {errorMessage && (
        <div className="p-4 bg-rose-100 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 rounded-xl text-rose-800 dark:text-rose-300 text-xs">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Tabla de Personas/Residentes */}
      <div className="bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc] dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#dfd9ce]/70 dark:bg-slate-800/70 text-[#7d776f] dark:text-slate-400 uppercase text-[11px] font-bold tracking-wider border-b border-[#cec8bc] dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">CI / NIT</th>
                <th className="px-5 py-3.5">Nombre Completo</th>
                <th className="px-5 py-3.5">Contacto</th>
                <th className="px-5 py-3.5">Tipo / Rol</th>
                <th className="px-5 py-3.5">Unidades Asociadas</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cec8bc]/50 dark:divide-slate-800/60 text-[#262422] dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#7d776f]">
                    <span>Cargando padrón de personas...</span>
                  </td>
                </tr>
              ) : personas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#7d776f]">
                    No se encontraron registros de propietarios o inquilinos que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                personas.map((p) => {
                  const tienePropios = p.departamentosPropios && p.departamentosPropios.length > 0;
                  const tieneInquilino = p.ocupaciones?.some((o: any) => o.tipoOcupante === 'Inquilino');

                  return (
                    <tr key={p.idPersona} className="hover:bg-[#e4ded4]/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-[#262422] dark:text-white whitespace-nowrap">
                        {p.ciNit}
                      </td>
                      <td className="px-5 py-3.5 font-bold whitespace-nowrap">
                        {p.nombres} {p.apellidos}
                      </td>
                      <td className="px-5 py-3.5 space-y-0.5">
                        {p.telefono && <div className="font-mono">{p.telefono}</div>}
                        {p.correo && <div className="text-[#7d776f] dark:text-slate-400">{p.correo}</div>}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1.5">
                          {tienePropios && (
                            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 rounded-full border border-emerald-300 dark:border-emerald-800/60">
                              Propietario
                            </span>
                          )}
                          {tieneInquilino && (
                            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 rounded-full border border-blue-300 dark:border-blue-800/60">
                              Inquilino
                            </span>
                          )}
                          {!tienePropios && !tieneInquilino && (
                            <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-[#ded8cc] text-[#5c5750] dark:bg-slate-800 dark:text-slate-400 rounded-full">
                              Sin Asignación
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {p.departamentosPropios?.map((dep: any) => (
                            <span
                              key={`prop-${dep.idDepartamento}`}
                              className="px-2 py-0.5 font-semibold bg-[#ded8cc] dark:bg-slate-800 text-[#262422] dark:text-slate-300 rounded-md border border-[#cec8bc] dark:border-slate-700"
                              title="Propiedad directa"
                            >
                              🏠 #{dep.numero}
                            </span>
                          ))}
                          {p.ocupaciones?.map((ocu: any) => (
                            <span
                              key={`ocu-${ocu.idOcupacion}`}
                              className="px-2 py-0.5 font-semibold bg-blue-100/70 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800/50"
                              title={`Ocupante: ${ocu.tipoOcupante}`}
                            >
                              🔑 #{ocu.departamento?.numero || 'N/D'}
                            </span>
                          ))}
                          {(!p.departamentosPropios || p.departamentosPropios.length === 0) &&
                            (!p.ocupaciones || p.ocupaciones.length === 0) && (
                              <span className="text-[#7d776f] italic">-</span>
                            )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenFicha(p.idPersona)}
                            title="Ver Ficha Completa del Residente"
                            className="p-1.5 text-[#5c5750] hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {!isReadOnly && (
                            <>
                              <button
                                onClick={() => handleOpenAsignar(p)}
                                title="Asignar Departamento"
                                className="p-1.5 text-[#5c5750] hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <Home className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleOpenEdit(p)}
                                title="Editar Datos Personales"
                                className="p-1.5 text-[#5c5750] hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-[#ded8cc] dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
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

        {/* Paginación */}
        <div className="px-5 py-3 border-t border-[#cec8bc] dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#7d776f] dark:text-slate-400">
          <div>
            Mostrando página <strong className="text-[#262422] dark:text-slate-200">{page}</strong> de{' '}
            <strong className="text-[#262422] dark:text-slate-200">{totalPages}</strong> (Total: {total} registros)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 border border-[#cec8bc] dark:border-slate-800 rounded-xl disabled:opacity-40 hover:bg-[#ded8cc] dark:hover:bg-slate-800 font-semibold transition-colors cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 border border-[#cec8bc] dark:border-slate-800 rounded-xl disabled:opacity-40 hover:bg-[#ded8cc] dark:hover:bg-slate-800 font-semibold transition-colors cursor-pointer flex items-center gap-1"
            >
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modales */}
      <ResidentesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchPersonas}
        personaToEdit={personaToEdit}
      />

      <FichaResidenteModal
        isOpen={isFichaOpen}
        onClose={() => setIsFichaOpen(false)}
        personaId={selectedPersonaId}
        onOcupacionUpdated={fetchPersonas}
        canEdit={!isReadOnly}
      />

      <AsignarUnidadModal
        isOpen={isAsignarOpen}
        onClose={() => setIsAsignarOpen(false)}
        persona={personaToAssign}
        onSuccess={fetchPersonas}
      />
    </div>
  );
}
