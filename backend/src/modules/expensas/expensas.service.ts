// backend/src/modules/expensas/expensas.service.ts
// Servicio centralizado de cálculo financiero y gestión de expensas

import { Prisma, prisma } from '@edificio-xyz/database';
import { auditoriaService } from '../auditoria';
import { FINANZAS_TX_OPTIONS } from '../../middlewares/finanzas-permissions.middleware';

export interface ExpensaConPagosYAnticipos {
  monto: number | string | Prisma.Decimal;
  pagos: Array<{
    montoPagado: number | string | Prisma.Decimal;
    anulado?: boolean | null;
    esAnticipado?: boolean | null;
  }>;
  aplicacionesAnticipos: Array<{
    monto: number | string | Prisma.Decimal;
    pago?: { anulado?: boolean | null } | null;
  }>;
}

/**
 * Función centralizada y reutilizable para calcular el capital pendiente de una expensa:
 * Capital Pendiente = Monto Base - Pagos Directos Válidos - Anticipos Aplicados Válidos.
 * 
 * - Exige estrictamente que las relaciones 'pagos' y 'aplicacionesAnticipos' existan (lanza error si son undefined)
 * - Usa únicamente el identificador oficial de Prisma: 'aplicacionesAnticipos'
 * - Excluye pagos directos con anulado === true
 * - Excluye aplicaciones de anticipos cuyo pago origen fue anulado
 * - Garantiza redondeo estricto a 2 decimales
 * - No permite valores negativos (límite inferior en 0.00)
 */
export function calcularCapitalPendiente(expensa: ExpensaConPagosYAnticipos): number {
  if (!expensa) {
    throw new Error('calcularCapitalPendiente: el objeto expensa no puede ser nulo o indefinido');
  }

  if (expensa.pagos === undefined || expensa.pagos === null) {
    throw new Error('calcularCapitalPendiente: la relación "pagos" es requerida y no puede ser undefined ni null');
  }

  if (expensa.aplicacionesAnticipos === undefined || expensa.aplicacionesAnticipos === null) {
    throw new Error(
      'calcularCapitalPendiente: la relación "aplicacionesAnticipos" es requerida y no puede ser undefined ni null'
    );
  }

  const montoBase = Number(expensa.monto || 0);

  // 1. Sumar pagos directos vigentes
  const pagosValidos = expensa.pagos.filter((p) => !p.anulado);
  const totalPagosDirectos = pagosValidos.reduce(
    (acc, p) => acc + Number(p.montoPagado || 0),
    0
  );

  // 2. Sumar anticipos aplicados vigentes usando únicamente el nombre del schema ("aplicacionesAnticipos")
  const aplicacionesValidas = expensa.aplicacionesAnticipos.filter(
    (a) => !a.pago || !a.pago.anulado
  );
  const totalAnticiposAplicados = aplicacionesValidas.reduce(
    (acc, a) => acc + Number(a.monto || 0),
    0
  );

  // 3. Capital pendiente con precisión financiera a 2 decimales
  const capital = Math.max(0, montoBase - totalPagosDirectos - totalAnticiposAplicados);
  return Math.round(capital * 100) / 100;
}

export interface DeterminarEstadoYSaldoParams {
  montoTotal: number;
  capitalPendiente: number;
  montoMora: number;
  fechaVencimiento: Date | string;
  fechaReferencia?: Date;
}

/**
 * Función pura centralizada para determinar el saldo y estado de una expensa.
 * Replica exactamente la lógica de saldo y estado de recalcularSaldoExpensa:
 * - saldo = max(0, round(capitalPendiente + montoMora, 2))
 * - Si saldo === 0 -> 'Pagado'
 * - Else if capitalPendiente < montoTotal -> 'Parcial'
 * - Else if montoMora > 0 || fechaVencimiento < ahora -> 'Moroso'
 * - Else -> 'Pendiente'
 */
