# database/Dockerfile
# Imagen PostgreSQL + Visor Web SQL (pgweb) para despliegue en Render
FROM postgres:17-alpine

ENV POSTGRES_DB=postgres \
    POSTGRES_USER=postgres \
    POSTGRES_PASSWORD=postgrespassword

# Instalar curl, unzip y pgweb (visor web para consultas)
RUN apk add --no-cache curl unzip && \
    curl -sL https://github.com/sosedoff/pgweb/releases/download/v0.15.0/pgweb_linux_amd64.zip -o /tmp/pgweb.zip && \
    unzip -q /tmp/pgweb.zip -d /usr/local/bin && \
    mv /usr/local/bin/pgweb_linux_amd64 /usr/local/bin/pgweb && \
    chmod +x /usr/local/bin/pgweb && \
    rm -f /tmp/pgweb.zip

# Copiar scripts de inicialización: esquema oficial e inicialización de todos los datos
COPY migrations/001_initial_schema.sql /docker-entrypoint-initdb.d/001_initial_schema.sql
COPY migrations/002_initial_data.sql /docker-entrypoint-initdb.d/002_initial_data.sql

# Copiar script de arranque que inicia PostgreSQL y el visor web para Render
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

EXPOSE 5432 10000

CMD ["/usr/local/bin/start.sh"]
