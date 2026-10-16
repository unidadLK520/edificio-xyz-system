-- CreateTable: Reglas de Mora (CA09)
CREATE TABLE IF NOT EXISTS "edificio"."reglas_mora" (
    "id_regla" SERIAL NOT NULL,
    "tasa_interes" DECIMAL(5,2) NOT NULL,
    "dias_gracia" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario_creacion" INTEGER,

    CONSTRAINT "reglas_mora_pkey" PRIMARY KEY ("id_regla")
);

-- AddForeignKey
ALTER TABLE "edificio"."reglas_mora" ADD CONSTRAINT "reglas_mora_id_usuario_creacion_fkey" FOREIGN KEY ("id_usuario_creacion") REFERENCES "edificio"."usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
