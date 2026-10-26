// backend/src/routes/conciliacion.routes.ts
// US1.4 (Paso 4): Módulo de Conciliación Bancaria y Cotejo
// Endpoints:
//   GET    /api/v1/conciliacion/cotejo              - Movimientos bancarios e internos para cotejo con sugerencias
//   POST   /api/v1/conciliacion/vincular            - Vincular movimiento bancario con movimiento interno
//   DELETE /api/v1/conciliacion/desvincular/:idMov  - Desvincular movimiento bancario y revertir a Pendiente
//   GET    /api/v1/conciliacion/estado              - Resumen de totales conciliados, pendientes y con discrepancia

import { Router, Response, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { requireFinanzasPermission, FINANZAS_TX_OPTIONS } from '../middlewares/finanzas-permissions.middleware';
import { resolverEstadoConciliacion } from './movimientos-bancarios.routes';
import { auditoriaService } from '../modules/auditoria';

export const conciliacionRouter: IRouter = Router();

conciliacionRouter.use(authMiddleware);

const vincularSchema = z.object({
  idMovBancario: z.number({
    required_error: 'idMovBancario es obligatorio',
    invalid_type_error: 'idMovBancario debe ser numérico',
  }).int().positive(),
  idMovimiento: z.number({
    required_error: 'idMovimiento es obligatorio',
    invalid_type_error: 'idMovimiento debe ser numérico',
  }).int().positive(),
});

// -----------------------------------------------------------------------------
// GET /api/v1/conciliacion/cotejo - Cotejo y sugerencias automáticas
// -----------------------------------------------------------------------------
conciliacionRouter.get(
  '/cotejo',
  requireFinanzasPermission('conciliacion', 'leer'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { idCuenta, desde, hasta } = req.query;

      if (!idCuenta) {
        res.status(400).json({ error: 'Bad Request', message: 'El parámetro idCuenta es obligatorio' });
        return;
      }

      const parsedIdCuenta = parseInt(String(idCuenta), 10);
      if (isNaN(parsedIdCuenta)) {
        res.status(400).json({ error: 'Bad Request', message: 'idCuenta debe ser un número entero' });
        return;
      }

      const fechaDesde = desde ? new Date(String(desde)) : undefined;
      const fechaHasta = hasta ? new Date(String(hasta)) : undefined;

      const whereBancario: any = { idCuenta: parsedIdCuenta };
      const whereInterno: any = { anulado: false };

      if (fechaDesde || fechaHasta) {
        whereBancario.fecha = {};
        whereInterno.fecha = {};
        if (fechaDesde && !isNaN(fechaDesde.getTime())) {
          whereBancario.fecha.gte = fechaDesde;
          whereInterno.fecha.gte = fechaDesde;
        }
        if (fechaHasta && !isNaN(fechaHasta.getTime())) {
          whereBancario.fecha.lte = fechaHasta;
          whereInterno.fecha.lte = fechaHasta;
        }
      }

      const [movsBancarios, movsInternos] = await Promise.all([
        prisma.movimientoBancario.findMany({
          where: whereBancario,
          orderBy: { fecha: 'asc' },
          include: {
            movimiento: {
              select: {
                idMovimiento: true,
                tipo: true,
                monto: true,
                descripcion: true,
                fecha: true,
                anulado: true,
              },
            },
          },
        }),
        prisma.movimiento.findMany({
          where: whereInterno,
          orderBy: { fecha: 'asc' },
          include: {
            categoria: { select: { idCategoria: true, nombre: true, tipo: true } },
            movimientosBancarios: { select: { idMovBancario: true, idCuenta: true } },
          },
        }),
      ]);

      // Identificar IDs de movimientos internos ya vinculados
      const idsInternosVinculados = new Set<number>();
      for (const mb of movsBancarios) {
        if (mb.idMovimiento) {
          idsInternosVinculados.add(mb.idMovimiento);
        }
      }

      // Preparar cotejo con sugerencias automáticas (misma naturaleza, mismo monto, fecha ±3 días)
      const TRES_DIAS_MS = 3 * 24 * 60 * 60 * 1000;

      const bancariosFormateados = movsBancarios.map((mb) => {
        const estado = resolverEstadoConciliacion(mb);
        let sugerencia: any = null;

        if (estado === 'Pendiente') {
          const montoBan = Number(mb.monto);
          const fechaBan = new Date(mb.fecha).getTime();
          const tipoEsperado = mb.tipo === 'Deposito' ? 'Ingreso' : 'Egreso';

          // Buscar coincidencia en movimientos internos no vinculados
          const candidato = movsInternos.find((mi) => {
            if (idsInternosVinculados.has(mi.idMovimiento)) return false;
            if (mi.tipo !== tipoEsperado) return false;
            if (Number(mi.monto) !== montoBan) return false;
            const diffDias = Math.abs(fechaBan - new Date(mi.fecha).getTime());
            return diffDias <= TRES_DIAS_MS;
          });

          if (candidato) {
            sugerencia = {
              idMovimiento: candidato.idMovimiento,
              tipo: candidato.tipo,
              monto: Number(candidato.monto),
              descripcion: candidato.descripcion,
              fecha: candidato.fecha,
              diferenciaDias: Math.round(
                Math.abs(fechaBan - new Date(candidato.fecha).getTime()) / (24 * 60 * 60 * 1000)
              ),
            };
          }
        }

        return {
          idMovBancario: mb.idMovBancario,
          idCuenta: mb.idCuenta,
          idMovimiento: mb.idMovimiento,
          tipo: mb.tipo,
          monto: Number(mb.monto),
          fecha: mb.fecha,
          concepto: mb.concepto,
          referencia: mb.referencia,
          estadoConciliacion: estado,
          diferencia: mb.diferencia !== null ? Number(mb.diferencia) : null,
          fechaConciliacion: mb.fechaConciliacion,
          movimientoVinculado: mb.movimiento
            ? {
                ...mb.movimiento,
                monto: Number(mb.movimiento.monto),
              }
            : null,
          sugerencia,
        };
      });

      const internosFormateados = movsInternos.map((mi) => ({
        idMovimiento: mi.idMovimiento,
        tipo: mi.tipo,
        monto: Number(mi.monto),
        descripcion: mi.descripcion,
        fecha: mi.fecha,
        categoria: mi.categoria,
        anulado: mi.anulado,
        vinculado: mi.movimientosBancarios.length > 0,
        movimientoBancarioVinculado: mi.movimientosBancarios[0] || null,
      }));

      res.json({
        success: true,
        data: {
          idCuenta: parsedIdCuenta,
          movimientosBancarios: bancariosFormateados,
          movimientosInternos: internosFormateados,
        },
      });
    } catch (err: any) {
      console.error('Error obteniendo cotejo de conciliación:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// POST /api/v1/conciliacion/vincular - Vincular movimiento bancario con interno
// -----------------------------------------------------------------------------
conciliacionRouter.post(
  '/vincular',
  requireFinanzasPermission('conciliacion', 'escribir'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parseResult = vincularSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Datos inválidos para la vinculación',
          details: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { idMovBancario, idMovimiento } = parseResult.data;

      const [movBancario, movInterno] = await Promise.all([
        prisma.movimientoBancario.findUnique({ where: { idMovBancario } }),
        prisma.movimiento.findUnique({ where: { idMovimiento } }),
      ]);

      if (!movBancario) {
        res.status(404).json({ error: 'Not Found', message: 'Movimiento bancario no encontrado' });
        return;
      }

      if (!movInterno) {
        res.status(404).json({ error: 'Not Found', message: 'Movimiento interno no encontrado' });
        return;
      }

      // Regla: 422 si el interno está anulado
      if (movInterno.anulado) {
        res.status(422).json({
          error: 'Unprocessable Entity',
          message: 'No se puede conciliar un movimiento interno que ha sido anulado',
        });
        return;
      }

      // Regla: Deposito solo con Ingreso y Retiro con Egreso (422 si no)
      const naturalezaValida =
        (movBancario.tipo === 'Deposito' && movInterno.tipo === 'Ingreso') ||
        (movBancario.tipo === 'Retiro' && movInterno.tipo === 'Egreso');

      if (!naturalezaValida) {
        res.status(422).json({
          error: 'Unprocessable Entity',
          message: `Incompatibilidad de tipo: Un ${movBancario.tipo} solo puede conciliarse con un ${
            movBancario.tipo === 'Deposito' ? 'Ingreso' : 'Egreso'
          }, pero se recibió un ${movInterno.tipo}`,
        });
        return;
      }

      // Regla: 409 si el bancario ya está conciliado
      const estadoBancarioActual = resolverEstadoConciliacion(movBancario);
      if (estadoBancarioActual === 'Conciliado') {
        res.status(409).json({
          error: 'Conflict',
          message: 'El movimiento bancario ya se encuentra conciliado',
        });
        return;
      }

      // Regla: 409 si el movimiento interno ya está vinculado a otro movimiento bancario
      const vinculacionExistente = await prisma.movimientoBancario.findFirst({
        where: {
          idMovimiento,
          idMovBancario: { not: idMovBancario },
        },
      });

      if (vinculacionExistente) {
        res.status(409).json({
          error: 'Conflict',
          message: 'El movimiento interno ya está vinculado a otro movimiento bancario',
        });
        return;
      }

      // Cálculo de montos:
      // Montos iguales: Conciliado. Distintos: Discrepancia con diferencia = monto bancario − monto interno
      const montoBancario = Number(movBancario.monto);
      const montoInterno = Number(movInterno.monto);
      const diferencia = montoBancario - montoInterno;

      const sonMontosIguales = Math.abs(diferencia) < 0.001;
      const nuevoEstado: 'Conciliado' | 'Discrepancia' = sonMontosIguales ? 'Conciliado' : 'Discrepancia';
      const conciliadoBool = sonMontosIguales;

      const resultado = await prisma.$transaction(async (tx) => {
        const updated = await tx.movimientoBancario.update({
          where: { idMovBancario },
          data: {
            idMovimiento,
            estadoConciliacion: nuevoEstado,
            conciliado: conciliadoBool,
            diferencia: sonMontosIguales ? 0 : diferencia,
            fechaConciliacion: new Date(),
            idUsuarioConciliacion: req.user!.idUsuario,
          },
          include: {
            cuenta: { select: { idCuenta: true, banco: true, numeroCuenta: true } },
            movimiento: true,
          },
        });

        await auditoriaService.registrarEvento({
          tablaAfectada: 'movimientos_bancarios',
          idRegistro: updated.idMovBancario.toString(),
          accion: 'CONCILIACION_VINCULAR',
          resultado: 'EXITO',
          datosAnteriores: movBancario,
          datosNuevos: updated,
          idUsuario: req.user!.idUsuario,
          tx,
        });

        return updated;
      }, FINANZAS_TX_OPTIONS);

      res.json({
        success: true,
        message:
          nuevoEstado === 'Conciliado'
            ? 'Movimiento conciliado exitosamente sin discrepancias'
            : 'Movimiento vinculado con discrepancia de montos',
        data: {
          ...resultado,
          monto: Number(resultado.monto),
          diferencia: resultado.diferencia !== null ? Number(resultado.diferencia) : null,
          estadoConciliacion: nuevoEstado,
        },
      });
    } catch (err: any) {
      console.error('Error vinculando conciliación:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// DELETE /api/v1/conciliacion/desvincular/:idMovBancario - Desvincular y revertir a Pendiente
// -----------------------------------------------------------------------------
conciliacionRouter.delete(
  '/desvincular/:idMovBancario',
  requireFinanzasPermission('conciliacion', 'escribir'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.idMovBancario, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de movimiento bancario inválido' });
        return;
      }

      const existing = await prisma.movimientoBancario.findUnique({
        where: { idMovBancario: id },
      });

      if (!existing) {
        res.status(404).json({ error: 'Not Found', message: 'Movimiento bancario no encontrado' });
        return;
      }

      const desvinculado = await prisma.$transaction(async (tx) => {
        const item = await tx.movimientoBancario.update({
          where: { idMovBancario: id },
          data: {
            idMovimiento: null,
            estadoConciliacion: 'Pendiente',
            conciliado: false,
            diferencia: null,
            fechaConciliacion: null,
            idUsuarioConciliacion: null,
          },
          include: {
            cuenta: { select: { idCuenta: true, banco: true, numeroCuenta: true } },
          },
        });

        await auditoriaService.registrarEvento({
          tablaAfectada: 'movimientos_bancarios',
          idRegistro: item.idMovBancario.toString(),
          accion: 'CONCILIACION_DESVINCULAR',
          resultado: 'EXITO',
          datosAnteriores: existing,
          datosNuevos: item,
          idUsuario: req.user!.idUsuario,
          tx,
        });

        return item;
      }, FINANZAS_TX_OPTIONS);

      res.json({
        success: true,
        message: 'Movimiento bancario desvinculado y revertido a Pendiente exitosamente',
        data: {
          ...desvinculado,
          monto: Number(desvinculado.monto),
          estadoConciliacion: 'Pendiente',
        },
      });
    } catch (err: any) {
      console.error('Error desvinculando movimiento bancario:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// GET /api/v1/conciliacion/estado?idCuenta - Resumen de totales por estado
// -----------------------------------------------------------------------------
conciliacionRouter.get(
  '/estado',
  requireFinanzasPermission('conciliacion', 'leer'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { idCuenta } = req.query;

      const where: any = {};
      if (idCuenta) {
        const parsedId = parseInt(String(idCuenta), 10);
        if (!isNaN(parsedId)) where.idCuenta = parsedId;
      }

      const movs = await prisma.movimientoBancario.findMany({
        where,
      });

      let cantConciliados = 0;
      let montoConciliados = 0;

      let cantPendientes = 0;
      let montoPendientes = 0;

      let cantDiscrepancias = 0;
      let montoDiscrepancias = 0;
      let sumaDiferenciaDiscrepancias = 0;

      for (const m of movs) {
        const val = Number(m.monto);
        const est = resolverEstadoConciliacion(m);

        if (est === 'Conciliado') {
          cantConciliados++;
          montoConciliados += val;
        } else if (est === 'Discrepancia') {
          cantDiscrepancias++;
          montoDiscrepancias += val;
          sumaDiferenciaDiscrepancias += m.diferencia !== null ? Number(m.diferencia) : 0;
        } else {
          cantPendientes++;
          montoPendientes += val;
        }
      }

      res.json({
        success: true,
        data: {
          idCuenta: idCuenta ? parseInt(String(idCuenta), 10) : null,
          totalMovimientos: movs.length,
          conciliados: {
            cantidad: cantConciliados,
            totalMonto: montoConciliados,
          },
          pendientes: {
            cantidad: cantPendientes,
            totalMonto: montoPendientes,
          },
          discrepancias: {
            cantidad: cantDiscrepancias,
            totalMonto: montoDiscrepancias,
            totalDiferencia: sumaDiferenciaDiscrepancias,
          },
        },
      });
    } catch (err: any) {
      console.error('Error obteniendo estado de conciliación:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);
