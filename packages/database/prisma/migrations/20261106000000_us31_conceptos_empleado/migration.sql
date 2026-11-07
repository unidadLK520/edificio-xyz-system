CREATE TABLE IF NOT EXISTS "edificio"."conceptos_empleado" (
  "id_concepto_empleado" SERIAL NOT NULL,
  "id_empleado" INTEGER NOT NULL,
  "tipo" VARCHAR(20) NOT NULL,
  "monto" DECIMAL(10,2) NOT NULL,
  "fecha" DATE NOT NULL DEFAULT CURRENT_DATE,
  "periodo" DATE,
  "motivo" VARCHAR(200) NOT NULL,
  "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conceptos_empleado_pkey" PRIMARY KEY ("id_concepto_empleado"),
  CONSTRAINT "conceptos_empleado_tipo_check" CHECK ("tipo" IN ('ANTICIPO','BONIFICACION','DESCUENTO')),
  CONSTRAINT "conceptos_empleado_monto_check" CHECK ("monto" > 0)
);
CREATE INDEX IF NOT EXISTS "idx_conceptos_empleado_empleado_tipo"
  ON "edificio"."conceptos_empleado" ("id_empleado", "tipo", "fecha");
ALTER TABLE "edificio"."conceptos_empleado"
  ADD CONSTRAINT "conceptos_empleado_id_empleado_fkey" FOREIGN KEY ("id_empleado")
  REFERENCES "edificio"."empleados"("id_empleado") ON DELETE RESTRICT ON UPDATE CASCADE;
