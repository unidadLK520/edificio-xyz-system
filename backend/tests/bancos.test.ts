// backend/tests/bancos.test.ts
// US1.4 (Paso 6): Pruebas de integración para Cuentas Bancarias y Movimientos Bancarios

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { hash } from 'bcryptjs';
import { prisma } from '@edificio-xyz/database';
import { app } from '../src/index';
import { generarTokenPrueba } from './setup';
import { limpiar } from './test.helpers';

describe('US1.4 Cuentas y Movimientos Bancarios (/api/v1/cuentas-bancarias, /api/v1/movimientos-bancarios)', () => {
  const createdCuentaIds: number[] = [];
  const createdMovBancarioIds: number[] = [];
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

    const adminUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-adm-ban-${ts}`,
        correo: `tst-adm-ban-${ts}@edificioxyz.com`,
        passwordHash,
        idRol: getRolId('Administrador'),
        activo: true,
      },
    });
    createdUserIds.push(adminUser.idUsuario);
    adminUserId = adminUser.idUsuario;

    const dirUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-dir-ban-${ts}`,
        correo: `tst-dir-ban-${ts}@edificioxyz.com`,
        passwordHash,
        idRol: getRolId('Directorio'),
        activo: true,
      },
    });
    createdUserIds.push(dirUser.idUsuario);

    const conUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-con-ban-${ts}`,
        correo: `tst-con-ban-${ts}@edificioxyz.com`,
        passwordHash,
        idRol: getRolId('Consulta'),
        activo: true,
      },
    });
    createdUserIds.push(conUser.idUsuario);

    const copUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-cop-ban-${ts}`,
        correo: `tst-cop-ban-${ts}@edificioxyz.com`,
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
        movimientosBancarios: createdMovBancarioIds,
        cuentasBancarias: createdCuentaIds,
        usuarios: createdUserIds,
      });
    } catch (err: any) {
      console.error('❌ [afterAll bancos.test.ts] Error limpiando datos:', err.message);
      throw err;
    }
  }, 60000);

  // ===========================================================================
  // 1. Cuentas Bancarias (/api/v1/cuentas-bancarias)
  // ===========================================================================
  describe('Cuentas Bancarias (/cuentas-bancarias)', () => {
    let testCuentaId: number;
    const testNumCuenta = `TST-CTA-${Date.now().toString().slice(-6)}`;

    it('debe registrar una cuenta bancaria con saldo_inicial (POST 201)', async () => {
      const res = await request(app)
        .post('/api/v1/cuentas-bancarias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          banco: 'TST-Banco Bisa',
          numeroCuenta: testNumCuenta,
          tipoCuenta: 'Cuenta de Ahorros',
          saldoInicial: 10000.00,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.idCuenta).toBeDefined();
      expect(res.body.data.numeroCuenta).toBe(testNumCuenta);
      expect(res.body.data.saldoInicial).toBe(10000);
      expect(res.body.data.saldoCalculado).toBe(10000);
      testCuentaId = res.body.data.idCuenta;
      createdCuentaIds.push(testCuentaId);

      // Verificar auditoría
      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'cuentas_bancarias',
          accion: 'CONFIGURAR_CUENTA_BANCARIA',
          idRegistro: testCuentaId.toString(),
        },
      });
      expect(audit).toBeDefined();
      expect(audit?.idUsuario).toBe(adminUserId);
    });

    it('debe responder 409 si se intenta registrar el mismo número de cuenta', async () => {
      const res = await request(app)
        .post('/api/v1/cuentas-bancarias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          banco: 'TST-Banco Repetido',
          numeroCuenta: testNumCuenta,
          saldoInicial: 5000,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Conflict');
    });

    it('debe calcular dinámicamente el saldo en GET / y GET /:id', async () => {
      // Registrar un depósito de 3000 y un retiro de 1000
      const resDep = await request(app)
        .post('/api/v1/movimientos-bancarios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idCuenta: testCuentaId,
          tipo: 'Deposito',
          monto: 3000,
          concepto: 'TST-Deposito prueba saldo',
          fecha: '2092-01-10T10:00:00.000Z',
        });
      expect(resDep.status).toBe(201);
      createdMovBancarioIds.push(resDep.body.data.idMovBancario);

      const resRet = await request(app)
        .post('/api/v1/movimientos-bancarios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idCuenta: testCuentaId,
          tipo: 'Retiro',
          monto: 1000,
          concepto: 'TST-Retiro prueba saldo',
          fecha: '2092-01-15T11:00:00.000Z',
        });
      expect(resRet.status).toBe(201);
      createdMovBancarioIds.push(resRet.body.data.idMovBancario);

      // Saldo esperado: 10000 (inicial) + 3000 (depósito) - 1000 (retiro) = 12000
      const resGet = await request(app)
        .get(`/api/v1/cuentas-bancarias/${testCuentaId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resGet.status).toBe(200);
      expect(resGet.body.data.saldoCalculado).toBe(12000);
      expect(resGet.body.data.totalDepositos).toBe(3000);
      expect(resGet.body.data.totalRetiros).toBe(1000);
    });

    it('debe devolver 409 en PUT si el nuevo número de cuenta ya existe', async () => {
      // Crear otra cuenta
      const numCuenta2 = `TST-CTA2-${Date.now().toString().slice(-6)}`;
      const resOtra = await request(app)
        .post('/api/v1/cuentas-bancarias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          banco: 'TST-Banco Nacional',
          numeroCuenta: numCuenta2,
          saldoInicial: 500,
        });
      const idOtra = resOtra.body.data.idCuenta;
      createdCuentaIds.push(idOtra);

      // Intentar cambiar numeroCuenta de testCuentaId a numCuenta2 -> 409
      const resConflict = await request(app)
        .put(`/api/v1/cuentas-bancarias/${testCuentaId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ numeroCuenta: numCuenta2 });

      expect(resConflict.status).toBe(409);
    });

    it('debe calcular saldo de período en GET /:id/saldo?desde&hasta', async () => {
      const resSaldo = await request(app)
        .get(`/api/v1/cuentas-bancarias/${testCuentaId}/saldo?desde=2092-01-01&hasta=2092-01-31`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resSaldo.status).toBe(200);
      expect(resSaldo.body.data.totalDepositos).toBe(3000);
      expect(resSaldo.body.data.totalRetiros).toBe(1000);
      expect(resSaldo.body.data.saldoFinal).toBe(12000);
      expect(resSaldo.body.data.saldoDisponibleActual).toBe(12000);
    });

    it('debe permitir lectura a Directorio (200) y denegar escritura con 403', async () => {
      const resRead = await request(app)
        .get(`/api/v1/cuentas-bancarias/${testCuentaId}`)
        .set('Authorization', `Bearer ${directorioToken}`);
      expect(resRead.status).toBe(200);

      const resWrite = await request(app)
        .post('/api/v1/cuentas-bancarias')
        .set('Authorization', `Bearer ${directorioToken}`)
        .send({
          banco: 'TST-Banco 403',
          numeroCuenta: `TST-403-${Date.now()}`,
        });
      expect(resWrite.status).toBe(403);
    });

    it('debe denegar lectura y escritura a Copropietario y Consulta con 403', async () => {
      const resCop = await request(app)
        .get('/api/v1/cuentas-bancarias')
        .set('Authorization', `Bearer ${copropietarioToken}`);
      expect(resCop.status).toBe(403);

      const resCon = await request(app)
        .get('/api/v1/cuentas-bancarias')
        .set('Authorization', `Bearer ${consultaToken}`);
      expect(resCon.status).toBe(403);
    });
  });

  // ===========================================================================
  // 2. Movimientos Bancarios (/api/v1/movimientos-bancarios)
  // ===========================================================================
  describe('Movimientos Bancarios (/movimientos-bancarios)', () => {
    let cuentaPruebaId: number;
    let movPendienteId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/cuentas-bancarias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          banco: 'TST-Banco BNB',
          numeroCuenta: `TST-BNB-${Date.now().toString().slice(-6)}`,
          saldoInicial: 5000,
        });
      cuentaPruebaId = res.body.data.idCuenta;
      createdCuentaIds.push(cuentaPruebaId);
    });

    it('debe registrar un movimiento bancario Pendiente (POST 201) y auditarlo', async () => {
      const res = await request(app)
        .post('/api/v1/movimientos-bancarios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idCuenta: cuentaPruebaId,
          tipo: 'Deposito',
          monto: 850,
          concepto: 'TST-Deposito transferencia expensa',
          referencia: 'TST-REF-001',
          fecha: '2092-02-10T12:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tipo).toBe('Deposito');
      expect(res.body.data.estadoConciliacion).toBe('Pendiente');
      expect(res.body.data.conciliado).toBe(false);
      movPendienteId = res.body.data.idMovBancario;
      createdMovBancarioIds.push(movPendienteId);

      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'movimientos_bancarios',
          accion: 'REGISTRO_MOVIMIENTO_BANCARIO',
          idRegistro: movPendienteId.toString(),
        },
      });
      expect(audit).toBeDefined();
    });

    it('debe filtrar movimientos por estado, tipo y cuenta en GET', async () => {
      const res = await request(app)
        .get(`/api/v1/movimientos-bancarios?idCuenta=${cuentaPruebaId}&estado=Pendiente&tipo=Deposito`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].estadoConciliacion).toBe('Pendiente');
    });

    it('debe permitir modificar un movimiento no conciliado (PUT 200)', async () => {
      const res = await request(app)
        .put(`/api/v1/movimientos-bancarios/${movPendienteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          concepto: 'TST-Deposito corregido',
          monto: 900,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.concepto).toBe('TST-Deposito corregido');
      expect(res.body.data.monto).toBe(900);

      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'movimientos_bancarios',
          accion: 'MODIFICACION_MOVIMIENTO_BANCARIO',
          idRegistro: movPendienteId.toString(),
        },
      });
      expect(audit).toBeDefined();
    });

    it('debe responder 409 al intentar modificar un movimiento ya conciliado', async () => {
      // Marcar temporalmente como conciliado
      await prisma.movimientoBancario.update({
        where: { idMovBancario: movPendienteId },
        data: { conciliado: true, estadoConciliacion: 'Conciliado' },
      });

      const res = await request(app)
        .put(`/api/v1/movimientos-bancarios/${movPendienteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ monto: 1200 });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Conflict');

      // Revertir a pendiente
      await prisma.movimientoBancario.update({
        where: { idMovBancario: movPendienteId },
        data: { conciliado: false, estadoConciliacion: 'Pendiente' },
      });
    });

    it('debe denegar escritura a Directorio y Consulta con 403', async () => {
      const resDir = await request(app)
        .post('/api/v1/movimientos-bancarios')
        .set('Authorization', `Bearer ${directorioToken}`)
        .send({
          idCuenta: cuentaPruebaId,
          tipo: 'Retiro',
          monto: 100,
          concepto: 'TST-Retiro 403',
        });
      expect(resDir.status).toBe(403);

      const resCon = await request(app)
        .get('/api/v1/movimientos-bancarios')
        .set('Authorization', `Bearer ${consultaToken}`);
      expect(resCon.status).toBe(403);
    });
  });
});
