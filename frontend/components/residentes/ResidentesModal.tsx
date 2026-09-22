// frontend/components/residentes/ResidentesModal.tsx
'use client';

import React, { useState, useEffect } from 'react';

export interface PersonaData {
  idPersona?: number;
  ciNit: string;
  nombres: string;
  apellidos: string;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
}

interface ResidentesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  personaToEdit?: PersonaData | null;
}

export default function ResidentesModal({
  isOpen,
  onClose,
  onSuccess,
  personaToEdit,
}: ResidentesModalProps) {
  const [ciNit, setCiNit] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [direccion, setDireccion] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditing = Boolean(personaToEdit && personaToEdit.idPersona);

  useEffect(() => {
    if (personaToEdit) {
      setCiNit(personaToEdit.ciNit || '');
      setNombres(personaToEdit.nombres || '');
      setApellidos(personaToEdit.apellidos || '');
      setTelefono(personaToEdit.telefono || '');
      setCorreo(personaToEdit.correo || '');
      setDireccion(personaToEdit.direccion || '');
    } else {
      setCiNit('');
      setNombres('');
      setApellidos('');
      setTelefono('');
      setCorreo('');
      setDireccion('');
    }
    setErrorMessage(null);
  }, [personaToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!ciNit.trim() || !nombres.trim() || !apellidos.trim()) {
      setErrorMessage('Los campos CI/NIT, Nombres y Apellidos son obligatorios.');
      return;
    }

    setLoading(true);

    try {
      const url = isEditing
        ? `/api/v1/personas/${personaToEdit!.idPersona}`
        : '/api/v1/personas';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        ciNit: ciNit.trim(),
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        telefono: telefono.trim() || null,
        correo: correo.trim() || null,
        direccion: direccion.trim() || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 || data.error === 'PERSONA_DUPLICADA_CI') {
          setErrorMessage(
            data.message || `Ya existe una persona registrada con el CI/NIT '${ciNit}'`
          );
        } else if (data.details) {
          const firstErr = Object.values(data.details).flat()[0];
          setErrorMessage(typeof firstErr === 'string' ? firstErr : data.message || 'Error de validación');
        } else {
          setErrorMessage(data.message || 'Ocurrió un error al procesar la solicitud');
        }
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transition-all transform animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-850">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              {isEditing ? 'Editar Datos del Residente' : 'Registrar Nuevo Residente'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEditing
                ? 'Modifique los campos necesarios. Los no editados se conservarán.'
                : 'Complete la información para registrar a un propietario o inquilino.'}
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

        {/* Mensaje de error / Alerta CA4 */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <span className="text-base shrink-0">⚠️</span>
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* CI / NIT (CA4 Check) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                CI / NIT / Documento <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={ciNit}
                onChange={(e) => setCiNit(e.target.value)}
                placeholder="Ej. 1234567-LP"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 dark:text-white transition-colors"
              />
            </div>

            {/* Nombres */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nombres <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                placeholder="Ej. Carlos Alberto"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 dark:text-white transition-colors"
              />
            </div>

            {/* Apellidos */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Apellidos <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Ej. Mendoza Vargas"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 dark:text-white transition-colors"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Teléfono / Celular
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 77889900"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 dark:text-white transition-colors"
              />
            </div>

            {/* Correo electrónico */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="Ej. carlos@email.com"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 dark:text-white transition-colors"
              />
            </div>

            {/* Dirección */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dirección Externa / Referencia
              </label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej. Av. 6 de Agosto #450"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 dark:text-white transition-colors"
              />
            </div>

          </div>

          {/* Botones del Formulario */}
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
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors shadow-md shadow-indigo-600/20 flex items-center gap-2"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {isEditing ? 'Guardar Cambios' : 'Guardar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
