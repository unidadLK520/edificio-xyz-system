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
    // Define columnas explícitamente para evitar problemas
    sheet.columns = [
      { header: 'idAuditoria', key: 'idAuditoria', width: 15 },
      { header: 'tablaAfectada', key: 'tablaAfectada', width: 20 },
      { header: 'idRegistro', key: 'idRegistro', width: 15 },
      { header: 'accion', key: 'accion', width: 20 },
      { header: 'resultado', key: 'resultado', width: 20 },
      { header: 'fechaHora', key: 'fechaHora', width: 25 },
      { header: 'idUsuario', key: 'idUsuario', width: 15 },
      { header: 'datosAnteriores', key: 'datosAnteriores', width: 50 },
      { header: 'datosNuevos', key: 'datosNuevos', width: 50 },
    ];

    // Agregar filas con conversión segura de tipos
    records.forEach((rec) => {
      sheet.addRow({
        idAuditoria: String(rec.idAuditoria),
        tablaAfectada: rec.tablaAfectada || '',
        idRegistro: rec.idRegistro || '',
        accion: rec.accion || '',
        resultado: rec.resultado || '',
        fechaHora: rec.fechaHora ? rec.fechaHora.toISOString() : '',
        idUsuario: rec.idUsuario ? String(rec.idUsuario) : '',
        datosAnteriores: rec.datosAnteriores ? JSON.stringify(rec.datosAnteriores) : '',
        datosNuevos: rec.datosNuevos ? JSON.stringify(rec.datosNuevos) : '',
      });
    });

    console.log('[AUDITORIA EXPORT] Excel generado con datos');
  } else {
    console.log('[AUDITORIA EXPORT] No hay registros para exportar');
  }

  const buffer = await workbook.xlsx.writeBuffer() as Buffer;
  console.log('[AUDITORIA EXPORT] Buffer de Excel generado, tamaño:', buffer.length);

  // Delete exported rows - convert BigInt to number for Prisma
  const ids = records.map((r) => Number(r.idAuditoria));
  console.log(`[AUDITORIA EXPORT] IDs a eliminar: ${ids.length}`);

  if (ids.length > 0) {
    const deleteResult = await prisma.auditoria.deleteMany({
      where: { idAuditoria: { in: ids } },
    });
    console.log(`[AUDITORIA EXPORT] Registros eliminados: ${deleteResult.count}`);
  }

  return buffer;
}
