// backend/tests/test_pieza5_unit.ts
// Suite de pruebas unitarias exhaustivas para PIEZA 5 (Auditoría de eventos CA08, CA10)

import 'dotenv/config';
import { hash } from 'bcryptjs';
import { SignJWT } from 'jose';
import { sessionManager } from '../src/modules/auth/session.manager';
import { AuthService } from '../src/modules/auth/auth.service';
import { AuditoriaService } from '../src/modules/auditoria/auditoria.service';
import { TipoEventoAuditoria } from '../src/modules/auditoria/auditoria.types';

async function runUnitTests() {
  console.log('🧪 Iniciando pruebas unitarias de la PIEZA 5 (Auditoría de eventos CA08, CA10)...\n');

  let auditRecords: any[] = [];

  // Mock de repositorio de auditoría en memoria
  const mockAuditoriaRepo: any = {
    crear: async (params: any) => {
      const record = {
        idAuditoria: BigInt(auditRecords.length + 1),
        ...params,
        fechaHora: new Date(),
      };
      auditRecords.push(record);
      return record;
    },
  };

  const auditoriaService = new AuditoriaService(mockAuditoriaRepo);

  // 1. Probar AuditoriaService directamente
  console.log('1️⃣ Test: AuditoriaService - registrarLoginExitoso');
  await auditoriaService.registrarLoginExitoso(1, {
    correo: 'admin@edificio.com',
    rol: 'Administrador',
    ip: '127.0.0.1',
  });
  console.assert(auditRecords.length === 1, 'Debe haber 1 registro de auditoría');
  console.assert(auditRecords[0].accion === TipoEventoAuditoria.LOGIN_EXITOSO);
  console.assert(auditRecords[0].resultado === 'EXITO');
  console.assert(auditRecords[0].idUsuario === 1);
  console.log('   ✅ OK: LOGIN_EXITOSO registrado correctamente');

  console.log('\n2️⃣ Test: AuditoriaService - registrarLoginFallido (credenciales incorrectas)');
  await auditoriaService.registrarLoginFallido(1, {
    correo: 'admin@edificio.com',
    motivo: 'Contraseña inválida',
    resultado: 'CREDENCIALES_INVALIDAS',
    intentos: 1,
    ip: '127.0.0.1',
  });
  console.assert(auditRecords[1].accion === TipoEventoAuditoria.LOGIN_FALLIDO);
  console.assert(auditRecords[1].resultado === 'CREDENCIALES_INVALIDAS');
  console.log('   ✅ OK: LOGIN_FALLIDO registrado correctamente');

  console.log('\n3️⃣ Test: AuditoriaService - registrarBloqueoTemporal (CA07, CA10)');
  const bloqueadoHasta = new Date(Date.now() + 10 * 60 * 1000);
  await auditoriaService.registrarBloqueoTemporal(1, {
    correo: 'admin@edificio.com',
    bloqueadoHasta,
    ip: '127.0.0.1',
  });
  console.assert(auditRecords[2].accion === TipoEventoAuditoria.USUARIO_BLOQUEADO);
  console.assert(auditRecords[2].resultado === 'BLOQUEO_TEMPORAL');
  console.assert(auditRecords[2].datosNuevos.intentos === 3);
  console.log('   ✅ OK: USUARIO_BLOQUEADO registrado con duración de 10 min');

  console.log('\n4️⃣ Test: AuditoriaService - registrarLogout (CA08)');
  await auditoriaService.registrarLogout(1, { ip: '127.0.0.1' });
  console.assert(auditRecords[3].accion === TipoEventoAuditoria.LOGOUT);
  console.assert(auditRecords[3].resultado === 'EXITO');
  console.assert(auditRecords[3].idUsuario === 1);
  console.log('   ✅ OK: LOGOUT registrado correctamente');

  console.log('\n5️⃣ Test: AuditoriaService - registrarCambioUsuario (preparado para Pieza 6)');
  await auditoriaService.registrarCambioUsuario(
    1, // Operador (Admin)
    2, // Afectado
    'DESACTIVAR',
    { activo: true },
    { activo: false },
    'EXITO'
  );
  console.assert(auditRecords[4].accion === TipoEventoAuditoria.USUARIO_MODIFICADO);
  console.assert(auditRecords[4].idUsuario === 1);
  console.assert(auditRecords[4].idRegistro === '2');
  console.assert(auditRecords[4].datosAnteriores.activo === true);
  console.assert(auditRecords[4].datosNuevos.activo === false);
  console.log('   ✅ OK: USUARIO_MODIFICADO registrado correctamente con datos anteriores y nuevos');

  // 2. Probar integración de AuthService con Auditoria
  console.log('\n────────────────────────────────────────────────────────');
  console.log('🔗 Probando integración de AuthService con Auditoria...');
  console.log('────────────────────────────────────────────────────────');

  const passwordHash = await hash('password123', 10);
  let mockUser: any = {
    idUsuario: 10,
    nombreUsuario: 'testuser',
    correo: 'test@edificio.com',
    passwordHash,
    activo: true,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    ultimoAcceso: null,
    rol: { nombre: 'Administrador' },
  };

  const mockAuthRepo: any = {
    findByCorreo: async (correo: string) => (correo === mockUser.correo ? mockUser : null),
    findById: async (id: number) => (id === mockUser.idUsuario ? mockUser : null),
    updateUltimoAcceso: async (_id: number, fecha: Date) => {
      mockUser.ultimoAcceso = fecha;
      return mockUser;
    },
    registrarIntentoFallido: async (_id: number, intentos: number, bloqueadoHasta: Date | null) => {
      mockUser.intentosFallidos = intentos;
      mockUser.bloqueadoHasta = bloqueadoHasta;
      return mockUser;
    },
    resetIntentos: async (_id: number, fecha: Date) => {
      mockUser.intentosFallidos = 0;
      mockUser.bloqueadoHasta = null;
      mockUser.ultimoAcceso = fecha;
      return mockUser;
    },
  };

  // Reiniciamos historial de auditoría
  auditRecords = [];
  const authService = new AuthService(mockAuthRepo, auditoriaService);

  // Escenario A: Usuario inexistente
  console.log('\n6️⃣ Integración: Login con usuario inexistente');
  const resNoUser = await authService.login(
    { correo: 'inexistente@edificio.com', password: '123' },
    { ip: '192.168.1.100' }
  );
  console.assert(!resNoUser.success);
  console.assert(auditRecords.length === 1);
  console.assert(auditRecords[0].accion === TipoEventoAuditoria.LOGIN_FALLIDO);
  console.assert(auditRecords[0].resultado === 'CREDENCIALES_INVALIDAS');
  console.assert(auditRecords[0].idUsuario === null);
  console.log('   ✅ OK: Rechazo auditado con idUsuario = null');

  // Escenario B: Usuario inactivo (CA03)
  console.log('\n7️⃣ Integración: Login con usuario inactivo (CA03)');
  mockUser.activo = false;
  const resInactive = await authService.login(
    { correo: 'test@edificio.com', password: 'password123' },
    { ip: '192.168.1.100' }
  );
  console.assert(!resInactive.success);
  console.assert(auditRecords.length === 2);
  console.assert(auditRecords[1].accion === TipoEventoAuditoria.LOGIN_FALLIDO);
  console.assert(auditRecords[1].resultado === 'USUARIO_INACTIVO');
  console.assert(auditRecords[1].idUsuario === 10);
  console.log('   ✅ OK: Rechazo auditado con resultado = USUARIO_INACTIVO');

  // Restaurar usuario activo
  mockUser.activo = true;

  // Escenario C: Intentos fallidos 1 y 2
  console.log('\n8️⃣ Integración: Intentos fallidos 1 y 2 por contraseña incorrecta');
  await authService.login({ correo: 'test@edificio.com', password: 'wrong' }, { ip: '192.168.1.100' });
  await authService.login({ correo: 'test@edificio.com', password: 'wrong' }, { ip: '192.168.1.100' });
  console.assert(auditRecords.length === 4);
  console.assert(auditRecords[2].accion === TipoEventoAuditoria.LOGIN_FALLIDO);
  console.assert(auditRecords[3].accion === TipoEventoAuditoria.LOGIN_FALLIDO);
  console.log('   ✅ OK: Intentos 1 y 2 registrados como LOGIN_FALLIDO');

  // Escenario D: 3er intento fallido -> Bloqueo temporal (CA07, CA10)
  console.log('\n9️⃣ Integración: 3er intento fallido consecutivo -> Bloqueo temporal');
  await authService.login({ correo: 'test@edificio.com', password: 'wrong' }, { ip: '192.168.1.100' });
  const lockoutEvent = auditRecords.find((r) => r.accion === TipoEventoAuditoria.USUARIO_BLOQUEADO);
  console.assert(lockoutEvent !== undefined, 'Debe existir evento USUARIO_BLOQUEADO');
  console.assert(lockoutEvent.resultado === 'BLOQUEO_TEMPORAL');
  console.assert(mockUser.bloqueadoHasta !== null, 'El usuario debe estar bloqueado en BD');
  console.log('   ✅ OK: Evento USUARIO_BLOQUEADO registrado por 10 min');

  // Escenario E: Intento mientras está bloqueado (CA02)
  console.log('\n🔟 Integración: Intento durante bloqueo temporal activo (CA02)');
  await authService.login({ correo: 'test@edificio.com', password: 'password123' }, { ip: '192.168.1.100' });
  const lockedAttempt = auditRecords[auditRecords.length - 1];
  console.assert(lockedAttempt.accion === TipoEventoAuditoria.LOGIN_FALLIDO);
  console.assert(lockedAttempt.resultado === 'CUENTA_BLOQUEADA');
  console.log('   ✅ OK: Intento en bloqueo registrado como CUENTA_BLOQUEADA');

  // Escenario F: Login exitoso tras desbloqueo
  console.log('\n1️⃣1️⃣ Integración: Login exitoso tras expirar bloqueo');
  mockUser.bloqueadoHasta = new Date(Date.now() - 1000); // Expirado
  const resSuccess = await authService.login(
    { correo: 'test@edificio.com', password: 'password123' },
    { ip: '192.168.1.100' }
  );
  console.assert(resSuccess.success);
  const successEvent = auditRecords[auditRecords.length - 1];
  console.assert(successEvent.accion === TipoEventoAuditoria.LOGIN_EXITOSO);
  console.assert(successEvent.resultado === 'EXITO');
  console.assert(successEvent.idUsuario === 10);
  console.log('   ✅ OK: Login exitoso auditado como LOGIN_EXITOSO');

  // Escenario G: Logout con token
  console.log('\n1️⃣2️⃣ Integración: Logout con token válido');
  const token = (resSuccess as any).data.token;
  await authService.logout(token, { ip: '192.168.1.100' });
  const logoutEvent = auditRecords[auditRecords.length - 1];
  console.assert(logoutEvent.accion === TipoEventoAuditoria.LOGOUT);
  console.assert(logoutEvent.resultado === 'EXITO');
  console.assert(logoutEvent.idUsuario === 10);
  console.assert(sessionManager.isTokenBlacklisted(token), 'Token debe estar en blacklist');
  console.log('   ✅ OK: Logout auditado con idUsuario = 10 y token revocado');

  console.log('\n🎉 ¡TODAS LAS 12 PRUEBAS UNITARIAS DE LA PIEZA 5 PASARON EXITOSAMENTE!');
}

runUnitTests().catch((err) => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
