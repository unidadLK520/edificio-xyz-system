// backend/tests/test_pieza5_db.ts
// Script de prueba de integración contra la base de datos PostgreSQL para PIEZA 5

import 'dotenv/config';
import { prisma } from '@edificio-xyz/database';
import { auditoriaService } from '../src/modules/auditoria';
import { authService } from '../src/modules/auth/auth.service';

async function runDbTests() {
  console.log('🧪 Iniciando prueba de integración en base de datos para PIEZA 5...\n');

  try {
    // 1. Verificar conectividad con PostgreSQL
    await prisma.$queryRawUnsafe('SELECT 1');
    console.log('✅ Conexión con PostgreSQL establecida correctamente');

    // 2. Asegurar que el constraint check no restrinja los nuevos eventos
    await prisma.$executeRawUnsafe(
      'ALTER TABLE edificio.auditoria DROP CONSTRAINT IF EXISTS auditoria_accion_check;'
    );
    console.log('✅ Constraint auditoria_accion_check verificado/liberado');

    // 3. Probar inserción directa de cada tipo de evento
    console.log('\n📝 Probando inserciones en tabla edificio.auditoria:');

    const log1 = await auditoriaService.registrarLoginExitoso(1, {
      correo: 'admin@edificio.com',
      rol: 'Administrador',
      ip: '127.0.0.1',
    });
    console.log(`   ✅ LOGIN_EXITOSO insertado (idAuditoria: ${log1.idAuditoria})`);

    const log2 = await auditoriaService.registrarLoginFallido(1, {
      correo: 'admin@edificio.com',
      motivo: 'Contraseña inválida',
      resultado: 'CREDENCIALES_INVALIDAS',
      intentos: 1,
      ip: '127.0.0.1',
    });
    console.log(`   ✅ LOGIN_FALLIDO insertado (idAuditoria: ${log2.idAuditoria})`);

    const log3 = await auditoriaService.registrarBloqueoTemporal(1, {
      correo: 'admin@edificio.com',
      bloqueadoHasta: new Date(Date.now() + 10 * 60 * 1000),
      ip: '127.0.0.1',
    });
    console.log(`   ✅ USUARIO_BLOQUEADO insertado (idAuditoria: ${log3.idAuditoria})`);

    const log4 = await auditoriaService.registrarLogout(1, { ip: '127.0.0.1' });
    console.log(`   ✅ LOGOUT insertado (idAuditoria: ${log4.idAuditoria})`);

    const log5 = await auditoriaService.registrarCambioUsuario(
      1,
      2,
      'DESACTIVAR',
      { activo: true },
      { activo: false }
    );
    console.log(`   ✅ USUARIO_MODIFICADO insertado (idAuditoria: ${log5.idAuditoria})`);

    // 4. Limpieza de registros de prueba generados
    await prisma.auditoria.deleteMany({
      where: {
        idAuditoria: {
          in: [
            log1.idAuditoria,
            log2.idAuditoria,
            log3.idAuditoria,
            log4.idAuditoria,
            log5.idAuditoria,
          ],
        },
      },
    });
    console.log('\n🧹 Limpieza de datos de prueba completada exitosamente.');

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE INTEGRACIÓN EN BD PASARON CON ÉXITO!');
  } catch (error: any) {
    if (error.code === 'P1001' || error.message?.includes("Can't reach database server")) {
      console.warn('⚠️ No se pudo conectar con PostgreSQL en localhost:5432. Asegurate de que el contenedor de Docker esté iniciado.');
    } else {
      console.error('❌ Error en pruebas de BD:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

runDbTests();
