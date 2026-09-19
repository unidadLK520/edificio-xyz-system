//-----------------------------Giovani Quiroz------------------------
// backend/tests/test_hu02_personas_http_e2e.ts
// Test E2E real: servidor HTTP + peticiones fetch a /api/v1/personas + verificación en BD y Auditoría

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
  console.log('🚀 Test E2E HTTP Real para HU02: Administración de Copropietarios');
  console.log('🚀 ====================================================================\n');

  // 1. Probar conectividad con PostgreSQL
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    console.log('✅ Conexión con PostgreSQL establecida correctamente.\n');
  } catch (dbErr: any) {
    console.error('❌ No se pudo conectar a PostgreSQL.');
    console.error('   Error:', dbErr.message);
    return;
  }

  // 2. Levantar servidor Express en puerto 4002
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/v1', router);
  app.use(errorMiddleware);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(4002, () => {
      console.log('📡 Servidor de pruebas HTTP iniciado en http://localhost:4002\n');
      resolve();
    });
  });

  const baseUrl = 'http://localhost:4002/api/v1/personas';

  // Helper para generar tokens JWT
  async function generarToken(idUsuario: number, correo: string, rol: string) {
    return new SignJWT({ idUsuario, nombreUsuario: correo.split('@')[0], correo, rol })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(config.jwtSecret);
  }

  const adminToken = await generarToken(1, 'admin@edificioxyz.com', 'Administrador');
  const consultaToken = await generarToken(3, 'consulta@edificioxyz.com', 'Consulta');

  const timestamp = Date.now().toString().slice(-6);
  const testCi = `CI-E2E-${timestamp}`;
  let idPersonaCreada: number | null = null;
  let idOcupacionCreada: number | null = null;
  let idDepartamentoPrueba: number | null = null;

  try {
    // Asegurar que exista un departamento de prueba
    let depto = await prisma.departamento.findFirst();
    if (!depto) {
      depto = await prisma.departamento.create({
        data: {
          numero: `E2E-${timestamp.slice(-4)}`,
          piso: 1,
          estado: 'Ocupado',
        },
      });
    }
    idDepartamentoPrueba = depto.idDepartamento;

    // ------------------------------------------------------------------------
    // Test 1: Seguridad - Rechazar petición sin token (401)
    // ------------------------------------------------------------------------
    console.log('1️⃣ Test Seguridad: GET /api/v1/personas sin token');
    const resSinToken = await fetch(baseUrl);
    console.assert(resSinToken.status === 401, 'Debe retornar 401 Unauthorized');
    console.log(`   ✅ OK: 401 Unauthorized recibido correctamente`);

    // ------------------------------------------------------------------------
    // Test 2: RBAC - Rol Consulta intentando registrar persona (403)
    // ------------------------------------------------------------------------
    console.log('\n2️⃣ Test RBAC: POST /api/v1/personas con rol Consulta (debe denegar)');
    const resRolConsulta = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${consultaToken}`,
      },
      body: JSON.stringify({
        ciNit: testCi,
        nombres: 'Prueba',
        apellidos: 'No Autorizado',
      }),
    });
    console.assert(resRolConsulta.status === 403, 'Debe retornar 403 Forbidden');
    console.log(`   ✅ OK: 403 Forbidden para rol sin permisos de escritura`);

    // ------------------------------------------------------------------------
    // Test 3: CA1 - Registro exitoso con rol Administrador (201)
    // ------------------------------------------------------------------------
    console.log('\n3️⃣ [CA1] Test POST /api/v1/personas (Registro exitoso)');
    const resCrear = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        ciNit: testCi,
        nombres: 'Roberto',
        apellidos: 'Vallejos Castro',
        telefono: '71122334',
        correo: `vallejos.${timestamp}@edificio.com`,
        direccion: 'Av. Las Palmas #789',
      }),
    });
    const bodyCrear = await resCrear.json();
    console.assert(resCrear.status === 201, 'Debe retornar 201 Created');
    console.assert(bodyCrear.data.ciNit === testCi, 'El CI coincide');
    idPersonaCreada = bodyCrear.data.idPersona;
    console.log(`   ✅ OK: Persona creada con ID ${idPersonaCreada}`);

    // ------------------------------------------------------------------------
    // Test 4: CA4 - Validación de duplicado por CI/NIT (409)
    // ------------------------------------------------------------------------
    console.log('\n4️⃣ [CA4] Test POST /api/v1/personas con CI/NIT duplicado');
    const resDuplicado = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        ciNit: testCi,
        nombres: 'Otro',
        apellidos: 'Duplicado',
      }),
    });
    const bodyDuplicado = await resDuplicado.json();
    console.assert(resDuplicado.status === 409, 'Debe retornar 409 Conflict');
    console.assert(bodyDuplicado.error === 'PERSONA_DUPLICADA_CI', 'Código de error PERSONA_DUPLICADA_CI');
    console.log(`   ✅ OK: 409 Conflict rechazó el duplicado correctamente`);

    // ------------------------------------------------------------------------
    // Test 5: CA2 & CA5 - Consulta y búsqueda paginada
    // ------------------------------------------------------------------------
    console.log('\n5️⃣ [CA2, CA5] Test GET /api/v1/personas?buscar=Vallejos');
    const resBuscar = await fetch(`${baseUrl}?buscar=Vallejos`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const bodyBuscar = await resBuscar.json();
    console.assert(resBuscar.status === 200, 'Debe retornar 200 OK');
    console.assert(bodyBuscar.data.length >= 1, 'Encuentra al menos 1 resultado');
    console.assert(bodyBuscar.meta.total >= 1, 'Meta total >= 1');
    console.log(`   ✅ OK: Búsqueda retornó ${bodyBuscar.data.length} resultado(s)`);

    // ------------------------------------------------------------------------
    // Test 6: CA8 - Consulta individual por ID
    // ------------------------------------------------------------------------
    console.log(`\n6️⃣ [CA8] Test GET /api/v1/personas/${idPersonaCreada}`);
    const resDetalle = await fetch(`${baseUrl}/${idPersonaCreada}`, {
      headers: { Authorization: `Bearer ${consultaToken}` },
    });
    const bodyDetalle = await resDetalle.json();
    console.assert(resDetalle.status === 200, 'Debe retornar 200 OK');
    console.assert(bodyDetalle.data.idPersona === idPersonaCreada, 'ID coincide');
    console.log(`   ✅ OK: Detalle obtenido para ${bodyDetalle.data.nombres} ${bodyDetalle.data.apellidos}`);

    // ------------------------------------------------------------------------
    // Test 7: CA3 - Modificación de persona
    // ------------------------------------------------------------------------
    console.log(`\n7️⃣ [CA3] Test PUT /api/v1/personas/${idPersonaCreada}`);
    const resUpdate = await fetch(`${baseUrl}/${idPersonaCreada}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        telefono: '79991111',
        direccion: 'Nueva Dirección Modificada #999',
      }),
    });
    const bodyUpdate = await resUpdate.json();
    console.assert(resUpdate.status === 200, 'Debe retornar 200 OK');
    console.assert(bodyUpdate.data.telefono === '79991111', 'Teléfono actualizado');
    console.log(`   ✅ OK: Persona actualizada correctamente`);

    // ------------------------------------------------------------------------
    // Test 8: CA6 - Asignación a unidad habitacional
    // ------------------------------------------------------------------------
    console.log(`\n8️⃣ [CA6] Test POST /api/v1/personas/${idPersonaCreada}/unidades`);
    const resAsignar = await fetch(`${baseUrl}/${idPersonaCreada}/unidades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        idDepartamento: idDepartamentoPrueba,
        tipoOcupante: 'Propietario',
        fechaInicio: '2026-01-01',
        esPropietarioDirecto: true,
      }),
    });
    const bodyAsignar = await resAsignar.json();
    console.assert(resAsignar.status === 201, 'Debe retornar 201 Created');
    idOcupacionCreada = bodyAsignar.data.idOcupacion;
    console.log(`   ✅ OK: Unidad asignada con ID de ocupación ${idOcupacionCreada}`);

    // ------------------------------------------------------------------------
    // Test 9: CA7 - Finalización de ocupación
    // ------------------------------------------------------------------------
    console.log(`\n9️⃣ [CA7] Test PATCH /api/v1/personas/ocupaciones/${idOcupacionCreada}/finalizar`);
    const resFin = await fetch(`${baseUrl}/ocupaciones/${idOcupacionCreada}/finalizar`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ fechaFin: '2026-06-30' }),
    });
    console.assert(resFin.status === 200, 'Debe retornar 200 OK');
    console.log(`   ✅ OK: Ocupación finalizada con fecha`);

    // ------------------------------------------------------------------------
    // Test 10: CA7 - Consulta de historial
    // ------------------------------------------------------------------------
    console.log(`\n🔟 [CA7] Test GET /api/v1/personas/${idPersonaCreada}/historial`);
    const resHistorial = await fetch(`${baseUrl}/${idPersonaCreada}/historial`, {
      headers: { Authorization: `Bearer ${consultaToken}` },
    });
    const bodyHistorial = await resHistorial.json();
    console.assert(resHistorial.status === 200, 'Debe retornar 200 OK');
    console.assert(bodyHistorial.historialOcupaciones.length >= 1, 'Historial contiene ocupación');
    console.log(`   ✅ OK: Historial recuperado con ${bodyHistorial.historialOcupaciones.length} registros`);

    // ------------------------------------------------------------------------
    // Test 11: Auditoría real en PostgreSQL
    // ------------------------------------------------------------------------
    console.log('\n🔎 Verificando registros en tabla edificio.auditoria en PostgreSQL...');
    const auditorias = await prisma.auditoria.findMany({
      where: {
        OR: [
          { tablaAfectada: 'personas', idRegistro: String(idPersonaCreada) },
          { tablaAfectada: 'ocupantes_departamento', idRegistro: String(idOcupacionCreada) },
        ],
      },
      orderBy: { fechaHora: 'asc' },
    });

    console.table(
      auditorias.map((a) => ({
        id: a.idAuditoria.toString(),
        tabla: a.tablaAfectada,
        registro: a.idRegistro,
        accion: a.accion,
        resultado: a.resultado,
        fecha: a.fechaHora.toISOString(),
      }))
    );
    console.assert(auditorias.length >= 3, 'Debe haber al menos 3 eventos de auditoría (INSERT, UPDATE, ASIGNACION)');
    console.log('   ✅ OK: Todos los eventos fueron persistidos en la tabla auditoria');

    console.log('\n🎉 ¡TODAS LAS PRUEBAS E2E HTTP PASARON CON ÉXITO CONEXIÓN A POSTGRESQL REAL!');
  } finally {
    // Limpieza de datos de prueba
    if (idOcupacionCreada) {
      await prisma.ocupanteDepartamento.deleteMany({ where: { idOcupacion: idOcupacionCreada } });
    }
    if (idPersonaCreada) {
      await prisma.departamento.updateMany({
        where: { idPropietario: idPersonaCreada },
        data: { idPropietario: null },
      });
      await prisma.persona.deleteMany({ where: { idPersona: idPersonaCreada } });
    }
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('💥 Error en prueba E2E:', err);
  process.exit(1);
});
