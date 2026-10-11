# Guía de Cambios de Base de Datos para DevOps / DBAs
## Módulo de Expensas y Reglas de Mora (US2.1 / CA09 / CA10)

> **ESTADO DE LA BASE DE DATOS COMPARTIDA:**  
> **APLICADO por Giovani el 2026-10-04 en BD compartida: solo tabla reglas_mora + 1 fila**.  
> El DDL idempotente y el seed de 1 fila inicial (5% interés, 0 días de gracia, activa=true) fueron aplicados directamente en la base de datos compartida bajo autorización.
>
> **AVISO CRÍTICO PARA DESPLIEGUE:**  
> La tabla `edificio.reglas_mora` y el registro de la regla activa inicial son **estrictamente obligatorios**.  
> - Sin la tabla: `GET /api/v1/expensas/reglas-mora` y `POST /api/v1/expensas/reglas-mora` fallarán con error 500 (`relation "edificio.reglas_mora" does not exist`).  
> - Sin una regla activa: `POST /api/v1/expensas/calcular-mora` y el Cron Job de cálculo automático fallarán con código HTTP 400 (`REGLA_MORA_NO_CONFIGURADA: No existe una regla de mora activa configurada en el sistema`).

---

### 1. Script de Migración y Seed (Ejecutar en este orden)

El script es idempotente y seguro (no altera ni borra registros existentes de otras tablas).

```sql
-- ====================================================================
-- PASO 1: Creación de la tabla de Reglas de Mora (CA09)
-- Esquema: edificio
-- ====================================================================

CREATE TABLE IF NOT EXISTS "edificio"."reglas_mora" (
    "id_regla" SERIAL NOT NULL,
    "tasa_interes" DECIMAL(5,2) NOT NULL,
    "dias_gracia" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario_creacion" INTEGER,

    CONSTRAINT "reglas_mora_pkey" PRIMARY KEY ("id_regla")
);

-- ====================================================================
-- PASO 2: Clave Foránea a la tabla usuarios (Opcional ON DELETE SET NULL)
-- ====================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'reglas_mora_id_usuario_creacion_fkey'
    ) THEN
        ALTER TABLE "edificio"."reglas_mora"
        ADD CONSTRAINT "reglas_mora_id_usuario_creacion_fkey"
        FOREIGN KEY ("id_usuario_creacion")
        REFERENCES "edificio"."usuarios"("id_usuario")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END $$;

-- ====================================================================
-- PASO 3: Población Inicial (Seed): Tasa 5.0%, 0 días de gracia
-- Solo se inserta si no existe actualmente ninguna regla activa
-- ====================================================================

INSERT INTO "edificio"."reglas_mora" (
    "tasa_interes",
    "dias_gracia",
    "activa",
    "fecha_creacion",
    "id_usuario_creacion"
)
SELECT 
    5.00, 
    0, 
    true, 
    CURRENT_TIMESTAMP, 
    NULL
WHERE NOT EXISTS (
    SELECT 1 FROM "edificio"."reglas_mora" WHERE "activa" = true
);
```

---

### 2. Plan de Reversión (Rollback)

Si por alguna eventualidad se requiere dar marcha atrás al despliegue de esta característica:

```sql
-- ====================================================================
-- SCRIPT DE ROLLBACK / REVERSIÓN
-- ====================================================================

-- 1. Eliminar la restricción de clave foránea si existe
ALTER TABLE IF EXISTS "edificio"."reglas_mora"
DROP CONSTRAINT IF EXISTS "reglas_mora_id_usuario_creacion_fkey";

-- 2. Eliminar la tabla de reglas de mora
DROP TABLE IF EXISTS "edificio"."reglas_mora";
```

---

### 3. Nota Técnica para DevOps sobre `_prisma_migrations`

Dado que el DDL y Seed fueron ejecutados directamente sobre la base de datos compartida sin registrar una entrada manual en `edificio._prisma_migrations`, la tabla existe pero el CLI de Prisma Migrate no tiene asentada la migración `20261004000000_hu04_regla_mora`.

Para sincronizar formalmente el historial de Prisma en los pipelines CI/CD y evitar advertencias o intentos redundantes al ejecutar `prisma migrate deploy`, DevOps debe registrar la migración como ya aplicada con el comando:

```bash
npx prisma migrate resolve --applied 20261004000000_hu04_regla_mora
```

---

## Módulo de Pagos: Persona Pagadora Obligatoria (RN10)

### 4. DDL Idempotente: Columna `id_persona_pagador` en `edificio.pagos`

Este script agrega el campo de auditoría del pagador como clave foránea nullable con regla `ON DELETE SET NULL`. Es seguro e idempotente.

```sql
-- ====================================================================
-- PASO 1: Agregar columna id_persona_pagador (nullable)
-- ====================================================================
ALTER TABLE "edificio"."pagos" 
ADD COLUMN IF NOT EXISTS "id_persona_pagador" INTEGER;

-- ====================================================================
-- PASO 2: Clave Foránea a edificio.personas (ON DELETE SET NULL)
-- ====================================================================
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
        ON DELETE SET NULL;
    END IF;
END $$;

-- ====================================================================
-- PASO 3: Índice para optimización de consultas por pagador
-- ====================================================================
CREATE INDEX IF NOT EXISTS "idx_pagos_persona_pagador" 
ON "edificio"."pagos"("id_persona_pagador");
```

---

### 5. Plan de Reversión (Rollback)

```sql
-- ====================================================================
-- SCRIPT DE ROLLBACK / REVERSIÓN RN10
-- ====================================================================
ALTER TABLE "edificio"."pagos" DROP CONSTRAINT IF EXISTS "fk_pagos_persona_pagador";
DROP INDEX IF EXISTS "edificio"."idx_pagos_persona_pagador";
ALTER TABLE "edificio"."pagos" DROP COLUMN IF EXISTS "id_persona_pagador";
```

