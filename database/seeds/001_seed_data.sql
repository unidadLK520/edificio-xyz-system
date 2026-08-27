-- =====================================================================
-- SISTEMA DE ADMINISTRACIÓN EDIFICIO XYZ
-- Datos Semilla Iniciales (Seed Data)
-- =====================================================================

SET search_path TO edificio, public;

-- 1. SEGURIDAD
INSERT INTO edificio.usuarios (nombre_usuario, correo, password_hash, id_rol) VALUES
    ('admin', 'admin@edificioxyz.com', '$2a$12$KIXkI.z4W9H7vB5sW3s.S.8bK4dF1L1M0N1P2Q3R4S5T6U7V8W9X0', 1),
    ('directorio', 'directorio@edificioxyz.com', '$2a$12$KIXkI.z4W9H7vB5sW3s.S.8bK4dF1L1M0N1P2Q3R4S5T6U7V8W9X0', 2),
    ('consulta', 'consulta@edificioxyz.com', '$2a$12$KIXkI.z4W9H7vB5sW3s.S.8bK4dF1L1M0N1P2Q3R4S5T6U7V8W9X0', 3)
ON CONFLICT (correo) DO NOTHING;

-- 2. PERSONAS
INSERT INTO edificio.personas (id_persona, nombres, apellidos, ci_nit, telefono, correo, direccion) VALUES
    (1, 'Juan', 'Pérez Gómez', '1234567', '70011223', 'juan.perez@email.com', 'Calle Aniceto Arce 123'),
    (2, 'María', 'López Terán', '7654321', '71122334', 'maria.lopez@email.com', 'Av. Heroínas 456'),
    (3, 'Carlos', 'Rodríguez Vaca', '4567890', '72233445', 'carlos.rodriguez@email.com', 'Calle España 789')
ON CONFLICT (ci_nit) DO NOTHING;

-- Sincronizar la secuencia de id_persona
SELECT setval('edificio.personas_id_persona_seq', (SELECT MAX(id_persona) FROM edificio.personas));

-- 3. DEPARTAMENTOS, PARQUEOS Y BAULERAS
INSERT INTO edificio.departamentos (id_departamento, numero, piso, area_m2, id_propietario, estado) VALUES
    (1, '101', 1, 85.50, 1, 'Ocupado'),
    (2, '102', 1, 90.00, 2, 'Ocupado'),
    (3, '201', 2, 85.50, 3, 'Ocupado')
ON CONFLICT (numero) DO NOTHING;

SELECT setval('edificio.departamentos_id_departamento_seq', (SELECT MAX(id_departamento) FROM edificio.departamentos));

INSERT INTO edificio.parqueos (numero, id_departamento) VALUES
    ('P-101', 1),
    ('P-102', 2),
    ('P-201', 3)
ON CONFLICT (numero) DO NOTHING;

INSERT INTO edificio.bauleras (numero, id_departamento) VALUES
    ('B-101', 1),
    ('B-102', 2)
ON CONFLICT (numero) DO NOTHING;

INSERT INTO edificio.ocupantes_departamento (id_departamento, id_persona, tipo_ocupante, fecha_inicio) VALUES
    (1, 1, 'Propietario', '2024-01-01'),
    (2, 2, 'Propietario', '2024-01-01'),
    (3, 3, 'Inquilino', '2024-02-15');

-- 4. CAJA Y BANCOS
INSERT INTO edificio.cuentas_bancarias (id_cuenta, banco, numero_cuenta, tipo_cuenta, saldo_actual) VALUES
    (1, 'Banco Nacional de Bolivia', '1000-45678912', 'Cuenta Corriente', 15000.00),
    (2, 'Banco Mercantil Santa Cruz', '4010-98765432', 'Caja de Ahorro', 5000.00);

SELECT setval('edificio.cuentas_bancarias_id_cuenta_seq', (SELECT MAX(id_cuenta) FROM edificio.cuentas_bancarias));

-- 5. PERSONAL
INSERT INTO edificio.empleados (nombres, apellidos, ci, cargo, salario_base, fecha_ingreso) VALUES
    ('Roberto', 'Mendoza Soliz', '3344556', 'Portero / Encargado de Limpieza', 2500.00, '2023-05-01'),
    ('Ana', 'Gutiérrez Rocha', '6677889', 'Administradora de Contabilidad', 4000.00, '2023-01-15')
ON CONFLICT (ci) DO NOTHING;

-- 6. EXPENSAS Y PAGOS
INSERT INTO edificio.expensas (id_expensa, id_departamento, periodo, monto, tasa_interes_mora, fecha_vencimiento, saldo_pendiente, estado) VALUES
    (1, 1, '2026-08-01', 450.00, 3.50, '2026-08-10', 0.00, 'Pagado'),
    (2, 2, '2026-08-01', 480.00, 3.50, '2026-08-10', 480.00, 'Pendiente'),
    (3, 3, '2026-08-01', 450.00, 3.50, '2026-08-10', 450.00, 'Moroso')
ON CONFLICT (id_departamento, periodo) DO NOTHING;

SELECT setval('edificio.expensas_id_expensa_seq', (SELECT MAX(id_expensa) FROM edificio.expensas));

INSERT INTO edificio.pagos (id_expensa, id_departamento, monto_pagado, interes_pagado, fecha_pago, metodo_pago, id_usuario_registro, id_cuenta) VALUES
    (1, 1, 450.00, 0.00, NOW(), 'Transferencia', 1, 1);