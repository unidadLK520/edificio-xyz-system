// frontend/app/(admin)/residentes/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ResidentesModal, { PersonaData } from '@/components/residentes/ResidentesModal';
import FichaResidenteModal from '@/components/residentes/FichaResidenteModal';
import AsignarUnidadModal from '@/components/residentes/AsignarUnidadModal';

export default function ResidentesPage() {
  const [personas, setPersonas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtros y Paginación (CA2)
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoOcupanteFilter, setTipoOcupanteFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Rol de usuario (CA9)
  const [userRole, setUserRole] = useState<string>('Administrador');
  const isReadOnly = userRole === 'Consulta';

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [personaToEdit, setPersonaToEdit] = useState<PersonaData | null>(null);

  const [isFichaOpen, setIsFichaOpen] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);

  const [isAsignarOpen, setIsAsignarOpen] = useState(false);
  const [personaToAssign, setPersonaToAssign] = useState<{ idPersona: number; nombres: string; apellidos: string } | null>(null);

  // Cargar rol del localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('user_role') || 'Administrador';
      setUserRole(storedRole);
    }
  }, []);

  // Función para obtener la lista de personas desde el API (CA2, CA5)
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

  // Handlers para Modales
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

  // Cálculo de estadísticas locales rápidas
  const totalPropietarios = personas.filter(
    (p) => (p.departamentosPropios && p.departamentosPropios.length > 0) || p.ocupaciones?.some((o: any) => o.tipoOcupante === 'Propietario')
  ).length;

  const totalInquilinos = personas.filter(
    (p) => p.ocupaciones?.some((o: any) => o.tipoOcupante === 'Inquilino')
  ).length;

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header y Estadísticas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>👥</span> Administración de Copropietarios e Inquilinos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestión del padrón del edificio, registro de datos personales y asignación de unidades habitacionales (HU02).
          </p>
        </div>

        {/* Botón Nuevo Residente (CA1, CA9) */}
        {!isReadOnly && (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <span>➕</span> Registrar Residente
          </button>
        )}
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl font-bold">
            👥
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Registrados
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{total}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl font-bold">
            🏠
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Propietarios (Página)
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalPropietarios}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl font-bold">
            🔑
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Inquilinos (Página)
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalInquilinos}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda (CA2) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        
        {/* Buscador de texto */}
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            🔍
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por CI, Nombre o Apellido..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white transition-colors"
          />
        </div>

        {/* Filtro por Tipo de Ocupante */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Filtrar Tipo:
          </label>
          <select
            value={tipoOcupanteFilter}
            onChange={(e) => {
              setTipoOcupanteFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-48 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white transition-colors"
          >
            <option value="">Todos los residentes</option>
            <option value="Propietario">Solo Propietarios</option>
            <option value="Inquilino">Solo Inquilinos</option>
          </select>
        </div>
      </div>

      {/* Mensaje de Error global */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Tabla de Personas/Residentes */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 uppercase text-xs font-semibold tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">CI / NIT</th>
                <th className="px-6 py-4">Nombre Completo</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Tipo / Rol</th>
                <th className="px-6 py-4">Unidades Asociadas</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex justify-center items-center gap-2">
                      <svg className="w-5 h-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Cargando padrón de personas...</span>
                    </div>
                  </td>
                </tr>
              ) : personas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron registros de propietarios o inquilinos que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                personas.map((p) => {
                  const tienePropios = p.departamentosPropios && p.departamentosPropios.length > 0;
                  const tieneInquilino = p.ocupaciones?.some((o: any) => o.tipoOcupante === 'Inquilino');

                  return (
                    <tr key={p.idPersona} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                      
                      {/* CI / NIT */}
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {p.ciNit}
                      </td>

                      {/* Nombre Completo */}
                      <td className="px-6 py-4 font-medium whitespace-nowrap">
                        {p.nombres} {p.apellidos}
                      </td>

                      {/* Contacto */}
                      <td className="px-6 py-4 text-xs space-y-0.5">
                        {p.telefono && <div>📞 {p.telefono}</div>}
                        {p.correo && <div className="text-slate-500 dark:text-slate-400">✉️ {p.correo}</div>}
                        {!p.telefono && !p.correo && <span className="text-slate-400 italic">Sin datos</span>}
                      </td>

                      {/* Tipo / Rol (Badges) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1.5">
                          {tienePropios && (
                            <span className="px-2.5 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 rounded-full border border-emerald-300 dark:border-emerald-800/60">
                              Propietario
                            </span>
                          )}
                          {tieneInquilino && (
                            <span className="px-2.5 py-1 text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 rounded-full border border-blue-300 dark:border-blue-800/60">
                              Inquilino
                            </span>
                          )}
                          {!tienePropios && !tieneInquilino && (
                            <span className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-full">
                              Sin Asignación
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Unidades Asociadas (CA8) */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {p.departamentosPropios?.map((dep: any) => (
                            <span
                              key={`prop-${dep.idDepartamento}`}
                              className="px-2 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700"
                              title="Propiedad directa"
                            >
                              🏠 #{dep.numero}
                            </span>
                          ))}
                          {p.ocupaciones?.map((ocu: any) => (
                            <span
                              key={`ocu-${ocu.idOcupacion}`}
                              className="px-2 py-0.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-200 dark:border-indigo-800/50"
                              title={`Ocupante: ${ocu.tipoOcupante}`}
                            >
                              🔑 #{ocu.departamento?.numero || 'N/D'}
                            </span>
                          ))}
                          {(!p.departamentosPropios || p.departamentosPropios.length === 0) &&
                            (!p.ocupaciones || p.ocupaciones.length === 0) && (
                              <span className="text-slate-400 text-xs italic">-</span>
                            )}
                        </div>
                      </td>

                      {/* Botones de Acciones (CA3, CA5, CA6, CA9) */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Ficha (CA5) */}
                          <button
                            onClick={() => handleOpenFicha(p.idPersona)}
                            title="Ver Ficha Completa del Residente"
                            className="p-1.5 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            👁️ <span className="sr-only">Ficha</span>
                          </button>

                          {!isReadOnly && (
                            <>
                              {/* Asignar Unidad (CA6) */}
                              <button
                                onClick={() => handleOpenAsignar(p)}
                                title="Asignar Departamento"
                                className="p-1.5 text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                🏠 <span className="sr-only">Asignar</span>
                              </button>

                              {/* Editar (CA3) */}
                              <button
                                onClick={() => handleOpenEdit(p)}
                                title="Editar Datos Personales"
                                className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                ✏️ <span className="sr-only">Editar</span>
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
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Mostrando página <strong className="text-slate-800 dark:text-slate-200">{page}</strong> de{' '}
            <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> (Total: {total} registros)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors"
            >
              ◀ Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors"
            >
              Siguiente ▶
            </button>
          </div>
        </div>
      </div>

      {/* Modales de Operación */}
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
