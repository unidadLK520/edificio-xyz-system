// backend/tests/test_hu03_unidades_e2e.ts
// Test E2E real para HU03: Registro y Gestión de Unidades (Departamentos, Parqueos, Bauleras) y Asignaciones

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
  console.log('🚀 Test E2E HTTP Real para HU03: Gestión de Unidades y Asignaciones');
  console.log('🚀 ====================================================================\n');

  // 1. Probar conectividad con base de datos
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    console.log('✅ Conexión con PostgreSQL establecida correctamente.\n');
  } catch (dbErr: any) {
    console.error('❌ No se pudo conectar a PostgreSQL:', dbErr.message);
    return;
  }

  // 2. Levantar servidor Express en puerto 4003
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/v1', router);
  app.use(errorMiddleware);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(4003, () => {
      console.log('📡 Servidor de pruebas HU03 iniciado en http://localhost:4003\n');
      resolve();
    });
  });

  const baseUrl = 'http://localhost:4003/api/v1/unidades';

  // Helper para generar tokens JWT
  async function generarToken(idUsuario: number, correo: string, rol: string) {
    return new SignJWT({ idUsuario, nombreUsuario: correo.split('@')[0], correo, rol })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(config.jwtSecret);
  }

  const adminToken = await generarToken(1, 'admin@edificioxyz.com', 'Administrador');
  const consultaToken = await generarToken(3, 'consulta@edificioxyz.com', 'Copropietario');

  const ts = Date.now().toString().slice(-4);
  const numDepto = `D3-${ts}`;
  const numParqueo = `P3-${ts}`;
  const numBaulera = `B3-${ts}`;

  let personaId: number | null = null;
  let deptoId: number | null = null;
  let parqueoId: number | null = null;
  let bauleraId: number | null = null;

  try {
    // Crear una persona de prueba
    const nuevaPersona = await prisma.persona.create({
      data: {
        nombres: 'Residente Test',
        apellidos: 'HU03',
        ciNit: `CI-HU3-${ts}`,
        telefono: '70011223',
        correo: `test.hu3.${ts}@email.com`,
      },
    });
    personaId = nuevaPersona.idPersona;
    console.log(`👤 Persona de prueba creada (ID: ${personaId})`);

    // ── CA1: Crear unidades (Departamento, Parqueo, Baulera) ──────────────────
    console.log('\n--- CA1: Crear registros de unidades (Departamento, Parqueo, Baulera) ---');

    // 1.1 Crear Departamento
    const resDepto = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        tipoUnidad: 'Departamento',
        numero: numDepto,
        piso: 5,
        areaM2: 95.5,
        estado: 'Desocupado',
      }),
    });
    const jsonDepto = await resDepto.json();
    console.log('Status Depto:', resDepto.status);
    if (resDepto.status === 201 && jsonDepto.unidad) {
      deptoId = jsonDepto.unidad.idDepartamento;
      console.log(`✅ CA1 PASS: Departamento creado exitosamente (ID: ${deptoId}, Número: ${numDepto})`);
    } else {
      console.error('❌ CA1 FAIL: Error al crear departamento:', jsonDepto);
    }

    // 1.2 Crear Parqueo
    const resParqueo = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        tipoUnidad: 'Parqueo',
        numero: numParqueo,
        estado: 'Disponible',
      }),
    });
    const jsonParqueo = await resParqueo.json();
    if (resParqueo.status === 201 && jsonParqueo.unidad) {
      parqueoId = jsonParqueo.unidad.idParqueo;
      console.log(`✅ CA1 PASS: Parqueo creado exitosamente (ID: ${parqueoId}, Estado: Disponible)`);
    } else {
      console.error('❌ CA1 FAIL: Error al crear parqueo:', jsonParqueo);
    }

    // 1.3 Crear Baulera
    const resBaulera = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        tipoUnidad: 'Baulera',
        numero: numBaulera,
        estado: 'Disponible',
      }),
    });
    const jsonBaulera = await resBaulera.json();
    if (resBaulera.status === 201 && jsonBaulera.unidad) {
      bauleraId = jsonBaulera.unidad.idBaulera;
      console.log(`✅ CA1 PASS: Baulera creada exitosamente (ID: ${bauleraId}, Estado: Disponible)`);
    } else {
      console.error('❌ CA1 FAIL: Error al crear baulera:', jsonBaulera);
    }

    // ── CA4: Impedir registro duplicado ───────────────────────────────────────
    console.log('\n--- CA4: Intentar registrar unidad con identificador duplicado ---');
    const resDuplicado = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        tipoUnidad: 'Departamento',
        numero: numDepto, // mismo identificador
        piso: 2,
      }),
    });
    const jsonDuplicado = await resDuplicado.json();
    console.log('Status Duplicado:', resDuplicado.status, 'Message:', jsonDuplicado.message);
    if (resDuplicado.status === 409 && jsonDuplicado.message.includes('ya se encuentra utilizado')) {
      console.log('✅ CA4 PASS: Se impidió el registro duplicado con mensaje apropiado.');
    } else {
      console.error('❌ CA4 FAIL: Se esperaba rechazo por duplicado:', jsonDuplicado);
    }

    // ── CA2: Búsqueda y consulta de unidades ──────────────────────────────────
    console.log('\n--- CA2: Búsqueda y consulta por identificador o filtro ---');
    const resSearch = await fetch(`${baseUrl}?search=${numDepto}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jsonSearch = await resSearch.json();
    if (resSearch.status === 200 && jsonSearch.data.some((u: any) => u.numero === numDepto)) {
      console.log('✅ CA2 PASS: Búsqueda de unidad por identificador retorna datos correctos.');
    } else {
      console.error('❌ CA2 FAIL:', jsonSearch);
    }

    // ── CA3: Modificar datos conservando lo no modificado ─────────────────────
    console.log('\n--- CA3: Modificar datos de unidad ---');
    const resEdit = await fetch(`${baseUrl}/Departamento/${deptoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        areaM2: 105.0, // solo cambiamos areaM2
      }),
    });
    const jsonEdit = await resEdit.json();
    if (
      resEdit.status === 200 &&
      jsonEdit.unidad.numero === numDepto &&
      jsonEdit.unidad.piso === 5 &&
      Number(jsonEdit.unidad.areaM2) === 105.0
    ) {
      console.log('✅ CA3 PASS: Datos modificados conservando campos no alterados (piso 5 mantenido).');
    } else {
      console.error('❌ CA3 FAIL:', jsonEdit);
    }

    // ── CA5: Asignar Propietario / Ocupante a Departamento ────────────────────
    console.log('\n--- CA5: Asignación de departamento a persona ---');
    const resAsignDepto = await fetch(`${baseUrl}/asignaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        tipoUnidad: 'Departamento',
        idUnidad: deptoId,
        idPersona: personaId,
        tipoRelacion: 'Propietario',
        notas: 'Asignación de prueba de propietario',
      }),
    });
    const jsonAsignDepto = await resAsignDepto.json();
    if (resAsignDepto.status === 200) {
      console.log('✅ CA5 PASS: Relación entre persona y departamento registrada exitosamente.');
    } else {
      console.error('❌ CA5 FAIL:', jsonAsignDepto);
    }

    // ── CA6: Asignar Parqueo y Baulera actualizando estado a 'Asignado' ────────
    console.log('\n--- CA6: Asignar parqueo y baulera actualizando su estado ---');
    const resAsignParqueo = await fetch(`${baseUrl}/asignaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        tipoUnidad: 'Parqueo',
        idUnidad: parqueoId,
        idDepartamento: deptoId,
        idPersona: personaId,
        tipoRelacion: 'Asignado',
      }),
    });
    const jsonAsignParqueo = await resAsignParqueo.json();
    if (resAsignParqueo.status === 200 && jsonAsignParqueo.parqueo.estado === 'Asignado') {
      console.log('✅ CA6 PASS: Asignación de parqueo registrada y estado actualizado a Asignado.');
    } else {
      console.error('❌ CA6 FAIL:', jsonAsignParqueo);
    }

    const resAsignBaulera = await fetch(`${baseUrl}/asignaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        tipoUnidad: 'Baulera',
        idUnidad: bauleraId,
        idDepartamento: deptoId,
        tipoRelacion: 'Asignado',
      }),
    });
    const jsonAsignBaulera = await resAsignBaulera.json();
    if (resAsignBaulera.status === 200 && jsonAsignBaulera.baulera.estado === 'Asignado') {
      console.log('✅ CA6 PASS: Asignación de baulera registrada y estado actualizado a Asignado.');
    } else {
      console.error('❌ CA6 FAIL:', jsonAsignBaulera);
    }

    // ── CA07: Finalizar asignación y conservar antecedentes de historial ───────
    console.log('\n--- CA07: Finalizar asignación y verificar antecedente histórico ---');
    const resFinParqueo = await fetch(`${baseUrl}/asignaciones/finalizar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        tipoUnidad: 'Parqueo',
        idUnidad: parqueoId,
        notas: 'Finalización de uso de parqueo',
      }),
    });
    const jsonFinParqueo = await resFinParqueo.json();
    if (resFinParqueo.status === 200 && jsonFinParqueo.parqueo.estado === 'Disponible') {
      console.log('✅ CA07 PASS: Asignación finalizada, parqueo devuelto a Disponible.');
    } else {
      console.error('❌ CA07 FAIL:', jsonFinParqueo);
    }

    // Consultar detalle e historial para verificar conservación de antecedentes
    const resDetalle = await fetch(`${baseUrl}/Parqueo/${parqueoId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jsonDetalle = await resDetalle.json();
    if (resDetalle.status === 200 && jsonDetalle.historial.length > 0) {
      console.log(`✅ CA07 PASS: Antecedentes conservados en historial (${jsonDetalle.historial.length} registros).`);
    } else {
      console.error('❌ CA07 FAIL: No se encontraron antecedentes en el historial:', jsonDetalle);
    }

    // ── CA08: Filtrar listado por estado ──────────────────────────────────────
    console.log('\n--- CA08: Filtrar listado por estado ---');
    const resFiltroDisponibles = await fetch(`${baseUrl}?estado=Disponible`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jsonFiltroDisponibles = await resFiltroDisponibles.json();
    if (
      resFiltroDisponibles.status === 200 &&
      jsonFiltroDisponibles.data.every((u: any) => u.estado === 'Disponible')
    ) {
      console.log('✅ CA08 PASS: Listado filtrado correctamente por estado Disponible.');
    } else {
      console.error('❌ CA08 FAIL:', jsonFiltroDisponibles);
    }

    // ── CA09: Bloqueo de permisos a usuarios sin rol de administración ──────
    console.log('\n--- CA09: Bloquear operaciones sin permisos de administración ---');
    const resNoAdmin = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${consultaToken}` },
      body: JSON.stringify({
        tipoUnidad: 'Parqueo',
        numero: `P-NOADMIN-${ts}`,
      }),
    });
    if (resNoAdmin.status === 403) {
      console.log('✅ CA09 PASS: Operación de creación bloqueada para usuario sin rol de administración (403 Forbidden).');
    } else {
      console.error('❌ CA09 FAIL: Se esperaba status 403 pero se obtuvo:', resNoAdmin.status);
    }

    // ── CA10: Consulta consistente de unidad para uso inter-módulos ───────────
    console.log('\n--- CA10: Consulta consistente de datos de unidad para inter-módulos ---');
    const resInter = await fetch(`${baseUrl}/Departamento/${deptoId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jsonInter = await resInter.json();
    if (
      resInter.status === 200 &&
      jsonInter.unidad.idDepartamento === deptoId &&
      jsonInter.unidad.numero === numDepto &&
      jsonInter.unidad.propietario?.idPersona === personaId
    ) {
      console.log('✅ CA10 PASS: Datos de unidad proporcionados de manera consistente para integración inter-módulos.');
    } else {
      console.error('❌ CA10 FAIL:', jsonInter);
    }

  } finally {
    // Limpieza de datos de prueba
    if (deptoId) {
      await prisma.historialAsignacionUnidad.deleteMany({ where: { idUnidad: deptoId, tipoUnidad: 'Departamento' } });
      await prisma.ocupanteDepartamento.deleteMany({ where: { idDepartamento: deptoId } });
      await prisma.departamento.deleteMany({ where: { idDepartamento: deptoId } });
    }
    if (parqueoId) {
      await prisma.historialAsignacionUnidad.deleteMany({ where: { idUnidad: parqueoId, tipoUnidad: 'Parqueo' } });
      await prisma.parqueo.deleteMany({ where: { idParqueo: parqueoId } });
    }
    if (bauleraId) {
      await prisma.historialAsignacionUnidad.deleteMany({ where: { idUnidad: bauleraId, tipoUnidad: 'Baulera' } });
      await prisma.baulera.deleteMany({ where: { idBaulera: bauleraId } });
    }
    if (personaId) {
      await prisma.persona.deleteMany({ where: { idPersona: personaId } });
    }

    server.close();
    console.log('\n🏁 Suite de pruebas E2E HU03 finalizada.');
  }
}

main().catch((e) => {
  console.error('Fatal Test Error:', e);
  process.exit(1);
});
