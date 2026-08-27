CREATE SCHEMA IF NOT EXISTS edificio;

CREATE TABLE edificio.usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre_usuario VARCHAR(50) UNIQUE NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) CHECK (rol IN ('admin', 'copropietario', 'inquilino', 'personal')) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edificio.personas (
    id_persona SERIAL PRIMARY KEY,
    id_usuario INT UNIQUE REFERENCES edificio.usuarios(id_usuario) ON DELETE SET NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    ci_nit VARCHAR(20) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    es_propietario BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edificio.departamentos (
    id_departamento SERIAL PRIMARY KEY,
    numero VARCHAR(10) UNIQUE NOT NULL,
    piso INT NOT NULL,
    area_m2 NUMERIC(8,2) NOT NULL,
    id_propietario INT REFERENCES edificio.personas(id_persona) ON DELETE SET NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edificio.parqueos (
    id_parqueo SERIAL PRIMARY KEY,
    numero VARCHAR(10) UNIQUE NOT NULL,
    id_departamento INT REFERENCES edificio.departamentos(id_departamento) ON DELETE SET NULL
);

CREATE TABLE edificio.bauleras (
    id_baulera SERIAL PRIMARY KEY,
    numero VARCHAR(10) UNIQUE NOT NULL,
    id_departamento INT REFERENCES edificio.departamentos(id_departamento) ON DELETE SET NULL
);

CREATE TABLE edificio.ocupantes_departamento (
    id_ocupante SERIAL PRIMARY KEY,
    id_departamento INT REFERENCES edificio.departamentos(id_departamento) ON DELETE CASCADE,
    id_persona INT REFERENCES edificio.personas(id_persona) ON DELETE CASCADE,
    tipo_residente VARCHAR(20) CHECK (tipo_residente IN ('propietario', 'inquilino', 'familiar')) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE
);

CREATE TABLE edificio.expensas (
    id_expensa SERIAL PRIMARY KEY,
    id_departamento INT REFERENCES edificio.departamentos(id_departamento) ON DELETE CASCADE,
    periodo VARCHAR(7) NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado VARCHAR(20) CHECK (estado IN ('pendiente', 'pagado', 'mora')) DEFAULT 'pendiente',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edificio.pagos (
    id_pago SERIAL PRIMARY KEY,
    id_expensa INT REFERENCES edificio.expensas(id_expensa) ON DELETE CASCADE,
    id_departamento INT REFERENCES edificio.departamentos(id_departamento) ON DELETE CASCADE,
    monto_pagado NUMERIC(10,2) NOT NULL,
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metodo_pago VARCHAR(30) CHECK (metodo_pago IN ('transferencia', 'efectivo', 'qr')) NOT NULL,
    comprobante_url VARCHAR(255)
);

CREATE TABLE edificio.cuentas_bancarias (
    id_cuenta SERIAL PRIMARY KEY,
    banco VARCHAR(100) NOT NULL,
    numero_cuenta VARCHAR(50) UNIQUE NOT NULL,
    tipo_cuenta VARCHAR(30) NOT NULL,
    saldo NUMERIC(12,2) DEFAULT 0.00
);

CREATE TABLE edificio.movimientos_caja (
    id_movimiento SERIAL PRIMARY KEY,
    tipo VARCHAR(10) CHECK (tipo IN ('ingreso', 'egreso')) NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    concepto TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edificio.empleados (
    id_empleado SERIAL PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    ci VARCHAR(20) UNIQUE NOT NULL,
    cargo VARCHAR(50) NOT NULL,
    salario NUMERIC(10,2) NOT NULL,
    fecha_contratacion DATE NOT NULL
);

CREATE TABLE edificio.pagos_salarios (
    id_pago_salario SERIAL PRIMARY KEY,
    id_empleado INT REFERENCES edificio.empleados(id_empleado) ON DELETE CASCADE,
    periodo VARCHAR(7) NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    fecha_pago DATE NOT NULL
);

CREATE TABLE edificio.comunicados (
    id_comunicado SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    contenido TEXT NOT NULL,
    publicado_por INT REFERENCES edificio.usuarios(id_usuario),
    fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edificio.documentos (
    id_documento SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    archivo_url VARCHAR(255) NOT NULL,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edificio.reservas (
    id_reserva SERIAL PRIMARY KEY,
    id_departamento INT REFERENCES edificio.departamentos(id_departamento) ON DELETE CASCADE,
    area VARCHAR(50) CHECK (area IN ('churrasquera', 'salon_eventos')) NOT NULL,
    fecha_reserva DATE NOT NULL,
    estado VARCHAR(20) CHECK (estado IN ('confirmada', 'cancelada')) DEFAULT 'confirmada'
);

CREATE TABLE edificio.auditoria (
    id_auditoria SERIAL PRIMARY KEY,
    tabla_afectada VARCHAR(50) NOT NULL,
    operacion VARCHAR(10) NOT NULL,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ejecutado_por VARCHAR(50) DEFAULT CURRENT_USER,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);