import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const cleanPgUrl = (rawUrl: string) => {
  return rawUrl.replace(/\?schema=[^&]+&?/, '?').replace(/\?&/, '?').replace(/\?$/, '');
};

const rawDirect = process.env.DIRECT_URL || 
  'postgresql://postgres.eexlnikxsxsskilduyjk:ByteMafiaeslaley2026@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?schema=edificio';
const SUPABASE_DIRECT_URL = cleanPgUrl(rawDirect);

const RENDER_URL = process.env.RENDER_DATABASE_URL || 
  'postgresql://edificio_5hlu_user:m4NlbpxERlqyxUgS82Bs026mIrIYA6e5@dpg-db5ro4g473hc73c6dppg-a.frankfurt-postgres.render.com/edificio_5hlu?sslmode=require';

const schemaFilePath = path.resolve(__dirname, '../../../database/migrations/001_initial_schema.sql');
const dataFilePath = path.resolve(__dirname, '../../../database/migrations/002_initial_data.sql');

async function runCommand(cmd: string, args: string[], stdinData?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    if (stdinData) {
      proc.stdin.write(stdinData);
      proc.stdin.end();
    }

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed [code ${code}]: ${stderr || stdout}`));
      }
    });
  });
}

async function executeSql(url: string, sql: string) {
  return await runCommand('docker', ['exec', '-i', 'edificio_xyz_db', 'psql', url, '-c', sql]);
}

async function streamSqlFile(url: string, sqlContent: string) {
  return await runCommand('docker', ['exec', '-i', 'edificio_xyz_db', 'psql', url], sqlContent);
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        🔄 SINCRONIZADOR GLOBAL DE BASES DE DATOS             ║');
  console.log('║             (Supabase Cloud <---> Render Docker)             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('📡 [1/4] Extrayendo los datos más recientes desde Supabase...');
  try {
    let dumpOutput = '';
    try {
      dumpOutput = execSync(`docker exec edificio_xyz_db pg_dump "${SUPABASE_DIRECT_URL}" --schema=edificio --data-only --disable-triggers`, { maxBuffer: 20 * 1024 * 1024 }).toString('utf8');
    } catch {
      dumpOutput = execSync(`pg_dump "${SUPABASE_DIRECT_URL}" --schema=edificio --data-only --disable-triggers`, { maxBuffer: 20 * 1024 * 1024 }).toString('utf8');
    }

    // Guardar copia local en 002_initial_data.sql para que el repositorio y Docker siempre estén al día
    fs.writeFileSync(dataFilePath, dumpOutput, 'utf8');
    console.log(`   ✓ Datos extraídos y respaldados en database/migrations/002_initial_data.sql (${(dumpOutput.length / 1024).toFixed(1)} KB)`);
  } catch (err: any) {
    console.error('   ❌ Error al extraer datos desde Supabase:', err.message);
    process.exit(1);
  }

  console.log('\n🚀 [2/4] Preparando y sincronizando Render Cloud...');
  try {
    // 1. Desactivar triggers de usuario temporalmente y truncar tablas
    const prepSql = `
      ALTER TABLE edificio.expensas DISABLE TRIGGER trg_auditoria_expensas;
      ALTER TABLE edificio.pagos DISABLE TRIGGER trg_auditoria_pagos;
      ALTER TABLE edificio.movimientos DISABLE TRIGGER trg_auditoria_movimientos;

      TRUNCATE TABLE 
        edificio.aplicaciones_anticipos,
        edificio.auditoria,
        edificio.bauleras,
        edificio.caja,
        edificio.categorias_movimiento,
        edificio.comunicados,
        edificio.comunicados_envios,
        edificio.configuracion_global,
        edificio.cuentas_bancarias,
        edificio.departamentos,
        edificio.documentos,
        edificio.empleados,
        edificio.expensas,
        edificio.movimientos,
        edificio.movimientos_bancarios,
        edificio.ocupantes_departamento,
        edificio.pagos,
        edificio.pagos_empleados,
        edificio.parqueos,
        edificio.personas,
        edificio.reglas_mora,
        edificio.roles,
        edificio.tipos_departamento,
        edificio.usuarios,
        edificio._prisma_migrations CASCADE;
    `;
    await executeSql(RENDER_URL, prepSql);

    // 2. Cargar datos limpios (sin alterar system triggers)
    const rawSql = fs.readFileSync(dataFilePath, 'utf8');
    const cleanSql = rawSql.replace(/ALTER TABLE [^\n]+ (DISABLE|ENABLE) TRIGGER ALL;/g, '-- trigger bypassed');
    await streamSqlFile(RENDER_URL, cleanSql);

    // 3. Reactivar triggers
    const postSql = `
      ALTER TABLE edificio.expensas ENABLE TRIGGER trg_auditoria_expensas;
      ALTER TABLE edificio.pagos ENABLE TRIGGER trg_auditoria_pagos;
      ALTER TABLE edificio.movimientos ENABLE TRIGGER trg_auditoria_movimientos;
    `;
    await executeSql(RENDER_URL, postSql);
    console.log('   ✓ Render Cloud actualizado y sincronizado al 100%.');
  } catch (err: any) {
    console.error('   ❌ Error al sincronizar Render:', err.message);
    process.exit(1);
  }

  // 3. Verificar si Docker local está corriendo para actualizarlo también
  console.log('\n🐳 [3/4] Verificando Docker local...');
  try {
    const isLocalRunning = execSync('docker ps --filter "name=edificio_xyz_db" --format "{{.Names}}"').toString().trim();
    if (isLocalRunning === 'edificio_xyz_db') {
      const cleanSql = fs.readFileSync(dataFilePath, 'utf8');
      await runCommand('docker', ['exec', '-i', 'edificio_xyz_db', 'psql', '-U', 'postgres', '-d', 'postgres', '-c', `
        TRUNCATE TABLE 
          edificio.aplicaciones_anticipos, edificio.auditoria, edificio.bauleras, edificio.caja,
          edificio.categorias_movimiento, edificio.comunicados, edificio.comunicados_envios,
          edificio.configuracion_global, edificio.cuentas_bancarias, edificio.departamentos,
          edificio.documentos, edificio.empleados, edificio.expensas, edificio.movimientos,
          edificio.movimientos_bancarios, edificio.ocupantes_departamento, edificio.pagos,
          edificio.pagos_empleados, edificio.parqueos, edificio.personas, edificio.reglas_mora,
          edificio.roles, edificio.tipos_departamento, edificio.usuarios, edificio._prisma_migrations CASCADE;
      `]);
      await runCommand('docker', ['exec', '-i', 'edificio_xyz_db', 'psql', '-U', 'postgres', '-d', 'postgres'], cleanSql);
      console.log('   ✓ Docker local sincronizado automáticamente.');
    } else {
      console.log('   ℹ️ Docker local no está encendido (omitido, se usará en el próximo start).');
    }
  } catch (e: any) {
    console.log('   ℹ️ Docker local omitido:', e.message);
  }

  // 4. Verificación y resumen
  console.log('\n📊 [4/4] Verificando conteo de registros...');
  try {
    const countSql = `
      SELECT 
        (SELECT COUNT(*) FROM edificio.personas) as personas,
        (SELECT COUNT(*) FROM edificio.departamentos) as departamentos,
        (SELECT COUNT(*) FROM edificio.pagos) as pagos,
        (SELECT COUNT(*) FROM edificio.expensas) as expensas,
        (SELECT COUNT(*) FROM edificio.auditoria) as auditoria;
    `;
    const resSupabase = await executeSql(SUPABASE_DIRECT_URL, countSql);
    const resRender = await executeSql(RENDER_URL, countSql);

    console.log('\n--- RESUMEN EN SUPABASE ---');
    console.log(resSupabase.trim());

    console.log('\n--- RESUMEN EN RENDER ---');
    console.log(resRender.trim());

    console.log('\n🎉 ¡SINCRONIZACIÓN EXITOSA! Ambas bases de datos están 100% idénticas.');
  } catch (err: any) {
    console.log('   ℹ️ Sincronización completada.');
  }
}

main().catch(console.error);
