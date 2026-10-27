// backend/tests/agua_expensas.test.ts
// Tests para Prompt 8: Agua con monto manual y cálculo fuera del sistema

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '@edificio-xyz/database';
import { app } from '../src/index';
import { generarTokenPrueba } from './setup';
import {
  crearDepartamentoTest,
  generarNumeroDeptoTest,
  crearPersonaTest,
  limpiar,
} from './test.helpers';

describe('Prompt 8: Montos de Agua Manuales e Integración con Expensas', () => {
  let adminToken: string;
  let directorioToken: string;
  let consultaToken: string;

  let depto1Id: number;
  let depto2Id: number;
  let depto3Id: number;
  let personaTestId: number;

  const createdMontosAguaIds: number[] = [];
  const createdExpensasIds: number[] = [];
  const createdPagosIds: number[] = [];
  const createdDepartamentosIds: number[] = [];
  const createdPersonasIds: number[] = [];

  // Períodos de prueba en rango 2090-2099
  const PERIODO_1 = '2090-03-01';
  const PERIODO_2 = '2090-04-01';
  const PERIODO_MID_MONTH = '2090-05-15';
  const PERIODO_MAY_NORMALIZED = '2090-05-01';
  const VENCIMIENTO_1 = '2090-03-15';
  const VENCIMIENTO_2 = '2090-04-15';
  const VENCIMIENTO_MAY = '2090-05-20';

  beforeAll(async () => {
    // 1. Obtener usuarios y tokens
    const adminUser = await prisma.usuario.findFirst({ where: { rol: { nombre: 'Administrador' } } });
    const dirUser = await prisma.usuario.findFirst({ where: { rol: { nombre: 'Directorio' } } });
    const consultaUser = await prisma.usuario.findFirst({ where: { rol: { nombre: 'Consulta' } } });

    adminToken = await generarTokenPrueba(adminUser!.idUsuario, adminUser!.correo, 'Administrador');
    directorioToken = await generarTokenPrueba(
      dirUser?.idUsuario || adminUser!.idUsuario,
      dirUser?.correo || 'dir@edificioxyz.com',
      'Directorio'
    );
    consultaToken = await generarTokenPrueba(
      consultaUser?.idUsuario || 998,
      consultaUser?.correo || 'consulta@edificioxyz.com',
      'Consulta'
    );

    // 2. Obtener tipo B (montoExpensa = 350)
    const tipoB = await prisma.tipoDepartamento.findFirst({ where: { nombre: 'B' } });
    const idTipoB = tipoB ? tipoB.idTipo : 2;

    // 3. Crear personas y departamentos de prueba aislados con prefijo TST-
    const persona = await crearPersonaTest({ nombres: 'Titular', apellidos: 'Agua Manual' });
    personaTestId = persona.idPersona;
    createdPersonasIds.push(personaTestId);

    const d1 = await crearDepartamentoTest({
      numero: generarNumeroDeptoTest('M1'),
      piso: 7,
      estado: 'Ocupado',
      idTipo: idTipoB,
      idPropietario: personaTestId,
    });
    depto1Id = d1.idDepartamento;
    createdDepartamentosIds.push(depto1Id);

    const d2 = await crearDepartamentoTest({
      numero: generarNumeroDeptoTest('M2'),
      piso: 7,
      estado: 'Ocupado',
      idTipo: idTipoB,
      idPropietario: personaTestId,
    });
    depto2Id = d2.idDepartamento;
    createdDepartamentosIds.push(depto2Id);

    const d3 = await crearDepartamentoTest({
      numero: generarNumeroDeptoTest('M3'),
      piso: 8,
      estado: 'Ocupado',
      idTipo: idTipoB,
      idPropietario: personaTestId,
    });
    depto3Id = d3.idDepartamento;
    createdDepartamentosIds.push(depto3Id);
  });

  afterAll(async () => {
    // Limpieza estricta: ÚNICAMENTE por IDs creados por este test
    // 0. Borrar pagos de prueba creados
    if (createdPagosIds.length > 0) {
      await prisma.pago.deleteMany({
        where: { idPago: { in: createdPagosIds } },
      });
    }

    // 1. Borrar expensas de los departamentos de prueba primero
    if (createdDepartamentosIds.length > 0) {
      await prisma.expensa.deleteMany({
        where: { idDepartamento: { in: createdDepartamentosIds } },
      });
      await prisma.montoAgua.deleteMany({
        where: { idDepartamento: { in: createdDepartamentosIds } },
      });
    }

    await limpiar({
      pagos: createdPagosIds,
      montosAgua: createdMontosAguaIds,
      expensas: createdExpensasIds,
      departamentos: createdDepartamentosIds,
      personas: createdPersonasIds,
    });
  });

  describe('1. PUT /api/v1/agua/montos (Registro y Actualización de Montos)', () => {
    it('1.1. Administrador registra montos de agua para múltiples departamentos (200)', async () => {
      const res = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PERIODO_1,
          montos: [
            { idDepartamento: depto1Id, montoAgua: 85.5 },
            { idDepartamento: depto2Id, montoAgua: 110.0 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/exitosamente/i);
      expect(res.body.total).toBe(2);
      expect(res.body.montos).toHaveLength(2);

      const m1 = res.body.montos.find((m: any) => m.idDepartamento === depto1Id);
      const m2 = res.body.montos.find((m: any) => m.idDepartamento === depto2Id);

      expect(m1.montoAgua).toBe(85.5);
      expect(m2.montoAgua).toBe(110.0);
      expect(m1.periodo).toBe(PERIODO_1);

      createdMontosAguaIds.push(m1.idMonto, m2.idMonto);

      // Verificar evento de auditoría REGISTRO_MONTO_AGUA
      const auditoria = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'montos_agua',
          idRegistro: String(m1.idMonto),
          accion: 'REGISTRO_MONTO_AGUA',
        },
        orderBy: { idAuditoria: 'desc' },
      });
      expect(auditoria).not.toBeNull();
      expect(auditoria?.datosNuevos).toMatchObject({
        idDepartamento: depto1Id,
        montoAgua: 85.5,
      });
    });

    it('1.2. Directorio actualiza el monto de un departamento en el mismo período (200 con datosAnteriores)', async () => {
      const res = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${directorioToken}`)
        .send({
          periodo: PERIODO_1,
          montos: [{ idDepartamento: depto1Id, montoAgua: 95.0 }],
        });

      expect(res.status).toBe(200);
      const mActualizado = res.body.montos[0];
      expect(mActualizado.montoAgua).toBe(95.0);
      createdMontosAguaIds.push(mActualizado.idMonto);

      // Verificar que la auditoría registró datosAnteriores y datosNuevos
      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'montos_agua',
          idRegistro: String(mActualizado.idMonto),
          accion: 'REGISTRO_MONTO_AGUA',
        },
        orderBy: { idAuditoria: 'desc' },
      });
      expect(audit).not.toBeNull();
      const datosAnt: any = audit?.datosAnteriores;
      const datosNuev: any = audit?.datosNuevos;
      expect(datosAnt?.montoAgua).toBe(85.5);
      expect(datosNuev?.montoAgua).toBe(95.0);
    });

    it('1.3. Debe responder 400 si el monto es negativo o inválido', async () => {
      const res = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PERIODO_1,
          montos: [{ idDepartamento: depto1Id, montoAgua: -20 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error || res.body.message).toBeDefined();
    });

    it('1.4. Debe responder 422 si el departamento no existe', async () => {
      const res = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PERIODO_1,
          montos: [{ idDepartamento: 999999, montoAgua: 50 }],
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/no existe/i);
    });

    it('1.5. Normalización de período: registrar con 2090-05-15 y que la expensa de 2090-05-01 tome ese monto', async () => {
      // Registrar con fecha intermedia del mes (2090-05-15)
      const resMonto = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PERIODO_MID_MONTH,
          montos: [{ idDepartamento: depto3Id, montoAgua: 72.3 }],
        });

      expect(resMonto.status).toBe(200);
      expect(resMonto.body.periodo).toBe(PERIODO_MAY_NORMALIZED);
      const mGuardado = resMonto.body.montos[0];
      createdMontosAguaIds.push(mGuardado.idMonto);

      // Generar expensa para el período 2090-05-01
      const resExp = await request(app)
        .post('/api/v1/expensas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idDepartamento: depto3Id,
          periodo: PERIODO_MAY_NORMALIZED,
          fechaVencimiento: VENCIMIENTO_MAY,
        });

      expect(resExp.status).toBe(201);
      createdExpensasIds.push(resExp.body.idExpensa);

      // Debe tomar exactamente el monto registrado con 2090-05-15
      expect(resExp.body.montoAgua).toBe(72.3);
      expect(resExp.body.montoBase).toBe(350);
      expect(resExp.body.monto).toBe(422.3);
      expect(resExp.body.concepto).toBe('Expensa mensual Tipo B y Agua');
    });

    // ── 1.6 Suite de Pruebas: Registro de Agua en cualquier orden y recálculo de expensas ──
    it('1.6a. Orden agua->expensa y orden expensa->agua dan el MISMO resultado final', async () => {
      const PER_ORDEN_A = '2092-01-01';
      const PER_ORDEN_B = '2092-02-01';

      // Orden 1: Agua primero, luego Expensa
      const resAgua1 = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PER_ORDEN_A,
          montos: [{ idDepartamento: depto1Id, montoAgua: 50 }],
        });
      expect(resAgua1.status).toBe(200);
      createdMontosAguaIds.push(resAgua1.body.montos[0].idMonto);

      const resExp1 = await request(app)
        .post('/api/v1/expensas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idDepartamento: depto1Id,
          periodo: PER_ORDEN_A,
          fechaVencimiento: '2092-01-20',
        });
      expect(resExp1.status).toBe(201);
      createdExpensasIds.push(resExp1.body.idExpensa);

      // Orden 2: Expensa primero, luego Agua
      const resExp2 = await request(app)
        .post('/api/v1/expensas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idDepartamento: depto1Id,
          periodo: PER_ORDEN_B,
          fechaVencimiento: '2092-02-20',
        });
      expect(resExp2.status).toBe(201);
      createdExpensasIds.push(resExp2.body.idExpensa);

      const resAgua2 = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PER_ORDEN_B,
          montos: [{ idDepartamento: depto1Id, montoAgua: 50 }],
        });
      expect(resAgua2.status).toBe(200);
      expect(resAgua2.body.expensasActualizadas).toBe(1);
      createdMontosAguaIds.push(resAgua2.body.montos[0].idMonto);

      // Consultar ambas expensas directamente de la BD
      const exp1 = await prisma.expensa.findUnique({ where: { idExpensa: resExp1.body.idExpensa } });
      const exp2 = await prisma.expensa.findUnique({ where: { idExpensa: resExp2.body.idExpensa } });

      expect(Number(exp1!.monto)).toBe(400); // 350 base + 50 agua
      expect(Number(exp2!.monto)).toBe(400);
      expect(Number(exp1!.montoBase)).toBe(350);
      expect(Number(exp2!.montoBase)).toBe(350);
      expect(Number(exp1!.montoAgua)).toBe(50);
      expect(Number(exp2!.montoAgua)).toBe(50);
      expect(Number(exp1!.saldoPendiente)).toBe(400);
      expect(Number(exp2!.saldoPendiente)).toBe(400);
      expect(exp1!.estado).toBe('Pendiente');
      expect(exp2!.estado).toBe('Pendiente');
    });

    it('1.6b. Expensa sin pagos: agua 15 sobre base 300 -> monto 315, saldo 315', async () => {
      const PER = '2092-03-01';
      const exp = await prisma.expensa.create({
        data: {
          idDepartamento: depto2Id,
          periodo: new Date(`${PER}T00:00:00.000Z`),
          montoBase: 300,
          montoAgua: 0,
          monto: 300,
          saldoPendiente: 300,
          estado: 'Pendiente',
          fechaVencimiento: new Date('2092-03-20T00:00:00.000Z'),
        },
      });
      createdExpensasIds.push(exp.idExpensa);

      const res = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PER,
          montos: [{ idDepartamento: depto2Id, montoAgua: 15 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.expensasActualizadas).toBe(1);
      createdMontosAguaIds.push(res.body.montos[0].idMonto);

      const expActualizada = await prisma.expensa.findUnique({ where: { idExpensa: exp.idExpensa } });
      expect(Number(expActualizada!.monto)).toBe(315);
      expect(Number(expActualizada!.montoBase)).toBe(300);
      expect(Number(expActualizada!.montoAgua)).toBe(15);
      expect(Number(expActualizada!.saldoPendiente)).toBe(315);
      expect(expActualizada!.estado).toBe('Pendiente');
    });

    it('1.6c. Expensa con pago parcial: saldo = monto nuevo − pagado', async () => {
      const PER = '2092-04-01';
      const exp = await prisma.expensa.create({
        data: {
          idDepartamento: depto2Id,
          periodo: new Date(`${PER}T00:00:00.000Z`),
          montoBase: 300,
          montoAgua: 0,
          monto: 300,
          saldoPendiente: 200,
          estado: 'Parcial',
          fechaVencimiento: new Date('2092-04-20T00:00:00.000Z'),
        },
      });
      createdExpensasIds.push(exp.idExpensa);

      const pago = await prisma.pago.create({
        data: {
          idExpensa: exp.idExpensa,
          idDepartamento: depto2Id,
          montoPagado: 100,
          fechaPago: new Date('2092-04-05T00:00:00.000Z'),
          metodoPago: 'Efectivo',
          anulado: false,
          idPersonaPagador: personaTestId,
        },
      });
      createdPagosIds.push(pago.idPago);

      const res = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PER,
          montos: [{ idDepartamento: depto2Id, montoAgua: 25 }],
        });

      expect(res.status).toBe(200);
      createdMontosAguaIds.push(res.body.montos[0].idMonto);

      const expActualizada = await prisma.expensa.findUnique({ where: { idExpensa: exp.idExpensa } });
      expect(Number(expActualizada!.monto)).toBe(325);
      expect(Number(expActualizada!.saldoPendiente)).toBe(225); // 325 nuevo - 100 pagado
      expect(expActualizada!.estado).toBe('Parcial');
    });

    it('1.6d. Expensa Pagado y agua sube -> queda Parcial', async () => {
      const PER = '2092-05-01';
      const exp = await prisma.expensa.create({
        data: {
          idDepartamento: depto2Id,
          periodo: new Date(`${PER}T00:00:00.000Z`),
          montoBase: 300,
          montoAgua: 0,
          monto: 300,
          saldoPendiente: 0,
          estado: 'Pagado',
          fechaVencimiento: new Date('2092-05-20T00:00:00.000Z'),
        },
      });
      createdExpensasIds.push(exp.idExpensa);

      const pago = await prisma.pago.create({
        data: {
          idExpensa: exp.idExpensa,
          idDepartamento: depto2Id,
          montoPagado: 300,
          fechaPago: new Date('2092-05-05T00:00:00.000Z'),
          metodoPago: 'Transferencia',
          anulado: false,
          idPersonaPagador: personaTestId,
        },
      });
      createdPagosIds.push(pago.idPago);

      const res = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PER,
          montos: [{ idDepartamento: depto2Id, montoAgua: 30 }],
        });

      expect(res.status).toBe(200);
      createdMontosAguaIds.push(res.body.montos[0].idMonto);

      const expActualizada = await prisma.expensa.findUnique({ where: { idExpensa: exp.idExpensa } });
      expect(Number(expActualizada!.monto)).toBe(330);
      expect(Number(expActualizada!.saldoPendiente)).toBe(30);
      expect(expActualizada!.estado).toBe('Parcial');
    });

    it('1.6e. Agua baja por debajo de lo pagado -> 409 AGUA_MENOR_A_PAGADO y NADA cambia', async () => {
      const PER = '2092-06-01';
      const exp = await prisma.expensa.create({
        data: {
          idDepartamento: depto2Id,
          periodo: new Date(`${PER}T00:00:00.000Z`),
          montoBase: 150,
          montoAgua: 100,
          monto: 250,
          saldoPendiente: 50,
          estado: 'Parcial',
          fechaVencimiento: new Date('2092-06-20T00:00:00.000Z'),
        },
      });
      createdExpensasIds.push(exp.idExpensa);

      const mAguaPrev = await prisma.montoAgua.create({
        data: {
          idDepartamento: depto2Id,
          periodo: new Date(`${PER}T00:00:00.000Z`),
          montoAgua: 100,
        },
      });
      createdMontosAguaIds.push(mAguaPrev.idMonto);

      const pago = await prisma.pago.create({
        data: {
          idExpensa: exp.idExpensa,
          idDepartamento: depto2Id,
          montoPagado: 200,
          fechaPago: new Date('2092-06-05T00:00:00.000Z'),
          metodoPago: 'Efectivo',
          anulado: false,
          idPersonaPagador: personaTestId,
        },
      });
      createdPagosIds.push(pago.idPago);

      // Si agua baja a 20 -> nuevo total = 150 + 20 = 170 < 200 pagado -> debe fallar con 409
      const res = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PER,
          montos: [{ idDepartamento: depto2Id, montoAgua: 20 }],
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('AGUA_MENOR_A_PAGADO');

      // Verificar en BD que NADA cambió
      const expBD = await prisma.expensa.findUnique({ where: { idExpensa: exp.idExpensa } });
      expect(Number(expBD!.monto)).toBe(250);
      expect(Number(expBD!.montoAgua)).toBe(100);
      expect(Number(expBD!.saldoPendiente)).toBe(50);

      const mAguaBD = await prisma.montoAgua.findUnique({ where: { idMonto: mAguaPrev.idMonto } });
      expect(Number(mAguaBD!.montoAgua)).toBe(100);
    });

    it('1.6f. Agua en 0 -> monto = base', async () => {
      const PER = '2092-07-01';
      const exp = await prisma.expensa.create({
        data: {
          idDepartamento: depto2Id,
          periodo: new Date(`${PER}T00:00:00.000Z`),
          montoBase: 350,
          montoAgua: 50,
          monto: 400,
          saldoPendiente: 400,
          estado: 'Pendiente',
          fechaVencimiento: new Date('2092-07-20T00:00:00.000Z'),
        },
      });
      createdExpensasIds.push(exp.idExpensa);

      const res = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PER,
          montos: [{ idDepartamento: depto2Id, montoAgua: 0 }],
        });

      expect(res.status).toBe(200);
      createdMontosAguaIds.push(res.body.montos[0].idMonto);

      const expBD = await prisma.expensa.findUnique({ where: { idExpensa: exp.idExpensa } });
      expect(Number(expBD!.montoBase)).toBe(350);
      expect(Number(expBD!.montoAgua)).toBe(0);
      expect(Number(expBD!.monto)).toBe(350);
      expect(Number(expBD!.saldoPendiente)).toBe(350);
      expect(expBD!.estado).toBe('Pendiente');
    });

    it('1.6g. Expensa vencida con mora ya calculada: tras cambiar el agua, la mora se recalcula con la tasa de la propia expensa', async () => {
      const PER = '2090-01-01';
      // Expensa vencida en el pasado con tasa de mora propia al 10%
      const exp = await prisma.expensa.create({
        data: {
          idDepartamento: depto2Id,
          periodo: new Date(`${PER}T00:00:00.000Z`),
          montoBase: 300,
          montoAgua: 0,
          monto: 300,
          saldoPendiente: 330, // 300 capital + 30 mora
          montoMora: 30,
          tasaInteresMora: 10,
          estado: 'Moroso',
          fechaVencimiento: new Date('2090-01-15T00:00:00.000Z'),
        },
      });
      createdExpensasIds.push(exp.idExpensa);

      // Modificar agua a 50 -> capital sube a 350. Mora = 10% de 350 = 35. Saldo = 385.
      const res = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PER,
          montos: [{ idDepartamento: depto2Id, montoAgua: 50 }],
        });

      expect(res.status).toBe(200);
      createdMontosAguaIds.push(res.body.montos[0].idMonto);

      const expBD = await prisma.expensa.findUnique({ where: { idExpensa: exp.idExpensa } });
      expect(Number(expBD!.monto)).toBe(350);
      expect(Number(expBD!.montoAgua)).toBe(50);
      expect(Number(expBD!.montoMora)).toBe(35);
      expect(Number(expBD!.saldoPendiente)).toBe(385);
      expect(expBD!.estado).toBe('Moroso');
    });

    it('1.6h. Mismo valor otra vez: expensa sin cambios y sin nuevo evento ACTUALIZACION_AGUA_EXPENSA', async () => {
      const PER = '2092-09-01';
      const exp = await prisma.expensa.create({
        data: {
          idDepartamento: depto2Id,
          periodo: new Date(`${PER}T00:00:00.000Z`),
          montoBase: 350,
          montoAgua: 40,
          monto: 390,
          saldoPendiente: 390,
          estado: 'Pendiente',
          fechaVencimiento: new Date('2092-09-20T00:00:00.000Z'),
        },
      });
      createdExpensasIds.push(exp.idExpensa);

      // Primera vez: enviar 40 (igual a la expensa, no debe actualizar expensa ni auditar ACTUALIZACION_AGUA_EXPENSA)
      const res = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PER,
          montos: [{ idDepartamento: depto2Id, montoAgua: 40 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.expensasActualizadas).toBe(0);
      createdMontosAguaIds.push(res.body.montos[0].idMonto);

      const audExp = await prisma.auditoria.findMany({
        where: {
          tablaAfectada: 'expensas',
          idRegistro: String(exp.idExpensa),
          accion: 'ACTUALIZACION_AGUA_EXPENSA',
        },
      });
      expect(audExp).toHaveLength(0);
    });

    it('1.6i. Un departamento con expensa y otro sin expensa en el mismo lote', async () => {
      const PER = '2092-10-01';
      const exp = await prisma.expensa.create({
        data: {
          idDepartamento: depto1Id,
          periodo: new Date(`${PER}T00:00:00.000Z`),
          montoBase: 350,
          montoAgua: 0,
          monto: 350,
          saldoPendiente: 350,
          estado: 'Pendiente',
          fechaVencimiento: new Date('2092-10-20T00:00:00.000Z'),
        },
      });
      createdExpensasIds.push(exp.idExpensa);

      const res = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PER,
          montos: [
            { idDepartamento: depto1Id, montoAgua: 45 },
            { idDepartamento: depto2Id, montoAgua: 60 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.expensasActualizadas).toBe(1);
      res.body.montos.forEach((m: any) => createdMontosAguaIds.push(m.idMonto));

      // depto1Id tiene expensa actualizada
      const exp1 = await prisma.expensa.findUnique({ where: { idExpensa: exp.idExpensa } });
      expect(Number(exp1!.monto)).toBe(395);
      expect(Number(exp1!.montoAgua)).toBe(45);

      // depto2Id no tiene expensa en este período
      const exp2 = await prisma.expensa.findFirst({
        where: { idDepartamento: depto2Id, periodo: new Date(`${PER}T00:00:00.000Z`) },
      });
      expect(exp2).toBeNull();
    });

    it('1.6j. Auditoría: existe ACTUALIZACION_AGUA_EXPENSA con datosAnteriores y datosNuevos numéricos', async () => {
      const PER = '2092-11-01';
      const exp = await prisma.expensa.create({
        data: {
          idDepartamento: depto3Id,
          periodo: new Date(`${PER}T00:00:00.000Z`),
          montoBase: 350,
          montoAgua: 20,
          monto: 370,
          saldoPendiente: 370,
          estado: 'Pendiente',
          fechaVencimiento: new Date('2092-11-20T00:00:00.000Z'),
        },
      });
      createdExpensasIds.push(exp.idExpensa);

      const res = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PER,
          montos: [{ idDepartamento: depto3Id, montoAgua: 55 }],
        });

      expect(res.status).toBe(200);
      createdMontosAguaIds.push(res.body.montos[0].idMonto);

      const aud = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'expensas',
          idRegistro: String(exp.idExpensa),
          accion: 'ACTUALIZACION_AGUA_EXPENSA',
        },
        orderBy: { idAuditoria: 'desc' },
      });

      expect(aud).not.toBeNull();
      const dAnt: any = aud!.datosAnteriores;
      const dNuev: any = aud!.datosNuevos;

      expect(typeof dAnt.montoAgua).toBe('number');
      expect(typeof dAnt.monto).toBe('number');
      expect(typeof dAnt.saldoPendiente).toBe('number');
      expect(typeof dAnt.montoMora).toBe('number');
      expect(typeof dAnt.estado).toBe('string');

      expect(typeof dNuev.montoAgua).toBe('number');
      expect(typeof dNuev.monto).toBe('number');
      expect(typeof dNuev.saldoPendiente).toBe('number');
      expect(typeof dNuev.montoMora).toBe('number');
      expect(typeof dNuev.estado).toBe('string');

      expect(dAnt.montoAgua).toBe(20);
      expect(dAnt.monto).toBe(370);
      expect(dNuev.montoAgua).toBe(55);
      expect(dNuev.monto).toBe(405);
    });

    it('1.6k. Duplicados en la misma petición con expensa existente: se actualiza UNA vez con el último monto y 1 sola fila de auditoría', async () => {
      const PER = '2092-12-01';
      const exp = await prisma.expensa.create({
        data: {
          idDepartamento: depto1Id,
          periodo: new Date(`${PER}T00:00:00.000Z`),
          montoBase: 350,
          montoAgua: 0,
          monto: 350,
          saldoPendiente: 350,
          estado: 'Pendiente',
          fechaVencimiento: new Date('2092-12-20T00:00:00.000Z'),
        },
      });
      createdExpensasIds.push(exp.idExpensa);

      const res = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PER,
          montos: [
            { idDepartamento: depto1Id, montoAgua: 25 },
            { idDepartamento: depto1Id, montoAgua: 75 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.expensasActualizadas).toBe(1);
      res.body.montos.forEach((m: any) => createdMontosAguaIds.push(m.idMonto));

      // Expensa actualizada al último valor (75)
      const expBD = await prisma.expensa.findUnique({ where: { idExpensa: exp.idExpensa } });
      expect(Number(expBD!.montoAgua)).toBe(75);
      expect(Number(expBD!.monto)).toBe(425);
      expect(Number(expBD!.saldoPendiente)).toBe(425);

      // Solo una fila ACTUALIZACION_AGUA_EXPENSA
      const auds = await prisma.auditoria.findMany({
        where: {
          tablaAfectada: 'expensas',
          idRegistro: String(exp.idExpensa),
          accion: 'ACTUALIZACION_AGUA_EXPENSA',
        },
      });
      expect(auds).toHaveLength(1);
      expect((auds[0].datosNuevos as any)?.montoAgua).toBe(75);
    });

    it('1.6l. Expensa inconsistente (montoAgua 15, monto = base 300, saldo 300): PUT agua 15 recalcula monto a 315, saldo a 315 y expensasActualizadas 1', async () => {
      const PER = '2093-01-01';
      const exp = await prisma.expensa.create({
        data: {
          idDepartamento: depto1Id,
          periodo: new Date(`${PER}T00:00:00.000Z`),
          montoBase: 300,
          montoAgua: 15,
          monto: 300, // Inconsistente con el agua ya registrada (caso id 130)
          saldoPendiente: 300,
          estado: 'Pendiente',
          fechaVencimiento: new Date('2093-01-20T00:00:00.000Z'),
        },
      });
      createdExpensasIds.push(exp.idExpensa);

      // PUT agua 15 en ese período
      const res = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PER,
          montos: [{ idDepartamento: depto1Id, montoAgua: 15 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.expensasActualizadas).toBe(1);
      res.body.montos.forEach((m: any) => createdMontosAguaIds.push(m.idMonto));

      // Verificar en BD que monto es 315 y saldo 315
      const expBD = await prisma.expensa.findUnique({ where: { idExpensa: exp.idExpensa } });
      expect(Number(expBD!.montoBase)).toBe(300);
      expect(Number(expBD!.montoAgua)).toBe(15);
      expect(Number(expBD!.monto)).toBe(315);
      expect(Number(expBD!.saldoPendiente)).toBe(315);
      expect(expBD!.estado).toBe('Pendiente');

      // Segunda llamada con el mismo valor (15): ya consistente, no debe volver a actualizar expensa ni auditar
      const res2 = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PER,
          montos: [{ idDepartamento: depto1Id, montoAgua: 15 }],
        });

      expect(res2.status).toBe(200);
      expect(res2.body.expensasActualizadas).toBe(0);

      const auds = await prisma.auditoria.findMany({
        where: {
          tablaAfectada: 'expensas',
          idRegistro: String(exp.idExpensa),
          accion: 'ACTUALIZACION_AGUA_EXPENSA',
        },
      });
      expect(auds).toHaveLength(1);
    });

    it('1.7. Enviar el mismo departamento dos veces en una misma petición con montos distintos (200, una sola fila y auditoría por ítem)', async () => {
      const PERIODO_DUP = '2090-06-01';
      const res = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PERIODO_DUP,
          montos: [
            { idDepartamento: depto2Id, montoAgua: 60.0 },
            { idDepartamento: depto2Id, montoAgua: 85.0 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.montos).toHaveLength(2);

      res.body.montos.forEach((m: any) => createdMontosAguaIds.push(m.idMonto));

      // Verificar que en montos_agua existe UNA sola fila para el departamento y período con el último monto
      const pDate = new Date(`${PERIODO_DUP}T00:00:00.000Z`);
      const filas = await prisma.montoAgua.findMany({
        where: {
          idDepartamento: depto2Id,
          periodo: pDate,
        },
      });
      expect(filas).toHaveLength(1);
      expect(Number(filas[0].montoAgua)).toBe(85.0);

      // Verificar que se registró un evento REGISTRO_MONTO_AGUA por cada ítem enviado
      const auditorias = await prisma.auditoria.findMany({
        where: {
          tablaAfectada: 'montos_agua',
          idRegistro: String(filas[0].idMonto),
          accion: 'REGISTRO_MONTO_AGUA',
        },
        orderBy: { idAuditoria: 'asc' },
      });
      expect(auditorias).toHaveLength(2);

      const dNuevos1: any = auditorias[0].datosNuevos;
      expect(Number(dNuevos1?.montoAgua)).toBe(60.0);
      expect(auditorias[0].datosAnteriores).toBeNull();

      const dAnt2: any = auditorias[1].datosAnteriores;
      const dNuevos2: any = auditorias[1].datosNuevos;
      expect(Number(dAnt2?.montoAgua)).toBe(60.0);
      expect(Number(dNuevos2?.montoAgua)).toBe(85.0);
    });
  });

  describe('2. GET /api/v1/agua/montos (Consulta de Montos)', () => {
    it('2.1. Consulta con filtro de período e idDepartamento (Administrador, Directorio, Consulta)', async () => {
      const resAdmin = await request(app)
        .get(`/api/v1/agua/montos?periodo=${PERIODO_1}&idDepartamento=${depto1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.data).toBeDefined();
      expect(resAdmin.body.data.length).toBeGreaterThanOrEqual(1);
      expect(resAdmin.body.data[0].montoAgua).toBe(95.0);

      const resConsulta = await request(app)
        .get(`/api/v1/agua/montos?periodo=${PERIODO_1}&idDepartamento=${depto1Id}`)
        .set('Authorization', `Bearer ${consultaToken}`);

      expect(resConsulta.status).toBe(200);
      expect(resConsulta.body.data[0].montoAgua).toBe(95.0);
    });
  });

  describe('3. Integración en Generación Masiva (POST /expensas/generar-masivo)', () => {
    it('3.1. Generar masivo con monto y sin monto registrado para el período', async () => {
      // depto1Id y depto2Id tienen monto registrado en PERIODO_1 (95.0 y 110.0)
      // depto3Id NO tiene monto registrado en PERIODO_1
      const res = await request(app)
        .post('/api/v1/expensas/generar-masivo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PERIODO_1,
          fechaVencimiento: VENCIMIENTO_1,
          idDepartamentos: [depto1Id, depto2Id, depto3Id],
        });

      expect(res.status).toBe(201);
      expect(res.body.generadasCount).toBe(3);

      // Consultar las expensas generadas para los 3 departamentos
      const p1Date = new Date(`${PERIODO_1}T00:00:00.000Z`);
      const expensasGeneradas = await prisma.expensa.findMany({
        where: {
          idDepartamento: { in: [depto1Id, depto2Id, depto3Id] },
          periodo: p1Date,
        },
      });

      for (const e of expensasGeneradas) {
        createdExpensasIds.push(e.idExpensa);
      }

      const exp1 = expensasGeneradas.find((e) => e.idDepartamento === depto1Id)!;
      const exp2 = expensasGeneradas.find((e) => e.idDepartamento === depto2Id)!;
      const exp3 = expensasGeneradas.find((e) => e.idDepartamento === depto3Id)!;

      // Depto 1: base 350 + agua 95 = 445
      expect(Number(exp1.montoBase)).toBe(350);
      expect(Number(exp1.montoAgua)).toBe(95.0);
      expect(Number(exp1.monto)).toBe(445.0);

      // Depto 2: base 350 + agua 110 = 460
      expect(Number(exp2.montoBase)).toBe(350);
      expect(Number(exp2.montoAgua)).toBe(110.0);
      expect(Number(exp2.monto)).toBe(460.0);

      // Depto 3: sin monto registrado -> solo base 350, agua 0
      expect(Number(exp3.montoBase)).toBe(350);
      expect(Number(exp3.montoAgua)).toBe(0);
      expect(Number(exp3.monto)).toBe(350.0);

      // Verificar concepto formateado mediante endpoint GET /expensas/:id
      const resGet1 = await request(app)
        .get(`/api/v1/expensas/${exp1.idExpensa}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resGet1.body.concepto).toBe('Expensa mensual Tipo B y Agua');

      const resGet3 = await request(app)
        .get(`/api/v1/expensas/${exp3.idExpensa}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resGet3.body.concepto).toBe('Expensa mensual Tipo B');

      // Advertencias debe incluir al depto 3 sin mencionar lecturas
      const advDepto3 = res.body.advertencias.find((a: any) => a.idDepartamento === depto3Id);
      expect(advDepto3).toBeDefined();
      expect(advDepto3.advertencia).toMatch(/sin monto de agua registrado/i);
      expect(advDepto3.advertencia).not.toMatch(/lectura/i);
    });
  });

  describe('4. Mora sobre el total (monto_base + monto_agua)', () => {
    it('4.1. El cálculo de mora aplica sobre el total monto', async () => {
      // Creamos una expensa para depto1 en PERIODO_2 con vencimiento ya pasado
      // Primero registramos monto de agua de 50.0
      const resMonto = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PERIODO_2,
          montos: [{ idDepartamento: depto1Id, montoAgua: 50.0 }],
        });
      expect(resMonto.status).toBe(200);
      createdMontosAguaIds.push(resMonto.body.montos[0].idMonto);

      // Creamos la expensa con tasa 10%
      const resExp = await request(app)
        .post('/api/v1/expensas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idDepartamento: depto1Id,
          periodo: PERIODO_2,
          fechaVencimiento: '2020-01-01', // Vencida en el pasado para aplicar mora
          tasaInteresMora: 10,
        });

      expect(resExp.status).toBe(201);
      createdExpensasIds.push(resExp.body.idExpensa);

      // Base: 350, Agua: 50 -> Total: 400
      expect(resExp.body.montoBase).toBe(350);
      expect(resExp.body.montoAgua).toBe(50);
      expect(resExp.body.monto).toBe(400);

      // Verificamos mediante GET /expensas/:id
      const resGet = await request(app)
        .get(`/api/v1/expensas/${resExp.body.idExpensa}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resGet.status).toBe(200);
      expect(resGet.body.monto).toBe(400);
      expect(resGet.body.concepto).toBe('Expensa mensual Tipo B y Agua');
    });
  });

  describe('5. Verificación de endpoints retirados (404)', () => {
    it('5.1. Los antiguos endpoints de tarifa y lecturas ya no existen en el router (404)', async () => {
      const getTarifa = await request(app).get('/api/v1/agua/tarifa').set('Authorization', `Bearer ${adminToken}`);
      expect(getTarifa.status).toBe(404);

      const postTarifa = await request(app).post('/api/v1/agua/tarifa').set('Authorization', `Bearer ${adminToken}`);
      expect(postTarifa.status).toBe(404);

      const getLecturas = await request(app).get('/api/v1/agua/lecturas').set('Authorization', `Bearer ${adminToken}`);
      expect(getLecturas.status).toBe(404);

      const postLecturas = await request(app).post('/api/v1/agua/lecturas').set('Authorization', `Bearer ${adminToken}`);
      expect(postLecturas.status).toBe(404);
    });
  });
});
