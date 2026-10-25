// backend/tests/conciliacion.test.ts
// US1.4 (Paso 6): Pruebas de integración para Conciliación Bancaria y Cotejo

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { hash } from 'bcryptjs';
import { prisma } from '@edificio-xyz/database';
import { app } from '../src/index';
import { generarTokenPrueba } from './setup';
import { limpiar } from './test.helpers';

describe('US1.4 Conciliación Bancaria (/api/v1/conciliacion)', () => {
  const createdCuentaIds: number[] = [];
  const createdMovBancarioIds: number[] = [];
  const createdMovimientoIds: number[] = [];
  const createdCategoriaIds: number[] = [];
  const createdUserIds: number[] = [];

  let adminToken: string;
  let directorioToken: string;
  let consultaToken: string;
  let copropietarioToken: string;

  let adminUserId: number;
  let testCuentaId: number;
  let catIngresoId: number;
  let catEgresoId: number;

  beforeAll(async () => {
    const roles = await prisma.rol.findMany();
    const getRolId = (nombre: string) => roles.find((r) => r.nombre === nombre)?.idRol || 1;

    const passwordHash = await hash('Password123!', 10);
    const ts = Date.now().toString().slice(-5);

    const adminUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-adm-cnc-${ts}`,
        correo: `tst-adm-cnc-${ts}@edificioxyz.com`,
        passwordHash,
        idRol: getRolId('Administrador'),
        activo: true,
      },
    });
    createdUserIds.push(adminUser.idUsuario);
    adminUserId = adminUser.idUsuario;

    const dirUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-dir-cnc-${ts}`,
        correo: `tst-dir-cnc-${ts}@edificioxyz.com`,
        passwordHash,
        idRol: getRolId('Directorio'),
        activo: true,
      },
    });
    createdUserIds.push(dirUser.idUsuario);

    const conUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-con-cnc-${ts}`,
        correo: `tst-con-cnc-${ts}@edificioxyz.com`,
        passwordHash,
        idRol: getRolId('Consulta'),
        activo: true,
      },
    });
    createdUserIds.push(conUser.idUsuario);

    const copUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-cop-cnc-${ts}`,
        correo: `tst-cop-cnc-${ts}@edificioxyz.com`,
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

    // Cuenta bancaria de prueba
    const cuenta = await prisma.cuentaBancaria.create({
      data: {
        banco: 'TST-Banco Union',
        numeroCuenta: `TST-UNION-${ts}`,
        saldoInicial: 10000,
        saldoActual: 10000,
      },
    });
    testCuentaId = cuenta.idCuenta;
    createdCuentaIds.push(testCuentaId);

    // Categorías de movimiento de prueba
    const catIng = await prisma.categoriaMovimiento.create({
      data: { nombre: `TST-Ing-Conc-${ts}`, tipo: 'Ingreso' },
    });
    catIngresoId = catIng.idCategoria;
    createdCategoriaIds.push(catIngresoId);

    const catEgr = await prisma.categoriaMovimiento.create({
      data: { nombre: `TST-Egr-Conc-${ts}`, tipo: 'Egreso' },
    });
    catEgresoId = catEgr.idCategoria;
    createdCategoriaIds.push(catEgresoId);
  }, 60000);

  afterAll(async () => {
    try {
      await limpiar({
        movimientosBancarios: createdMovBancarioIds,
        movimientos: createdMovimientoIds,
        cuentasBancarias: createdCuentaIds,
        categoriasMovimiento: createdCategoriaIds,
        usuarios: createdUserIds,
      });
    } catch (err: any) {
      console.error('❌ [afterAll conciliacion.test.ts] Error limpiando datos:', err.message);
      throw err;
    }
  }, 60000);

  // ---------------------------------------------------------------------------
  // 1. Cotejo y sugerencias automáticas
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/conciliacion/cotejo', () => {
    it('debe devolver movimientos bancarios e internos con sugerencia automática (±3 días, mismo monto y naturaleza)', async () => {
      // 1. Crear movimiento bancario Deposito 750 el 2093-04-10
      const movBan = await prisma.movimientoBancario.create({
        data: {
          idCuenta: testCuentaId,
          tipo: 'Deposito',
          monto: 750.00,
          concepto: 'TST-Deposito para sugerencia',
          fecha: new Date('2093-04-10T10:00:00.000Z'),
          estadoConciliacion: 'Pendiente',
          conciliado: false,
          idUsuarioRegistro: adminUserId,
        },
      });
      createdMovBancarioIds.push(movBan.idMovBancario);

      // 2. Crear movimiento interno Ingreso 750 el 2093-04-11 (1 día de diferencia)
      const movInt = await prisma.movimiento.create({
        data: {
          tipo: 'Ingreso',
          idCategoria: catIngresoId,
          monto: 750.00,
          descripcion: 'TST-Ingreso interno para sugerencia',
          fecha: new Date('2093-04-11T12:00:00.000Z'),
          idUsuarioRegistro: adminUserId,
          anulado: false,
        },
      });
      createdMovimientoIds.push(movInt.idMovimiento);

      const res = await request(app)
        .get(`/api/v1/conciliacion/cotejo?idCuenta=${testCuentaId}&desde=2093-04-01&hasta=2093-04-30`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const mbEncontrado = res.body.data.movimientosBancarios.find(
        (m: any) => m.idMovBancario === movBan.idMovBancario
      );
      expect(mbEncontrado).toBeDefined();
      expect(mbEncontrado.sugerencia).toBeDefined();
      expect(mbEncontrado.sugerencia.idMovimiento).toBe(movInt.idMovimiento);
      expect(mbEncontrado.sugerencia.monto).toBe(750);
      expect(mbEncontrado.sugerencia.diferenciaDias).toBeLessThanOrEqual(3);
    });

    it('permite consulta a Directorio (200) y deniega a Copropietario con 403', async () => {
      const resDir = await request(app)
        .get(`/api/v1/conciliacion/cotejo?idCuenta=${testCuentaId}`)
        .set('Authorization', `Bearer ${directorioToken}`);
      expect(resDir.status).toBe(200);

      const resCop = await request(app)
        .get(`/api/v1/conciliacion/cotejo?idCuenta=${testCuentaId}`)
        .set('Authorization', `Bearer ${copropietarioToken}`);
      expect(resCop.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Vinculación y Reglas de Conciliación (POST /vincular)
  // ---------------------------------------------------------------------------
  describe('POST /api/v1/conciliacion/vincular', () => {
    it('debe vincular con coincidencia exacta (montos iguales -> Conciliado, diferencia 0) y auditar', async () => {
      const mb = await prisma.movimientoBancario.create({
        data: {
          idCuenta: testCuentaId,
          tipo: 'Deposito',
          monto: 400.00,
          concepto: 'TST-Deposito exacto',
          fecha: new Date('2093-05-01T10:00:00.000Z'),
          idUsuarioRegistro: adminUserId,
        },
      });
      createdMovBancarioIds.push(mb.idMovBancario);

      const mi = await prisma.movimiento.create({
        data: {
          tipo: 'Ingreso',
          idCategoria: catIngresoId,
          monto: 400.00,
          descripcion: 'TST-Ingreso exacto',
          fecha: new Date('2093-05-01T11:00:00.000Z'),
          idUsuarioRegistro: adminUserId,
          anulado: false,
        },
      });
      createdMovimientoIds.push(mi.idMovimiento);

      const res = await request(app)
        .post('/api/v1/conciliacion/vincular')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idMovBancario: mb.idMovBancario,
          idMovimiento: mi.idMovimiento,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.estadoConciliacion).toBe('Conciliado');
      expect(res.body.data.conciliado).toBe(true);
      expect(res.body.data.diferencia).toBe(0);
      expect(res.body.data.idMovimiento).toBe(mi.idMovimiento);

      // Verificar auditoría
      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'movimientos_bancarios',
          accion: 'CONCILIACION_VINCULAR',
          idRegistro: mb.idMovBancario.toString(),
        },
      });
      expect(audit).toBeDefined();
      expect(audit?.idUsuario).toBe(adminUserId);
    });

    it('debe vincular con discrepancia (montos distintos -> Discrepancia con diferencia = banco - interno)', async () => {
      const mb = await prisma.movimientoBancario.create({
        data: {
          idCuenta: testCuentaId,
          tipo: 'Retiro',
          monto: 250.00,
          concepto: 'TST-Retiro con discrepancia',
          fecha: new Date('2093-05-05T10:00:00.000Z'),
          idUsuarioRegistro: adminUserId,
        },
      });
      createdMovBancarioIds.push(mb.idMovBancario);

      const mi = await prisma.movimiento.create({
        data: {
          tipo: 'Egreso',
          idCategoria: catEgresoId,
          monto: 230.00, // Diferencia de +20
          descripcion: 'TST-Egreso interno menor',
          fecha: new Date('2093-05-05T12:00:00.000Z'),
          idUsuarioRegistro: adminUserId,
          anulado: false,
        },
      });
      createdMovimientoIds.push(mi.idMovimiento);

      const res = await request(app)
        .post('/api/v1/conciliacion/vincular')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idMovBancario: mb.idMovBancario,
          idMovimiento: mi.idMovimiento,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.estadoConciliacion).toBe('Discrepancia');
      expect(res.body.data.conciliado).toBe(false);
      expect(res.body.data.diferencia).toBe(20);
    });

    it('debe responder 422 si las naturalezas son incompatibles (Deposito con Egreso)', async () => {
      const mb = await prisma.movimientoBancario.create({
        data: {
          idCuenta: testCuentaId,
          tipo: 'Deposito',
          monto: 100.00,
          concepto: 'TST-Deposito incompatible',
          idUsuarioRegistro: adminUserId,
        },
      });
      createdMovBancarioIds.push(mb.idMovBancario);

      const mi = await prisma.movimiento.create({
        data: {
          tipo: 'Egreso',
          idCategoria: catEgresoId,
          monto: 100.00,
          descripcion: 'TST-Egreso incompatible',
          idUsuarioRegistro: adminUserId,
          anulado: false,
        },
      });
      createdMovimientoIds.push(mi.idMovimiento);

      const res = await request(app)
        .post('/api/v1/conciliacion/vincular')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idMovBancario: mb.idMovBancario,
          idMovimiento: mi.idMovimiento,
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('Unprocessable Entity');
    });

    it('debe responder 422 si el movimiento interno está anulado', async () => {
      const mb = await prisma.movimientoBancario.create({
        data: {
          idCuenta: testCuentaId,
          tipo: 'Deposito',
          monto: 150.00,
          concepto: 'TST-Deposito con interno anulado',
          idUsuarioRegistro: adminUserId,
        },
      });
      createdMovBancarioIds.push(mb.idMovBancario);

      const miAnulado = await prisma.movimiento.create({
        data: {
          tipo: 'Ingreso',
          idCategoria: catIngresoId,
          monto: 150.00,
          descripcion: 'TST-Ingreso anulado',
          idUsuarioRegistro: adminUserId,
          anulado: true,
          fechaAnulacion: new Date(),
          motivoAnulacion: 'TST-Anulado',
        },
      });
      createdMovimientoIds.push(miAnulado.idMovimiento);

      const res = await request(app)
        .post('/api/v1/conciliacion/vincular')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idMovBancario: mb.idMovBancario,
          idMovimiento: miAnulado.idMovimiento,
        });

      expect(res.status).toBe(422);
    });

    it('debe responder 409 si alguno ya está conciliado o el interno ya está vinculado a otro', async () => {
      // 1. Bancario ya conciliado
      const mbConciliado = await prisma.movimientoBancario.create({
        data: {
          idCuenta: testCuentaId,
          tipo: 'Deposito',
          monto: 200,
          concepto: 'TST-Bancario ya conciliado',
          conciliado: true,
          estadoConciliacion: 'Conciliado',
          idUsuarioRegistro: adminUserId,
        },
      });
      createdMovBancarioIds.push(mbConciliado.idMovBancario);

      const miLibre = await prisma.movimiento.create({
        data: {
          tipo: 'Ingreso',
          idCategoria: catIngresoId,
          monto: 200,
          descripcion: 'TST-Interno libre',
          idUsuarioRegistro: adminUserId,
          anulado: false,
        },
      });
      createdMovimientoIds.push(miLibre.idMovimiento);

      const resBanYaConc = await request(app)
        .post('/api/v1/conciliacion/vincular')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idMovBancario: mbConciliado.idMovBancario,
          idMovimiento: miLibre.idMovimiento,
        });
      expect(resBanYaConc.status).toBe(409);

      // 2. Interno ya vinculado a otro movimiento bancario
      const mb1 = await prisma.movimientoBancario.create({
        data: {
          idCuenta: testCuentaId,
          tipo: 'Deposito',
          monto: 200,
          concepto: 'TST-Bancario 1',
          idMovimiento: miLibre.idMovimiento,
          estadoConciliacion: 'Discrepancia',
          conciliado: false,
          idUsuarioRegistro: adminUserId,
        },
      });
      createdMovBancarioIds.push(mb1.idMovBancario);

      const mb2 = await prisma.movimientoBancario.create({
        data: {
          idCuenta: testCuentaId,
          tipo: 'Deposito',
          monto: 200,
          concepto: 'TST-Bancario 2 intenta vincular mismo interno',
          idUsuarioRegistro: adminUserId,
        },
      });
      createdMovBancarioIds.push(mb2.idMovBancario);

      const resIntYaVinculado = await request(app)
        .post('/api/v1/conciliacion/vincular')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idMovBancario: mb2.idMovBancario,
          idMovimiento: miLibre.idMovimiento,
        });
      expect(resIntYaVinculado.status).toBe(409);
    });

    it('debe denegar POST /vincular a Directorio con 403', async () => {
      const res = await request(app)
        .post('/api/v1/conciliacion/vincular')
        .set('Authorization', `Bearer ${directorioToken}`)
        .send({ idMovBancario: 99999, idMovimiento: 99999 });

      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Desvinculación (DELETE /desvincular/:idMovBancario)
  // ---------------------------------------------------------------------------
  describe('DELETE /api/v1/conciliacion/desvincular/:idMovBancario', () => {
    it('debe revertir a Pendiente y auditar la desvinculación (200)', async () => {
      const mb = await prisma.movimientoBancario.create({
        data: {
          idCuenta: testCuentaId,
          tipo: 'Deposito',
          monto: 600,
          concepto: 'TST-Para desvincular',
          conciliado: true,
          estadoConciliacion: 'Conciliado',
          diferencia: 0,
          idUsuarioRegistro: adminUserId,
        },
      });
      createdMovBancarioIds.push(mb.idMovBancario);

      const res = await request(app)
        .delete(`/api/v1/conciliacion/desvincular/${mb.idMovBancario}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.estadoConciliacion).toBe('Pendiente');
      expect(res.body.data.idMovimiento).toBeNull();
      expect(res.body.data.diferencia).toBeNull();

      // Verificar auditoría
      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'movimientos_bancarios',
          accion: 'CONCILIACION_DESVINCULAR',
          idRegistro: mb.idMovBancario.toString(),
        },
      });
      expect(audit).toBeDefined();
      expect(audit?.idUsuario).toBe(adminUserId);
    });

    it('debe denegar desvinculación a Directorio con 403', async () => {
      const res = await request(app)
        .delete('/api/v1/conciliacion/desvincular/9001')
        .set('Authorization', `Bearer ${directorioToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Resumen de estado de conciliación (GET /estado)
  // ---------------------------------------------------------------------------
  describe('GET /api/v1/conciliacion/estado', () => {
    it('debe totalizar correctamente conciliados, pendientes y discrepancias', async () => {
      const res = await request(app)
        .get(`/api/v1/conciliacion/estado?idCuenta=${testCuentaId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.conciliados).toBeDefined();
      expect(res.body.data.pendientes).toBeDefined();
      expect(res.body.data.discrepancias).toBeDefined();
    });

    it('permite consulta de estado a Directorio (200) y deniega a Consulta con 403', async () => {
      const resDir = await request(app)
        .get('/api/v1/conciliacion/estado')
        .set('Authorization', `Bearer ${directorioToken}`);
      expect(resDir.status).toBe(200);

      const resCon = await request(app)
        .get('/api/v1/conciliacion/estado')
        .set('Authorization', `Bearer ${consultaToken}`);
      expect(resCon.status).toBe(403);
    });
  });
});