export function determinarEstadoYSaldoExpensa(params: DeterminarEstadoYSaldoParams): {
  saldoPendiente: number;
  estado: 'Pagado' | 'Parcial' | 'Moroso' | 'Pendiente';
} {
  const capital = Math.max(0, Math.round(params.capitalPendiente * 100) / 100);
  const mora = Math.max(0, Math.round(params.montoMora * 100) / 100);
  const nuevoSaldo = Math.max(0, Math.round((capital + mora) * 100) / 100);
  const fVenc = new Date(params.fechaVencimiento);
  const ahora = params.fechaReferencia || new Date();

  let nuevoEstado: 'Pagado' | 'Parcial' | 'Moroso' | 'Pendiente' = 'Pendiente';
  if (nuevoSaldo === 0) {
    nuevoEstado = 'Pagado';
  } else if (capital < Number(params.montoTotal)) {
    nuevoEstado = 'Parcial';
  } else if (mora > 0 || fVenc < ahora) {
    nuevoEstado = 'Moroso';
  } else {
    nuevoEstado = 'Pendiente';
  }

  return { saldoPendiente: nuevoSaldo, estado: nuevoEstado };
}

export interface ConfigurarReglaMoraInput {
  tipoCalculo?: 'PORCENTAJE' | 'FIJO';
  tasaInteres?: number;
  montoFijo?: number | null;
  diaVencimiento?: number | null;
  diaGeneracion?: number | null;
  diasGracia?: number;
  idUsuario?: number | null;
}

/**
 * Calcula la fecha de vencimiento para un período dado según el diaVencimiento configurado.
 * Aplica como tope el último día real del mes (ej. 28/29 en feb, 30 en abr/jun/sep/nov).
 * Si no hay diaVencimiento configurado, utiliza el fallback proporcionado o el día 10 del mes.
 */
export function calcularFechaVencimientoPeriodo(
  periodo: string | Date,
  diaVencimiento?: number | null,
  fechaVencimientoFallback?: string | Date | null
): Date {
  if (diaVencimiento !== undefined && diaVencimiento !== null && diaVencimiento >= 1 && diaVencimiento <= 31) {
    let pYear: string;
    let pMonth: string;
    if (typeof periodo === 'string') {
      const parts = periodo.split('-');
      pYear = parts[0];
      pMonth = parts[1];
    } else {
      pYear = String(periodo.getUTCFullYear());
      pMonth = String(periodo.getUTCMonth() + 1).padStart(2, '0');
    }
    const y = parseInt(pYear, 10);
    const m = parseInt(pMonth, 10);
    const ultimoDiaMes = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const diaFinal = Math.min(Number(diaVencimiento), ultimoDiaMes);
    const diaStr = String(diaFinal).padStart(2, '0');
    return new Date(`${pYear}-${pMonth}-${diaStr}T00:00:00.000Z`);
  }

  if (fechaVencimientoFallback) {
    if (typeof fechaVencimientoFallback === 'string') {
      const fStr = fechaVencimientoFallback.includes('T')
        ? fechaVencimientoFallback
        : `${fechaVencimientoFallback}T00:00:00.000Z`;
      return new Date(fStr);
    }
    return fechaVencimientoFallback;
  }

  // Comportamiento por defecto sin regla ni fecha explícita: día 10 del mes
  let pYear: string;
  let pMonth: string;
  if (typeof periodo === 'string') {
    const parts = periodo.split('-');
    pYear = parts[0];
    pMonth = parts[1];
  } else {
    pYear = String(periodo.getUTCFullYear());
    pMonth = String(periodo.getUTCMonth() + 1).padStart(2, '0');
  }
  return new Date(`${pYear}-${pMonth}-10T00:00:00.000Z`);
}

/**
 * Formatea una regla de mora para respuesta consistente tanto en camelCase como snake_case.
 */
export function formatearReglaMora(regla: any) {
  if (!regla) return null;
  const tasaInteres = Number(regla.tasaInteres || 0);
  const montoFijo =
    regla.montoFijo !== null && regla.montoFijo !== undefined ? Number(regla.montoFijo) : null;
  const diaVencimiento =
    regla.diaVencimiento !== null && regla.diaVencimiento !== undefined
      ? Number(regla.diaVencimiento)
      : null;
  const diaGeneracion =
    regla.diaGeneracion !== null && regla.diaGeneracion !== undefined
      ? Number(regla.diaGeneracion)
      : null;
  const tipoCalculo = regla.tipoCalculo || 'PORCENTAJE';

  return {
    ...regla,
    tipoCalculo,
    tipo_calculo: tipoCalculo,
    tasaInteres,
    tasa_interes: tasaInteres,
    montoFijo,
    monto_fijo: montoFijo,
    diaVencimiento,
    dia_vencimiento: diaVencimiento,
    diaGeneracion,
    dia_generacion: diaGeneracion,
    diasGracia: Number(regla.diasGracia || 0),
    dias_gracia: Number(regla.diasGracia || 0),
  };
}

