-- database/migrations/003_expensas_agua_sesiones_pagos.sql
-- Migración DDL aditiva e idempotente para US2 (Expensas, Agua, Pagos y Sesiones)
-- Esquema: edificio

BEGIN;

-- ====================================================================
-- 1. MODIFICACIONES EN tipos_departamento
-- ====================================================================
ALTER TABLE "edificio"."tipos_departamento"
    ALTER COLUMN "nombre" TYPE varchar(60);

ALTER TABLE "edificio"."tipos_departamento"
    ADD COLUMN IF NOT EXISTS "activo" boolean NOT NULL DEFAULT true;

ALTER TABLE "edificio"."tipos_departamento"
    ADD COLUMN IF NOT EXISTS "area_m2" numeric(8,2);

-- ====================================================================
-- 2. MODIFICACIONES EN expensas
-- ====================================================================
ALTER TABLE "edificio"."expensas"
    ADD COLUMN IF NOT EXISTS "monto_base" numeric(10,2);

ALTER TABLE "edificio"."expensas"
    ADD COLUMN IF NOT EXISTS "monto_agua" numeric(10,2) NOT NULL DEFAULT 0;

UPDATE "edificio"."expensas"
SET "monto_base" = "monto"
WHERE "monto_base" IS NULL;

-- ====================================================================
-- 3. MODIFICACIONES EN pagos
-- ====================================================================
ALTER TABLE "edificio"."pagos"
    ADD COLUMN IF NOT EXISTS "id_persona_pagador" integer;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_pagos_persona_pagador'
    ) THEN
        ALTER TABLE "edificio"."pagos"
        ADD CONSTRAINT "fk_pagos_persona_pagador"
        FOREIGN KEY ("id_persona_pagador")
        REFERENCES "edificio"."personas"("id_persona")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_pagos_persona_pagador"
ON "edificio"."pagos"("id_persona_pagador");

-- ====================================================================
-- 4. TABLA NUEVA: tarifas_agua (estilo reglas_mora)
-- ====================================================================
CREATE TABLE IF NOT EXISTS "edificio"."tarifas_agua" (
    "id_tarifa" SERIAL NOT NULL,
    "precio_m3" numeric(10,2) NOT NULL,
    "activa" boolean NOT NULL DEFAULT true,
    "fecha_creacion" timestamp(6) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario_creacion" integer,

    CONSTRAINT "tarifas_agua_pkey" PRIMARY KEY ("id_tarifa"),
    CONSTRAINT "chk_tarifas_agua_precio_m3" CHECK ("precio_m3" >= 0)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'tarifas_agua_id_usuario_creacion_fkey'
    ) THEN
        ALTER TABLE "edificio"."tarifas_agua"
        ADD CONSTRAINT "tarifas_agua_id_usuario_creacion_fkey"
        FOREIGN KEY ("id_usuario_creacion")
        REFERENCES "edificio"."usuarios"("id_usuario")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_tarifas_agua_activa"
ON "edificio"."tarifas_agua"("activa");

-- ====================================================================
-- 5. TABLA NUEVA: lecturas_agua
-- ====================================================================
CREATE TABLE IF NOT EXISTS "edificio"."lecturas_agua" (
    "id_lectura" SERIAL NOT NULL,
    "id_departamento" integer NOT NULL,
    "periodo" date NOT NULL,
    "lectura_anterior" numeric(10,2) NOT NULL DEFAULT 0,
    "lectura_actual" numeric(10,2) NOT NULL,
    "consumo_m3" numeric(10,2) NOT NULL,
    "precio_m3" numeric(10,2) NOT NULL,
    "monto_agua" numeric(10,2) NOT NULL DEFAULT 0,
    "id_usuario_registro" integer,
    "fecha_registro" timestamp(6) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lecturas_agua_pkey" PRIMARY KEY ("id_lectura"),
    CONSTRAINT "uq_lecturas_agua_departamento_periodo" UNIQUE ("id_departamento", "periodo"),
    CONSTRAINT "chk_lecturas_agua_lecturas" CHECK ("lectura_actual" >= "lectura_anterior"),
    CONSTRAINT "chk_lecturas_agua_consumo" CHECK ("consumo_m3" >= 0),
    CONSTRAINT "chk_lecturas_agua_precio" CHECK ("precio_m3" >= 0),
    CONSTRAINT "chk_lecturas_agua_monto" CHECK ("monto_agua" >= 0)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lecturas_agua_id_departamento_fkey'
    ) THEN
        ALTER TABLE "edificio"."lecturas_agua"
        ADD CONSTRAINT "lecturas_agua_id_departamento_fkey"
        FOREIGN KEY ("id_departamento")
        REFERENCES "edificio"."departamentos"("id_departamento")
        ON DELETE RESTRICT
        ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'lecturas_agua_id_usuario_registro_fkey'
    ) THEN
        ALTER TABLE "edificio"."lecturas_agua"
        ADD CONSTRAINT "lecturas_agua_id_usuario_registro_fkey"
        FOREIGN KEY ("id_usuario_registro")
        REFERENCES "edificio"."usuarios"("id_usuario")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_lecturas_agua_departamento"
ON "edificio"."lecturas_agua"("id_departamento");

CREATE INDEX IF NOT EXISTS "idx_lecturas_agua_periodo"
ON "edificio"."lecturas_agua"("periodo");

-- ====================================================================
-- 6. TABLA NUEVA: sesiones
-- ====================================================================
CREATE TABLE IF NOT EXISTS "edificio"."sesiones" (
    "id_sesion" uuid NOT NULL DEFAULT gen_random_uuid(),
    "id_usuario" integer NOT NULL,
    "fecha_inicio" timestamp(6) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_acceso" timestamp(6) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activa" boolean NOT NULL DEFAULT true,
    "ip" varchar(45),
    "user_agent" text,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id_sesion")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'sesiones_id_usuario_fkey'
    ) THEN
        ALTER TABLE "edificio"."sesiones"
        ADD CONSTRAINT "sesiones_id_usuario_fkey"
        FOREIGN KEY ("id_usuario")
        REFERENCES "edificio"."usuarios"("id_usuario")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
END $$;

-- Índice único parcial: un usuario solo puede tener una sesión activa a la vez
CREATE UNIQUE INDEX IF NOT EXISTS "idx_sesiones_usuario_activa"
ON "edificio"."sesiones"("id_usuario")
WHERE ("activa" = true);

CREATE INDEX IF NOT EXISTS "idx_sesiones_usuario"
ON "edificio"."sesiones"("id_usuario");

COMMIT;
