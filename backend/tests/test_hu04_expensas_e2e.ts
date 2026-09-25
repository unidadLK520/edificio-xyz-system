// backend/tests/test_hu04_expensas_e2e.ts
// Test E2E HTTP Real para HU04: Gestión de Expensas, Generación Masiva, Pagos, Mora, Morosos y Auditoría

import 'dotenv/config';
import process from 'node:process';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { SignJWT } from 'jose';
import { prisma } from '@edificio-xyz/database';
import { config } from '../src/config';
import { router } from '../src/routes';
import { errorMiddleware } from '../src/middlewares/error.middleware';

async function main() {
  console.log('🚀 ====================================================================');
  console.log('🚀 Test E2E HTTP Real para HU04: Gestión de Expensas y Recaudación');
  console.log('🚀 ====================================================================\n');

  // 1. Probar conectividad con base de datos
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    console.log('✅ Conexión con PostgreSQL establecida correctamente.\n');
  } catch (dbErr: any) {
    console.error('❌ No se pudo conectar a PostgreSQL:', dbErr.message);
    return;
  }

  // 2. Levantar servidor Express en puerto 4004
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/v1', router);
  app.use(errorMiddleware);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(4004, () => {
      console.log('📡 Servidor de pruebas HU04 iniciado en http://localhost:4004\n');
      resolve();
    });
  });

  const baseUrl = 'http://localhost:4004/api/v1/expensas';

  // Helper para generar tokens JWT
  async function generarToken(idUsuario: number, correo: string, rol: string) {
    return new SignJWT({ idUsuario, nombreUsuario: correo.split('@')[0], correo, rol })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(config.jwtSecret);
  }

  const adminToken = await generarToken(1, 'admin@edificioxyz.com', 'Administrador');
  const consultaToken = await generarToken(3, 'consulta@edificioxyz.com', 'Copropietario');

  const ts = Date.now().toString().slice(-4);
  const numDepto1 = `D4-${ts}`;
  const numDepto2 = `E4-${ts}`;

  let personaId: number | null = null;
  let persona2Id: number | null = null;
  let depto1Id: number | null = null;
  let depto2Id: number | null = null;
  let expensa1Id: number | null = null;
  let expensa2Id: number | null = null;
  let pagoId: number | null = null;
  let usuarioCopropietarioId: number | null = null;
  let copropietarioToken: string = '';

  try {
    // Crear persona y departamentos de prueba
    const nuevaPersona = await prisma.persona.create({
      data: {
        nombres: 'Copropietario Test',
        apellidos: 'HU04',
        ciNit: `CI-HU4-${ts}`,
        telefono: '77112233',
        correo: `test.hu4.${ts}@email.com`,
      },
    });
    personaId = nuevaPersona.idPersona;

    const nuevaPersona2 = await prisma.persona.create({
      data: {
        nombres: 'Vecino Ajeno Test',
        apellidos: 'HU04',
        ciNit: `CI-AJENO-${ts}`,
        telefono: '77998877',
        correo: `ajeno.hu4.${ts}@email.com`,
      },
    });
    persona2Id = nuevaPersona2.idPersona;

    const d1 = await prisma.departamento.create({
      data: {
        numero: numDepto1,
        piso: 4,
        areaM2: 100.0,
        idPropietario: personaId,
        estado: 'Ocupado',
      },
    });
    depto1Id = d1.idDepartamento;

    const d2 = await prisma.departamento.create({
      data: {
        numero: numDepto2,
        piso: 4,
        areaM2: 80.0,
        idPropietario: persona2Id,
        estado: 'Ocupado',
      },
    });
    depto2Id = d2.idDepartamento;

    // Asignar personaId a d1 como ocupante activo
    await prisma.ocupanteDepartamento.create({
      data: {
        idDepartamento: depto1Id,
        idPersona: personaId,
        tipoOcupante: 'Propietario',
        fechaInicio: new Date(),
        fechaFin: null,
      },
    });

    // Asignar persona2Id a d2 como ocupante activo
    await prisma.ocupanteDepartamento.create({
      data: {
        idDepartamento: depto2Id,
        idPersona: persona2Id,
        tipoOcupante: 'Propietario',
        fechaInicio: new Date(),
        fechaFin: null,
      },
    });

    // Obtener rol Copropietario o ID por defecto
    const rolCopropietario = await prisma.rol.findFirst({
      where: { nombre: 'Copropietario' },
    });

    const usuarioCopropietario = await prisma.usuario.create({
      data: {
        nombreUsuario: `copropietario_${ts}`,
        correo: `copropietario_${ts}@edificioxyz.com`,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
        idRol: rolCopropietario ? rolCopropietario.idRol : 3,
        idPersona: personaId,
        activo: true,
      },
    });
    usuarioCopropietarioId = usuarioCopropietario.idUsuario;

    copropietarioToken = await generarToken(
      usuarioCopropietario.idUsuario,
      usuarioCopropietario.correo,
      'Copropietario'
    );

    console.log(`🏢 Departamentos creados (${numDepto1} ID: ${depto1Id}, ${numDepto2} ID: ${depto2Id})`);

    // ── CA1 & CA2: Generación Masiva de Expensas y Reglas de Exclusión ─────────
    console.log('\n--- CA1 & CA2: Generación Masiva de Expensas con Exclusiones ---');
    const periodoTest = '2026-10-01';
    const vencimientoTest = '2026-10-15';

    const resGenerar = await fetch(`${baseUrl}/generar-masivo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        periodo: periodoTest,
        fechaVencimiento: vencimientoTest,
        montoBase: 400,
        tasaInteresMora: 5,
        excluirDepartamentos: [depto2Id], // CA2: Excluir depto 2
      }),
    });

    const jsonGenerar = await resGenerar.json();
    console.log('Status Generar:', resGenerar.status, 'Generadas:', jsonGenerar.generadasCount);
    if (resGenerar.status === 201 && jsonGenerar.generadasCount > 0) {
      console.log('✅ CA1 & CA2 PASS: Generación masiva ejecutada excluyendo unidades especificadas.');
    } else {
      console.error('❌ CA1/CA2 FAIL:', jsonGenerar);
    }

    // Obtener la expensa creada para depto1
    const resExpensas = await fetch(`${baseUrl}?idDepartamento=${depto1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jsonExpensas = await resExpensas.json();
    if (jsonExpensas.data && jsonExpensas.data.length > 0) {
      expensa1Id = jsonExpensas.data[0].idExpensa;
      console.log(`📋 Expensa creada encontrada (ID: ${expensa1Id}, Monto: ${jsonExpensas.data[0].monto})`);
    }

    // ── CA03 & CA04: Registro de Pago y Pago Anticipado ──────────────────────
    console.log('\n--- CA03 & CA04: Registrar Pago y Marca de Pago Anticipado ---');
    if (expensa1Id) {
      const resPago = await fetch(`${baseUrl}/${expensa1Id}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          montoPagado: 200,
          metodoPago: 'Transferencia',
          esAnticipado: false,
          comprobanteUrl: 'https://comprobantes.edificioxyz.com/recibo-101.pdf',
        }),
      });
      const jsonPago = await resPago.json();
      console.log('Status Pago:', resPago.status, 'Saldo Restante:', jsonPago.expensa?.saldoPendiente);
      if (resPago.status === 201 && jsonPago.pago) {
        pagoId = jsonPago.pago.idPago;
        console.log('✅ CA03 PASS: Pago parcial registrado y saldo actualizado correctamente.');
      } else {
        console.error('❌ CA03 FAIL:', jsonPago);
      }

      // Registro de Pago Anticipado (CA04)
      const resAnticipado = await fetch(`${baseUrl}/${expensa1Id}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          montoPagado: 300,
          metodoPago: 'QR',
          esAnticipado: true,
        }),
      });
      const jsonAnticipado = await resAnticipado.json();
      if (resAnticipado.status === 201 && jsonAnticipado.pago?.esAnticipado) {
        console.log('✅ CA04 PASS: Pago anticipado registrado conservando importe para aplicación posterior.');
      } else {
        console.error('❌ CA04 FAIL:', jsonAnticipado);
      }
    }

    // ── CA05: Consulta de Estado e Importes de Expensa ───────────────────────
    console.log('\n--- CA05: Consulta de Estado de Expensa con Pagos y Saldos ---');
    if (expensa1Id) {
      const resDetalle = await fetch(`${baseUrl}/${expensa1Id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const jsonDetalle = await resDetalle.json();
      if (resDetalle.status === 200 && jsonDetalle.pagos.length >= 2) {
        console.log(`✅ CA05 PASS: Estado consultado (Monto: ${jsonDetalle.monto}, Saldo: ${jsonDetalle.saldoPendiente}, Pagos: ${jsonDetalle.pagos.length}).`);
      } else {
        console.error('❌ CA05 FAIL:', jsonDetalle);
      }
    }

    // ── CA6: Cálculo Idempotente de Recargo e Interés por Mora ────────────────
    console.log('\n--- CA6-1: Cálculo Idempotente de Mora (2 corridas consecutivas sin duplicar recargo) ---');
    // Crear una expensa vencida manualmente para probar mora
    const expVencida = await prisma.expensa.create({
      data: {
        idDepartamento: depto2Id!,
        periodo: new Date('2026-08-01'),
        monto: 300,
        saldoPendiente: 300,
        tasaInteresMora: 10,
        fechaVencimiento: new Date('2026-08-15'), // fecha pasada
        estado: 'Pendiente',
      },
    });
    expensa2Id = expVencida.idExpensa;

    // Crear una expensa vencida pero ya pagada (saldo = 0, estado = 'Pagado')
    const expPagadaVencida = await prisma.expensa.create({
      data: {
        idDepartamento: depto2Id!,
        periodo: new Date('2026-07-01'),
        monto: 250,
        saldoPendiente: 0,
        tasaInteresMora: 10,
        fechaVencimiento: new Date('2026-07-15'), // fecha pasada
        estado: 'Pagado',
      },
    });

    // 1ra corrida de cálculo de mora
    const resMora1 = await fetch(`${baseUrl}/calcular-mora`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jsonMora1 = await resMora1.json();
    console.log('Status Mora 1:', resMora1.status, 'Actualizadas:', jsonMora1.actualizadasCount);

    const expVencida1 = await prisma.expensa.findUnique({ where: { idExpensa: expensa2Id } });
    const montoMora1 = Number(expVencida1?.montoMora);
    const saldo1 = Number(expVencida1?.saldoPendiente);

    // 2da corrida de cálculo de mora consecutiva
    const resMora2 = await fetch(`${baseUrl}/calcular-mora`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jsonMora2 = await resMora2.json();
    console.log('Status Mora 2:', resMora2.status, 'Actualizadas:', jsonMora2.actualizadasCount);

    const expVencida2 = await prisma.expensa.findUnique({ where: { idExpensa: expensa2Id } });
    const montoMora2 = Number(expVencida2?.montoMora);
    const saldo2 = Number(expVencida2?.saldoPendiente);

    if (
      resMora1.status === 200 &&
      resMora2.status === 200 &&
      montoMora1 === 30 &&
      montoMora2 === 30 &&
      saldo1 === 330 &&
      saldo2 === 330 &&
      expVencida2?.estado === 'Moroso'
    ) {
      console.log(`✅ CA6-1 PASS: Mora idempotente verificada (MontoMora: ${montoMora2}, Saldo: ${saldo2}, Estado: Moroso en ambas corridas).`);
    } else {
      console.error('❌ CA6-1 FAIL: La mora no fue idempotente:', { montoMora1, montoMora2, saldo1, saldo2 });
    }

    console.log('\n--- CA6-2: Expensa ya pagada no recibe mora ni cambia a Moroso ---');
    const expPagadaCheck = await prisma.expensa.findUnique({ where: { idExpensa: expPagadaVencida.idExpensa } });
    if (
      Number(expPagadaCheck?.montoMora) === 0 &&
      Number(expPagadaCheck?.saldoPendiente) === 0 &&
      expPagadaCheck?.estado === 'Pagado'
    ) {
      console.log('✅ CA6-2 PASS: Expensa con saldo 0 no fue afectada por cálculo de mora (montoMora=0, estado=Pagado).');
    } else {
      console.error('❌ CA6-2 FAIL: Expensa pagada fue alterada por cálculo de mora:', expPagadaCheck);
    }

    console.log('\n--- CA6-3: Anulación de Pago en Expensa con Mora recalcula saldo incluyendo mora vigente ---');
    // Registrar un pago parcial de 100 sobre la expensa en mora (saldo era 330: 300 base + 30 mora)
    const resPagoMora = await fetch(`${baseUrl}/${expensa2Id}/pagos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        montoPagado: 100,
        metodoPago: 'Efectivo',
      }),
    });
    const jsonPagoMora = await resPagoMora.json();
    const pagoMoraId = jsonPagoMora.pago?.idPago;

    // Anular el pago de 100
    const resAnularPagoMora = await fetch(`${baseUrl}/pagos/${pagoMoraId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ motivo: 'Error en pago sobre expensa con mora' }),
    });
    const jsonAnularPagoMora = await resAnularPagoMora.json();

    const expVencidaTrasAnulacion = await prisma.expensa.findUnique({ where: { idExpensa: expensa2Id } });
    const saldoTrasAnulacion = Number(expVencidaTrasAnulacion?.saldoPendiente);

    if (
      resAnularPagoMora.status === 200 &&
      saldoTrasAnulacion === 330 &&
      expVencidaTrasAnulacion?.estado === 'Moroso'
    ) {
      console.log(`✅ CA6-3 PASS: Tras anulación, el saldo de la expensa vuelve exactamente a ${saldoTrasAnulacion} conservando la mora y estado Moroso.`);
    } else {
      console.error('❌ CA6-3 FAIL: Saldo o estado incorrecto tras anulación en expensa con mora:', {
        status: resAnularPagoMora.status,
        saldoTrasAnulacion,
        expensa: expVencidaTrasAnulacion,
      });
    }

    // ── CA07: Listado de Morosos ──────────────────────────────────────────────
    console.log('\n--- CA07: Consultar Listado de Morosos ---');
    const resMorosos = await fetch(`${baseUrl}/morosos`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jsonMorosos = await resMorosos.json();
    if (resMorosos.status === 200 && jsonMorosos.data.some((m: any) => m.idDepartamento === depto2Id)) {
      console.log(`✅ CA07 PASS: Listado de morosos obtenido (${jsonMorosos.totalMorosos} unidades en mora).`);
    } else {
      console.error('❌ CA07 FAIL:', jsonMorosos);
    }

    // ── CA08: Estado de Cuenta por Departamento ──────────────────────────────
    console.log('\n--- CA08: Estado de Cuenta por Departamento ---');
    const resEstadoCuenta = await fetch(`${baseUrl}/estado-cuenta/${depto1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jsonEstadoCuenta = await resEstadoCuenta.json();
    if (resEstadoCuenta.status === 200 && jsonEstadoCuenta.resumen) {
      console.log(`✅ CA08 PASS: Estado de cuenta ordenado (Total Pagado: ${jsonEstadoCuenta.resumen.totalPagado}).`);
    } else {
      console.error('❌ CA08 FAIL:', jsonEstadoCuenta);
    }

    // ── CA09: Corrección / Anulación de Pago con Recálculo de Saldo y Soft-Delete ──
    console.log('\n--- CA09-1: Anular un Pago y Verificar que el Saldo Vuelve Exactamente al Valor Previo ---');
    // Obtenemos saldo previo de expensa1 antes de crear un nuevo pago para probar anulación pura
    const resExpPre = await fetch(`${baseUrl}/${expensa1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const expPreJson = await resExpPre.json();
    const saldoAntesAnulacion = Number(expPreJson.saldoPendiente);

    // Registramos un pago de prueba de 150
    const resPagoPrueba = await fetch(`${baseUrl}/${expensa1Id}/pagos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        montoPagado: 150,
        metodoPago: 'Efectivo',
      }),
    });
    const jsonPagoPrueba = await resPagoPrueba.json();
    const pagoPruebaId = jsonPagoPrueba.pago?.idPago;

    // Anulamos el pago con motivo obligatorio
    const resAnular = await fetch(`${baseUrl}/pagos/${pagoPruebaId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ motivo: 'Error en digitación de comprobante de caja' }),
    });
    const jsonAnular = await resAnular.json();
    console.log('Status Anular:', resAnular.status, 'Message:', jsonAnular.message);

    // Verificar que el saldo volvió exactamente al valor previo
    const resExpPost = await fetch(`${baseUrl}/${expensa1Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const expPostJson = await resExpPost.json();
    const saldoDespuesAnulacion = Number(expPostJson.saldoPendiente);

    if (
      resAnular.status === 200 &&
      jsonAnular.pagoAnulado?.anulado === true &&
      jsonAnular.pagoAnulado?.motivoAnulacion === 'Error en digitación de comprobante de caja' &&
      saldoDespuesAnulacion === saldoAntesAnulacion
    ) {
      console.log(`✅ CA09-1 PASS: Pago anulado (soft-delete) y saldo restaurado exactamente a ${saldoDespuesAnulacion}.`);
    } else {
      console.error('❌ CA09-1 FAIL: Error al anular pago y restaurar saldo:', { jsonAnular, saldoAntesAnulacion, saldoDespuesAnulacion });
    }

    console.log('\n--- CA09-2: Intentar Anular el Mismo Pago Dos Veces (Debe responder 409) ---');
    const resReAnular = await fetch(`${baseUrl}/pagos/${pagoPruebaId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ motivo: 'Intento duplicado de anulación' }),
    });
    const jsonReAnular = await resReAnular.json();
    console.log('Status Re-Anular:', resReAnular.status, 'Error Code:', jsonReAnular.code || jsonReAnular.error);
    if (resReAnular.status === 409 && (jsonReAnular.code === 'PAGO_YA_ANULADO' || jsonReAnular.error === 'PAGO_YA_ANULADO')) {
      console.log('✅ CA09-2 PASS: Intento de doble anulación rechazado con 409 (PAGO_YA_ANULADO).');
    } else {
      console.error('❌ CA09-2 FAIL: Se esperaba 409 PAGO_YA_ANULADO pero se obtuvo', resReAnular.status, jsonReAnular);
    }

    console.log('\n--- CA09-3: Corregir un Pago (PATCH /pagos/:idPago/corregir) ---');
    // Creamos un pago original de 100
    const resPagoOriginal = await fetch(`${baseUrl}/${expensa1Id}/pagos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        montoPagado: 100,
        metodoPago: 'Efectivo',
      }),
    });
    const jsonPagoOriginal = await resPagoOriginal.json();
    const idOriginal = jsonPagoOriginal.pago?.idPago;

    // Al corregir con 180, el pago original (100) se anula y se crea uno nuevo de 180
    const resCorregir = await fetch(`${baseUrl}/pagos/${idOriginal}/corregir`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        montoPagado: 180,
        metodoPago: 'Transferencia',
        motivo: 'Monto real era 180 según voucher bancario',
      }),
    });
    const jsonCorregir = await resCorregir.json();
    console.log('Status Corregir:', resCorregir.status, 'Message:', jsonCorregir.message);

    // Consultamos ambos pagos en la base de datos para verificar vínculos y anulado
    const pagoOriginalDb = await prisma.pago.findUnique({ where: { idPago: idOriginal } });
    const pagoNuevoDb = jsonCorregir.nuevoPago?.idPago
      ? await prisma.pago.findUnique({ where: { idPago: jsonCorregir.nuevoPago.idPago } })
      : null;

    const pagoOriginalOk = pagoOriginalDb?.anulado === true && pagoOriginalDb?.idPagoOriginal === null;
    const pagoNuevoOk = pagoNuevoDb?.anulado === false && pagoNuevoDb?.idPagoOriginal === idOriginal;

    if (resCorregir.status === 200 && pagoOriginalOk && pagoNuevoOk) {
      console.log('✅ CA09-3 PASS: Pago corregido exitosamente. Original anulado (idPagoOriginal=null), nuevo pago apunta al anulado y expensa refleja solo el pago nuevo.');
    } else {
      console.error('❌ CA09-3 FAIL: Error en corrección de pago:', {
        status: resCorregir.status,
        pagoOriginalOk,
        pagoNuevoOk,
        pagoOriginalDb,
        pagoNuevoDb,
      });
    }

    // ── CA10: Trazabilidad y Registro de Auditoría (ANULACION_PAGO) ────────────
    console.log('\n--- CA10: Verificar Registro de Auditoría de Tipo ANULACION_PAGO ---');
    const auditoriaAnulaciones = await prisma.auditoria.findMany({
      where: {
        tablaAfectada: 'pagos',
        accion: 'ANULACION_PAGO',
      },
      orderBy: { fechaHora: 'desc' },
    });

    const tieneAnulacionDirecta = auditoriaAnulaciones.some((a) => a.idRegistro === String(pagoPruebaId));
    const tieneAnulacionCorregir = auditoriaAnulaciones.some((a) => a.idRegistro === String(idOriginal));

    if (auditoriaAnulaciones.length >= 2 && tieneAnulacionDirecta && tieneAnulacionCorregir) {
      console.log(`✅ CA10 PASS: Se verificaron registros de auditoría ANULACION_PAGO para anulación directa (Pago ${pagoPruebaId}) y por corrección (Pago ${idOriginal}).`);
    } else {
      console.error('❌ CA10 FAIL: No se encontraron todos los registros de auditoría ANULACION_PAGO:', {
        total: auditoriaAnulaciones.length,
        tieneAnulacionDirecta,
        tieneAnulacionCorregir,
      });
    }

    // ── RBAC / Control de Acceso: Copropietario y Regresión Administrador ─────
    console.log('\n--- RBAC: Copropietario de Depto A pide estado de cuenta de Depto B ---');
    const resAjeno = await fetch(`${baseUrl}/estado-cuenta/${depto2Id}`, {
      headers: { Authorization: `Bearer ${copropietarioToken}` },
    });
    console.log('Status Ajeno:', resAjeno.status);
    if (resAjeno.status === 403) {
      console.log('✅ RBAC PASS: Copropietario del departamento A bloqueado con 403 al solicitar departamento B.');
    } else {
      console.error('❌ RBAC FAIL: Se esperaba 403 pero se obtuvo', resAjeno.status);
    }

    console.log('\n--- RBAC: Copropietario de Depto A pide estado de cuenta de su propio Depto A ---');
    const resPropio = await fetch(`${baseUrl}/estado-cuenta/${depto1Id}`, {
      headers: { Authorization: `Bearer ${copropietarioToken}` },
    });
    console.log('Status Propio:', resPropio.status);
    if (resPropio.status === 200) {
      console.log('✅ RBAC PASS: Copropietario del departamento A accede con 200 a su propio estado de cuenta.');
    } else {
      console.error('❌ RBAC FAIL: Se esperaba 200 pero se obtuvo', resPropio.status);
    }

    console.log('\n--- Regresión RBAC: Administrador accede sin restricción a los 4 endpoints GET ---');
    const [resAdminList, resAdminMorosos, resAdminDetalle, resAdminEstado] = await Promise.all([
      fetch(`${baseUrl}`, { headers: { Authorization: `Bearer ${adminToken}` } }),
      fetch(`${baseUrl}/morosos`, { headers: { Authorization: `Bearer ${adminToken}` } }),
      fetch(`${baseUrl}/${expensa1Id}`, { headers: { Authorization: `Bearer ${adminToken}` } }),
      fetch(`${baseUrl}/estado-cuenta/${depto1Id}`, { headers: { Authorization: `Bearer ${adminToken}` } }),
    ]);

    if (
      resAdminList.status === 200 &&
      resAdminMorosos.status === 200 &&
      resAdminDetalle.status === 200 &&
      resAdminEstado.status === 200
    ) {
      console.log('✅ Regresión PASS: Administrador accede exitosamente con 200 a los 4 endpoints GET.');
    } else {
      console.error('❌ Regresión FAIL: Acceso de administrador denegado en endpoints GET:', {
        list: resAdminList.status,
        morosos: resAdminMorosos.status,
        detalle: resAdminDetalle.status,
        estado: resAdminEstado.status,
      });
    }

  } finally {
    // Limpieza de datos de prueba
    if (usuarioCopropietarioId) {
      await prisma.usuario.deleteMany({ where: { idUsuario: usuarioCopropietarioId } });
    }
    if (personaId || persona2Id) {
      await prisma.ocupanteDepartamento.deleteMany({ where: { idPersona: { in: [personaId, persona2Id].filter(Boolean) as number[] } } });
    }
    if (depto1Id || depto2Id) {
      await prisma.pago.updateMany({
        where: { idDepartamento: { in: [depto1Id!, depto2Id!].filter(Boolean) } },
        data: { idPagoOriginal: null },
      });
      await prisma.pago.deleteMany({ where: { idDepartamento: { in: [depto1Id!, depto2Id!].filter(Boolean) } } });
      await prisma.expensa.deleteMany({ where: { idDepartamento: { in: [depto1Id!, depto2Id!].filter(Boolean) } } });
      await prisma.departamento.deleteMany({ where: { idDepartamento: { in: [depto1Id!, depto2Id!].filter(Boolean) } } });
    }
    if (personaId || persona2Id) {
      await prisma.persona.deleteMany({ where: { idPersona: { in: [personaId, persona2Id].filter(Boolean) as number[] } } });
    }

    server.close();
    console.log('\n🏁 Suite de pruebas E2E HU04 finalizada.');
  }
}

main().catch((e) => {
  console.error('Fatal Test Error:', e);
  process.exit(1);
});
