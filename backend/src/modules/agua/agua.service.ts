// backend/src/modules/agua/agua.service.ts
// Lógica de negocio para registro y consulta de montos manuales de agua

import { prisma } from '@edificio-xyz/database';
import { auditoriaService } from '../auditoria';
import {
  RegistrarMontosAguaInput,
  FiltrosObtenerMontosAgua,
  MontoAguaResponse,
} from './agua.types';

import {
  calcularCapitalPendiente,
  determinarEstadoYSaldoExpensa,
} from '../expensas';

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
 * - Permite registrar agua antes o después de la emisión de expensas (cualquier orden).
 * - Si ya existe expensa para el período, la expensa se recalcula automáticamente.
 * - Si el nuevo monto total queda por debajo de lo ya pagado, responde 409 AGUA_MENOR_A_PAGADO.
 * - Transacción atómica (todo o nada).
 * - 400 si el monto es negativo o inválido.
 * - 422 si el departamento no existe.
 * - Auditoría REGISTRO_MONTO_AGUA por departamento y ACTUALIZACION_AGUA_EXPENSA por expensa.
 */
export async function registrarOActualizarMontosAgua(
  input: RegistrarMontosAguaInput
): Promise<{ periodo: string; total: number; montos: MontoAguaResponse[]; expensasActualizadas: number }> {
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
      // 2. Verificar existencia de todos los departamentos y traer sus tipos (1 consulta en lote)
      const deptosConTipo = await tx.departamento.findMany({
        where: { idDepartamento: { in: deptosIds } },
        select: {
          idDepartamento: true,
          numero: true,
          piso: true,
          tipo: { select: { nombre: true, montoExpensa: true } },
        },
      });
      const deptosExistentesSet = new Set(deptosConTipo.map((d) => d.idDepartamento));

      for (const idDepto of deptosIds) {
        if (!deptosExistentesSet.has(idDepto)) {
          const error: any = new Error(`El departamento con ID ${idDepto} no existe`);
          error.statusCode = 422;
          error.code = 'UNPROCESSABLE_ENTITY';
          throw error;
        }
      }
      const deptosMap = new Map(deptosConTipo.map((d) => [d.idDepartamento, d]));

      // 3. Lectura en lote de expensas existentes para el período con pagos vigentes y anticipos
      const expensasDelPeriodo = await tx.expensa.findMany({
        where: {
          idDepartamento: { in: deptosIds },
          periodo: periodoDate,
        },
        include: {
          pagos: {
            where: { anulado: false },
          },
          aplicacionesAnticipos: {
            include: { pago: true },
          },
          departamento: {
            select: {
              numero: true,
              tipo: { select: { nombre: true, montoExpensa: true } },
            },
          },
        },
      });
      const mapaExpensas = new Map(expensasDelPeriodo.map((e) => [e.idDepartamento, e]));

      // 4. Lectura en lote de registros previos de agua en montos_agua
      const anteriores = await tx.montoAgua.findMany({
        where: {
          idDepartamento: { in: deptosIds },
          periodo: periodoDate,
        },
      });
      const mapaAnteriores = new Map(anteriores.map((a) => [a.idDepartamento, a]));

      // Determinar el último monto de agua por departamento en caso de duplicados en el lote
      const ultimoMontoAguaPorDepto = new Map<number, number>();
      for (const item of input.montos) {
        const montoRedondeado = Math.round(item.montoAgua * 100) / 100;
        ultimoMontoAguaPorDepto.set(item.idDepartamento, montoRedondeado);
      }

      // Comprobar si alguna expensa vencida con mora y tasa 0 requiere la regla activa (máx 1 consulta findFirst)
      const ahora = new Date();
      let requiereReglaMora = false;
      for (const [idDepto, nuevoAgua] of ultimoMontoAguaPorDepto.entries()) {
        const exp = mapaExpensas.get(idDepto);
        if (!exp) continue;
        const aguaActualExp = Number(exp.montoAgua || 0);
        const montoActualExp = Number(exp.monto);
        const mBaseExp = Number(
          exp.montoBase !== null && exp.montoBase !== undefined
            ? exp.montoBase
            : (montoActualExp - aguaActualExp > 0
                ? Math.round((montoActualExp - aguaActualExp) * 100) / 100
                : montoActualExp)
        );
        const montoTotalCalculado = Math.round((mBaseExp + nuevoAgua) * 100) / 100;
        const requiereRecalculo = nuevoAgua !== aguaActualExp || montoActualExp !== montoTotalCalculado;

        if (
          requiereRecalculo &&
          Number(exp.tasaInteresMora || 0) === 0 &&
          Number(exp.montoMora || 0) > 0 &&
          new Date(exp.fechaVencimiento) < ahora
        ) {
          requiereReglaMora = true;
          break;
        }
      }

      let reglaMoraActiva: any = null;
      if (requiereReglaMora) {
        reglaMoraActiva = await tx.reglaMora.findFirst({
          where: { activa: true },
          orderBy: { fechaCreacion: 'desc' },
        });
      }

      // 5. VALIDACIONES PREVIAS Y PLANIFICACIÓN DE RECÁLCULO EN MEMORIA (antes de cualquier escritura)
      interface ExpensaUpdatePlan {
        idExpensa: number;
        idDepartamento: number;
        montoBase: number;
        nuevoMontoAgua: number;
        nuevoMontoTotal: number;
        capitalPendiente: number;
        nuevoMontoMora: number;
        nuevoSaldo: number;
        nuevoEstado: 'Pagado' | 'Parcial' | 'Moroso' | 'Pendiente';
        datosAnteriores: {
          idExpensa: number;
          montoAgua: number;
          monto: number;
          saldoPendiente: number;
          montoMora: number;
          estado: string;
        };
        datosNuevos: {
          idExpensa: number;
          montoAgua: number;
          monto: number;
          saldoPendiente: number;
          montoMora: number;
          estado: string;
        };
      }

      const planesExpensas: ExpensaUpdatePlan[] = [];

      for (const [idDepto, nuevoAgua] of ultimoMontoAguaPorDepto.entries()) {
        const expensa = mapaExpensas.get(idDepto);
        if (!expensa) continue;

        // Si existe un estado de expensa anulada/cancelada, no la tocar y reportar
        if (['anulada', 'cancelada'].includes(String(expensa.estado || '').toLowerCase())) {
          console.warn(`[registrarOActualizarMontosAgua] Expensa ${expensa.idExpensa} en estado '${expensa.estado}' omitida de recálculo.`);
          continue;
        }

        const aguaActualExpensa = Number(expensa.montoAgua || 0);

        // Derivar montoBase si es null en una expensa antigua
        const montoActual = Number(expensa.monto);
        const montoBase = Number(
          expensa.montoBase !== null && expensa.montoBase !== undefined
            ? expensa.montoBase
            : (montoActual - aguaActualExpensa > 0
                ? Math.round((montoActual - aguaActualExpensa) * 100) / 100
                : montoActual)
        );

        const nuevoMontoTotal = Math.round((montoBase + nuevoAgua) * 100) / 100;

        // Si el agua no cambia y además el monto ya cuadra perfectamente con montoBase + nuevoAgua, no la toques ni audites (idempotente)
        if (nuevoAgua === aguaActualExpensa && montoActual === nuevoMontoTotal) {
          continue;
        }

        // Pagos directos vigentes y anticipos aplicados vigentes
        const pagosValidos = (expensa.pagos || []).filter((p) => !p.anulado);
        const totalPagos = pagosValidos.reduce((acc, p) => acc + Number(p.montoPagado || 0), 0);
        const anticValidos = (expensa.aplicacionesAnticipos || []).filter((a) => !a.pago || !a.pago.anulado);
        const totalAntic = anticValidos.reduce((acc, a) => acc + Number(a.monto || 0), 0);
        const totalPagado = Math.round((totalPagos + totalAntic) * 100) / 100;

        // Validación: nuevo monto no puede quedar por debajo de lo ya pagado
        if (nuevoMontoTotal < totalPagado) {
          const numDepto = expensa.departamento?.numero || deptosMap.get(idDepto)?.numero || idDepto;
          const error: any = new Error(
            `El nuevo monto total de expensa (Bs. ${nuevoMontoTotal.toFixed(2)}) para el departamento ${numDepto} queda por debajo de lo ya pagado (Bs. ${totalPagado.toFixed(2)}) en el período ${periodoNormalizado}`
          );
          error.statusCode = 409;
          error.code = 'AGUA_MENOR_A_PAGADO';
          throw error;
        }

        // Recalcular capital pendiente con la función oficial calcularCapitalPendiente
        const capitalPendiente = calcularCapitalPendiente({
          monto: nuevoMontoTotal,
          pagos: expensa.pagos,
          aplicacionesAnticipos: expensa.aplicacionesAnticipos,
        });

        // Mora: si tasaInteresMora > 0, usa esa tasa. Si es 0 y vencida con mora > 0, usa regla activa. Si no, montoMora = 0. Nunca borres una mora existente sin recalcularla.
        const tasaExpensa = Number(expensa.tasaInteresMora || 0);
        const moraPrevia = Number(expensa.montoMora || 0);
        const estaVencida = new Date(expensa.fechaVencimiento) < ahora;

        let nuevoMontoMora = 0;
        if (estaVencida || moraPrevia > 0) {
          if (tasaExpensa > 0) {
            nuevoMontoMora = Math.round((capitalPendiente * (tasaExpensa / 100)) * 100) / 100;
          } else if (moraPrevia > 0) {
            const tasaRegla = reglaMoraActiva ? Number(reglaMoraActiva.tasaInteres) : 0;
            if (tasaRegla > 0) {
              nuevoMontoMora = Math.round((capitalPendiente * (tasaRegla / 100)) * 100) / 100;
            } else {
              nuevoMontoMora = moraPrevia;
            }
          }
        }

        // Determinar nuevo saldo y estado
        const { saldoPendiente: nuevoSaldo, estado: nuevoEstado } = determinarEstadoYSaldoExpensa({
          montoTotal: nuevoMontoTotal,
          capitalPendiente,
          montoMora: nuevoMontoMora,
          fechaVencimiento: expensa.fechaVencimiento,
          fechaReferencia: ahora,
        });

        planesExpensas.push({
          idExpensa: expensa.idExpensa,
          idDepartamento: idDepto,
          montoBase,
          nuevoMontoAgua: nuevoAgua,
          nuevoMontoTotal,
          capitalPendiente,
          nuevoMontoMora,
          nuevoSaldo,
          nuevoEstado,
          datosAnteriores: {
            idExpensa: expensa.idExpensa,
            montoAgua: Number(expensa.montoAgua || 0),
            monto: Number(expensa.monto),
            saldoPendiente: Number(expensa.saldoPendiente),
            montoMora: Number(expensa.montoMora || 0),
            estado: String(expensa.estado),
          },
          datosNuevos: {
            idExpensa: expensa.idExpensa,
            montoAgua: nuevoAgua,
            monto: nuevoMontoTotal,
            saldoPendiente: nuevoSaldo,
            montoMora: nuevoMontoMora,
            estado: nuevoEstado,
          },
        });
      }

      // 6. ESCRITURAS DE MONTOS DE AGUA
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

        // Auditoría REGISTRO_MONTO_AGUA por cada registro en montos_agua
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

      // 7. ACTUALIZACIÓN DE EXPENSAS EMITIDAS (UNA vez por expensa, con el último monto)
      let expensasActualizadas = 0;
      for (const plan of planesExpensas) {
        await tx.expensa.update({
          where: { idExpensa: plan.idExpensa },
          data: {
            montoBase: plan.montoBase,
            montoAgua: plan.nuevoMontoAgua,
            monto: plan.nuevoMontoTotal,
            saldoPendiente: plan.nuevoSaldo,
            montoMora: plan.nuevoMontoMora,
            estado: plan.nuevoEstado,
          },
        });

        eventosAuditoria.push({
          tablaAfectada: 'expensas',
          idRegistro: String(plan.idExpensa),
          accion: 'ACTUALIZACION_AGUA_EXPENSA',
          resultado: 'EXITO',
          datosAnteriores: plan.datosAnteriores,
          datosNuevos: plan.datosNuevos,
          idUsuario: input.idUsuario || null,
          fechaHora: new Date(),
        });

        expensasActualizadas++;
      }

      // 8. GUARDADO EN LOTE DE TODA LA AUDITORÍA
      if (eventosAuditoria.length > 0) {
        await tx.auditoria.createMany({
          data: eventosAuditoria,
        });
      }

      return {
        periodo: periodoNormalizado,
        total: guardados.length,
        montos: guardados,
        expensasActualizadas,
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
