SET search_path TO edificio, public;

-- =====================================================================
-- DATOS SEMILLA (SEED DATA) DE PRUEBA - EDIFICIO XYZ
-- =====================================================================

-- 1. Usuarios del Sistema
INSERT INTO edificio.usuarios (nombre_usuario, correo, password_hash, id_rol) VALUES
    ('admin', 'admin@edificioxyz.com', '$2a$12$eImiTXuWVxfM37uY4JANjOL.88448rGfJp5.1234567890abc', 1),
    ('directorio', 'directorio@edificioxyz.com', '$2a$12$eImiTXuWVxfM37uY4JANjOL.88448rGfJp5.1234567890abc', 2),
    ('consulta', 'consulta@edificioxyz.com', '$2a$12$eImiTXuWVxfM37uY4JANjOL.88448rGfJp5.1234567890abc', 3);

-- 2. Copropietarios (Personas)
INSERT INTO edificio.personas (nombres, apellidos, ci_nit, telefono, correo, direccion) VALUES
    ('Carlos', 'Mendoza', '4589123 LP', '71523489', 'carlos.mendoza@gmail.com', 'Edificio XYZ, Dpto 101'),
    ('Ana', 'Rios', '3891204 CB', '78912345', 'ana.rios@gmail.com', 'Edificio XYZ, Dpto 102'),
    ('Roberto', 'Gomez', '5129034 SC', '76543210', 'roberto.gomez@gmail.com', 'Edificio XYZ, Dpto 201');

-- 3. Departamentos
INSERT INTO edificio.departamentos (numero, piso, area_m2, id_propietario, estado) VALUES
    ('101', 1, 85.50, 1, 'Ocupado'),
    ('102', 1, 92.00, 2, 'Ocupado'),
    ('201', 2, 85.50, 3, 'Ocupado');

-- 4. Parqueos y Bauleras
INSERT INTO edificio.parqueos (numero, id_departamento) VALUES
    ('P-01', 1),
    ('P-02', 2),
    ('P-03', 3);

INSERT INTO edificio.bauleras (numero, id_departamento) VALUES
    ('B-01', 1),
    ('B-02', 2);

-- 5. Historial de Ocupantes
INSERT INTO edificio.ocupantes_departamento (id_departamento, id_persona, tipo_ocupante, fecha_inicio) VALUES
    (1, 1, 'Propietario', '2025-01-01'),
    (2, 2, 'Propietario', '2025-01-01'),
    (3, 3, 'Propietario', '2025-02-01');

-- 6. Expensas
INSERT INTO edificio.expensas (id_departamento, periodo, monto, fecha_vencimiento, saldo_pendiente, estado) VALUES
    (1, '2026-07-01', 450.00, '2026-07-10', 0.00, 'Pagado'),
    (2, '2026-07-01', 480.00, '2026-07-10', 0.00, 'Pagado'),
    (3, '2026-07-01', 450.00, '2026-07-10', 450.00, 'Moroso'),
    (1, '2026-08-01', 450.00, '2026-08-10', 450.00, 'Pendiente'),
    (2, '2026-08-01', 480.00, '2026-08-10', 480.00, 'Pendiente');

-- 7. Pagos Registrados
INSERT INTO edificio.pagos (id_expensa, id_departamento, monto_pagado, metodo_pago, id_usuario_registro) VALUES
    (1, 1, 450.00, 'Transferencia', 1),
    (2, 2, 480.00, 'QR', 1);

-- 8. Cuentas Bancarias
INSERT INTO edificio.cuentas_bancarias (banco, numero_cuenta, tipo_cuenta, saldo_actual) VALUES
    ('Banco Nacional', '1000-459201-9', 'Cuenta Corriente', 15430.50);

-- 9. Empleados
INSERT INTO edificio.empleados (nombres, apellidos, ci, cargo, salario_base, fecha_ingreso) VALUES
    ('Mario', 'Condori', '6781203 LP', 'Portero / Conserje', 2500.00, '2024-03-01');