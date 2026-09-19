-- database/migrations/003_modulos_deseables.sql
-- Agrega los módulos de "requisitos deseables" de la carta: reservas de áreas
-- comunes, mantenimiento, inventario, configuración global y referencia QR en pagos.

-- =====================================================================
-- 1. CONFIGURACIÓN GLOBAL
-- =====================================================================

CREATE TABLE edificio.configuracion_global (
    clave       VARCHAR(50) PRIMARY KEY,
    valor       TEXT NOT NULL,
    descripcion TEXT
);

INSERT INTO edificio.configuracion_global (clave, valor, descripcion) VALUES
    ('nombre_edificio', 'Edificio XYZ', 'Nombre del edificio, usado en encabezados de reportes y comunicados'),
    ('moneda', 'BOB', 'Código de moneda usado en montos del sistema'),
    ('tasa_mora_default', '2.0', 'Tasa de interés por mora por defecto (%) al generar nuevas expensas'),
    ('dia_vencimiento_mensual', '10', 'Día del mes en que vencen las expensas generadas');

-- =====================================================================
-- 2. ÁREAS COMUNES Y RESERVAS
-- =====================================================================

CREATE TABLE edificio.areas_comunes (
    id_area         SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    descripcion     TEXT,
    capacidad_max   INT,
    requiere_pago   BOOLEAN NOT NULL DEFAULT FALSE,
    costo_reserva   NUMERIC(10,2),
    activa          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE edificio.reservas (
    id_reserva      SERIAL PRIMARY KEY,
    id_area         INT NOT NULL REFERENCES edificio.areas_comunes(id_area),
    id_departamento INT NOT NULL REFERENCES edificio.departamentos(id_departamento),
    fecha_reserva   DATE NOT NULL,
    hora_inicio     TIME NOT NULL,
    hora_fin        TIME NOT NULL,
    estado          VARCHAR(20) NOT NULL DEFAULT 'Confirmada',
    id_usuario_registro INT REFERENCES edificio.usuarios(id_usuario),
    fecha_creacion  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_reserva_horario CHECK (hora_fin > hora_inicio)
);

CREATE UNIQUE INDEX uq_reserva_area_horario
ON edificio.reservas(id_area, fecha_reserva, hora_inicio)
WHERE estado = 'Confirmada';

-- =====================================================================
-- 3. MANTENIMIENTO
-- =====================================================================

CREATE TABLE edificio.solicitudes_mantenimiento (
    id_solicitud    SERIAL PRIMARY KEY,
    id_departamento INT REFERENCES edificio.departamentos(id_departamento),
    titulo          VARCHAR(150) NOT NULL,
    descripcion     TEXT,
    prioridad       VARCHAR(20) NOT NULL DEFAULT 'Media',
    estado          VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
    fecha_solicitud TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_programada DATE,
    fecha_completado TIMESTAMP,
    id_empleado_asignado INT REFERENCES edificio.empleados(id_empleado),
    id_usuario_registro  INT REFERENCES edificio.usuarios(id_usuario)
);

-- =====================================================================
-- 4. INVENTARIO
-- =====================================================================

CREATE TABLE edificio.activos_inventario (
    id_activo       SERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    categoria       VARCHAR(50),
    cantidad        NUMERIC(10,2) NOT NULL DEFAULT 0,
    unidad_medida   VARCHAR(20),
    ubicacion       TEXT,
    fecha_registro  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 5. PAGOS QR (extensión, no tabla nueva)
-- =====================================================================

ALTER TABLE edificio.pagos
    ADD COLUMN referencia_qr VARCHAR(100);

-- =====================================================================
-- 6. INTEGRIDAD: un solo ocupante activo por depto y tipo
-- =====================================================================

CREATE UNIQUE INDEX uq_ocupante_activo
ON edificio.ocupantes_departamento(id_departamento, tipo_ocupante)
WHERE fecha_fin IS NULL;

-- =====================================================================
-- ÍNDICES
-- =====================================================================

CREATE INDEX idx_reservas_area ON edificio.reservas(id_area);
CREATE INDEX idx_reservas_departamento ON edificio.reservas(id_departamento);
CREATE INDEX idx_solicitudes_departamento ON edificio.solicitudes_mantenimiento(id_departamento);
CREATE INDEX idx_solicitudes_estado ON edificio.solicitudes_mantenimiento(estado);
CREATE INDEX idx_solicitudes_empleado ON edificio.solicitudes_mantenimiento(id_empleado_asignado);