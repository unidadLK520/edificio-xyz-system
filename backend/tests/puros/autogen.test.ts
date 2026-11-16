// backend/tests/puros/autogen.test.ts
// Tests unitarios puros para la función pura decidirGeneracion (autogeneración de expensas)

import { describe, it, expect } from 'vitest';
import { decidirGeneracion } from '../../src/modules/expensas';

describe('Función pura: decidirGeneracion', () => {
  describe('Validación de diaGeneracion indefinido o inválido', () => {
    it('debe retornar null si diaGeneracion es null', () => {
      const resultado = decidirGeneracion({
        ahoraLaPaz: '2026-11-15',
        diaGeneracion: null,
      });
      expect(resultado).toBeNull();
    });

    it('debe retornar null si diaGeneracion es undefined', () => {
      const resultado = decidirGeneracion({
        ahoraLaPaz: '2026-11-15',
        diaGeneracion: undefined,
      });
      expect(resultado).toBeNull();
    });

    it('debe retornar null si diaGeneracion es 0 o negativo', () => {
      expect(decidirGeneracion({ ahoraLaPaz: '2026-11-15', diaGeneracion: 0 })).toBeNull();
      expect(decidirGeneracion({ ahoraLaPaz: '2026-11-15', diaGeneracion: -1 })).toBeNull();
    });

    it('debe retornar null si diaGeneracion es mayor a 31', () => {
      expect(decidirGeneracion({ ahoraLaPaz: '2026-11-15', diaGeneracion: 32 })).toBeNull();
    });
  });

  describe('Día actual menor al día de generación', () => {
    it('debe retornar null si el día de hoy es anterior a diaGeneracion', () => {
      const resultado = decidirGeneracion({
        ahoraLaPaz: '2026-11-05',
        diaGeneracion: 10,
      });
      expect(resultado).toBeNull();
    });

    it('debe retornar null un día antes de diaGeneracion', () => {
      const resultado = decidirGeneracion({
        ahoraLaPaz: '2026-11-09',
        diaGeneracion: 10,
      });
      expect(resultado).toBeNull();
    });
  });

  describe('Día actual igual o mayor al día de generación', () => {
    it('debe retornar el período YYYY-MM-01 si el día de hoy coincide exactamente con diaGeneracion', () => {
      const resultado = decidirGeneracion({
        ahoraLaPaz: '2026-11-10',
        diaGeneracion: 10,
      });
      expect(resultado).toBe('2026-11-01');
    });

    it('debe retornar el período YYYY-MM-01 si el día de hoy es posterior a diaGeneracion', () => {
      const resultado = decidirGeneracion({
        ahoraLaPaz: '2026-11-15',
        diaGeneracion: 10,
      });
      expect(resultado).toBe('2026-11-01');
    });

    it('debe retornar el período YYYY-MM-01 a fin de mes si diaGeneracion ya pasó', () => {
      const resultado = decidirGeneracion({
        ahoraLaPaz: '2026-11-30',
        diaGeneracion: 10,
      });
      expect(resultado).toBe('2026-11-01');
    });
  });

  describe('Tope: último día del mes', () => {
    describe('Mes de 30 días (abril)', () => {
      it('con diaGeneracion: 31, no debe generar el 29 de abril (tope es 30)', () => {
        const resultado = decidirGeneracion({
          ahoraLaPaz: '2026-04-29',
          diaGeneracion: 31,
        });
        expect(resultado).toBeNull();
      });

      it('con diaGeneracion: 31, debe generar el 30 de abril (último día del mes)', () => {
        const resultado = decidirGeneracion({
          ahoraLaPaz: '2026-04-30',
          diaGeneracion: 31,
        });
        expect(resultado).toBe('2026-04-01');
      });
    });

    describe('Febrero no bisiesto (28 días)', () => {
      it('con diaGeneracion: 31, no debe generar el 27 de febrero', () => {
        const resultado = decidirGeneracion({
          ahoraLaPaz: '2026-02-27',
          diaGeneracion: 31,
        });
        expect(resultado).toBeNull();
      });

      it('con diaGeneracion: 31, debe generar el 28 de febrero (tope al último día del mes)', () => {
        const resultado = decidirGeneracion({
          ahoraLaPaz: '2026-02-28',
          diaGeneracion: 31,
        });
        expect(resultado).toBe('2026-02-01');
      });

      it('con diaGeneracion: 30, debe generar el 28 de febrero por tope de mes', () => {
        const resultado = decidirGeneracion({
          ahoraLaPaz: '2026-02-28',
          diaGeneracion: 30,
        });
        expect(resultado).toBe('2026-02-01');
      });
    });

    describe('Febrero bisiesto (29 días, año 2024)', () => {
      it('con diaGeneracion: 31, no debe generar el 28 de febrero de año bisiesto', () => {
        const resultado = decidirGeneracion({
          ahoraLaPaz: '2024-02-28',
          diaGeneracion: 31,
        });
        expect(resultado).toBeNull();
      });

      it('con diaGeneracion: 31, debe generar el 29 de febrero de año bisiesto (tope al día 29)', () => {
        const resultado = decidirGeneracion({
          ahoraLaPaz: '2024-02-29',
          diaGeneracion: 31,
        });
        expect(resultado).toBe('2024-02-01');
      });
    });

    describe('Mes de 31 días (enero)', () => {
      it('con diaGeneracion: 31, no debe generar el 30 de enero', () => {
        const resultado = decidirGeneracion({
          ahoraLaPaz: '2026-01-30',
          diaGeneracion: 31,
        });
        expect(resultado).toBeNull();
      });

      it('con diaGeneracion: 31, debe generar el 31 de enero', () => {
        const resultado = decidirGeneracion({
          ahoraLaPaz: '2026-01-31',
          diaGeneracion: 31,
        });
        expect(resultado).toBe('2026-01-01');
      });
    });
  });

  describe('Día 1 del mes', () => {
    it('con diaGeneracion: 1, debe generar el primer día del mes', () => {
      const resultado = decidirGeneracion({
        ahoraLaPaz: '2026-05-01',
        diaGeneracion: 1,
      });
      expect(resultado).toBe('2026-05-01');
    });
  });

  describe('Soporte de Date y timezone America/La_Paz', () => {
    it('debe interpretar correctamente un objeto Date en hora La Paz (UTC-4)', () => {
      // 2026-11-15T05:00:00.000Z equivale a 2026-11-15 01:00:00 hora de La Paz
      const fecha0100LaPaz = new Date('2026-11-15T05:00:00.000Z');
      const resultado = decidirGeneracion({
        ahoraLaPaz: fecha0100LaPaz,
        diaGeneracion: 15,
      });
      expect(resultado).toBe('2026-11-01');
    });

    it('no debe generar si en hora La Paz todavía es el día anterior (diferencia horaria UTC)', () => {
      // 2026-11-15T02:00:00.000Z equivale a 2026-11-14 22:00:00 hora de La Paz (día 14)
      const fecha2200DiaAnterior = new Date('2026-11-15T02:00:00.000Z');
      const resultado = decidirGeneracion({
        ahoraLaPaz: fecha2200DiaAnterior,
        diaGeneracion: 15,
      });
      expect(resultado).toBeNull();
    });

    it('debe aceptar cadena con offset explícito de La Paz', () => {
      const resultado = decidirGeneracion({
        ahoraLaPaz: '2026-12-20T01:00:00-04:00',
        diaGeneracion: 20,
      });
      expect(resultado).toBe('2026-12-01');
    });
  });
});
