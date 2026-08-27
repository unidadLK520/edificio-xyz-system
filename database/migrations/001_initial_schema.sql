-- =====================================================================
-- SISTEMA DE ADMINISTRACIÓN EDIFICIO XYZ
-- Script de creación de base de datos - PostgreSQL 14+
-- Autor: Equipo DevOps / DBA
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS edificio;
SET search_path TO edificio, public;

-- =====================================================================
-- 1. SEGURIDAD DEL SISTEMA: USUARIOS, ROLES Y PERMISOS
-- =====================================================================

CREATE TABLE edificio.roles (
    id_rol          SERIAL PRIMARY KEY,
    nombre          VARCHAR(50) NOT NULL UNIQUE,  -- Administrador, Directorio, Consulta
    descripcion     TEXT
);

CREATE TABLE edificio.usuarios (
    id_usuario      SERIAL PRIMARY KEY,
    nombre_usuario  VARCHAR(50) NOT NULL UNIQUE,
    correo          VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    id_rol          INT NOT NULL REFERENCES edificio.roles(id_rol),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion  TIMESTAMP NOT NULL DEFAULT NOW(),
    ultimo_acceso   TIMESTAMP
);

-- =====================================================================
-- 2. ADMINISTRACIÓN DE COPROPIETARIOS
-- =====================================================================

CREATE TABLE edificio.personas (
    id_persona      SERIAL PRIMARY KEY,
    nombres         VARCHAR(100) NOT NULL,
    apellidos       VARCHAR(100) NOT NULL,
    ci_nit          VARCHAR(30) NOT NULL UNIQUE,
    telefono        VARCHAR(30),
    correo          VARCHAR(150),
    direccion       TEXT,
    fecha_registro  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE edificio.departamentos (
    id_departamento SERIAL PRIMARY KEY,
    numero          VARCHAR(10) NOT NULL UNIQUE,
    piso            INT,
    area_m2         NUMERIC(8,2),
    id_propietario  INT REFERENCES edificio.personas(id_persona),
    estado          VARCHAR(20) NOT NULL DEFAULT 'Ocupado' -- Ocupado, Desocupado, En venta
);

CREATE TABLE edificio.parqueos (
    id_parqueo      SERIAL PRIMARY KEY,
    numero          VARCHAR(10) NOT NULL UNIQUE,
    id_departamento INT REFERENCES edificio.departamentos(id_departamento)
);

CREATE TABLE edificio.bauleras (
    id_baulera      SERIAL PRIMARY KEY,
    numero          VARCHAR(10) NOT NULL UNIQUE,
    id_departamento INT REFERENCES edificio.departamentos(id_departamento)
);

CREATE TABLE edificio.ocupantes_departamento (
    id_ocupacion    SERIAL PRIMARY KEY,
    id_departamento INT NOT NULL REFERENCES edificio.departamentos(id_departamento),
    id_persona      INT NOT NULL REFERENCES edificio.personas(id_persona),
    tipo_ocupante   VARCHAR(20) NOT NULL, -- Propietario, Inquilino
    fecha_inicio    DATE NOT NULL,
    fecha_fin       DATE
);

-- =====================================================================
-- 3. GESTIÓN DE EXPENSAS
-- =====================================================================

CREATE TABLE edificio.expensas (
    id_expensa          SERIAL PRIMARY KEY,
    id_departamento     INT NOT NULL REFERENCES edificio.departamentos(id_departamento),
    periodo             DATE NOT NULL,          -- primer día del mes correspondiente
    monto               NUMERIC(10,2) NOT NULL,
    tasa_interes_mora   NUMERIC(5,2) NOT NULL DEFAULT 0, -- configurable %
    fecha_vencimiento   DATE NOT NULL,
    saldo_pendiente     NUMERIC(10,2) NOT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'Pendiente', -- Pendiente, Pagado, Parcial, Moroso
    fecha_creacion      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (id_departamento, periodo)
);

CREATE TABLE edificio.pagos (
    id_pago             SERIAL PRIMARY KEY,
    id_expensa          INT REFERENCES edificio.expensas(id_expensa), 
    id_departamento     INT NOT NULL REFERENCES edificio.departamentos(id_departamento),
    monto_pagado        NUMERIC(10,2) NOT NULL,
    interes_pagado      NUMERIC(10,2) NOT NULL DEFAULT 0,
    fecha_pago          TIMESTAMP NOT NULL DEFAULT NOW(),
    metodo_pago         VARCHAR(30), -- Efectivo, Transferencia, QR, Tarjeta
    es_anticipado       BOOLEAN NOT NULL DEFAULT FALSE,
    id_usuario_registro INT REFERENCES edificio.usuarios(id_usuario),
    comprobante_url     TEXT
);

-- =====================================================================
-- 4. ADMINISTRACIÓN DE INGRESOS Y EGRESOS
-- =====================================================================

CREATE TABLE edificio.categorias_movimiento (
    id_categoria    SERIAL PRIMARY KEY,
    nombre          VARCHAR(80) NOT NULL,
    tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('Ingreso','Egreso'))
);

