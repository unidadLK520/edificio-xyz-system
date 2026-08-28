import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class AuthService {
  static async login(email: string, passwordPlain: string) {
    // Consulta adaptada al esquema 'edificio'
    const query = `
      SELECT u.id_usuario, u.correo, u.password_hash, u.activo, u.id_rol, r.nombre AS nombre_rol
      FROM edificio.usuarios u
      JOIN edificio.roles r ON u.id_rol = r.id_rol
      WHERE u.correo = $1
    `;
    const { rows } = await pool.query(query, [email]);
    const user = rows[0];

    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    if (!user.activo) {
      throw new Error('El usuario se encuentra inactivo');
    }

    // Validar contraseña
    const isValidPassword = await bcrypt.compare(passwordPlain, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Credenciales inválidas');
    }

    // Generar JWT
    const secret = process.env.JWT_SECRET || 'secret_fallback';
    const token = jwt.sign(
      {
        id_usuario: user.id_usuario,
        correo: user.correo,
        rol: user.nombre_rol,
      },
      secret,
      { expiresIn: '8h' }
    );

    return {
      token,
      usuario: {
        id_usuario: user.id_usuario,
        correo: user.correo,
        rol: user.nombre_rol,
      },
    };
  }
}