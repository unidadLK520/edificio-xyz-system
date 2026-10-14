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

beforeAll(async () => {
  try {
    // Verificar conectividad básica con la base de datos compartida
    await prisma.$queryRawUnsafe('SELECT 1');
  } catch (dbErr: any) {
    console.warn(`[TEST SETUP] Base de datos compartida no disponible (${dbErr.message}).`);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Helper para generar tokens de prueba
export async function generarTokenPrueba(idUsuario: number, correo: string, rol: string) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'edificio_xyz_super_secure_jwt_secret_key_2026');
  return new SignJWT({ idUsuario, nombreUsuario: correo.split('@')[0], correo, rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('2h')
    .sign(secret);
}
