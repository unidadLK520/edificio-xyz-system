// backend/src/modules/expensas/expensas.cron.ts
// Programador de tareas automáticas para cálculo de mora y autogeneración de expensas mediante node-cron (CA10)

import cron, { ScheduledTask } from 'node-cron';
import { prisma } from '@edificio-xyz/database';
import { config } from '../../config';
import { ejecutarCalculoMora, CalculoMoraResultado } from './expensas.service';
import {
  decidirGeneracion,
  generarExpensasPeriodoAutomatico,
  ResultadoAutogenPeriodo,
} from './expensas.autogen';

let scheduledTask: ScheduledTask | null = null;
let scheduledAutogenTask: ScheduledTask | null = null;

/**
 * Ejecución aislada de la tarea de cálculo de mora programada.
 * Audita la operación con idUsuario: null y marca de 'SISTEMA_CRON' / 'sistema'.
 */
export async function tareaCronCalculoMora(params?: { idDepartamentos?: number[] }): Promise<CalculoMoraResultado> {
  console.log('[CRON-MORA] Ejecutando cálculo programado de mora...');
  try {
    const resultado = await ejecutarCalculoMora({
      idUsuario: null,
      origen: 'SISTEMA_CRON',
      idDepartamentos: params?.idDepartamentos,
    });
    console.log(`[CRON-MORA] ${resultado.mensaje} exitosamente.`);
    return resultado;
  } catch (err: any) {
    console.error('[CRON-MORA] Error durante la ejecución del cron de mora:', err.message);
    throw err;
  }
}

/**
 * Iniciar el cron job según las variables MORA_CRON y MORA_CRON_ENABLED.
 */
export function iniciarCronMora(): ScheduledTask | null {
  const expresion = process.env.MORA_CRON || config.moraCron || '0 1 * * *';
  const habilitado = process.env.MORA_CRON_ENABLED !== undefined
    ? process.env.MORA_CRON_ENABLED === 'true'
    : config.moraCronEnabled;

  if (!habilitado) {
    console.log('[CRON-MORA] Tarea programada de cálculo de mora deshabilitada (MORA_CRON_ENABLED != true).');
    return null;
  }

  if (!cron.validate(expresion)) {
    console.error(`[CRON-MORA] Expresión cron inválida: "${expresion}". No se inició la tarea.`);
    return null;
  }

  if (scheduledTask) {
    scheduledTask.stop();
  }

  scheduledTask = cron.schedule(
    expresion,
    async () => {
      try {
        await tareaCronCalculoMora();
      } catch (err) {
        console.error('[CRON-MORA] Fallo al ejecutar tarea programada:', err);
      }
    },
    {
      timezone: 'America/La_Paz',
    }
  );

  console.log(`[CRON-MORA] Tarea programada iniciada con expresión "${expresion}" (Timezone: America/La_Paz).`);
  return scheduledTask;
}

/**
 * Detener la tarea cron activa si existe.
 */
export function detenerCronMora(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[CRON-MORA] Tarea programada detenida.');
  }
}

/**
 * Consultar estado actual del cron.
 */
export function obtenerEstadoCronMora(): { activo: boolean; expresion: string; habilitado: boolean; timezone: string } {
  return {
    activo: scheduledTask !== null,
    expresion: process.env.MORA_CRON || config.moraCron || '0 1 * * *',
    habilitado: process.env.MORA_CRON_ENABLED !== undefined
      ? process.env.MORA_CRON_ENABLED === 'true'
      : config.moraCronEnabled,
    timezone: 'America/La_Paz',
  };
}

export interface TareaCronAutogenResultado {
  ejecutado: boolean;
  motivo?: string;
  periodo?: string;
  generadasCount: number;
  resultado?: ResultadoAutogenPeriodo;
}

/**
 * Tarea diaria (01:00 America/La_Paz) para autogeneración de expensas:
 * - Lee la regla de mora activa.
 * - Si no hay regla activa o no tiene dia_generacion, no genera nada.
 * - Con decidirGeneracion({ ahoraLaPaz, diaGeneracion }): si devuelve un período,
 *   llama a generarExpensasPeriodoAutomatico(periodo).
 * - Logs sin datos personales.
 */
