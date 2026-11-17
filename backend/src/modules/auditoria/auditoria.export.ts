// backend/src/modules/auditoria/auditoria.export.ts
// Exportación y depuración de registros antiguos de auditoría

import { prisma } from '@edificio-xyz/database';
import ExcelJS from 'exceljs';

/**
 * Exporta los 500 registros más antiguos de auditoría a un archivo Excel (Buffer)
 * y los elimina de la base de datos.
 */
export async function exportAndPruneOldest(): Promise<Buffer> {
  console.log('[AUDITORIA EXPORT] Iniciando exportación y limpieza de 500 registros más antiguos...');

  const records = await prisma.auditoria.findMany({
    orderBy: { fechaHora: 'asc' },
    take: 500,
  });

  console.log(`[AUDITORIA EXPORT] Se encontraron ${records.length} registros para exportar`);

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

    console.log('[AUDITORIA EXPORT] Excel generado con datos');
  } else {
    console.log('[AUDITORIA EXPORT] No hay registros para exportar');
  }

  const buffer = await workbook.xlsx.writeBuffer();
  console.log('[AUDITORIA EXPORT] Buffer de Excel generado');

  // Delete exported rows - FIX: convert BigInt to number for Prisma
  const ids = records.map((r) => Number(r.idAuditoria));
  console.log(`[AUDITORIA EXPORT] IDs a eliminar: ${ids.length}`);

  if (ids.length > 0) {
    const deleteResult = await prisma.auditoria.deleteMany({
      where: { idAuditoria: { in: ids } },
    });
    console.log(`[AUDITORIA EXPORT] Registros eliminados: ${deleteResult.count}`);
  }

  return Buffer.from(buffer as any);
}
