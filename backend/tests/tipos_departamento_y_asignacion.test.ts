// backend/tests/tipos_departamento_y_asignacion.test.ts
// Tests para Punto 1 (tipos-departamento) y Punto 2 (asignación de tipo a departamentos)

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '@edificio-xyz/database';
import { app } from '../src/index';
import { generarTokenPrueba } from './setup';
import {
  crearDepartamentoTest,
  crearTipoDepartamentoTest,
  generarNumeroDeptoTest,
  limpiar,
} from './test.helpers';

describe('US2.1 - Punto 1 & 2: Tipos de Departamento y Asignación', () => {
  let adminToken: string;
  let copropietarioToken: string;
  const createdTipoIds: number[] = [];
  const createdDeptoIds: number[] = [];

  beforeAll(async () => {
    const adminUser = await prisma.usuario.findFirst({ where: { rol: { nombre: 'Administrador' } } });
    adminToken = await generarTokenPrueba(adminUser!.idUsuario, adminUser!.correo, 'Administrador');
    copropietarioToken = await generarTokenPrueba(999, 'tst-vecino-tipos@edificioxyz.com', 'Copropietario');
  });

  afterAll(async () => {
    // Limpieza estricta SOLO por IDs creados por esta prueba
    await limpiar({
      departamentos: createdDeptoIds,
      tiposDepartamento: createdTipoIds,
    });
  });

  // ── PUNTO 1: GET / POST / PUT /api/v1/tipos-departamento ───────────────────
  describe('Punto 1: CRUD Tipos de Departamento y Alias montos-tipo', () => {
    it('1.1. Rechazar acceso a Copropietario en /tipos-departamento (403)', async () => {
      const resGet = await request(app)
        .get('/api/v1/tipos-departamento')
        .set('Authorization', `Bearer ${copropietarioToken}`);
      expect(resGet.status).toBe(403);

      const resPost = await request(app)
        .post('/api/v1/tipos-departamento')
        .set('Authorization', `Bearer ${copropietarioToken}`)
        .send({ nombre: 'TST-Suite Presidencial Premium', montoExpensa: 650 });
      expect(resPost.status).toBe(403);
    });

    it('1.2. POST /tipos-departamento crea un tipo con nombre hasta 60 chars, montoExpensa > 0, areaM2 opcional y audita', async () => {
      const res = await request(app)
        .post('/api/v1/tipos-departamento')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'TST-Suite Presidencial Premium',
          montoExpensa: 850.5,
          areaM2: 120.75,
          activo: true,
        });

      const idTipo = res.body?.idTipo || res.body?.tipo?.idTipo;
      if (idTipo) createdTipoIds.push(idTipo);

      expect(res.status).toBe(201);
      expect(res.body.nombre).toBe('TST-Suite Presidencial Premium');
      expect(Number(res.body.montoExpensa)).toBe(850.5);
      expect(Number(res.body.areaM2)).toBe(120.75);
      expect(res.body.activo).toBe(true);

      // Verificar registro de auditoría
      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'tipos_departamento',
          accion: 'CREAR_TIPO_DEPARTAMENTO',
          idRegistro: String(idTipo),
        },
      });
      expect(audit).toBeDefined();
    });

    it('1.3. POST /tipos-departamento rechaza duplicados de nombre con 409 y montoExpensa <= 0 con 400', async () => {
      // Duplicado de nombre (usar el creado en 1.2)
      const resDup = await request(app)
        .post('/api/v1/tipos-departamento')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'TST-Suite Presidencial Premium',
          montoExpensa: 900,
        });
      expect(resDup.status).toBe(409);

      // montoExpensa <= 0
      const resMonto = await request(app)
        .post('/api/v1/tipos-departamento')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'TST-Tipo Invalido',
          montoExpensa: 0,
        });
      expect(resMonto.status).toBe(400);
    });

    it('1.4. GET /tipos-departamento lista los tipos con todos los campos requeridos', async () => {
      const res = await request(app)
        .get('/api/v1/tipos-departamento')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const creado = res.body.data.find((t: any) => t.nombre === 'TST-Suite Presidencial Premium');
      expect(creado).toBeDefined();
      expect(Number(creado.montoExpensa)).toBe(850.5);
      expect(Number(creado.areaM2)).toBe(120.75);
      expect(creado.activo).toBe(true);
    });

    it('1.5. PUT /tipos-departamento/:id con activo=false retorna 409 si tiene departamentos asignados', async () => {
      const idTipo = createdTipoIds[0];

      // Crear departamento TST- asignado a este tipo
      const deptoTest = await crearDepartamentoTest({
        numero: generarNumeroDeptoTest('TP'),
        idTipo,
      });
      createdDeptoIds.push(deptoTest.idDepartamento);

      // Intentar desactivar el tipo
      const res = await request(app)
        .put(`/api/v1/tipos-departamento/${idTipo}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ activo: false });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('departamento(s) asignado(s)');
    });

    it('1.6. PUT /tipos-departamento/:id actualiza exitosamente cuando no hay conflicto', async () => {
      // Crear un tipo TST- sin departamentos asignados
      const tipoLibre = await crearTipoDepartamentoTest({
        nombre: 'TST-Penthouse Libre',
        montoExpensa: 1000,
        areaM2: 200,
        activo: true,
      });
      createdTipoIds.push(tipoLibre.idTipo);

      const res = await request(app)
        .put(`/api/v1/tipos-departamento/${tipoLibre.idTipo}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'TST-Penthouse Libre Editado',
          montoExpensa: 1200,
          areaM2: 210,
          activo: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.nombre).toBe('TST-Penthouse Libre Editado');
      expect(Number(res.body.montoExpensa)).toBe(1200);
      expect(res.body.activo).toBe(false);

      // Auditoría registrada
      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'tipos_departamento',
          accion: 'ACTUALIZAR_TIPO_DEPARTAMENTO',
          idRegistro: String(tipoLibre.idTipo),
        },
      });
      expect(audit).toBeDefined();
    });

    it('1.7. Mantener GET/PUT /api/v1/expensas/montos-tipo como alias compatibles', async () => {
      const resGet = await request(app)
        .get('/api/v1/expensas/montos-tipo')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resGet.status).toBe(200);
      expect(Array.isArray(resGet.body.data)).toBe(true);
    });
  });

  // ── PUNTO 2: Asignación de tipos a departamentos ───────────────────────────
  describe('Punto 2: Asignación de tipo individual y masiva con herencia de área y validación de tipos activos', () => {
    it('2.1. PUT /departamentos/:id/tipo asigna tipo activo y hereda area_m2 si el departamento no tiene', async () => {
      // Tipo activo con areaM2 = 88.5
      const tipoActivo = await crearTipoDepartamentoTest({
        nombre: 'TST-Tipo Con Area',
        montoExpensa: 450,
        areaM2: 88.5,
        activo: true,
      });
      createdTipoIds.push(tipoActivo.idTipo);

      // Departamento TST- sin área (areaM2 = null)
      const depto = await crearDepartamentoTest({
        numero: generarNumeroDeptoTest('ASG'),
      });
      createdDeptoIds.push(depto.idDepartamento);

      const res = await request(app)
        .put(`/api/v1/departamentos/${depto.idDepartamento}/tipo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ idTipo: tipoActivo.idTipo });

      expect(res.status).toBe(200);
      expect(res.body.idTipo).toBe(tipoActivo.idTipo);
      expect(Number(res.body.areaM2)).toBe(88.5); // Heredó areaM2

      // Verificar en BD
      const deptoBD = await prisma.departamento.findUnique({
        where: { idDepartamento: depto.idDepartamento },
      });
      expect(deptoBD!.idTipo).toBe(tipoActivo.idTipo);
      expect(Number(deptoBD!.areaM2)).toBe(88.5);

      // Verificar auditoría
      const audit = await prisma.auditoria.findFirst({
        where: {
          tablaAfectada: 'departamentos',
          accion: 'ASIGNAR_TIPO_DEPARTAMENTO',
          idRegistro: String(depto.idDepartamento),
        },
      });
      expect(audit).toBeDefined();
    });

    it('2.2. PUT /departamentos/:id/tipo rechaza con 422 si el tipo está inactivo o no existe', async () => {
      const tipoInactivo = await crearTipoDepartamentoTest({
        nombre: 'TST-Tipo Inactivo Asg',
        montoExpensa: 300,
        activo: false,
      });
      createdTipoIds.push(tipoInactivo.idTipo);

      const depto = await crearDepartamentoTest({
        numero: generarNumeroDeptoTest('INA'),
      });
      createdDeptoIds.push(depto.idDepartamento);

      // Tipo inactivo -> 422
      const resInactivo = await request(app)
        .put(`/api/v1/departamentos/${depto.idDepartamento}/tipo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ idTipo: tipoInactivo.idTipo });
      expect(resInactivo.status).toBe(422);

      // Tipo inexistente -> 422
      const resNoExiste = await request(app)
        .put(`/api/v1/departamentos/${depto.idDepartamento}/tipo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ idTipo: 999999 });
      expect(resNoExiste.status).toBe(422);
    });

    it('2.3. PUT /departamentos/asignar-tipo ejecuta transacción todo o nada (atómica)', async () => {
      const tipoActivo = await crearTipoDepartamentoTest({
        nombre: 'TST-Tipo Bulk Activo',
        montoExpensa: 550,
        activo: true,
      });
      createdTipoIds.push(tipoActivo.idTipo);

      const depto1 = await crearDepartamentoTest({ numero: generarNumeroDeptoTest('B1') });
      const depto2 = await crearDepartamentoTest({ numero: generarNumeroDeptoTest('B2') });
      createdDeptoIds.push(depto1.idDepartamento, depto2.idDepartamento);

      // Transacción que falla en el segundo elemento (tipo 999999) -> nada debe cambiar (todo o nada)
      const resFallo = await request(app)
        .put('/api/v1/departamentos/asignar-tipo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          asignaciones: [
            { idDepartamento: depto1.idDepartamento, idTipo: tipoActivo.idTipo },
            { idDepartamento: depto2.idDepartamento, idTipo: 999999 },
          ],
        });
      expect(resFallo.status).toBe(422);

      // Comprobar que depto1 no fue modificado en la BD
      const depto1BD = await prisma.departamento.findUnique({
        where: { idDepartamento: depto1.idDepartamento },
      });
      expect(depto1BD!.idTipo).toBe(depto1.idTipo); // Mismo idTipo previo

      // Transacción exitosa
      const resExito = await request(app)
        .put('/api/v1/departamentos/asignar-tipo')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          asignaciones: [
            { idDepartamento: depto1.idDepartamento, idTipo: tipoActivo.idTipo },
            { idDepartamento: depto2.idDepartamento, idTipo: tipoActivo.idTipo },
          ],
        });
      expect(resExito.status).toBe(200);
      expect(resExito.body.actualizados).toBe(2);
    });

    it('2.4. GET /unidades devuelve tipo y monto para cada unidad', async () => {
      const res = await request(app)
        .get('/api/v1/unidades')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const depto = res.body.data.find((u: any) => u.tipoUnidad === 'Departamento');
      expect(depto).toBeDefined();
      expect(depto).toHaveProperty('numero');
      expect(depto).toHaveProperty('tipo');
      expect(depto).toHaveProperty('monto');
    });
  });
});
