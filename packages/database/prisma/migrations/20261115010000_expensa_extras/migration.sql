-- Migración aditiva: Cargos extras en expensas y descripción en montos_agua
ALTER TABLE "edificio"."montos_agua"
  ADD COLUMN IF NOT EXISTS "descripcion" VARCHAR(200) NULL;

CREATE TABLE IF NOT EXISTS "edificio"."expensa_extras" (
  "id_extra" SERIAL NOT NULL,
  "id_expensa" INTEGER NOT NULL,
  "concepto" VARCHAR(100) NOT NULL,
  "descripcion" VARCHAR(200) NULL,
  "monto" DECIMAL(10, 2) NOT NULL,
  "anulado" BOOLEAN NOT NULL DEFAULT false,
  "id_usuario" INTEGER NULL,
  "fecha_registro" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "expensa_extras_pkey" PRIMARY KEY ("id_extra"),
  CONSTRAINT "chk_expensa_extras_monto" CHECK ("monto" > 0)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'expensa_extras_id_expensa_fkey'
      AND conrelid = 'edificio.expensa_extras'::regclass
  ) THEN
    ALTER TABLE "edificio"."expensa_extras"
      ADD CONSTRAINT "expensa_extras_id_expensa_fkey"
      FOREIGN KEY ("id_expensa")
      REFERENCES "edificio"."expensas"("id_expensa")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'expensa_extras_id_usuario_fkey'
      AND conrelid = 'edificio.expensa_extras'::regclass
  ) THEN
    ALTER TABLE "edificio"."expensa_extras"
      ADD CONSTRAINT "expensa_extras_id_usuario_fkey"
      FOREIGN KEY ("id_usuario")
      REFERENCES "edificio"."usuarios"("id_usuario")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_expensa_extras_id_expensa"
  ON "edificio"."expensa_extras"("id_expensa");

ALTER TABLE "edificio"."expensa_extras" ENABLE ROW LEVEL SECURITY;
