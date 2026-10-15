import 'dotenv/config';
import { prisma } from '@edificio-xyz/database';

async function main() {
  console.log('=== VERIFICANDO CONEXIONES EN BD (pg_stat_activity) ===');
  try {
    const conexiones: any[] = await prisma.$queryRaw`
      SELECT 
        pid,
        usename,
        client_addr::text AS client_addr,
        application_name,
        state,
        wait_event_type,
        wait_event,
        (now() - state_change)::text AS state_age,
        (now() - xact_start)::text AS xact_age,
        (now() - query_start)::text AS query_age,
        LEFT(query, 120) AS query_snippet
      FROM pg_stat_activity
      WHERE pid <> pg_backend_pid()
        AND datname = current_database()
      ORDER BY state_change ASC
    `;

    console.log(`Total conexiones activas para la BD actual: ${conexiones.length}`);
    for (const c of conexiones) {
      console.log({
        pid: c.pid,
        usename: c.usename,
        application_name: c.application_name,
        state: c.state,
        wait_event_type: c.wait_event_type,
        wait_event: c.wait_event,
        state_age: c.state_age,
        xact_age: c.xact_age,
        query_age: c.query_age,
        query_snippet: c.query_snippet ? c.query_snippet.replace(/\n/g, ' ') : null,
      });
    }

    const bloqueadas: any[] = await prisma.$queryRaw`
      SELECT
        blocked_locks.pid AS blocked_pid,
        blocking_locks.pid AS blocking_pid,
        blocked_activity.usename AS blocked_user,
        blocking_activity.usename AS blocking_user,
        blocked_activity.query AS blocked_statement,
        blocking_activity.query AS current_statement_in_blocking_process
      FROM pg_catalog.pg_locks blocked_locks
      JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
      JOIN pg_catalog.pg_locks blocking_locks 
        ON blocking_locks.locktype = blocked_locks.locktype
        AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
        AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
        AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
        AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
        AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
        AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
        AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
        AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
        AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
        AND blocking_locks.pid != blocked_locks.pid
      JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
      WHERE NOT blocked_locks.granted;
    `;

    console.log(`\nConsultas con locks bloqueados: ${bloqueadas.length}`);
    for (const b of bloqueadas) {
      console.log(b);
    }
  } catch (err: any) {
    console.error('Error al consultar pg_stat_activity:', err.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