/**
 * Configurar una nueva regla de mora activa (CA09).
 * Desactiva la regla previa de forma atómica en transacción y audita el cambio.
 */
export async function configurarReglaMora(input: ConfigurarReglaMoraInput) {
  // Regla: POST reglas-mora acepta pero ignora diasGracia y devuelve 0 (no tocar diasGracia)
  const diasGracia = 0;

  return await prisma.$transaction(async (tx) => {
    // 1. Obtener la regla activa anterior
    const reglaAnterior = await tx.reglaMora.findFirst({
      where: { activa: true },
      orderBy: { fechaCreacion: 'desc' },
    });

    // 2. Desactivar cualquier regla activa previa
    await tx.reglaMora.updateMany({
      where: { activa: true },
      data: { activa: false },
    });

    const tipoCalculo = input.tipoCalculo || 'PORCENTAJE';
    const montoFijo =
      input.montoFijo !== undefined && input.montoFijo !== null ? input.montoFijo : null;
    const diaVencimiento =
      input.diaVencimiento !== undefined && input.diaVencimiento !== null
        ? input.diaVencimiento
        : null;
    const diaGeneracion =
      input.diaGeneracion !== undefined && input.diaGeneracion !== null
        ? input.diaGeneracion
        : null;
    const tasaInteres =
      input.tasaInteres !== undefined && input.tasaInteres !== null ? input.tasaInteres : 0;

    // 3. Crear la nueva regla de mora activa
    const nuevaRegla = await tx.reglaMora.create({
      data: {
        tipoCalculo,
        montoFijo,
        diaVencimiento,
        diaGeneracion,
        tasaInteres,
        diasGracia: 0,
        activa: true,
        idUsuarioCreacion: input.idUsuario || null,
      },
      include: {
        usuarioCreacion: {
          select: { idUsuario: true, nombreUsuario: true, correo: true },
        },
      },
    });

    // 4. Registrar auditoría CONFIGURAR_REGLA_MORA (CA09)
    await auditoriaService.registrarEvento({
      tablaAfectada: 'reglas_mora',
      idRegistro: String(nuevaRegla.idRegla),
      accion: 'CONFIGURAR_REGLA_MORA',
      resultado: 'EXITO',
      datosAnteriores: reglaAnterior
        ? {
            idRegla: reglaAnterior.idRegla,
            tipoCalculo: (reglaAnterior as any).tipoCalculo ?? 'PORCENTAJE',
            tasaInteres: Number(reglaAnterior.tasaInteres),
            montoFijo:
              (reglaAnterior as any).montoFijo !== null && (reglaAnterior as any).montoFijo !== undefined
                ? Number((reglaAnterior as any).montoFijo)
                : null,
            diaVencimiento: (reglaAnterior as any).diaVencimiento ?? null,
            diaGeneracion: (reglaAnterior as any).diaGeneracion ?? null,
            diasGracia: reglaAnterior.diasGracia,
            activa: reglaAnterior.activa,
          }
        : null,
      datosNuevos: {
        idRegla: nuevaRegla.idRegla,
        tipoCalculo: nuevaRegla.tipoCalculo,
        tasaInteres: Number(nuevaRegla.tasaInteres),
        montoFijo: nuevaRegla.montoFijo !== null ? Number(nuevaRegla.montoFijo) : null,
        diaVencimiento: nuevaRegla.diaVencimiento,
        diaGeneracion: nuevaRegla.diaGeneracion,
        diasGracia: nuevaRegla.diasGracia,
        activa: nuevaRegla.activa,
      },
      idUsuario: input.idUsuario || null,
      tx,
    });

    return formatearReglaMora(nuevaRegla);
  }, FINANZAS_TX_OPTIONS);
}

/**
 * Obtener la regla de mora activa actual y el historial completo ordenado.
 */
