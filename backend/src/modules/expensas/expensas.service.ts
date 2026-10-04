// backend/src/modules/expensas/expensas.service.ts
// Servicio centralizado de cálculo financiero y gestión de expensas

import { Prisma, prisma } from '@edificio-xyz/database';

export interface ExpensaConPagosYAnticipos {
  monto: number | string | Prisma.Decimal;
  pagos?: Array<{
    montoPagado: number | string | Prisma.Decimal;
    anulado?: boolean | null;
    esAnticipado?: boolean | null;
  }> | null;
  aplicacionesAnticipos?: Array<{
    monto: number | string | Prisma.Decimal;
    pago?: { anulado?: boolean | null } | null;
  }> | null;
  aplicacionesAnticipo?: Array<{
    monto: number | string | Prisma.Decimal;
    pago?: { anulado?: boolean | null } | null;
  }> | null;
}

/**
 * Función centralizada y reutilizable para calcular el capital pendiente de una expensa:
 * Capital Pendiente = Monto Base - Pagos Directos Válidos - Anticipos Aplicados Válidos.
 * 
 * - Excluye pagos directos con anulado === true
 * - Excluye aplicaciones de anticipos cuyo pago origen fue anulado
 * - Garantiza redondeo estricto a 2 decimales
 * - No permite valores negativos (límite inferior en 0.00)
 */
export function calcularCapitalPendiente(expensa: ExpensaConPagosYAnticipos): number {
  const montoBase = Number(expensa.monto || 0);

  // 1. Sumar pagos directos vigentes
  const pagosValidos = (expensa.pagos || []).filter((p) => !p.anulado);
  const totalPagosDirectos = pagosValidos.reduce(
    (acc, p) => acc + Number(p.montoPagado || 0),
    0
  );

  // 2. Sumar anticipos aplicados vigentes (relación aplicacionesAnticipos o aplicacionesAnticipo)
  const aplicaciones = expensa.aplicacionesAnticipos || expensa.aplicacionesAnticipo || [];
  const aplicacionesValidas = aplicaciones.filter((a) => !a.pago || !a.pago.anulado);
  const totalAnticiposAplicados = aplicacionesValidas.reduce(
    (acc, a) => acc + Number(a.monto || 0),
    0
  );

  // 3. Capital pendiente con precisión financiera a 2 decimales
  const capital = Math.max(0, montoBase - totalPagosDirectos - totalAnticiposAplicados);
  return Math.round(capital * 100) / 100;
}
