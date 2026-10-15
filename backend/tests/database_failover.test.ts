// backend/tests/database_failover.test.ts
// Pruebas automatizadas para el mecanismo de Respaldo de Conexión (Failover)
// Cumple con:
// - Simular caída de principal con URL inválida (NUNCA contra la principal real)
// - Conmutación ante error de conexión: petición en curso da 503; siguiente funciona en respaldo
// - 422 y 409 NO provocan conmutación (permanece en 'principal')
// - En respaldo: solo lectura (SELECT/GET), sin escrituras ni datos TST-
// - Esquema requerido ampliado: tablas sesiones, tarifas_agua, lecturas_agua, reglas_mora, tipos_departamento
//   y columnas tipos_departamento.activo, expensas.monto_base, expensas.monto_agua, pagos.id_persona_pagador
// - Prueba explícita cuando al respaldo le falta la tabla sesiones (no conmuta y da 503 con detalle)
// - Endpoints: GET /api/v1/health/db y POST /api/v1/health/db/principal protegidos por rol Administrador

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { prisma, PrismaClient, getPrismaClient } from '@edificio-xyz/database';
import { app } from '../src/index';
import { generarTokenPrueba } from './setup';
import { dbFailoverService } from '../src/modules/database-failover/db-failover.service';

describe('Prompt 6: Respaldo de Conexión (Database Failover)', () => {
  let adminToken: string;
  let consultaToken: string;
  let originalClient: PrismaClient;

  beforeAll(async () => {
    originalClient = getPrismaClient();

    // Generar tokens para pruebas
    const adminUser = await prisma.usuario.findFirst({
      where: { rol: { nombre: 'Administrador' } },
    });
    const adminId = adminUser ? adminUser.idUsuario : 1;
    const adminEmail = adminUser ? adminUser.correo : 'admin@edificioxyz.com';

    adminToken = await generarTokenPrueba(adminId, adminEmail, 'Administrador');
    consultaToken = await generarTokenPrueba(999, 'consulta@test.com', 'Consulta');
  });

  beforeEach(() => {
    // Restaurar estado a 'principal' con el cliente original
    dbFailoverService.resetForTesting(originalClient);
  });

  afterAll(() => {
    // Asegurar restauración completa del cliente original
    dbFailoverService.resetForTesting(originalClient);
  });

  describe('1. Endpoint de Monitoreo: GET /api/v1/health/db', () => {
    it('debe responder 401 si no se envía token de autenticación', async () => {
      const res = await request(app).get('/api/v1/health/db');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('debe responder 403 si el rol no es Administrador (ej. Consulta)', async () => {
      const res = await request(app)
        .get('/api/v1/health/db')
        .set('Authorization', `Bearer ${consultaToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('debe responder 200 con la BD activa y fecha/motivo del último cambio para Administrador', async () => {
      const res = await request(app)
        .get('/api/v1/health/db')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.bdActiva).toBe('principal');
      expect(res.body.activeDb).toBe('principal');
      expect(res.body.ultimoCambio).toBeDefined();
      expect(res.body.ultimoCambio.fecha).toBeDefined();
      expect(res.body.ultimoCambio.motivo).toBeDefined();
    });
  });

  describe('2. Errores de Negocio (422 y 409) NO provocan conmutación', () => {
    it('un error 422 de validación de negocio no debe conmutar la base de datos', async () => {
      expect(dbFailoverService.getStatus().activeDb).toBe('principal');

      const firstDepto = await prisma.departamento.findFirst();
      const deptoId = firstDepto ? firstDepto.idDepartamento : 1;

      const res = await request(app)
        .put(`/api/v1/departamentos/${deptoId}/tipo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idTipo: 999999, // Inexistente -> 422
        });

      expect(res.status).toBe(422);
      expect(dbFailoverService.getStatus().activeDb).toBe('principal');
    });

    it('un error 409 de conflicto o clave única no debe conmutar la base de datos', async () => {
      expect(dbFailoverService.getStatus().activeDb).toBe('principal');

      const firstTipo = await prisma.tipoDepartamento.findFirst();
      if (firstTipo) {
        const res = await request(app)
          .post('/api/v1/tipos-departamento')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            nombre: firstTipo.nombre, // Duplicado -> 409
            montoExpensa: 500,
          });

        expect(res.status).toBe(409);
      }

      // La base de datos debe seguir siendo 'principal'
      expect(dbFailoverService.getStatus().activeDb).toBe('principal');
    });
  });

  describe('3. Conmutación ante Caída de Principal con URL Inválida (sin tocar la BD real)', () => {
    it('debe responder 503 en la petición que falla y conmutar a respaldo cuando este cumple el esquema completo', async () => {
      expect(dbFailoverService.getStatus().activeDb).toBe('principal');

      // 1. Crear un cliente simulado con URL inválida que detone error de conexión
      const invalidPrimaryClient = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://invalid_user:invalid_pass@127.0.0.1:54329/edificio_down?connect_timeout=1',
          },
        },
        log: ['error'],
      });

      // 2. Crear un cliente simulado de respaldo para lectura con el esquema requerido completo
      const mockFallbackClient = {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('information_schema.tables')) {
            return [
              { table_name: 'usuarios' },
              { table_name: 'roles' },
              { table_name: 'departamentos' },
              { table_name: 'personas' },
              { table_name: 'expensas' },
              { table_name: 'pagos' },
              { table_name: 'sesiones' },
              { table_name: 'tarifas_agua' },
              { table_name: 'lecturas_agua' },
              { table_name: 'reglas_mora' },
              { table_name: 'tipos_departamento' },
            ];
          }
          if (sql.includes('information_schema.columns')) {
            return [
              { table_name: 'tipos_departamento', column_name: 'activo' },
              { table_name: 'expensas', column_name: 'monto_base' },
              { table_name: 'expensas', column_name: 'monto_agua' },
              { table_name: 'pagos', column_name: 'id_persona_pagador' },
            ];
          }
          return [{ connected: 1 }];
        },
        $queryRaw: async () => [{ 1: 1 }],
        $disconnect: async () => {},
        departamento: {
          findMany: async () => [
            { idDepartamento: 101, numero: '101', piso: 1, estado: 'Ocupado' },
            { idDepartamento: 102, numero: '102', piso: 1, estado: 'Disponible' },
          ],
          count: async () => 2,
        },
        sesion: {
          findUnique: async () => null,
        },
      } as unknown as PrismaClient;

      dbFailoverService.setPrimaryClientForTesting(invalidPrimaryClient);
      dbFailoverService.setFallbackClientForTesting(mockFallbackClient);

      try {
        // 3. Petición en curso con principal caída da 503
        const failedRes = await request(app)
          .get('/api/v1/health')
          .timeout({ response: 5000, deadline: 6000 });

        expect(failedRes.status).toBe(503);

        // 4. Se conmutó a respaldo
        const statusDespues = dbFailoverService.getStatus();
        expect(statusDespues.activeDb).toBe('respaldo');
        expect(statusDespues.bdActiva).toBe('respaldo');
        expect(statusDespues.ultimoCambio.motivo).toMatch(/conmutación automática/i);

        // 5. La siguiente petición ejecuta sobre el respaldo y responde 200
        const nextRes = await request(app)
          .get('/api/v1/health')
          .timeout({ response: 5000, deadline: 6000 });

        expect(nextRes.status).toBe(200);
        expect(nextRes.body.database).toBe('connected');
        expect(nextRes.body.activeDb).toBe('respaldo');

      } finally {
        await invalidPrimaryClient.$disconnect().catch(() => {});
      }
    });

    it('no debe conmutar y debe responder 503 con detalle si al respaldo le falta la tabla sesiones', async () => {
      // Cliente principal caído
      const invalidPrimaryClient = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://invalid_user:invalid_pass@127.0.0.1:54329/edificio_down?connect_timeout=1',
          },
        },
        log: ['error'],
      });

      // Respaldo que tiene todas las tablas EXCEPTO sesiones
      const fallbackWithoutSessions = {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('information_schema.tables')) {
            return [
              { table_name: 'usuarios' },
              { table_name: 'roles' },
              { table_name: 'departamentos' },
              { table_name: 'personas' },
              { table_name: 'expensas' },
              { table_name: 'pagos' },
              // FALTA 'sesiones'
              { table_name: 'tarifas_agua' },
              { table_name: 'lecturas_agua' },
              { table_name: 'reglas_mora' },
              { table_name: 'tipos_departamento' },
            ];
          }
          if (sql.includes('information_schema.columns')) {
            return [
              { table_name: 'tipos_departamento', column_name: 'activo' },
              { table_name: 'expensas', column_name: 'monto_base' },
              { table_name: 'expensas', column_name: 'monto_agua' },
              { table_name: 'pagos', column_name: 'id_persona_pagador' },
            ];
          }
          return [{ 1: 1 }];
        },
        $disconnect: async () => {},
      } as unknown as PrismaClient;

      dbFailoverService.setPrimaryClientForTesting(invalidPrimaryClient);
      dbFailoverService.setFallbackClientForTesting(fallbackWithoutSessions);

      try {
        const res = await request(app).get('/api/v1/health');
        expect(res.status).toBe(503);
        // Debe listar explícitamente lo que falta en el mensaje o detalle sin credenciales
        expect(res.body.message || res.body.error).toMatch(/sesiones/i);

        // No debe conmutar: permanece en principal
        expect(dbFailoverService.getStatus().activeDb).toBe('principal');
      } finally {
        await invalidPrimaryClient.$disconnect().catch(() => {});
      }
    });

    it('no debe conmutar y debe responder 503 si al respaldo le faltan columnas requeridas', async () => {
      const invalidPrimaryClient = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://invalid_user:invalid_pass@127.0.0.1:54329/edificio_down?connect_timeout=1',
          },
        },
        log: ['error'],
      });

      // Respaldo con tablas pero sin las columnas nuevas
      const fallbackWithoutColumns = {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('information_schema.tables')) {
            return [
              { table_name: 'usuarios' },
              { table_name: 'roles' },
              { table_name: 'departamentos' },
              { table_name: 'personas' },
              { table_name: 'expensas' },
              { table_name: 'pagos' },
              { table_name: 'sesiones' },
              { table_name: 'tarifas_agua' },
              { table_name: 'lecturas_agua' },
              { table_name: 'reglas_mora' },
              { table_name: 'tipos_departamento' },
            ];
          }
          if (sql.includes('information_schema.columns')) {
            // Falta pagos.id_persona_pagador y expensas.monto_agua
            return [
              { table_name: 'tipos_departamento', column_name: 'activo' },
              { table_name: 'expensas', column_name: 'monto_base' },
            ];
          }
          return [{ 1: 1 }];
        },
        $disconnect: async () => {},
      } as unknown as PrismaClient;

      dbFailoverService.setPrimaryClientForTesting(invalidPrimaryClient);
      dbFailoverService.setFallbackClientForTesting(fallbackWithoutColumns);

      try {
        const res = await request(app).get('/api/v1/health');
        expect(res.status).toBe(503);
        expect(res.body.message || res.body.error).toMatch(/pagos\.id_persona_pagador|monto_agua/i);

        // Permanece en principal
        expect(dbFailoverService.getStatus().activeDb).toBe('principal');
      } finally {
        await invalidPrimaryClient.$disconnect().catch(() => {});
      }
    });
  });

  describe('4. Restauración Manual: POST /api/v1/health/db/principal', () => {
    it('debe responder 401 si no está autenticado', async () => {
      const res = await request(app).post('/api/v1/health/db/principal');
      expect(res.status).toBe(401);
    });

    it('debe responder 403 si el rol no es Administrador', async () => {
      const res = await request(app)
        .post('/api/v1/health/db/principal')
        .set('Authorization', `Bearer ${consultaToken}`);
      expect(res.status).toBe(403);
    });

    it('debe rechazar la conmutación y responder 503 si la principal no está disponible', async () => {
      dbFailoverService.setActiveDbForTesting('respaldo');
      expect(dbFailoverService.getStatus().activeDb).toBe('respaldo');

      const brokenPrimary = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://invalid:invalid@127.0.0.1:54329/edificio_down?connect_timeout=1',
          },
        },
        log: ['error'],
      });
      dbFailoverService.setPrimaryClientForTesting(brokenPrimary);

      try {
        const res = await request(app)
          .post('/api/v1/health/db/principal')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(503);
        expect(res.body.error).toBe('Service Unavailable');
        expect(dbFailoverService.getStatus().activeDb).toBe('respaldo');
      } finally {
        await brokenPrimary.$disconnect().catch(() => {});
      }
    });

    it('debe conmutar exitosamente a la principal tras comprobarla cuando está sana', async () => {
      dbFailoverService.setActiveDbForTesting('respaldo');
      expect(dbFailoverService.getStatus().activeDb).toBe('respaldo');

      dbFailoverService.setPrimaryClientForTesting(originalClient);

      const res = await request(app)
        .post('/api/v1/health/db/principal')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.bdActiva).toBe('principal');
      expect(res.body.activeDb).toBe('principal');
      expect(res.body.message).toMatch(/restaurada/i);

      expect(dbFailoverService.getStatus().activeDb).toBe('principal');
    });
  });

  describe('5. Pruebas de regresión: prisma.$transaction en ambas formas (array y callback interactivo)', () => {
    it('debe permitir prisma.$transaction([ ...array ]) sin lanzar "All elements of the array need to be Prisma Client promises"', async () => {
      // Verificar que las operaciones de modelo devuelven objetos compatibles con PrismaPromise
      const p1 = prisma.usuario.findMany({ take: 1 });
      const p2 = prisma.rol.findMany({ take: 1 });

      expect((p1 as any)[Symbol.toStringTag]).toBe('PrismaPromise');
      expect(typeof (p1 as any).requestTransaction).toBe('function');
      expect((p2 as any)[Symbol.toStringTag]).toBe('PrismaPromise');
      expect(typeof (p2 as any).requestTransaction).toBe('function');

      // Ejecutar la transacción en lote (array)
      const [users, roles] = await prisma.$transaction([p1, p2]);

      expect(Array.isArray(users)).toBe(true);
      expect(Array.isArray(roles)).toBe(true);
    });

    it('debe permitir prisma.$transaction(async (tx) => { ... }) con callback interactivo', async () => {
      const res = await prisma.$transaction(async (tx) => {
        const u = await tx.usuario.findFirst();
        const r = await tx.rol.findFirst();
        return {
          idUsuario: u?.idUsuario,
          idRol: r?.idRol,
        };
      });

      expect(res).toBeDefined();
      expect(typeof res).toBe('object');
    });
  });
});

