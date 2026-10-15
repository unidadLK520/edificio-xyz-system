import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { prisma } from '@edificio-xyz/database';
import { contarFilasNoTest } from '../tests/test.helpers';

async function main() {
  try {
    const baselinePath = path.resolve(__dirname, 'snapshot_baseline.json');
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

    // 1. Estado actual de las 3 tablas
    const reglasActuales = await prisma.reglaMora.findMany({ orderBy: { idRegla: 'asc' } });
    const tiposActuales = await prisma.tipoDepartamento.findMany({ orderBy: { idTipo: 'asc' } });
    const tarifasActuales = await prisma.tarifaAgua.findMany({ orderBy: { idTarifa: 'asc' } });

    console.log('===============================================================');
    console.log('             COMPARACIÓN ANTES / DESPUÉS                       ');
    console.log('===============================================================');

    // 1.1 Reglas de mora
    console.log('\n--- 1. TABLA: reglas_mora ---');
    console.log('Snapshot ANTES:');
    console.log(JSON.stringify(baseline.reglas_mora, null, 2));
    console.log('Estado DESPUÉS:');
    console.log(JSON.stringify(reglasActuales, null, 2));

    const reglaActivaAntes = baseline.reglas_mora.find((r: any) => r.activa);
    const reglaActivaDespues = reglasActuales.find((r) => r.activa);
    console.log(`Regla activa ANTES:   ID ${reglaActivaAntes?.idRegla} (Tasa: ${reglaActivaAntes?.tasaInteres}%, Gracia: ${reglaActivaAntes?.diasGracia})`);
    console.log(`Regla activa DESPUÉS: ID ${reglaActivaDespues?.idRegla} (Tasa: ${reglaActivaDespues?.tasaInteres}%, Gracia: ${reglaActivaDespues?.diasGracia})`);

    const reglasCoinciden = JSON.stringify(baseline.reglas_mora) === JSON.stringify(reglasActuales.map(r => ({
      ...r,
      fechaCreacion: r.fechaCreacion.toISOString()
    })));
    console.log(`¿Coincidencia exacta de reglas_mora?: ${reglasCoinciden ? '✅ SÍ (Idéntica)' : '⚠️ DIFERENCIA'}`);

    // 1.2 Tipos de departamento
    console.log('\n--- 2. TABLA: tipos_departamento ---');
    console.log(`Filas tipos_departamento: ANTES: ${baseline.tipos_departamento.length} | DESPUÉS: ${tiposActuales.length}`);
    console.log('Snapshot ANTES:');
    console.log(JSON.stringify(baseline.tipos_departamento, null, 2));
    console.log('Estado DESPUÉS:');
    console.log(JSON.stringify(tiposActuales, null, 2));
    const tiposCoinciden = JSON.stringify(baseline.tipos_departamento) === JSON.stringify(tiposActuales);
    console.log(`¿Coincidencia exacta de tipos_departamento?: ${tiposCoinciden ? '✅ SÍ (Idéntica)' : '⚠️ DIFERENCIA'}`);

    // 1.3 Tarifas de agua
    console.log('\n--- 3. TABLA: tarifas_agua ---');
    console.log(`Tarifas ANTES:   ${baseline.tarifas_agua.length} filas`);
    console.log(`Tarifas DESPUÉS: ${tarifasActuales.length} filas`);
    console.log(`¿Coincidencia exacta de tarifas_agua?: ${tarifasActuales.length === 0 ? '✅ SÍ (0 filas)' : '⚠️ DIFERENCIA'}`);

    // 2. Conteos NO TST-
    console.log('\n===============================================================');
    console.log('             CONTEOS NO TST- (DATOS REALES)                    ');
    console.log('===============================================================');
    const noTest = await contarFilasNoTest();
    console.log(`Departamentos NO TST-: ANTES: 20 | DESPUÉS: ${noTest.departamentos} | ${noTest.departamentos === 20 ? '✅ INALTERADO' : '❌ ALTERADO'}`);
    console.log(`Personas NO TST-:      ANTES: 15 | DESPUÉS: ${noTest.personas} | ${noTest.personas === 15 ? '✅ INALTERADO' : '❌ ALTERADO'}`);
    console.log(`Expensas NO TST-:      ANTES: 33 | DESPUÉS: ${noTest.expensas} | ${noTest.expensas === 33 ? '✅ INALTERADO' : '❌ ALTERADO'}`);
    console.log(`Pagos NO TST-:         ANTES: 27 | DESPUÉS: ${noTest.pagos} | ${noTest.pagos === 27 ? '✅ INALTERADO' : '❌ ALTERADO'}`);

    // 3. Filas TST- remanentes
    console.log('\n===============================================================');
    console.log('             FILAS TST- REMANENTES (DEBE SER 0)                ');
    console.log('===============================================================');
    const tstTiposCount = await prisma.tipoDepartamento.count({
      where: { nombre: { startsWith: 'TST-' } },
    });
    const tstRes = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        (SELECT count(*)::text FROM edificio.departamentos WHERE numero LIKE 'TST-%' OR numero LIKE 'TEST-%' OR numero LIKE 'CRON-%' OR numero LIKE 'RM-%' OR numero LIKE 'TA-%' OR numero LIKE 'TB-%' OR numero LIKE 'TC-%') as tst_deptos,
        (SELECT count(*)::text FROM edificio.personas WHERE ci_nit LIKE 'TST-%' OR ci_nit LIKE 'CI-PAG-%' OR ci_nit LIKE 'CI-TEST-%' OR correo LIKE 'tst-%') as tst_personas,
        (SELECT count(*)::text FROM edificio.expensas e JOIN edificio.departamentos d ON d.id_departamento = e.id_departamento WHERE d.numero LIKE 'TST-%' OR d.numero LIKE 'TEST-%' OR d.numero LIKE 'CRON-%' OR d.numero LIKE 'RM-%' OR d.numero LIKE 'TA-%' OR d.numero LIKE 'TB-%' OR d.numero LIKE 'TC-%') as tst_expensas,
        (SELECT count(*)::text FROM edificio.pagos p JOIN edificio.departamentos d ON d.id_departamento = p.id_departamento WHERE d.numero LIKE 'TST-%' OR d.numero LIKE 'TEST-%' OR d.numero LIKE 'CRON-%' OR d.numero LIKE 'RM-%' OR d.numero LIKE 'TA-%' OR d.numero LIKE 'TB-%' OR d.numero LIKE 'TC-%') as tst_pagos;
    `);
    const tstRow = tstRes[0] || {};
    console.log(`Departamentos TST- remanentes:      ${tstRow.tst_deptos} (${tstRow.tst_deptos === '0' ? '✅ 0' : '❌ NO ES 0'})`);
    console.log(`Personas TST- remanentes:           ${tstRow.tst_personas} (${tstRow.tst_personas === '0' ? '✅ 0' : '❌ NO ES 0'})`);
    console.log(`Expensas TST- remanentes:           ${tstRow.tst_expensas} (${tstRow.tst_expensas === '0' ? '✅ 0' : '❌ NO ES 0'})`);
    console.log(`Pagos TST- remanentes:              ${tstRow.tst_pagos} (${tstRow.tst_pagos === '0' ? '✅ 0' : '❌ NO ES 0'})`);
    console.log(`Tipos departamento TST- remanentes: ${tstTiposCount} (${tstTiposCount === 0 ? '✅ 0' : '❌ NO ES 0'})`);

    // 4. Filas de auditoria generadas
    console.log('\n===============================================================');
    console.log('             FILAS DE AUDITORIA GENERADAS                      ');
    console.log('===============================================================');
    const auditBase = baseline.auditoria_inicial || 2136;
    const nuevasAuditoria = noTest.auditoria - auditBase;
    console.log(`Auditoria total anterior: ${auditBase}`);
    console.log(`Auditoria total actual:   ${noTest.auditoria}`);
    console.log(`Filas generadas por triggers en la ejecución: ${nuevasAuditoria}`);

  } catch (err) {
    console.error('Error al comparar tablas:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