CREATE TABLE edificio.movimientos (
    id_movimiento   SERIAL PRIMARY KEY,
    tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('Ingreso','Egreso')),
    id_categoria    INT NOT NULL REFERENCES edificio.categorias_movimiento(id_categoria),
    monto           NUMERIC(10,2) NOT NULL,
    descripcion     TEXT,
    fecha           TIMESTAMP NOT NULL DEFAULT NOW(),
    comprobante_url TEXT,
    id_usuario_registro INT REFERENCES edificio.usuarios(id_usuario)
);

-- =====================================================================
-- 5. CAJA Y BANCOS
-- =====================================================================

CREATE TABLE edificio.cuentas_bancarias (
    id_cuenta       SERIAL PRIMARY KEY,
    banco           VARCHAR(80) NOT NULL,
    numero_cuenta   VARCHAR(50) NOT NULL,
    tipo_cuenta     VARCHAR(30),
    saldo_actual    NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE edificio.movimientos_bancarios (
    id_mov_bancario SERIAL PRIMARY KEY,
    id_cuenta       INT NOT NULL REFERENCES edificio.cuentas_bancarias(id_cuenta),
    id_movimiento   INT REFERENCES edificio.movimientos(id_movimiento),
    monto           NUMERIC(10,2) NOT NULL,
    tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('Deposito','Retiro')),
    fecha           TIMESTAMP NOT NULL DEFAULT NOW(),
    conciliado      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE edificio.caja (
    id_movimiento_caja SERIAL PRIMARY KEY,
    monto               NUMERIC(10,2) NOT NULL,
    tipo                VARCHAR(10) NOT NULL CHECK (tipo IN ('Ingreso','Egreso')),
    concepto            TEXT,
    fecha               TIMESTAMP NOT NULL DEFAULT NOW(),
    id_usuario_registro INT REFERENCES edificio.usuarios(id_usuario)
);

-- =====================================================================
-- 6. ADMINISTRACIÓN DE PERSONAL
-- =====================================================================

CREATE TABLE edificio.empleados (
    id_empleado     SERIAL PRIMARY KEY,
    nombres         VARCHAR(100) NOT NULL,
    apellidos       VARCHAR(100) NOT NULL,
    ci              VARCHAR(30) NOT NULL UNIQUE,
    cargo           VARCHAR(80),
    salario_base    NUMERIC(10,2) NOT NULL,
    fecha_ingreso   DATE NOT NULL,
    activo          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE edificio.pagos_empleados (
    id_pago_empleado SERIAL PRIMARY KEY,
    id_empleado     INT NOT NULL REFERENCES edificio.empleados(id_empleado),
    periodo         DATE NOT NULL,
    salario_pagado  NUMERIC(10,2) NOT NULL,
    anticipos       NUMERIC(10,2) NOT NULL DEFAULT 0,
    bonificaciones  NUMERIC(10,2) NOT NULL DEFAULT 0,
    descuentos      NUMERIC(10,2) NOT NULL DEFAULT 0,
    fecha_pago      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 7. COMUNICADOS Y GESTIÓN DOCUMENTAL
-- =====================================================================

CREATE TABLE edificio.comunicados (
    id_comunicado   SERIAL PRIMARY KEY,
    titulo          VARCHAR(150) NOT NULL,
    contenido       TEXT NOT NULL,
    fecha_publicacion TIMESTAMP NOT NULL DEFAULT NOW(),
    canal_envio     VARCHAR(30), -- Correo, WhatsApp, Ambos, Solo sistema
    id_usuario_creador INT REFERENCES edificio.usuarios(id_usuario)
);

CREATE TABLE edificio.comunicados_envios (
    id_envio        SERIAL PRIMARY KEY,
    id_comunicado   INT NOT NULL REFERENCES edificio.comunicados(id_comunicado),
    id_persona      INT NOT NULL REFERENCES edificio.personas(id_persona),
    fecha_envio     TIMESTAMP,
    estado_envio    VARCHAR(20) DEFAULT 'Pendiente' -- Pendiente, Enviado, Fallido
);

CREATE TABLE edificio.documentos (
    id_documento    SERIAL PRIMARY KEY,
    tipo_documento  VARCHAR(30) NOT NULL, -- Acta, Reglamento, Contrato, Factura, Fotografia, Cotizacion
    nombre          VARCHAR(200) NOT NULL,
    url_archivo     TEXT NOT NULL,
    fecha_subida    TIMESTAMP NOT NULL DEFAULT NOW(),
    id_usuario_subida INT REFERENCES edificio.usuarios(id_usuario),
    descripcion     TEXT
);

-- =====================================================================
-- 8. AUDITORÍA DEL SISTEMA
-- =====================================================================

CREATE TABLE edificio.auditoria (
    id_auditoria    BIGSERIAL PRIMARY KEY,
    tabla_afectada  VARCHAR(80) NOT NULL,
    id_registro     TEXT,
    accion          VARCHAR(10) NOT NULL CHECK (accion IN ('INSERT','UPDATE','DELETE')),
    datos_anteriores JSONB,
    datos_nuevos    JSONB,
    id_usuario      INT REFERENCES edificio.usuarios(id_usuario),
    fecha_hora      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- ÍNDICES RECOMENDADOS
-- =====================================================================

CREATE INDEX idx_expensas_departamento ON edificio.expensas(id_departamento);
CREATE INDEX idx_expensas_estado ON edificio.expensas(estado);
CREATE INDEX idx_pagos_departamento ON edificio.pagos(id_departamento);
CREATE INDEX idx_movimientos_fecha ON edificio.movimientos(fecha);
CREATE INDEX idx_movimientos_categoria ON edificio.movimientos(id_categoria);
CREATE INDEX idx_ocupantes_departamento ON edificio.ocupantes_departamento(id_departamento);
CREATE INDEX idx_auditoria_tabla ON edificio.auditoria(tabla_afectada);
CREATE INDEX idx_auditoria_usuario ON edificio.auditoria(id_usuario);

-- =====================================================================
-- FUNCIÓN Y TRIGGERS DE AUDITORÍA (CORREGIDO)
-- =====================================================================

CREATE OR REPLACE FUNCTION edificio.fn_auditoria() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO edificio.auditoria(tabla_afectada, accion, datos_anteriores)
        VALUES (TG_TABLE_NAME, 'DELETE', row_to_json(OLD)::jsonb);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO edificio.auditoria(tabla_afectada, accion, datos_anteriores, datos_nuevos)
        VALUES (TG_TABLE_NAME, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO edificio.auditoria(tabla_afectada, accion, datos_nuevos)
        VALUES (TG_TABLE_NAME, 'INSERT', row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditoria_expensas
AFTER INSERT OR UPDATE OR DELETE ON edificio.expensas
FOR EACH ROW EXECUTE FUNCTION edificio.fn_auditoria();

CREATE TRIGGER trg_auditoria_pagos
AFTER INSERT OR UPDATE OR DELETE ON edificio.pagos
FOR EACH ROW EXECUTE FUNCTION edificio.fn_auditoria();

CREATE TRIGGER trg_auditoria_movimientos
AFTER INSERT OR UPDATE OR DELETE ON edificio.movimientos
FOR EACH ROW EXECUTE FUNCTION edificio.fn_auditoria();

-- =====================================================================
-- DATOS INICIALES
-- =====================================================================

INSERT INTO edificio.roles (nombre, descripcion) VALUES
    ('Administrador', 'Acceso total al sistema'),
    ('Directorio', 'Acceso a reportes y aprobaciones'),
    ('Consulta', 'Solo lectura');

INSERT INTO edificio.categorias_movimiento (nombre, tipo) VALUES
    ('Expensas ordinarias', 'Ingreso'),
    ('Ingresos extraordinarios', 'Ingreso'),
    ('Mantenimiento', 'Egreso'),
    ('Servicios básicos', 'Egreso'),
    ('Salarios', 'Egreso'),
    ('Insumos de limpieza', 'Egreso');

-- =====================================================================
-- VISTAS ÚTILES PARA REPORTES
-- =====================================================================

CREATE VIEW edificio.vw_morosos AS
SELECT d.numero AS departamento, p.nombres, p.apellidos,
       e.periodo, e.saldo_pendiente, e.fecha_vencimiento
FROM edificio.expensas e
JOIN edificio.departamentos d ON d.id_departamento = e.id_departamento
LEFT JOIN edificio.ocupantes_departamento od ON od.id_departamento = d.id_departamento AND od.fecha_fin IS NULL
LEFT JOIN edificio.personas p ON p.id_persona = od.id_persona
WHERE e.estado IN ('Pendiente','Moroso','Parcial')
  AND e.fecha_vencimiento < CURRENT_DATE;

CREATE VIEW edificio.vw_flujo_mensual AS
SELECT date_trunc('month', fecha) AS mes,
       SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE 0 END) AS total_ingresos,
       SUM(CASE WHEN tipo = 'Egreso' THEN monto ELSE 0 END) AS total_egresos,
       SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE -monto END) AS balance
FROM edificio.movimientos
GROUP BY date_trunc('month', fecha)
ORDER BY mes;

CREATE VIEW edificio.vw_historial_pagos_departamento AS
SELECT d.numero AS departamento, pg.fecha_pago, pg.monto_pagado,
       pg.interes_pagado, pg.metodo_pago
FROM edificio.pagos pg
JOIN edificio.departamentos d ON d.id_departamento = pg.id_departamento
ORDER BY d.numero, pg.fecha_pago;