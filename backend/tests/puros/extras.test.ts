// backend/tests/puros/extras.test.ts
// Tests unitarios puros para esquemas de validación Zod de cargos extras y montos de agua

import { describe, it, expect } from 'vitest';
import { extraExpensaSchema } from '../../src/routes/expensas.routes';
import { itemMontoAguaSchema, registrarMontosSchema } from '../../src/routes/agua.routes';

describe('Validación Zod: extraExpensaSchema', () => {
  it('debe aceptar un cargo extra válido con concepto y monto', () => {
    const data = {
      concepto: 'Pintura de pasillo',
      monto: 150.5,
    };
    const result = extraExpensaSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.concepto).toBe('Pintura de pasillo');
      expect(result.data.monto).toBe(150.5);
      expect(result.data.descripcion).toBeUndefined();
    }
  });

  it('debe aceptar un cargo extra con descripción opcional', () => {
    const data = {
      concepto: 'Mantenimiento ascensor',
      descripcion: 'Reparación de botonera piso 4',
      monto: 350,
    };
    const result = extraExpensaSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.descripcion).toBe('Reparación de botonera piso 4');
    }
  });

  it('debe aceptar descripción null', () => {
    const data = {
      concepto: 'Cuota extraordinaria',
      descripcion: null,
      monto: 200,
    };
    const result = extraExpensaSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.descripcion).toBeNull();
    }
  });

  it('debe rechazar concepto vacío o con solo espacios', () => {
    const resultVacio = extraExpensaSchema.safeParse({ concepto: '', monto: 50 });
    expect(resultVacio.success).toBe(false);

    const resultEspacios = extraExpensaSchema.safeParse({ concepto: '   ', monto: 50 });
    expect(resultEspacios.success).toBe(false);
  });

  it('debe rechazar concepto mayor a 100 caracteres', () => {
    const result = extraExpensaSchema.safeParse({
      concepto: 'a'.repeat(101),
      monto: 50,
    });
    expect(result.success).toBe(false);
  });

  it('debe rechazar descripción mayor a 200 caracteres', () => {
    const result = extraExpensaSchema.safeParse({
      concepto: 'Arreglo tubería',
      descripcion: 'b'.repeat(201),
      monto: 50,
    });
    expect(result.success).toBe(false);
  });

  it('debe rechazar monto menor o igual a cero', () => {
    const resultCero = extraExpensaSchema.safeParse({ concepto: 'Extra', monto: 0 });
    expect(resultCero.success).toBe(false);

    const resultNegativo = extraExpensaSchema.safeParse({ concepto: 'Extra', monto: -25 });
    expect(resultNegativo.success).toBe(false);
  });

  it('debe rechazar monto no numérico o ausente', () => {
    const resultString = extraExpensaSchema.safeParse({ concepto: 'Extra', monto: 'cien' });
    expect(resultString.success).toBe(false);

    const resultFaltante = extraExpensaSchema.safeParse({ concepto: 'Extra' });
    expect(resultFaltante.success).toBe(false);
  });
});

describe('Validación Zod: itemMontoAguaSchema y registrarMontosSchema', () => {
  it('debe aceptar itemMontoAguaSchema con idDepartamento, montoAgua y descripción opcional', () => {
    const data = {
      idDepartamento: 5,
      montoAgua: 85.5,
      descripcion: 'Consumo regular del mes',
    };
    const result = itemMontoAguaSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.descripcion).toBe('Consumo regular del mes');
    }
  });

  it('debe aceptar itemMontoAguaSchema en formato snake_case con descripción null', () => {
    const data = {
      id_departamento: 10,
      monto_agua: 120,
      descripcion: null,
    };
    const result = itemMontoAguaSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.descripcion).toBeNull();
    }
  });

  it('debe aceptar itemMontoAguaSchema sin descripción (opcional)', () => {
    const data = {
      idDepartamento: 3,
      montoAgua: 0,
    };
    const result = itemMontoAguaSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.descripcion).toBeUndefined();
    }
  });

  it('debe rechazar itemMontoAguaSchema con descripción mayor a 200 caracteres', () => {
    const data = {
      idDepartamento: 1,
      montoAgua: 50,
      descripcion: 'x'.repeat(201),
    };
    const result = itemMontoAguaSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('debe rechazar montoAgua negativo', () => {
    const data = {
      idDepartamento: 1,
      montoAgua: -5,
    };
    const result = itemMontoAguaSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('debe validar registrarMontosSchema con lista de montos conteniendo descripción', () => {
    const payload = {
      periodo: '2026-11',
      montos: [
        { idDepartamento: 1, montoAgua: 50, descripcion: 'Lectura normal' },
        { idDepartamento: 2, montoAgua: 75.5, descripcion: null },
        { idDepartamento: 3, montoAgua: 0 },
      ],
    };
    const result = registrarMontosSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('debe rechazar registrarMontosSchema con lista vacía de montos o sin período', () => {
    const sinMontos = registrarMontosSchema.safeParse({
      periodo: '2026-11',
      montos: [],
    });
    expect(sinMontos.success).toBe(false);

    const sinPeriodo = registrarMontosSchema.safeParse({
      periodo: '',
      montos: [{ idDepartamento: 1, montoAgua: 50 }],
    });
    expect(sinPeriodo.success).toBe(false);
  });
});
