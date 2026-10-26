// backend/src/routes/cuentas-bancarias.routes.ts
// US1.4 (Paso 3): Módulo de Cuentas Bancarias
// Endpoints:
//   GET    /api/v1/cuentas-bancarias           - Listar cuentas con saldo calculado (saldo_inicial + depósitos - retiros)
//   POST   /api/v1/cuentas-bancarias           - Crear cuenta (numero_cuenta único, 409)
//   GET    /api/v1/cuentas-bancarias/:id       - Detalle de cuenta con saldo calculado
//   PUT    /api/v1/cuentas-bancarias/:id       - Actualizar cuenta (409 si numero_cuenta duplicado)
//   GET    /api/v1/cuentas-bancarias/:id/saldo - Saldo recalculado del período y saldo total disponible

import { Router, Response, IRouter } from 'express';
import { prisma } from '@edificio-xyz/database';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { requireFinanzasPermission, FINANZAS_TX_OPTIONS } from '../middlewares/finanzas-permissions.middleware';
import { auditoriaService } from '../modules/auditoria';

export const cuentasBancariasRouter: IRouter = Router();

cuentasBancariasRouter.use(authMiddleware);

// Schemas de validación
const cuentaBancariaSchema = z.object({
  banco: z.string({
    required_error: 'El banco es obligatorio',
    invalid_type_error: 'El banco debe ser una cadena de texto',
  }).trim().min(1, 'El banco es obligatorio').max(80, 'El banco no puede exceder 80 caracteres'),
  numeroCuenta: z.string({
    required_error: 'El número de cuenta es obligatorio',
    invalid_type_error: 'El número de cuenta debe ser una cadena de texto',
  }).trim().min(1, 'El número de cuenta es obligatorio').max(50, 'El número de cuenta no puede exceder 50 caracteres'),
  tipoCuenta: z.string().trim().max(30).optional().nullable(),
  saldoInicial: z.number({
    invalid_type_error: 'El saldo inicial debe ser numérico',
  }).optional().default(0),
});

const cuentaBancariaUpdateSchema = z.object({
  banco: z.string().trim().min(1).max(80).optional(),
  numeroCuenta: z.string().trim().min(1).max(50).optional(),
  tipoCuenta: z.string().trim().max(30).optional().nullable(),
  saldoInicial: z.number().optional(),
});

/**
 * Helper para calcular saldo de una cuenta:
 * Saldo = saldo_inicial + depósitos − retiros (NO usar saldo_actual)
 */
async function calcularSaldoCuenta(idCuenta: number, saldoInicialBase: number): Promise<{
  saldoCalculado: number;
  totalDepositos: number;
  totalRetiros: number;
}> {
  const movs = await prisma.movimientoBancario.findMany({
    where: { idCuenta },
  });

  let totalDepositos = 0;
  let totalRetiros = 0;

  for (const m of movs) {
    const val = Number(m.monto);
    if (m.tipo === 'Deposito') totalDepositos += val;
    else if (m.tipo === 'Retiro') totalRetiros += val;
  }

  const saldoCalculado = saldoInicialBase + totalDepositos - totalRetiros;
  return { saldoCalculado, totalDepositos, totalRetiros };
}

