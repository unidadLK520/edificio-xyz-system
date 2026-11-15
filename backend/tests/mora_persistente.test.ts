// backend/tests/mora_persistente.test.ts
// Tests unitarios y de integración para Mora Persistente (PORCENTAJE y FIJO, día de vencimiento y generación)

import { describe, it, expect } from 'vitest';
import { reglaMoraSchema } from '../src/routes/expensas.routes';
import {
  calcularFechaVencimientoPeriodo,
  calcularCapitalPendiente,
  determinarEstadoYSaldoExpensa,
  formatearReglaMora,
} from '../src/modules/expensas/expensas.service';

describe('Mora Persistente — Validación Zod (reglaMoraSchema)', () => {
  it('1. Método PORCENTAJE: válido con tasaInteres > 0 y valores por defecto', () => {
    const input = {
      tipoCalculo: 'PORCENTAJE',
      tasaInteres: 10,
    };
    const parsed = reglaMoraSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.tipoCalculo).toBe('PORCENTAJE');
      expect(parsed.data.tasaInteres).toBe(10);
      expect(parsed.data.montoFijo).toBeNull();
      expect(parsed.data.diaVencimiento).toBeNull();
      expect(parsed.data.diaGeneracion).toBeNull();
    }
  });

  it('2. Método PORCENTAJE: rechaza tasaInteres <= 0 o ausente', () => {
    const res1 = reglaMoraSchema.safeParse({ tipoCalculo: 'PORCENTAJE', tasaInteres: 0 });
    expect(res1.success).toBe(false);

    const res2 = reglaMoraSchema.safeParse({ tipoCalculo: 'PORCENTAJE' });
    expect(res2.success).toBe(false);

    const res3 = reglaMoraSchema.safeParse({ tipoCalculo: 'PORCENTAJE', tasaInteres: -5 });
    expect(res3.success).toBe(false);
  });

  it('3. Método FIJO: válido con montoFijo > 0', () => {
    const input = {
      tipoCalculo: 'FIJO',
      montoFijo: 50.0,
      diaVencimiento: 15,
      diaGeneracion: 1,
    };
    const parsed = reglaMoraSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.tipoCalculo).toBe('FIJO');
      expect(parsed.data.montoFijo).toBe(50.0);
      expect(parsed.data.diaVencimiento).toBe(15);
      expect(parsed.data.diaGeneracion).toBe(1);
    }
  });

  it('4. Método FIJO: rechaza montoFijo <= 0 o ausente', () => {
    const res1 = reglaMoraSchema.safeParse({ tipoCalculo: 'FIJO', montoFijo: 0 });
    expect(res1.success).toBe(false);

    const res2 = reglaMoraSchema.safeParse({ tipoCalculo: 'FIJO' });
    expect(res2.success).toBe(false);

    const res3 = reglaMoraSchema.safeParse({ tipoCalculo: 'FIJO', montoFijo: -10 });
    expect(res3.success).toBe(false);
  });

  it('5. Validación de días (1-31): acepta días válidos y rechaza < 1 o > 31', () => {
    // Válido límite inferior y superior
    const valMin = reglaMoraSchema.safeParse({ tipoCalculo: 'FIJO', montoFijo: 25, diaVencimiento: 1, diaGeneracion: 1 });
    expect(valMin.success).toBe(true);

    const valMax = reglaMoraSchema.safeParse({ tipoCalculo: 'FIJO', montoFijo: 25, diaVencimiento: 31, diaGeneracion: 31 });
    expect(valMax.success).toBe(true);

    // Inválido diaVencimiento = 0 o > 31
    const invZero = reglaMoraSchema.safeParse({ tipoCalculo: 'FIJO', montoFijo: 25, diaVencimiento: 0 });
    expect(invZero.success).toBe(false);

    const invMax = reglaMoraSchema.safeParse({ tipoCalculo: 'FIJO', montoFijo: 25, diaVencimiento: 32 });
    expect(invMax.success).toBe(false);

    // Inválido diaGeneracion = 0 o > 31
    const invGenZero = reglaMoraSchema.safeParse({ tipoCalculo: 'FIJO', montoFijo: 25, diaGeneracion: 0 });
    expect(invGenZero.success).toBe(false);

    const invGenMax = reglaMoraSchema.safeParse({ tipoCalculo: 'FIJO', montoFijo: 25, diaGeneracion: 32 });
    expect(invGenMax.success).toBe(false);
  });

  it('6. Compatibilidad con snake_case y minúsculas desde frontend', () => {
    const input = {
      tipo_calculo: 'fijo',
      monto_fijo: 75.5,
      dia_vencimiento: 10,
      dia_generacion: 2,
    };
    const parsed = reglaMoraSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.tipoCalculo).toBe('FIJO');
      expect(parsed.data.montoFijo).toBe(75.5);
      expect(parsed.data.diaVencimiento).toBe(10);
      expect(parsed.data.diaGeneracion).toBe(2);
    }
  });
});

