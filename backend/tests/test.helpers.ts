// backend/tests/test.helpers.ts
// Helpers globales para aislamiento de datos de prueba en la BD compartida

import { prisma } from '@edificio-xyz/database';

export interface LimpiarIdsOptions {
  aplicacionesAnticipos?: number[];
  pagos?: number[];
  expensas?: number[];
  ocupantes?: number[];
  departamentos?: number[];
  parqueos?: number[];
  bauleras?: number[];
  personas?: number[];
  usuarios?: number[];
  reglasMora?: number[];
  tarifasAgua?: number[];
  tiposDepartamento?: number[];
  lecturasAgua?: number[];
}

let counter = 0;
function uniqueSuffix(): string {
  counter = (counter + 1) % 10000;
  return `${Date.now().toString().slice(-4)}${counter.toString().padStart(4, '0')}`.slice(-6);
}

let deptoCounter = Math.floor(Math.random() * 1000);

/**
 * Genera un número de departamento con prefijo TST- (máx 10 caracteres)
 */
export function generarNumeroDeptoTest(prefix = 'D'): string {
  deptoCounter = (deptoCounter + 1) % 9000 + 1000;
  const p = prefix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 1);
  const randDigit = Math.floor(Math.random() * 9 + 1);
  return `TST-${p}${randDigit}${deptoCounter}`.slice(0, 10);
}

/**
 * Genera un CI/NIT con prefijo TST- (máx 30 caracteres)
 */
export function generarCiNitTest(prefix = 'CI'): string {
  return `TST-${prefix}-${Date.now().toString().slice(-6)}-${uniqueSuffix().slice(-3)}`.slice(0, 30);
}

/**
 * Genera un correo electrónico de prueba con prefijo tst-
 */
export function generarCorreoTest(tag = 'user'): string {
  return `tst-${tag}-${Date.now().toString().slice(-6)}-${uniqueSuffix().slice(-3)}@edificioxyz.com`;
}

/**
 * Crea un departamento de prueba garantizando el prefijo TST-
 */
export async function crearDepartamentoTest(
  data: Partial<{
    numero: string;
    piso: number;
    estado: string;
    idTipo: number;
    idPropietario: number;
  }> = {}
) {
  const numero = data.numero && data.numero.startsWith('TST-')
    ? data.numero
    : generarNumeroDeptoTest();

  return await prisma.departamento.create({
    data: {
      numero,
      piso: data.piso ?? 1,
      estado: data.estado ?? 'Ocupado',
      idTipo: data.idTipo,
      idPropietario: data.idPropietario,
    },
  });
}

/**
 * Crea una persona de prueba garantizando el prefijo TST- en ciNit y correo
 */
export async function crearPersonaTest(
  data: Partial<{
    nombres: string;
    apellidos: string;
    ciNit: string;
    correo: string;
    telefono: string;
  }> = {}
) {
  const ciNit = data.ciNit && data.ciNit.startsWith('TST-')
    ? data.ciNit
    : generarCiNitTest();
  const correo = data.correo && data.correo.startsWith('tst-')
    ? data.correo
    : generarCorreoTest('per');

  return await prisma.persona.create({
    data: {
      nombres: data.nombres ?? 'Test',
      apellidos: data.apellidos ?? 'Usuario',
      ciNit,
      correo,
      telefono: data.telefono ?? '70000000',
    },
  });
}

/**
 * Limpieza estricta: borra ÚNICAMENTE por IDs creados.
 * PROHIBIDO deleteMany sin lista de IDs o TRUNCATE.
 * Las filas de auditoria generadas por triggers NO se tocan.
 */
