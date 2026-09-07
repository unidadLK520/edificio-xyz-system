// frontend/app/(dashboard)/departamentos/page.tsx
// Gestión y listado de departamentos, parqueos y bauleras

import React from 'react';
import { prisma } from '@edificio-xyz/database';
import { Home, Car, Box, User, Phone, Mail, CheckCircle2 } from 'lucide-react';

export const revalidate = 0;

export default async function DepartamentosPage() {
  const departamentos = await prisma.departamento.findMany({
    include: {
      propietario: true,
      parqueos: true,
      bauleras: true,
      ocupantes: {
        include: { persona: true },
      },
    },
    orderBy: { numero: 'asc' },
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Home className="w-6 h-6 text-emerald-400" />
            Departamentos y Copropietarios
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Directorio de unidades habitacionales, parqueos, bauleras y propietarios.
          </p>
        </div>
      </div>

      {/* Grid of Department Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departamentos.map((d) => (
          <div
            key={d.idDepartamento}
            className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-col justify-between hover:border-slate-700 transition-all group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                    {d.numero}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">
                      Dpto {d.numero}
                    </h3>
                    <span className="text-xs text-slate-400">
                      Piso {d.piso || 1} · {d.areaM2 ? `${d.areaM2} m²` : 'N/A'}
                    </span>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    d.estado === 'Ocupado'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {d.estado}
                </span>
              </div>

              {/* Owner details */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 mb-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                  <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">
                    {d.propietario
                      ? `${d.propietario.nombres} ${d.propietario.apellidos}`
                      : 'Sin Propietario Registrado'}
                  </span>
                </div>
                {d.propietario?.ciNit && (
                  <div className="text-[11px] text-slate-400 pl-5.5">
                    CI / NIT: <span className="text-slate-300">{d.propietario.ciNit}</span>
                  </div>
                )}
                {d.propietario?.telefono && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{d.propietario.telefono}</span>
                  </div>
                )}
                {d.propietario?.correo && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{d.propietario.correo}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Extras: Parqueos & Bauleras */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {d.parqueos.length > 0
                    ? d.parqueos.map((p) => p.numero).join(', ')
                    : 'Sin parqueo'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {d.bauleras.length > 0
                    ? d.bauleras.map((b) => b.numero).join(', ')
                    : 'Sin baulera'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
