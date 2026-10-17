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

    it('1.6. Debe responder 409 si ya hay expensa emitida para ese departamento y período', async () => {
      // Intentar modificar el monto de depto3Id en 2090-05 cuando ya existe la expensa emitida
      const res = await request(app)
        .put('/api/v1/agua/montos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PERIODO_MAY_NORMALIZED,
          montos: [{ idDepartamento: depto3Id, montoAgua: 99.9 }],
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/ya existe una expensa emitida/i);
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
