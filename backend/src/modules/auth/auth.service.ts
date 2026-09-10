// backend/src/modules/auth/auth.service.ts
// Lógica de negocio de autenticación (verificación de contraseña y generación de JWT)

import { compare } from 'bcryptjs';
import { SignJWT } from 'jose';
import { config } from '../../config';
import { authRepository, AuthRepository } from './auth.repository';

export interface LoginCredentials {
  correo: string;
  password: string;
}

export class AuthService {
  constructor(private readonly repository: AuthRepository = authRepository) {}

  async login(credentials: LoginCredentials) {
    const usuario = await this.repository.findByCorreo(credentials.correo);

    if (!usuario || !usuario.activo) {
      return null;
    }

    const passwordValido = await compare(credentials.password, usuario.passwordHash);
    if (!passwordValido) {
      return null;
    }

    // Actualizar último acceso
    await this.repository.updateUltimoAcceso(usuario.idUsuario, new Date());

    // Generar JWT (8 horas)
    const token = await new SignJWT({
      idUsuario: usuario.idUsuario,
      nombreUsuario: usuario.nombreUsuario,
      correo: usuario.correo,
      rol: usuario.rol.nombre,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(config.jwtSecret);

    return {
      token,
      usuario: {
        idUsuario: usuario.idUsuario,
        nombreUsuario: usuario.nombreUsuario,
        correo: usuario.correo,
        rol: usuario.rol.nombre,
        ultimoAcceso: usuario.ultimoAcceso,
      },
    };
  }

  async getMe(idUsuario: number) {
    return this.repository.findById(idUsuario);
  }
}

export const authService = new AuthService();
