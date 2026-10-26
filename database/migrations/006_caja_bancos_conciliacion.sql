-- database/migrations/006_caja_bancos_conciliacion.sql
-- Migración aditiva e idempotente para US1.4: Caja, Bancos y Conciliación Bancaria

BEGIN;

SET LOCAL lock_timeout = '5s';

-- 1. CAJA: campos de anulación
ALTER TABLE edificio.caja
  ADD COLUMN IF NOT EXISTS anulado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_anulacion timestamp,
  ADD COLUMN IF NOT EXISTS id_usuario_anulacion integer,
  ADD COLUMN IF NOT EXISTS motivo_anulacion text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_caja_usuario_anulacion'
  ) THEN
    ALTER TABLE edificio.caja
      ADD CONSTRAINT fk_caja_usuario_anulacion
      FOREIGN KEY (id_usuario_anulacion) REFERENCES edificio.usuarios(id_usuario)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- 2. CUENTAS BANCARIAS: saldo_inicial e índice único en numero_cuenta
ALTER TABLE edificio.cuentas_bancarias
  ADD COLUMN IF NOT EXISTS saldo_inicial numeric(12,2) NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cuentas_bancarias_numero_cuenta
  ON edificio.cuentas_bancarias (numero_cuenta);

-- 3. MOVIMIENTOS BANCARIOS: concepto, referencia, auditoría y conciliación
ALTER TABLE edificio.movimientos_bancarios
  ADD COLUMN IF NOT EXISTS concepto text,
  ADD COLUMN IF NOT EXISTS referencia varchar(100),
  ADD COLUMN IF NOT EXISTS id_usuario_registro integer,
  ADD COLUMN IF NOT EXISTS estado_conciliacion varchar(20) NOT NULL DEFAULT 'Pendiente',
  ADD COLUMN IF NOT EXISTS diferencia numeric(12,2),
  ADD COLUMN IF NOT EXISTS fecha_conciliacion timestamp,
  ADD COLUMN IF NOT EXISTS id_usuario_conciliacion integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_mov_bancarios_usuario_registro'
  ) THEN
    ALTER TABLE edificio.movimientos_bancarios
      ADD CONSTRAINT fk_mov_bancarios_usuario_registro
      FOREIGN KEY (id_usuario_registro) REFERENCES edificio.usuarios(id_usuario)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_mov_bancarios_usuario_conciliacion'
  ) THEN
    ALTER TABLE edificio.movimientos_bancarios
      ADD CONSTRAINT fk_mov_bancarios_usuario_conciliacion
      FOREIGN KEY (id_usuario_conciliacion) REFERENCES edificio.usuarios(id_usuario)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- 4. SALDO INICIAL DE CAJA: clave global
INSERT INTO edificio.configuracion_global (clave, valor, descripcion)
VALUES ('saldo_inicial_caja', '0.00', 'Saldo inicial de apertura de caja')
ON CONFLICT (clave) DO NOTHING;

COMMIT;
