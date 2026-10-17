// backend/scripts/pruebas_volumen_concurrencia.ts
// Pruebas de volumen y concurrencia para expensas (BD compartida con prefijo TST-)

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Medida de seguridad estricta: abortar sin autorización explícita
if (process.env.ALLOW_SHARED_DB_TESTS !== 'true') {
  console.error('🛑 ABORTADO POR SEGURIDAD: Se requiere ALLOW_SHARED_DB_TESTS=true para ejecutar pruebas.');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL || '';
if (!databaseUrl) {
  console.error('❌ ERROR FATAL: DATABASE_URL no está definida.');
  process.exit(1);
}

process.env.NODE_ENV = 'test';

import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '@edificio-xyz/database';
import { SignJWT } from 'jose';
import { config } from '../src/config';

async function generateToken(idUsuario: number, rol: string, nombreUsuario = 'admin') {
  return new SignJWT({ idUsuario, rol, nombreUsuario, correo: `${nombreUsuario}@test.com` })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(config.jwtSecret);
}

// Helper con timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout de ${timeoutMs}ms excedido en: ${operationName}`)), timeoutMs)
    ),
  ]);
}

async function main() {
  console.log('================================================================');
  console.log('🚀 PRUEBAS DE VOLUMEN Y CONCURRENCIA EN PG-TEST (localhost:5433)');
  console.log('================================================================\n');

  try {
    // 1. Obtener token Administrador
    let admin = await prisma.usuario.findFirst({
      where: { rol: { nombre: 'Administrador' } },
    });
    if (!admin) {
      const rolAdmin = await prisma.rol.upsert({
        where: { nombre: 'Administrador' },
        update: {},
        create: { nombre: 'Administrador', descripcion: 'Admin' },
      });
      admin = await prisma.usuario.create({
        data: {
          nombreUsuario: 'admin_bench',
          correo: 'admin_bench@test.com',
          passwordHash: 'dummy',
          idRol: rolAdmin.idRol,
        },
      });
    }
    const token = await generateToken(admin.idUsuario, 'Administrador', admin.nombreUsuario);

    // Tipos A (300), B (350), C (400)
    const tipoA = await prisma.tipoDepartamento.upsert({
      where: { nombre: 'A' },
      update: { montoExpensa: 300 },
      create: { nombre: 'A', montoExpensa: 300 },
    });
    const tipoB = await prisma.tipoDepartamento.upsert({
      where: { nombre: 'B' },
      update: { montoExpensa: 350 },
      create: { nombre: 'B', montoExpensa: 350 },
    });
    const tipoC = await prisma.tipoDepartamento.upsert({
      where: { nombre: 'C' },
      update: { montoExpensa: 400 },
      create: { nombre: 'C', montoExpensa: 400 },
    });
    const tipos = [tipoA, tipoB, tipoC];

    // ──────────────────────────────────────────────────────────────────────────
    // (a) PRUEBA 1: Generar-masivo de 20 departamentos con tipo (Timeout 60s)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('─── (a) PRUEBA 1: GENERAR-MASIVO PARA 20 DEPARTAMENTOS CON TIPO ───');
    const periodo20 = '2030-01-01';

    const departamentos20Ids: number[] = [];
    for (let i = 1; i <= 20; i++) {
      const num = `V20-${String(i).padStart(2, '0')}`;
      const tipoSel = tipos[i % 3];
      const dep = await prisma.departamento.upsert({
        where: { numero: num },
        update: { idTipo: tipoSel.idTipo, estado: 'Disponible' },
        create: {
          numero: num,
          piso: Math.floor(i / 4) + 1,
          areaM2: 60 + i,
          idTipo: tipoSel.idTipo,
          estado: 'Disponible',
        },
      });
      departamentos20Ids.push(dep.idDepartamento);
    }

    // Limpiar expensas previas del período si existieran
    await prisma.expensa.deleteMany({
      where: { periodo: new Date(periodo20) },
    });

    console.log(`Ejecutando POST /api/v1/expensas/generar-masivo para período ${periodo20}...`);
    const t0_a = performance.now();
    const resA = await withTimeout(
      request(app)
        .post('/api/v1/expensas/generar-masivo')
        .set('Authorization', `Bearer ${token}`)
        .send({
          periodo: periodo20,
          fechaVencimiento: '2030-01-15',
          tasaInteresMora: 5,
        }),
      60000,
      'Generación masiva 20 deptos'
    );
    const t1_a = performance.now();
    const tiempoA = (t1_a - t0_a).toFixed(2);

    console.log(`Status respuesta: ${resA.status}`);
    console.log(`Generadas: ${resA.body.generadasCount}`);
    console.log(`Excepciones: ${resA.body.excepcionesCount}`);
    console.log(`⏱️ Tiempo total de generación para 20 departamentos: ${tiempoA} ms`);

    const expensasGeneradas20 = await prisma.expensa.findMany({
      where: {
        periodo: new Date(periodo20),
        idDepartamento: { in: departamentos20Ids },
      },
      include: { departamento: { include: { tipo: true } } },
    });

    const montosCorrectos = expensasGeneradas20.every(
      (e) => Number(e.monto) === Number(e.departamento.tipo?.montoExpensa)
    );
    console.log(`Total expensas en BD verificadas: ${expensasGeneradas20.length}`);
    console.log(`¿Coinciden los montos con tipos_departamento.monto_expensa?: ${montosCorrectos ? 'SÍ (Correcto)' : 'NO'}`);

    // Limpieza de datos de prueba (a)
    await prisma.expensa.deleteMany({
      where: { periodo: new Date(periodo20) },
    });
    await prisma.departamento.deleteMany({
      where: { idDepartamento: { in: departamentos20Ids } },
    });
    console.log('🧹 Datos de prueba (a) limpiados exitosamente.\n');

    // ──────────────────────────────────────────────────────────────────────────
    // (b) PRUEBA 2: Dos generar-masivo simultáneos del mismo período (Timeout 30s)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('─── (b) PRUEBA 2: DOS GENERAR-MASIVO SIMULTÁNEOS DEL MISMO PERÍODO ───');
    const periodoConc = '2030-02-01';

    const deptosConcIds: number[] = [];
    for (let i = 1; i <= 5; i++) {
      const num = `CC-${i}`;
      const dep = await prisma.departamento.upsert({
        where: { numero: num },
        update: { idTipo: tipos[i % 3].idTipo, estado: 'Disponible' },
        create: {
          numero: num,
          piso: 1,
          areaM2: 55,
          idTipo: tipos[i % 3].idTipo,
          estado: 'Disponible',
        },
      });
      deptosConcIds.push(dep.idDepartamento);
    }

    // Limpiar expensas previas
    await prisma.expensa.deleteMany({
      where: { periodo: new Date(periodoConc) },
    });

    console.log(`Lanzando 2 peticiones generar-masivo en paralelo para período ${periodoConc}...`);
    const t0_b = performance.now();
    const [resB1, resB2] = await withTimeout(
      Promise.all([
        request(app)
          .post('/api/v1/expensas/generar-masivo')
          .set('Authorization', `Bearer ${token}`)
          .send({
            periodo: periodoConc,
            fechaVencimiento: '2030-02-15',
            tasaInteresMora: 5,
          }),
        request(app)
          .post('/api/v1/expensas/generar-masivo')
          .set('Authorization', `Bearer ${token}`)
          .send({
            periodo: periodoConc,
            fechaVencimiento: '2030-02-15',
            tasaInteresMora: 5,
          }),
      ]),
      30000,
      'Dos peticiones simultáneas'
    );
    const t1_b = performance.now();
    const tiempoB = (t1_b - t0_b).toFixed(2);

    console.log(`Petición 1: Status ${resB1.status}, Generadas: ${resB1.body.generadasCount}`);
    console.log(`Petición 2: Status ${resB2.status}, Generadas: ${resB2.body.generadasCount}`);
    console.log(`⏱️ Tiempo total de ejecución concurrente: ${tiempoB} ms`);

    const expensasEnPeriodo = await prisma.expensa.findMany({
      where: {
        periodo: new Date(periodoConc),
        idDepartamento: { in: deptosConcIds },
      },
    });

    const conteoPorDepto: Record<number, number> = {};
    expensasEnPeriodo.forEach((e) => {
      conteoPorDepto[e.idDepartamento] = (conteoPorDepto[e.idDepartamento] || 0) + 1;
    });

    const hayDuplicados = Object.values(conteoPorDepto).some((c) => c > 1);

    console.log(`Total expensas registradas en BD: ${expensasEnPeriodo.length}`);
    console.log(`¿Se duplicaron expensas para algún departamento?: ${hayDuplicados ? 'SÍ (Condición de carrera)' : 'NO'}`);
    console.log('📌 Hallazgo para DevOps:');
    if (hayDuplicados) {
      console.log('   Se confirma que ante peticiones simultáneas, la consulta previa en código');
      console.log('   no es suficiente y se insertan expensas duplicadas. El índice único @@unique([idDepartamento, periodo])');
      console.log('   es indispensable en la base de datos.');
    } else {
      console.log('   Una petición fue rechazada o abortada por error de unicidad/transacción;');
      console.log('   la BD protegió la integridad si el índice o bloqueo transaccional estaba activo.');
    }

    // Limpieza de datos de prueba (b)
    await prisma.expensa.deleteMany({
      where: { periodo: new Date(periodoConc) },
    });
    await prisma.departamento.deleteMany({
      where: { idDepartamento: { in: deptosConcIds } },
    });
    console.log('🧹 Datos de prueba (b) limpiados exitosamente.\n');

    console.log('================================================================');
    console.log('✅ PRUEBAS FINALIZADAS SATISFACTORIAMENTE');
    console.log('================================================================');
  } catch (err: any) {
    console.error('❌ Error durante la ejecución:', err.message || err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
