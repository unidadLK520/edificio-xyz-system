INSERT INTO edificio.usuarios (nombre_usuario, correo, password_hash, id_rol) VALUES
    ('admin', 'admin@edificioxyz.com', '$2b$10$pNhqOwIpILk0PYaMr58XEO/VfC8.w0r/Yb48CSssHWvmKI.aHjBhC', 1),
    ('directorio', 'directorio@edificioxyz.com', '$2b$10$sQLf/4Tiy81xz.UsZNZyyOYuu7Q2WaW8lviuEdG7/EzELxNsBmh8y', 2),
    ('consulta', 'consulta@edificioxyz.com', '$2b$10$cmJ8YbXyZcT.XyvAtuKD.OqYMA48m/9Lo7H5DZHbYY5ksVaBfj8ga', 3)
ON CONFLICT (correo) DO NOTHING;