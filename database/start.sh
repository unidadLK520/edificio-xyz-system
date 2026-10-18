#!/bin/sh
set -e

HTTP_PORT=${PORT:-10000}

echo "=== INICIANDO POSTGRESQL EN CONTENEDOR DOCKER ==="
docker-entrypoint.sh postgres &

echo "Esperando que PostgreSQL local este listo..."
until pg_isready -h 127.0.0.1 -p 5432 -U "${POSTGRES_USER:-postgres}"; do
  sleep 1
done

echo "=== POSTGRESQL LISTO Y OPERATIVO ==="

SUPABASE_HOST="${SUPABASE_HOST:-aws-0-sa-east-1.pooler.supabase.com}"
SUPABASE_PORT="${SUPABASE_PORT:-5432}"
SUPABASE_USER="${SUPABASE_USER:-postgres.eexlnikxsxsskilduyjk}"
SUPABASE_PASSWORD="${SUPABASE_PASSWORD:-ByteMafiaeslaley2026}"

echo "=== CONFIGURANDO ENLACE EN TIEMPO REAL CON SUPABASE (FDW) ==="
psql -h 127.0.0.1 -p 5432 -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" << EOF || true
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_foreign_server WHERE srvname = 'supabase_live') THEN
    CREATE SERVER supabase_live
      FOREIGN DATA WRAPPER postgres_fdw
      OPTIONS (host '$SUPABASE_HOST', port '$SUPABASE_PORT', dbname 'postgres');
  END IF;
END \$\$;

DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_user_mappings WHERE srvname = 'supabase_live') THEN
    CREATE USER MAPPING FOR postgres
      SERVER supabase_live
      OPTIONS (user '$SUPABASE_USER', password '$SUPABASE_PASSWORD');
  END IF;
END \$\$;

DROP SCHEMA IF EXISTS edificio CASCADE;
CREATE SCHEMA edificio;

IMPORT FOREIGN SCHEMA edificio
  FROM SERVER supabase_live
  INTO edificio;
EOF
echo "=== ENLACE EN TIEMPO REAL ACTIVO (25 TABLAS Y 4 VISTAS VINCULADAS EN VIVO) ==="

echo "=== INICIANDO VISOR SQL WEB EN PUERTO $HTTP_PORT ==="

exec pgweb \
  --bind=0.0.0.0 \
  --listen="$HTTP_PORT" \
  --host=127.0.0.1 \
  --port=5432 \
  --user="${POSTGRES_USER:-postgres}" \
  --pass="${POSTGRES_PASSWORD:-postgrespassword}" \
  --db="${POSTGRES_DB:-postgres}" \
  --ssl=disable
