// backend/tests/expensas_tipo_pagador.test.ts
// Tests para US2.1: Expensas fijas por tipo de departamento, montos-tipo y pagador obligatorio (RN10)

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '@edificio-xyz/database';
import { app } from '../src/index';
import { generarTokenPrueba } from './setup';

describe('Expensas por Tipo de Departamento y Pagador Obligatorio (RN10)', () => {
  let adminToken: string;
  let personaTest: any;
  let tipoA: any;
  let tipoB: any;
  let tipoC: any;
  let deptoA: any;
  let deptoB: any;
  let deptoC: any;
  let deptoSinTipo: any;
  let deptoFifo: any;

  const cleanupDeptoIds: number[] = [];
  const cleanupPersonaIds: number[] = [];
  const cleanupExpensaIds: number[] = [];
  const cleanupPagoIds: number[] = [];
  const ts = Date.now().toString().slice(-6);

  beforeAll(async () => {
    const adminUser = await prisma.usuario.findUnique({ where: { correo: 'admin@edificioxyz.com' } });
    adminToken = await generarTokenPrueba(adminUser!.idUsuario, adminUser!.correo, 'Administrador');

    // 1. Asegurar tipos A, B, C con 300, 350, 400
    tipoA = await prisma.tipoDepartamento.upsert({
      where: { nombre: 'A' },
      update: { montoExpensa: 300.00 },
      create: { nombre: 'A', montoExpensa: 300.00 },
    });
    tipoB = await prisma.tipoDepartamento.upsert({
      where: { nombre: 'B' },
      update: { montoExpensa: 350.00 },
      create: { nombre: 'B', montoExpensa: 350.00 },
    });
    tipoC = await prisma.tipoDepartamento.upsert({
      where: { nombre: 'C' },
      update: { montoExpensa: 400.00 },
      create: { nombre: 'C', montoExpensa: 400.00 },
    });

    // 2. Crear persona de prueba
    personaTest = await prisma.persona.create({
      data: {
        nombres: 'Pagador',
        apellidos: 'Prueba',
        ciNit: `CI-PAG-${ts}`,
        correo: `pagador_${ts}@test.com`,
      },
    });
    cleanupPersonaIds.push(personaTest.idPersona);

    // 3. Crear departamentos para la prueba
    deptoA = await prisma.departamento.create({
      data: {
        numero: `TA-${ts}`,
        piso: 1,
        idTipo: tipoA.idTipo,
        idPropietario: personaTest.idPersona,
        estado: 'Ocupado',
      },
    });
    cleanupDeptoIds.push(deptoA.idDepartamento);

    deptoB = await prisma.departamento.create({
      data: {
        numero: `TB-${ts}`,
        piso: 2,
        idTipo: tipoB.idTipo,
        idPropietario: personaTest.idPersona,
        estado: 'Ocupado',
      },
    });
    cleanupDeptoIds.push(deptoB.idDepartamento);

    deptoC = await prisma.departamento.create({
      data: {
        numero: `TC-${ts}`,
        piso: 3,
        idTipo: tipoC.idTipo,
        idPropietario: personaTest.idPersona,
        estado: 'Ocupado',
      },
    });
    cleanupDeptoIds.push(deptoC.idDepartamento);

    deptoSinTipo = await prisma.departamento.create({
      data: {
        numero: `ST-${ts}`,
        piso: 4,
        idTipo: null, // Sin tipo asignado
        idPropietario: personaTest.idPersona,
        estado: 'Disponible',
      },
    });
    cleanupDeptoIds.push(deptoSinTipo.idDepartamento);

    deptoFifo = await prisma.departamento.create({
      data: {
        numero: `TF-${ts}`,
        piso: 5,
        idTipo: tipoA.idTipo,
        idPropietario: personaTest.idPersona,
        estado: 'Ocupado',
      },
    });
    cleanupDeptoIds.push(deptoFifo.idDepartamento);
  });

  afterAll(async () => {
    // Limpieza de datos creados en orden para respetar FKs
    await prisma.aplicacionAnticipo.deleteMany({
      where: { pago: { idDepartamento: { in: cleanupDeptoIds } } },
    });
    await prisma.pago.deleteMany({
      where: { idDepartamento: { in: cleanupDeptoIds } },
    });
    await prisma.expensa.deleteMany({
      where: { idDepartamento: { in: cleanupDeptoIds } },
    });
    await prisma.departamento.deleteMany({
      where: { idDepartamento: { in: cleanupDeptoIds } },
    });
    await prisma.persona.deleteMany({
      where: { idPersona: { in: cleanupPersonaIds } },
    });
  });

  // ── 1. Generación masiva: A/B/C generan 300/350/400 ─────────────────────────
  it('1. generar-masivo: tipos A, B y C generan montos fijos 300, 350 y 400', async () => {
    const periodo = '2027-01-01';
    const res = await request(app)
      .post('/api/v1/expensas/generar-masivo')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        periodo,
        fechaVencimiento: '2027-01-15',
        montoBase: 999, // Debe ignorarse para el cálculo
      });

    expect(res.status).toBe(201);

    // Consultar las expensas generadas para los deptos de prueba
    const expA = await prisma.expensa.findFirst({
      where: { idDepartamento: deptoA.idDepartamento, periodo: new Date('2027-01-01T00:00:00.000Z') },
    });
    const expB = await prisma.expensa.findFirst({
      where: { idDepartamento: deptoB.idDepartamento, periodo: new Date('2027-01-01T00:00:00.000Z') },
    });
    const expC = await prisma.expensa.findFirst({
      where: { idDepartamento: deptoC.idDepartamento, periodo: new Date('2027-01-01T00:00:00.000Z') },
    });

    expect(expA).not.toBeNull();
    expect(Number(expA!.monto)).toBe(300.00);

    expect(expB).not.toBeNull();
    expect(Number(expB!.monto)).toBe(350.00);

    expect(expC).not.toBeNull();
    expect(Number(expC!.monto)).toBe(400.00);
  });

  // ── 2. Departamento sin tipo va a excepciones[] ──────────────────────────────
  it('2. generar-masivo: departamento sin tipo asignado va a excepciones[] con motivo claro', async () => {
    const periodo = '2027-02-01';
    const res = await request(app)
      .post('/api/v1/expensas/generar-masivo')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        periodo,
        fechaVencimiento: '2027-02-15',
      });

    expect(res.status).toBe(201);
    expect(Array.isArray(res.body.excepciones)).toBe(true);

    const excepcionSinTipo = res.body.excepciones.find(
      (e: any) => e.idDepartamento === deptoSinTipo.idDepartamento
    );

    expect(excepcionSinTipo).toBeDefined();
    expect(excepcionSinTipo.motivo).toContain('no tiene un tipo asignado');

    // Verificar que no se creó expensa para el departamento sin tipo
    const expSinTipo = await prisma.expensa.findFirst({
      where: { idDepartamento: deptoSinTipo.idDepartamento, periodo: new Date('2027-02-01T00:00:00.000Z') },
    });
    expect(expSinTipo).toBeNull();
  });

  // ── 3. Duplicado omitido ───────────────────────────────────────────────────
  it('3. generar-masivo: expensas duplicadas en el mismo período son omitidas e incluidas en excepciones[]', async () => {
    // Ejecutar nuevamente para el período 2027-01-01 (ya generado en test 1)
    const res = await request(app)
      .post('/api/v1/expensas/generar-masivo')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        periodo: '2027-01-01',
        fechaVencimiento: '2027-01-15',
      });

    expect(res.status).toBe(201);

    const excepcionDuplicado = res.body.excepciones.find(
      (e: any) => e.idDepartamento === deptoA.idDepartamento
    );

    expect(excepcionDuplicado).toBeDefined();
    expect(excepcionDuplicado.motivo).toContain('previamente para este período');
  });

  // ── 4. FIFO de anticipos sigue funcionando ──────────────────────────────────
  it('4. generar-masivo: aplicación automática FIFO de anticipos reduce el saldo pendiente', async () => {
    // Registrar anticipo de 100 a favor de deptoFifo
    const anticipo = await prisma.pago.create({
      data: {
        idDepartamento: deptoFifo.idDepartamento,
        idExpensa: null,
        idPersonaPagador: personaTest.idPersona,
        montoPagado: 100.00,
        interesPagado: 0,
        metodoPago: 'Transferencia',
        esAnticipado: true,
        anulado: false,
      },
    });
    cleanupPagoIds.push(anticipo.idPago);

    const periodo = '2027-03-01';
    const res = await request(app)
      .post('/api/v1/expensas/generar-masivo')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        periodo,
        fechaVencimiento: '2027-03-15',
      });

    expect(res.status).toBe(201);

    const expFifo = await prisma.expensa.findFirst({
      where: { idDepartamento: deptoFifo.idDepartamento, periodo: new Date('2027-03-01T00:00:00.000Z') },
      include: { aplicacionesAnticipos: true },
    });

    expect(expFifo).not.toBeNull();
    // Monto original 300, anticipo disponible 100 -> saldo pendiente 200
    expect(Number(expFifo!.monto)).toBe(300.00);
    expect(Number(expFifo!.saldoPendiente)).toBe(200.00);
    expect(expFifo!.estado).toBe('Parcial');
    expect(expFifo!.aplicacionesAnticipos.length).toBeGreaterThanOrEqual(1);
  });

  // ── 5. PUT /montos-tipo audita y no altera expensas viejas ──────────────────
  it('5. PUT /api/v1/expensas/montos-tipo actualiza monto, audita CONFIGURAR_MONTO_EXPENSA y NO altera expensas viejas', async () => {
    // 5.1 Consultar monto anterior de expensa emitida de tipo A
    const expPrevia = await prisma.expensa.findFirst({
      where: { idDepartamento: deptoA.idDepartamento, periodo: new Date('2027-01-01T00:00:00.000Z') },
    });
    expect(Number(expPrevia!.monto)).toBe(300.00);

    // 5.2 Actualizar monto de tipo A de 300 a 330
    const resPut = await request(app)
      .put('/api/v1/expensas/montos-tipo')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        idTipo: tipoA.idTipo,
        monto: 330.00,
      });

    expect(resPut.status).toBe(200);
    expect(resPut.body.actualizados[0].montoExpensa).toBe(330.00);

    // 5.3 Verificar auditoría registrada
    const auditoria = await prisma.auditoria.findFirst({
      where: {
        tablaAfectada: 'tipos_departamento',
        idRegistro: String(tipoA.idTipo),
        accion: 'CONFIGURAR_MONTO_EXPENSA',
      },
      orderBy: { fechaHora: 'desc' },
    });

    expect(auditoria).not.toBeNull();
    expect(auditoria!.accion).toBe('CONFIGURAR_MONTO_EXPENSA');
    expect((auditoria!.datosAnteriores as any).montoExpensa).toBe(300.00);
    expect((auditoria!.datosNuevos as any).montoExpensa).toBe(330.00);

    // 5.4 Verificar que la expensa previa conserva su monto original (300)
    const expDespues = await prisma.expensa.findUnique({
      where: { idExpensa: expPrevia!.idExpensa },
    });
    expect(Number(expDespues!.monto)).toBe(300.00);

    // Restaurar monto a 300
    await prisma.tipoDepartamento.update({
      where: { idTipo: tipoA.idTipo },
      data: { montoExpensa: 300.00 },
    });
  });

  // ── 6. Pago sin pagador da 422 ──────────────────────────────────────────────
  it('6. POST /api/v1/expensas/:id/pagos sin idPersonaPagador o con pagador inexistente retorna 422', async () => {
    const exp = await prisma.expensa.findFirst({
      where: { idDepartamento: deptoB.idDepartamento },
    });
    expect(exp).not.toBeNull();

    // 6.1 Sin idPersonaPagador -> 422
    const resSinPagador = await request(app)
      .post(`/api/v1/expensas/${exp!.idExpensa}/pagos`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        montoPagado: 50.00,
        metodoPago: 'Efectivo',
      });

    expect(resSinPagador.status).toBe(422);
    expect(resSinPagador.body.message).toContain('idPersonaPagador es obligatorio');

    // 6.2 Con idPersonaPagador inexistente -> 422
    const resPagadorInexistente = await request(app)
      .post(`/api/v1/expensas/${exp!.idExpensa}/pagos`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        idPersonaPagador: 99999999,
        montoPagado: 50.00,
        metodoPago: 'Efectivo',
      });

    expect(resPagadorInexistente.status).toBe(422);
    expect(resPagadorInexistente.body.message).toContain('no existe');

    // 6.3 Con idPersonaPagador válido -> 201
    const resValido = await request(app)
      .post(`/api/v1/expensas/${exp!.idExpensa}/pagos`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        idPersonaPagador: personaTest.idPersona,
        montoPagado: 50.00,
        metodoPago: 'Efectivo',
      });

    expect(resValido.status).toBe(201);
    expect(resValido.body.pago.idPersonaPagador).toBe(personaTest.idPersona);
  });
});
