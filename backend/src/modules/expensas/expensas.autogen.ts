// backend/src/modules/expensas/expensas.autogen.ts
// Lógica de autogeneración de expensas del período: función de decisión pura y servicio de generación idempotente

import { prisma } from '@edificio-xyz/database';
import { auditoriaService } from '../auditoria';
import { FINANZAS_TX_OPTIONS } from '../../middlewares/finanzas-permissions.middleware';
import {
  calcularMontoTotalExpensa,
  calcularFechaVencimientoPeriodo,
  formatearExpensaConConcepto,
  aplicarAnticiposFIFO,
} from './expensas.service';

export interface DecidirGeneracionParams {
  ahoraLaPaz: Date | string;
  diaGeneracion?: number | null;
}

/**
 * Función pura que decide si corresponde generar expensas automáticamente.
 * Regla:
 * - Si diaGeneracion es null o undefined -> retorna null (sin dia_generacion no genera nada).
 * - Si hoy (hora La Paz) >= diaGeneracion (tope: último día del mes) -> retorna 'YYYY-MM-01'.
 * - Si hoy (hora La Paz) < diaGeneracion -> retorna null.
 */
export function decidirGeneracion({
  ahoraLaPaz,
  diaGeneracion,
}: DecidirGeneracionParams): string | null {
  if (diaGeneracion === undefined || diaGeneracion === null) {
    return null;
  }

  const diaGen = Number(diaGeneracion);
  if (isNaN(diaGen) || diaGen < 1 || diaGen > 31) {
    return null;
  }

  let year: number;
  let month: number;
  let day: number;

  if (typeof ahoraLaPaz === 'string') {
    const match = ahoraLaPaz.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      day = parseInt(match[3], 10);
    } else {
      const d = new Date(ahoraLaPaz);
      if (isNaN(d.getTime())) return null;
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/La_Paz',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d).split('-');
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }
  } else if (ahoraLaPaz instanceof Date) {
    if (isNaN(ahoraLaPaz.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(ahoraLaPaz).split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    return null;
  }

  // Tope: último día del mes actual (ej. 28/29 en feb, 30 en abr/jun/sep/nov, 31 en resto)
  const ultimoDiaMes = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const diaEfectivo = Math.min(diaGen, ultimoDiaMes);

  if (day >= diaEfectivo) {
    const mPadded = String(month).padStart(2, '0');
    return `${year}-${mPadded}-01`;
  }

  return null;
}

export interface ResultadoAutogenPeriodo {
  periodo: string;
  generadasCount: number;
  excepcionesCount: number;
  advertenciasCount: number;
  generadas: any[];
}

/**
 * Genera de forma masiva e idempotente las expensas del período especificado para
 * todos los departamentos que tengan tipo asignado y aún no tengan expensa generada.
 *
 * Características:
 * - Idempotente: Omite departamentos que ya poseen expensa en el período (nunca duplica).
 * - Monto base del tipo de departamento (montoExpensa).
 * - Monto de agua registrado en monto_agua si existe para el período; 0 si no.
 * - Extras inicialmente vacíos ([]).
 * - Vencimiento calculado con calcularFechaVencimientoPeriodo y regla activa.
 * - Tasa de interés de la regla activa de mora.
 * - Aplicación automática FIFO de anticipos disponibles.
 * - Auditoría transaccional por expensa y resumen del período (idUsuario: null, sin datos personales).
 */
export async function generarExpensasPeriodoAutomatico(
  periodo: string
): Promise<ResultadoAutogenPeriodo> {
  const match = periodo.trim().match(/^(\d{4})-(\d{1,2})/);
  if (!match) {
    throw new Error(`Formato de período inválido: "${periodo}". Se espera YYYY-MM o YYYY-MM-DD`);
  }
  const pYear = match[1];
  const pMonth = match[2].padStart(2, '0');
  const periodoNormalizado = `${pYear}-${pMonth}-01`;
  const periodoDate = new Date(`${periodoNormalizado}T00:00:00.000Z`);

  return await prisma.$transaction(async (tx) => {
    // 1. Obtener todos los departamentos con su tipo asignado
    const departamentos = await tx.departamento.findMany({
      include: {
        tipo: true,
      },
      orderBy: { idDepartamento: 'asc' },
    });

    // 2. Consultar expensas existentes para el período (para garantizar idempotencia)
    const expensasExistentes = await tx.expensa.findMany({
      where: { periodo: periodoDate },
      select: { idDepartamento: true },
    });
    const deptosConExpensa = new Set(expensasExistentes.map((e) => e.idDepartamento));

    // 3. Consultar montos de agua registrados para el período
    const montosExistentes = await tx.montoAgua.findMany({
      where: { periodo: periodoDate },
      select: { idDepartamento: true, montoAgua: true },
    });
    const montosMap = new Map<number, number>(
      montosExistentes.map((m) => [m.idDepartamento, Number(m.montoAgua)])
    );

    // 4. Obtener regla de mora activa para tasa y día de vencimiento
    const reglaActiva = await tx.reglaMora.findFirst({
      where: { activa: true },
      orderBy: { fechaCreacion: 'desc' },
    });
    const tasaAplicar = reglaActiva ? Number(reglaActiva.tasaInteres) : 0;
    const vencimientoDateFinal = calcularFechaVencimientoPeriodo(
      periodoNormalizado,
      reglaActiva?.diaVencimiento
    );

    const generadasArr: any[] = [];
    const excepcionesArr: any[] = [];
    const advertenciasArr: any[] = [];

    for (const depto of departamentos) {
      // Si el departamento no tiene tipo asignado, se omite
      if (!depto.tipo) {
        excepcionesArr.push({
          idDepartamento: depto.idDepartamento,
          numero: depto.numero,
          motivo: 'El departamento no tiene un tipo asignado en tipos_departamento',
        });
        continue;
      }

      // IDEMPOTENCIA: Si ya tiene expensa para el período, se omite (nunca duplicar)
      if (deptosConExpensa.has(depto.idDepartamento)) {
        excepcionesArr.push({
          idDepartamento: depto.idDepartamento,
          numero: depto.numero,
          motivo: 'Expensa ya fue generada previamente para este período',
        });
        continue;
      }

      const montoBase = Number(depto.tipo.montoExpensa);
      const montoAguaRegistrado = montosMap.get(depto.idDepartamento);
      let montoAgua = 0;
      if (montoAguaRegistrado !== undefined) {
        montoAgua = montoAguaRegistrado;
      } else {
        advertenciasArr.push({
          idDepartamento: depto.idDepartamento,
          numero: depto.numero,
          advertencia: 'Sin monto de agua registrado para el período; se emitió únicamente con monto base',
        });
      }

      // Monto total = montoBase + montoAgua + extras (inicialmente vacíos al emitir)
      const montoTotal = calcularMontoTotalExpensa(montoBase, montoAgua, []);

      const nuevaExpensa = await tx.expensa.create({
        data: {
          idDepartamento: depto.idDepartamento,
          periodo: periodoDate,
          montoBase: montoBase,
          montoAgua: montoAgua,
          monto: montoTotal,
          saldoPendiente: montoTotal,
          tasaInteresMora: tasaAplicar,
          fechaVencimiento: vencimientoDateFinal,
          estado: 'Pendiente',
        },
      });

      // Aplicar anticipos FIFO automáticamente en la misma transacción
      const expensaConAnticipos = await aplicarAnticiposFIFO(tx, nuevaExpensa, null);

      // Auditoría por expensa individual creada (como la manual)
      await auditoriaService.registrarEvento({
        tablaAfectada: 'expensas',
        idRegistro: String(nuevaExpensa.idExpensa),
        accion: 'CREAR_EXPENSA',
        resultado: 'EXITO',
        datosNuevos: {
          idExpensa: nuevaExpensa.idExpensa,
          idDepartamento: nuevaExpensa.idDepartamento,
          periodo: periodoNormalizado,
          monto: Number(nuevaExpensa.monto),
          montoBase: Number(nuevaExpensa.montoBase),
          montoAgua: Number(nuevaExpensa.montoAgua),
          saldoPendiente: Number(expensaConAnticipos.saldoPendiente),
          estado: expensaConAnticipos.estado,
          tasaInteresMora: Number(nuevaExpensa.tasaInteresMora),
          origen: 'SISTEMA_CRON',
        },
        idUsuario: null,
        tx,
      });

      const expensaFormateada = formatearExpensaConConcepto(
        expensaConAnticipos,
        depto.tipo.nombre
      );
      generadasArr.push(expensaFormateada);
    }

    // Auditoría resumen de generación masiva automática para el período
    if (generadasArr.length > 0) {
      await auditoriaService.registrarEvento({
        tablaAfectada: 'expensas',
        idRegistro: `PERIODO-${periodoNormalizado}`,
        accion: 'GENERACION_MASIVA_EXPENSAS',
        resultado: 'EXITO',
        datosNuevos: {
          periodo: periodoNormalizado,
          generadasCount: generadasArr.length,
          excepcionesCount: excepcionesArr.length,
          advertenciasCount: advertenciasArr.length,
          origen: 'SISTEMA_CRON',
        },
        idUsuario: null,
        tx,
      });
    }

    return {
      periodo: periodoNormalizado,
      generadasCount: generadasArr.length,
      excepcionesCount: excepcionesArr.length,
      advertenciasCount: advertenciasArr.length,
      generadas: generadasArr,
    };
  }, FINANZAS_TX_OPTIONS);
}
