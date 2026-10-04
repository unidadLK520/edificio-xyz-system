// backend/tests/mora_anticipos.test.ts
// Test de regresión: cálculo de mora sobre saldo pendiente considerando anticipos aplicados y pagos parciales

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '@edificio-xyz/database';
import { app } from '../src/index';
import { generarTokenPrueba } from './setup';

describe('US2.1 - Punto 1: Bug mora vs anticipos aplicados y precisión de capital pendiente', () => {
  let adminToken: string;
  let testDepartamentoId: number;
  const createdExpensasIds: number[] = [];

  beforeAll(async () => {
    const adminUser = await prisma.usuario.findUnique({ where: { correo: 'admin@edificioxyz.com' } });
    adminToken = await generarTokenPrueba(adminUser!.idUsuario, adminUser!.correo, 'Administrador');

    // Crear departamento de prueba
    const depto = await prisma.departamento.create({
      data: {
        numero: `TEST-${Date.now().toString().slice(-4)}`,
        piso: 1,
        estado: 'Ocupado',
      },
    });
    testDepartamentoId = depto.idDepartamento;
  });

  afterAll(async () => {
    // Limpieza de datos creados en el test
    if (createdExpensasIds.length > 0) {
      await prisma.aplicacionAnticipo.deleteMany({ where: { idExpensa: { in: createdExpensasIds } } });
      await prisma.pago.deleteMany({ where: { idDepartamento: testDepartamentoId } });
      await prisma.expensa.deleteMany({ where: { idExpensa: { in: createdExpensasIds } } });
    }
    if (testDepartamentoId) {
      await prisma.departamento.deleteMany({ where: { idDepartamento: testDepartamentoId } });
    }
  });

  it('1. Debe calcular mora sobre 550 sin pagos vencida (mora = 5% de 550 = 27.50, saldo = 577.50, estado = Moroso)', async () => {
    const fechaVencida = new Date();
    fechaVencida.setDate(fechaVencida.getDate() - 5);

    const expensa = await prisma.expensa.create({
      data: {
        idDepartamento: testDepartamentoId,
        periodo: new Date('2026-05-01T00:00:00.000Z'),
        monto: 550,
        montoMora: 0,
        tasaInteresMora: 5,
        fechaVencimiento: fechaVencida,
        saldoPendiente: 550,
        estado: 'Pendiente',
      },
    });
    createdExpensasIds.push(expensa.idExpensa);

    const res = await request(app)
      .post('/api/v1/expensas/calcular-mora')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(res.status).toBe(200);

    const expActualizada = await prisma.expensa.findUnique({
      where: { idExpensa: expensa.idExpensa },
    });

    expect(Number(expActualizada!.montoMora)).toBe(27.50);
    expect(Number(expActualizada!.saldoPendiente)).toBe(577.50);
    expect(expActualizada!.estado).toBe('Moroso');
  });

  it('2. Caso regresión: expensa 550 con anticipo 250 -> mora 15 sobre 300, saldo 315', async () => {
    const fechaVencida = new Date();
    fechaVencida.setDate(fechaVencida.getDate() - 5);

    const expensa = await prisma.expensa.create({
      data: {
        idDepartamento: testDepartamentoId,
        periodo: new Date('2026-06-01T00:00:00.000Z'),
        monto: 550,
        montoMora: 0,
        tasaInteresMora: 5,
        fechaVencimiento: fechaVencida,
        saldoPendiente: 550,
        estado: 'Pendiente',
      },
    });
    createdExpensasIds.push(expensa.idExpensa);

    const anticipo = await prisma.pago.create({
      data: {
        idDepartamento: testDepartamentoId,
        idExpensa: null,
        montoPagado: 250,
        interesPagado: 0,
        esAnticipado: true,
        anulado: false,
        fechaPago: new Date(),
        metodoPago: 'Transferencia',
      },
    });

    await prisma.aplicacionAnticipo.create({
      data: {
        idPago: anticipo.idPago,
        idExpensa: expensa.idExpensa,
        monto: 250,
      },
    });

    await prisma.expensa.update({
      where: { idExpensa: expensa.idExpensa },
      data: { saldoPendiente: 300, estado: 'Parcial' },
    });

    const res = await request(app)
      .post('/api/v1/expensas/calcular-mora')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(res.status).toBe(200);

    const expActualizada = await prisma.expensa.findUnique({
      where: { idExpensa: expensa.idExpensa },
    });

    expect(Number(expActualizada!.montoMora)).toBe(15.00);
    expect(Number(expActualizada!.saldoPendiente)).toBe(315.00);
    expect(expActualizada!.estado).toBe('Moroso');
  });

  it('3. Combinado: pago parcial directo (100) + anticipo aplicado (150) sobre expensa 550 -> capital 300, mora 15, saldo 315', async () => {
    const fechaVencida = new Date();
    fechaVencida.setDate(fechaVencida.getDate() - 7);

    const expensa = await prisma.expensa.create({
      data: {
        idDepartamento: testDepartamentoId,
        periodo: new Date('2026-07-01T00:00:00.000Z'),
        monto: 550,
        montoMora: 0,
        tasaInteresMora: 5,
        fechaVencimiento: fechaVencida,
        saldoPendiente: 550,
        estado: 'Pendiente',
      },
    });
    createdExpensasIds.push(expensa.idExpensa);

    // Pago directo de 100
    await prisma.pago.create({
      data: {
        idDepartamento: testDepartamentoId,
        idExpensa: expensa.idExpensa,
        montoPagado: 100,
        interesPagado: 0,
        esAnticipado: false,
        anulado: false,
        fechaPago: new Date(),
        metodoPago: 'Efectivo',
      },
    });

    // Anticipo de 150 aplicado
    const anticipo = await prisma.pago.create({
      data: {
        idDepartamento: testDepartamentoId,
        idExpensa: null,
        montoPagado: 150,
        interesPagado: 0,
        esAnticipado: true,
        anulado: false,
        fechaPago: new Date(),
        metodoPago: 'Transferencia',
      },
    });

    await prisma.aplicacionAnticipo.create({
      data: {
        idPago: anticipo.idPago,
        idExpensa: expensa.idExpensa,
        monto: 150,
      },
    });

    // Capital pendiente restante = 550 - 100 - 150 = 300
    await prisma.expensa.update({
      where: { idExpensa: expensa.idExpensa },
      data: { saldoPendiente: 300, estado: 'Parcial' },
    });

    const res = await request(app)
      .post('/api/v1/expensas/calcular-mora')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(res.status).toBe(200);

    const expActualizada = await prisma.expensa.findUnique({
      where: { idExpensa: expensa.idExpensa },
    });

    expect(Number(expActualizada!.montoMora)).toBe(15.00);
    expect(Number(expActualizada!.saldoPendiente)).toBe(315.00);
  });

  it('4. Idempotencia: ejecutar 3 veces seguidas produce exactamente el mismo resultado financiero', async () => {
    // Tomar la última expensa
    const idUltima = createdExpensasIds[createdExpensasIds.length - 1];

    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/v1/expensas/calcular-mora')
        .set('Authorization', `Bearer ${adminToken}`)
        .send();
      expect(res.status).toBe(200);

      const exp = await prisma.expensa.findUnique({ where: { idExpensa: idUltima } });
      expect(Number(exp!.montoMora)).toBe(15.00);
      expect(Number(exp!.saldoPendiente)).toBe(315.00);
    }
  });

  it('5. Una expensa con estado "Pagado" y saldo 0 no debe ser alterada ni recargada con mora', async () => {
    const fechaVencida = new Date();
    fechaVencida.setDate(fechaVencida.getDate() - 10);

    const expensaPagada = await prisma.expensa.create({
      data: {
        idDepartamento: testDepartamentoId,
        periodo: new Date('2026-04-01T00:00:00.000Z'),
        monto: 550,
        montoMora: 0,
        tasaInteresMora: 5,
        fechaVencimiento: fechaVencida,
        saldoPendiente: 0,
        estado: 'Pagado',
      },
    });
    createdExpensasIds.push(expensaPagada.idExpensa);

    await request(app)
      .post('/api/v1/expensas/calcular-mora')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    const expDespues = await prisma.expensa.findUnique({
      where: { idExpensa: expensaPagada.idExpensa },
    });

    expect(Number(expDespues!.montoMora)).toBe(0);
    expect(Number(expDespues!.saldoPendiente)).toBe(0);
    expect(expDespues!.estado).toBe('Pagado');
  });
});
