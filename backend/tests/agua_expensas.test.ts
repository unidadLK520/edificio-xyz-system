// backend/tests/agua_expensas.test.ts
// Tests para Prompt 4: Gestión de Agua, Tarifas, Lecturas, Integración en Expensas y Mora

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

describe('Prompt 4: Gestión de Agua, Tarifas, Lecturas e Integración con Expensas', () => {
  let adminToken: string;
  let directorioToken: string;
  let consultaToken: string;

  let deptoConLecturaId: number;
  let deptoSinLecturaId: number;
  let deptoIndividualId: number;
  let personaTestId: number;

  const createdTarifasAguaIds: number[] = [];
  const createdLecturasAguaIds: number[] = [];
  const createdExpensasIds: number[] = [];
  const createdDepartamentosIds: number[] = [];
  const createdPersonasIds: number[] = [];

  // Períodos de prueba en rango 2090-2099
  const PERIODO_1 = '2090-01-01';
  const PERIODO_2 = '2090-02-01';
  const VENCIMIENTO_1 = '2090-01-15';
  const VENCIMIENTO_2 = '2090-02-15';
  const PRECIO_M3_PRUEBA = 7.77;

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

    // 3. Crear personas y departamentos de prueba aislados
    const persona = await crearPersonaTest({ nombres: 'Titular', apellidos: 'Agua Test' });
    personaTestId = persona.idPersona;
    createdPersonasIds.push(personaTestId);

    const d1 = await crearDepartamentoTest({
      numero: generarNumeroDeptoTest('AG1'),
      piso: 5,
      estado: 'Ocupado',
      idTipo: idTipoB,
      idPropietario: personaTestId,
    });
    deptoConLecturaId = d1.idDepartamento;
    createdDepartamentosIds.push(deptoConLecturaId);

    const d2 = await crearDepartamentoTest({
      numero: generarNumeroDeptoTest('AG2'),
      piso: 5,
      estado: 'Ocupado',
      idTipo: idTipoB,
      idPropietario: personaTestId,
    });
    deptoSinLecturaId = d2.idDepartamento;
    createdDepartamentosIds.push(deptoSinLecturaId);

    const d3 = await crearDepartamentoTest({
      numero: generarNumeroDeptoTest('AG3'),
      piso: 6,
      estado: 'Ocupado',
      idTipo: idTipoB,
      idPropietario: personaTestId,
    });
    deptoIndividualId = d3.idDepartamento;
    createdDepartamentosIds.push(deptoIndividualId);
  });

  afterAll(async () => {
    // Limpieza estricta: ÚNICAMENTE por IDs creados por este test
    await limpiar({
      expensas: createdExpensasIds,
      lecturasAgua: createdLecturasAguaIds,
      tarifasAgua: createdTarifasAguaIds,
      departamentos: createdDepartamentosIds,
      personas: createdPersonasIds,
    });

    // Asegurar que tarifas_agua vuelva al snapshot inicial (0 filas)
    if (createdTarifasAguaIds.length > 0) {
      await prisma.tarifaAgua.deleteMany({
        where: { idTarifa: { in: createdTarifasAguaIds } },
      });
    }
  });

  describe('1. GET / POST /api/v1/agua/tarifa (CA Tarifas de Agua)', () => {
    it('1.1. No debe permitir configurar tarifa con precio negativo (400)', async () => {
      const res = await request(app)
        .post('/api/v1/agua/tarifa')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ precioM3: -5 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });

    it('1.2. Rol Consulta no debe tener permiso para POST /api/v1/agua/tarifa (403)', async () => {
      const res = await request(app)
        .post('/api/v1/agua/tarifa')
        .set('Authorization', `Bearer ${consultaToken}`)
        .send({ precioM3: PRECIO_M3_PRUEBA });

      expect(res.status).toBe(403);
    });

    it('1.3. Debe configurar tarifa activa con precio reconocido 7.77 y auditar CONFIGURAR_TARIFA_AGUA', async () => {
      const res = await request(app)
        .post('/api/v1/agua/tarifa')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ precioM3: PRECIO_M3_PRUEBA });

      expect(res.status).toBe(201);
      expect(res.body.tarifa).toBeDefined();
      expect(Number(res.body.tarifa.precioM3)).toBe(PRECIO_M3_PRUEBA);
      expect(res.body.tarifa.activa).toBe(true);
      createdTarifasAguaIds.push(res.body.tarifa.idTarifa);

      // Verificar registro en auditoría
      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'tarifas_agua',
          accion: 'CONFIGURAR_TARIFA_AGUA',
          idRegistro: String(res.body.tarifa.idTarifa),
        },
        orderBy: { fechaHora: 'desc' },
      });
      expect(audit).toBeDefined();
      expect(audit?.resultado).toBe('EXITO');
    });

    it('1.4. Una activa a la vez: si se crea otra tarifa, la anterior se desactiva en transacción', async () => {
      const resSegunda = await request(app)
        .post('/api/v1/agua/tarifa')
        .set('Authorization', `Bearer ${directorioToken}`)
        .send({ precio_m3: 8.88 });

      expect(resSegunda.status).toBe(201);
      expect(Number(resSegunda.body.tarifa.precioM3)).toBe(8.88);
      expect(resSegunda.body.tarifa.activa).toBe(true);
      createdTarifasAguaIds.push(resSegunda.body.tarifa.idTarifa);

      // Restaurar la tarifa oficial de prueba a 7.77 para las siguientes pruebas
      const resRestaurada = await request(app)
        .post('/api/v1/agua/tarifa')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ precioM3: PRECIO_M3_PRUEBA });

      expect(resRestaurada.status).toBe(201);
      createdTarifasAguaIds.push(resRestaurada.body.tarifa.idTarifa);

      // Verificar que solo 1 tarifa esté activa
      const activas = await prisma.tarifaAgua.findMany({ where: { activa: true } });
      expect(activas.length).toBe(1);
      expect(activas[0].idTarifa).toBe(resRestaurada.body.tarifa.idTarifa);
    });

    it('1.5. GET /api/v1/agua/tarifa debe retornar la tarifa activa y el historial', async () => {
      const res = await request(app)
        .get('/api/v1/agua/tarifa')
        .set('Authorization', `Bearer ${directorioToken}`);

      expect(res.status).toBe(200);
      expect(res.body.activa).toBeDefined();
      expect(Number(res.body.activa.precioM3)).toBe(PRECIO_M3_PRUEBA);
      expect(Array.isArray(res.body.historial)).toBe(true);
      expect(res.body.historial.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. POST / GET / PUT /api/v1/agua/lecturas', () => {
    let lecturaIdPeriodo1: number;

    it('2.1. Primer registro sin lectura previa exige lecturaAnterior (422)', async () => {
      const res = await request(app)
        .post('/api/v1/agua/lecturas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idDepartamento: deptoConLecturaId,
          periodo: PERIODO_1,
          lecturaActual: 100,
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('lecturaAnterior');
    });

    it('2.2. Error 422 si lecturaActual < lecturaAnterior', async () => {
      const res = await request(app)
        .post('/api/v1/agua/lecturas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idDepartamento: deptoConLecturaId,
          periodo: PERIODO_1,
          lecturaAnterior: 100,
          lecturaActual: 90,
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('menor a la lectura anterior');
    });

    it('2.3. Registrar primera lectura exitosa calculando consumo, monto y guardando precio', async () => {
      // anterior = 100, actual = 110 => consumo = 10 m3. Precio = 7.77 => monto = 77.70
      const res = await request(app)
        .post('/api/v1/agua/lecturas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idDepartamento: deptoConLecturaId,
          periodo: PERIODO_1,
          lecturaAnterior: 100,
          lecturaActual: 110,
        });

      expect(res.status).toBe(201);
      expect(res.body.lectura).toBeDefined();
      expect(res.body.lectura.consumoM3).toBe(10);
      expect(res.body.lectura.precioM3).toBe(PRECIO_M3_PRUEBA);
      expect(res.body.lectura.montoAgua).toBe(77.7);
      lecturaIdPeriodo1 = res.body.lectura.idLectura;
      createdLecturasAguaIds.push(lecturaIdPeriodo1);

      // Verificar auditoría REGISTRO_LECTURA_AGUA
      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'lecturas_agua',
          accion: 'REGISTRO_LECTURA_AGUA',
          idRegistro: String(lecturaIdPeriodo1),
        },
      });
      expect(audit).toBeDefined();
      expect(audit?.resultado).toBe('EXITO');
    });

    it('2.4. Error 409 si ya existe lectura para el mismo departamento y período', async () => {
      const res = await request(app)
        .post('/api/v1/agua/lecturas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idDepartamento: deptoConLecturaId,
          periodo: PERIODO_1,
          lecturaActual: 115,
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Ya existe');
    });

    it('2.5. Segunda lectura toma lecturaAnterior automáticamente de la última registrada', async () => {
      // Período 2: sin pasar lecturaAnterior, debe tomar 110. Actual = 125 => consumo = 15 m3 => 15 * 7.77 = 116.55
      const res = await request(app)
        .post('/api/v1/agua/lecturas')
        .set('Authorization', `Bearer ${directorioToken}`)
        .send({
          idDepartamento: deptoConLecturaId,
          periodo: PERIODO_2,
          lecturaActual: 125,
        });

      expect(res.status).toBe(201);
      expect(res.body.lectura.lecturaAnterior).toBe(110);
      expect(res.body.lectura.lecturaActual).toBe(125);
      expect(res.body.lectura.consumoM3).toBe(15);
      expect(res.body.lectura.montoAgua).toBe(116.55);
      createdLecturasAguaIds.push(res.body.lectura.idLectura);
    });

    it('2.6. GET /api/v1/agua/lecturas con filtros de período e idDepartamento (A, D, C)', async () => {
      const resConsulta = await request(app)
        .get(`/api/v1/agua/lecturas?idDepartamento=${deptoConLecturaId}&periodo=${PERIODO_1}`)
        .set('Authorization', `Bearer ${consultaToken}`);

      expect(resConsulta.status).toBe(200);
      expect(Array.isArray(resConsulta.body.data)).toBe(true);
      expect(resConsulta.body.data.length).toBe(1);
      expect(resConsulta.body.data[0].idDepartamento).toBe(deptoConLecturaId);
      expect(resConsulta.body.data[0].consumoM3).toBe(10);
    });

    it('2.7. PUT /api/v1/agua/lecturas/:id corrige lectura aún no usada en expensa emitida', async () => {
      // Corregir lectura 2: cambiar actual de 125 a 120 => consumo = 10 m3 => monto = 77.70
      const ultimaLecturaId = createdLecturasAguaIds[createdLecturasAguaIds.length - 1];
      const res = await request(app)
        .put(`/api/v1/agua/lecturas/${ultimaLecturaId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ lecturaActual: 120 });

      expect(res.status).toBe(200);
      expect(res.body.lectura.lecturaActual).toBe(120);
      expect(res.body.lectura.consumoM3).toBe(10);
      expect(res.body.lectura.montoAgua).toBe(77.7);
    });
  });

  describe('3 y 4. Integración en generar-masivo y POST /expensas (montoBase, montoAgua, concepto)', () => {
    let expensaConLecturaId: number;
    let expensaSinLecturaId: number;

    it('3.1. generar-masivo: departamento con lectura suma montoBase + montoAgua y concepto con agua', async () => {
      // Depto con lectura: Tipo B (350) + Lectura (77.70) = 427.70
      // Depto sin lectura: Tipo B (350) + 0 = 350.00 y lista advertencias[]
      const res = await request(app)
        .post('/api/v1/expensas/generar-masivo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          periodo: PERIODO_1,
          fechaVencimiento: VENCIMIENTO_1,
          idDepartamentos: [deptoConLecturaId, deptoSinLecturaId],
        });

      expect(res.status).toBe(201);
      expect(res.body.generadasCount).toBe(2);
      expect(Array.isArray(res.body.advertencias)).toBe(true);

      // Verificar que el depto sin lectura aparece en advertencias
      const advSinLectura = res.body.advertencias.find(
        (a: any) => a.idDepartamento === deptoSinLecturaId
      );
      expect(advSinLectura).toBeDefined();

      // Consultar las expensas generadas para verificar montos y concepto
      const expCon = await prisma.expensa.findFirst({
        where: { idDepartamento: deptoConLecturaId, periodo: new Date(`${PERIODO_1}T00:00:00.000Z`) },
      });
      expect(expCon).toBeDefined();
      expensaConLecturaId = expCon!.idExpensa;
      createdExpensasIds.push(expensaConLecturaId);

      expect(Number(expCon!.montoBase)).toBe(350);
      expect(Number(expCon!.montoAgua)).toBe(77.7);
      expect(Number(expCon!.monto)).toBe(427.7);
      expect(Number(expCon!.saldoPendiente)).toBe(427.7);

      const expSin = await prisma.expensa.findFirst({
        where: { idDepartamento: deptoSinLecturaId, periodo: new Date(`${PERIODO_1}T00:00:00.000Z`) },
      });
      expect(expSin).toBeDefined();
      expensaSinLecturaId = expSin!.idExpensa;
      createdExpensasIds.push(expensaSinLecturaId);

      expect(Number(expSin!.montoBase)).toBe(350);
      expect(Number(expSin!.montoAgua)).toBe(0);
      expect(Number(expSin!.monto)).toBe(350);
      expect(Number(expSin!.saldoPendiente)).toBe(350);
    });

    it('3.2. Una vez emitida la expensa, PUT /api/v1/agua/lecturas/:id devuelve 409 Conflict', async () => {
      // La lectura 1 ya se usó en expensaConLecturaId
      const res = await request(app)
        .put(`/api/v1/agua/lecturas/${createdLecturasAguaIds[0]}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ lecturaActual: 112 });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('utilizada en una expensa emitida');
    });

    it('4.1. Respuestas de GET /expensas/:id deben incluir montoBase, montoAgua, monto y concepto', async () => {
      // Caso 1: con lectura de agua (Tipo B y Agua 10 m3)
      const resCon = await request(app)
        .get(`/api/v1/expensas/${expensaConLecturaId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resCon.status).toBe(200);
      expect(resCon.body.montoBase).toBe(350);
      expect(resCon.body.montoAgua).toBe(77.7);
      expect(resCon.body.monto).toBe(427.7);
      expect(resCon.body.concepto).toBe('Expensa mensual Tipo B y Agua 10 m3');

      // Caso 2: sin lectura de agua (solo Tipo B)
      const resSin = await request(app)
        .get(`/api/v1/expensas/${expensaSinLecturaId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resSin.status).toBe(200);
      expect(resSin.body.montoBase).toBe(350);
      expect(resSin.body.montoAgua).toBe(0);
      expect(resSin.body.monto).toBe(350);
      expect(resSin.body.concepto).toBe('Expensa mensual Tipo B');
    });

    it('4.2. Estado de cuenta (GET /expensas/estado-cuenta/:id) debe incluir concepto y desglose', async () => {
      const res = await request(app)
        .get(`/api/v1/expensas/estado-cuenta/${deptoConLecturaId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.expensas)).toBe(true);
      const expEncontrada = res.body.expensas.find((e: any) => e.idExpensa === expensaConLecturaId);
      expect(expEncontrada).toBeDefined();
      expect(expEncontrada.montoBase).toBe(350);
      expect(expEncontrada.montoAgua).toBe(77.7);
      expect(expEncontrada.monto).toBe(427.7);
      expect(expEncontrada.concepto).toBe('Expensa mensual Tipo B y Agua 10 m3');
    });

    it('4.3. POST /expensas individual con lectura calcula suma y devuelve concepto', async () => {
      // Registrar lectura en deptoIndividualId para PERIODO_1
      const resLec = await request(app)
        .post('/api/v1/agua/lecturas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idDepartamento: deptoIndividualId,
          periodo: PERIODO_1,
          lecturaAnterior: 50,
          lecturaActual: 55, // 5 m3 * 7.77 = 38.85
        });
      expect(resLec.status).toBe(201);
      createdLecturasAguaIds.push(resLec.body.lectura.idLectura);

      // Crear expensa individual para ese depto y período
      const resExp = await request(app)
        .post('/api/v1/expensas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idDepartamento: deptoIndividualId,
          periodo: PERIODO_1,
          fechaVencimiento: VENCIMIENTO_1,
        });

      expect(resExp.status).toBe(201);
      expect(resExp.body.montoBase).toBe(350);
      expect(resExp.body.montoAgua).toBe(38.85);
      expect(resExp.body.monto).toBe(388.85);
      expect(resExp.body.saldoPendiente).toBe(388.85);
      expect(resExp.body.concepto).toBe('Expensa mensual Tipo B y Agua 5 m3');
      createdExpensasIds.push(resExp.body.idExpensa);
    });
  });

  describe('5. Pruebas de Tarifa Cambiada y Mora sobre Total (Fijo + Agua)', () => {
    it('5.1. Tarifa Cambiada: al cambiar la tarifa activa, las expensas emitidas NO se modifican', async () => {
      // Cambiar tarifa a 9.99
      const resNuevaTarifa = await request(app)
        .post('/api/v1/agua/tarifa')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ precioM3: 9.99 });
      expect(resNuevaTarifa.status).toBe(201);
      createdTarifasAguaIds.push(resNuevaTarifa.body.tarifa.idTarifa);

      // Verificar que la expensa emitida previamente conserva su monto total (427.70) y montoAgua (77.70)
      const resExp = await request(app)
        .get(`/api/v1/expensas/${createdExpensasIds[0]}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resExp.status).toBe(200);
      expect(resExp.body.monto).toBe(427.7);
      expect(resExp.body.montoAgua).toBe(77.7);
      expect(resExp.body.montoBase).toBe(350);
    });

    it('5.2. Mora calculada sobre el total (fijo + agua)', async () => {
      // Crear expensa vencida ayer con monto total = 427.70 (350 base + 77.70 agua) y tasa 5%
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);

      // Forzar fechaVencimiento en el pasado para expensaConLecturaId
      const expensaId = createdExpensasIds[0];
      await prisma.expensa.update({
        where: { idExpensa: expensaId },
        data: {
          fechaVencimiento: ayer,
          tasaInteresMora: 5,
        },
      });

      // Ejecutar cálculo de mora sobre ese departamento
      const resMora = await request(app)
        .post('/api/v1/expensas/calcular-mora')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ idDepartamentos: [deptoConLecturaId] });

      expect(resMora.status).toBe(200);
      expect(resMora.body.actualizadasCount).toBeGreaterThanOrEqual(1);

      // Capital pendiente = 427.70 (fijo 350 + agua 77.70)
      // Tasa = 5% => Mora = round(427.70 * 0.05, 2) = 21.39
      // Saldo pendiente nuevo = 427.70 + 21.39 = 449.09
      const expActualizada = await prisma.expensa.findUnique({
        where: { idExpensa: expensaId },
      });

      expect(expActualizada).toBeDefined();
      expect(Number(expActualizada!.montoMora)).toBe(21.39);
      expect(Number(expActualizada!.saldoPendiente)).toBe(449.09);
      expect(expActualizada!.estado).toBe('Moroso');
    });
  });
});
