// backend/scripts/seed_demo_local.ts
// Datos de demostración SOLO locales (Aislado a pg-test: localhost:5433/edificio_test)

import dotenv from 'dotenv';
dotenv.config();

// ── Medida de seguridad estricta: abortar si no es pg-test local ─────────────
const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl) {
  console.error('❌ ERROR FATAL: DATABASE_URL no está definida.');
  process.exit(1);
}

try {
  const parsed = new URL(databaseUrl);
  const host = parsed.hostname;
  const port = parsed.port;
  const dbName = parsed.pathname.replace(/^\//, '');

  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  const isPort5433 = port === '5433';
  const isDbEdificioTest = dbName === 'edificio_test';

  if (!isLocalHost || !isPort5433 || !isDbEdificioTest) {
    console.error('🛑 ABORTADO POR SEGURIDAD: Este script SOLO puede ejecutarse contra localhost:5433/edificio_test.');
    console.error(`Detectado: Host=${host}, Puerto=${port}, Base=${dbName}`);
    process.exit(1);
  }
} catch (err: any) {
  console.error('❌ ERROR FATAL: Error al analizar la URL de conexión a la base de datos.');
  process.exit(1);
}

import { prisma } from '@edificio-xyz/database';

async function main() {
  console.log('🌱 Iniciando seed de datos de demostración en pg-test (localhost:5433/edificio_test)...');

  // 1. Tipos de Departamento (A: 300, B: 350, C: 400)
  console.log('📌 Configurando tipos de departamento A, B y C...');
  const tiposConfig = [
    { nombre: 'A', montoExpensa: 300.00 },
    { nombre: 'B', montoExpensa: 350.00 },
    { nombre: 'C', montoExpensa: 400.00 },
  ];

  const tiposMap: Record<string, any> = {};
  for (const t of tiposConfig) {
    const tipo = await prisma.tipoDepartamento.upsert({
      where: { nombre: t.nombre },
      update: { montoExpensa: t.montoExpensa },
      create: { nombre: t.nombre, montoExpensa: t.montoExpensa },
    });
    tiposMap[t.nombre] = tipo;
    console.log(`   - Tipo ${tipo.nombre}: Monto Expensa Bs ${tipo.montoExpensa}`);
  }

  // 2. Propietarios (Personas)
  console.log('📌 Creando / verificando personas propietarias...');
  const personasData = [
    { ciNit: 'DEMO-101', nombres: 'Carlos', apellidos: 'Paredes', correo: 'carlos.paredes@demo.com', telefono: '70010101' },
    { ciNit: 'DEMO-102', nombres: 'María', apellidos: 'Gutiérrez', correo: 'maria.gutierrez@demo.com', telefono: '70010202' },
    { ciNit: 'DEMO-201', nombres: 'Juan', apellidos: 'Mendoza', correo: 'juan.mendoza@demo.com', telefono: '70020101' },
    { ciNit: 'DEMO-202', nombres: 'Lucía', apellidos: 'Flores', correo: 'lucia.flores@demo.com', telefono: '70020202' },
    { ciNit: 'DEMO-301', nombres: 'Roberto', apellidos: 'Vargas', correo: 'roberto.vargas@demo.com', telefono: '70030101' },
    { ciNit: 'DEMO-302', nombres: 'Elena', apellidos: 'Rojas', correo: 'elena.rojas@demo.com', telefono: '70030202' },
  ];

  const personasMap: any[] = [];
  for (const p of personasData) {
    const persona = await prisma.persona.upsert({
      where: { ciNit: p.ciNit },
      update: { nombres: p.nombres, apellidos: p.apellidos, correo: p.correo, telefono: p.telefono },
      create: { ciNit: p.ciNit, nombres: p.nombres, apellidos: p.apellidos, correo: p.correo, telefono: p.telefono },
    });
    personasMap.push(persona);
  }

  // 3. 6 Departamentos asignados a Tipos A, B y C
  console.log('📌 Configurando 6 departamentos (2 de tipo A, 2 de tipo B, 2 de tipo C)...');
  const deptosConfig = [
    { numero: '101', piso: 1, tipoNombre: 'A', personaIndex: 0 },
    { numero: '102', piso: 1, tipoNombre: 'A', personaIndex: 1 },
    { numero: '201', piso: 2, tipoNombre: 'B', personaIndex: 2 },
    { numero: '202', piso: 2, tipoNombre: 'B', personaIndex: 3 },
    { numero: '301', piso: 3, tipoNombre: 'C', personaIndex: 4 },
    { numero: '302', piso: 3, tipoNombre: 'C', personaIndex: 5 },
  ];

  const deptosMap: Record<string, any> = {};
  for (const d of deptosConfig) {
    const propietario = personasMap[d.personaIndex];
    const tipo = tiposMap[d.tipoNombre];

    const depto = await prisma.departamento.upsert({
      where: { numero: d.numero },
      update: {
        piso: d.piso,
        idTipo: tipo.idTipo,
        idPropietario: propietario.idPersona,
        estado: 'Ocupado',
      },
      create: {
        numero: d.numero,
        piso: d.piso,
        idTipo: tipo.idTipo,
        idPropietario: propietario.idPersona,
        estado: 'Ocupado',
      },
    });
    deptosMap[d.numero] = depto;

    // Asegurar ocupante activo
    const ocupante = await prisma.ocupanteDepartamento.findFirst({
      where: {
        idDepartamento: depto.idDepartamento,
        idPersona: propietario.idPersona,
        fechaFin: null,
      },
    });

    if (!ocupante) {
      await prisma.ocupanteDepartamento.create({
        data: {
          idDepartamento: depto.idDepartamento,
          idPersona: propietario.idPersona,
          tipoOcupante: 'Propietario',
          fechaInicio: new Date(),
          fechaFin: null,
        },
      });
    }

    console.log(`   - Depto ${depto.numero}: Tipo ${d.tipoNombre} (Bs ${tipo.montoExpensa}), Propietario: ${propietario.nombres} ${propietario.apellidos}`);
  }

  // 4. Regla de Mora activa
  console.log('📌 Verificando regla de mora activa...');
  const reglaMora = await prisma.reglaMora.findFirst({
    where: { activa: true },
  });
  if (!reglaMora) {
    await prisma.reglaMora.create({
      data: {
        tasaInteres: 5.0,
        diasGracia: 0,
        activa: true,
      },
    });
    console.log('   - Regla de mora creada: 5% de interés, 0 días de gracia.');
  } else {
    console.log(`   - Regla de mora activa existente: ${reglaMora.tasaInteres}%`);
  }

  // 5. Escenario para Demostración:
  console.log('📌 Configurando escenario de demostración...');

  // Escenario A: Depto 301 con Expensa Vencida para probar Cálculo de Mora
  const periodoVencido = new Date('2026-08-01T00:00:00.000Z');
  const vencimientoPasado = new Date('2026-08-15T00:00:00.000Z');
  const depto301 = deptosMap['301'];
  const expensaVencidaExistente = await prisma.expensa.findFirst({
    where: { idDepartamento: depto301.idDepartamento, periodo: periodoVencido },
  });

  if (!expensaVencidaExistente) {
    await prisma.expensa.create({
      data: {
        idDepartamento: depto301.idDepartamento,
        periodo: periodoVencido,
        monto: 400.00,
        montoMora: 0,
        saldoPendiente: 400.00,
        tasaInteresMora: 5,
        fechaVencimiento: vencimientoPasado,
        estado: 'Pendiente',
      },
    });
    console.log('   - Depto 301: Expensa vencida generada (Bs 400, vence 2026-08-15) -> Lista para POST /api/v1/expensas/calcular-mora');
  }

  // Escenario B: Depto 102 con Anticipo a Favor para probar FIFO
  const depto102 = deptosMap['102'];
  const propietario102 = personasMap[1];
  const anticipoExistente = await prisma.pago.findFirst({
    where: {
      idDepartamento: depto102.idDepartamento,
      idExpensa: null,
      esAnticipado: true,
      anulado: false,
    },
  });

  if (!anticipoExistente) {
    await prisma.pago.create({
      data: {
        idDepartamento: depto102.idDepartamento,
        idExpensa: null,
        idPersonaPagador: propietario102.idPersona,
        montoPagado: 500.00,
        interesPagado: 0,
        metodoPago: 'Transferencia',
        esAnticipado: true,
        anulado: false,
        fechaPago: new Date(),
      },
    });
    console.log('   - Depto 102: Anticipo registrado a favor (Bs 500) -> Listo para aplicar FIFO en nueva expensa');
  }

  // Escenario C: Depto 202 con expensa emitida para probar pagos directos
  const periodoActual = new Date('2026-10-01T00:00:00.000Z');
  const vencimientoActual = new Date('2026-10-25T00:00:00.000Z');
  const depto202 = deptosMap['202'];
  const expensa202 = await prisma.expensa.findFirst({
    where: { idDepartamento: depto202.idDepartamento, periodo: periodoActual },
  });

  if (!expensa202) {
    const expCreada = await prisma.expensa.create({
      data: {
        idDepartamento: depto202.idDepartamento,
        periodo: periodoActual,
        monto: 350.00,
        montoMora: 0,
        saldoPendiente: 350.00,
        tasaInteresMora: 5,
        fechaVencimiento: vencimientoActual,
        estado: 'Pendiente',
      },
    });
    console.log(`   - Depto 202: Expensa emitida (ID ${expCreada.idExpensa}, Bs 350) -> Lista para POST /api/v1/expensas/${expCreada.idExpensa}/pagos`);
  }

  console.log('\n✅ Demo local lista para usar:');
  console.log('   1. Generación masiva: POST /api/v1/expensas/generar-masivo');
  console.log('   2. Pago ordinario / anticipos: POST /api/v1/expensas/:id/pagos (con idPersonaPagador)');
  console.log('   3. Cálculo de mora: POST /api/v1/expensas/calcular-mora');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed demo local:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
