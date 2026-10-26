// backend/tests/movimientos_ingresos_egresos.test.ts
// Pruebas TST- para US2.3 (Prompt 9): Ingresos, Egresos, Categorías, Validaciones y Filtro Q

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { hash } from 'bcryptjs';
import { prisma } from '@edificio-xyz/database';
import { app } from '../src/index';
import { generarTokenPrueba } from './setup';
import { limpiar } from './test.helpers';

describe('US2.3 Prompt 9: Movimientos Ingresos y Egresos con Campos Opcionales y Categorías', () => {
  const createdMovimientosIds: number[] = [];
  const createdCategoriasIds: number[] = [];
  const createdUserIds: number[] = [];

  let adminToken: string;
  let copropietarioToken: string;
  let adminUserId: number;
  let copropietarioUserId: number;

  let testCatEgresoId: number;
  let testCatIngresoId: number;
  let movBuscableId: number;

  let conteoMovimientosRealesInicial: number;

  beforeAll(async () => {
    // 0. Guardar conteo inicial de movimientos reales (no TST-)
    const realesPre = await prisma.$queryRawUnsafe<any[]>(`
      SELECT count(*)::text as c FROM edificio.movimientos
      WHERE descripcion NOT LIKE 'TST-%' AND descripcion NOT LIKE 'TEST-%';
    `);
    conteoMovimientosRealesInicial = Number(realesPre[0]?.c || 0);

    // 1. Crear usuarios de prueba con prefijo TST-
    const rolAdmin = await prisma.rol.findFirst({ where: { nombre: 'Administrador' } });
    const rolCopropietario = await prisma.rol.findFirst({ where: { nombre: 'Copropietario' } });

    const passwordHash = await hash('Password123!', 10);
    const ts = Date.now().toString().slice(-5);

    const adminUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-adm-${ts}`,
        correo: `tst-adm-${ts}@edificioxyz.com`,
        passwordHash,
        idRol: rolAdmin?.idRol || 1,
        activo: true,
      },
    });
    createdUserIds.push(adminUser.idUsuario);
    adminUserId = adminUser.idUsuario;

    const copropietarioUser = await prisma.usuario.create({
      data: {
        nombreUsuario: `TST-cop-${ts}`,
        correo: `tst-cop-${ts}@edificioxyz.com`,
        passwordHash,
        idRol: rolCopropietario?.idRol || 2,
        activo: true,
      },
    });
    createdUserIds.push(copropietarioUser.idUsuario);
    copropietarioUserId = copropietarioUser.idUsuario;

    adminToken = await generarTokenPrueba(adminUserId, adminUser.correo, 'Administrador');
    copropietarioToken = await generarTokenPrueba(copropietarioUserId, copropietarioUser.correo, 'Copropietario');
  }, 60000);

  afterAll(async () => {
    try {
      await limpiar({
        movimientos: createdMovimientosIds,
        categoriasMovimiento: createdCategoriasIds,
        usuarios: createdUserIds,
      });
    } catch (err: any) {
      console.error('❌ [afterAll] Falló la limpieza de datos de prueba:', err.message, {
        movimientosNoBorrados: createdMovimientosIds,
        categoriasNoBorradas: createdCategoriasIds,
        usuariosNoBorrados: createdUserIds,
      });
      throw err;
    }
  }, 60000);

  // ===========================================================================
  // 1. Categorías de movimiento (POST y PUT)
  // ===========================================================================
  describe('Categorías de Movimiento (/movimientos/categorias)', () => {
    it('debe permitir a Administrador crear categorías de Egreso e Ingreso (POST 201)', async () => {
      const resEgreso = await request(app)
        .post('/api/v1/movimientos/categorias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: `TST-Egreso-Mant-${Date.now().toString().slice(-4)}`,
          tipo: 'Egreso',
        });

      expect(resEgreso.status).toBe(201);
      expect(resEgreso.body.tipo).toBe('Egreso');
      createdCategoriasIds.push(resEgreso.body.idCategoria);
      testCatEgresoId = resEgreso.body.idCategoria;

      const resIngreso = await request(app)
        .post('/api/v1/movimientos/categorias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: `TST-Ingreso-Alq-${Date.now().toString().slice(-4)}`,
          tipo: 'Ingreso',
        });

      expect(resIngreso.status).toBe(201);
      expect(resIngreso.body.tipo).toBe('Ingreso');
      createdCategoriasIds.push(resIngreso.body.idCategoria);
      testCatIngresoId = resIngreso.body.idCategoria;
    });

    it('debe rechazar duplicados de nombre para el mismo tipo con 409 Conflict', async () => {
      const dupNombre = `TST-Unica-${Date.now().toString().slice(-4)}`;
      const res1 = await request(app)
        .post('/api/v1/movimientos/categorias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: dupNombre, tipo: 'Ingreso' });
      expect(res1.status).toBe(201);
      createdCategoriasIds.push(res1.body.idCategoria);

      const res2 = await request(app)
        .post('/api/v1/movimientos/categorias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: dupNombre, tipo: 'Ingreso' });
      expect(res2.status).toBe(409);
    });

    it('debe rechazar categorías con nombre mayor a 80 caracteres con 400 y denegar 403 a no-admin', async () => {
      const longRes = await request(app)
        .post('/api/v1/movimientos/categorias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'A'.repeat(81), tipo: 'Egreso' });

      expect(longRes.status).toBe(400);
      expect(longRes.body.details).toHaveProperty('nombre');

      const noAuthRes = await request(app)
        .post('/api/v1/movimientos/categorias')
        .set('Authorization', `Bearer ${copropietarioToken}`)
        .send({ nombre: 'TST-NoAuth', tipo: 'Ingreso' });

      expect(noAuthRes.status).toBe(403);
    });

    it('debe permitir a Administrador actualizar una categoría existente con PUT 200', async () => {
      const nuevoNombre = `TST-Cat-Mod-${Date.now().toString().slice(-4)}`;
      const res = await request(app)
        .put(`/api/v1/movimientos/categorias/${testCatIngresoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: nuevoNombre });

      expect(res.status).toBe(200);
      expect(res.body.nombre).toBe(nuevoNombre);
    });

    it('debe rechazar duplicados case-insensitive y con espacios en POST y PUT', async () => {
      const base = `TST-Servicios-${Date.now().toString().slice(-4)}`;
      // 1. POST inicial
      const res1 = await request(app)
        .post('/api/v1/movimientos/categorias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: `  ${base.toLowerCase()}  `, tipo: 'Egreso' });
      expect(res1.status).toBe(201);
      createdCategoriasIds.push(res1.body.idCategoria);

      // 2. POST duplicado con mayúsculas y espacios
      const resPostDup = await request(app)
        .post('/api/v1/movimientos/categorias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: `  ${base.toUpperCase()}  `, tipo: 'Egreso' });
      expect(resPostDup.status).toBe(409);
      expect(resPostDup.body.code).toBe('CATEGORIA_DUPLICADA');

      // 3. Crear otra categoría para probar PUT
      const res2 = await request(app)
        .post('/api/v1/movimientos/categorias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: `TST-Otra-${Date.now().toString().slice(-4)}`, tipo: 'Egreso' });
      expect(res2.status).toBe(201);
      createdCategoriasIds.push(res2.body.idCategoria);
      const cat2Id = res2.body.idCategoria;

      // 4. PUT con mayúsculas y espacios sobre la segunda categoría
      const resPutDup = await request(app)
        .put(`/api/v1/movimientos/categorias/${cat2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: `   ${base.toUpperCase()}   ` });
      expect(resPutDup.status).toBe(409);
      expect(resPutDup.body.code).toBe('CATEGORIA_DUPLICADA');
    });

    it('debe permitir cambiar tipo si no tiene movimientos y responder 409 CATEGORIA_CON_MOVIMIENTOS si tiene asociados', async () => {
      // 1. Categoría sin movimientos: cambiar de Egreso a Ingreso permitido
      const resCatVacia = await request(app)
        .post('/api/v1/movimientos/categorias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: `TST-Vacia-${Date.now().toString().slice(-4)}`, tipo: 'Egreso' });
      expect(resCatVacia.status).toBe(201);
      const idCatVacia = resCatVacia.body.idCategoria;
      createdCategoriasIds.push(idCatVacia);

      const resCambioOk = await request(app)
        .put(`/api/v1/movimientos/categorias/${idCatVacia}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tipo: 'Ingreso' });
      expect(resCambioOk.status).toBe(200);
      expect(resCambioOk.body.tipo).toBe('Ingreso');

      // 2. Categoría con movimiento asociado: cambiar tipo bloqueado con 409
      const resCatConMov = await request(app)
        .post('/api/v1/movimientos/categorias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: `TST-ConMov-${Date.now().toString().slice(-4)}`, tipo: 'Egreso' });
      expect(resCatConMov.status).toBe(201);
      const idCatConMov = resCatConMov.body.idCategoria;
      createdCategoriasIds.push(idCatConMov);

      const resMov = await request(app)
        .post('/api/v1/movimientos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipo: 'Egreso',
          idCategoria: idCatConMov,
          monto: 100,
          descripcion: 'TST-Movimiento para probar bloqueo de categoria',
          fecha: '2095-07-01',
        });
      expect(resMov.status).toBe(201);
      createdMovimientosIds.push(resMov.body.idMovimiento);

      // Intentar cambiar tipo de categoría que tiene movimiento
      const resCambioBloqueado = await request(app)
        .put(`/api/v1/movimientos/categorias/${idCatConMov}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tipo: 'Ingreso' });
      expect(resCambioBloqueado.status).toBe(409);
      expect(resCambioBloqueado.body.code).toBe('CATEGORIA_CON_MOVIMIENTOS');
    });
  });

  // ===========================================================================
  // 2. Alta de movimientos (POST) con y sin campos nuevos
  // ===========================================================================
  describe('Alta de Movimientos (/movimientos)', () => {
    it('debe registrar un movimiento con todos los campos nuevos (tercero, nroFactura, metodoPago)', async () => {
      const payload = {
        tipo: 'Egreso',
        idCategoria: testCatEgresoId,
        monto: 850.75,
        descripcion: 'TST-Compra de insumos bombas de agua',
        fecha: '2095-04-10T14:30:00.000Z',
        tercero: 'TST-Ferretería Industrial La Paz',
        nroFactura: 'FAC-2095-8841',
        metodoPago: 'Transferencia Bancaria QR',
      };

      const res = await request(app)
        .post('/api/v1/movimientos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('idMovimiento');
      expect(res.body.tercero).toBe('TST-Ferretería Industrial La Paz');
      expect(res.body.nroFactura).toBe('FAC-2095-8841');
      expect(res.body.metodoPago).toBe('Transferencia Bancaria QR');
      createdMovimientosIds.push(res.body.idMovimiento);
      movBuscableId = res.body.idMovimiento;
    });

    it('debe registrar un movimiento sin campos nuevos (campos ausentes se guardan como null)', async () => {
      const payload = {
        tipo: 'Ingreso',
        idCategoria: testCatIngresoId,
        monto: 1500.0,
        descripcion: 'TST-Ingreso ordinario sin factura',
        fecha: '2095-05-01T09:00:00.000Z',
      };

      const res = await request(app)
        .post('/api/v1/movimientos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('idMovimiento');
      expect(res.body.tercero).toBeNull();
      expect(res.body.nroFactura).toBeNull();
      expect(res.body.metodoPago).toBeNull();
      createdMovimientosIds.push(res.body.idMovimiento);
    });

    it('debe aplicar trim, convertir cadenas vacías a null y aceptar metodoPago libre', async () => {
      const payload = {
        tipo: 'Ingreso',
        idCategoria: testCatIngresoId,
        monto: 400.0,
        descripcion: 'TST-Egreso con campos en blanco y metodo libre',
        fecha: '2095-05-10T10:00:00.000Z',
        tercero: '   TST-Proveedor con espacios   ',
        nroFactura: '   ',
        metodoPago: 'Criptomoneda USDT',
      };

      const res = await request(app)
        .post('/api/v1/movimientos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.tercero).toBe('TST-Proveedor con espacios');
      expect(res.body.nroFactura).toBeNull();
      expect(res.body.metodoPago).toBe('Criptomoneda USDT');
      createdMovimientosIds.push(res.body.idMovimiento);
    });
  });

  // ===========================================================================
  // 3. Modificación de movimientos (PUT)
  // ===========================================================================
  describe('Modificación de Movimientos (PUT /movimientos/:id)', () => {
    it('debe permitir modificar campos opcionales y vaciarlos enviando cadena vacía', async () => {
      // 1. Modificar con nuevos valores
      const resMod = await request(app)
        .put(`/api/v1/movimientos/${movBuscableId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tercero: 'TST-Schindler Ascensores Bolivia',
          nroFactura: 'FAC-SCH-2095-09',
          metodoPago: 'Cheque Certificado',
        });

      expect(resMod.status).toBe(200);
      expect(resMod.body.tercero).toBe('TST-Schindler Ascensores Bolivia');
      expect(resMod.body.nroFactura).toBe('FAC-SCH-2095-09');
      expect(resMod.body.metodoPago).toBe('Cheque Certificado');

      // 2. Vaciar campo enviando cadena en blanco
      const resVaciar = await request(app)
        .put(`/api/v1/movimientos/${movBuscableId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          metodoPago: '   ',
        });

      expect(resVaciar.status).toBe(200);
      expect(resVaciar.body.metodoPago).toBeNull();
      expect(resVaciar.body.tercero).toBe('TST-Schindler Ascensores Bolivia');
    });

    it('debe permitir borrar nroFactura y metodoPago enviando null explícito en PUT', async () => {
      // 1. Crear un movimiento con nroFactura y metodoPago
      const resCrear = await request(app)
        .post('/api/v1/movimientos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipo: 'Egreso',
          idCategoria: testCatEgresoId,
          monto: 300,
          descripcion: 'TST-Movimiento para borrado con null',
          fecha: '2095-08-01',
          nroFactura: 'FAC-PREVIA-01',
          metodoPago: 'Transferencia',
        });
      expect(resCrear.status).toBe(201);
      const idMov = resCrear.body.idMovimiento;
      createdMovimientosIds.push(idMov);

      // 2. Borrar enviando null explícito
      const resBorrar = await request(app)
        .put(`/api/v1/movimientos/${idMov}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nroFactura: null,
          metodoPago: null,
        });

      expect(resBorrar.status).toBe(200);
      expect(resBorrar.body.nroFactura).toBeNull();
      expect(resBorrar.body.metodoPago).toBeNull();
    });

    it('debe responder 400 si en PUT se envía descripcion null o cadena vacía', async () => {
      const resNull = await request(app)
        .put(`/api/v1/movimientos/${movBuscableId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ descripcion: null });
      expect(resNull.status).toBe(400);

      const resEmpty = await request(app)
        .put(`/api/v1/movimientos/${movBuscableId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ descripcion: '   ' });
      expect(resEmpty.status).toBe(400);
    });
  });

  // ===========================================================================
  // 4. Validaciones 400 y Límites de Longitud
  // ===========================================================================
  describe('Validaciones 400 y Límites', () => {
    it('debe responder 400 con details por campo cuando faltan campos obligatorios', async () => {
      const res = await request(app)
        .post('/api/v1/movimientos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('details');
      const d = res.body.details;
      expect(d).toHaveProperty('tipo');
      expect(d.idCategoria || d.categoria).toBeDefined();
      expect(d).toHaveProperty('monto');
      expect(d).toHaveProperty('fecha');
      expect(d).toHaveProperty('descripcion');
    });

    it('debe responder 400 con details si campos exceden sus longitudes máximas (tercero>120, nroFactura>50, metodoPago>30)', async () => {
      const resTercero = await request(app)
        .post('/api/v1/movimientos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipo: 'Egreso',
          idCategoria: testCatEgresoId,
          monto: 100,
          descripcion: 'TST-Exceso tercero',
          fecha: '2095-06-01',
          tercero: 'T'.repeat(121),
        });
      expect(resTercero.status).toBe(400);
      expect(resTercero.body.details).toHaveProperty('tercero');

      const resFactura = await request(app)
        .post('/api/v1/movimientos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipo: 'Egreso',
          idCategoria: testCatEgresoId,
          monto: 100,
          descripcion: 'TST-Exceso nroFactura',
          fecha: '2095-06-01',
          nroFactura: 'F'.repeat(51),
        });
      expect(resFactura.status).toBe(400);
      expect(resFactura.body.details.nroFactura || resFactura.body.details.nro_factura).toBeDefined();

      const resMetodo = await request(app)
        .post('/api/v1/movimientos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipo: 'Egreso',
          idCategoria: testCatEgresoId,
          monto: 100,
          descripcion: 'TST-Exceso metodoPago',
          fecha: '2095-06-01',
          metodoPago: 'M'.repeat(31),
        });
      expect(resMetodo.status).toBe(400);
      expect(resMetodo.body.details.metodoPago || resMetodo.body.details.metodo_pago).toBeDefined();
    });
  });

  // ===========================================================================
  // 5. Filtro Q en Listado y Detalle
  // ===========================================================================
  describe('Filtro Q y Detalle', () => {
    it('debe encontrar el movimiento filtrando por texto en tercero y nro_factura', async () => {
      const resTercero = await request(app)
        .get('/api/v1/movimientos?q=Schindler')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resTercero.status).toBe(200);
      const idsTercero = resTercero.body.data.map((x: any) => x.idMovimiento);
      expect(idsTercero).toContain(movBuscableId);

      const resFactura = await request(app)
        .get('/api/v1/movimientos?q=SCH-2095-09')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resFactura.status).toBe(200);
      const idsFactura = resFactura.body.data.map((x: any) => x.idMovimiento);
      expect(idsFactura).toContain(movBuscableId);
    });

    it('debe retornar tercero y nroFactura en GET /movimientos/:id', async () => {
      const res = await request(app)
        .get(`/api/v1/movimientos/${movBuscableId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tercero).toBe('TST-Schindler Ascensores Bolivia');
      expect(res.body.nroFactura).toBe('FAC-SCH-2095-09');
    });
  });

  // ===========================================================================
  // 6. RBAC 403 en Movimientos
  // ===========================================================================
  describe('RBAC y Permisos', () => {
    it('debe responder 403 a Copropietario intentando registrar o modificar movimiento', async () => {
      const resPost = await request(app)
        .post('/api/v1/movimientos')
        .set('Authorization', `Bearer ${copropietarioToken}`)
        .send({
          tipo: 'Ingreso',
          idCategoria: testCatIngresoId,
          monto: 100,
          descripcion: 'TST-No permitido',
          fecha: '2095-08-01',
        });
      expect(resPost.status).toBe(403);

      const resPut = await request(app)
        .put(`/api/v1/movimientos/${movBuscableId}`)
        .set('Authorization', `Bearer ${copropietarioToken}`)
        .send({ monto: 50 });
      expect(resPut.status).toBe(403);
    });
  });

  // ===========================================================================
  // 7. Integridad de los Movimientos Reales
  // ===========================================================================
  describe('Integridad de Datos Reales en BD Compartida', () => {
    it('los movimientos reales no sufren modificaciones ni pérdidas', async () => {
      const realesPost = await prisma.$queryRawUnsafe<any[]>(`
        SELECT count(*)::text as c FROM edificio.movimientos
        WHERE descripcion NOT LIKE 'TST-%' AND descripcion NOT LIKE 'TEST-%';
      `);
      const conteoFinal = Number(realesPost[0]?.c || 0);
      expect(conteoFinal).toBe(conteoMovimientosRealesInicial);
    });
  });
});
