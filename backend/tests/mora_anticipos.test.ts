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

  it('6. Un mismo departamento con dos expensas vencidas (febrero y marzo) recibe mora independiente en cada una (5 % de su propio capital) y /morosos suma ambas en totalDeuda', async () => {
    const depto = await prisma.departamento.create({
      data: {
        numero: `MORA-${Date.now().toString().slice(-4)}`,
        piso: 2,
        estado: 'Ocupado',
      },
    });

    const fechaVencida = new Date();
    fechaVencida.setDate(fechaVencida.getDate() - 15);

    // Expensa Febrero: monto 300, capital 300, tasa 5%
    const expFebrero = await prisma.expensa.create({
      data: {
        idDepartamento: depto.idDepartamento,
        periodo: new Date('2026-02-01T00:00:00.000Z'),
        monto: 300,
        montoMora: 0,
        tasaInteresMora: 5,
        fechaVencimiento: fechaVencida,
        saldoPendiente: 300,
        estado: 'Pendiente',
      },
    });

    // Expensa Marzo: monto 300, capital 300, tasa 5%
    const expMarzo = await prisma.expensa.create({
      data: {
        idDepartamento: depto.idDepartamento,
        periodo: new Date('2026-03-01T00:00:00.000Z'),
        monto: 300,
        montoMora: 0,
        tasaInteresMora: 5,
        fechaVencimiento: fechaVencida,
        saldoPendiente: 300,
        estado: 'Pendiente',
      },
    });

    try {
      const calcRes = await request(app)
        .post('/api/v1/expensas/calcular-mora')
        .set('Authorization', `Bearer ${adminToken}`)
        .send();
      expect(calcRes.status).toBe(200);

      // Cada expensa recibe 5% de su propio capital: 300 * 0.05 = 15.00 de mora, saldo = 315.00
      const febActualizada = await prisma.expensa.findUnique({
        where: { idExpensa: expFebrero.idExpensa },
      });
      const marActualizada = await prisma.expensa.findUnique({
        where: { idExpensa: expMarzo.idExpensa },
      });

      expect(Number(febActualizada!.montoMora)).toBe(15.00);
      expect(Number(febActualizada!.saldoPendiente)).toBe(315.00);
      expect(febActualizada!.estado).toBe('Moroso');

      expect(Number(marActualizada!.montoMora)).toBe(15.00);
      expect(Number(marActualizada!.saldoPendiente)).toBe(315.00);
      expect(marActualizada!.estado).toBe('Moroso');

      // /morosos consolida ambas obligaciones en totalDeuda = 630.00 (315.00 + 315.00)
      const morososRes = await request(app)
        .get('/api/v1/expensas/morosos')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(morososRes.status).toBe(200);
      const morosoDepto = morososRes.body.data.find(
        (m: any) => m.idDepartamento === depto.idDepartamento
      );
      expect(morosoDepto).toBeDefined();
      expect(morosoDepto.expensasMoraCount).toBe(2);
      expect(morosoDepto.totalDeuda).toBe(630.00);
      expect(morosoDepto.detalleExpensas).toHaveLength(2);
    } finally {
      await prisma.expensa.deleteMany({
        where: { idExpensa: { in: [expFebrero.idExpensa, expMarzo.idExpensa] } },
      });
      await prisma.departamento.deleteMany({
        where: { idDepartamento: depto.idDepartamento },
      });
    }
  });
});