// -----------------------------------------------------------------------------
// GET /api/v1/cuentas-bancarias - Listar cuentas con saldo calculado
// -----------------------------------------------------------------------------
cuentasBancariasRouter.get(
  '/',
  requireFinanzasPermission('cuentas_bancarias', 'leer'),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const cuentas = await prisma.cuentaBancaria.findMany({
        orderBy: { idCuenta: 'asc' },
      });

      const cuentasConSaldo = await Promise.all(
        cuentas.map(async (c) => {
          const { saldoCalculado, totalDepositos, totalRetiros } = await calcularSaldoCuenta(
            c.idCuenta,
            Number(c.saldoInicial)
          );
          return {
            ...c,
            saldoInicial: Number(c.saldoInicial),
            saldoCalculado,
            totalDepositos,
            totalRetiros,
            // Sobrescribimos saldoActual para garantizar que refleja el cálculo dinámico
            saldoActual: saldoCalculado,
          };
        })
      );

      res.json({
        success: true,
        data: cuentasConSaldo,
      });
    } catch (err: any) {
      console.error('Error listando cuentas bancarias:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// POST /api/v1/cuentas-bancarias - Crear cuenta bancaria
// -----------------------------------------------------------------------------
cuentasBancariasRouter.post(
  '/',
  requireFinanzasPermission('cuentas_bancarias', 'escribir'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parseResult = cuentaBancariaSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Datos inválidos para la cuenta bancaria',
          details: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { banco, numeroCuenta, tipoCuenta, saldoInicial = 0 } = parseResult.data;

      // Verificar unicidad de numero_cuenta (409)
      const existing = await prisma.cuentaBancaria.findUnique({
        where: { numeroCuenta },
      });

      if (existing) {
        res.status(409).json({
          error: 'Conflict',
          message: `El número de cuenta "${numeroCuenta}" ya se encuentra registrado.`,
        });
        return;
      }

      const nuevaCuenta = await prisma.$transaction(async (tx) => {
        const cuenta = await tx.cuentaBancaria.create({
          data: {
            banco,
            numeroCuenta,
            tipoCuenta: tipoCuenta ?? null,
            saldoInicial,
            saldoActual: saldoInicial,
          },
        });

        await auditoriaService.registrarEvento({
          tablaAfectada: 'cuentas_bancarias',
          idRegistro: cuenta.idCuenta.toString(),
          accion: 'CONFIGURAR_CUENTA_BANCARIA',
          resultado: 'EXITO',
          datosNuevos: cuenta,
          idUsuario: req.user!.idUsuario,
          tx,
        });

        return cuenta;
      }, FINANZAS_TX_OPTIONS);

      res.status(201).json({
        success: true,
        message: 'Cuenta bancaria registrada exitosamente',
        data: {
          ...nuevaCuenta,
          saldoInicial: Number(nuevaCuenta.saldoInicial),
          saldoCalculado: Number(nuevaCuenta.saldoInicial),
        },
      });
    } catch (err: any) {
      console.error('Error registrando cuenta bancaria:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// GET /api/v1/cuentas-bancarias/:id/saldo - Saldo recalculado del período y disponible
// (Declarada antes de /:id para evitar colisiones de rutas)
// -----------------------------------------------------------------------------
cuentasBancariasRouter.get(
  '/:id/saldo',
  requireFinanzasPermission('cuentas_bancarias', 'leer'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de cuenta inválido' });
        return;
      }

      const cuenta = await prisma.cuentaBancaria.findUnique({
        where: { idCuenta: id },
      });

      if (!cuenta) {
        res.status(404).json({ error: 'Not Found', message: 'Cuenta bancaria no encontrada' });
        return;
      }

      const { desde, hasta } = req.query;
      const fechaDesde = desde ? new Date(String(desde)) : undefined;
      const fechaHasta = hasta ? new Date(String(hasta)) : undefined;

      if (fechaDesde && isNaN(fechaDesde.getTime())) {
        res.status(400).json({ error: 'Bad Request', message: 'Parámetro "desde" inválido' });
        return;
      }
      if (fechaHasta && isNaN(fechaHasta.getTime())) {
        res.status(400).json({ error: 'Bad Request', message: 'Parámetro "hasta" inválido' });
        return;
      }

      const saldoInicialBase = Number(cuenta.saldoInicial);
      const movs = await prisma.movimientoBancario.findMany({
        where: { idCuenta: id },
        orderBy: { fecha: 'asc' },
      });

      let depositosHistoricos = 0;
      let retirosHistoricos = 0;
      let depositosPrevios = 0;
      let retirosPrevios = 0;
      let depositosPeriodo = 0;
      let retirosPeriodo = 0;

      for (const m of movs) {
        const val = Number(m.monto);
        const mFecha = new Date(m.fecha);

        if (m.tipo === 'Deposito') depositosHistoricos += val;
        else if (m.tipo === 'Retiro') retirosHistoricos += val;

        if (fechaDesde && mFecha < fechaDesde) {
          if (m.tipo === 'Deposito') depositosPrevios += val;
          else if (m.tipo === 'Retiro') retirosPrevios += val;
        }

        const cumpleDesde = !fechaDesde || mFecha >= fechaDesde;
        const cumpleHasta = !fechaHasta || mFecha <= fechaHasta;
        if (cumpleDesde && cumpleHasta) {
          if (m.tipo === 'Deposito') depositosPeriodo += val;
          else if (m.tipo === 'Retiro') retirosPeriodo += val;
        }
      }

      const saldoInicialPeriodo = saldoInicialBase + depositosPrevios - retirosPrevios;
      const saldoFinalPeriodo = saldoInicialPeriodo + depositosPeriodo - retirosPeriodo;
      const saldoDisponibleActual = saldoInicialBase + depositosHistoricos - retirosHistoricos;

      res.json({
        success: true,
        data: {
          idCuenta: cuenta.idCuenta,
          banco: cuenta.banco,
          numeroCuenta: cuenta.numeroCuenta,
          saldoInicial: saldoInicialPeriodo,
          totalDepositos: depositosPeriodo,
          totalRetiros: retirosPeriodo,
          saldoFinal: saldoFinalPeriodo,
          saldoDisponibleActual,
          periodo: {
            desde: fechaDesde ? fechaDesde.toISOString() : null,
            hasta: fechaHasta ? fechaHasta.toISOString() : null,
          },
        },
      });
    } catch (err: any) {
      console.error('Error calculando saldo de cuenta bancaria:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// GET /api/v1/cuentas-bancarias/:id - Detalle con saldo calculado
// -----------------------------------------------------------------------------
cuentasBancariasRouter.get(
  '/:id',
  requireFinanzasPermission('cuentas_bancarias', 'leer'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de cuenta inválido' });
        return;
      }

      const cuenta = await prisma.cuentaBancaria.findUnique({
        where: { idCuenta: id },
      });

      if (!cuenta) {
        res.status(404).json({ error: 'Not Found', message: 'Cuenta bancaria no encontrada' });
        return;
      }

      const { saldoCalculado, totalDepositos, totalRetiros } = await calcularSaldoCuenta(
        cuenta.idCuenta,
        Number(cuenta.saldoInicial)
      );

      res.json({
        success: true,
        data: {
          ...cuenta,
          saldoInicial: Number(cuenta.saldoInicial),
          saldoCalculado,
          totalDepositos,
          totalRetiros,
          saldoActual: saldoCalculado,
        },
      });
    } catch (err: any) {
      console.error('Error obteniendo cuenta bancaria:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);

// -----------------------------------------------------------------------------
// PUT /api/v1/cuentas-bancarias/:id - Modificar cuenta bancaria
// -----------------------------------------------------------------------------
cuentasBancariasRouter.put(
  '/:id',
  requireFinanzasPermission('cuentas_bancarias', 'escribir'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de cuenta inválido' });
        return;
      }

      const parseResult = cuentaBancariaUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Datos inválidos para actualizar cuenta bancaria',
          details: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const existing = await prisma.cuentaBancaria.findUnique({
        where: { idCuenta: id },
      });

      if (!existing) {
        res.status(404).json({ error: 'Not Found', message: 'Cuenta bancaria no encontrada' });
        return;
      }

      const { banco, numeroCuenta, tipoCuenta, saldoInicial } = parseResult.data;

      // Si modifica numeroCuenta, validar que no choque con otra (409)
      if (numeroCuenta && numeroCuenta !== existing.numeroCuenta) {
        const duplicate = await prisma.cuentaBancaria.findUnique({
          where: { numeroCuenta },
        });
        if (duplicate && duplicate.idCuenta !== id) {
          res.status(409).json({
            error: 'Conflict',
            message: `El número de cuenta "${numeroCuenta}" ya pertenece a otra cuenta.`,
          });
          return;
        }
      }

      const cuentaActualizada = await prisma.$transaction(async (tx) => {
        const updated = await tx.cuentaBancaria.update({
          where: { idCuenta: id },
          data: {
            banco: banco ?? existing.banco,
            numeroCuenta: numeroCuenta ?? existing.numeroCuenta,
            tipoCuenta: tipoCuenta !== undefined ? tipoCuenta : existing.tipoCuenta,
            saldoInicial: saldoInicial !== undefined ? saldoInicial : existing.saldoInicial,
          },
        });

        await auditoriaService.registrarEvento({
          tablaAfectada: 'cuentas_bancarias',
          idRegistro: updated.idCuenta.toString(),
          accion: 'CONFIGURAR_CUENTA_BANCARIA',
          resultado: 'EXITO',
          datosAnteriores: existing,
          datosNuevos: updated,
          idUsuario: req.user!.idUsuario,
          tx,
        });

        return updated;
      }, FINANZAS_TX_OPTIONS);

      const { saldoCalculado, totalDepositos, totalRetiros } = await calcularSaldoCuenta(
        cuentaActualizada.idCuenta,
        Number(cuentaActualizada.saldoInicial)
      );

      res.json({
        success: true,
        message: 'Cuenta bancaria actualizada correctamente',
        data: {
          ...cuentaActualizada,
          saldoInicial: Number(cuentaActualizada.saldoInicial),
          saldoCalculado,
          totalDepositos,
          totalRetiros,
          saldoActual: saldoCalculado,
        },
      });
    } catch (err: any) {
      console.error('Error actualizando cuenta bancaria:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
);
