-- AlterTable
ALTER TABLE "edificio"."expensas" ADD COLUMN     "monto_mora" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "edificio"."pagos" ADD COLUMN     "anulado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fecha_anulacion" TIMESTAMP(6),
ADD COLUMN     "id_pago_original" INTEGER,
ADD COLUMN     "id_usuario_anulacion" INTEGER,
ADD COLUMN     "motivo_anulacion" TEXT;

-- CreateTable
CREATE TABLE "edificio"."aplicaciones_anticipos" (
    "id_aplicacion" SERIAL NOT NULL,
    "id_pago" INTEGER NOT NULL,
    "id_expensa" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fecha" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario_registro" INTEGER,

    CONSTRAINT "aplicaciones_anticipos_pkey" PRIMARY KEY ("id_aplicacion")
);

-- CreateIndex
CREATE INDEX "idx_aplicacion_anticipo_pago" ON "edificio"."aplicaciones_anticipos"("id_pago");

-- CreateIndex
CREATE INDEX "idx_aplicacion_anticipo_expensa" ON "edificio"."aplicaciones_anticipos"("id_expensa");

-- CreateIndex
CREATE INDEX "idx_pagos_pago_original" ON "edificio"."pagos"("id_pago_original");

-- AddForeignKey
ALTER TABLE "edificio"."pagos" ADD CONSTRAINT "pagos_id_pago_original_fkey" FOREIGN KEY ("id_pago_original") REFERENCES "edificio"."pagos"("id_pago") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edificio"."aplicaciones_anticipos" ADD CONSTRAINT "aplicaciones_anticipos_id_pago_fkey" FOREIGN KEY ("id_pago") REFERENCES "edificio"."pagos"("id_pago") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edificio"."aplicaciones_anticipos" ADD CONSTRAINT "aplicaciones_anticipos_id_expensa_fkey" FOREIGN KEY ("id_expensa") REFERENCES "edificio"."expensas"("id_expensa") ON DELETE RESTRICT ON UPDATE CASCADE;
