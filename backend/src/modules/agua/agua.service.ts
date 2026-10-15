// backend/src/modules/agua/agua.service.ts
// Lógica de negocio para tarifas y lecturas de agua

import { prisma } from '@edificio-xyz/database';
import { auditoriaService } from '../auditoria';
import { ConfigurarTarifaAguaInput } from './agua.types';

/**
 * Configura una nueva tarifa de agua activa.
 * - precioM3 >= 0
 * - Desactiva de forma atómica en transacción cualquier tarifa previa (una activa a la vez)
 * - Registra evento de auditoría CONFIGURAR_TARIFA_AGUA
 */
export async function configurarTarifaAgua(input: ConfigurarTarifaAguaInput): Promise<any> {
  if (input.precioM3 === undefined || input.precioM3 === null || isNaN(input.precioM3) || input.precioM3 < 0) {
    const error: any = new Error('El precio por m3 debe ser mayor o igual a 0');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  return await prisma.$transaction(
    async (tx) => {
      // 1. Obtener la tarifa activa previa
      const tarifaAnterior = await tx.tarifaAgua.findFirst({
        where: { activa: true },
        orderBy: { fechaCreacion: 'desc' },
      });

      // 2. Desactivar tarifas activas previas
      await tx.tarifaAgua.updateMany({
        where: { activa: true },
        data: { activa: false },
      });

      // 3. Crear la nueva tarifa activa
      const nuevaTarifa = await tx.tarifaAgua.create({
        data: {
          precioM3: input.precioM3,
          activa: true,
          idUsuarioCreacion: input.idUsuario || null,
        },
        include: {
          usuarioCreacion: {
            select: { idUsuario: true, nombreUsuario: true, correo: true },
          },
        },
      });

      // 4. Auditoría CONFIGURAR_TARIFA_AGUA
      await auditoriaService.registrarEvento({
        tablaAfectada: 'tarifas_agua',
        idRegistro: String(nuevaTarifa.idTarifa),
        accion: 'CONFIGURAR_TARIFA_AGUA',
        resultado: 'EXITO',
        datosAnteriores: tarifaAnterior
          ? {
              idTarifa: tarifaAnterior.idTarifa,
              precioM3: Number(tarifaAnterior.precioM3),
              activa: tarifaAnterior.activa,
            }
          : null,
        datosNuevos: {
          idTarifa: nuevaTarifa.idTarifa,
          precioM3: Number(nuevaTarifa.precioM3),
          activa: nuevaTarifa.activa,
        },
        idUsuario: input.idUsuario || null,
        tx,
      });

      return nuevaTarifa;
    },
    { timeout: 30000, maxWait: 15000 }
  );
}

/**
 * Obtiene la tarifa activa actual y el historial completo ordenado.
 */
export async function obtenerTarifaAgua() {
  const [activa, historial] = await Promise.all([
    prisma.tarifaAgua.findFirst({
      where: { activa: true },
      include: {
        usuarioCreacion: {
          select: { idUsuario: true, nombreUsuario: true, correo: true },
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    }),
    prisma.tarifaAgua.findMany({
      include: {
        usuarioCreacion: {
          select: { idUsuario: true, nombreUsuario: true, correo: true },
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    }),
  ]);

  return {
    activa: activa
      ? {
          ...activa,
          precioM3: Number(activa.precioM3),
        }
      : null,
    historial: historial.map((t) => ({
      ...t,
      precioM3: Number(t.precioM3),
    })),
    // Alias directo para clientes que esperan { tarifa: activa }
    tarifa: activa
      ? {
          ...activa,
          precioM3: Number(activa.precioM3),
        }
      : null,
  };
}

/**
 * Normaliza un período (string o Date) al primer día del mes en UTC.
 */
export function normalizarPeriodo(periodo: string | Date): { periodoDate: Date; periodoStr: string } {
  if (typeof periodo === 'string') {
    const parts = periodo.split('-');
    const year = parts[0];
    const month = (parts[1] || '01').padStart(2, '0');
    const periodoStr = `${year}-${month}-01`;
    return {
      periodoDate: new Date(`${periodoStr}T00:00:00.000Z`),
      periodoStr,
    };
  } else {
    const year = periodo.getUTCFullYear();
    const month = String(periodo.getUTCMonth() + 1).padStart(2, '0');
    const periodoStr = `${year}-${month}-01`;
    return {
      periodoDate: new Date(`${periodoStr}T00:00:00.000Z`),
      periodoStr,
    };
  }
}

/**
 * Registrar una lectura de agua para un departamento y período.
 * - lectura anterior = la última del departamento (si no hay, exige lecturaAnterior)
 * - 422 si actual < anterior o no hay tarifa activa
 * - consumo = actual - anterior
 * - monto_agua = round(consumo * precio, 2) guardando el precio
 * - 409 si ya existe para departamento y período
 * - Auditoría REGISTRO_LECTURA_AGUA
 */
export async function registrarLecturaAgua(input: {
  idDepartamento: number;
  periodo: string | Date;
  lecturaActual: number;
  lecturaAnterior?: number;
  idUsuario?: number | null;
}): Promise<any> {
  const { periodoDate, periodoStr } = normalizarPeriodo(input.periodo);

  return await prisma.$transaction(
    async (tx) => {
      // 1. Validar existencia de tarifa activa
      const tarifaActiva = await tx.tarifaAgua.findFirst({
        where: { activa: true },
        orderBy: { fechaCreacion: 'desc' },
      });

      if (!tarifaActiva) {
        const error: any = new Error('No existe una tarifa de agua activa configurada');
        error.statusCode = 422;
        error.code = 'UNPROCESSABLE_ENTITY';
        throw error;
      }

      // 2. Validar que no exista lectura previa para el mismo depto y período
      const existente = await tx.lecturaAgua.findFirst({
        where: {
          idDepartamento: input.idDepartamento,
          periodo: periodoDate,
        },
      });

      if (existente) {
        const error: any = new Error(
          `Ya existe una lectura de agua para el departamento ${input.idDepartamento} en el período ${periodoStr}`
        );
        error.statusCode = 409;
        error.code = 'CONFLICT';
        throw error;
      }

      // 3. Obtener la última lectura registrada del departamento
      const ultimaLectura = await tx.lecturaAgua.findFirst({
        where: { idDepartamento: input.idDepartamento },
        orderBy: [{ periodo: 'desc' }, { idLectura: 'desc' }],
      });

      let anterior: number;
      if (ultimaLectura) {
        anterior = Number(ultimaLectura.lecturaActual);
      } else {
        if (input.lecturaAnterior === undefined || input.lecturaAnterior === null || isNaN(input.lecturaAnterior)) {
          const error: any = new Error(
            'El departamento no tiene lecturas previas; debe especificar la lecturaAnterior inicial'
          );
          error.statusCode = 422;
          error.code = 'UNPROCESSABLE_ENTITY';
          throw error;
        }
        anterior = Number(input.lecturaAnterior);
      }

      const actual = Number(input.lecturaActual);

      // 4. Validar actual >= anterior
      if (actual < anterior) {
        const error: any = new Error(
          `La lectura actual (${actual}) no puede ser menor a la lectura anterior (${anterior})`
        );
        error.statusCode = 422;
        error.code = 'UNPROCESSABLE_ENTITY';
        throw error;
      }

      // 5. Calcular consumo y monto
      const consumo = Math.round((actual - anterior) * 100) / 100;
      const precio = Number(tarifaActiva.precioM3);
      const montoAgua = Math.round(consumo * precio * 100) / 100;

      // 6. Crear registro de lectura
      const nuevaLectura = await tx.lecturaAgua.create({
        data: {
          idDepartamento: input.idDepartamento,
          periodo: periodoDate,
          lecturaAnterior: anterior,
          lecturaActual: actual,
          consumoM3: consumo,
          precioM3: precio,
          montoAgua,
          idUsuarioRegistro: input.idUsuario || null,
        },
        include: {
          departamento: {
            select: { idDepartamento: true, numero: true, piso: true },
          },
        },
      });

      // 7. Auditoría REGISTRO_LECTURA_AGUA
      await auditoriaService.registrarEvento({
        tablaAfectada: 'lecturas_agua',
        idRegistro: String(nuevaLectura.idLectura),
        accion: 'REGISTRO_LECTURA_AGUA',
        resultado: 'EXITO',
        datosNuevos: {
          idLectura: nuevaLectura.idLectura,
          idDepartamento: nuevaLectura.idDepartamento,
          periodo: periodoStr,
          lecturaAnterior: anterior,
          lecturaActual: actual,
          consumoM3: consumo,
          precioM3: precio,
          montoAgua,
        },
        idUsuario: input.idUsuario || null,
        tx,
      });

      return {
        ...nuevaLectura,
        lecturaAnterior: Number(nuevaLectura.lecturaAnterior),
        lecturaActual: Number(nuevaLectura.lecturaActual),
        consumoM3: Number(nuevaLectura.consumoM3),
        precioM3: Number(nuevaLectura.precioM3),
        montoAgua: Number(nuevaLectura.montoAgua),
      };
    },
    { timeout: 30000, maxWait: 15000 }
  );
}

/**
 * Consultar lecturas de agua con filtros opcionales (periodo, idDepartamento).
 */
export async function obtenerLecturasAgua(filtros: {
  periodo?: string | Date;
  idDepartamento?: number;
  page?: number;
  limit?: number;
}): Promise<any> {
  const where: any = {};
  if (filtros.idDepartamento) {
    where.idDepartamento = Number(filtros.idDepartamento);
  }
  if (filtros.periodo) {
    const { periodoDate } = normalizarPeriodo(filtros.periodo);
    where.periodo = periodoDate;
  }

  const page = Math.max(1, filtros.page || 1);
  const limit = Math.max(1, filtros.limit || 50);
  const skip = (page - 1) * limit;

  const [lecturas, total] = await Promise.all([
    prisma.lecturaAgua.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ periodo: 'desc' }, { idDepartamento: 'asc' }],
      include: {
        departamento: {
          select: { idDepartamento: true, numero: true, piso: true },
        },
      },
    }),
    prisma.lecturaAgua.count({ where }),
  ]);

  return {
    data: lecturas.map((l) => ({
      ...l,
      lecturaAnterior: Number(l.lecturaAnterior),
      lecturaActual: Number(l.lecturaActual),
      consumoM3: Number(l.consumoM3),
      precioM3: Number(l.precioM3),
      montoAgua: Number(l.montoAgua),
    })),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Corregir una lectura de agua.
 * - 404 si no existe
 * - 409 si ya se usó en una expensa emitida
 * - 422 si actual < anterior
 * - Recalcula consumo y monto_agua
 * - Auditoría REGISTRO_LECTURA_AGUA
 */
export async function corregirLecturaAgua(input: {
  idLectura: number;
  lecturaActual?: number;
  lecturaAnterior?: number;
  idUsuario?: number | null;
}): Promise<any> {
  return await prisma.$transaction(
    async (tx) => {
      // 1. Buscar la lectura
      const lectura = await tx.lecturaAgua.findUnique({
        where: { idLectura: input.idLectura },
      });

      if (!lectura) {
        const error: any = new Error(`Lectura de agua con ID ${input.idLectura} no encontrada`);
        error.statusCode = 404;
        error.code = 'NOT_FOUND';
        throw error;
      }

      // 2. Verificar si ya fue utilizada en una expensa emitida
      const expensaExistente = await tx.expensa.findFirst({
        where: {
          idDepartamento: lectura.idDepartamento,
          periodo: lectura.periodo,
        },
      });

      if (expensaExistente) {
        const error: any = new Error(
          'No se puede corregir la lectura de agua porque ya fue utilizada en una expensa emitida'
        );
        error.statusCode = 409;
        error.code = 'CONFLICT';
        throw error;
      }

      // 3. Determinar nuevos valores
      const anterior = input.lecturaAnterior !== undefined ? Number(input.lecturaAnterior) : Number(lectura.lecturaAnterior);
      const actual = input.lecturaActual !== undefined ? Number(input.lecturaActual) : Number(lectura.lecturaActual);

      if (actual < anterior) {
        const error: any = new Error(
          `La lectura actual (${actual}) no puede ser menor a la lectura anterior (${anterior})`
        );
        error.statusCode = 422;
        error.code = 'UNPROCESSABLE_ENTITY';
        throw error;
      }

      const consumo = Math.round((actual - anterior) * 100) / 100;
      const precio = Number(lectura.precioM3);
      const montoAgua = Math.round(consumo * precio * 100) / 100;

      const datosAnteriores = {
        idLectura: lectura.idLectura,
        lecturaAnterior: Number(lectura.lecturaAnterior),
        lecturaActual: Number(lectura.lecturaActual),
        consumoM3: Number(lectura.consumoM3),
        precioM3: Number(lectura.precioM3),
        montoAgua: Number(lectura.montoAgua),
      };

      // 4. Actualizar lectura
      const lecturaActualizada = await tx.lecturaAgua.update({
        where: { idLectura: lectura.idLectura },
        data: {
          lecturaAnterior: anterior,
          lecturaActual: actual,
          consumoM3: consumo,
          montoAgua,
        },
        include: {
          departamento: {
            select: { idDepartamento: true, numero: true, piso: true },
          },
        },
      });

      const datosNuevos = {
        idLectura: lecturaActualizada.idLectura,
        lecturaAnterior: anterior,
        lecturaActual: actual,
        consumoM3: consumo,
        precioM3: precio,
        montoAgua,
      };

      // 5. Auditoría REGISTRO_LECTURA_AGUA
      await auditoriaService.registrarEvento({
        tablaAfectada: 'lecturas_agua',
        idRegistro: String(lecturaActualizada.idLectura),
        accion: 'REGISTRO_LECTURA_AGUA',
        resultado: 'EXITO',
        datosAnteriores,
        datosNuevos,
        idUsuario: input.idUsuario || null,
        tx,
      });

      return {
        ...lecturaActualizada,
        lecturaAnterior: Number(lecturaActualizada.lecturaAnterior),
        lecturaActual: Number(lecturaActualizada.lecturaActual),
        consumoM3: Number(lecturaActualizada.consumoM3),
        precioM3: Number(lecturaActualizada.precioM3),
        montoAgua: Number(lecturaActualizada.montoAgua),
      };
    },
    { timeout: 30000, maxWait: 15000 }
  );
}

