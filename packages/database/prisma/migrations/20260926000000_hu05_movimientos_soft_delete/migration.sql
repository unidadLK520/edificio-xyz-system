-- AlterTable: Agregar campos de soft-delete (anulación) a movimientos
ALTER TABLE "edificio"."movimientos" ADD COLUMN     "anulado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fecha_anulacion" TIMESTAMP(6),
ADD COLUMN     "id_usuario_anulacion" INTEGER,
ADD COLUMN     "motivo_anulacion" TEXT;

-- CreateIndex: Índice único compuesto en categorias_movimiento (nombre, tipo)
CREATE UNIQUE INDEX "categorias_movimiento_nombre_tipo_key" ON "edificio"."categorias_movimiento"("nombre", "tipo");
