// backend/tests/sesion_unica.test.ts
// Tests para Prompt 5: Sesión única, control de concurrencia y cierre forzado

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { hash } from 'bcryptjs';
import { prisma } from '@edificio-xyz/database';
import { app } from '../src/index';
import { generarTokenPrueba } from './setup';
import { limpiar } from './test.helpers';
import { sessionManager } from '../src/modules/auth/session.manager';
import { sessionTouchThrottle } from '../src/middlewares/auth.middleware';

describe('Prompt 5: Sesión Única, Middleware y Cierre Forzado', () => {
  const createdUserIds: number[] = [];
  const createdSessionIds: string[] = [];

  const rawPassword = 'TestPassword123!';
  let passwordHash: string;

  let rolAdminId: number;
  let rolNoAdminId: number;

  let adminUser: { idUsuario: number; correo: string };
  let normalUser: { idUsuario: number; correo: string };
  let victimUser: { idUsuario: number; correo: string };
  let nonAdminUser: { idUsuario: number; correo: string };

  beforeAll(async () => {
    passwordHash = await hash(rawPassword, 10);

    // Obtener roles existentes en la BD
    const rolAdmin = await prisma.rol.findFirst({
      where: { nombre: 'Administrador' },
    });
    rolAdminId = rolAdmin ? rolAdmin.idRol : 1;

    const rolNoAdmin = await prisma.rol.findFirst({
      where: { NOT: { nombre: 'Administrador' } },
    });
    rolNoAdminId = rolNoAdmin ? rolNoAdmin.idRol : 2;

    const timestamp = Date.now().toString().slice(-5);

    // 1. Crear usuarios exclusivos de prueba con prefijo TST-
    adminUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-adm-${timestamp}`,
        correo: `tst-admin-${timestamp}@edificioxyz.com`,
        passwordHash,
        idRol: rolAdminId,
        activo: true,
      },
    });
    createdUserIds.push(adminUser.idUsuario);

    normalUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-usr-${timestamp}`,
        correo: `tst-user-${timestamp}@edificioxyz.com`,
        passwordHash,
        idRol: rolNoAdminId,
        activo: true,
      },
    });
    createdUserIds.push(normalUser.idUsuario);

    victimUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-vic-${timestamp}`,
        correo: `tst-victim-${timestamp}@edificioxyz.com`,
        passwordHash,
        idRol: rolNoAdminId,
        activo: true,
      },
    });
    createdUserIds.push(victimUser.idUsuario);

    nonAdminUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-cons-${timestamp}`,
        correo: `tst-consulta-${timestamp}@edificioxyz.com`,
        passwordHash,
        idRol: rolNoAdminId,
        activo: true,
      },
    });
    createdUserIds.push(nonAdminUser.idUsuario);
  });

  afterAll(async () => {
    // Recopilar todas las sesiones de los usuarios creados para borrarlas estrictamente por ID
    const sesiones = await prisma.sesion.findMany({
      where: { idUsuario: { in: createdUserIds } },
      select: { idSesion: true },
    });
    for (const s of sesiones) {
      if (!createdSessionIds.includes(s.idSesion)) {
        createdSessionIds.push(s.idSesion);
      }
    }

    // Limpieza estricta solo por IDs guardados
    await limpiar({
      sesiones: createdSessionIds,
      usuarios: createdUserIds,
    });

    sessionManager.clear();
    sessionTouchThrottle.clear();
  });

  // ── 1. Segundo login 409 ───────────────────────────────────────────────────
  it('1. Segundo login retorna 409 "Esta cuenta ya tiene una sesión activa" y registra SESION_RECHAZADA', async () => {
    // Primer login exitoso
    const res1 = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: normalUser.correo, password: rawPassword });

    expect([200, 201]).toContain(res1.status);
    expect(res1.body).toHaveProperty('token');
    const token1 = res1.body.token;

    // Verificar que se haya creado la sesión activa en BD
    const sesion = await prisma.sesion.findFirst({
      where: { idUsuario: normalUser.idUsuario, activa: true },
    });
    expect(sesion).not.toBeNull();
    createdSessionIds.push(sesion!.idSesion);

    // Segundo login con la misma cuenta mientras la sesión sigue activa
    const res2 = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: normalUser.correo, password: rawPassword });

    expect(res2.status).toBe(409);
    expect(res2.body.message).toBe('Esta cuenta ya tiene una sesión activa');

    // Verificar registro en auditoría con acción SESION_RECHAZADA
    const audit = await prisma.auditoria.findFirst({
      where: {
        idUsuario: normalUser.idUsuario,
        accion: 'SESION_RECHAZADA',
      },
      orderBy: { fechaHora: 'desc' },
    });
    expect(audit).not.toBeNull();
    expect(audit?.resultado).toBe('FALLO');
  });

  // ── 2. Logout permite entrar de nuevo ──────────────────────────────────────
  it('2. Logout marca la sesión inactiva y permite iniciar sesión nuevamente', async () => {
    // Obtener la sesión activa actual del usuario
    const sesionPrevia = await prisma.sesion.findFirst({
      where: { idUsuario: normalUser.idUsuario, activa: true },
    });
    expect(sesionPrevia).not.toBeNull();

    // Iniciar sesión para obtener el token actual si fuera necesario
    // Usamos el token existente si la sesión previa está activa
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: victimUser.correo, password: rawPassword });

    expect([200, 201]).toContain(loginRes.status);
    const token = loginRes.body.token;

    const sesionVictima = await prisma.sesion.findFirst({
      where: { idUsuario: victimUser.idUsuario, activa: true },
    });
    expect(sesionVictima).not.toBeNull();
    createdSessionIds.push(sesionVictima!.idSesion);

    // Ejecutar logout con el token
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(logoutRes.status).toBe(200);

    // Verificar en BD que la sesión se marcó inactiva
    const sesionActualizada = await prisma.sesion.findUnique({
      where: { idSesion: sesionVictima!.idSesion },
    });
    expect(sesionActualizada?.activa).toBe(false);

    // Ahora un nuevo login de victimUser debe permitirse exitosamente
    const reloginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: victimUser.correo, password: rawPassword });

    expect([200, 201]).toContain(reloginRes.status);
    expect(reloginRes.body).toHaveProperty('token');

    const nuevaSesion = await prisma.sesion.findFirst({
      where: { idUsuario: victimUser.idUsuario, activa: true },
    });
    expect(nuevaSesion).not.toBeNull();
    createdSessionIds.push(nuevaSesion!.idSesion);
  });

  // ── 3. Expiración de sesión (> 30 min inactividad) ──────────────────────────
  it('3. Sesión con ultimo_acceso > 30 min expira en middleware (401) y permite nuevo login sin 409', async () => {
    // Tomar la sesión activa de normalUser y actualizar su ultimoAcceso a 31 min en el pasado
    const sesionActiva = await prisma.sesion.findFirst({
      where: { idUsuario: normalUser.idUsuario, activa: true },
    });
    expect(sesionActiva).not.toBeNull();

    const treintaYUnMinutosAtras = new Date(Date.now() - 31 * 60 * 1000);
    await prisma.sesion.update({
      where: { idSesion: sesionActiva!.idSesion },
      data: { ultimoAcceso: treintaYUnMinutosAtras },
    });

    // Simular petición con token previo de normalUser
    const tokenExp = await generarTokenPrueba(normalUser.idUsuario, normalUser.correo, 'Consulta');
    // Generar un token con sid de la sesión vencida
    const { SignJWT } = await import('jose');
    const { config } = await import('../src/config');
    const tokenConSidExpirado = await new SignJWT({
      idUsuario: normalUser.idUsuario,
      nombreUsuario: normalUser.correo.split('@')[0],
      correo: normalUser.correo,
      rol: 'Consulta',
      sid: sesionActiva!.idSesion,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(config.jwtSecret);

    // La petición debe ser rechazada con 401 por inactividad
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenConSidExpirado}`);

    expect(meRes.status).toBe(401);
    expect(meRes.body.message).toContain('inactividad');

    // Intentar login: como la sesión venció, debe cerrarla y permitir crear la nueva (200/201, no 409)
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: normalUser.correo, password: rawPassword });

    expect([200, 201]).toContain(loginRes.status);
    expect(loginRes.body).toHaveProperty('token');

    const nuevaSesion = await prisma.sesion.findFirst({
      where: { idUsuario: normalUser.idUsuario, activa: true },
    });
    expect(nuevaSesion).not.toBeNull();
    createdSessionIds.push(nuevaSesion!.idSesion);
  });

  // ── 4. Dos logins simultáneos (uno exitoso 200/201, otro 409) ───────────────
  it('4. Dos logins simultáneos respetan índice único parcial: uno es exitoso y el otro recibe 409', async () => {
    // Crear un usuario específico para la prueba de concurrencia
    const timestamp = Date.now().toString().slice(-4);
    const concurrentUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-cnc-${timestamp}`,
        correo: `tst-conc-${timestamp}@edificioxyz.com`,
        passwordHash,
        idRol: rolNoAdminId,
        activo: true,
      },
    });
    createdUserIds.push(concurrentUser.idUsuario);

    // Lanzar dos peticiones POST /login simultáneas
    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/v1/auth/login')
        .send({ correo: concurrentUser.correo, password: rawPassword }),
      request(app)
        .post('/api/v1/auth/login')
        .send({ correo: concurrentUser.correo, password: rawPassword }),
    ]);

    const statuses = [resA.status, resB.status].sort((a, b) => a - b);
    // Uno de ellos debe tener éxito (200 o 201) y el otro debe fallar con 409
    expect([200, 201]).toContain(statuses[0]);
    expect(statuses[1]).toBe(409);

    // Registrar idSesion generada
    const sesionConcurrente = await prisma.sesion.findFirst({
      where: { idUsuario: concurrentUser.idUsuario, activa: true },
    });
    if (sesionConcurrente) {
      createdSessionIds.push(sesionConcurrente.idSesion);
    }
  });

  // ── 5. Forzar cierre de sesión por Administrador ───────────────────────────
  it('5. DELETE /api/v1/auth/sesiones/:idUsuario (Administrador) cierra la sesión y audita SESION_FORZADA', async () => {
    // Iniciar sesión de la víctima
    // Asegurar que victimUser no tenga sesión previa activa
    await prisma.sesion.updateMany({
      where: { idUsuario: victimUser.idUsuario, activa: true },
      data: { activa: false },
    });

    const loginVictima = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: victimUser.correo, password: rawPassword });

    expect([200, 201]).toContain(loginVictima.status);
    const tokenVictima = loginVictima.body.token;

    const sesionVictima = await prisma.sesion.findFirst({
      where: { idUsuario: victimUser.idUsuario, activa: true },
    });
    expect(sesionVictima).not.toBeNull();
    createdSessionIds.push(sesionVictima!.idSesion);

    // Login del administrador
    // Asegurar que adminUser no tenga sesión previa activa
    await prisma.sesion.updateMany({
      where: { idUsuario: adminUser.idUsuario, activa: true },
      data: { activa: false },
    });

    const loginAdmin = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: adminUser.correo, password: rawPassword });

    expect([200, 201]).toContain(loginAdmin.status);
    const tokenAdmin = loginAdmin.body.token;

    const sesionAdmin = await prisma.sesion.findFirst({
      where: { idUsuario: adminUser.idUsuario, activa: true },
    });
    if (sesionAdmin) createdSessionIds.push(sesionAdmin.idSesion);

    // El Administrador ejecuta DELETE /sesiones/:idUsuario
    const deleteRes = await request(app)
      .delete(`/api/v1/auth/sesiones/${victimUser.idUsuario}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Verificar en BD que la sesión de la víctima se cerró
    const sesionCerrada = await prisma.sesion.findUnique({
      where: { idSesion: sesionVictima!.idSesion },
    });
    expect(sesionCerrada?.activa).toBe(false);

    // Verificar registro de auditoría SESION_FORZADA
    const audit = await prisma.auditoria.findFirst({
      where: {
        accion: 'SESION_FORZADA',
        idUsuario: adminUser.idUsuario,
      },
      orderBy: { fechaHora: 'desc' },
    });
    expect(audit).not.toBeNull();
    expect(audit?.resultado).toBe('EXITO');
    expect(audit?.idRegistro).toBe(String(victimUser.idUsuario));

    // Petición subsecuente de la víctima con su token debe ser rechazada con 401
    const meVictima = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenVictima}`);

    expect(meVictima.status).toBe(401);
  });

  // ── 6. 403 si no es Administrador ──────────────────────────────────────────
  it('6. DELETE /api/v1/auth/sesiones/:idUsuario rechaza con 403 si el rol no es Administrador', async () => {
    // Iniciar sesión del usuario no administrador
    await prisma.sesion.updateMany({
      where: { idUsuario: nonAdminUser.idUsuario, activa: true },
      data: { activa: false },
    });

    const loginNonAdmin = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: nonAdminUser.correo, password: rawPassword });

    expect([200, 201]).toContain(loginNonAdmin.status);
    const nonAdminToken = loginNonAdmin.body.token;

    const sesionNonAdmin = await prisma.sesion.findFirst({
      where: { idUsuario: nonAdminUser.idUsuario, activa: true },
    });
    if (sesionNonAdmin) createdSessionIds.push(sesionNonAdmin.idSesion);

    // Intento de forzar cierre por parte de un usuario que no es Administrador
    const res = await request(app)
      .delete(`/api/v1/auth/sesiones/${victimUser.idUsuario}`)
      .set('Authorization', `Bearer ${nonAdminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('No tiene permisos para realizar esta acción');
  });

  // ── 7. Tokens emitidos antes, sin sid, siguen válidos ───────────────────────
  it('7. Tokens sin claim sid siguen siendo válidos en middleware hasta expirar', async () => {
    // Token generado sin sid (simulando emisión previa al despliegue)
    const tokenSinSid = await generarTokenPrueba(
      normalUser.idUsuario,
      normalUser.correo,
      'Consulta'
    );

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenSinSid}`);

    expect(res.status).toBe(200);
    expect(res.body.correo).toBe(normalUser.correo);
  });

  // ── 8. Throttling de ultimo_acceso (máx 1 vez por minuto) ─────────────────
  it('8. Middleware actualiza ultimo_acceso como máximo 1 vez por minuto por sesión', async () => {
    // Crear sesión fresca para normalUser
    await prisma.sesion.updateMany({
      where: { idUsuario: normalUser.idUsuario, activa: true },
      data: { activa: false },
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: normalUser.correo, password: rawPassword });

    const token = loginRes.body.token;
    const sesionInicial = await prisma.sesion.findFirst({
      where: { idUsuario: normalUser.idUsuario, activa: true },
    });
    expect(sesionInicial).not.toBeNull();
    createdSessionIds.push(sesionInicial!.idSesion);

    const timestampInicial = sesionInicial!.ultimoAcceso.getTime();

    // Petición inmediata (< 1 min)
    const res1 = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res1.status).toBe(200);

    const sesionInmediata = await prisma.sesion.findUnique({
      where: { idSesion: sesionInicial!.idSesion },
    });
    // El timestamp en BD no debe haber cambiado porque transcurrieron menos de 60 segundos
    expect(sesionInmediata!.ultimoAcceso.getTime()).toBe(timestampInicial);
  });
});
