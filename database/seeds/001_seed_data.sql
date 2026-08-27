SET search_path TO edificio, public;

-- 1. Usuarios (Usando el rol 'Administrador' id_rol = 1)
INSERT INTO edificio.usuarios (id_usuario, nombre_usuario, correo, password_hash, id_rol, activo) VALUES
(1, 'admin_edificio', 'admin@edificioxyz.com', '$2a$12$eImiTXuWVxfM37uY4JANjO5E.15v6NsqNvgq2sS/L/JzYxT5rJ.m2', 1, TRUE),
(2, 'juan_perez', 'juan.perez@gmail.com', '$2a$12$eImiTXuWVxfM37uY4JANjO5E.15v6NsqNvgq2sS/L/JzYxT5rJ.m2', 3, TRUE)
ON CONFLICT (id_usuario) DO NOTHING;

SELECT setval('edificio.usuarios_id_usuario_seq', (SELECT MAX(id_usuario) FROM edificio.usuarios));

-- 2. Personas (Copropietarios y Residentes)
INSERT INTO edificio.personas (id_persona, nombres, apellidos, ci_nit, telefono, correo) VALUES
(1, 'Carlos', 'Administrador', '1234567', '70000001', 'admin@edificioxyz.com'),
(2, 'Juan', 'Pérez', '7654321', '70000002', 'juan.perez@gmail.com')
ON CONFLICT (id_persona) DO NOTHING;

SELECT setval('edificio.personas_id_persona_seq', (SELECT MAX(id_persona) FROM edificio.personas));

-- 3. Departamentos
INSERT INTO edificio.departamentos (id_departamento, numero, piso, area_m2, id_propietario, estado) VALUES
(1, '101', 1, 85.50, 2, 'Ocupado')
ON CONFLICT (id_departamento) DO NOTHING;

SELECT setval('edificio.departamentos_id_departamento_seq', (SELECT MAX(id_departamento) FROM edificio.departamentos));

-- 4. Ocupantes
INSERT INTO edificio.ocupantes_departamento (id_departamento, id_persona, tipo_ocupante, fecha_inicio) VALUES
(1, 2, 'Propietario', '2026-01-01');