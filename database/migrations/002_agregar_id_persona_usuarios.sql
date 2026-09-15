-- database/migrations/002_agregar_id_persona_usuarios.sql
-- Vincula opcionalmente una cuenta de usuario con su registro de persona real

ALTER TABLE edificio.usuarios 
    ADD COLUMN id_persona INT REFERENCES edificio.personas(id_persona);

CREATE INDEX idx_usuarios_persona ON edificio.usuarios(id_persona);