export async function limpiar(ids: LimpiarIdsOptions): Promise<void> {
  // Orden estricto respetando claves foráneas
  if (ids.aplicacionesAnticipos && ids.aplicacionesAnticipos.length > 0) {
    const valid = ids.aplicacionesAnticipos.filter(Boolean);
    if (valid.length > 0) {
      await prisma.aplicacionAnticipo.deleteMany({
        where: { idAplicacion: { in: valid } },
      });
    }
  }

  if (ids.pagos && ids.pagos.length > 0) {
    const valid = ids.pagos.filter(Boolean);
    if (valid.length > 0) {
      // Eliminar primero dependencias de aplicaciones de anticipos si existieran
      await prisma.aplicacionAnticipo.deleteMany({
        where: { idPago: { in: valid } },
      });
      await prisma.pago.deleteMany({
        where: { idPago: { in: valid } },
      });
    }
  }

  if (ids.expensas && ids.expensas.length > 0) {
    const valid = ids.expensas.filter(Boolean);
    if (valid.length > 0) {
      await prisma.aplicacionAnticipo.deleteMany({
        where: { idExpensa: { in: valid } },
      });
      await prisma.pago.deleteMany({
        where: { idExpensa: { in: valid } },
      });
      await prisma.expensa.deleteMany({
        where: { idExpensa: { in: valid } },
      });
    }
  }

  if (ids.ocupantes && ids.ocupantes.length > 0) {
    const valid = ids.ocupantes.filter(Boolean);
    if (valid.length > 0) {
      await prisma.ocupanteDepartamento.deleteMany({
        where: { idOcupacion: { in: valid } },
      });
    }
  }

  if (ids.lecturasAgua && ids.lecturasAgua.length > 0) {
    const valid = ids.lecturasAgua.filter(Boolean);
    if (valid.length > 0) {
      await prisma.lecturaAgua.deleteMany({
        where: { idLectura: { in: valid } },
      });
    }
  }

  if (ids.departamentos && ids.departamentos.length > 0) {
    const valid = ids.departamentos.filter(Boolean);
    if (valid.length > 0) {
      await prisma.ocupanteDepartamento.deleteMany({
        where: { idDepartamento: { in: valid } },
      });
      await prisma.departamento.deleteMany({
        where: { idDepartamento: { in: valid } },
      });
    }
  }

  if (ids.parqueos && ids.parqueos.length > 0) {
    const valid = ids.parqueos.filter(Boolean);
    if (valid.length > 0) {
      await prisma.parqueo.deleteMany({
        where: { idParqueo: { in: valid } },
      });
    }
  }

  if (ids.bauleras && ids.bauleras.length > 0) {
    const valid = ids.bauleras.filter(Boolean);
    if (valid.length > 0) {
      await prisma.baulera.deleteMany({
        where: { idBaulera: { in: valid } },
      });
    }
  }

  if (ids.personas && ids.personas.length > 0) {
    const valid = ids.personas.filter(Boolean);
    if (valid.length > 0) {
      await prisma.persona.deleteMany({
        where: { idPersona: { in: valid } },
      });
    }
  }

  if (ids.usuarios && ids.usuarios.length > 0) {
    const valid = ids.usuarios.filter(Boolean);
    if (valid.length > 0) {
      await prisma.usuario.deleteMany({
        where: { idUsuario: { in: valid } },
      });
    }
  }

  if (ids.reglasMora && ids.reglasMora.length > 0) {
    const valid = ids.reglasMora.filter(Boolean);
    if (valid.length > 0) {
      await prisma.reglaMora.deleteMany({
        where: { idRegla: { in: valid } },
      });
    }
  }

  if (ids.tarifasAgua && ids.tarifasAgua.length > 0) {
    const valid = ids.tarifasAgua.filter(Boolean);
    if (valid.length > 0) {
      await prisma.tarifaAgua.deleteMany({
        where: { idTarifa: { in: valid } },
      });
    }
  }

  if (ids.tiposDepartamento && ids.tiposDepartamento.length > 0) {
    const valid = ids.tiposDepartamento.filter(Boolean);
    if (valid.length > 0) {
      await prisma.tipoDepartamento.deleteMany({
        where: { idTipo: { in: valid } },
      });
    }
  }
}

/**
 * Crea un tipo de departamento de prueba garantizando el prefijo TST- (máx 60 caracteres)
 */
export async function crearTipoDepartamentoTest(
  data: Partial<{
    nombre: string;
    montoExpensa: number;
    areaM2: number;
    activo: boolean;
  }> = {}
) {
  const baseNombre = data.nombre || `TST-Tipo-${uniqueSuffix()}`;
  const nombre = baseNombre.startsWith('TST-')
    ? baseNombre.slice(0, 60)
    : `TST-${baseNombre}`.slice(0, 60);

  return await prisma.tipoDepartamento.create({
    data: {
      nombre,
      montoExpensa: data.montoExpensa ?? 500,
      areaM2: data.areaM2,
      activo: data.activo ?? true,
    },
  });
}

/**
 * Consulta de solo lectura de conteos de filas que NO son de prueba (sin prefijo TST-)
 */
export async function contarFilasNoTest(): Promise<{
  departamentos: number;
  personas: number;
  expensas: number;
  pagos: number;
  auditoria: number;
}> {
  const res = await prisma.$queryRawUnsafe<any[]>(`
    SELECT 
      (SELECT count(*)::text FROM edificio.departamentos 
       WHERE numero NOT LIKE 'TST-%' AND numero NOT LIKE 'TEST-%' AND numero NOT LIKE 'CRON-%' AND numero NOT LIKE 'RM-%' AND numero NOT LIKE 'TA-%' AND numero NOT LIKE 'TB-%' AND numero NOT LIKE 'TC-%') as deptos,
      (SELECT count(*)::text FROM edificio.personas 
       WHERE ci_nit NOT LIKE 'TST-%' AND ci_nit NOT LIKE 'CI-PAG-%' AND ci_nit NOT LIKE 'CI-TEST-%') as personas,
      (SELECT count(*)::text FROM edificio.expensas e
       JOIN edificio.departamentos d ON d.id_departamento = e.id_departamento
       WHERE d.numero NOT LIKE 'TST-%' AND d.numero NOT LIKE 'TEST-%' AND d.numero NOT LIKE 'CRON-%' AND d.numero NOT LIKE 'RM-%' AND d.numero NOT LIKE 'TA-%' AND d.numero NOT LIKE 'TB-%' AND d.numero NOT LIKE 'TC-%') as expensas,
      (SELECT count(*)::text FROM edificio.pagos p
       JOIN edificio.departamentos d ON d.id_departamento = p.id_departamento
       WHERE d.numero NOT LIKE 'TST-%' AND d.numero NOT LIKE 'TEST-%' AND d.numero NOT LIKE 'CRON-%' AND d.numero NOT LIKE 'RM-%' AND d.numero NOT LIKE 'TA-%' AND d.numero NOT LIKE 'TB-%' AND d.numero NOT LIKE 'TC-%') as pagos,
      (SELECT count(*)::text FROM edificio.auditoria) as auditoria;
  `);

  const row = res[0] || {};
  return {
    departamentos: Number(row.deptos || 0),
    personas: Number(row.personas || 0),
    expensas: Number(row.expensas || 0),
    pagos: Number(row.pagos || 0),
    auditoria: Number(row.auditoria || 0),
  };
}
