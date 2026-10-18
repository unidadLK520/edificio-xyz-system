-- database/migrations/005_movimientos_ingresos_egresos.sql
-- Migración aditiva e idempotente para US2.3 (Prompt 9): Campos tercero, nro_factura y metodo_pago en movimientos

BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE edificio.movimientos
  ADD COLUMN IF NOT EXISTS tercero VARCHAR(120),
  ADD COLUMN IF NOT EXISTS nro_factura VARCHAR(50),
  ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(30);

COMMIT;
