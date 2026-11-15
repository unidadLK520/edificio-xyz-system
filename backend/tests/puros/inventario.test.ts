// backend/tests/puros/inventario.test.ts
// Tests unitarios puros para esquemas de validación Zod de inventario (personas y departamentos)
// Campos validados: estadoCivil, cantidadHijos y cantidadHabitantes

import { describe, it, expect } from 'vitest';
import {
  crearPersonaSchema,
  actualizarPersonaSchema,
  EstadoCivilEnum,
} from '../../src/modules/personas/personas.types';
import {
  departamentoSchema,
  crearDepartamentoSchema,
  actualizarDepartamentoSchema,
} from '../../src/routes/departamentos.routes';

describe('Validación Zod: EstadoCivilEnum', () => {
  it('debe aceptar los cinco estados civiles permitidos', () => {
    const estadosValidos = ['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Unión libre'];
    estadosValidos.forEach((estado) => {
      const result = EstadoCivilEnum.safeParse(estado);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(estado);
      }
    });
  });

  it('debe rechazar estados civiles no contemplados o con formato incorrecto', () => {
    const estadosInvalidos = ['soltero', 'CASADO', 'Concubinato', 'Separado', 'Otro', '', 'Desconocido'];
    estadosInvalidos.forEach((estado) => {
      const result = EstadoCivilEnum.safeParse(estado);
      expect(result.success).toBe(false);
    });
  });
});

