// frontend/app/(dashboard)/expensas/page.tsx
// Gestión y recaudación de expensas del edificio

import React from 'react';
import { prisma } from '@edificio-xyz/database';
import { formatCurrency, formatDate, formatPeriodo } from '@/lib/utils';
import { Receipt, DollarSign, PlusCircle, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

async function registrarPagoAction(formData: FormData) {
  'use server';
  const idExpensaStr = formData.get('idExpensa') as string;
  const montoStr = formData.get('monto') as string;
  const metodoPago = formData.get('metodoPago') as string;
  const session = await getSession();

  if (!idExpensaStr || !montoStr) return;

  const idExpensa = parseInt(idExpensaStr, 10);
  const monto = parseFloat(montoStr);

  const expensa = await prisma.expensa.findUnique({
    where: { idExpensa },
  });

  if (!expensa) return;

  const cuentaBancaria = await prisma.cuentaBancaria.findFirst();

  // Registrar pago
  await prisma.$transaction(async (tx) => {
    await tx.pago.create({
      data: {
        idExpensa,
        idDepartamento: expensa.idDepartamento,
        montoPagado: monto,
        metodoPago: metodoPago || 'Transferencia',
        idUsuarioRegistro: session?.idUsuario,
        idCuenta: cuentaBancaria?.idCuenta,
      },
    });

    const nuevoSaldo = Math.max(0, Number(expensa.saldoPendiente) - monto);
    const nuevoEstado = nuevoSaldo === 0 ? 'Pagado' : 'Parcial';

    await tx.expensa.update({
      where: { idExpensa },
      data: {
        saldoPendiente: nuevoSaldo,
        estado: nuevoEstado,
      },
    });

    if (cuentaBancaria) {
      await tx.cuentaBancaria.update({
        where: { idCuenta: cuentaBancaria.idCuenta },
        data: {
          saldoActual: { increment: monto },
        },
      });
    }
  });

  revalidatePath('/expensas');
  revalidatePath('/');
}

export default async function ExpensasPage() {
  const [expensas, departamentos] = await Promise.all([
    prisma.expensa.findMany({
      include: {
        departamento: {
          include: { propietario: true },
        },
        pagos: true,
      },
      orderBy: { periodo: 'desc' },
    }),
    prisma.departamento.findMany({
      orderBy: { numero: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-amber-400" />
            Gestión de Expensas y Cobranzas
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Control de emisiones mensuales, saldos pendientes y registro de pagos.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                <th className="pb-3">Depto / Propietario</th>
                <th className="pb-3">Período</th>
                <th className="pb-3">Total Expensa</th>
                <th className="pb-3">Saldo Pendiente</th>
                <th className="pb-3">Vencimiento</th>
                <th className="pb-3">Estado</th>
                <th className="pb-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {expensas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-sm">
                    No hay registros de expensas.
                  </td>
                </tr>
              ) : (
                expensas.map((exp) => (
                  <tr key={exp.idExpensa} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4">
                      <div className="font-semibold text-white">
                        Dpto {exp.departamento.numero}
                      </div>
                      <div className="text-xs text-slate-400">
                        {exp.departamento.propietario
                          ? `${exp.departamento.propietario.nombres} ${exp.departamento.propietario.apellidos}`
                          : 'Sin propietario asignado'}
                      </div>
                    </td>
                    <td className="py-4 text-slate-300 capitalize text-xs">
                      {formatPeriodo(exp.periodo)}
                    </td>
                    <td className="py-4 font-semibold text-slate-200">
                      {formatCurrency(exp.monto)}
                    </td>
                    <td className="py-4 font-bold text-rose-400">
                      {formatCurrency(exp.saldoPendiente)}
                    </td>
                    <td className="py-4 text-xs text-slate-400">
                      {formatDate(exp.fechaVencimiento)}
                    </td>
                    <td className="py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          exp.estado === 'Pagado'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : exp.estado === 'Moroso'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                            : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                        }`}
                      >
                        {exp.estado}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      {exp.estado !== 'Pagado' ? (
                        <form action={registrarPagoAction} className="inline-flex items-center gap-2">
                          <input type="hidden" name="idExpensa" value={exp.idExpensa} />
                          <input
                            type="hidden"
                            name="monto"
                            value={exp.saldoPendiente.toString()}
                          />
                          <input type="hidden" name="metodoPago" value="Transferencia Bancaria" />
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                          >
                            Cobrar Total
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-emerald-400 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Al día
                        </span>
                      )}
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
