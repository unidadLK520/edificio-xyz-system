// backend/tests/test_hu05_movimientos_e2e.ts
// Test E2E HTTP Real para HU05: Gestión Integral de Movimientos Financieros, RBAC, Soft-Delete y Auditoría

import 'dotenv/config';
import process from 'node:process';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { SignJWT } from 'jose';
import { prisma } from '@edificio-xyz/database';
import { config } from '../src/config';
import { router } from '../src/routes';
import { errorMiddleware } from '../src/middlewares/error.middleware';

async function main() {
  console.log('🚀 ====================================================================');
  console.log('🚀 Test E2E HTTP Real para HU05: Gestión de Movimientos Financieros');
  console.log('🚀 ====================================================================\n');

  // 1. Probar conectividad con base de datos
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    console.log('✅ Conexión con PostgreSQL establecida correctamente.\n');
  } catch (dbErr: any) {
    console.error('❌ No se pudo conectar a PostgreSQL:', dbErr.message);
    process.exit(1);
  }

  // 2. Levantar servidor Express en puerto 4005
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/v1', router);
  app.use(errorMiddleware);

  const PORT = 4005;
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`📡 Servidor de pruebas HU05 iniciado en http://localhost:${PORT}\n`);
      resolve();
    });
  });

  const baseUrl = `http://localhost:${PORT}/api/v1/movimientos`;

  // Helper para generar tokens JWT
  async function generarToken(idUsuario: number, correo: string, rol: string) {
    return new SignJWT({ idUsuario, nombreUsuario: correo.split('@')[0], correo, rol })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(config.jwtSecret);
  }

  // Buscar usuarios válidos para asociar llaves foráneas existentes
  const adminUser = await prisma.usuario.findFirst({ where: { rol: { nombre: 'Administrador' } } });
  const directorioUser = await prisma.usuario.findFirst({ where: { rol: { nombre: 'Directorio' } } });
  const copropietarioUser = await prisma.usuario.findFirst({ where: { rol: { nombre: 'Copropietario' } } });

  const adminToken = await generarToken(
    adminUser?.idUsuario || 1,
    adminUser?.correo || 'admin@edificioxyz.com',
    'Administrador'
  );
  const directorioToken = await generarToken(
    directorioUser?.idUsuario || 3,
    directorioUser?.correo || 'directorio@edificioxyz.com',
    'Directorio'
  );
  const copropietarioToken = await generarToken(
    copropietarioUser?.idUsuario || 14,
    copropietarioUser?.correo || 'copropietario@edificioxyz.com',
    'Copropietario'
  );

  // Categorías para pruebas
  const catIngreso = await prisma.categoriaMovimiento.findFirst({ where: { tipo: 'Ingreso' } });
  const catEgreso = await prisma.categoriaMovimiento.findFirst({ where: { tipo: 'Egreso' } });

  if (!catIngreso || !catEgreso) {
    console.error('❌ No se encontraron categorías de Ingreso y/o Egreso en la base de datos.');
    server.close();
    process.exit(1);
  }

  const createdMovimientosIds: number[] = [];
  let testFailed = false;

  function assert(condition: boolean, passMsg: string, failMsg: string) {
    if (condition) {
      console.log(`✅ ${passMsg}`);
    } else {
      console.error(`❌ ${failMsg}`);
      testFailed = true;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // CA1 / CA2 / CA3 / CA4: Crear Ingreso y Egreso con categoría válida
    // -------------------------------------------------------------------------
    console.log('--- CA1 / CA2 / CA3 / CA4: Registro de Ingreso y Egreso con Categoría ---');

    const resIngreso = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        tipo: 'Ingreso',
        idCategoria: catIngreso.idCategoria,
        monto: 1250.5,
        descripcion: 'Aporte voluntario mejoras jardín E2E',
        fecha: '2026-06-10T10:00:00.000Z',
      }),
    });
    const dataIngreso: any = await resIngreso.json();
    assert(
      resIngreso.status === 201 &&
        dataIngreso.idMovimiento &&
        Number(dataIngreso.monto) === 1250.5 &&
        dataIngreso.tipo === 'Ingreso' &&
        dataIngreso.categoria?.idCategoria === catIngreso.idCategoria,
      `CA1/CA3 PASS: Movimiento Ingreso registrado correctamente (ID: ${dataIngreso.idMovimiento})`,
      `CA1/CA3 FAIL: Error registrando Ingreso. Status: ${resIngreso.status}, body: ${JSON.stringify(dataIngreso)}`
    );
    if (dataIngreso.idMovimiento) createdMovimientosIds.push(dataIngreso.idMovimiento);

    const resEgreso = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        tipo: 'Egreso',
        idCategoria: catEgreso.idCategoria,
        monto: 450.0,
        descripcion: 'Reparación chapa ingreso principal E2E',
        fecha: '2026-06-15T15:00:00.000Z',
      }),
    });
    const dataEgreso: any = await resEgreso.json();
    assert(
      resEgreso.status === 201 &&
        dataEgreso.idMovimiento &&
        Number(dataEgreso.monto) === 450 &&
        dataEgreso.tipo === 'Egreso' &&
        dataEgreso.categoria?.idCategoria === catEgreso.idCategoria,
      `CA2/CA4 PASS: Movimiento Egreso registrado correctamente (ID: ${dataEgreso.idMovimiento})`,
      `CA2/CA4 FAIL: Error registrando Egreso. Status: ${resEgreso.status}, body: ${JSON.stringify(dataEgreso)}`
    );
    if (dataEgreso.idMovimiento) createdMovimientosIds.push(dataEgreso.idMovimiento);

    // -------------------------------------------------------------------------
    // CA6 / CA7: Filtro por período y filtros combinados (tipo + categoría)
    // -------------------------------------------------------------------------
    console.log('\n--- CA6 / CA7: Filtro por Período y Filtros Combinados ---');

    // Crear un movimiento fuera del rango de junio (ej. julio 2026)
    const resJulio = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        tipo: 'Ingreso',
        idCategoria: catIngreso.idCategoria,
        monto: 300,
        descripcion: 'Movimiento fuera de rango (Julio) E2E',
        fecha: '2026-07-20T10:00:00.000Z',
      }),
    });
    const dataJulio: any = await resJulio.json();
    if (dataJulio.idMovimiento) createdMovimientosIds.push(dataJulio.idMovimiento);

    // 1. Filtrar período junio 2026
    const resFiltroPeriodo = await fetch(`${baseUrl}?fechaDesde=2026-06-01&fechaHasta=2026-06-30`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataPeriodo: any = await resFiltroPeriodo.json();
    const itemsJunio: any[] = dataPeriodo.data || [];
    const tieneJulioEnJunio = itemsJunio.some((m) => m.idMovimiento === dataJulio.idMovimiento);
    const tieneIngresoJunio = itemsJunio.some((m) => m.idMovimiento === dataIngreso.idMovimiento);
    assert(
      resFiltroPeriodo.status === 200 && tieneIngresoJunio && !tieneJulioEnJunio,
      'CA6 PASS: Filtro por rango de fechas devuelve solo los movimientos dentro del período',
      `CA6 FAIL: El filtro por fechas incluyó registros fuera de rango o excluyó los correctos`
    );

    // 2. Filtro combinado por tipo y categoría
    const resFiltroCombinado = await fetch(
      `${baseUrl}?tipo=Ingreso&idCategoria=${catIngreso.idCategoria}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const dataCombinado: any = await resFiltroCombinado.json();
    const itemsCombinados: any[] = dataCombinado.data || [];
    const todosCumplen = itemsCombinados.every(
      (m) => m.tipo === 'Ingreso' && m.idCategoria === catIngreso.idCategoria
    );
    assert(
      resFiltroCombinado.status === 200 && itemsCombinados.length > 0 && todosCumplen,
      'CA7 PASS: Filtro combinado tipo + categoría devuelve resultados exactos y consistentes',
      'CA7 FAIL: Resultados no coinciden con los filtros combinados especificados'
    );

    // -------------------------------------------------------------------------
    // CA8: Modificar movimiento conservando datos no enviados
    // -------------------------------------------------------------------------
    console.log('\n--- CA8: Modificar Movimiento (conservar campos no enviados) ---');

    const resModificar = await fetch(`${baseUrl}/${dataIngreso.idMovimiento}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        monto: 1990.0,
      }),
    });
    const dataModificada: any = await resModificar.json();
    assert(
      resModificar.status === 200 &&
        Number(dataModificada.monto) === 1990.0 &&
        dataModificada.descripcion === 'Aporte voluntario mejoras jardín E2E' &&
        dataModificada.idCategoria === catIngreso.idCategoria &&
        dataModificada.tipo === 'Ingreso',
      'CA8 PASS: Modificación parcial actualiza monto y conserva descripción, categoría y tipo originales',
      `CA8 FAIL: Modificación falló o sobreescribió datos no provistos: ${JSON.stringify(dataModificada)}`
    );

    // -------------------------------------------------------------------------
    // CA9: RBAC (Permisos de Administrador, Directorio y Copropietario)
    // -------------------------------------------------------------------------
    console.log('\n--- CA9: Verificación de RBAC ---');

    // Copropietario intenta POST /
    const resCoprPost = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${copropietarioToken}`,
      },
      body: JSON.stringify({
        tipo: 'Ingreso',
        idCategoria: catIngreso.idCategoria,
        monto: 100,
      }),
    });
    assert(
      resCoprPost.status === 403,
      'CA9 PASS: Copropietario recibe 403 al intentar crear movimiento (POST /)',
      `CA9 FAIL: Se esperaba 403 para Copropietario en POST, se obtuvo ${resCoprPost.status}`
    );

    // Copropietario intenta PUT /:id y DELETE /:id
    const resCoprPut = await fetch(`${baseUrl}/${dataIngreso.idMovimiento}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${copropietarioToken}`,
      },
      body: JSON.stringify({ monto: 500 }),
    });
    const resCoprDelete = await fetch(`${baseUrl}/${dataIngreso.idMovimiento}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${copropietarioToken}`,
      },
      body: JSON.stringify({ motivo: 'Prueba no autorizada' }),
    });
    assert(
      resCoprPut.status === 403 && resCoprDelete.status === 403,
      'CA9 PASS: Copropietario recibe 403 al intentar PUT y DELETE',
      `CA9 FAIL: Se esperaba 403 para Copropietario en PUT/DELETE, se obtuvo PUT: ${resCoprPut.status}, DELETE: ${resCoprDelete.status}`
    );

    // Directorio intenta GET (lectura)
    const [resDirList, resDirResumen, resDirCats, resDirDetalle] = await Promise.all([
      fetch(baseUrl, { headers: { Authorization: `Bearer ${directorioToken}` } }),
      fetch(`${baseUrl}/resumen`, { headers: { Authorization: `Bearer ${directorioToken}` } }),
      fetch(`${baseUrl}/categorias`, { headers: { Authorization: `Bearer ${directorioToken}` } }),
      fetch(`${baseUrl}/${dataIngreso.idMovimiento}`, {
        headers: { Authorization: `Bearer ${directorioToken}` },
      }),
    ]);
    assert(
      resDirList.status === 200 &&
        resDirResumen.status === 200 &&
        resDirCats.status === 200 &&
        resDirDetalle.status === 200,
      'CA9 PASS: Directorio tiene permiso de lectura en los 4 endpoints GET (200 OK)',
      `CA9 FAIL: Directorio no pudo acceder a endpoints GET: ${resDirList.status}, ${resDirResumen.status}, ${resDirCats.status}, ${resDirDetalle.status}`
    );

    // Directorio intenta mutaciones (POST, PUT, DELETE) -> Debe dar 403
    const [resDirPost, resDirPut, resDirDelete] = await Promise.all([
      fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${directorioToken}` },
        body: JSON.stringify({ tipo: 'Ingreso', idCategoria: catIngreso.idCategoria, monto: 100 }),
      }),
      fetch(`${baseUrl}/${dataIngreso.idMovimiento}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${directorioToken}` },
        body: JSON.stringify({ monto: 500 }),
      }),
      fetch(`${baseUrl}/${dataIngreso.idMovimiento}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${directorioToken}` },
        body: JSON.stringify({ motivo: 'Directorio no puede borrar' }),
      }),
    ]);
    assert(
      resDirPost.status === 403 && resDirPut.status === 403 && resDirDelete.status === 403,
      'CA9 PASS: Directorio recibe 403 al intentar crear, modificar o anular movimientos',
      `CA9 FAIL: Directorio no fue bloqueado en mutaciones: POST ${resDirPost.status}, PUT ${resDirPut.status}, DELETE ${resDirDelete.status}`
    );

    // -------------------------------------------------------------------------
    // CA10: Resumen Financiero y consistencia matemática
    // -------------------------------------------------------------------------
    console.log('\n--- CA10: Resumen Financiero y Consistencia Matemática ---');

    // Usamos el mes de noviembre 2026 (mes 11) para aislar datos matemáticos limpios
    const resM1 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        tipo: 'Ingreso',
        idCategoria: catIngreso.idCategoria,
        monto: 1500.0,
        descripcion: 'Resumen test 1',
        fecha: '2026-11-05T08:00:00.000Z',
      }),
    });
    const dM1: any = await resM1.json();
    if (dM1.idMovimiento) createdMovimientosIds.push(dM1.idMovimiento);

    const resM2 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        tipo: 'Ingreso',
        idCategoria: catIngreso.idCategoria,
        monto: 500.0,
        descripcion: 'Resumen test 2',
        fecha: '2026-11-10T08:00:00.000Z',
      }),
    });
    const dM2: any = await resM2.json();
    if (dM2.idMovimiento) createdMovimientosIds.push(dM2.idMovimiento);

    const resM3 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        tipo: 'Egreso',
        idCategoria: catEgreso.idCategoria,
        monto: 800.0,
        descripcion: 'Resumen test 3 egreso',
        fecha: '2026-11-12T08:00:00.000Z',
      }),
    });
    const dM3: any = await resM3.json();
    if (dM3.idMovimiento) createdMovimientosIds.push(dM3.idMovimiento);

    const resResumenNov = await fetch(`${baseUrl}/resumen?anio=2026&mes=11`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataResumenNov: any = await resResumenNov.json();

    const expectedIngresos = 2000.0;
    const expectedEgresos = 800.0;
    const expectedBalance = 1200.0;

    assert(
      resResumenNov.status === 200 &&
        dataResumenNov.totalIngresos === expectedIngresos &&
        dataResumenNov.totalEgresos === expectedEgresos &&
        dataResumenNov.balance === expectedBalance &&
        dataResumenNov.cantidadIngresos === 2 &&
        dataResumenNov.cantidadEgresos === 1,
      `CA10 PASS: Resumen financiero matemáticamente consistente (Ingresos: ${dataResumenNov.totalIngresos}, Egresos: ${dataResumenNov.totalEgresos}, Balance: ${dataResumenNov.balance})`,
      `CA10 FAIL: Inconsistencia matemática en resumen: ${JSON.stringify(dataResumenNov)}`
    );

    // -------------------------------------------------------------------------
    // Casos de Hardening: Soft-Delete, Idempotencia, Error 409 y Auditoría
    // -------------------------------------------------------------------------
    console.log('\n--- Hardening: Soft-Delete, 409 Idempotencia, Modificación Bloqueada y Auditoría ---');

    // 1. Anular movimiento (DELETE con motivo)
    const resAnular = await fetch(`${baseUrl}/${dataEgreso.idMovimiento}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ motivo: 'Factura duplicada registrada por error' }),
    });
    const dataAnular: any = await resAnular.json();
    assert(
      resAnular.status === 200 &&
        dataAnular.success === true &&
        dataAnular.data?.anulado === true &&
        dataAnular.data?.motivoAnulacion === 'Factura duplicada registrada por error',
      'Hardening PASS: DELETE realiza soft-delete registrando anulado=true y motivo de anulación',
      `Hardening FAIL: Error en soft-delete: ${JSON.stringify(dataAnular)}`
    );

    // 2. Trazabilidad: GET / y GET /:id siguen mostrando el movimiento anulado
    const resGetDetalleAnulado = await fetch(`${baseUrl}/${dataEgreso.idMovimiento}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataGetDetalle: any = await resGetDetalleAnulado.json();
    assert(
      resGetDetalleAnulado.status === 200 && dataGetDetalle.anulado === true,
      'Hardening PASS: GET /:id mantiene trazabilidad y expone campo anulado=true',
      `Hardening FAIL: GET /:id no expuso anulado=true: ${JSON.stringify(dataGetDetalle)}`
    );

    const resGetListAnulado = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataGetList: any = await resGetListAnulado.json();
    const itemEnLista = (dataGetList.data || []).find(
      (m: any) => m.idMovimiento === dataEgreso.idMovimiento
    );
    assert(
      itemEnLista && itemEnLista.anulado === true,
      'Hardening PASS: GET / sigue listando movimientos anulados con campo visible para auditoría',
      'Hardening FAIL: GET / no incluyó el movimiento anulado'
    );

    // 3. Intentar anular el mismo movimiento dos veces -> 409 ANULACION_YA_REALIZADA
    const resAnularSegunda = await fetch(`${baseUrl}/${dataEgreso.idMovimiento}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ motivo: 'Intento de anulación repetida' }),
    });
    const dataAnularSegunda: any = await resAnularSegunda.json();
    assert(
      resAnularSegunda.status === 409 && dataAnularSegunda.code === 'ANULACION_YA_REALIZADA',
      'Hardening PASS: Segunda anulación responde 409 con código ANULACION_YA_REALIZADA',
      `Hardening FAIL: Se esperaba 409 ANULACION_YA_REALIZADA, se obtuvo ${resAnularSegunda.status}: ${JSON.stringify(dataAnularSegunda)}`
    );

    // 4. Intentar modificar (PUT) un movimiento ya anulado -> 409 MOVIMIENTO_ANULADO
    const resPutAnulado = await fetch(`${baseUrl}/${dataEgreso.idMovimiento}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ monto: 999.0 }),
    });
    const dataPutAnulado: any = await resPutAnulado.json();
    assert(
      resPutAnulado.status === 409 && dataPutAnulado.code === 'MOVIMIENTO_ANULADO',
      'Hardening PASS: Modificar movimiento anulado responde 409 con código MOVIMIENTO_ANULADO',
      `Hardening FAIL: Se esperaba 409 MOVIMIENTO_ANULADO, se obtuvo ${resPutAnulado.status}: ${JSON.stringify(dataPutAnulado)}`
    );

    // 5. Verificar registros de auditoría
    const auditorias = await prisma.auditoria.findMany({
      where: {
        tablaAfectada: 'movimientos',
        idRegistro: { in: createdMovimientosIds.map(String) },
      },
    });
    const accionesRegistradas = auditorias.map((a) => a.accion);
    const tieneCrear = accionesRegistradas.includes('CREAR_MOVIMIENTO');
    const tieneModificar = accionesRegistradas.includes('MODIFICAR_MOVIMIENTO');
    const tieneAnular = accionesRegistradas.includes('ANULACION_MOVIMIENTO');

    assert(
      tieneCrear && tieneModificar && tieneAnular,
      `Hardening PASS: Se verificaron eventos de auditoría (CREAR: ${tieneCrear}, MODIFICAR: ${tieneModificar}, ANULAR: ${tieneAnular})`,
      `Hardening FAIL: Falta algún evento de auditoría en tabla auditoria. Registrados: ${accionesRegistradas.join(', ')}`
    );

    // 6. Regresión de concurrencia: llamar GET /categorias dos veces en paralelo
    console.log('\n--- Hardening: Regresión de Concurrencia en GET /categorias ---');
    const countAntes = await prisma.categoriaMovimiento.count();
    const [resCat1, resCat2] = await Promise.all([
      fetch(`${baseUrl}/categorias`, { headers: { Authorization: `Bearer ${adminToken}` } }),
      fetch(`${baseUrl}/categorias`, { headers: { Authorization: `Bearer ${adminToken}` } }),
    ]);
    const countDespues = await prisma.categoriaMovimiento.count();
    assert(
      resCat1.status === 200 && resCat2.status === 200 && countAntes === countDespues,
      `Hardening PASS: Concurrencia en GET /categorias validada sin duplicación (Categorías: ${countAntes} -> ${countDespues})`,
      `Hardening FAIL: Concurrencia en GET /categorias causó variación o duplicados: antes=${countAntes}, después=${countDespues}`
    );

  } catch (err: any) {
    console.error('❌ Excepción durante ejecución de tests:', err);
    testFailed = true;
  } finally {
    console.log('\n🧹 Limpiando datos de prueba...');
    try {
      if (createdMovimientosIds.length > 0) {
        await prisma.auditoria.deleteMany({
          where: {
            tablaAfectada: 'movimientos',
            idRegistro: { in: createdMovimientosIds.map(String) },
          },
        });
        await prisma.movimiento.deleteMany({
          where: { idMovimiento: { in: createdMovimientosIds } },
        });
        console.log(`✅ Limpieza completada: ${createdMovimientosIds.length} movimientos de prueba eliminados.`);
      }
    } catch (cleanupErr: any) {
      console.error('⚠️ Error durante la limpieza:', cleanupErr.message);
    }

    server.close();
    console.log('📡 Servidor de pruebas detenido.');
    console.log('\n🏁 ====================================================================');
    if (testFailed) {
      console.log('❌ SUITE HU05 FINALIZADA CON ERRORES.');
      console.log('🏁 ====================================================================\n');
      process.exit(1);
    } else {
      console.log('✅ SUITE HU05 FINALIZADA EXITOSAMENTE (TODOS LOS CASOS EN VERDE).');
      console.log('🏁 ====================================================================\n');
      process.exit(0);
    }
  }
}

main().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
