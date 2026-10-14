// backend/tests/reglas_mora.test.ts
// Tests para CA09: Configuración de Reglas de Mora, Días de Gracia, Historial y Auditoría

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '@edificio-xyz/database';
import { app } from '../src/index';
import { generarTokenPrueba } from './setup';
import { crearDepartamentoTest, generarNumeroDeptoTest, limpiar } from './test.helpers';

describe('US2.1 - Punto 2: Reglas de Mora (CA09)', () => {
  let adminToken: string;
  let copropietarioToken: string;
  let testDepartamentoId: number;
  const createdExpensasIds: number[] = [];

  beforeAll(async () => {
    const adminUser = await prisma.usuario.findFirst({ where: { rol: { nombre: 'Administrador' } } });
    adminToken = await generarTokenPrueba(adminUser!.idUsuario, adminUser!.correo, 'Administrador');
    copropietarioToken = await generarTokenPrueba(999, 'tst-vecino@edificioxyz.com', 'Copropietario');

    const depto = await crearDepartamentoTest({
      numero: generarNumeroDeptoTest('RM'),
      piso: 2,
      estado: 'Ocupado',
    });
    testDepartamentoId = depto.idDepartamento;
  });

  afterAll(async () => {
    // Asegurar regla activa estándar para el sistema
    await prisma.reglaMora.updateMany({ data: { activa: false } });
    await prisma.reglaMora.create({
      data: { tasaInteres: 5.0, diasGracia: 0, activa: true },
    });

    await limpiar({
      expensas: createdExpensasIds,
      departamentos: testDepartamentoId ? [testDepartamentoId] : [],
    });
  });

  it('1. POST /reglas-mora debe rechazar a roles no autorizados (ej. Copropietario)', async () => {
    const res = await request(app)
      .post('/api/v1/expensas/reglas-mora')
      .set('Authorization', `Bearer ${copropietarioToken}`)
      .send({ tasaInteres: 5, diasGracia: 2 });

    expect(res.status).toBe(403);
  });

  it('2. POST /reglas-mora debe validar rangos de tasa (0-100) y días de gracia (>=0)', async () => {
    // Tasa negativa
    const res1 = await request(app)
      .post('/api/v1/expensas/reglas-mora')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tasaInteres: -2, diasGracia: 0 });
    expect(res1.status).toBe(400);

    // Tasa mayor a 100
    const res2 = await request(app)
      .post('/api/v1/expensas/reglas-mora')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tasaInteres: 105, diasGracia: 0 });
    expect(res2.status).toBe(400);

    // Días de gracia negativos
    const res3 = await request(app)
      .post('/api/v1/expensas/reglas-mora')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tasaInteres: 5, diasGracia: -1 });
    expect(res3.status).toBe(400);
  });

  it('3. POST /reglas-mora debe activar la nueva regla y desactivar cualquier regla anterior dejando SOLO UNA activa', async () => {
    // Primera regla: 4% con 2 días de gracia
    const res1 = await request(app)
      .post('/api/v1/expensas/reglas-mora')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tasaInteres: 4, diasGracia: 2 });
    expect(res1.status).toBe(201);
    expect(Number(res1.body.regla.tasaInteres)).toBe(4);
    expect(res1.body.regla.activa).toBe(true);

    // Segunda regla: 6% con 5 días de gracia
    const res2 = await request(app)
      .post('/api/v1/expensas/reglas-mora')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tasaInteres: 6, diasGracia: 5 });
    expect(res2.status).toBe(201);
    expect(Number(res2.body.regla.tasaInteres)).toBe(6);
    expect(res2.body.regla.activa).toBe(true);

    // Verificar en la BD que solo hay UNA regla activa
    const reglasActivas = await prisma.reglaMora.findMany({
      where: { activa: true },
    });
    expect(reglasActivas.length).toBe(1);
    expect(reglasActivas[0].idRegla).toBe(res2.body.regla.idRegla);

    // Verificar que la auditoría CONFIGURAR_REGLA_MORA fue registrada con datosAnteriores y datosNuevos
    const auditoria = await prisma.auditoria.findFirst({
      where: {
        tablaAfectada: 'reglas_mora',
        accion: 'CONFIGURAR_REGLA_MORA',
        idRegistro: String(res2.body.regla.idRegla),
      },
      orderBy: { fechaHora: 'desc' },
    });
    expect(auditoria).toBeDefined();
    expect((auditoria!.datosNuevos as any).tasaInteres).toBe(6);
    expect((auditoria!.datosAnteriores as any).tasaInteres).toBe(4);
  });

  it('4. GET /reglas-mora debe devolver la regla activa actual y el historial completo', async () => {
    const res = await request(app)
      .get('/api/v1/expensas/reglas-mora')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.activa).toBeDefined();
    expect(res.body.activa.activa).toBe(true);
    expect(Array.isArray(res.body.historial)).toBe(true);
    expect(res.body.historial.length).toBeGreaterThanOrEqual(2);
  });

  it('5. Días de gracia: si hoy <= fechaVencimiento + diasGracia no hay mora; si hoy > fechaVencimiento + diasGracia se aplica mora', async () => {
    // Configurar regla activa: 10% con 3 días de gracia
    await request(app)
      .post('/api/v1/expensas/reglas-mora')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tasaInteres: 10, diasGracia: 3 });

    // Caso A: Expensa vencida hace 2 días (dentro del período de 3 días de gracia)
    const vencidaDentroDeGracia = new Date();
    vencidaDentroDeGracia.setDate(vencidaDentroDeGracia.getDate() - 2);

    const expDentro = await prisma.expensa.create({
      data: {
        idDepartamento: testDepartamentoId,
        periodo: new Date('2026-02-01T00:00:00.000Z'),
        monto: 500,
        montoMora: 0,
        tasaInteresMora: 0, // Usa regla activa
        fechaVencimiento: vencidaDentroDeGracia,
        saldoPendiente: 500,
        estado: 'Pendiente',
      },
    });
    createdExpensasIds.push(expDentro.idExpensa);

    // Caso B: Expensa vencida hace 5 días (fuera del período de 3 días de gracia)
    const vencidaFueraDeGracia = new Date();
    vencidaFueraDeGracia.setDate(vencidaFueraDeGracia.getDate() - 5);

    const expFuera = await prisma.expensa.create({
      data: {
        idDepartamento: testDepartamentoId,
        periodo: new Date('2026-03-01T00:00:00.000Z'),
        monto: 500,
        montoMora: 0,
        tasaInteresMora: 0, // Usa regla activa (10%)
        fechaVencimiento: vencidaFueraDeGracia,
        saldoPendiente: 500,
        estado: 'Pendiente',
      },
    });
    createdExpensasIds.push(expFuera.idExpensa);

    // Ejecutar recálculo filtrando por el departamento de test
    await request(app)
      .post('/api/v1/expensas/calcular-mora')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ idDepartamentos: [testDepartamentoId] });

    // Comprobar Caso A (dentro de gracia): NO debe tener mora
    const expDentroPost = await prisma.expensa.findUnique({
      where: { idExpensa: expDentro.idExpensa },
    });
    expect(Number(expDentroPost!.montoMora)).toBe(0);
    expect(Number(expDentroPost!.saldoPendiente)).toBe(500);

    // Comprobar Caso B (fuera de gracia): debe tener mora del 10% (50.00) y saldo 550
    const expFueraPost = await prisma.expensa.findUnique({
      where: { idExpensa: expFuera.idExpensa },
    });
    expect(Number(expFueraPost!.montoMora)).toBe(50.00);
    expect(Number(expFueraPost!.saldoPendiente)).toBe(550.00);
    expect(expFueraPost!.estado).toBe('Moroso');
  });

  it('6. Sin regla activa ni tasa en la expensa -> debe retornar error claro sin fallback a 5%', async () => {
    // Desactivar todas las reglas de mora para simular ausencia de regla
    await prisma.reglaMora.updateMany({ data: { activa: false } });

    const fechaVencida = new Date();
    fechaVencida.setDate(fechaVencida.getDate() - 5);

    const expSinTasa = await prisma.expensa.create({
      data: {
        idDepartamento: testDepartamentoId,
        periodo: new Date('2026-01-01T00:00:00.000Z'),
        monto: 400,
        montoMora: 0,
        tasaInteresMora: 0, // Sin tasa específica
        fechaVencimiento: fechaVencida,
        saldoPendiente: 400,
        estado: 'Pendiente',
      },
    });
    createdExpensasIds.push(expSinTasa.idExpensa);

    const res = await request(app)
      .post('/api/v1/expensas/calcular-mora')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ idDepartamentos: [testDepartamentoId] });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('No existe una regla de mora activa configurada');

    // Restaurar una regla activa para tests subsiguientes
    await prisma.reglaMora.create({
      data: { tasaInteres: 5.0, diasGracia: 0, activa: true },
    });
  });
});
