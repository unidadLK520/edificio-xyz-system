// backend/src/modules/expensas/expensas.service.ts
// Servicio centralizado de cálculo financiero y gestión de expensas

import { Prisma, prisma } from '@edificio-xyz/database';
import { auditoriaService } from '../auditoria';
import { FINANZAS_TX_OPTIONS } from '../../middlewares/finanzas-permissions.middleware';

/**
 * Convierte una fecha (Date o string) a formato YYYY-MM-DD en la zona horaria America/La_Paz.
 * Trata las fechas Date con medianoche UTC (como @db.Date de Prisma) conservando su fecha calendario.
 */
export function fechaYMDLaPaz(fecha: string | Date): string {
  if (typeof fecha === 'string') {
    const trimmed = fecha.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) {
      throw new Error(`Fecha inválida: ${fecha}`);
    }
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  }
  if (fecha instanceof Date) {
    if (isNaN(fecha.getTime())) {
      throw new Error('Fecha inválida');
    }
    if (
      fecha.getUTCHours() === 0 &&
      fecha.getUTCMinutes() === 0 &&
      fecha.getUTCSeconds() === 0 &&
      fecha.getUTCMilliseconds() === 0
    ) {
      const y = fecha.getUTCFullYear();
      const m = String(fecha.getUTCMonth() + 1).padStart(2, '0');
      const d = String(fecha.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(fecha);
  }
  throw new Error('Tipo de fecha no soportado');
}

/**
 * Calcula la diferencia en días calendario enteros entre fechaVencimiento y fechaReferencia en America/La_Paz.
 * Resultado > 0: vencida (días de atraso).
 * Resultado <= 0: al día o antes del vencimiento.
 */
export function diferenciaDiasLaPaz(fechaVencimiento: string | Date, fechaReferencia: string | Date): number {
  const fVencStr = fechaYMDLaPaz(fechaVencimiento);
  const fRefStr = fechaYMDLaPaz(fechaReferencia);
  const [y1, m1, d1] = fVencStr.split('-').map(Number);
  const [y2, m2, d2] = fRefStr.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

export interface ReglaMoraCalculo {
  tipoCalculo?: 'PORCENTAJE' | 'FIJO' | string;
  tasaInteres?: number | Prisma.Decimal | null;
  montoFijo?: number | Prisma.Decimal | null;
  diaVencimiento?: number | null;
  diaGeneracion?: number | null;
  tasaInteresMora?: number | Prisma.Decimal | null;
}

export interface CronogramaItem {
  mes: number;
  desdeDia: number;
  hastaDia: number;
  moraDelMes: number;
  moraAcumulada: number;
  totalDeuda: number;
  estado: 'SinMora' | 'Devengado' | 'Proyeccion';
}

export interface ResultadoCalculoMoraExpensa {
  diasAtraso: number;
  mesesMora: number;
  moraPorMes: number;
  moraAcumulada: number;
  totalAdeudado: number;
  cronograma: CronogramaItem[];
}

export interface CalcularMoraExpensaParams {
  capitalPendiente: number;
  fechaVencimiento: string | Date;
  fechaReferencia?: string | Date;
  regla: ReglaMoraCalculo;
  tasaInteresMora?: number;
  meses?: number;
}

/**
 * Función pura para calcular la mora mensual acumulativa simple, sin período de gracia.
 * 
 * Reglas de negocio:
 * - diasAtraso = días entre fechaVencimiento y la fecha de referencia (America/La_Paz).
 * - mesesMora = diasAtraso <= 0 ? 0 : Math.ceil(diasAtraso / 30).
 * - moraPorMes = FIJO ? montoFijo : round(capitalPendiente * tasaInteres / 100, 2).
 *   (Si regla es PORCENTAJE y la expensa tiene tasaInteresMora > 0, se respeta la tasa de la expensa).
 * - moraAcumulada = mesesMora * moraPorMes.
 * - totalAdeudado = capitalPendiente + moraAcumulada.
 * - Siempre se recalcula desde el capital (idempotente). Si capitalPendiente <= 0, no aplica mora.
 * - Cronograma proyectado de 0 a `meses` (default 6, máx 24).
 */
export function calcularMoraExpensa(params: CalcularMoraExpensaParams): ResultadoCalculoMoraExpensa {
  const { capitalPendiente, fechaVencimiento, fechaReferencia, regla, tasaInteresMora, meses } = params;

  const fRef = fechaReferencia || new Date();
  const diasAtraso = diferenciaDiasLaPaz(fechaVencimiento, fRef);
  const mesesMora = diasAtraso <= 0 ? 0 : Math.ceil(diasAtraso / 30);

  const capital = Math.max(0, Math.round(Number(capitalPendiente || 0) * 100) / 100);
  const esFijo = String(regla?.tipoCalculo || '').toUpperCase() === 'FIJO';

  let moraPorMes = 0;
  if (capital > 0) {
    if (esFijo) {
      moraPorMes = Math.round(Number(regla?.montoFijo || 0) * 100) / 100;
    } else {
      let tasa = 0;
      if (tasaInteresMora !== undefined && Number(tasaInteresMora) > 0) {
        tasa = Number(tasaInteresMora);
      } else if ((regla as any)?.tasaInteresMora !== undefined && Number((regla as any).tasaInteresMora) > 0) {
        tasa = Number((regla as any).tasaInteresMora);
      } else {
        tasa = Number(regla?.tasaInteres || 0);
      }
      moraPorMes = Math.round(((capital * tasa) / 100) * 100) / 100;
    }
  }

  const moraAcumulada = capital <= 0 ? 0 : Math.round(mesesMora * moraPorMes * 100) / 100;
  const totalAdeudado = Math.round((capital + moraAcumulada) * 100) / 100;

  const limiteMeses = Math.min(24, Math.max(0, typeof meses === 'number' ? meses : 6));
  const cronograma: CronogramaItem[] = [];

  // Mes 0: situación al momento del vencimiento o sin retraso
  cronograma.push({
    mes: 0,
    desdeDia: 0,
    hastaDia: 0,
    moraDelMes: 0,
    moraAcumulada: 0,
    totalDeuda: capital,
    estado: 'SinMora',
  });

  for (let i = 1; i <= limiteMeses; i++) {
    const moraMes = capital <= 0 ? 0 : moraPorMes;
    const moraAcum = capital <= 0 ? 0 : Math.round(i * moraPorMes * 100) / 100;
    const totalD = capital <= 0 ? 0 : Math.round((capital + moraAcum) * 100) / 100;

    cronograma.push({
      mes: i,
      desdeDia: (i - 1) * 30 + 1,
      hastaDia: i * 30,
      moraDelMes: moraMes,
      moraAcumulada: moraAcum,
      totalDeuda: totalD,
      estado: capital <= 0 ? 'SinMora' : (i <= mesesMora ? 'Devengado' : 'Proyeccion'),
    });
  }

  return {
    diasAtraso,
    mesesMora,
    moraPorMes,
    moraAcumulada,
    totalAdeudado,
    cronograma,
  };
}

export interface ConsultarMoraExpensaParams {
  idExpensa: number;
  fecha?: string;
  meses?: number;
}

/**
 * Consulta de solo lectura para el cálculo y proyección de mora de una expensa específica.
 * Lanza 422 si no existe regla activa y 404 si la expensa no existe.
 */
export async function consultarMoraExpensa(params: ConsultarMoraExpensaParams) {
  const { idExpensa, fecha, meses } = params;

  // 1. Obtener regla activa de mora
  const reglaActiva = await prisma.reglaMora.findFirst({
    where: { activa: true },
    orderBy: { fechaCreacion: 'desc' },
  });

  if (!reglaActiva) {
    const error: any = new Error('No existe una regla de mora activa configurada');
    error.statusCode = 422;
    error.code = 'UNPROCESSABLE_ENTITY';
    throw error;
  }

  // 2. Obtener la expensa con pagos y anticipos para calcular capital pendiente
  const expensa = await prisma.expensa.findUnique({
    where: { idExpensa },
    include: {
      pagos: { where: { anulado: false } },
      aplicacionesAnticipos: { include: { pago: true } },
    },
  });

  if (!expensa) {
    const error: any = new Error('Expensa no encontrada');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const hoyLaPaz = fechaYMDLaPaz(new Date());
  const fechaRef = fecha && fecha.trim() ? fecha.trim() : hoyLaPaz;

  const capitalPendiente = calcularCapitalPendiente(expensa);

  const resultado = calcularMoraExpensa({
    capitalPendiente,
    fechaVencimiento: expensa.fechaVencimiento,
    fechaReferencia: fechaRef,
    regla: reglaActiva,
    tasaInteresMora: Number(expensa.tasaInteresMora || 0),
    meses,
  });

  const periodoStr = fechaYMDLaPaz(expensa.periodo);
  const fechaVencStr = fechaYMDLaPaz(expensa.fechaVencimiento);

  return {
    idExpensa: expensa.idExpensa,
    idDepartamento: expensa.idDepartamento,
    periodo: periodoStr,
    fechaVencimiento: fechaVencStr,
    fechaReferencia: fechaRef,
    regla: {
      tipoCalculo: (reglaActiva as any).tipoCalculo || 'PORCENTAJE',
      tasaInteres: Number(reglaActiva.tasaInteres || 0),
      montoFijo:
        (reglaActiva as any).montoFijo !== null && (reglaActiva as any).montoFijo !== undefined
          ? Number((reglaActiva as any).montoFijo)
          : null,
      diaVencimiento:
        (reglaActiva as any).diaVencimiento !== null && (reglaActiva as any).diaVencimiento !== undefined
          ? Number((reglaActiva as any).diaVencimiento)
          : null,
      diaGeneracion:
        (reglaActiva as any).diaGeneracion !== null && (reglaActiva as any).diaGeneracion !== undefined
          ? Number((reglaActiva as any).diaGeneracion)
          : null,
    },
    capitalPendiente,
    diasAtraso: resultado.diasAtraso,
    mesesMora: resultado.mesesMora,
    moraPorMes: resultado.moraPorMes,
    moraAcumulada: resultado.moraAcumulada,
    totalAdeudado: resultado.totalAdeudado,
    cronograma: resultado.cronograma,
  };
}

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

/**
 * Suma los montos de extras vigentes (no anulados) con redondeo a 2 decimales.
 */
export function sumarExtrasVigentes(
  extras?: Array<{ monto: number | string | Prisma.Decimal; anulado?: boolean | null }> | null
): number {
  if (!extras || !Array.isArray(extras)) return 0;
  const suma = extras
    .filter((e) => !e.anulado)
    .reduce((acc, e) => acc + Number(e.monto || 0), 0);
  return Math.round(suma * 100) / 100;
}

/**
 * Calcula el monto total oficial de una expensa:
 * Monto Total = montoBase + montoAgua + suma de extras no anulados
 */
export function calcularMontoTotalExpensa(
  montoBase: number | string | Prisma.Decimal,
  montoAgua: number | string | Prisma.Decimal,
  extras?: Array<{ monto: number | string | Prisma.Decimal; anulado?: boolean | null }> | null
): number {
  const montoExtras = sumarExtrasVigentes(extras);
  return Math.round((Number(montoBase || 0) + Number(montoAgua || 0) + montoExtras) * 100) / 100;
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
      const capitalPendiente = calcularCapitalPendiente(exp);
      if (capitalPendiente <= 0) {
        continue;
      }

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
      } else {
        const tasaExpensa = Number(exp.tasaInteresMora);
        if (tasaExpensa <= 0 && (!reglaActiva || Number(reglaActiva.tasaInteres) < 0)) {
          const error: any = new Error(
            `No existe una regla de mora activa configurada ni tasa en la expensa ${exp.idExpensa} para calcular la mora.`
          );
          error.statusCode = 400;
          error.code = 'REGLA_MORA_NO_CONFIGURADA';
          throw error;
        }
      }

      const resultadoMora = calcularMoraExpensa({
        capitalPendiente,
        fechaVencimiento: exp.fechaVencimiento,
        fechaReferencia: ahora,
        regla: reglaActiva || {
          tipoCalculo: 'PORCENTAJE',
          tasaInteres: Number(exp.tasaInteresMora || 0),
        },
        tasaInteresMora: Number(exp.tasaInteresMora || 0),
      });

      if (resultadoMora.diasAtraso <= 0) {
        continue;
      }

      const montoMora = resultadoMora.moraAcumulada;
      const nuevoSaldo = resultadoMora.totalAdeudado;
      const nuevoEstado = nuevoSaldo > 0 ? 'Moroso' : 'Pagado';

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

export interface CrearExtraExpensaInput {
  idExpensa: number;
  concepto: string;
  descripcion?: string | null;
  monto: number;
  idUsuario?: number | null;
}

/**
 * Registra un cargo extra en una expensa en una sola $transaction con FINANZAS_TX_OPTIONS y auditoría.
 * Recalcula monto_total y saldo_pendiente.
 */
export async function crearExtraExpensa(input: CrearExtraExpensaInput) {
  const { idExpensa, concepto, descripcion, monto, idUsuario } = input;
  const ahora = new Date();

  return await prisma.$transaction(async (tx) => {
    const expensa = await tx.expensa.findUnique({
      where: { idExpensa },
      include: {
        pagos: { where: { anulado: false } },
        aplicacionesAnticipos: { include: { pago: true } },
        extras: true,
      },
    });

    if (!expensa) {
      const err: any = new Error('Expensa no encontrada');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const estadoLower = String(expensa.estado || '').toLowerCase();
    if (['pagado', 'anulada', 'anulado', 'cancelada'].includes(estadoLower) || Number(expensa.saldoPendiente) <= 0) {
      const err: any = new Error('No se pueden registrar cargos extras en una expensa pagada o anulada');
      err.statusCode = 422;
      err.code = 'UNPROCESSABLE_ENTITY';
      throw err;
    }

    const nuevoExtra = await tx.expensaExtra.create({
      data: {
        idExpensa,
        concepto: concepto.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        monto: Math.round(monto * 100) / 100,
        anulado: false,
        idUsuario: idUsuario || null,
      },
    });

    // Recalcular montoTotal y saldo
    const extrasVigentes = await tx.expensaExtra.findMany({
      where: { idExpensa, anulado: false },
    });
    const montoExtras = sumarExtrasVigentes(extrasVigentes);
    const montoAgua = Number(expensa.montoAgua || 0);
    const montoBase = Number(
      expensa.montoBase !== null && expensa.montoBase !== undefined
        ? expensa.montoBase
        : (Number(expensa.monto) - montoAgua > 0
            ? Math.round((Number(expensa.monto) - montoAgua) * 100) / 100
            : Number(expensa.monto))
    );

    const montoTotalAnterior = Number(expensa.monto);
    const montoTotalNuevo = Math.round((montoBase + montoAgua + montoExtras) * 100) / 100;

    const capitalPendiente = calcularCapitalPendiente({
      monto: montoTotalNuevo,
      pagos: expensa.pagos,
      aplicacionesAnticipos: expensa.aplicacionesAnticipos,
    });

    const reglaActiva = await tx.reglaMora.findFirst({
      where: { activa: true },
      orderBy: { fechaCreacion: 'desc' },
    });

    const resultadoMora = calcularMoraExpensa({
      capitalPendiente,
      fechaVencimiento: expensa.fechaVencimiento,
      fechaReferencia: ahora,
      regla: reglaActiva || {
        tipoCalculo: 'PORCENTAJE',
        tasaInteres: Number(expensa.tasaInteresMora || 0),
      },
      tasaInteresMora: Number(expensa.tasaInteresMora || 0),
    });

    const moraPrevia = Number(expensa.montoMora || 0);
    const estaVencida = resultadoMora.diasAtraso > 0;
    // Conserva la mora vigente: si estaba vencida o tenía mora previa, aplicar la mora acumulada recalculada; de lo contrario 0
    const nuevoMontoMora = (estaVencida || moraPrevia > 0) ? resultadoMora.moraAcumulada : 0;
    const nuevoSaldo = Math.max(0, Math.round((capitalPendiente + nuevoMontoMora) * 100) / 100);

    const { estado: nuevoEstado } = determinarEstadoYSaldoExpensa({
      montoTotal: montoTotalNuevo,
      capitalPendiente,
      montoMora: nuevoMontoMora,
      fechaVencimiento: expensa.fechaVencimiento,
      fechaReferencia: ahora,
    });

    const expensaActualizada = await tx.expensa.update({
      where: { idExpensa },
      data: {
        montoBase,
        monto: montoTotalNuevo,
        montoMora: nuevoMontoMora,
        saldoPendiente: nuevoSaldo,
        estado: nuevoEstado,
      },
    });

    // Auditoría oficial CREAR_EXTRA_EXPENSA
    await auditoriaService.registrarEvento({
      tablaAfectada: 'expensa_extras',
      idRegistro: String(nuevoExtra.idExtra),
      accion: 'CREAR_EXTRA_EXPENSA',
      resultado: 'EXITO',
      datosNuevos: {
        idExtra: nuevoExtra.idExtra,
        idExpensa,
        concepto: nuevoExtra.concepto,
        descripcion: nuevoExtra.descripcion ?? null,
        monto: Number(nuevoExtra.monto),
        montoTotalAnterior,
        montoTotalNuevo,
        saldoNuevo: nuevoSaldo,
      },
      idUsuario: idUsuario || null,
      tx,
    });

    return {
      extra: {
        idExtra: nuevoExtra.idExtra,
        idExpensa: nuevoExtra.idExpensa,
        concepto: nuevoExtra.concepto,
        descripcion: nuevoExtra.descripcion,
        monto: Number(nuevoExtra.monto),
        anulado: nuevoExtra.anulado,
        idUsuario: nuevoExtra.idUsuario,
        fechaRegistro: nuevoExtra.fechaRegistro,
      },
      expensa: {
        idExpensa: expensaActualizada.idExpensa,
        montoTotal: Number(expensaActualizada.monto),
        saldoPendiente: Number(expensaActualizada.saldoPendiente),
        estado: expensaActualizada.estado,
      },
    };
  }, FINANZAS_TX_OPTIONS);
}

/**
 * Consulta todos los extras (vigentes y anulados) de una expensa.
 */
export async function obtenerExtrasExpensa(idExpensa: number) {
  const expensa = await prisma.expensa.findUnique({
    where: { idExpensa },
  });

  if (!expensa) {
    const err: any = new Error('Expensa no encontrada');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const extras = await prisma.expensaExtra.findMany({
    where: { idExpensa },
    orderBy: { fechaRegistro: 'asc' },
  });

  return {
    extras: extras.map((e) => ({
      idExtra: e.idExtra,
      idExpensa: e.idExpensa,
      concepto: e.concepto,
      descripcion: e.descripcion,
      monto: Number(e.monto),
      anulado: e.anulado,
      idUsuario: e.idUsuario,
      fechaRegistro: e.fechaRegistro,
    })),
  };
}

/**
 * Anula un cargo extra (anulado = true) en una sola $transaction con FINANZAS_TX_OPTIONS y auditoría.
 * Recalcula monto_total y saldo_pendiente.
 */
export async function anularExtraExpensa(idExpensa: number, idExtra: number, idUsuario?: number | null) {
  const ahora = new Date();

  return await prisma.$transaction(async (tx) => {
    const expensa = await tx.expensa.findUnique({
      where: { idExpensa },
      include: {
        pagos: { where: { anulado: false } },
        aplicacionesAnticipos: { include: { pago: true } },
      },
    });

    if (!expensa) {
      const err: any = new Error('Expensa no encontrada');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const extra = await tx.expensaExtra.findUnique({
      where: { idExtra },
    });

    if (!extra || extra.idExpensa !== idExpensa) {
      const err: any = new Error('Cargo extra no encontrado');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (extra.anulado) {
      const err: any = new Error('El cargo extra ya se encuentra anulado');
      err.statusCode = 409;
      err.code = 'CONFLICT';
      throw err;
    }

    const estadoLower = String(expensa.estado || '').toLowerCase();
    if (['pagado', 'anulada', 'anulado', 'cancelada'].includes(estadoLower) || Number(expensa.saldoPendiente) <= 0) {
      const err: any = new Error('No se pueden anular cargos extras en una expensa pagada o anulada');
      err.statusCode = 422;
      err.code = 'UNPROCESSABLE_ENTITY';
      throw err;
    }

    const extraAnulado = await tx.expensaExtra.update({
      where: { idExtra },
      data: { anulado: true },
    });

    // Recalcular montoTotal y saldo sin este extra
    const extrasVigentes = await tx.expensaExtra.findMany({
      where: { idExpensa, anulado: false },
    });
    const montoExtras = sumarExtrasVigentes(extrasVigentes);
    const montoAgua = Number(expensa.montoAgua || 0);
    const montoBase = Number(
      expensa.montoBase !== null && expensa.montoBase !== undefined
        ? expensa.montoBase
        : (Number(expensa.monto) - montoAgua > 0
            ? Math.round((Number(expensa.monto) - montoAgua) * 100) / 100
            : Number(expensa.monto))
    );

    const montoTotalAnterior = Number(expensa.monto);
    const montoTotalNuevo = Math.round((montoBase + montoAgua + montoExtras) * 100) / 100;

    // Validar que el nuevo monto total no sea inferior a lo ya pagado
    const pagosValidos = expensa.pagos.filter((p) => !p.anulado);
    const totalPagos = pagosValidos.reduce((acc, p) => acc + Number(p.montoPagado || 0), 0);
    const anticValidos = expensa.aplicacionesAnticipos.filter((a) => !a.pago || !a.pago.anulado);
    const totalAntic = anticValidos.reduce((acc, a) => acc + Number(a.monto || 0), 0);
    const totalPagado = Math.round((totalPagos + totalAntic) * 100) / 100;

    if (montoTotalNuevo < totalPagado) {
      const err: any = new Error(
        `El nuevo monto total de expensa (${montoTotalNuevo}) queda por debajo de lo ya pagado (${totalPagado})`
      );
      err.statusCode = 422;
      err.code = 'UNPROCESSABLE_ENTITY';
      throw err;
    }

    const capitalPendiente = calcularCapitalPendiente({
      monto: montoTotalNuevo,
      pagos: expensa.pagos,
      aplicacionesAnticipos: expensa.aplicacionesAnticipos,
    });

    const reglaActiva = await tx.reglaMora.findFirst({
      where: { activa: true },
      orderBy: { fechaCreacion: 'desc' },
    });

    const resultadoMora = calcularMoraExpensa({
      capitalPendiente,
      fechaVencimiento: expensa.fechaVencimiento,
      fechaReferencia: ahora,
      regla: reglaActiva || {
        tipoCalculo: 'PORCENTAJE',
        tasaInteres: Number(expensa.tasaInteresMora || 0),
      },
      tasaInteresMora: Number(expensa.tasaInteresMora || 0),
    });

    const moraPrevia = Number(expensa.montoMora || 0);
    const estaVencida = resultadoMora.diasAtraso > 0;
    // Conserva la mora vigente: si estaba vencida o tenía mora previa, aplicar la mora acumulada recalculada; de lo contrario 0
    const nuevoMontoMora = (estaVencida || moraPrevia > 0) ? resultadoMora.moraAcumulada : 0;
    const nuevoSaldo = Math.max(0, Math.round((capitalPendiente + nuevoMontoMora) * 100) / 100);

    const { estado: nuevoEstado } = determinarEstadoYSaldoExpensa({
      montoTotal: montoTotalNuevo,
      capitalPendiente,
      montoMora: nuevoMontoMora,
      fechaVencimiento: expensa.fechaVencimiento,
      fechaReferencia: ahora,
    });

    const expensaActualizada = await tx.expensa.update({
      where: { idExpensa },
      data: {
        montoBase,
        monto: montoTotalNuevo,
        montoMora: nuevoMontoMora,
        saldoPendiente: nuevoSaldo,
        estado: nuevoEstado,
      },
    });

    // Auditoría oficial ANULAR_EXTRA_EXPENSA
    await auditoriaService.registrarEvento({
      tablaAfectada: 'expensa_extras',
      idRegistro: String(extraAnulado.idExtra),
      accion: 'ANULAR_EXTRA_EXPENSA',
      resultado: 'EXITO',
      datosNuevos: {
        idExtra: extraAnulado.idExtra,
        idExpensa,
        concepto: extraAnulado.concepto,
        descripcion: extraAnulado.descripcion ?? null,
        monto: Number(extraAnulado.monto),
        montoTotalAnterior,
        montoTotalNuevo,
        saldoNuevo: nuevoSaldo,
      },
      idUsuario: idUsuario || null,
      tx,
    });

    return {
      extra: {
        idExtra: extraAnulado.idExtra,
        idExpensa: extraAnulado.idExpensa,
        concepto: extraAnulado.concepto,
        descripcion: extraAnulado.descripcion,
        monto: Number(extraAnulado.monto),
        anulado: extraAnulado.anulado,
        idUsuario: extraAnulado.idUsuario,
        fechaRegistro: extraAnulado.fechaRegistro,
      },
      expensa: {
        idExpensa: expensaActualizada.idExpensa,
        montoTotal: Number(expensaActualizada.monto),
        saldoPendiente: Number(expensaActualizada.saldoPendiente),
        estado: expensaActualizada.estado,
      },
    };
  }, FINANZAS_TX_OPTIONS);
}

/**
 * Helper FIFO para aplicación automática de anticipos disponibles a una expensa.
 * Busca anticipos activos (idExpensa null, esAnticipado true, anulado false) del mismo departamento
 * ordenados FIFO por fechaPago / idPago y reduce el saldo de la expensa.
 */
export async function aplicarAnticiposFIFO(
  tx: Prisma.TransactionClient,
  expensa: { idExpensa: number; idDepartamento: number; monto: any; saldoPendiente: any; estado?: string },
  idUsuario?: number | null
) {
  let saldoPendiente = Number(expensa.saldoPendiente);
  if (saldoPendiente <= 0) {
    return expensa;
  }

  // Buscar anticipos activos (idExpensa null, esAnticipado true, anulado false) del mismo departamento ordenados FIFO por fechaPago / idPago
  const anticipos = await tx.pago.findMany({
    where: {
      idDepartamento: expensa.idDepartamento,
      idExpensa: null,
      esAnticipado: true,
      anulado: false,
    },
    include: {
      aplicacionesAnticipo: true,
    },
    orderBy: [
      { fechaPago: 'asc' },
      { idPago: 'asc' },
    ],
  });

  let aplicacionesRealizadas = 0;

  for (const ant of anticipos) {
    if (saldoPendiente <= 0) break;

    const totalAplicado = ant.aplicacionesAnticipo.reduce(
      (acc, a) => acc + Number(a.monto),
      0
    );
    const saldoDisponible = Math.max(0, Number(ant.montoPagado) - totalAplicado);

    if (saldoDisponible <= 0) continue;

    const montoAAplicar = Math.min(saldoPendiente, saldoDisponible);
    const montoRedondeado = Math.round(montoAAplicar * 100) / 100;

    if (montoRedondeado <= 0) continue;

    await tx.aplicacionAnticipo.create({
      data: {
        idPago: ant.idPago,
        idExpensa: expensa.idExpensa,
        monto: montoRedondeado,
        idUsuarioRegistro: idUsuario || null,
      },
    });

    saldoPendiente = Math.max(0, Math.round((saldoPendiente - montoRedondeado) * 100) / 100);
    aplicacionesRealizadas++;
  }

  if (aplicacionesRealizadas > 0) {
    const nuevoEstado = saldoPendiente === 0 ? 'Pagado' : 'Parcial';
    return await tx.expensa.update({
      where: { idExpensa: expensa.idExpensa },
      data: {
        saldoPendiente,
        estado: nuevoEstado,
      },
    });
  }

  return expensa;
}


