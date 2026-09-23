// frontend/components/residentes/AsignarUnidadModal.tsx
'use client';

import React, { useState, useEffect } from 'react';

interface AsignarUnidadModalProps {
  isOpen: boolean;
  onClose: () => void;
  persona: { idPersona: number; nombres: string; apellidos: string } | null;
  onSuccess: () => void;
}

export default function AsignarUnidadModal({
  isOpen,
  onClose,
  persona,
  onSuccess,
}: AsignarUnidadModalProps) {
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [idDepartamento, setIdDepartamento] = useState<string>('');
  const [tipoOcupante, setTipoOcupante] = useState<'Propietario' | 'Inquilino'>('Propietario');
  const [fechaInicio, setFechaInicio] = useState<string>(new Date().toISOString().slice(0, 10));
  const [fechaFin, setFechaFin] = useState<string>('');
  const [esPropietarioDirecto, setEsPropietarioDirecto] = useState<boolean>(true);

  const [loadingDepartamentos, setLoadingDepartamentos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDepartamentos();
      setFechaInicio(new Date().toISOString().slice(0, 10));
      setFechaFin('');
      setErrorMessage(null);
      setTipoOcupante('Propietario');
      setEsPropietarioDirecto(true);
    }
  }, [isOpen]);

  const fetchDepartamentos = async () => {
    setLoadingDepartamentos(true);
    try {
      const res = await fetch('/api/v1/departamentos?limit=100');
      if (res.ok) {
        const json = await res.json();
        setDepartamentos(json.data || []);
        if (json.data && json.data.length > 0) {
          setIdDepartamento(String(json.data[0].idDepartamento));
        }
      }
    } catch (err: any) {
      console.error('Error al cargar lista de departamentos:', err);
    } finally {
      setLoadingDepartamentos(false);
    }
  };

  if (!isOpen || !persona) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!idDepartamento) {
      setErrorMessage('Debe seleccionar un departamento.');
      return;
    }

    if (fechaFin && fechaFin < fechaInicio) {
      setErrorMessage('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        idDepartamento: parseInt(idDepartamento, 10),
        tipoOcupante,
        fechaInicio,
        fechaFin: fechaFin || null,
        esPropietarioDirecto: tipoOcupante === 'Propietario' ? esPropietarioDirecto : false,
      };

      const res = await fetch(`/api/v1/personas/${persona.idPersona}/unidades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || 'Error al realizar la asignación de unidad');
        setSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transition-all transform animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-850">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <span>🏠</span> Asignar Unidad Habitacional
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Asociar a <strong className="text-slate-800 dark:text-slate-200">{persona.nombres} {persona.apellidos}</strong> con un departamento.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Alerta de Error */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <span className="text-base shrink-0">⚠️</span>
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Selección de Departamento */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Seleccione el Departamento <span className="text-rose-500">*</span>
            </label>
            {loadingDepartamentos ? (
              <div className="text-xs text-slate-500 py-2">Cargando departamentos...</div>
            ) : (
              <select
                required
                value={idDepartamento}
                onChange={(e) => setIdDepartamento(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 dark:text-white transition-colors"
              >
                {departamentos.map((dep) => (
                  <option key={dep.idDepartamento} value={dep.idDepartamento}>
                    Dpto #{dep.numero} (Piso {dep.piso || '-'}) - Status: {dep.estado} {dep.propietario ? `[Propietario: ${dep.propietario.nombres} ${dep.propietario.apellidos}]` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tipo de Ocupante (CA6) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tipo de Relación con la Unidad <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border cursor-pointer text-center text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  tipoOcupante === 'Propietario'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="tipoOcupante"
                  value="Propietario"
                  checked={tipoOcupante === 'Propietario'}
                  onChange={() => {
                    setTipoOcupante('Propietario');
                    setEsPropietarioDirecto(true);
                  }}
                  className="sr-only"
                />
                <span>🏠 Propietario</span>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer text-center text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  tipoOcupante === 'Inquilino'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-800 dark:text-blue-300 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="tipoOcupante"
                  value="Inquilino"
                  checked={tipoOcupante === 'Inquilino'}
                  onChange={() => {
                    setTipoOcupante('Inquilino');
                    setEsPropietarioDirecto(false);
                  }}
                  className="sr-only"
                />
                <span>🔑 Inquilino</span>
              </label>
            </div>
          </div>

          {/* Fechas de Ocupación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fecha de Inicio <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 dark:text-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fecha de Fin (Opcional)
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 dark:text-white transition-colors"
              />
            </div>
          </div>

          {/* Opción de asignación directa de titularidad si es propietario */}
          {tipoOcupante === 'Propietario' && (
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex items-center gap-2">
              <input
                type="checkbox"
                id="chkPropietarioDirecto"
                checked={esPropietarioDirecto}
                onChange={(e) => setEsPropietarioDirecto(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <label htmlFor="chkPropietarioDirecto" className="text-xs text-emerald-900 dark:text-emerald-300 font-medium cursor-pointer">
                Establecer como Propietario Titular principal de la unidad
              </label>
            </div>
          )}

          {/* Botones */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors shadow-md shadow-indigo-600/20 flex items-center gap-2"
            >
              {submitting && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              Confirmar Asignación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
