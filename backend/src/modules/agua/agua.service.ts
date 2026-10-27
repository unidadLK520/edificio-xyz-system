// backend/src/modules/agua/agua.service.ts
// Lógica de negocio para registro y consulta de montos manuales de agua

import { prisma } from '@edificio-xyz/database';
import { auditoriaService } from '../auditoria';
import {
  RegistrarMontosAguaInput,
  FiltrosObtenerMontosAgua,
  MontoAguaResponse,
} from './agua.types';

/**
 * Normaliza siempre el periodo recibido al primer día del mes (YYYY-MM-01) en formato UTC,
 * con la misma normalización exacta que utiliza expensas.periodo.
 */
export function normalizarPeriodo(periodoStr: string): { periodoNormalizado: string; periodoDate: Date } {
  if (!periodoStr || typeof periodoStr !== 'string') {
    const error: any = new Error('El período es obligatorio');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const match = periodoStr.trim().match(/^(\d{4})-(\d{1,2})/);
  if (!match) {
    const error: any = new Error('Formato de período inválido. Debe ser YYYY-MM o YYYY-MM-DD');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const pYear = match[1];
  const pMonth = match[2].padStart(2, '0');
  const periodoNormalizado = `${pYear}-${pMonth}-01`;
  const periodoDate = new Date(`${periodoNormalizado}T00:00:00.000Z`);

  if (isNaN(periodoDate.getTime())) {
    const error: any = new Error('Fecha de período inválida');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  return { periodoNormalizado, periodoDate };
}

/**
 * Registra o actualiza en lote los montos manuales de agua por (idDepartamento, periodo).
 * - Transacción atómica (todo o nada).
 * - 400 si el monto es negativo o inválido.
 * - 422 si el departamento no existe.
 * - 409 si ya hay expensa emitida para ese departamento y período.
 * - Auditoría REGISTRO_MONTO_AGUA por departamento con datosAnteriores y datosNuevos.
 */
export async function registrarOActualizarMontosAgua(
  input: RegistrarMontosAguaInput
): Promise<{ periodo: string; total: number; montos: MontoAguaResponse[] }> {
  const { periodoNormalizado, periodoDate } = normalizarPeriodo(input.periodo);

  if (!Array.isArray(input.montos) || input.montos.length === 0) {
    const error: any = new Error('La lista de montos no puede estar vacía');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  // 1. Validaciones previas de montos
  for (const item of input.montos) {
    if (
      item.idDepartamento === undefined ||
      item.idDepartamento === null ||
      isNaN(item.idDepartamento) ||
      item.idDepartamento <= 0
    ) {
      const error: any = new Error('ID de departamento inválido en la lista de montos');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    if (
      item.montoAgua === undefined ||
      item.montoAgua === null ||
      typeof item.montoAgua !== 'number' ||
      isNaN(item.montoAgua) ||
      item.montoAgua < 0
    ) {
      const error: any = new Error(`El monto de agua para el departamento ${item.idDepartamento} debe ser mayor o igual a 0`);
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
  }

  const deptosIds = Array.from(new Set(input.montos.map((m) => m.idDepartamento)));

  return await prisma.$transaction(
    async (tx) => {
      // 2. Verificar existencia de todos los departamentos (422 si alguno no existe)
      const deptosExistentes = await tx.departamento.findMany({
        where: { idDepartamento: { in: deptosIds } },
        select: { idDepartamento: true, numero: true },
      });
      const deptosExistentesSet = new Set(deptosExistentes.map((d) => d.idDepartamento));

      for (const idDepto of deptosIds) {
        if (!deptosExistentesSet.has(idDepto)) {
          const error: any = new Error(`El departamento con ID ${idDepto} no existe`);
          error.statusCode = 422;
          error.code = 'UNPROCESSABLE_ENTITY';
          throw error;
        }
      }

      // 3. Verificar si ya existe expensa emitida para ese departamento y período (409)
      const expensasEmitidas = await tx.expensa.findMany({
        where: {
          idDepartamento: { in: deptosIds },
          periodo: periodoDate,
        },
        select: {
          idExpensa: true,
          idDepartamento: true,
          departamento: { select: { numero: true } },
        },
      });

      if (expensasEmitidas.length > 0) {
        const primera = expensasEmitidas[0];
        const numDepto = primera.departamento?.numero || primera.idDepartamento;
        const error: any = new Error(
          `Ya existe una expensa emitida para el departamento ${numDepto} (ID: ${primera.idDepartamento}) en el período ${periodoNormalizado}. No se puede modificar el monto de agua.`
        );
        error.statusCode = 409;
        error.code = 'CONFLICT';
        throw error;
      }

      // 4. Buscar anteriores y departamentos en 1 sola consulta previa
      const anteriores = await tx.montoAgua.findMany({
        where: {
          idDepartamento: { in: deptosIds },
          periodo: periodoDate,
        },
      });
      const mapaAnteriores = new Map(anteriores.map((a) => [a.idDepartamento, a]));

      const deptosConTipo = await tx.departamento.findMany({
        where: { idDepartamento: { in: deptosIds } },
        select: {
          idDepartamento: true,
          numero: true,
          piso: true,
          tipo: { select: { nombre: true, montoExpensa: true } },
        },
      });
      const deptosMap = new Map(deptosConTipo.map((d) => [d.idDepartamento, d]));

      const guardados: MontoAguaResponse[] = [];
      const eventosAuditoria: any[] = [];

      for (const item of input.montos) {
        const montoRedondeado = Math.round(item.montoAgua * 100) / 100;
        const anterior = mapaAnteriores.get(item.idDepartamento);

        let montoGuardado: any;

        if (anterior) {
          montoGuardado = await tx.montoAgua.update({
            where: { idMonto: anterior.idMonto },
            data: {
              montoAgua: montoRedondeado,
              idUsuarioRegistro: input.idUsuario || null,
              fechaRegistro: new Date(),
            },
          });
        } else {
          montoGuardado = await tx.montoAgua.create({
            data: {
              idDepartamento: item.idDepartamento,
              periodo: periodoDate,
              montoAgua: montoRedondeado,
              idUsuarioRegistro: input.idUsuario || null,
            },
          });
        }

        mapaAnteriores.set(item.idDepartamento, montoGuardado);

        // Acumular auditoría en lote para insertar en 1 sola consulta
        eventosAuditoria.push({
          tablaAfectada: 'montos_agua',
          idRegistro: String(montoGuardado.idMonto),
          accion: 'REGISTRO_MONTO_AGUA',
          resultado: 'EXITO',
          datosAnteriores: anterior
            ? {
                idMonto: anterior.idMonto,
                idDepartamento: anterior.idDepartamento,
                periodo: periodoNormalizado,
                montoAgua: Number(anterior.montoAgua),
              }
            : undefined,
          datosNuevos: {
            idMonto: montoGuardado.idMonto,
            idDepartamento: montoGuardado.idDepartamento,
            periodo: periodoNormalizado,
            montoAgua: Number(montoGuardado.montoAgua),
          },
          idUsuario: input.idUsuario || null,
          fechaHora: new Date(),
        });

        const deptoInfo = deptosMap.get(item.idDepartamento);
        guardados.push({
          idMonto: montoGuardado.idMonto,
          idDepartamento: montoGuardado.idDepartamento,
          departamento: deptoInfo
            ? {
                numero: deptoInfo.numero,
                piso: deptoInfo.piso,
                tipo: deptoInfo.tipo
                  ? {
                      nombre: deptoInfo.tipo.nombre,
                      montoExpensa: Number(deptoInfo.tipo.montoExpensa),
                    }
                  : null,
              }
            : undefined,
          periodo: periodoNormalizado,
          montoAgua: Number(montoGuardado.montoAgua),
          idUsuarioRegistro: montoGuardado.idUsuarioRegistro,
          fechaRegistro: montoGuardado.fechaRegistro,
        });
      }

      // Guardar todos los eventos de auditoría en 1 solo insert SQL
      if (eventosAuditoria.length > 0) {
        await tx.auditoria.createMany({
          data: eventosAuditoria,
        });
      }

      return {
        periodo: periodoNormalizado,
        total: guardados.length,
        montos: guardados,
      };
    },
    { timeout: 60000, maxWait: 25000 }
  );
}

/**
 * Consulta montos de agua registrados con filtros opcionales por periodo e idDepartamento.
 */
export async function obtenerMontosAgua(
  filtros: FiltrosObtenerMontosAgua
): Promise<{ data: MontoAguaResponse[]; total: number }> {
  const where: any = {};

  if (filtros.periodo) {
    const { periodoDate } = normalizarPeriodo(filtros.periodo);
    where.periodo = periodoDate;
  }

  if (filtros.idDepartamento) {
    where.idDepartamento = Number(filtros.idDepartamento);
  }

  const [montos, total] = await Promise.all([
    prisma.montoAgua.findMany({
      where,
      include: {
        departamento: {
          select: {
            numero: true,
            piso: true,
            tipo: { select: { nombre: true, montoExpensa: true } },
          },
        },
        usuarioRegistro: {
          select: { idUsuario: true, nombreUsuario: true, correo: true },
        },
      },
      orderBy: [{ periodo: 'desc' }, { idDepartamento: 'asc' }],
    }),
    prisma.montoAgua.count({ where }),
  ]);

  const data: MontoAguaResponse[] = montos.map((m) => {
    const pDate = new Date(m.periodo);
    const pStr = pDate.toISOString().split('T')[0];
    return {
      idMonto: m.idMonto,
      idDepartamento: m.idDepartamento,
      departamento: m.departamento
        ? {
            numero: m.departamento.numero,
            piso: m.departamento.piso,
            tipo: m.departamento.tipo
              ? {
                  nombre: m.departamento.tipo.nombre,
                  montoExpensa: Number(m.departamento.tipo.montoExpensa),
                }
              : null,
          }
        : undefined,
      periodo: pStr,
      montoAgua: Number(m.montoAgua),
      idUsuarioRegistro: m.idUsuarioRegistro,
      usuarioRegistro: m.usuarioRegistro,
      fechaRegistro: m.fechaRegistro,
    };
  });

  return { data, total };
}
