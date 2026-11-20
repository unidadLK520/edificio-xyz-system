-- database/migrations/007_mora_persistente.sql
-- Migración aditiva: Columnas para mora persistente en reglas_mora

ALTER TABLE "edificio"."reglas_mora"
  ADD COLUMN IF NOT EXISTS "tipo_calculo" VARCHAR(20) NOT NULL DEFAULT 'PORCENTAJE',
  ADD COLUMN IF NOT EXISTS "monto_fijo" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "dia_vencimiento" SMALLINT,
  ADD COLUMN IF NOT EXISTS "dia_generacion" SMALLINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reglas_mora_tipo_calculo_check'
  ) THEN
    ALTER TABLE "edificio"."reglas_mora"
      ADD CONSTRAINT "reglas_mora_tipo_calculo_check"
      CHECK ("tipo_calculo" IN ('PORCENTAJE', 'FIJO'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reglas_mora_dia_vencimiento_check'
  ) THEN
    ALTER TABLE "edificio"."reglas_mora"
      ADD CONSTRAINT "reglas_mora_dia_vencimiento_check"
      CHECK ("dia_vencimiento" IS NULL OR ("dia_vencimiento" >= 1 AND "dia_vencimiento" <= 31));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reglas_mora_dia_generacion_check'
  ) THEN
    ALTER TABLE "edificio"."reglas_mora"
      ADD CONSTRAINT "reglas_mora_dia_generacion_check"
      CHECK ("dia_generacion" IS NULL OR ("dia_generacion" >= 1 AND "dia_generacion" <= 31));
  END IF;
END $$;
