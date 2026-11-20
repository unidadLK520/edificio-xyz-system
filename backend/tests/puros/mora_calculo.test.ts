// backend/tests/puros/mora_calculo.test.ts
// Tests unitarios puros para la función pura calcularMoraExpensa (cálculo de mora acumulativa simple y cronograma)

import { describe, it, expect } from 'vitest';
import { calcularMoraExpensa } from '../../src/modules/expensas';

describe('Función pura: calcularMoraExpensa', () => {
  describe('1. Regla FIJO con atrasos de 0, 1, 30, 31 y 63 días', () => {
    const reglaFijo = {
      tipoCalculo: 'FIJO',
      montoFijo: 50,
      tasaInteres: 0,
      diaVencimiento: 10,
      diaGeneracion: 1,
    };
    const capitalPendiente = 300;
    const fechaVencimiento = '2026-11-10';

    it('0 días de atraso (día de vencimiento exacto): mesesMora = 0, mora = 0, total = 300', () => {
      const res = calcularMoraExpensa({
        capitalPendiente,
        fechaVencimiento,
        fechaReferencia: '2026-11-10',
        regla: reglaFijo,
      });

      expect(res.diasAtraso).toBe(0);
      expect(res.mesesMora).toBe(0);
      expect(res.moraPorMes).toBe(50);
      expect(res.moraAcumulada).toBe(0);
      expect(res.totalAdeudado).toBe(300);
    });

    it('1 día de atraso: mesesMora = 1, mora = 50, total = 350', () => {
      const res = calcularMoraExpensa({
        capitalPendiente,
        fechaVencimiento,
        fechaReferencia: '2026-11-11',
        regla: reglaFijo,
      });

      expect(res.diasAtraso).toBe(1);
      expect(res.mesesMora).toBe(1);
      expect(res.moraPorMes).toBe(50);
      expect(res.moraAcumulada).toBe(50);
      expect(res.totalAdeudado).toBe(350);
    });

    it('30 días de atraso: mesesMora = 1, mora = 50, total = 350', () => {
      const res = calcularMoraExpensa({
        capitalPendiente,
        fechaVencimiento,
        fechaReferencia: '2026-12-10',
        regla: reglaFijo,
      });

      expect(res.diasAtraso).toBe(30);
      expect(res.mesesMora).toBe(1);
      expect(res.moraPorMes).toBe(50);
      expect(res.moraAcumulada).toBe(50);
      expect(res.totalAdeudado).toBe(350);
    });

    it('31 días de atraso: mesesMora = 2, mora = 100, total = 400', () => {
      const res = calcularMoraExpensa({
        capitalPendiente,
        fechaVencimiento,
        fechaReferencia: '2026-12-11',
        regla: reglaFijo,
      });

      expect(res.diasAtraso).toBe(31);
      expect(res.mesesMora).toBe(2);
      expect(res.moraPorMes).toBe(50);
      expect(res.moraAcumulada).toBe(100);
      expect(res.totalAdeudado).toBe(400);
    });

    it('63 días de atraso: mesesMora = 3, mora = 150, total = 450', () => {
      const res = calcularMoraExpensa({
        capitalPendiente,
        fechaVencimiento,
        fechaReferencia: '2027-01-12',
        regla: reglaFijo,
      });

      expect(res.diasAtraso).toBe(63);
      expect(res.mesesMora).toBe(3);
      expect(res.moraPorMes).toBe(50);
      expect(res.moraAcumulada).toBe(150);
      expect(res.totalAdeudado).toBe(450);
    });
  });

  describe('2. Regla PORCENTAJE con atrasos de 0, 1, 30, 31 y 63 días', () => {
    const reglaPorcentaje = {
      tipoCalculo: 'PORCENTAJE',
      tasaInteres: 10,
      montoFijo: null,
      diaVencimiento: 10,
      diaGeneracion: 1,
    };
    const capitalPendiente = 350;
    const fechaVencimiento = '2026-11-10';

    it('0 días de atraso: mesesMora = 0, moraPorMes = 35, moraAcumulada = 0, total = 350', () => {
      const res = calcularMoraExpensa({
        capitalPendiente,
        fechaVencimiento,
        fechaReferencia: '2026-11-10',
        regla: reglaPorcentaje,
      });

      expect(res.diasAtraso).toBe(0);
      expect(res.mesesMora).toBe(0);
      expect(res.moraPorMes).toBe(35);
      expect(res.moraAcumulada).toBe(0);
      expect(res.totalAdeudado).toBe(350);
    });

    it('1 día de atraso: mesesMora = 1, moraPorMes = 35, moraAcumulada = 35, total = 385', () => {
      const res = calcularMoraExpensa({
        capitalPendiente,
        fechaVencimiento,
        fechaReferencia: '2026-11-11',
        regla: reglaPorcentaje,
      });

      expect(res.diasAtraso).toBe(1);
      expect(res.mesesMora).toBe(1);
      expect(res.moraPorMes).toBe(35);
      expect(res.moraAcumulada).toBe(35);
      expect(res.totalAdeudado).toBe(385);
    });

    it('30 días de atraso: mesesMora = 1, moraPorMes = 35, moraAcumulada = 35, total = 385', () => {
      const res = calcularMoraExpensa({
        capitalPendiente,
        fechaVencimiento,
        fechaReferencia: '2026-12-10',
        regla: reglaPorcentaje,
      });

      expect(res.diasAtraso).toBe(30);
      expect(res.mesesMora).toBe(1);
      expect(res.moraPorMes).toBe(35);
      expect(res.moraAcumulada).toBe(35);
      expect(res.totalAdeudado).toBe(385);
    });

    it('31 días de atraso: mesesMora = 2, moraPorMes = 35, moraAcumulada = 70, total = 420', () => {
      const res = calcularMoraExpensa({
        capitalPendiente,
        fechaVencimiento,
        fechaReferencia: '2026-12-11',
        regla: reglaPorcentaje,
      });

      expect(res.diasAtraso).toBe(31);
      expect(res.mesesMora).toBe(2);
      expect(res.moraPorMes).toBe(35);
      expect(res.moraAcumulada).toBe(70);
      expect(res.totalAdeudado).toBe(420);
    });

    it('63 días de atraso: mesesMora = 3, moraPorMes = 35, moraAcumulada = 105, total = 455', () => {
      const res = calcularMoraExpensa({
        capitalPendiente,
        fechaVencimiento,
        fechaReferencia: '2027-01-12',
        regla: reglaPorcentaje,
      });

      expect(res.diasAtraso).toBe(63);
      expect(res.mesesMora).toBe(3);
      expect(res.moraPorMes).toBe(35);
      expect(res.moraAcumulada).toBe(105);
      expect(res.totalAdeudado).toBe(455);
    });

    it('Prioridad de tasa específica en la expensa sobre la regla activa', () => {
      const res = calcularMoraExpensa({
        capitalPendiente: 200,
        fechaVencimiento,
        fechaReferencia: '2026-11-15',
        regla: reglaPorcentaje, // tasa 10%
        tasaInteresMora: 5, // tasa específica en la expensa 5%
      });

      expect(res.diasAtraso).toBe(5);
      expect(res.mesesMora).toBe(1);
      expect(res.moraPorMes).toBe(10); // 200 * 5% = 10, no 20
      expect(res.moraAcumulada).toBe(10);
      expect(res.totalAdeudado).toBe(210);
    });
  });

  describe('3. Caso de capital 0', () => {
    const fechaVencimiento = '2026-11-10';
    const fechaReferencia = '2026-12-25'; // 45 días de atraso

    it('con regla PORCENTAJE y capital 0: mora = 0, total = 0', () => {
      const res = calcularMoraExpensa({
        capitalPendiente: 0,
        fechaVencimiento,
        fechaReferencia,
        regla: { tipoCalculo: 'PORCENTAJE', tasaInteres: 10 },
      });

      expect(res.diasAtraso).toBe(45);
      expect(res.mesesMora).toBe(2);
      expect(res.moraPorMes).toBe(0);
      expect(res.moraAcumulada).toBe(0);
      expect(res.totalAdeudado).toBe(0);

      // Cronograma con capital 0
      res.cronograma.forEach((item) => {
        expect(item.moraDelMes).toBe(0);
        expect(item.moraAcumulada).toBe(0);
        expect(item.totalDeuda).toBe(0);
        expect(item.estado).toBe('SinMora');
      });
    });

    it('con regla FIJO y capital 0: mora = 0, total = 0', () => {
      const res = calcularMoraExpensa({
        capitalPendiente: 0,
        fechaVencimiento,
        fechaReferencia,
        regla: { tipoCalculo: 'FIJO', montoFijo: 50 },
      });

      expect(res.diasAtraso).toBe(45);
      expect(res.mesesMora).toBe(2);
      expect(res.moraPorMes).toBe(0);
      expect(res.moraAcumulada).toBe(0);
      expect(res.totalAdeudado).toBe(0);

      res.cronograma.forEach((item) => {
        expect(item.moraDelMes).toBe(0);
        expect(item.moraAcumulada).toBe(0);
        expect(item.totalDeuda).toBe(0);
        expect(item.estado).toBe('SinMora');
      });
    });
  });

  describe('4. Estructura y estados del Cronograma proyectado', () => {
    const regla = { tipoCalculo: 'FIJO', montoFijo: 50 };
    const capitalPendiente = 200;
    const fechaVencimiento = '2026-11-10';

    it('genera exactamente 7 filas por defecto (mes 0 al 6) con rangos y estados correctos', () => {
      const res = calcularMoraExpensa({
        capitalPendiente,
        fechaVencimiento,
        fechaReferencia: '2026-12-15', // 35 días de atraso -> mesesMora = 2
        regla,
      });

      expect(res.cronograma).toHaveLength(7);

      // Mes 0
      expect(res.cronograma[0]).toEqual({
        mes: 0,
        desdeDia: 0,
        hastaDia: 0,
        moraDelMes: 0,
        moraAcumulada: 0,
        totalDeuda: 200,
        estado: 'SinMora',
      });

      // Mes 1 (Devengado porque 1 <= mesesMora = 2)
      expect(res.cronograma[1]).toEqual({
        mes: 1,
        desdeDia: 1,
        hastaDia: 30,
        moraDelMes: 50,
        moraAcumulada: 50,
        totalDeuda: 250,
        estado: 'Devengado',
      });

      // Mes 2 (Devengado porque 2 <= mesesMora = 2)
      expect(res.cronograma[2]).toEqual({
        mes: 2,
        desdeDia: 31,
        hastaDia: 60,
        moraDelMes: 50,
        moraAcumulada: 100,
        totalDeuda: 300,
        estado: 'Devengado',
      });

      // Mes 3 (Proyeccion porque 3 > mesesMora = 2)
      expect(res.cronograma[3]).toEqual({
        mes: 3,
        desdeDia: 61,
        hastaDia: 90,
        moraDelMes: 50,
        moraAcumulada: 150,
        totalDeuda: 350,
        estado: 'Proyeccion',
      });

      // Mes 6 (último)
      expect(res.cronograma[6]).toEqual({
        mes: 6,
        desdeDia: 151,
        hastaDia: 180,
        moraDelMes: 50,
        moraAcumulada: 300,
        totalDeuda: 500,
        estado: 'Proyeccion',
      });
    });

    it('acepta parámetro meses personalizado y respeta el tope máximo de 24 meses', () => {
      const res3Meses = calcularMoraExpensa({
        capitalPendiente,
        fechaVencimiento,
        fechaReferencia: '2026-11-10',
        regla,
        meses: 3,
      });
      expect(res3Meses.cronograma).toHaveLength(4); // 0, 1, 2, 3

      const resTope = calcularMoraExpensa({
        capitalPendiente,
        fechaVencimiento,
        fechaReferencia: '2026-11-10',
        regla,
        meses: 50,
      });
      expect(resTope.cronograma).toHaveLength(25); // 0 a 24
      expect(resTope.cronograma[24].mes).toBe(24);
    });
  });
});
