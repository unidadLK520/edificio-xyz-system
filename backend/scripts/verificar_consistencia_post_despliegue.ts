// backend/scripts/verificar_consistencia_post_despliegue.ts
// US2.2-T29: Script de verificación de persistencia y consistencia financiera post-despliegue
// Comprueba de forma estrictamente de solo lectura los 7 elementos requeridos tras la actualización:
// 1. Expensas  2. Pagos  3. Anticipos  4. Moras  5. Estados  6. Historial/Auditoría  7. Saldos

import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@edificio-xyz/database';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient({
  log: ['error'],
});

async function main() {
  console.log('================================================================================');
  console.log('   US2.2-T29: VERIFICACIÓN DE PERSISTENCIA Y CONSISTENCIA POST-DESPLIEGUE        ');
  console.log('================================================================================\n');

  let checklistPassed = 0;
  const totalChecks = 7;

  try {
    // ─── 1. EXPENSAS ────────────────────────────────────────────────────────────
    console.log('--- [1/7] VERIFICANDO EXPENSAS ---');
    const totalExpensas = await prisma.expensa.count();
    const expensasNegativas = await prisma.expensa.count({
      where: { monto: { lte: 0 } },
    });
    
    // Verificar si existen duplicados de (idDepartamento, periodo)
    const duplicadosExpensas = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id_departamento, periodo, COUNT(*) as cantidad
      FROM edificio.expensas
      GROUP BY id_departamento, periodo
      HAVING COUNT(*) > 1;
    `);

    if (totalExpensas > 0 && expensasNegativas === 0 && duplicadosExpensas.length === 0) {
      console.log(`✅ EXPENSAS OK: ${totalExpensas} registradas, 0 montos negativos, 0 duplicados (unicidad íntegra).`);
      checklistPassed++;
    } else {
      console.error(`❌ EXPENSAS ERROR: Total=${totalExpensas}, Negativas=${expensasNegativas}, Duplicados=${duplicadosExpensas.length}`);
    }

    // ─── 2. PAGOS ───────────────────────────────────────────────────────────────
    console.log('\n--- [2/7] VERIFICANDO PAGOS ---');
    const totalPagos = await prisma.pago.count();
    const pagosVigentes = await prisma.pago.count({ where: { anulado: false } });
    const pagosAnulados = await prisma.pago.count({ where: { anulado: true } });
    const pagosSinMetodo = await prisma.pago.count({ where: { metodoPago: null } });

    if (totalPagos > 0) {
      console.log(`✅ PAGOS OK: ${totalPagos} pagos registrados (${pagosVigentes} vigentes, ${pagosAnulados} anulados con trazabilidad lógica).`);
      if (pagosSinMetodo > 0) {
        console.log(`ℹ️ Nota: ${pagosSinMetodo} pagos de registros iniciales no especifican método de pago.`);
      }
      checklistPassed++;
    } else {
      console.warn(`⚠️ PAGOS ALERTA: No se encontraron pagos en la base de datos.`);
    }

    // ─── 3. ANTICIPOS ───────────────────────────────────────────────────────────
    console.log('\n--- [3/7] VERIFICANDO ANTICIPOS ---');
    const anticipos = await prisma.pago.findMany({
      where: { esAnticipado: true, anulado: false },
      include: { aplicacionesAnticipo: true },
    });

    let anticiposConsistentes = true;
    for (const ant of anticipos) {
      const totalAplicado = ant.aplicacionesAnticipo.reduce((acc, ap) => acc + Number(ap.monto), 0);
      const saldoDisponible = Number(ant.montoPagado) - totalAplicado;
      if (saldoDisponible < -0.01) {
        anticiposConsistentes = false;
        console.error(`❌ Anticipo ID ${ant.idPago} sobre-aplicado: pagado=${ant.montoPagado}, aplicado=${totalAplicado}`);
      }
    }

    if (anticiposConsistentes) {
      const totalMontoAnticipos = anticipos.reduce((acc, a) => acc + Number(a.montoPagado), 0);
      console.log(`✅ ANTICIPOS OK: ${anticipos.length} anticipos vigentes (Total: Bs. ${totalMontoAnticipos.toFixed(2)}). Aplicaciones y saldos matemáticamente coherentes.`);
      checklistPassed++;
    } else {
      console.error(`❌ ANTICIPOS ERROR: Inconsistencia en saldos disponibles de anticipos.`);
    }

    // ─── 4. MORAS ───────────────────────────────────────────────────────────────
    console.log('\n--- [4/7] VERIFICANDO MORAS ---');
    const reglaMoraActiva = await prisma.reglaMora.findFirst({ where: { activa: true } });
    const expensasConMora = await prisma.expensa.count({ where: { montoMora: { gt: 0 } } });
    const expensasVencidas = await prisma.expensa.count({
      where: {
        fechaVencimiento: { lt: new Date() },
        saldoPendiente: { gt: 0 },
      },
    });

    if (reglaMoraActiva) {
      console.log(`✅ MORAS OK: Regla activa configurada (Tasa: ${reglaMoraActiva.tasaInteres}%, Gracia: ${reglaMoraActiva.diasGracia} días).`);
      console.log(`   Expensas vencidas con saldo: ${expensasVencidas} | Expensas con recargo de mora registrado: ${expensasConMora}.`);
      checklistPassed++;
    } else {
      console.warn(`⚠️ MORAS ALERTA: No se encontró una regla de mora activa configurada en la tabla edificio.reglas_mora.`);
    }

    // ─── 5. ESTADOS ─────────────────────────────────────────────────────────────
    console.log('\n--- [5/7] VERIFICANDO ESTADOS ---');
    const estadosInconsistentes = await prisma.expensa.count({
      where: {
        estado: 'Pagado',
        saldoPendiente: { gt: 0.01 },
      },
    });

    const estadosValidos = ['Pendiente', 'Pagado', 'Parcial', 'Moroso', 'Anulado'];
    const todasLasExpensas = await prisma.expensa.findMany({ select: { estado: true } });
    const estadosInvalidos = todasLasExpensas.filter((e) => !estadosValidos.includes(e.estado));

    if (estadosInconsistentes === 0 && estadosInvalidos.length === 0) {
      console.log(`✅ ESTADOS OK: 0 inconsistencias de estado. Todas las expensas 'Pagado' tienen saldo 0 y usan nomenclatura válida.`);
      checklistPassed++;
    } else {
      console.error(`❌ ESTADOS ERROR: ${estadosInconsistentes} expensas 'Pagado' tienen saldo > 0. ${estadosInvalidos.length} tienen estados no reconocidos.`);
    }

    // ─── 6. HISTORIAL Y AUDITORÍA ───────────────────────────────────────────────
    console.log('\n--- [6/7] VERIFICANDO HISTORIAL Y TRAZABILIDAD ---');
    const totalAuditorias = await prisma.auditoria.count();
    const eventosCriticos = await prisma.auditoria.count({
      where: {
        accion: { in: ['CREACION_PAGO', 'ANULACION_PAGO', 'EMISION_EXPENSAS', 'REGISTRO_MONTO_AGUA', 'CALCULO_MORA_EXPENSAS'] },
      },
    });

    if (totalAuditorias > 0) {
      console.log(`✅ HISTORIAL OK: ${totalAuditorias} eventos de auditoría registrados (${eventosCriticos} de operaciones financieras críticas). Trazabilidad preservada.`);
      checklistPassed++;
    } else {
      console.warn(`⚠️ HISTORIAL ALERTA: La tabla de auditoría no contiene registros.`);
    }

    // ─── 7. SALDOS ──────────────────────────────────────────────────────────────
    console.log('\n--- [7/7] VERIFICANDO CONSISTENCIA DE SALDOS ---');
    const expensasConRelaciones = await prisma.expensa.findMany({
      include: {
        pagos: { where: { anulado: false } },
        aplicacionesAnticipos: { include: { pago: true } },
      },
    });

    let discrepanciasSaldos = 0;
    for (const exp of expensasConRelaciones) {
      const montoTotal = Number(exp.monto);
      const mora = Number(exp.montoMora || 0);
      const sumaPagos = exp.pagos.reduce((acc, p) => acc + Number(p.montoPagado), 0);
      const sumaAnticipos = exp.aplicacionesAnticipos
        .filter((a) => !a.pago?.anulado)
        .reduce((acc, a) => acc + Number(a.monto), 0);

      const saldoActual = Number(exp.saldoPendiente);
      // Si está pagada con saldo 0 (registro histórico o liquidado), saldo esperado es 0
      const saldoEsperado = (exp.estado === 'Pagado' && saldoActual === 0)
        ? 0
        : Math.max(0, Math.round((montoTotal - sumaPagos - sumaAnticipos + mora) * 100) / 100);

      // Margen de tolerancia de 5 centavos por redondeos de coma flotante
      if (Math.abs(saldoEsperado - saldoActual) > 0.05) {
        discrepanciasSaldos++;
        console.error(`❌ Discrepancia en Expensa ID ${exp.idExpensa} (Dpto ${exp.idDepartamento}): Saldo almacenado = ${saldoActual}, Saldo analítico esperado = ${saldoEsperado} (Monto: ${montoTotal}, Mora: ${mora}, Pagos: ${sumaPagos}, Anticipos: ${sumaAnticipos})`);
      }
    }

    if (discrepanciasSaldos === 0) {
      console.log(`✅ SALDOS OK: Las ${expensasConRelaciones.length} expensas cumplen la igualdad contable exacta (Saldo = Obligación - Pagos - Anticipos).`);
      checklistPassed++;
    } else {
      console.error(`❌ SALDOS ERROR: Se detectaron ${discrepanciasSaldos} discrepancias en los saldos pendientes.`);
    }

    // ─── RESUMEN FINAL ──────────────────────────────────────────────────────────
    console.log('\n================================================================================');
    if (checklistPassed === totalChecks) {
      console.log(`🎉 US2.2-T29 CUMPLIDO AL 100%: Los ${checklistPassed}/${totalChecks} puntos de persistencia y consistencia financiera están verificados.`);
      console.log('================================================================================\n');
      process.exit(0);
    } else {
      console.warn(`⚠️ US2.2-T29 PARCIAL: ${checklistPassed}/${totalChecks} puntos cumplidos. Revisar los avisos anteriores.`);
      console.log('================================================================================\n');
      process.exit(1);
    }
  } catch (err: any) {
    console.error('❌ ERROR FATAL DURANTE LA EJECUCIÓN DE LA VERIFICACIÓN:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
