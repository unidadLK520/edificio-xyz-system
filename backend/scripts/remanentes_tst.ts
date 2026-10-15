// scripts/remanentes_tst.ts
import 'dotenv/config';
import { prisma } from '@edificio-xyz/database';

async function main() {
  console.log('=== INSPECCIONANDO REGISTROS TST- REMANENTES ===');
  try {
    const deptos = await prisma.departamento.findMany({
      where: {
        OR: [
          { numero: { startsWith: 'TST-' } },
          { numero: { startsWith: 'TEST-' } },
          { numero: { startsWith: 'CRON-' } },
          { numero: { startsWith: 'RM-' } },
          { numero: { startsWith: 'TA-' } },
          { numero: { startsWith: 'TB-' } },
          { numero: { startsWith: 'TC-' } },
        ],
      },
      select: {
        idDepartamento: true,
        numero: true,
        piso: true,
        idTipo: true,
      },
    });

    console.log(`Departamentos TST- encontrados (${deptos.length}):`);
    console.log(JSON.stringify(deptos, null, 2));

    const personas = await prisma.persona.findMany({
      where: {
        OR: [
          { ciNit: { startsWith: 'TST-' } },
          { ciNit: { startsWith: 'CI-PAG-' } },
          { ciNit: { startsWith: 'CI-TEST-' } },
          { correo: { startsWith: 'tst-' } },
        ],
      },
      select: {
        idPersona: true,
        nombres: true,
        apellidos: true,
        ciNit: true,
        correo: true,
      },
    });

    console.log(`Personas TST- encontradas (${personas.length}):`);
    console.log(JSON.stringify(personas, null, 2));

    const expensas = await prisma.expensa.findMany({
      where: {
        departamento: {
          OR: [
            { numero: { startsWith: 'TST-' } },
            { numero: { startsWith: 'TEST-' } },
            { numero: { startsWith: 'CRON-' } },
            { numero: { startsWith: 'RM-' } },
            { numero: { startsWith: 'TA-' } },
            { numero: { startsWith: 'TB-' } },
            { numero: { startsWith: 'TC-' } },
          ],
        },
      },
      select: {
        idExpensa: true,
        idDepartamento: true,
        periodo: true,
        monto: true,
      },
    });
    console.log(`Expensas TST- encontradas (${expensas.length}):`);
    console.log(JSON.stringify(expensas, null, 2));

    const lecturas = await prisma.lecturaAgua.findMany({
      select: {
        idLectura: true,
        idDepartamento: true,
        periodo: true,
        lecturaActual: true,
        consumoM3: true,
      },
    });
    console.log(`Lecturas de agua encontradas (${lecturas.length}):`);
    console.log(JSON.stringify(lecturas, null, 2));

    const tarifas = await prisma.tarifaAgua.findMany({
      select: {
        idTarifa: true,
        precioM3: true,
        activa: true,
      },
    });
    console.log(`Tarifas de agua encontradas (${tarifas.length}):`);
    console.log(JSON.stringify(tarifas, null, 2));

  } catch (err: any) {
    console.error('Error al inspeccionar remanentes TST-:', err.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
