// backend/tests/setup.ts
// Configuración global y verificación estricta de aislamiento de BD para pruebas Vitest

import path from 'path';
import dotenv from 'dotenv';
import { SignJWT } from 'jose';
import { beforeAll, afterAll } from 'vitest';

// 1. Cargar .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const devDbUrl = process.env.DATABASE_URL;
const testDbUrl = process.env.TEST_DATABASE_URL;

// 2. Verificación estricta de aislamiento de BD de pruebas (Condición 1)
if (!testDbUrl) {
  console.error('\n🛑 ERROR DE SEGURIDAD CRÍTICO: TEST_DATABASE_URL no está definida.');
  console.error('Abortando ejecución de pruebas para evitar alterar bases de datos de desarrollo o producción.\n');
  process.exit(1);
}

if (testDbUrl === devDbUrl) {
  console.error('\n🛑 ERROR DE SEGURIDAD CRÍTICO: TEST_DATABASE_URL es IDÉNTICA a la DATABASE_URL de desarrollo.');
  console.error('Abortando ejecución de pruebas para evitar sobreescritura de datos.\n');
  process.exit(1);
}

if (!testDbUrl.includes('edificio_test') && !testDbUrl.includes('test')) {
  console.error('\n🛑 ERROR DE SEGURIDAD CRÍTICO: TEST_DATABASE_URL no contiene un identificador de prueba válido ("test" o "edificio_test").');
  console.error(`URL detectada: ${testDbUrl}`);
  process.exit(1);
}

// 3. Forzar DATABASE_URL a la base de datos de prueba aislada
process.env.DATABASE_URL = testDbUrl;
if (process.env.TEST_DIRECT_URL) {
  process.env.DIRECT_URL = process.env.TEST_DIRECT_URL;
}
process.env.NODE_ENV = 'test';

// 4. Importar prisma después de configurar las variables de entorno
import { prisma } from '@edificio-xyz/database';

beforeAll(async () => {
  // Verificar conectividad con la BD de pruebas aislada
  const result: any[] = await prisma.$queryRawUnsafe('SELECT current_database() as db, current_schema() as schema');
  const activeDb = result[0]?.db;
  if (activeDb !== 'edificio_test' && !activeDb.includes('test')) {
    console.error(`\n🛑 ABORTANDO: La base de datos conectada es "${activeDb}", NO es la base de datos de pruebas.\n`);
    process.exit(1);
  }

  // Asegurar roles y usuario admin de pruebas
  const rolAdmin = await prisma.rol.upsert({
    where: { nombre: 'Administrador' },
    update: {},
    create: { nombre: 'Administrador', descripcion: 'Administrador de pruebas' },
  });

  await prisma.rol.upsert({
    where: { nombre: 'Directorio' },
    update: {},
    create: { nombre: 'Directorio', descripcion: 'Directorio de pruebas' },
  });

  await prisma.rol.upsert({
    where: { nombre: 'Copropietario' },
    update: {},
    create: { nombre: 'Copropietario', descripcion: 'Copropietario de pruebas' },
  });

  await prisma.usuario.upsert({
    where: { correo: 'admin@edificioxyz.com' },
    update: { activo: true },
    create: {
      nombreUsuario: 'admin',
      correo: 'admin@edificioxyz.com',
      passwordHash: '$2a$10$dummyhashfortestenvironmentonly1234567890',
      idRol: rolAdmin.idRol,
      activo: true,
    },
  });
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
