// backend/tests/auditoria_consulta.test.ts
// Tests para endpoints de consulta de auditoría: GET /api/v1/auditoria y GET /api/v1/auditoria/:id

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '@edificio-xyz/database';
import { app } from '../src/index';
import { generarTokenPrueba } from './setup';

describe('Consulta de Auditoría (GET /api/v1/auditoria y GET /:id)', () => {
  let adminToken: string;
  let directorioToken: string;
  let consultaToken: string;
  let idUsuarioAdmin: number;
  let idAuditoriaCreada: number;

  const cleanupAuditoriaIds: bigint[] = [];

  beforeAll(async () => {
    // 1. Obtener o crear usuarios con roles Administrador, Directorio y Consulta
    const adminUser = await prisma.usuario.findFirst({
      where: { rol: { nombre: 'Administrador' } },
    });
    idUsuarioAdmin = adminUser!.idUsuario;
    adminToken = await generarTokenPrueba(idUsuarioAdmin, adminUser!.correo, 'Administrador');

    const rolDir = await prisma.rol.upsert({
      where: { nombre: 'Directorio' },
      update: {},
      create: { nombre: 'Directorio', descripcion: 'Directorio' },
    });
    const dirUser = await prisma.usuario.upsert({
      where: { correo: 'directorio_auditoria@test.com' },
      update: {},
      create: {
        nombreUsuario: 'dir_audit',
        correo: 'directorio_auditoria@test.com',
        passwordHash: '$2a$10$dummy',
        idRol: rolDir.idRol,
      },
    });
    directorioToken = await generarTokenPrueba(dirUser.idUsuario, dirUser.correo, 'Directorio');

    const rolCons = await prisma.rol.upsert({
      where: { nombre: 'Consulta' },
      update: {},
      create: { nombre: 'Consulta', descripcion: 'Consulta' },
    });
    const consUser = await prisma.usuario.upsert({
      where: { correo: 'consulta_auditoria@test.com' },
      update: {},
      create: {
        nombreUsuario: 'cons_audit',
        correo: 'consulta_auditoria@test.com',
        passwordHash: '$2a$10$dummy',
        idRol: rolCons.idRol,
      },
    });
    consultaToken = await generarTokenPrueba(consUser.idUsuario, consUser.correo, 'Consulta');

    // 2. Crear registros de prueba en edificio.auditoria con datos sensibles para verificar filtros y enmascaramiento
    const audit1 = await prisma.auditoria.create({
      data: {
        tablaAfectada: 'usuarios',
        idRegistro: '1001',
        accion: 'LOGIN_EXITOSO',
        resultado: 'EXITO',
        idUsuario: idUsuarioAdmin,
        fechaHora: new Date('2026-09-01T10:00:00.000Z'),
        datosNuevos: {
          correo: 'admin@test.com',
          ip: '192.168.1.1',
          token: 'jwt-secreto-super-confidencial',
          passwordHash: '$2a$10$hashsecreto123',
        },
      },
    });
    cleanupAuditoriaIds.push(audit1.idAuditoria);
    idAuditoriaCreada = Number(audit1.idAuditoria);

    const audit2 = await prisma.auditoria.create({
      data: {
        tablaAfectada: 'tipos_departamento',
        idRegistro: '1',
        accion: 'CONFIGURAR_MONTO_EXPENSA',
        resultado: 'EXITO',
        idUsuario: idUsuarioAdmin,
        fechaHora: new Date('2026-09-02T12:00:00.000Z'),
        datosAnteriores: {
          idTipo: 1,
          montoExpensa: 300,
          apiSecret: 'secreto-anterior',
        },
        datosNuevos: {
          idTipo: 1,
          montoExpensa: 320,
          apiSecret: 'secreto-nuevo',
        },
      },
    });
    cleanupAuditoriaIds.push(audit2.idAuditoria);

    const audit3 = await prisma.auditoria.create({
      data: {
        tablaAfectada: 'pagos',
        idRegistro: '500',
        accion: 'ANULACION_PAGO',
        resultado: 'FALLO',
        idUsuario: null,
        fechaHora: new Date('2026-09-05T15:30:00.000Z'),
        datosNuevos: {
          motivo: 'Fallo bancario',
        },
      },
    });
    cleanupAuditoriaIds.push(audit3.idAuditoria);
  });

  afterAll(async () => {
    if (cleanupAuditoriaIds.length > 0) {
      await prisma.auditoria.deleteMany({
        where: { idAuditoria: { in: cleanupAuditoriaIds } },
      });
    }
  });

  // ── 1. Control de Acceso y RBAC ─────────────────────────────────────────────
  it('1. Debe rechazar con 401 si no se envía token de autenticación', async () => {
    const resList = await request(app).get('/api/v1/auditoria');
    expect(resList.status).toBe(401);

    const resDetail = await request(app).get(`/api/v1/auditoria/${idAuditoriaCreada}`);
    expect(resDetail.status).toBe(401);
  });

  it('2. Debe rechazar con 403 si el rol es Consulta', async () => {
    const resList = await request(app)
      .get('/api/v1/auditoria')
      .set('Authorization', `Bearer ${consultaToken}`);
    expect(resList.status).toBe(403);
    expect(resList.body.error).toBe('Forbidden');

    const resDetail = await request(app)
      .get(`/api/v1/auditoria/${idAuditoriaCreada}`)
      .set('Authorization', `Bearer ${consultaToken}`);
    expect(resDetail.status).toBe(403);
  });

  it('3. Debe permitir acceso tanto a Administrador como a Directorio', async () => {
    const resAdmin = await request(app)
      .get('/api/v1/auditoria')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resAdmin.status).toBe(200);

    const resDir = await request(app)
      .get('/api/v1/auditoria')
      .set('Authorization', `Bearer ${directorioToken}`);
    expect(resDir.status).toBe(200);
  });

  // ── 2. Paginación y Metadatos ───────────────────────────────────────────────
  it('4. Debe soportar paginación (page, limit) y acotar limit a un máximo de 100', async () => {
    const res = await request(app)
      .get('/api/v1/auditoria?page=1&limit=2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(2);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('totalPages');

    // Verificar limit máximo acotado a 100
    const resMax = await request(app)
      .get('/api/v1/auditoria?limit=999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resMax.status).toBe(200);
    expect(resMax.body.meta.limit).toBe(100);
  });

  // ── 3. Filtros ─────────────────────────────────────────────────────────────
  it('5. Debe filtrar correctamente por tablaAfectada, accion y resultado', async () => {
    const resTabla = await request(app)
      .get('/api/v1/auditoria?tablaAfectada=tipos_departamento')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resTabla.status).toBe(200);
    expect(resTabla.body.data.every((d: any) => d.tablaAfectada === 'tipos_departamento')).toBe(true);

    const resAccion = await request(app)
      .get('/api/v1/auditoria?accion=CONFIGURAR_MONTO_EXPENSA')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resAccion.status).toBe(200);
    expect(resAccion.body.data.every((d: any) => d.accion === 'CONFIGURAR_MONTO_EXPENSA')).toBe(true);

    const resResultado = await request(app)
      .get('/api/v1/auditoria?resultado=FALLO')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resResultado.status).toBe(200);
    expect(resResultado.body.data.every((d: any) => d.resultado === 'FALLO')).toBe(true);
  });

  it('6. Debe filtrar por idUsuario, idRegistro y rango de fechas (fechaDesde, fechaHasta)', async () => {
    const resUser = await request(app)
      .get(`/api/v1/auditoria?idUsuario=${idUsuarioAdmin}&idRegistro=1001`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resUser.status).toBe(200);
    expect(resUser.body.data.length).toBeGreaterThanOrEqual(1);
    expect(resUser.body.data[0].idRegistro).toBe('1001');

    // Rango de fechas
    const resFechas = await request(app)
      .get('/api/v1/auditoria?fechaDesde=2026-09-01&fechaHasta=2026-09-03')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resFechas.status).toBe(200);
    const fechas = resFechas.body.data.map((d: any) => new Date(d.fechaHora).getTime());
    const minFecha = new Date('2026-09-01T00:00:00.000Z').getTime();
    const maxFecha = new Date('2026-09-03T23:59:59.999Z').getTime();
    expect(fechas.every((f: number) => f >= minFecha && f <= maxFecha)).toBe(true);
  });

  // ── 4. Enmascaramiento de Campos Sensibles ──────────────────────────────────
  it('7. Debe enmascarar automáticamente campos sensibles (token, password, hash, secret) en listado y detalle', async () => {
    const resList = await request(app)
      .get('/api/v1/auditoria?idRegistro=1001')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resList.status).toBe(200);
    const logItem = resList.body.data.find((d: any) => d.idRegistro === '1001');
    expect(logItem).toBeDefined();
    expect(logItem.datosNuevos.token).toBe('********');
    expect(logItem.datosNuevos.passwordHash).toBe('********');
    expect(logItem.datosNuevos.correo).toBe('admin@test.com'); // Campo no sensible visible

    // Detalle individual
    const resDetail = await request(app)
      .get(`/api/v1/auditoria/${logItem.idAuditoria}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resDetail.status).toBe(200);
    expect(resDetail.body.data.datosNuevos.token).toBe('********');
    expect(resDetail.body.data.datosNuevos.passwordHash).toBe('********');
    expect(resDetail.body.data.usuario).toBeDefined();
    expect(resDetail.body.data.usuario.nombreUsuario).toBeDefined();
  });

  // ── 5. Detalle de Auditoría y Casos de Error ─────────────────────────────────
  it('8. Debe retornar 404 para un ID de auditoría inexistente', async () => {
    const res = await request(app)
      .get('/api/v1/auditoria/999999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
  });

  it('9. Debe retornar 400 para un ID de auditoría inválido', async () => {
    const res = await request(app)
      .get('/api/v1/auditoria/invalido')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });
});
