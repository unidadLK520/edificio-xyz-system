// backend/src/modules/auditoria/auditoria.export.ts
// Exportación y depuración de registros antiguos de auditoría

import { prisma } from '@edificio-xyz/database';
import ExcelJS from 'exceljs';

/**
 * Exporta los 150 registros más antiguos de auditoría a un archivo Excel (Buffer)
 * y los elimina de la base de datos.
 */
export async function exportAndPruneOldest(): Promise<Buffer> {
  const records = await prisma.auditoria.findMany({
    orderBy: { fechaHora: 'asc' },
    take: 150,
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Auditoria');

  if (records.length > 0) {
    // Convert Prisma records (which may contain BigInt) into plain objects
    const safeRecords = records.map((rec) => {
      const plain: Record<string, any> = {};
      for (const [key, value] of Object.entries(rec as any)) {
        plain[key] = typeof value === 'bigint' ? value.toString() : value;
      }
      return plain;
    });

    const headers = Object.keys(safeRecords[0]);
    sheet.addRow(headers);
    safeRecords.forEach((rec) => {
      const row = headers.map((h) => rec[h]);
      sheet.addRow(row);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  // Delete exported rows (use original ids, which are BigInt)
  const ids = records.map((r) => r.idAuditoria);
  if (ids.length > 0) {
    await prisma.auditoria.deleteMany({
      where: { idAuditoria: { in: ids } },
    });
  }

  return Buffer.from(buffer as any);
}
