// backend/tests/cron_mora.test.ts
// Tests para CA10: Tarea programada Cron (node-cron) para cálculo de mora y auditoría como sistema

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@edificio-xyz/database';
import {
  tareaCronCalculoMora,
  iniciarCronMora,
  detenerCronMora,
  obtenerEstadoCronMora,
  configurarReglaMora,
} from '../src/modules/expensas';

describe('US2.1 - Punto 3: Scheduler Cron de Mora (CA10) - Configuración y Timezone', () => {
  it('1. Control de configuración: MORA_CRON_ENABLED=false no inicia el cron, MORA_CRON_ENABLED=true sí lo inicia con America/La_Paz', () => {
    // Probar deshabilitado
    process.env.MORA_CRON_ENABLED = 'false';
    const taskDeshabilitada = iniciarCronMora();
    expect(taskDeshabilitada).toBeNull();
    expect(obtenerEstadoCronMora().activo).toBe(false);

    // Probar habilitado
    process.env.MORA_CRON_ENABLED = 'true';
    process.env.MORA_CRON = '*/10 * * * *';
    const taskHabilitada = iniciarCronMora();
    expect(taskHabilitada).not.toBeNull();
    expect(obtenerEstadoCronMora().activo).toBe(true);
    expect(obtenerEstadoCronMora().expresion).toBe('*/10 * * * *');
    expect(obtenerEstadoCronMora().timezone).toBe('America/La_Paz');

    // Detener
    detenerCronMora();
    expect(obtenerEstadoCronMora().activo).toBe(false);
  });
});

describe('US2.1 - Punto 3: Scheduler Cron de Mora (CA10) - Ejecución y Auditoría', () => {
  let testDepartamentoId: number;
  const createdExpensasIds: number[] = [];

  beforeAll(async () => {
    try {
      // Asegurar departamento de prueba
      const depto = await prisma.departamento.create({
        data: {
          numero: `CRON-${Date.now().toString().slice(-4)}`,
          piso: 3,
          estado: 'Ocupado',
        },
      });
      testDepartamentoId = depto.idDepartamento;

      // Asegurar regla activa: 5% tasa, 0 días de gracia
      await configurarReglaMora({ tasaInteres: 5.0, diasGracia: 0 });
    } catch {
      // Si no hay BD local disponible, se omite
    }
  });

  afterAll(async () => {
    detenerCronMora();
    try {
      if (createdExpensasIds.length > 0) {
        await prisma.expensa.deleteMany({ where: { idExpensa: { in: createdExpensasIds } } });
      }
      if (testDepartamentoId) {
        await prisma.departamento.deleteMany({ where: { idDepartamento: testDepartamentoId } });
      }
    } catch {}
  });

  it('1. Tarea programada Cron debe reutilizar el servicio de mora y auditar como sistema (idUsuario: null, ejecutadoPor: sistema)', async () => {
    const fechaVencida = new Date();
    fechaVencida.setDate(fechaVencida.getDate() - 3);

    const expensa = await prisma.expensa.create({
      data: {
        idDepartamento: testDepartamentoId,
        periodo: new Date('2026-03-01T00:00:00.000Z'),
        monto: 600,
        montoMora: 0,
        tasaInteresMora: 5,
        fechaVencimiento: fechaVencida,
        saldoPendiente: 600,
        estado: 'Pendiente',
      },
    });
    createdExpensasIds.push(expensa.idExpensa);

    // Ejecutar tarea cron
    const resultado = await tareaCronCalculoMora();
    expect(resultado).toBeDefined();
    expect(resultado.actualizadasCount).toBeGreaterThanOrEqual(1);

    // Verificar cálculo en la expensa: 5% de 600 = 30.00 de mora, saldo = 630.00
    const expActualizada = await prisma.expensa.findUnique({
      where: { idExpensa: expensa.idExpensa },
    });
    expect(Number(expActualizada!.montoMora)).toBe(30.00);
    expect(Number(expActualizada!.saldoPendiente)).toBe(630.00);
    expect(expActualizada!.estado).toBe('Moroso');

    // Verificar auditoría como sistema (CA10)
    const auditoriaCron = await prisma.auditoria.findFirst({
      where: {
        tablaAfectada: 'expensas',
        accion: 'CALCULO_MORA_EXPENSAS',
        idUsuario: null,
      },
      orderBy: { fechaHora: 'desc' },
    });

    expect(auditoriaCron).toBeDefined();
    expect(auditoriaCron!.idUsuario).toBeNull();
    const datosNuevos = auditoriaCron!.datosNuevos as any;
    expect(datosNuevos.origen).toBe('SISTEMA_CRON');
    expect(datosNuevos.ejecutadoPor).toBe('sistema');
    expect(datosNuevos.expensas).toBeDefined();
    expect(Array.isArray(datosNuevos.expensas)).toBe(true);
    expect(datosNuevos.expensas.length).toBeGreaterThan(0);
    const primerDetalle = datosNuevos.expensas.find((e: any) => e.idExpensa === expensa.idExpensa);
    expect(primerDetalle).toBeDefined();
    expect(primerDetalle.idExpensa).toBe(expensa.idExpensa);
    expect(primerDetalle.moraAnterior).toBe(0);
    expect(primerDetalle.moraNueva).toBe(30);
    expect(primerDetalle.saldoAnterior).toBe(600);
    expect(primerDetalle.saldoNuevo).toBe(630);
  });
});
