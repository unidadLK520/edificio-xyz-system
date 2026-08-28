import React from 'react';
import { prisma } from '@edificio-xyz/database';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Wallet, CreditCard, ArrowDownRight, ArrowUpRight, PlusCircle } from 'lucide-react';

export const revalidate = 0;

export default async function MovimientosPage() {
  const [cuentas, movimientos, categorias] = await Promise.all([
    prisma.cuentaBancaria.findMany(),
    prisma.movimiento.findMany({
      include: { categoria: true },
      orderBy: { fecha: 'desc' },
      take: 20,
    }),
    prisma.categoriaMovimiento.findMany(),
  ]);

  const saldoTotal = cuentas.reduce((acc, c) => acc + Number(c.saldoActual), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-indigo-400" />
            Caja y Finanzas del Edificio
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestión de cuentas bancarias, ingresos ordinarios y egresos por mantenimiento y servicios.
          </p>
        </div>
      </div>

      {/* Cuentas Bancarias Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cuentas.map((c) => (
          <div
            key={c.idCuenta}
            className="p-6 rounded-3xl bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700/80 backdrop-blur-md relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {c.tipoCuenta || 'Cuenta Bancaria'}
              </span>
              <CreditCard className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="font-bold text-white text-lg mb-1">{c.banco}</div>
            <div className="font-mono text-xs text-slate-400 mb-4">{c.numeroCuenta}</div>
            <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between">
              <span className="text-xs text-slate-400">Saldo Disponible</span>
              <span className="text-xl font-bold text-emerald-400">
                {formatCurrency(c.saldoActual)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Movimientos Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Historial de Movimientos</h2>
          <span className="text-xs text-slate-400">Últimas transacciones registradas</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                <th className="pb-3">Fecha</th>
                <th className="pb-3">Tipo</th>
                <th className="pb-3">Categoría</th>
                <th className="pb-3">Descripción</th>
                <th className="pb-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {movimientos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">
                    No hay transacciones registradas todavía.
                  </td>
                </tr>
              ) : (
                movimientos.map((m) => (
                  <tr key={m.idMovimiento} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 text-xs text-slate-400">
                      {formatDate(m.fecha)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          m.tipo === 'Ingreso'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                        }`}
                      >
                        {m.tipo === 'Ingreso' ? (
                          <ArrowDownRight className="w-3 h-3" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                        {m.tipo}
                      </span>
                    </td>
                    <td className="py-3 font-medium text-slate-300">
                      {m.categoria.nombre}
                    </td>
                    <td className="py-3 text-slate-400 text-xs">
                      {m.descripcion || '-'}
                    </td>
                    <td
                      className={`py-3 text-right font-bold ${
                        m.tipo === 'Ingreso' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {m.tipo === 'Ingreso' ? '+' : '-'} {formatCurrency(m.monto)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
