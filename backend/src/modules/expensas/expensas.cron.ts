// backend/src/modules/expensas/expensas.cron.ts
// Programador de tareas automáticas para cálculo de mora mediante node-cron (CA10)

import cron, { ScheduledTask } from 'node-cron';
import { config } from '../../config';
import { ejecutarCalculoMora, CalculoMoraResultado } from './expensas.service';

let scheduledTask: ScheduledTask | null = null;

/**
 * Ejecución aislada de la tarea de cálculo de mora programada.
 * Audita la operación con idUsuario: null y marca de 'SISTEMA_CRON' / 'sistema'.
 */
export async function tareaCronCalculoMora(): Promise<CalculoMoraResultado> {
  console.log('[CRON-MORA] Ejecutando cálculo programado de mora...');
  try {
    const resultado = await ejecutarCalculoMora({
      idUsuario: null,
      origen: 'SISTEMA_CRON',
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

  scheduledTask = cron.schedule(expresion, async () => {
    try {
      await tareaCronCalculoMora();
    } catch (err) {
      console.error('[CRON-MORA] Fallo al ejecutar tarea programada:', err);
    }
  });

  console.log(`[CRON-MORA] Tarea programada iniciada con expresión "${expresion}".`);
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
export function obtenerEstadoCronMora(): { activo: boolean; expresion: string; habilitado: boolean } {
  return {
    activo: scheduledTask !== null,
    expresion: process.env.MORA_CRON || config.moraCron || '0 1 * * *',
    habilitado: process.env.MORA_CRON_ENABLED !== undefined
      ? process.env.MORA_CRON_ENABLED === 'true'
      : config.moraCronEnabled,
  };
}
