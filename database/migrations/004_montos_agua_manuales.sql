-- database/migrations/004_montos_agua_manuales.sql
-- Migración DDL aditiva e idempotente para registro manual de montos de agua
-- Esquema: edificio

BEGIN;

CREATE TABLE IF NOT EXISTS "edificio"."montos_agua" (
    "id_monto" SERIAL NOT NULL,
    "id_departamento" integer NOT NULL,
    "periodo" date NOT NULL,
    "monto_agua" numeric(10,2) NOT NULL,
    "id_usuario_registro" integer,
    "fecha_registro" timestamp(6) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "montos_agua_pkey" PRIMARY KEY ("id_monto"),
    CONSTRAINT "uq_montos_agua_departamento_periodo" UNIQUE ("id_departamento", "periodo"),
    CONSTRAINT "chk_montos_agua_monto" CHECK ("monto_agua" >= 0)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'montos_agua_id_departamento_fkey'
          AND conrelid = 'edificio.montos_agua'::regclass
    ) THEN
        ALTER TABLE "edificio"."montos_agua"
        ADD CONSTRAINT "montos_agua_id_departamento_fkey"
        FOREIGN KEY ("id_departamento")
        REFERENCES "edificio"."departamentos"("id_departamento")
        ON DELETE RESTRICT
        ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'montos_agua_id_usuario_registro_fkey'
          AND conrelid = 'edificio.montos_agua'::regclass
    ) THEN
        ALTER TABLE "edificio"."montos_agua"
        ADD CONSTRAINT "montos_agua_id_usuario_registro_fkey"
        FOREIGN KEY ("id_usuario_registro")
        REFERENCES "edificio"."usuarios"("id_usuario")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_montos_agua_periodo"
ON "edificio"."montos_agua"("periodo");

COMMIT;
