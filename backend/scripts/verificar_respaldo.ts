// backend/scripts/verificar_respaldo.ts
// Verificación en solo lectura comparando information_schema de la BD principal en vivo contra FALLBACK_DATABASE_URL
// Cumple con: SELECT sobre information_schema, try/finally con $disconnect(), sin DDL ni escrituras, sin imprimir credenciales, no se ejecuta si apunta a localhost

import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@edificio-xyz/database';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface ColumnInfo {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: string;
}

async function getTableColumns(client: PrismaClient): Promise<Map<string, Map<string, ColumnInfo>>> {
  const rows = await client.$queryRawUnsafe<any[]>(`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'edificio'
    ORDER BY table_name, ordinal_position;
  `);

  const tables = new Map<string, Map<string, ColumnInfo>>();
  for (const r of rows) {
    if (!tables.has(r.table_name)) {
      tables.set(r.table_name, new Map());
    }
    tables.get(r.table_name)!.set(r.column_name, {
      tableName: r.table_name,
      columnName: r.column_name,
      dataType: r.data_type,
      isNullable: r.is_nullable,
    });
  }
  return tables;
}

function isLocalhostUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

async function main() {
  console.log('========================================================================');
  console.log('   VERIFICACIÓN EN VIVO: BD PRINCIPAL VS FALLBACK_DATABASE_URL          ');
  console.log('========================================================================\n');

  const primaryUrl = process.env.DATABASE_URL;
  const fallbackUrl = process.env.FALLBACK_DATABASE_URL;

  if (!primaryUrl) {
    console.error('❌ ERROR FATAL: DATABASE_URL (principal) no está configurada.');
    process.exit(1);
  }

  if (!fallbackUrl) {
    console.log('⚠️ FALLBACK_DATABASE_URL no está definida en las variables de entorno.');
    return;
  }

  // Regla 3: No ejecutar si apunta a localhost (se correrá cuando DevOps confirme la URL en línea)
  if (isLocalhostUrl(fallbackUrl)) {
    console.log('ℹ️ [OMITIDO] FALLBACK_DATABASE_URL apunta a localhost.');
    console.log('   Por instrucción expresa, no se ejecuta la conexión local automática.');
    console.log('   Ejecutar este script cuando DevOps confirme y configure la URL del respaldo en línea.');
    return;
  }

  const primaryPrisma = new PrismaClient({
    datasources: { db: { url: primaryUrl } },
    log: ['error'],
  });

  const fallbackPrisma = new PrismaClient({
    datasources: { db: { url: fallbackUrl } },
    log: ['error'],
  });

  try {
    console.log('📡 1. Consultando information_schema en la Base de Datos Principal en vivo...');
    const primaryTables = await getTableColumns(primaryPrisma);
    console.log(`✅ BD Principal: ${primaryTables.size} tablas/vistas encontradas en esquema 'edificio'.\n`);

    console.log('📡 2. Consultando information_schema en la Base de Datos de Respaldo en vivo...');
    const fallbackTables = await getTableColumns(fallbackPrisma);
    console.log(`✅ BD Respaldo: ${fallbackTables.size} tablas/vistas encontradas en esquema 'edificio'.\n`);

    console.log('========================================================================');
    console.log('               DIFERENCIAS EN VIVO DETECTADAS (information_schema)      ');
    console.log('========================================================================');

    const missingTables: string[] = [];
    const tablesWithMissingColumns: { table: string; missing: string[] }[] = [];

    for (const [tableName, primaryCols] of primaryTables.entries()) {
      const fallbackCols = fallbackTables.get(tableName);
      if (!fallbackCols) {
        missingTables.push(tableName);
      } else {
        const missingInTable: string[] = [];
        for (const [colName, colInfo] of primaryCols.entries()) {
          if (!fallbackCols.has(colName)) {
            missingInTable.push(`${colName} (${colInfo.dataType})`);
          }
        }
        if (missingInTable.length > 0) {
          tablesWithMissingColumns.push({ table: tableName, missing: missingInTable });
        }
      }
    }

    if (missingTables.length === 0 && tablesWithMissingColumns.length === 0) {
      console.log('🎉 ¡ESQUEMAS IDÉNTICOS! La base de datos de respaldo cuenta con todas las tablas y columnas.');
    } else {
      if (missingTables.length > 0) {
        console.log(`\n1. Tablas presentes en Principal pero ausentes en Respaldo (${missingTables.length}):`);
        for (const t of missingTables) {
          console.log(`   - ❌ ${t}`);
        }
      }

      if (tablesWithMissingColumns.length > 0) {
        console.log(`\n2. Columnas faltantes en tablas existentes del Respaldo (${tablesWithMissingColumns.length} tablas):`);
        for (const item of tablesWithMissingColumns) {
          console.log(`   - Tabla '${item.table}':`);
          for (const col of item.missing) {
            console.log(`       * ❌ ${col}`);
          }
        }
      }
    }

    console.log('\n========================================================================');
    console.log('Verificación en vivo finalizada en solo lectura (sin DDL ni escrituras).');
    console.log('========================================================================\n');

  } catch (err: any) {
    console.error('❌ Error al consultar information_schema:', err.message || err);
  } finally {
    await primaryPrisma.$disconnect().catch(() => {});
    await fallbackPrisma.$disconnect().catch(() => {});
  }
}

main();
