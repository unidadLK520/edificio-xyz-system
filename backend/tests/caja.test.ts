// backend/tests/caja.test.ts
// US1.4 (Paso 6): Pruebas de integración para el módulo de Caja Chica / Efectivo

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { hash } from 'bcryptjs';
import { prisma } from '@edificio-xyz/database';
import { app } from '../src/index';
import { generarTokenPrueba } from './setup';
import { limpiar } from './test.helpers';

describe('US1.4 Caja Chica (/api/v1/caja)', () => {
  const createdCajaIds: number[] = [];
  const createdUserIds: number[] = [];

  let adminToken: string;
  let directorioToken: string;
  let consultaToken: string;
  let copropietarioToken: string;

  let adminUserId: number;

  beforeAll(async () => {
    const roles = await prisma.rol.findMany();
    const getRolId = (nombre: string) => roles.find((r) => r.nombre === nombre)?.idRol || 1;

    const passwordHash = await hash('Password123!', 10);
    const ts = Date.now().toString().slice(-5);

    // 1. Usuarios de prueba TST-
    const adminUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-adm-caja-${ts}`,
        correo: `tst-adm-caja-${ts}@edificioxyz.com`,
        passwordHash,
        idRol: getRolId('Administrador'),
        activo: true,
      },
    });
    createdUserIds.push(adminUser.idUsuario);
    adminUserId = adminUser.idUsuario;

    const dirUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-dir-caja-${ts}`,
        correo: `tst-dir-caja-${ts}@edificioxyz.com`,
        passwordHash,
        idRol: getRolId('Directorio'),
        activo: true,
      },
    });
    createdUserIds.push(dirUser.idUsuario);

    const conUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-con-caja-${ts}`,
        correo: `tst-con-caja-${ts}@edificioxyz.com`,
        passwordHash,
        idRol: getRolId('Consulta'),
        activo: true,
      },
    });
    createdUserIds.push(conUser.idUsuario);

    const copUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-cop-caja-${ts}`,
        correo: `tst-cop-caja-${ts}@edificioxyz.com`,
        passwordHash,
        idRol: getRolId('Copropietario'),
        activo: true,
      },
    });
    createdUserIds.push(copUser.idUsuario);

    adminToken = await generarTokenPrueba(adminUser.idUsuario, adminUser.correo, 'Administrador');
    directorioToken = await generarTokenPrueba(dirUser.idUsuario, dirUser.correo, 'Directorio');
    consultaToken = await generarTokenPrueba(conUser.idUsuario, conUser.correo, 'Consulta');
    copropietarioToken = await generarTokenPrueba(copUser.idUsuario, copUser.correo, 'Copropietario');
  }, 60000);

  afterAll(async () => {
    try {
      await limpiar({
        caja: createdCajaIds,
        usuarios: createdUserIds,
      });
    } catch (err: any) {
      console.error('❌ [afterAll caja.test.ts] Error limpiando datos:', err.message);
      throw err;
    }
  }, 60000);

  // ---------------------------------------------------------------------------
  // 1. Alta de movimiento de caja
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/caja', () => {
    it('debe registrar un Ingreso de caja con éxito (201)', async () => {
      const res = await request(app)
        .post('/api/v1/caja')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipo: 'Ingreso',
          monto: 350.50,
          concepto: `TST-Cobro alquiler parrillero ${Date.now().toString().slice(-4)}`,
          fecha: '2090-05-10T14:30:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.tipo).toBe('Ingreso');
      expect(Number(res.body.data.monto)).toBe(350.50);
      expect(res.body.data.anulado).toBe(false);
      createdCajaIds.push(res.body.data.idMovimientoCaja);

      // Verificar auditoría
      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'caja',
          accion: 'REGISTRO_MOVIMIENTO_CAJA',
          idRegistro: res.body.data.idMovimientoCaja.toString(),
        },
      });
      expect(audit).toBeDefined();
      expect(audit?.idUsuario).toBe(adminUserId);
    });

    it('debe registrar un Egreso de caja con éxito (201)', async () => {
      const res = await request(app)
        .post('/api/v1/caja')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipo: 'Egreso',
          monto: 120.00,
          concepto: `TST-Compra candado de emergencia ${Date.now().toString().slice(-4)}`,
          fecha: '2090-05-12T09:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.tipo).toBe('Egreso');
      expect(Number(res.body.data.monto)).toBe(120.00);
      createdCajaIds.push(res.body.data.idMovimientoCaja);
    });

    it('debe responder 400 con details ante datos inválidos', async () => {
      const res = await request(app)
        .post('/api/v1/caja')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipo: 'Invalido',
          monto: -50,
          concepto: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.details).toBeDefined();
      expect(res.body.details.tipo).toBeDefined();
      expect(res.body.details.monto).toBeDefined();
      expect(res.body.details.concepto).toBeDefined();
      expect(res.body.details.fecha).toBeDefined();
    });

    it('debe denegar POST a Directorio con 403', async () => {
      const res = await request(app)
        .post('/api/v1/caja')
        .set('Authorization', `Bearer ${directorioToken}`)
        .send({
          tipo: 'Ingreso',
          monto: 100,
          concepto: 'TST-Prueba 403',
          fecha: '2090-05-10T10:00:00.000Z',
        });

      expect(res.status).toBe(403);
    });

    it('debe denegar POST a Copropietario con 403', async () => {
      const res = await request(app)
        .post('/api/v1/caja')
        .set('Authorization', `Bearer ${copropietarioToken}`)
        .send({
          tipo: 'Ingreso',
          monto: 100,
          concepto: 'TST-Prueba 403',
          fecha: '2090-05-10T10:00:00.000Z',
        });

      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Saldo recalculado del período y disponible
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/caja/saldo', () => {
    it('debe calcular correctamente saldoInicial, totalIngresos, totalEgresos y saldoFinal', async () => {
      // Creamos dos movimientos en período 2091
      const resIng = await request(app)
        .post('/api/v1/caja')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipo: 'Ingreso',
          monto: 500,
          concepto: 'TST-Ingreso saldo 2091',
          fecha: '2091-03-01T10:00:00.000Z',
        });
      createdCajaIds.push(resIng.body.data.idMovimientoCaja);

      const resEgr = await request(app)
        .post('/api/v1/caja')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipo: 'Egreso',
          monto: 150,
          concepto: 'TST-Egreso saldo 2091',
          fecha: '2091-03-15T10:00:00.000Z',
        });
      createdCajaIds.push(resEgr.body.data.idMovimientoCaja);

      const resSaldo = await request(app)
        .get('/api/v1/caja/saldo?desde=2091-03-01&hasta=2091-03-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resSaldo.status).toBe(200);
      expect(resSaldo.body.success).toBe(true);
      const data = resSaldo.body.data;
      expect(data.totalIngresos).toBe(500);
      expect(data.totalEgresos).toBe(150);
      expect(data.saldoFinal).toBe(data.saldoInicial + 500 - 150);
      expect(data.saldoDisponibleActual).toBeGreaterThanOrEqual(350);
    });

    it('permite consulta a Directorio (200)', async () => {
      const res = await request(app)
        .get('/api/v1/caja/saldo?desde=2091-03-01&hasta=2091-03-31')
        .set('Authorization', `Bearer ${directorioToken}`);

      expect(res.status).toBe(200);
    });

    it('deniega consulta a Consulta y Copropietario con 403', async () => {
      const resCon = await request(app)
        .get('/api/v1/caja/saldo')
        .set('Authorization', `Bearer ${consultaToken}`);
      expect(resCon.status).toBe(403);

      const resCop = await request(app)
        .get('/api/v1/caja/saldo')
        .set('Authorization', `Bearer ${copropietarioToken}`);
      expect(resCop.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Listado paginado y filtros
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/caja', () => {
    it('debe filtrar movimientos por tipo y rango de fechas', async () => {
      const res = await request(app)
        .get('/api/v1/caja?tipo=Ingreso&desde=2091-01-01&hasta=2091-12-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const item of res.body.data) {
        expect(item.tipo).toBe('Ingreso');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Anulación de movimiento de caja
  // ---------------------------------------------------------------------------
  describe('DELETE /api/v1/caja/:id (Anulación lógica)', () => {
    it('debe anular con motivo obligatorio y registrar auditoría (200)', async () => {
      const resCreate = await request(app)
        .post('/api/v1/caja')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipo: 'Egreso',
          monto: 80,
          concepto: 'TST-Egreso a anular',
          fecha: '2090-06-01T10:00:00.000Z',
        });
      const idParaAnular = resCreate.body.data.idMovimientoCaja;
      createdCajaIds.push(idParaAnular);

      // Anulación sin motivo -> 400
      const resSinMotivo = await request(app)
        .delete(`/api/v1/caja/${idParaAnular}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(resSinMotivo.status).toBe(400);

      // Anulación con motivo -> 200
      const resAnular = await request(app)
        .delete(`/api/v1/caja/${idParaAnular}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivo: 'TST-Error en la factura de compra' });

      expect(resAnular.status).toBe(200);
      expect(resAnular.body.data.anulado).toBe(true);
      expect(resAnular.body.data.motivoAnulacion).toBe('TST-Error en la factura de compra');
      expect(resAnular.body.data.idUsuarioAnulacion).toBe(adminUserId);

      // Intento de re-anulación -> 409
      const resReanular = await request(app)
        .delete(`/api/v1/caja/${idParaAnular}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ motivo: 'TST-Segundo intento' });
      expect(resReanular.status).toBe(409);

      // Verificar que el movimiento anulado NO se suma al saldo recalculado
      const resSaldo = await request(app)
        .get('/api/v1/caja/saldo?desde=2090-06-01&hasta=2090-06-30')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resSaldo.body.data.totalEgresos).toBe(0);

      // Verificar auditoría
      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'caja',
          accion: 'ANULACION_MOVIMIENTO_CAJA',
          idRegistro: idParaAnular.toString(),
        },
      });
      expect(audit).toBeDefined();
      expect(audit?.idUsuario).toBe(adminUserId);
    });

    it('debe denegar anulación a Directorio con 403', async () => {
      const res = await request(app)
        .delete('/api/v1/caja/9001')
        .set('Authorization', `Bearer ${directorioToken}`)
        .send({ motivo: 'TST-Directorio anula' });

      expect(res.status).toBe(403);
    });
  });
});
