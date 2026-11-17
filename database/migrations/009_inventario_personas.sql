-- database/migrations/009_inventario_personas.sql
-- Migración aditiva: estado_civil y cantidad_hijos en personas, cantidad_habitantes en departamentos

ALTER TABLE "edificio"."personas"
  ADD COLUMN IF NOT EXISTS "estado_civil" VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS "cantidad_hijos" SMALLINT NULL;

ALTER TABLE "edificio"."departamentos"
  ADD COLUMN IF NOT EXISTS "cantidad_habitantes" SMALLINT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'personas_cantidad_hijos_check'
      AND conrelid = 'edificio.personas'::regclass
  ) THEN
    ALTER TABLE "edificio"."personas"
      ADD CONSTRAINT "personas_cantidad_hijos_check"
      CHECK ("cantidad_hijos" >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'departamentos_cantidad_habitantes_check'
      AND conrelid = 'edificio.departamentos'::regclass
  ) THEN
    ALTER TABLE "edificio"."departamentos"
      ADD CONSTRAINT "departamentos_cantidad_habitantes_check"
      CHECK ("cantidad_habitantes" >= 0);
  END IF;
END $$;
