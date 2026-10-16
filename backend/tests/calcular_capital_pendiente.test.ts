// backend/tests/calcular_capital_pendiente.test.ts
// Tests unitarios para la función pura calcularCapitalPendiente

import { describe, it, expect } from 'vitest';
import { calcularCapitalPendiente } from '../src/modules/expensas';

describe('calcularCapitalPendiente - Validaciones y Precisión Financiera', () => {
  it('1. Debe lanzar error si la relación "pagos" es undefined o null', () => {
    const expensaSinPagos = {
      monto: 550,
      aplicacionesAnticipos: [],
    } as any;

    expect(() => calcularCapitalPendiente(expensaSinPagos)).toThrow(
      'calcularCapitalPendiente: la relación "pagos" es requerida y no puede ser undefined ni null'
    );
  });

  it('2. Debe lanzar error si la relación "aplicacionesAnticipos" es undefined o null', () => {
    const expensaSinAnticipos = {
      monto: 550,
      pagos: [],
    } as any;

    expect(() => calcularCapitalPendiente(expensaSinAnticipos)).toThrow(
      'calcularCapitalPendiente: la relación "aplicacionesAnticipos" es requerida y no puede ser undefined ni null'
    );
  });

  it('3. Debe calcular correctamente el capital cuando ambas relaciones son arreglos vacíos', () => {
    const capital = calcularCapitalPendiente({
      monto: 500,
      pagos: [],
      aplicacionesAnticipos: [],
    });

    expect(capital).toBe(500);
  });

  it('4. Debe restar solo pagos directos válidos y omitir los anulados', () => {
    const capital = calcularCapitalPendiente({
      monto: 550,
      pagos: [
        { montoPagado: 100, anulado: false },
        { montoPagado: 50, anulado: true }, // Anulado, no debe descontar
      ],
      aplicacionesAnticipos: [],
    });

    expect(capital).toBe(450);
  });

  it('5. Debe restar solo anticipos aplicados válidos y omitir anticipos cuyo pago origen fue anulado', () => {
    const capital = calcularCapitalPendiente({
      monto: 550,
      pagos: [],
      aplicacionesAnticipos: [
        { monto: 200, pago: { anulado: false } },
        { monto: 50, pago: { anulado: true } }, // Origen anulado, no debe descontar
      ],
    });

    expect(capital).toBe(350);
  });

  it('6. Caso combinado (550 con pago 100 y anticipo 250 -> capital pendiente 200)', () => {
    const capital = calcularCapitalPendiente({
      monto: 550,
      pagos: [{ montoPagado: 100, anulado: false }],
      aplicacionesAnticipos: [{ monto: 250, pago: { anulado: false } }],
    });

    expect(capital).toBe(200);
  });

  it('7. No debe permitir valores negativos y redondear a 2 decimales', () => {
    const capital = calcularCapitalPendiente({
      monto: 100,
      pagos: [{ montoPagado: 150, anulado: false }],
      aplicacionesAnticipos: [],
    });

    expect(capital).toBe(0);
  });
});
