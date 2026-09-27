// frontend/components/residentes/FichaResidenteModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { User, AlertTriangle, Home, Key, Building2, History } from 'lucide-react';

interface FichaResidenteModalProps {
  isOpen: boolean;
  onClose: () => void;
  personaId: number | null;
  onOcupacionUpdated?: () => void;
  canEdit?: boolean;
}

export default function FichaResidenteModal({
  isOpen,
  onClose,
  personaId,
  onOcupacionUpdated,
  canEdit = true,
}: FichaResidenteModalProps) {
  const [loading, setLoading] = useState(false);
  const [persona, setPersona] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [finalizingId, setFinalizingId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && personaId) {
      fetchFicha(personaId);
    } else {
      setPersona(null);
      setHistorial([]);
      setErrorMessage(null);
    }
  }, [isOpen, personaId]);

  const fetchFicha = async (id: number) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // 1. Obtener datos detallados de la persona
      const resPersona = await fetch(`/api/v1/personas/${id}`);
      const dataPersona = await resPersona.json();

      if (!resPersona.ok) {
        throw new Error(dataPersona.message || 'Error al obtener datos de la persona');
      }
      setPersona(dataPersona.data);

      // 2. Obtener historial de ocupaciones
      const resHistorial = await fetch(`/api/v1/personas/${id}/historial`);
      if (resHistorial.ok) {
        const dataHistorial = await resHistorial.json();
        setHistorial(dataHistorial.historialOcupaciones || []);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al cargar la ficha del residente');
    } font: {
      setLoading(false);
    }
  };

  const handleFinalizarOcupacion = async (idOcupacion: number) => {
    if (!confirm('¿Está seguro de finalizar esta relación de ocupación? La fecha de fin se registrará con la fecha actual.')) {
      return;
    }

    setFinalizingId(idOcupacion);
    try {
      const res = await fetch(`/api/v1/personas/ocupaciones/${idOcupacion}/finalizar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaFin: new Date().toISOString().slice(0, 10) }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'No se pudo finalizar la ocupación');
        return;
      }

      if (personaId) fetchFicha(personaId);
      if (onOcupacionUpdated) onOcupacionUpdated();
    } catch (err: any) {
      alert(err.message || 'Error de conexión');
    } finally {
      setFinalizingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-850">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500 shrink-0" /> Ficha del Residente
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Información personal, contacto y relación histórica con las unidades del edificio.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3">
              <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm font-medium">Cargando datos del residente...</span>
            </div>
          ) : errorMessage ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          ) : persona ? (
            <>
              {/* Tarjeta de Datos Personales (CA5) */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                      {persona.nombres} {persona.apellidos}
                    </h4>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      CI/NIT:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {persona.ciNit}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {persona.departamentosPropios?.length > 0 && (
                      <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full border border-emerald-300 dark:border-emerald-800/60 flex items-center gap-1">
                        <Home className="w-3.5 h-3.5" /> Propietario ({persona.departamentosPropios.length})
                      </span>
                    )}
                    {persona.ocupaciones?.some(
                      (o: any) => o.tipoOcupante === 'Inquilino' && !o.fechaFin
                    ) && (
                      <span className="px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 rounded-full border border-blue-300 dark:border-blue-800/60 flex items-center gap-1">
                        <Key className="w-3.5 h-3.5" /> Inquilino Activo
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-medium">
                      Teléfono / Celular:
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      {persona.telefono || 'Sin registrar'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block font-medium">
                      Correo Electrónico:
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      {persona.correo || 'Sin registrar'}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 dark:text-slate-400 block font-medium">
                      Dirección / Referencia:
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {persona.direccion || 'No especificada'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Seccion 1: Departamentos Propios (CA8) */}
              <div>
                <h5 className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-500 shrink-0" /> Unidades de Titularidad Directa
                </h5>
                {persona.departamentosPropios?.length === 0 ? (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 rounded-xl text-slate-500 text-xs text-center">
                    No figura como propietario directo de ninguna unidad habitacional.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {persona.departamentosPropios?.map((dep: any) => (
                      <div
                        key={dep.idDepartamento}
                        className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-xs space-y-1"
                      >
                        <div className="font-bold text-emerald-900 dark:text-emerald-300 text-sm flex justify-between">
                          <span>Departamento #{dep.numero}</span>
                          <span className="text-xs font-normal">Piso {dep.piso || '-'}</span>
                        </div>
                        <div className="text-emerald-700 dark:text-emerald-400">
                          Área: {dep.areaM2 ? `${dep.areaM2} m²` : 'N/D'} | Estado: {dep.estado}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Seccion 2: Ocupaciones e Historial (CA6, CA7) */}
              <div>
                <h5 className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-indigo-500 shrink-0" /> Historial de Ocupaciones y Alquileres
                </h5>
                {historial.length === 0 ? (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 rounded-xl text-slate-500 text-xs text-center">
                    No posee historial de asignaciones de ocupación registradas.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {historial.map((ocu: any) => {
                      const isVigente = !ocu.fechaFin;
                      return (
                        <div
                          key={ocu.idOcupacion}
                          className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isVigente
                              ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50'
                              : 'bg-slate-50/80 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60 opacity-80'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white text-sm">
                                Dpto #{ocu.departamento?.numero || 'N/D'}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  ocu.tipoOcupante === 'Propietario'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300'
                                }`}
                              >
                                {ocu.tipoOcupante}
                              </span>
                              {isVigente ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white animate-pulse">
                                  Vigente
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  Finalizado
                                </span>
                              )}
                            </div>
                            <div className="text-slate-600 dark:text-slate-400">
                              Inicio:{' '}
                              <strong className="text-slate-800 dark:text-slate-200">
                                {new Date(ocu.fechaInicio).toLocaleDateString()}
                              </strong>{' '}
                              | Fin:{' '}
                              <strong className="text-slate-800 dark:text-slate-200">
                                {ocu.fechaFin
                                  ? new Date(ocu.fechaFin).toLocaleDateString()
                                  : 'Actualmente vigente'}
                              </strong>
                            </div>
                          </div>

                          {isVigente && canEdit && (
                            <button
                              onClick={() => handleFinalizarOcupacion(ocu.idOcupacion)}
                              disabled={finalizingId === ocu.idOcupacion}
                              className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/50 rounded-lg transition-colors shrink-0"
                            >
                              {finalizingId === ocu.idOcupacion
                                ? 'Finalizando...'
                                : 'Finalizar Ocupación'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  )
}