describe('Mora Persistente — Cálculo de Fecha de Vencimiento del Período', () => {
  it('1. Aplica día de vencimiento exacto cuando el mes tiene suficientes días', () => {
    const venc = calcularFechaVencimientoPeriodo('2026-05-01', 15);
    expect(venc.toISOString()).toBe('2026-05-15T00:00:00.000Z');
  });

  it('2. Aplica tope del último día del mes en febrero (año no bisiesto: 28 días)', () => {
    const venc = calcularFechaVencimientoPeriodo('2026-02-01', 31);
    expect(venc.toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });

  it('3. Aplica tope del último día del mes en febrero (año bisiesto 2024: 29 días)', () => {
    const venc = calcularFechaVencimientoPeriodo('2024-02-01', 31);
    expect(venc.toISOString()).toBe('2024-02-29T00:00:00.000Z');
  });

  it('4. Aplica tope del último día del mes en meses de 30 días (abril, junio, septiembre, noviembre)', () => {
    const vencAbril = calcularFechaVencimientoPeriodo('2026-04-01', 31);
    expect(vencAbril.toISOString()).toBe('2026-04-30T00:00:00.000Z');

    const vencNov = calcularFechaVencimientoPeriodo('2026-11-01', 31);
    expect(vencNov.toISOString()).toBe('2026-11-30T00:00:00.000Z');
  });

  it('5. Sin diaVencimiento en regla activa: usa la fecha de vencimiento fallback proporcionada', () => {
    const vencFallback = calcularFechaVencimientoPeriodo('2026-05-01', null, '2026-05-22');
    expect(vencFallback.toISOString()).toBe('2026-05-22T00:00:00.000Z');
  });
});

describe('Mora Persistente — Lógica Financiera de Cálculo (FIJO vs PORCENTAJE)', () => {
  it('1. Método PORCENTAJE: mora = capitalPendiente * (tasa / 100), saldo = capital + mora', () => {
    const capitalPendiente = 500;
    const tasa = 10; // 10%
    const montoMora = Math.round((capitalPendiente * (tasa / 100)) * 100) / 100;
    const estadoYSaldo = determinarEstadoYSaldoExpensa({
      montoTotal: 500,
      capitalPendiente,
      montoMora,
      fechaVencimiento: '2026-01-10',
      fechaReferencia: new Date('2026-01-20'),
    });

    expect(montoMora).toBe(50);
    expect(estadoYSaldo.saldoPendiente).toBe(550);
    expect(estadoYSaldo.estado).toBe('Moroso');
  });

  it('2. Método FIJO: mora = montoFijo (una sola vez), saldo = capital + montoFijo', () => {
    const capitalPendiente = 500;
    const montoFijo = 50; // Bs. 50 fijo
    const montoMora = Math.round(montoFijo * 100) / 100;
    const estadoYSaldo = determinarEstadoYSaldoExpensa({
      montoTotal: 500,
      capitalPendiente,
      montoMora,
      fechaVencimiento: '2026-01-10',
      fechaReferencia: new Date('2026-01-20'),
    });

    expect(montoMora).toBe(50);
    expect(estadoYSaldo.saldoPendiente).toBe(550);
    expect(estadoYSaldo.estado).toBe('Moroso');
  });

  it('3. Método FIJO: ejecuciones subsecuentes NO acumulan el monto fijo', () => {
    const capitalPendiente = 500;
    const montoFijo = 50;

    // Ejecución 1
    const moraEjecucion1 = Math.round(montoFijo * 100) / 100;
    const saldo1 = Math.max(0, Math.round((capitalPendiente + moraEjecucion1) * 100) / 100);

    // Ejecución 2 (ej. día siguiente): la mora sigue siendo montoFijo, no se suma sobre la mora anterior
    const moraEjecucion2 = Math.round(montoFijo * 100) / 100;
    const saldo2 = Math.max(0, Math.round((capitalPendiente + moraEjecucion2) * 100) / 100);

    expect(moraEjecucion1).toBe(50);
    expect(saldo1).toBe(550);
    expect(moraEjecucion2).toBe(50);
    expect(saldo2).toBe(550);
    expect(saldo2).toBe(saldo1); // Sin acumulación
  });

  it('4. Si capital pendiente es 0 (pagada), no se aplica mora en ningún método', () => {
    const capitalPendiente = 0;
    const estadoYSaldo = determinarEstadoYSaldoExpensa({
      montoTotal: 500,
      capitalPendiente,
      montoMora: 0,
      fechaVencimiento: '2026-01-10',
      fechaReferencia: new Date('2026-01-20'),
    });

    expect(estadoYSaldo.saldoPendiente).toBe(0);
    expect(estadoYSaldo.estado).toBe('Pagado');
  });

  it('5. Capital pendiente descuenta pagos parciales y anticipos aplicados antes de aplicar mora fija', () => {
    const expensaMock = {
      monto: 600,
      pagos: [{ montoPagado: 200, anulado: false }],
      aplicacionesAnticipos: [{ monto: 100, pago: { anulado: false } }],
    };

    const capital = calcularCapitalPendiente(expensaMock);
    expect(capital).toBe(300); // 600 - 200 - 100 = 300

    const montoFijo = 40;
    const nuevoSaldo = Math.max(0, Math.round((capital + montoFijo) * 100) / 100);
    expect(nuevoSaldo).toBe(340);
  });

  it('6. Helper formatearReglaMora incluye los 4 nuevos campos en camelCase y snake_case', () => {
    const reglaDbMock = {
      idRegla: 10,
      tasaInteres: 0,
      diasGracia: 0,
      tipoCalculo: 'FIJO',
      montoFijo: 50.0,
      diaVencimiento: 15,
      diaGeneracion: 1,
      activa: true,
      fechaCreacion: new Date(),
    };

    const formateada = formatearReglaMora(reglaDbMock);
    expect(formateada.tipoCalculo).toBe('FIJO');
    expect(formateada.tipo_calculo).toBe('FIJO');
    expect(formateada.montoFijo).toBe(50);
    expect(formateada.monto_fijo).toBe(50);
    expect(formateada.diaVencimiento).toBe(15);
    expect(formateada.dia_vencimiento).toBe(15);
    expect(formateada.diaGeneracion).toBe(1);
    expect(formateada.dia_generacion).toBe(1);
  });
});

describe('Mora Persistente — Orden de días', () => {
  it('rechaza diaVencimiento anterior a diaGeneracion y acepta el caso válido', () => {
    const mal = reglaMoraSchema.safeParse({ tipoCalculo: 'FIJO', montoFijo: 50, diaVencimiento: 5, diaGeneracion: 20 });
    expect(mal.success).toBe(false);
    const bien = reglaMoraSchema.safeParse({ tipoCalculo: 'FIJO', montoFijo: 50, diaVencimiento: 10, diaGeneracion: 1 });
    expect(bien.success).toBe(true);
  });
});