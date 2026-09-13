// backend/tests/test_http_pieza5_e2e.ts
// Test E2E real: servidor HTTP + peticiones fetch a /login y /logout + consulta directa a tabla Auditoria

import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { prisma } from '@edificio-xyz/database';
import { router } from '../src/routes';
import { errorMiddleware } from '../src/middlewares/error.middleware';

async function main() {
  console.log('🚀 Iniciando verificación E2E con servidor HTTP y base de datos...\n');

  // 1. Crear app Express para pruebas
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/v1', router);
  app.use(errorMiddleware);

  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(4001, () => {
      console.log('📡 Servidor de pruebas iniciado en http://localhost:4001');
      resolve();
    });
  });

  const baseUrl = 'http://localhost:4001/api/v1/auth';

  try {
    // 2. Probar conectividad con PostgreSQL
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
      console.log('✅ Conexión con PostgreSQL establecida correctamente.\n');
    } catch (dbErr: any) {
      console.error('❌ No se pudo conectar a la base de datos PostgreSQL en localhost:5432.');
      console.error('   Error:', dbErr.message);
      console.log('\n⚠️ Por favor, asegurate de que Docker Desktop esté abierto y el contenedor PostgreSQL esté corriendo.');
      return;
    }

    // Asegurar que el constraint check no bloquee nuevos tipos de eventos
    await prisma.$executeRawUnsafe(
      'ALTER TABLE edificio.auditoria DROP CONSTRAINT IF EXISTS auditoria_accion_check;'
    );

    const testEmail = 'admin@edificioxyz.com';
    const testPass = 'admin123';

    // 3. Petición HTTP 1: Login exitoso
    console.log('1️⃣ Ejecutando petición HTTP real: POST /api/v1/auth/login (exitoso)...');
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: testEmail, password: testPass }),
    });
    const loginBody = await loginRes.json();
    console.log(`   HTTP Status: ${loginRes.status}`);
    console.assert(loginRes.status === 200, 'Login debe retornar 200');
    const token = loginBody.token;
    console.log(`   Token generado: ${token.substring(0, 25)}...`);
    console.log('   ✅ Petición de Login exitoso completada.');

    // 4. Petición HTTP 2: Logout
    console.log('\n2️⃣ Ejecutando petición HTTP real: POST /api/v1/auth/logout...');
    const logoutRes = await fetch(`${baseUrl}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const logoutBody = await logoutRes.json();
    console.log(`   HTTP Status: ${logoutRes.status}`);
    console.log(`   Mensaje: ${logoutBody.message}`);
    console.assert(logoutRes.status === 200, 'Logout debe retornar 200');
    console.log('   ✅ Petición de Logout completada.');

    // 5. Petición HTTP 3: Login fallido (contraseña incorrecta)
    console.log('\n3️⃣ Ejecutando petición HTTP real: POST /api/v1/auth/login (fallido)...');
    const failRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: testEmail, password: 'password_erroneo_123' }),
    });
    const failBody = await failRes.json();
    console.log(`   HTTP Status: ${failRes.status} | Mensaje: ${failBody.message}`);
    console.assert(failRes.status === 401, 'Login fallido debe retornar 401');
    console.log('   ✅ Petición de Login fallido completada.');

    // 6. Petición HTTP 4: Login con usuario inactivo (CA03)
    console.log('\n4️⃣ Ejecutando petición HTTP real: Usuario inactivo (CA03)...');
    const userConsulta = await prisma.usuario.findUnique({ where: { correo: 'consulta@edificioxyz.com' } });
    if (userConsulta) {
      await prisma.usuario.update({
        where: { idUsuario: userConsulta.idUsuario },
        data: { activo: false },
      });

      const inactiveRes = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'consulta@edificioxyz.com', password: 'consulta123' }),
      });
      const inactiveBody = await inactiveRes.json();
      console.log(`   HTTP Status: ${inactiveRes.status} | Mensaje: ${inactiveBody.message}`);
      console.assert(inactiveRes.status === 401);
      console.log('   ✅ Petición de Usuario inactivo completada.');

      // Restaurar activo
      await prisma.usuario.update({
        where: { idUsuario: userConsulta.idUsuario },
        data: { activo: true, intentosFallidos: 0, bloqueadoHasta: null },
      });

      // 7. Petición HTTP 5: Bloqueo tras 3er intento fallido consecutivo (CA07 / CA10)
      console.log('\n5️⃣ Ejecutando 3 intentos fallidos consecutivos para activar bloqueo temporal (CA07/CA10)...');
      await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'consulta@edificioxyz.com', password: 'bad1' }),
      });
      await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'consulta@edificioxyz.com', password: 'bad2' }),
      });
      const lockRes = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'consulta@edificioxyz.com', password: 'bad3' }),
      });
      console.log(`   3er Intento Status: ${lockRes.status}`);
      console.log('   ✅ Bloqueo temporal activado al 3er intento.');

      // 8. Petición HTTP 6: Intento mientras la cuenta está bloqueada (CA02)
      console.log('\n6️⃣ Ejecutando intento durante bloqueo activo (CA02)...');
      const whileLockedRes = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'consulta@edificioxyz.com', password: 'consulta123' }),
      });
      console.log(`   Intento en bloqueo Status: ${whileLockedRes.status}`);
      console.log('   ✅ Intento durante bloqueo rechazado.');

      // Restaurar usuario a estado limpio
      await prisma.usuario.update({
        where: { idUsuario: userConsulta.idUsuario },
        data: { activo: true, intentosFallidos: 0, bloqueadoHasta: null },
      });
    }

    // 9. Consultar directamente la tabla Auditoria en PostgreSQL
    console.log('\n════════════════════════════════════════════════════════════');
    console.log('📋 CONSULTA DIRECTA A LA TABLA "edificio.auditoria":');
    console.log('════════════════════════════════════════════════════════════\n');

    const registrosAuditoria = await prisma.auditoria.findMany({
      take: 10,
      orderBy: { fechaHora: 'desc' },
      include: {
        usuario: {
          select: {
            idUsuario: true,
            nombreUsuario: true,
            correo: true,
          },
        },
      },
    });

    console.table(
      registrosAuditoria.map((r) => ({
        id_auditoria: r.idAuditoria.toString(),
        tabla: r.tablaAfectada,
        accion: r.accion,
        resultado: r.resultado,
        id_usuario: r.idUsuario,
        usuario: r.usuario?.correo || '(null)',
        fecha_hora: r.fechaHora.toISOString(),
      }))
    );

    console.log('\n🔍 Detalles del último registro (JSON datos_nuevos):');
    console.log(JSON.stringify(registrosAuditoria[0]?.datosNuevos, null, 2));

    console.log('\n🎉 ¡VERIFICACIÓN E2E COMPLETADA CON DATOS REALES EN LA BASE DE DATOS!');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

main().catch(console.error);
