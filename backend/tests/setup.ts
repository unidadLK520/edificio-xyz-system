// backend/tests/setup.ts
// Configuración global y verificación estricta de entorno para pruebas Vitest

import * as path from 'path';
import * as dotenv from 'dotenv';
import { SignJWT } from 'jose';
import { beforeAll, afterAll } from 'vitest';

// 1. Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 2. Nueva guarda de seguridad: exige ALLOW_SHARED_DB_TESTS=true y nunca imprime credenciales
if (process.env.ALLOW_SHARED_DB_TESTS !== 'true') {
  console.error('\n🛑 ERROR DE SEGURIDAD: ALLOW_SHARED_DB_TESTS no está establecida en "true".');
  console.error('Para ejecutar pruebas contra la base de datos compartida se requiere explícitamente ALLOW_SHARED_DB_TESTS=true.\n');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('\n🛑 ERROR: DATABASE_URL no está definida en el entorno de pruebas.\n');
  process.exit(1);
}

process.env.NODE_ENV = 'test';

// 3. Importar prisma después de configurar las variables de entorno
import { prisma } from '@edificio-xyz/database';

// Variables de snapshot capturadas al inicio de la corrida de pruebas
let snapshotReglasMora: any[] = [];
let snapshotTiposDepto: any[] = [];
let snapshotTarifasAgua: any[] = [];

beforeAll(async () => {
  try {
    // Verificar conectividad básica con la base de datos compartida
    await prisma.$queryRawUnsafe('SELECT 1');

    // Tomar snapshot dinámico al inicio de la corrida
    snapshotReglasMora = await prisma.reglaMora.findMany();
    snapshotTiposDepto = await prisma.tipoDepartamento.findMany();
    snapshotTarifasAgua = await prisma.tarifaAgua.findMany();
  } catch (dbErr: any) {
    console.error(`\n🛑 [TEST SETUP ERROR] Fallo crítico de conexión a la base de datos compartida o captura de snapshot: ${dbErr.message}`);
    throw new Error(`[TEST SETUP ERROR] Base de datos compartida no disponible o snapshot fallido: ${dbErr.message}. Abortando suite para proteger la integridad de los datos.`);
  }
});

afterAll(async () => {
  try {
    // 1. Restaurar reglas_mora según el snapshot original (mismos IDs y valores)
    for (const regla of snapshotReglasMora) {
      await prisma.reglaMora.update({
        where: { idRegla: regla.idRegla },
        data: {
          tasaInteres: regla.tasaInteres,
          diasGracia: regla.diasGracia,
          activa: regla.activa,
        },
      });
    }

    // 2. Restaurar tipos_departamento según el snapshot original (mismos IDs y montos)
    for (const tipo of snapshotTiposDepto) {
      await prisma.tipoDepartamento.update({
        where: { idTipo: tipo.idTipo },
        data: {
          nombre: tipo.nombre,
          montoExpensa: tipo.montoExpensa,
          activo: tipo.activo,
          areaM2: tipo.areaM2,
        },
      });
    }

    // 3. Restaurar tarifas_agua según el snapshot original (mismos IDs y valores)
    for (const tarifa of snapshotTarifasAgua) {
      await prisma.tarifaAgua.update({
        where: { idTarifa: tarifa.idTarifa },
        data: {
          precioM3: tarifa.precioM3,
          activa: tarifa.activa,
        },
      });
    }
  } catch (err: any) {
    console.warn('[TEST SETUP] Error en restauración de estado de prueba:', err.message);
  } finally {
    await prisma.$disconnect();
  }
});

// Helper para generar tokens de prueba
export async function generarTokenPrueba(idUsuario: number, correo: string, rol: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'edificio_xyz_super_secure_jwt_secret_key_2026');
  return new SignJWT({ idUsuario, nombreUsuario: correo.split('@')[0], correo, rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('2h')
    .sign(secret);
}