describe('Validación Zod: crearPersonaSchema (estadoCivil y cantidadHijos)', () => {
  const basePersona = {
    ciNit: '12345678',
    nombres: 'Carlos',
    apellidos: 'Pérez Gómez',
    telefono: '70012345',
    correo: 'carlos.perez@example.com',
    direccion: 'Av. Libertador #123',
  };

  it('debe aceptar persona con estadoCivil válido y cantidadHijos entero >= 0', () => {
    const data = {
      ...basePersona,
      estadoCivil: 'Casado',
      cantidadHijos: 2,
    };
    const result = crearPersonaSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estadoCivil).toBe('Casado');
      expect(result.data.cantidadHijos).toBe(2);
    }
  });

  it('debe aceptar cantidadHijos igual a 0 (límite inferior permitido)', () => {
    const data = {
      ...basePersona,
      estadoCivil: 'Soltero',
      cantidadHijos: 0,
    };
    const result = crearPersonaSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cantidadHijos).toBe(0);
    }
  });

  it('debe aceptar estadoCivil null y cantidadHijos null', () => {
    const data = {
      ...basePersona,
      estadoCivil: null,
      cantidadHijos: null,
    };
    const result = crearPersonaSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estadoCivil).toBeNull();
      expect(result.data.cantidadHijos).toBeNull();
    }
  });

  it('debe aceptar persona sin enviar estadoCivil ni cantidadHijos (opcionales)', () => {
    const result = crearPersonaSchema.safeParse(basePersona);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estadoCivil).toBeUndefined();
      expect(result.data.cantidadHijos).toBeUndefined();
    }
  });

  it('debe rechazar cantidadHijos negativo', () => {
    const data = {
      ...basePersona,
      cantidadHijos: -1,
    };
    const result = crearPersonaSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('debe rechazar cantidadHijos decimal / no entero', () => {
    const data = {
      ...basePersona,
      cantidadHijos: 2.5,
    };
    const result = crearPersonaSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('debe rechazar cantidadHijos no numérico', () => {
    const data = {
      ...basePersona,
      cantidadHijos: 'dos',
    };
    const result = crearPersonaSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('debe rechazar estadoCivil inválido', () => {
    const data = {
      ...basePersona,
      estadoCivil: 'Concubinato',
    };
    const result = crearPersonaSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('Validación Zod: actualizarPersonaSchema', () => {
  it('debe aceptar actualización parcial con solo estadoCivil', () => {
    const data = { estadoCivil: 'Divorciado' };
    const result = actualizarPersonaSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estadoCivil).toBe('Divorciado');
    }
  });

  it('debe aceptar actualización parcial con solo cantidadHijos', () => {
    const data = { cantidadHijos: 3 };
    const result = actualizarPersonaSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cantidadHijos).toBe(3);
    }
  });

  it('debe aceptar actualización a null en ambos campos', () => {
    const data = { estadoCivil: null, cantidadHijos: null };
    const result = actualizarPersonaSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estadoCivil).toBeNull();
      expect(result.data.cantidadHijos).toBeNull();
    }
  });

  it('debe aceptar objeto vacío sin campos', () => {
    const result = actualizarPersonaSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('debe rechazar actualización con cantidadHijos negativo', () => {
    const result = actualizarPersonaSchema.safeParse({ cantidadHijos: -3 });
    expect(result.success).toBe(false);
  });

  it('debe rechazar actualización con cantidadHijos con decimales', () => {
    const result = actualizarPersonaSchema.safeParse({ cantidadHijos: 1.5 });
    expect(result.success).toBe(false);
  });

  it('debe rechazar actualización con estadoCivil inválido', () => {
    const result = actualizarPersonaSchema.safeParse({ estadoCivil: 'Invalido' });
    expect(result.success).toBe(false);
  });
});

describe('Validación Zod: departamentoSchema / crearDepartamentoSchema (cantidadHabitantes)', () => {
  const baseDepto = {
    numero: '101',
    piso: 1,
    areaM2: 75.5,
    estado: 'Ocupado' as const,
  };

  it('debe aceptar departamento con cantidadHabitantes entero >= 0', () => {
    const data = {
      ...baseDepto,
      cantidadHabitantes: 4,
    };
    const result = departamentoSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cantidadHabitantes).toBe(4);
    }
  });

  it('debe aceptar cantidadHabitantes igual a 0 (límite inferior)', () => {
    const data = {
      ...baseDepto,
      cantidadHabitantes: 0,
    };
    const result = crearDepartamentoSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cantidadHabitantes).toBe(0);
    }
  });

  it('debe aceptar cantidadHabitantes null', () => {
    const data = {
      ...baseDepto,
      cantidadHabitantes: null,
    };
    const result = departamentoSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cantidadHabitantes).toBeNull();
    }
  });

  it('debe aceptar departamento sin cantidadHabitantes (opcional)', () => {
    const result = departamentoSchema.safeParse(baseDepto);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cantidadHabitantes).toBeUndefined();
    }
  });

  it('debe rechazar cantidadHabitantes negativo', () => {
    const data = {
      ...baseDepto,
      cantidadHabitantes: -1,
    };
    const result = departamentoSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('debe rechazar cantidadHabitantes decimal / no entero', () => {
    const data = {
      ...baseDepto,
      cantidadHabitantes: 3.2,
    };
    const result = departamentoSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('debe rechazar cantidadHabitantes no numérico', () => {
    const data = {
      ...baseDepto,
      cantidadHabitantes: 'cuatro',
    };
    const result = departamentoSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('Validación Zod: actualizarDepartamentoSchema', () => {
  it('debe aceptar actualización parcial con solo cantidadHabitantes', () => {
    const result = actualizarDepartamentoSchema.safeParse({ cantidadHabitantes: 3 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cantidadHabitantes).toBe(3);
    }
  });

  it('debe aceptar actualización con cantidadHabitantes: 0', () => {
    const result = actualizarDepartamentoSchema.safeParse({ cantidadHabitantes: 0 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cantidadHabitantes).toBe(0);
    }
  });

  it('debe aceptar actualización con cantidadHabitantes: null', () => {
    const result = actualizarDepartamentoSchema.safeParse({ cantidadHabitantes: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cantidadHabitantes).toBeNull();
    }
  });

  it('debe rechazar actualización con cantidadHabitantes negativo', () => {
    const result = actualizarDepartamentoSchema.safeParse({ cantidadHabitantes: -2 });
    expect(result.success).toBe(false);
  });

  it('debe rechazar actualización con cantidadHabitantes decimal', () => {
    const result = actualizarDepartamentoSchema.safeParse({ cantidadHabitantes: 1.8 });
    expect(result.success).toBe(false);
  });
});
