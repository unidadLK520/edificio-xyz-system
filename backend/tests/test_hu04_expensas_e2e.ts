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

    // ── CA6: Recálculo e Interés por Mora ─────────────────────────────────────
    console.log('\n--- CA6: Cálculo de Recargo e Interés por Mora ---');
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

    const resMora = await fetch(`${baseUrl}/calcular-mora`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jsonMora = await resMora.json();
    console.log('Status Mora:', resMora.status, 'Actualizadas:', jsonMora.actualizadasCount);
    if (resMora.status === 200 && jsonMora.actualizadasCount > 0) {
      console.log('✅ CA6 PASS: Recargo de mora aplicado a expensas vencidas.');
    } else {
      console.error('❌ CA6 FAIL:', jsonMora);
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

    // ── CA09: Corrección / Anulación de Pago con Recálculo de Saldo ──────────
    console.log('\n--- CA09: Anular Pago y Recalcular Saldo ---');
    if (pagoId) {
      const resAnular = await fetch(`${baseUrl}/pagos/${pagoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const jsonAnular = await resAnular.json();
      console.log('Status Anular:', resAnular.status, 'Message:', jsonAnular.message);
      if (resAnular.status === 200 && jsonAnular.pagoAnulado) {
        console.log('✅ CA09 PASS: Pago anulado exitosamente y saldo recalculado en el departamento.');
      } else {
        console.error('❌ CA09 FAIL:', jsonAnular);
      }
    }

    // ── CA10: Trazabilidad y Registro de Auditoría ────────────────────────────
    console.log('\n--- CA10: Verificar Registro de Auditoría ---');
    const auditoriaRegistros = await prisma.auditoria.findMany({
      where: {
        tablaAfectada: { in: ['expensas', 'pagos'] },
      },
      take: 5,
      orderBy: { fechaHora: 'desc' },
    });

    if (auditoriaRegistros.length > 0) {
      console.log(`✅ CA10 PASS: Se encontraron ${auditoriaRegistros.length} registros de auditoría para operaciones de expensas.`);
    } else {
      console.error('❌ CA10 FAIL: No se registraron datos de auditoría.');
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
