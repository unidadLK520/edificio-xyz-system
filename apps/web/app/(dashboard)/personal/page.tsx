import React from 'react';
import { prisma } from '@edificio-xyz/database';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Users2, Shield, Calendar, CreditCard, CheckCircle2 } from 'lucide-react';

export const revalidate = 0;

export default async function PersonalPage() {
  const empleados = await prisma.empleado.findMany({
    include: {
      pagos: {
        orderBy: { fechaPago: 'desc' },
      },
    },
    orderBy: { nombres: 'asc' },
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Users2 className="w-6 h-6 text-cyan-400" />
            Personal y Empleados del Edificio
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Nómina de conserjes, seguridad, mantenimiento y registro de remuneraciones.
          </p>
        </div>
      </div>

      {/* Grid of Staff Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {empleados.map((emp) => (
          <div
            key={emp.idEmpleado}
            className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-col justify-between hover:border-slate-700 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 font-bold text-sm">
                  {emp.nombres.slice(0, 1)}
                  {emp.apellidos.slice(0, 1)}
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    emp.activo
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {emp.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <h3 className="text-base font-bold text-white mb-0.5">
                {emp.nombres} {emp.apellidos}
              </h3>
              <p className="text-xs text-cyan-300 font-medium mb-4">
                {emp.cargo || 'Personal de Edificio'}
              </p>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Documento (CI):</span>
                  <span className="font-mono text-slate-200">{emp.ci}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Fecha de Ingreso:</span>
                  <span className="text-slate-200">{formatDate(emp.fechaIngreso)}</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800">
                  <span>Salario Base:</span>
                  <span className="font-bold text-emerald-400">
                    {formatCurrency(emp.salarioBase)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 text-slate-400">
                <Calendar className="w-3.5 h-3.5" /> Planilla Mensual
              </span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Al día
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
