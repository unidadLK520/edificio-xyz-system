// apps/web/app/(dashboard)/page.tsx
// Vista principal del Dashboard — Métricas y resumen operativo

import React from 'react';
import { prisma } from '@edificio-xyz/database';
import { formatCurrency, formatDate, formatPeriodo } from '@/lib/utils';
import Link from 'next/link';
import {
  Building2,
  DollarSign,
  AlertTriangle,
  Receipt,
  Users,
  Megaphone,
  ArrowUpRight,
  CreditCard,
  CheckCircle2,
  Clock,
  PlusCircle,
  Wallet,
} from 'lucide-react';

export const revalidate = 0; // Dynamic data

export default async function DashboardPage() {
  // Queries
  const [
    totalDepartamentos,
    departamentosOcupados,
    cuentasBancarias,
    expensas,
    comunicadosRecientes,
    ultimosPagos,
  ] = await Promise.all([
    prisma.departamento.count(),
    prisma.departamento.count({ where: { estado: 'Ocupado' } }),
    prisma.cuentaBancaria.findMany(),
    prisma.expensa.findMany({
      include: { departamento: true },
      orderBy: { periodo: 'desc' },
      take: 10,
    }),
    prisma.comunicado.findMany({
      orderBy: { fechaPublicacion: 'desc' },
      take: 3,
    }),
    prisma.pago.findMany({
      include: {
        departamento: true,
        cuentaBancaria: true,
      },
      orderBy: { fechaPago: 'desc' },
      take: 5,
    }),
  ]);

  // Cálculos financieros
  const saldoBancos = cuentasBancarias.reduce(
    (acc, c) => acc + Number(c.saldoActual),
    0
  );

  let totalRecaudadoMes = 0;
  let totalMoroso = 0;
  let totalPendiente = 0;

  for (const exp of expensas) {
    const saldo = Number(exp.saldoPendiente);
    const monto = Number(exp.monto);

    if (exp.estado === 'Pagado') {
      totalRecaudadoMes += monto;
    } else if (exp.estado === 'Moroso') {
      totalMoroso += saldo;
    } else {
      totalPendiente += saldo;
    }
  }

  const porcentajeOcupacion =
    totalDepartamentos > 0
      ? Math.round((departamentosOcupados / totalDepartamentos) * 100)
      : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/20 p-6 sm:p-8 backdrop-blur-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-400/20 mb-3">
              <Building2 className="w-3.5 h-3.5" /> Edificio XYZ · Gestión Activa
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Panel Administrativo y Financiero
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Monitorea en tiempo real las expensas, cobranzas, ocupación y estados de cuenta del edificio.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/expensas"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/25 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              Emitir / Registrar Pago
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Saldo en Bancos */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Saldo en Bancos</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(saldoBancos)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-2 font-medium">
            <CreditCard className="w-3.5 h-3.5" />
            <span>{cuentasBancarias.length} cuentas registradas</span>
          </div>
        </div>

        {/* Expensas Recaudadas */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Expensas Cobradas</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(totalRecaudadoMes)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
            <span>Período vigente al día</span>
          </div>
        </div>

        {/* Morosidad / Pendiente */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Cartera Morosa</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400">
            {formatCurrency(totalMoroso)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-400/90 mt-2 font-medium">
            <span>+ {formatCurrency(totalPendiente)} pendiente</span>
          </div>
        </div>

        {/* Ocupación */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Ocupación Inmuebles</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {porcentajeOcupacion}%
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
            <span>{departamentosOcupados} de {totalDepartamentos} departamentos</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Expensas table + Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expensas Recientes */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-white">Estado de Expensas</h2>
              <p className="text-xs text-slate-400">Últimas emisiones por departamento</p>
            </div>
            <Link
              href="/expensas"
              className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 group"
            >
              Ver todas <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                  <th className="pb-3">Depto</th>
                  <th className="pb-3">Período</th>
                  <th className="pb-3">Monto</th>
                  <th className="pb-3">Vencimiento</th>
                  <th className="pb-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {expensas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500 text-sm">
                      No hay registros de expensas emitidas.
                    </td>
                  </tr>
                ) : (
                  expensas.map((exp) => (
                    <tr key={exp.idExpensa} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-semibold text-white">
                        Dpto {exp.departamento.numero}
                      </td>
                      <td className="py-3 text-slate-300 capitalize text-xs">
                        {formatPeriodo(exp.periodo)}
                      </td>
                      <td className="py-3 font-medium text-slate-200">
                        {formatCurrency(exp.monto)}
                      </td>
                      <td className="py-3 text-xs text-slate-400">
                        {formatDate(exp.fechaVencimiento)}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            exp.estado === 'Pagado'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                              : exp.estado === 'Moroso'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
                              : 'bg-amber-950 text-amber-400 border border-amber-800/50'
                          }`}
                        >
                          {exp.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tablón de Comunicados Recientes */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-pink-400" />
                  Comunicados
                </h2>
                <p className="text-xs text-slate-400">Avisos activos para residentes</p>
              </div>
              <Link
                href="/comunicados"
                className="text-xs font-medium text-blue-400 hover:text-blue-300"
              >
                Gestionar
              </Link>
            </div>

            <div className="space-y-4">
              {comunicadosRecientes.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-800/30 text-center text-xs text-slate-400">
                  No hay comunicados publicados recientemente.
                </div>
              ) : (
                comunicadosRecientes.map((c) => (
                  <div
                    key={c.idComunicado}
                    className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span className="font-semibold text-blue-400">{c.canalEnvio || 'Sistema'}</span>
                      <span>{formatDate(c.fechaPublicacion)}</span>
                    </div>
                    <h3 className="font-semibold text-sm text-white mb-1">
                      {c.titulo}
                    </h3>
                    <p className="text-xs text-slate-300 line-clamp-2">
                      {c.contenido}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <Link
              href="/comunicados"
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white flex items-center justify-center gap-2 transition-colors"
            >
              Publicar Nuevo Aviso
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