export async function tareaCronAutogenExpensas(ahora?: Date | string): Promise<TareaCronAutogenResultado> {
  console.log('[CRON-EXPENSAS] Verificando autogeneración programada de expensas...');
  try {
    const reglaActiva = await prisma.reglaMora.findFirst({
      where: { activa: true },
      orderBy: { fechaCreacion: 'desc' },
    });

    if (!reglaActiva || reglaActiva.diaGeneracion === null || reglaActiva.diaGeneracion === undefined) {
      console.log('[CRON-EXPENSAS] Sin regla activa o sin dia_generacion configurado; no se genera nada.');
      return {
        ejecutado: false,
        motivo: 'SIN_REGLA_O_DIA_GENERACION',
        generadasCount: 0,
      };
    }

    const periodoAGenerar = decidirGeneracion({
      ahoraLaPaz: ahora || new Date(),
      diaGeneracion: reglaActiva.diaGeneracion,
    });

    if (!periodoAGenerar) {
      console.log('[CRON-EXPENSAS] No corresponde generar expensas para hoy según dia_generacion.');
      return {
        ejecutado: false,
        motivo: 'DIA_GENERACION_NO_ALCANZADO',
        generadasCount: 0,
      };
    }

    console.log(`[CRON-EXPENSAS] Generando expensas automáticamente para el período ${periodoAGenerar}...`);
    const resultado = await generarExpensasPeriodoAutomatico(periodoAGenerar);

    console.log(
      `[CRON-EXPENSAS] Generación automática completada para ${periodoAGenerar}: ` +
      `${resultado.generadasCount} generadas, ${resultado.excepcionesCount} omitidas/existentes, ` +
      `${resultado.advertenciasCount} advertencias.`
    );

    return {
      ejecutado: true,
      periodo: periodoAGenerar,
      generadasCount: resultado.generadasCount,
      resultado,
    };
  } catch (err: any) {
    console.error('[CRON-EXPENSAS] Error durante autogeneración de expensas:', err?.message || err);
    throw err;
  }
}

/**
 * Iniciar el cron job según EXPENSAS_AUTOGEN_ENABLED (default false).
 * Con el flag activo:
 * - Registra tarea diaria a las 01:00 America/La_Paz.
 * - Al arrancar hace una pasada para ponerse al día.
 */
export function iniciarCronAutogenExpensas(): ScheduledTask | null {
  const habilitado = process.env.EXPENSAS_AUTOGEN_ENABLED !== undefined
    ? process.env.EXPENSAS_AUTOGEN_ENABLED === 'true'
    : (config as any).expensasAutogenEnabled;

  if (!habilitado) {
    console.log('[CRON-EXPENSAS] Tarea programada de autogeneración deshabilitada (EXPENSAS_AUTOGEN_ENABLED != true).');
    return null;
  }

  const expresion = process.env.EXPENSAS_AUTOGEN_CRON || (config as any).expensasAutogenCron || '0 1 * * *';

  if (!cron.validate(expresion)) {
    console.error(`[CRON-EXPENSAS] Expresión cron inválida: "${expresion}". No se inició la tarea.`);
    return null;
  }

  if (scheduledAutogenTask) {
    scheduledAutogenTask.stop();
  }

  scheduledAutogenTask = cron.schedule(
    expresion,
    async () => {
      try {
        await tareaCronAutogenExpensas();
      } catch (err: any) {
        console.error('[CRON-EXPENSAS] Fallo al ejecutar tarea programada:', err?.message || err);
      }
    },
    {
      timezone: 'America/La_Paz',
    }
  );

  console.log(`[CRON-EXPENSAS] Tarea programada iniciada con expresión "${expresion}" (Timezone: America/La_Paz).`);

  // Pasada inicial de ponerse al día al arrancar el servidor
  tareaCronAutogenExpensas().catch((err: any) => {
    console.error('[CRON-EXPENSAS] Error en pasada inicial de ponerse al día al arrancar:', err?.message || err);
  });

  return scheduledAutogenTask;
}

/**
 * Detener la tarea cron de autogeneración activa si existe.
 */
export function detenerCronAutogenExpensas(): void {
  if (scheduledAutogenTask) {
    scheduledAutogenTask.stop();
    scheduledAutogenTask = null;
    console.log('[CRON-EXPENSAS] Tarea programada de autogeneración detenida.');
  }
}

/**
 * Consultar estado actual del cron de autogeneración.
 */
export function obtenerEstadoCronAutogenExpensas(): { activo: boolean; expresion: string; habilitado: boolean; timezone: string } {
  const habilitado = process.env.EXPENSAS_AUTOGEN_ENABLED !== undefined
    ? process.env.EXPENSAS_AUTOGEN_ENABLED === 'true'
    : (config as any).expensasAutogenEnabled;

  return {
    activo: scheduledAutogenTask !== null,
    expresion: process.env.EXPENSAS_AUTOGEN_CRON || (config as any).expensasAutogenCron || '0 1 * * *',
    habilitado: Boolean(habilitado),
    timezone: 'America/La_Paz',
  };
}
