// backend/tests/expensas_bloque3.test.ts
// Tests unitarios y de integración para Bloque 3 (validaciones 422, campo vencida y 409 en duplicados)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { prisma } from '@edificio-xyz/database';
import { app } from '../src/index';
import { generarTokenPrueba } from './setup';

// Mock de prisma para pruebas unitarias de capa HTTP rápidas y aisladas sin depender de postgres local
vi.mock('@edificio-xyz/database', () => {
  const mockPrisma = {
    expensa: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    pago: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    departamento: {
      findUnique: vi.fn(),
    },
    persona: {
      findUnique: vi.fn(),
    },
    aplicacionAnticipo: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { prisma: mockPrisma };
});

describe('BLOQUE 3: Reglas de Negocio de Pagos, Expensas Vencidas y Control de Duplicados', () => {
  let adminToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    adminToken = await generarTokenPrueba(1, 'admin@edificioxyz.com', 'Administrador');
    (prisma.persona.findUnique as any).mockResolvedValue({
      idPersona: 1,
      nombres: 'Juan',
      apellidos: 'Perez',
    });
  });

  // ── a) Validaciones 422 en POST /expensas/:id/pagos ──────────────────────────
  describe('a) POST /api/v1/expensas/:id/pagos - Validaciones 422', () => {
    it('Debe retornar 422 si falta idPersonaPagador', async () => {
      const res = await request(app)
        .post('/api/v1/expensas/10/pagos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          montoPagado: 100,
          metodoPago: 'Efectivo',
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('idPersonaPagador es obligatorio');
    });

    it('Debe retornar 422 si la persona pagadora no existe', async () => {
      (prisma.persona.findUnique as any).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/expensas/10/pagos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idPersonaPagador: 999,
          montoPagado: 100,
          metodoPago: 'Efectivo',
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('no existe');
    });

    it('Debe retornar 422 si montoPagado <= 0', async () => {
      (prisma.expensa.findUnique as any).mockResolvedValue({
        idExpensa: 10,
        idDepartamento: 1,
        saldoPendiente: 500,
        estado: 'Pendiente',
      });

      const res = await request(app)
        .post('/api/v1/expensas/10/pagos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idPersonaPagador: 1,
          montoPagado: 0,
          metodoPago: 'Efectivo',
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('mayor a cero');
    });

    it('Debe retornar 422 si la expensa ya se encuentra totalmente Pagada', async () => {
      (prisma.expensa.findUnique as any).mockResolvedValue({
        idExpensa: 10,
        idDepartamento: 1,
        saldoPendiente: 0,
        estado: 'Pagado',
      });

      const res = await request(app)
        .post('/api/v1/expensas/10/pagos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idPersonaPagador: 1,
          montoPagado: 100,
          metodoPago: 'Efectivo',
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('totalmente pagada');
    });

    it('Debe retornar 422 si montoPagado excede el saldoPendiente', async () => {
      (prisma.expensa.findUnique as any).mockResolvedValue({
        idExpensa: 10,
        idDepartamento: 1,
        saldoPendiente: 300,
        estado: 'Pendiente',
      });

      const res = await request(app)
        .post('/api/v1/expensas/10/pagos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idPersonaPagador: 1,
          montoPagado: 450,
          metodoPago: 'Efectivo',
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('no puede exceder el saldo pendiente');
    });
  });

  // ── a.2) Validaciones 422 en PATCH /pagos/:idPago/corregir ────────────────────
  describe('a.2) PATCH /api/v1/expensas/pagos/:idPago/corregir - Validaciones 422', () => {
    it('Debe retornar 422 si falta idPersonaPagador en corrección', async () => {
      const res = await request(app)
        .patch('/api/v1/expensas/pagos/55/corregir')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          motivo: 'Error de tipeo',
          montoPagado: 100,
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('idPersonaPagador es obligatorio');
    });

    it('Debe retornar 422 si la persona pagadora no existe en corrección', async () => {
      (prisma.persona.findUnique as any).mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/v1/expensas/pagos/55/corregir')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idPersonaPagador: 999,
          motivo: 'Error de tipeo',
          montoPagado: 100,
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('no existe');
    });

    it('Debe retornar 422 si montoPagado en corrección <= 0', async () => {
      const res = await request(app)
        .patch('/api/v1/expensas/pagos/55/corregir')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idPersonaPagador: 1,
          motivo: 'Error de tipeo',
          montoPagado: 0,
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('mayor a cero');
    });

    it('Debe retornar 422 si el monto corregido excede el saldo pendiente sin el pago original', async () => {
      // Mock de transacción para simular error de monto que excede saldo
      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        const txMock = {
          pago: {
            findUnique: vi.fn().mockResolvedValue({
              idPago: 55,
              idExpensa: 10,
              montoPagado: 100,
              anulado: false,
              expensa: { idExpensa: 10, saldoPendiente: 200 },
            }),
            update: vi.fn().mockResolvedValue({
              idPago: 55,
              idExpensa: 10,
              anulado: true,
            }),
          },
          expensa: {
            findUnique: vi.fn().mockResolvedValue({
              idExpensa: 10,
              monto: 500,
              montoMora: 0,
              pagos: [],
              aplicacionesAnticipos: [],
            }),
            update: vi.fn().mockResolvedValue({
              idExpensa: 10,
              saldoPendiente: 300,
              estado: 'Pendiente',
            }),
          },
          aplicacionAnticipo: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          auditoria: {
            create: vi.fn().mockResolvedValue({ idAuditoria: 1 }),
          },
        };
        return await callback(txMock);
      });

      const res = await request(app)
        .patch('/api/v1/expensas/pagos/55/corregir')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idPersonaPagador: 1,
          motivo: 'Corrección de monto',
          montoPagado: 999999, // Excede enormemente el saldo de la expensa
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toContain('no puede exceder el saldo pendiente');
    });
  });

  // ── b) Campo aditivo vencida y filtro ?vencida=true ───────────────────────────
  describe('b) GET /api/v1/expensas y GET /:id - Campo aditivo vencida y filtro', () => {
    it('GET /api/v1/expensas/:id debe incluir campo booleano vencida', async () => {
      const fechaAyer = new Date();
      fechaAyer.setDate(fechaAyer.getDate() - 1);

      (prisma.expensa.findUnique as any).mockResolvedValue({
        idExpensa: 20,
        monto: 500,
        saldoPendiente: 500,
        fechaVencimiento: fechaAyer,
        estado: 'Moroso',
      });

      const res = await request(app)
        .get('/api/v1/expensas/20')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('vencida');
      expect(res.body.vencida).toBe(true);
    });

    it('GET /api/v1/expensas?vencida=true debe filtrar por vencimiento pasado y saldo > 0', async () => {
      const fechaAyer = new Date();
      fechaAyer.setDate(fechaAyer.getDate() - 2);

      (prisma.expensa.findMany as any).mockResolvedValue([
        {
          idExpensa: 21,
          monto: 400,
          saldoPendiente: 400,
          fechaVencimiento: fechaAyer,
          estado: 'Moroso',
        },
      ]);
      (prisma.expensa.count as any).mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/expensas?vencida=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0]).toHaveProperty('vencida', true);
      // Validar que prisma.findMany recibió filtro where con fechaVencimiento y saldoPendiente
      const findManyCall = (prisma.expensa.findMany as any).mock.calls[0][0];
      expect(findManyCall.where).toHaveProperty('fechaVencimiento');
      expect(findManyCall.where).toHaveProperty('saldoPendiente');
    });
  });

  // ── c) POST /expensas individual: 409 si ya existe periodo/depto ─────────────
  describe('c) POST /api/v1/expensas - 409 en duplicados (departamento + período)', () => {
    it('Debe retornar 409 Conflict si ya existe expensa para el departamento en el periodo', async () => {
      (prisma.expensa.findFirst as any).mockResolvedValue({
        idExpensa: 99,
        idDepartamento: 1,
        periodo: new Date('2026-10-01T00:00:00.000Z'),
      });

      const res = await request(app)
        .post('/api/v1/expensas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          idDepartamento: 1,
          periodo: '2026-10-01',
          monto: 500,
          fechaVencimiento: '2026-10-25',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Conflict');
      expect(res.body.message).toContain('Ya existe una expensa registrada para el departamento');
    });
  });
});
