// backend/tests/unidades_tipo_historial.test.ts
// Tests para HU03: Unidades, eliminación de historial_asignacion_unidades,
// derivación de historial desde ocupantes y auditoría, y gestión de idTipo en Departamentos.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '@edificio-xyz/database';
import { app } from '../src/index';
import { generarTokenPrueba } from './setup';

describe('Gestión de Unidades - Tipos de Departamento e Historial Derivado', () => {
  let adminToken: string;
  let testPersonaId: number;
  let testDeptoId: number;
  let testParqueoId: number;
  let testBauleraId: number;

  const cleanupDeptoIds: number[] = [];
  const cleanupParqueoIds: number[] = [];
  const cleanupBauleraIds: number[] = [];
  const cleanupPersonaIds: number[] = [];

  beforeAll(async () => {
    const adminUser = await prisma.usuario.findUnique({ where: { correo: 'admin@edificioxyz.com' } });
    adminToken = await generarTokenPrueba(adminUser!.idUsuario, adminUser!.correo, 'Administrador');

    // Asegurar que tipos_departamento existan en la base local (A=300, B=350, C=400)
    await prisma.tipoDepartamento.upsert({
      where: { idTipo: 1 },
      update: { nombre: 'A', montoExpensa: 300.0 },
      create: { idTipo: 1, nombre: 'A', montoExpensa: 300.0 },
    });
    await prisma.tipoDepartamento.upsert({
      where: { idTipo: 2 },
      update: { nombre: 'B', montoExpensa: 350.0 },
      create: { idTipo: 2, nombre: 'B', montoExpensa: 350.0 },
    });
    await prisma.tipoDepartamento.upsert({
      where: { idTipo: 3 },
      update: { nombre: 'C', montoExpensa: 400.0 },
      create: { idTipo: 3, nombre: 'C', montoExpensa: 400.0 },
    });

    // Persona de prueba
    const persona = await prisma.persona.create({
      data: {
        nombres: 'Carlos',
        apellidos: 'UnitTest',
        ciNit: `CI-TEST-${Date.now().toString().slice(-6)}`,
        telefono: '70012345',
        correo: 'carlos.test@edificioxyz.com',
      },
    });
    testPersonaId = persona.idPersona;
    cleanupPersonaIds.push(testPersonaId);

    // Parqueo de prueba (max 10 chars)
    const pNum = `P${Math.floor(1000 + Math.random() * 9000)}`;
    const parqueo = await prisma.parqueo.create({
      data: {
        numero: pNum,
        estado: 'Disponible',
      },
    });
    testParqueoId = parqueo.idParqueo;
    cleanupParqueoIds.push(testParqueoId);

    // Baulera de prueba (max 10 chars)
    const bNum = `B${Math.floor(1000 + Math.random() * 9000)}`;
    const baulera = await prisma.baulera.create({
      data: {
        numero: bNum,
        estado: 'Disponible',
      },
    });
    testBauleraId = baulera.idBaulera;
    cleanupBauleraIds.push(testBauleraId);
  });

  afterAll(async () => {
    for (const deptoId of cleanupDeptoIds) {
      await prisma.ocupanteDepartamento.deleteMany({ where: { idDepartamento: deptoId } });
      await prisma.auditoria.deleteMany({ where: { tablaAfectada: 'departamentos', idRegistro: String(deptoId) } });
      await prisma.departamento.deleteMany({ where: { idDepartamento: deptoId } });
    }
    for (const pId of cleanupParqueoIds) {
      await prisma.auditoria.deleteMany({ where: { tablaAfectada: 'parqueos', idRegistro: String(pId) } });
      await prisma.parqueo.deleteMany({ where: { idParqueo: pId } });
    }
    for (const bId of cleanupBauleraIds) {
      await prisma.auditoria.deleteMany({ where: { tablaAfectada: 'bauleras', idRegistro: String(bId) } });
      await prisma.baulera.deleteMany({ where: { idBaulera: bId } });
    }
    for (const pId of cleanupPersonaIds) {
      await prisma.persona.deleteMany({ where: { idPersona: pId } });
    }
  });

  // ── Punto 3: idTipo en POST /unidades y PUT /unidades/Departamento/:id ──────────
  describe('Punto 3: Gestión de idTipo en Departamentos', () => {
    it('POST /unidades debe rechazar con 422 si idTipo no existe en tipos_departamento', async () => {
      const res = await request(app)
        .post('/api/v1/unidades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipoUnidad: 'Departamento',
          numero: `E${Math.floor(1000 + Math.random() * 9000)}`,
          piso: 1,
          areaM2: 80,
          idTipo: 99999, // Inexistente
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('UNPROCESSABLE_ENTITY');
      expect(res.body.message).toContain('idTipo');
    });

    it('POST /unidades debe crear Departamento con idTipo válido y auditarlo', async () => {
      const numDepto = `D${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await request(app)
        .post('/api/v1/unidades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipoUnidad: 'Departamento',
          numero: numDepto,
          piso: 3,
          areaM2: 95.5,
          idTipo: 1, // Tipo A (300)
        });

      expect(res.status).toBe(201);
      expect(res.body.unidad.idTipo).toBe(1);
      expect(res.body.unidad.tipo).toBe('A');
      expect(res.body.unidad.monto).toBe(300);

      testDeptoId = res.body.unidad.idDepartamento;
      cleanupDeptoIds.push(testDeptoId);

      // Verificar registro en auditoría
      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'departamentos',
          idRegistro: String(testDeptoId),
          accion: 'CREATE',
        },
      });
      expect(audit).not.toBeNull();
      const dn = audit!.datosNuevos as any;
      expect(dn.idTipo).toBe(1);
    });

    it('PUT /unidades/Departamento/:id debe rechazar con 422 si nuevo idTipo no existe', async () => {
      const res = await request(app)
        .put(`/api/v1/unidades/Departamento/${testDeptoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idTipo: 99999,
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('UNPROCESSABLE_ENTITY');
    });

    it('PUT /unidades/Departamento/:id debe actualizar idTipo y auditar datosAnteriores y datosNuevos', async () => {
      const res = await request(app)
        .put(`/api/v1/unidades/Departamento/${testDeptoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idTipo: 2, // Cambiar a Tipo B (350)
          piso: 4,
        });

      expect(res.status).toBe(200);
      expect(res.body.unidad.idTipo).toBe(2);
      expect(res.body.unidad.tipo).toBe('B');
      expect(res.body.unidad.monto).toBe(350);

      // Verificar registro de auditoría con datosAnteriores y datosNuevos
      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'departamentos',
          idRegistro: String(testDeptoId),
          accion: 'UPDATE',
        },
        orderBy: { fechaHora: 'desc' },
      });
      expect(audit).not.toBeNull();
      const da = audit!.datosAnteriores as any;
      const dn = audit!.datosNuevos as any;
      expect(da.idTipo).toBe(1);
      expect(dn.idTipo).toBe(2);
    });

    it('GET /unidades debe devolver tipo y monto del departamento en el listado', async () => {
      const res = await request(app)
        .get('/api/v1/unidades?tipo=Departamento')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const deptoFound = res.body.data.find((d: any) => d.id === testDeptoId);
      expect(deptoFound).toBeDefined();
      expect(deptoFound.idTipo).toBe(2);
      expect(deptoFound.tipo).toBe('B');
      expect(deptoFound.monto).toBe(350);
    });
  });

  // ── Punto 1: Asignaciones y finalizaciones de Parqueos y Bauleras ──────────────
  describe('Punto 1: Asignación y Finalización atómica de Parqueo y Baulera con auditoría', () => {
    it('POST /unidades/asignaciones actualiza estado, departamento, persona y fecha de Parqueo en $transaction', async () => {
      const res = await request(app)
        .post('/api/v1/unidades/asignaciones')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipoUnidad: 'Parqueo',
          idUnidad: testParqueoId,
          idPersona: testPersonaId,
          idDepartamento: testDeptoId,
          tipoRelacion: 'Asignado',
          notas: 'Asignación de parqueo para prueba',
        });

      expect(res.status).toBe(200);
      expect(res.body.parqueo.estado).toBe('Asignado');
      expect(res.body.parqueo.idPersona).toBe(testPersonaId);
      expect(res.body.parqueo.idDepartamento).toBe(testDeptoId);
      expect(res.body.parqueo.fechaAsignacion).not.toBeNull();

      // Verificar en BD
      const enDb = await prisma.parqueo.findUnique({ where: { idParqueo: testParqueoId } });
      expect(enDb!.estado).toBe('Asignado');
      expect(enDb!.idPersona).toBe(testPersonaId);
      expect(enDb!.idDepartamento).toBe(testDeptoId);

      // Verificar auditoría
      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'parqueos',
          idRegistro: String(testParqueoId),
          accion: 'ASIGNACION_UNIDAD',
        },
      });
      expect(audit).not.toBeNull();
    });

    it('POST /unidades/asignaciones actualiza estado, departamento, persona y fecha de Baulera en $transaction', async () => {
      const res = await request(app)
        .post('/api/v1/unidades/asignaciones')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipoUnidad: 'Baulera',
          idUnidad: testBauleraId,
          idPersona: testPersonaId,
          idDepartamento: testDeptoId,
          tipoRelacion: 'Asignado',
          notas: 'Asignación de baulera para prueba',
        });

      expect(res.status).toBe(200);
      expect(res.body.baulera.estado).toBe('Asignado');
      expect(res.body.baulera.idPersona).toBe(testPersonaId);
      expect(res.body.baulera.idDepartamento).toBe(testDeptoId);

      // Verificar auditoría
      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'bauleras',
          idRegistro: String(testBauleraId),
          accion: 'ASIGNACION_UNIDAD',
        },
      });
      expect(audit).not.toBeNull();
    });

    it('POST /unidades/asignaciones/finalizar restaura estado Disponible en Parqueo y limpia vínculos', async () => {
      const res = await request(app)
        .post('/api/v1/unidades/asignaciones/finalizar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipoUnidad: 'Parqueo',
          idUnidad: testParqueoId,
          notas: 'Liberación de parqueo',
        });

      expect(res.status).toBe(200);
      expect(res.body.parqueo.estado).toBe('Disponible');
      expect(res.body.parqueo.idPersona).toBeNull();
      expect(res.body.parqueo.idDepartamento).toBeNull();
      expect(res.body.parqueo.fechaAsignacion).toBeNull();

      // Verificar auditoría
      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'parqueos',
          idRegistro: String(testParqueoId),
          accion: 'FINALIZACION_ASIGNACION',
        },
      });
      expect(audit).not.toBeNull();
    });

    it('POST /unidades/asignaciones/finalizar restaura estado Disponible en Baulera y limpia vínculos', async () => {
      const res = await request(app)
        .post('/api/v1/unidades/asignaciones/finalizar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipoUnidad: 'Baulera',
          idUnidad: testBauleraId,
          notas: 'Liberación de baulera',
        });

      expect(res.status).toBe(200);
      expect(res.body.baulera.estado).toBe('Disponible');
      expect(res.body.baulera.idPersona).toBeNull();
      expect(res.body.baulera.idDepartamento).toBeNull();

      // Verificar auditoría
      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'bauleras',
          idRegistro: String(testBauleraId),
          accion: 'FINALIZACION_ASIGNACION',
        },
      });
      expect(audit).not.toBeNull();
    });
  });

  // ── Punto 2: GET /unidades/:tipo/:id con historial derivado ──────────────────
  describe('Punto 2: Historial derivado en GET /unidades/:tipo/:id', () => {
    it('GET /unidades/Departamento/:id obtiene historialAsignaciones desde ocupantes_departamento', async () => {
      // Asignar ocupante al departamento
      await request(app)
        .post('/api/v1/unidades/asignaciones')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipoUnidad: 'Departamento',
          idUnidad: testDeptoId,
          idPersona: testPersonaId,
          tipoRelacion: 'Inquilino',
        });

      const res = await request(app)
        .get(`/api/v1/unidades/Departamento/${testDeptoId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.unidad).toBeDefined();
      expect(res.body.unidad.idTipo).toBe(2);
      expect(res.body.unidad.tipo).toBe('B');
      expect(res.body.unidad.monto).toBe(350);

      // Verificar historial derivado
      const hist = res.body.historialAsignaciones || res.body.historial;
      expect(Array.isArray(hist)).toBe(true);
      expect(hist.length).toBeGreaterThanOrEqual(1);

      const primerItem = hist[0];
      expect(primerItem).toHaveProperty('idHistorial');
      expect(primerItem.tipoUnidad).toBe('Departamento');
      expect(primerItem.idUnidad).toBe(testDeptoId);
      expect(primerItem.idPersona).toBe(testPersonaId);
      expect(primerItem.tipoRelacion).toBe('Inquilino');
      expect(primerItem).toHaveProperty('fechaInicio');
    });

    it('GET /unidades/Parqueo/:id obtiene historialAsignaciones desde los eventos de auditoria', async () => {
      const res = await request(app)
        .get(`/api/v1/unidades/Parqueo/${testParqueoId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.unidad).toBeDefined();
      expect(res.body.unidad.numero).toBeDefined();

      const hist = res.body.historialAsignaciones || res.body.historial;
      expect(Array.isArray(hist)).toBe(true);
      expect(hist.length).toBeGreaterThanOrEqual(1);

      const evento = hist.find((h: any) => h.idPersona === testPersonaId);
      expect(evento).toBeDefined();
      expect(evento.tipoUnidad).toBe('Parqueo');
      expect(evento.idUnidad).toBe(testParqueoId);
      expect(evento).toHaveProperty('idHistorial');
      expect(evento).toHaveProperty('fechaInicio');
    });

    it('GET /unidades/Baulera/:id obtiene historialAsignaciones desde los eventos de auditoria', async () => {
      const res = await request(app)
        .get(`/api/v1/unidades/Baulera/${testBauleraId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.unidad).toBeDefined();

      const hist = res.body.historialAsignaciones || res.body.historial;
      expect(Array.isArray(hist)).toBe(true);
      expect(hist.length).toBeGreaterThanOrEqual(1);

      const evento = hist.find((h: any) => h.idPersona === testPersonaId);
      expect(evento).toBeDefined();
      expect(evento.tipoUnidad).toBe('Baulera');
      expect(evento.idUnidad).toBe(testBauleraId);
      expect(evento).toHaveProperty('idHistorial');
    });
  });
});
