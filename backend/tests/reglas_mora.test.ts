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
  let originalActiveRuleId: number = 2;
  const createdReglaIds: number[] = [];
  const createdExpensasIds: number[] = [];

  beforeAll(async () => {
    const adminUser = await prisma.usuario.findFirst({ where: { rol: { nombre: 'Administrador' } } });
    adminToken = await generarTokenPrueba(adminUser!.idUsuario, adminUser!.correo, 'Administrador');
    copropietarioToken = await generarTokenPrueba(999, 'tst-vecino@edificioxyz.com', 'Copropietario');

    // Registrar la regla activa inicial
    const activeRule = await prisma.reglaMora.findFirst({ where: { activa: true } });
    if (activeRule) originalActiveRuleId = activeRule.idRegla;

    const depto = await crearDepartamentoTest({
      numero: generarNumeroDeptoTest('RM'),
      piso: 2,
      estado: 'Ocupado',
    });
    testDepartamentoId = depto.idDepartamento;
  });

  afterAll(async () => {
    // 1. Eliminar ÚNICAMENTE las reglas creadas por esta prueba por sus IDs específicos
    await limpiar({
      reglasMora: createdReglaIds,
      expensas: createdExpensasIds,
      departamentos: testDepartamentoId ? [testDepartamentoId] : [],
    });

    // 2. Restaurar exactamente la regla activa inicial
    await prisma.reglaMora.updateMany({ data: { activa: false } });
    if (originalActiveRuleId) {
      await prisma.reglaMora.update({
        where: { idRegla: originalActiveRuleId },
        data: { activa: true },
      });
    }
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
    // Primera regla con valor reconocible de prueba: 7.77% con 2 días de gracia
    const res1 = await request(app)
      .post('/api/v1/expensas/reglas-mora')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tasaInteres: 7.77, diasGracia: 2 });
    expect(res1.status).toBe(201);
    expect(Number(res1.body.regla.tasaInteres)).toBe(7.77);
    expect(res1.body.regla.activa).toBe(true);
    if (res1.body?.regla?.idRegla) createdReglaIds.push(res1.body.regla.idRegla);

    // Segunda regla con valor reconocible de prueba: 7.77% con 5 días de gracia
    const res2 = await request(app)
      .post('/api/v1/expensas/reglas-mora')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tasaInteres: 7.77, diasGracia: 5 });
    expect(res2.status).toBe(201);
    expect(Number(res2.body.regla.tasaInteres)).toBe(7.77);
    expect(res2.body.regla.activa).toBe(true);
    if (res2.body?.regla?.idRegla) createdReglaIds.push(res2.body.regla.idRegla);

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
    expect((auditoria!.datosNuevos as any).tasaInteres).toBe(7.77);
    expect((auditoria!.datosAnteriores as any).tasaInteres).toBe(7.77);
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
    // Configurar regla activa con tasa reconocible de prueba: 7.77% con 3 días de gracia
    const resRegla = await request(app)
      .post('/api/v1/expensas/reglas-mora')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tasaInteres: 7.77, diasGracia: 3 });
    if (resRegla.body?.regla?.idRegla) createdReglaIds.push(resRegla.body.regla.idRegla);

    // Caso A: Expensa vencida hace 2 días (dentro del período de 3 días de gracia)
    const vencidaDentroDeGracia = new Date();
    vencidaDentroDeGracia.setDate(vencidaDentroDeGracia.getDate() - 2);

    const expDentro = await prisma.expensa.create({
      data: {
        idDepartamento: testDepartamentoId,
        periodo: new Date('2026-02-01T00:00:00.000Z'),
        monto: 100,
        montoMora: 0,
        tasaInteresMora: 0, // Usa regla activa (7.77%)
        fechaVencimiento: vencidaDentroDeGracia,
        saldoPendiente: 100,
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
        monto: 100,
        montoMora: 0,
        tasaInteresMora: 0, // Usa regla activa (7.77%)
        fechaVencimiento: vencidaFueraDeGracia,
        saldoPendiente: 100,
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
    expect(Number(expDentroPost!.saldoPendiente)).toBe(100);

    // Comprobar Caso B (fuera de gracia): debe tener mora del 7.77% (7.77) y saldo 107.77
    const expFueraPost = await prisma.expensa.findUnique({
      where: { idExpensa: expFuera.idExpensa },
    });
    expect(Number(expFueraPost!.montoMora)).toBe(7.77);
    expect(Number(expFueraPost!.saldoPendiente)).toBe(107.77);
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

    // Restaurar la regla activa original en lugar de crear una fila nueva
    if (originalActiveRuleId) {
      await prisma.reglaMora.update({
        where: { idRegla: originalActiveRuleId },
        data: { activa: true },
      });
    }
  });
});
