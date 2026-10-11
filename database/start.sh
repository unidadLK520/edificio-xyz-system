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
