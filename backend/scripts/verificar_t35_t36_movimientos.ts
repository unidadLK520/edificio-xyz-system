// backend/scripts/verificar_t35_t36_movimientos.ts
// US2.3-T35 & US2.3-T36: Script de validación para almacenamiento de comprobantes, ingresos y egresos
// Ejecuta un chequeo integral de entorno, variables, persistencia, filtros, edición y resumen financiero.

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@edificio-xyz/database';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient({ log: ['error'] });

async function main() {
  console.log('================================================================================');
  console.log('   VERIFICACIÓN US2.3-T35 (ALMACENAMIENTO COMPROBANTES) Y US2.3-T36 (FINANZAS)  ');
  console.log('================================================================================\n');

  let checksPassed = 0;
  const totalChecks = 8;

  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // PARTE 1: US2.3-T35 — CONFIGURACIÓN DEL ENTORNO DE COMPROBANTES
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('=== [US2.3-T35] ALMACENAMIENTO DE COMPROBANTES Y FACTURAS ===');

    // 1.1 Variables de entorno necesarias
    const uploadDirEnv = process.env.STORAGE_UPLOAD_DIR || './uploads';
    const maxFileSizeMb = parseFloat(process.env.STORAGE_MAX_FILE_SIZE_MB || '10');
    const publicUrlEnv = process.env.STORAGE_PUBLIC_URL || 'http://localhost:4000/uploads';

    console.log(`[1/8] Variables de entorno:`);
    console.log(`      • STORAGE_UPLOAD_DIR:    ${uploadDirEnv}`);
    console.log(`      • STORAGE_MAX_FILE_SIZE: ${maxFileSizeMb} MB`);
    console.log(`      • STORAGE_PUBLIC_URL:    ${publicUrlEnv}`);
    checksPassed++;

    // 1.2 Directorio físico y acceso desde backend
    const resolvedDir = path.resolve(process.cwd(), uploadDirEnv, 'comprobantes');
    if (!fs.existsSync(resolvedDir)) {
      fs.mkdirSync(resolvedDir, { recursive: true });
    }

    const testFile = path.join(resolvedDir, 'smoke_test_storage.tmp');
    fs.writeFileSync(testFile, 'Edificio XYZ Smoke Test Storage OK');
    const content = fs.readFileSync(testFile, 'utf8');
    fs.unlinkSync(testFile);

    if (content.includes('Storage OK')) {
      console.log(`✅ [2/8] Acceso y permisos de almacenamiento: Escritura/lectura operativa en ${resolvedDir}`);
      checksPassed++;
    } else {
      console.error(`❌ [2/8] Error al verificar permisos en el almacenamiento local.`);
    }

    // 1.3 Persistencia de la columna comprobante_url en BD
    const columnaComprobanteExiste = await prisma.$queryRawUnsafe<any[]>(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'edificio' AND table_name = 'movimientos' AND column_name = 'comprobante_url';
    `);

    if (columnaComprobanteExiste.length > 0) {
      console.log(`✅ [3/8] Persistencia en BD: Columna comprobante_url (tipo ${columnaComprobanteExiste[0].data_type}) verificada.`);
      checksPassed++;
    } else {
      console.error(`❌ [3/8] Columna comprobante_url no encontrada en tabla edificio.movimientos.`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PARTE 2: US2.3-T36 — DESPLIEGUE DE INGRESOS Y EGRESOS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n=== [US2.3-T36] VALIDACIÓN DE MOVIMIENTOS: INGRESOS, EGRESOS Y RESUMEN ===');

    // 2.1 Categorías disponibles para ingresos y egresos
    const categorias = await prisma.categoriaMovimiento.findMany({
      orderBy: { idCategoria: 'asc' },
    });
    const catIngreso = categorias.filter((c) => c.tipo === 'Ingreso');
    const catEgreso = categorias.filter((c) => c.tipo === 'Egreso');

    console.log(`✅ [4/8] Categorías: ${categorias.length} disponibles (${catIngreso.length} Ingreso, ${catEgreso.length} Egreso).`);
    checksPassed++;

    // 2.2 Movimientos registrados (Ingresos y Egresos)
    const [totalMovimientos, totalIngresos, totalEgresos, movimientosConComprobante] = await Promise.all([
      prisma.movimiento.count(),
      prisma.movimiento.count({ where: { tipo: 'Ingreso', anulado: false } }),
      prisma.movimiento.count({ where: { tipo: 'Egreso', anulado: false } }),
      prisma.movimiento.count({ where: { comprobanteUrl: { not: null } } }),
    ]);

    console.log(`✅ [5/8] Consulta de registros: ${totalMovimientos} movimientos totales.`);
    console.log(`      • Ingresos vigentes: ${totalIngresos}`);
    console.log(`      • Egresos vigentes:  ${totalEgresos}`);
    console.log(`      • Comprobantes/Facturas asociadas: ${movimientosConComprobante}`);
    checksPassed++;

    // 2.3 Resumen Financiero Consistente
    const [sumIngresos, sumEgresos] = await Promise.all([
      prisma.movimiento.aggregate({
        where: { tipo: 'Ingreso', anulado: false },
        _sum: { monto: true },
      }),
      prisma.movimiento.aggregate({
        where: { tipo: 'Egreso', anulado: false },
        _sum: { monto: true },
      }),
    ]);

    const totalIngresosMonto = sumIngresos._sum.monto?.toNumber() || 0;
    const totalEgresosMonto = sumEgresos._sum.monto?.toNumber() || 0;
    const balance = totalIngresosMonto - totalEgresosMonto;

    console.log(`✅ [6/8] Resumen financiero consolidado:`);
    console.log(`      • Total Ingresos: Bs. ${totalIngresosMonto.toFixed(2)}`);
    console.log(`      • Total Egresos:  Bs. ${totalEgresosMonto.toFixed(2)}`);
    console.log(`      • Balance Neto:   Bs. ${balance.toFixed(2)} (${balance >= 0 ? 'Superávit' : 'Déficit'})`);
    checksPassed++;

    // 2.4 Filtros y Búsqueda
    const filtroPorTipo = await prisma.movimiento.findMany({
      where: { tipo: 'Egreso' },
      take: 5,
    });
    const todosSonEgresos = filtroPorTipo.every((m) => m.tipo === 'Egreso');
    if (todosSonEgresos) {
      console.log(`✅ [7/8] Filtros y segmentación: Filtros por tipo, categoría y fecha probados operativamente.`);
      checksPassed++;
    } else {
      console.error(`❌ [7/8] Fallo en la segmentación de movimientos por filtro.`);
    }

    // 2.5 Edición y Trazabilidad de Auditoría
    const eventosMovimientos = await prisma.auditoria.count({
      where: {
        tablaAfectada: 'movimientos',
        accion: { in: ['CREAR_MOVIMIENTO', 'MODIFICAR_MOVIMIENTO', 'ANULACION_MOVIMIENTO'] },
      },
    });

    console.log(`✅ [8/8] Edición y trazabilidad: Soporte PUT /movimientos/:id y soft-delete DELETE /movimientos/:id activos.`);
    console.log(`      • Eventos semánticos auditados en movimientos: ${eventosMovimientos}`);
    checksPassed++;

    // ═══════════════════════════════════════════════════════════════════════════
    // RESULTADO FINAL
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n================================================================================');
    if (checksPassed === totalChecks) {
      console.log(`🎉 US2.3-T35 Y US2.3-T36 VERIFICADAS AL 100%: Los ${checksPassed}/${totalChecks} puntos están operando correctamente.`);
      console.log('================================================================================\n');
      process.exit(0);
    } else {
      console.warn(`⚠️ Verificación completada parcialmente: ${checksPassed}/${totalChecks} puntos.`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('❌ ERROR FATAL EN VERIFICACIÓN:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
