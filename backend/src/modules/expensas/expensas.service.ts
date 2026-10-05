// backend/src/modules/expensas/expensas.service.ts
// Servicio centralizado de cálculo financiero y gestión de expensas

import { Prisma, prisma } from '@edificio-xyz/database';
import { auditoriaService } from '../auditoria';

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

export interface ConfigurarReglaMoraInput {
  tasaInteres: number;
  diasGracia?: number;
  idUsuario?: number | null;
}

/**
 * Configurar una nueva regla de mora activa (CA09).
 * Desactiva la regla previa de forma atómica en transacción y audita el cambio.
 */
export async function configurarReglaMora(input: ConfigurarReglaMoraInput) {
  const diasGracia = input.diasGracia ?? 0;

  return await prisma.$transaction(async (tx) => {
    // 1. Obtener la regla activa anterior
    const reglaAnterior = await tx.reglaMora.findFirst({
      where: { activa: true },
      orderBy: { fechaCreacion: 'desc' },
    });

    // 2. Desactivar cualquier regla activa previa
    if (reglaAnterior) {
      await tx.reglaMora.update({
        where: { idRegla: reglaAnterior.idRegla },
        data: { activa: false },
      });
    }

    // 3. Crear la nueva regla de mora activa
    const nuevaRegla = await tx.reglaMora.create({
      data: {
        tasaInteres: input.tasaInteres,
        diasGracia,
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
            tasaInteres: Number(reglaAnterior.tasaInteres),
            diasGracia: reglaAnterior.diasGracia,
            activa: reglaAnterior.activa,
          }
        : null,
      datosNuevos: {
        idRegla: nuevaRegla.idRegla,
        tasaInteres: Number(nuevaRegla.tasaInteres),
        diasGracia: nuevaRegla.diasGracia,
        activa: nuevaRegla.activa,
      },
      idUsuario: input.idUsuario || null,
      tx,
    });

    return nuevaRegla;
  }, { timeout: 30000, maxWait: 15000 });
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

  return { activa, historial };
}

export interface EjecutarCalculoMoraParams {
  idUsuario?: number | null;
  origen?: 'MANUAL' | 'SISTEMA_CRON';
  fechaReferencia?: Date;
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

    // 2. Buscar expensas vencidas con saldo pendiente > 0 que no estén ya pagadas
    const expensasCandidatas = await tx.expensa.findMany({
      where: {
        fechaVencimiento: { lt: ahora },
        saldoPendiente: { gt: 0 },
        estado: { not: 'Pagado' },
      },
      include: {
        pagos: {
          where: { anulado: false },
        },
        aplicacionesAnticipos: {
          include: { pago: true },
        },
      },
    });

    // Validar si alguna expensa requiere regla activa pero no existe
    const diasGracia = reglaActiva ? reglaActiva.diasGracia : 0;

    let count = 0;

    for (const exp of expensasCandidatas) {
      // Regla de días de gracia: No hay mora si hoy <= fechaVencimiento + diasGracia
      const fechaVenc = new Date(exp.fechaVencimiento);
      const fechaLimiteGracia = new Date(fechaVenc.getTime() + diasGracia * 24 * 60 * 60 * 1000);

      if (ahora.getTime() <= fechaLimiteGracia.getTime()) {
        // Aún se encuentra dentro del período de gracia permitido
        continue;
      }

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

      const capitalPendiente = calcularCapitalPendiente(exp);
      if (capitalPendiente <= 0) {
        continue;
      }

      const montoMora = Math.round((capitalPendiente * (tasaFinal / 100)) * 100) / 100;
      const nuevoSaldo = Math.max(0, Math.round((capitalPendiente + montoMora) * 100) / 100);
      const nuevoEstado = (nuevoSaldo > 0 && exp.fechaVencimiento < ahora)
        ? 'Moroso'
        : (nuevoSaldo === 0 ? 'Pagado' : 'Pendiente');

      await tx.expensa.update({
        where: { idExpensa: exp.idExpensa },
        data: {
          montoMora,
          saldoPendiente: nuevoSaldo,
          estado: nuevoEstado,
        },
      });

      count++;
    }

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
        diasGraciaAplicados: diasGracia,
        tasaGeneralUsada: reglaActiva ? Number(reglaActiva.tasaInteres) : null,
      },
      idUsuario: idUsuarioAuditoria,
      tx,
    });

    return {
      actualizadasCount: count,
      mensaje: `Se aplicó el recargo de mora a ${count} expensas vencidas`,
    };
  }, { timeout: 30000, maxWait: 15000 });
}