export async function obtenerReglasMora() {
  const [activa, historial] = await Promise.all([
    prisma.reglaMora.findFirst({
      where: { activa: true },
      include: {
        usuarioCreacion: {
          select: { idUsuario: true, nombreUsuario: true, correo: true },
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    }),
    prisma.reglaMora.findMany({
      orderBy: { fechaCreacion: 'desc' },
      include: {
        usuarioCreacion: {
          select: { idUsuario: true, nombreUsuario: true, correo: true },
        },
      },
    }),
  ]);

  return {
    activa: formatearReglaMora(activa),
    historial: historial.map(formatearReglaMora),
  };
}

export interface EjecutarCalculoMoraParams {
  idUsuario?: number | null;
  origen?: 'MANUAL' | 'SISTEMA_CRON';
  fechaReferencia?: Date;
  idDepartamentos?: number[];
}

export interface CalculoMoraResultado {
  actualizadasCount: number;
  mensaje: string;
}

/**
 * Servicio unificado de cálculo de recargos por mora (CA06, CA09, CA10).
 * Es consumido idénticamente por:
 * 1) Endpoint HTTP manual: POST /api/v1/expensas/calcular-mora
 * 2) Job programado Cron: node-cron (MORA_CRON)
 * 
 * Reglas de negocio:
 * - Tasa: expensa.tasaInteresMora si > 0; sino la regla activa del sistema.
 * - Si no hay tasa en la expensa ni regla activa -> error claro (sin fallback a 5).
 * - Días de gracia: si hoy <= fechaVencimiento + diasGracia -> no aplica mora.
 * - Capital sobre el que aplica mora = calcularCapitalPendiente (descuenta pagos y anticipos).
 * - Operación atómica en $transaction con registro de auditoría.
 */
export async function ejecutarCalculoMora(
  params: EjecutarCalculoMoraParams = {}
): Promise<CalculoMoraResultado> {
  const ahora = params.fechaReferencia || new Date();
  const esCron = params.origen === 'SISTEMA_CRON';
  const idUsuarioAuditoria = esCron ? null : (params.idUsuario || null);

  return await prisma.$transaction(async (tx) => {
    // 1. Obtener regla de mora activa
    const reglaActiva = await tx.reglaMora.findFirst({
      where: { activa: true },
      orderBy: { fechaCreacion: 'desc' },
    });

    // 2. Buscar expensas vencidas con saldo pendiente > 0 que no estén ya pagadas (con filtro opcional de departamentos)
    const whereClause: any = {
      fechaVencimiento: { lt: ahora },
      saldoPendiente: { gt: 0 },
      estado: { not: 'Pagado' },
    };
    if (params.idDepartamentos && params.idDepartamentos.length > 0) {
      whereClause.idDepartamento = { in: params.idDepartamentos };
    }

    const expensasCandidatas = await tx.expensa.findMany({
      where: whereClause,
      include: {
        pagos: {
          where: { anulado: false },
        },
        aplicacionesAnticipos: {
          include: { pago: true },
        },
      },
    });

    let count = 0;
    const detallesExpensas: Array<{
      idExpensa: number;
      moraAnterior: number;
      moraNueva: number;
      saldoAnterior: number;
      saldoNuevo: number;
    }> = [];

    for (const exp of expensasCandidatas) {
      // Regla de mora: sin días de espera (vencida si hoy > fechaVencimiento)
      const fechaVenc = new Date(exp.fechaVencimiento);
      if (ahora.getTime() <= fechaVenc.getTime()) {
        continue;
      }

      const capitalPendiente = calcularCapitalPendiente(exp);
      if (capitalPendiente <= 0) {
        continue;
      }

      let montoMora: number;
      const tipoCalculo = (reglaActiva as any)?.tipoCalculo || 'PORCENTAJE';

      if (tipoCalculo === 'FIJO') {
        const montoFijo = Number((reglaActiva as any)?.montoFijo || 0);
        if (montoFijo <= 0) {
          const error: any = new Error(
            `No existe un monto fijo válido configurado en la regla de mora activa para la expensa ${exp.idExpensa}.`
          );
          error.statusCode = 400;
          error.code = 'REGLA_MORA_NO_CONFIGURADA';
          throw error;
        }
        // FIJO = monto_fijo una sola vez por cargo vencido con capital pendiente > 0 (saldo = capital + monto_fijo), sin acumular entre ejecuciones
        montoMora = Math.round(montoFijo * 100) / 100;
      } else {
        // Regla de tasa: tasa = tasaInteresMora de la expensa si > 0; si no, la regla activa
        const tasaExpensa = Number(exp.tasaInteresMora);
        let tasaFinal: number;

        if (tasaExpensa > 0) {
          tasaFinal = tasaExpensa;
        } else if (reglaActiva && Number(reglaActiva.tasaInteres) >= 0) {
          tasaFinal = Number(reglaActiva.tasaInteres);
        } else {
          const error: any = new Error(
            `No existe una regla de mora activa configurada ni tasa en la expensa ${exp.idExpensa} para calcular la mora.`
          );
          error.statusCode = 400;
          error.code = 'REGLA_MORA_NO_CONFIGURADA';
          throw error;
        }

        montoMora = Math.round((capitalPendiente * (tasaFinal / 100)) * 100) / 100;
      }

      const nuevoSaldo = Math.max(0, Math.round((capitalPendiente + montoMora) * 100) / 100);
      const nuevoEstado = (nuevoSaldo > 0 && exp.fechaVencimiento < ahora)
        ? 'Moroso'
        : (nuevoSaldo === 0 ? 'Pagado' : 'Pendiente');

      const moraAnterior = Number(exp.montoMora);
      const saldoAnterior = Number(exp.saldoPendiente);

      await tx.expensa.update({
        where: { idExpensa: exp.idExpensa },
        data: {
          montoMora,
          saldoPendiente: nuevoSaldo,
          estado: nuevoEstado,
        },
      });

      detallesExpensas.push({
        idExpensa: exp.idExpensa,
        moraAnterior,
        moraNueva: montoMora,
        saldoAnterior,
        saldoNuevo: nuevoSaldo,
      });

      count++;
    }

    const MAX_AUDITORIA_EXPENSAS = 200;
    const truncado = detallesExpensas.length > MAX_AUDITORIA_EXPENSAS;
    const expensasGuardadas = detallesExpensas.slice(0, MAX_AUDITORIA_EXPENSAS);

    // 3. Auditoría formal del recálculo de mora
    await auditoriaService.registrarEvento({
      tablaAfectada: 'expensas',
      idRegistro: `MORA-${ahora.toISOString().split('T')[0]}`,
      accion: 'CALCULO_MORA_EXPENSAS',
      resultado: 'EXITO',
      datosNuevos: {
        actualizadasCount: count,
        fechaEjecucion: ahora.toISOString(),
        origen: esCron ? 'SISTEMA_CRON' : 'MANUAL',
        ejecutadoPor: esCron ? 'sistema' : (params.idUsuario ? `usuario:${params.idUsuario}` : 'sistema'),
        diasGraciaAplicados: 0,
        tipoCalculo: (reglaActiva as any)?.tipoCalculo || 'PORCENTAJE',
        montoFijoUsado:
          (reglaActiva as any)?.montoFijo !== null && (reglaActiva as any)?.montoFijo !== undefined
            ? Number((reglaActiva as any).montoFijo)
            : null,
        tasaGeneralUsada: reglaActiva ? Number(reglaActiva.tasaInteres) : null,
        expensas: expensasGuardadas,
        ...(truncado ? { truncado: true } : {}),
      },
      idUsuario: idUsuarioAuditoria,
      tx,
    });

    return {
      actualizadasCount: count,
      mensaje: `Se aplicó el recargo de mora a ${count} expensas vencidas`,
    };
  }, { timeout: 120000, maxWait: 30000 });
}

/**
 * Formatea una expensa para respuesta de API y estado de cuenta, agregando:
 * - montoBase (numérico)
 * - montoAgua (numérico)
 * - monto (numérico total)
 * - concepto ("Expensa mensual Tipo B" y "Agua" si aplica, sin m3)
 */
export function formatearExpensaConConcepto(
  expensa: any,
  tipoNombre?: string | null
): any {
  const monto = Number(expensa.monto);
  const montoAgua = Number(expensa.montoAgua || 0);
  const montoBase = Number(
    expensa.montoBase !== null && expensa.montoBase !== undefined
      ? expensa.montoBase
      : (monto - montoAgua > 0 ? Math.round((monto - montoAgua) * 100) / 100 : monto)
  );

  // Tipo de departamento para el concepto
  const tipo = tipoNombre || expensa.departamento?.tipo?.nombre;
  let conceptoBase = 'Expensa mensual';
  if (tipo) {
    const limpio = String(tipo).trim();
    if (limpio.toLowerCase().startsWith('tipo')) {
      conceptoBase = `Expensa mensual ${limpio}`;
    } else {
      conceptoBase = `Expensa mensual Tipo ${limpio}`;
    }
  }

  // Agua si aplica (sin m3)
  let concepto = conceptoBase;
  if (montoAgua > 0) {
    concepto = `${conceptoBase} y Agua`;
  }

  return {
    ...expensa,
    montoBase,
    montoAgua,
    monto,
    saldoPendiente: Number(expensa.saldoPendiente),
    montoMora: Number(expensa.montoMora || 0),
    tasaInteresMora: Number(expensa.tasaInteresMora || 0),
    concepto,
  };
}

