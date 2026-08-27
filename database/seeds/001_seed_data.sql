-- Insertar datos de prueba
INSERT INTO edificio.usuarios (nombre_usuario, correo, password_hash, rol) VALUES
('admin_edificio', 'admin@edificioxyz.com', '$2a$12$eImiTXuWVxfM37uY4JANjO5E.15v6NsqNvgq2sS/L/JzYxT5rJ.m2', 'admin'),
('juan_perez', 'juan.perez@gmail.com', '$2a$12$eImiTXuWVxfM37uY4JANjO5E.15v6NsqNvgq2sS/L/JzYxT5rJ.m2', 'copropietario');

INSERT INTO edificio.personas (id_usuario, nombres, apellidos, ci_nit, telefono, es_propietario) VALUES
(1, 'Carlos', 'Administrador', '1234567', '70000001', FALSE),
(2, 'Juan', 'Pérez', '7654321', '70000002', TRUE);

INSERT INTO edificio.departamentos (numero, piso, area_m2, id_propietario) VALUES
('101', 1, 85.50, 2);