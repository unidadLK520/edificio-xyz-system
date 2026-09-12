// backend/src/modules/auth/auth.service.ts
// Lógica de negocio de autenticación (verificación de credenciales, control de intentos fallidos y JWT)

import { compare } from 'bcryptjs';
import { SignJWT } from 'jose';
import { config } from '../../config';
import { authRepository, AuthRepository } from './auth.repository';
import { sessionManager } from './session.manager';

export interface LoginCredentials {
  correo: string;
  password: string;
}

export type LoginResult =
  | {
      success: true;
      data: {
        token: string;
        usuario: {
          idUsuario: number;
          nombreUsuario: string;
          correo: string;
          rol: string;
          ultimoAcceso: Date | null;
        };
      };
    }
  | {
      success: false;
      reason: 'INVALID_CREDENTIALS' | 'USER_INACTIVE';
      message: string;
    };

export class AuthService {
  constructor(private readonly repository: AuthRepository = authRepository) {}

  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const usuario = await this.repository.findByCorreo(credentials.correo);

    // 1. Si el usuario no existe, rechazar con mensaje genérico (CA02)
    if (!usuario) {
      return {
        success: false,
        reason: 'INVALID_CREDENTIALS',
        message: 'Credenciales inválidas',
      };
    }

    // 2. CA03: Si el usuario está inactivo, rechazar con mensaje indicando que no está habilitado
    if (!usuario.activo) {
      return {
        success: false,
        reason: 'USER_INACTIVE',
        message: 'El usuario no está habilitado',
      };
    }

    const now = new Date();

    // 3. CA02 / CA07: Verificar si el usuario se encuentra bloqueado temporalmente
    const estaBloqueado = usuario.bloqueadoHasta && usuario.bloqueadoHasta > now;
    if (estaBloqueado) {
      // Rechazar con mensaje genérico SIN revelar que la cuenta está bloqueada
      return {
        success: false,
        reason: 'INVALID_CREDENTIALS',
        message: 'Credenciales inválidas',
      };
    }

    // 4. Validar contraseña
    const passwordValido = await compare(credentials.password, usuario.passwordHash);

    if (!passwordValido) {
      // Si el bloqueo anterior ya expiró, se reinicia el conteo desde 1
      const baseIntentos =
        usuario.bloqueadoHasta && usuario.bloqueadoHasta <= now
          ? 0
          : usuario.intentosFallidos;

      const nuevosIntentos = baseIntentos + 1;

      // Al 3er intento fallido consecutivo, bloquear por 10 minutos (CA07)
      if (nuevosIntentos >= 3) {
        const bloqueadoHasta = new Date(now.getTime() + 10 * 60 * 1000);
        await this.repository.registrarIntentoFallido(
          usuario.idUsuario,
          nuevosIntentos,
          bloqueadoHasta
        );
      } else {
        await this.repository.registrarIntentoFallido(
          usuario.idUsuario,
          nuevosIntentos,
          null
        );
      }

      return {
        success: false,
        reason: 'INVALID_CREDENTIALS',
        message: 'Credenciales inválidas',
      };
    }

    // 5. Contraseña válida: reiniciar intentos, limpiar bloqueo y actualizar último acceso
    const ultimoAcceso = new Date();
    await this.repository.resetIntentos(usuario.idUsuario, ultimoAcceso);

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

    // Registrar actividad inicial de la sesión
    sessionManager.recordActivity(token);

    return {
      success: true,
      data: {
        token,
        usuario: {
          idUsuario: usuario.idUsuario,
          nombreUsuario: usuario.nombreUsuario,
          correo: usuario.correo,
          rol: usuario.rol.nombre,
          ultimoAcceso,
        },
      },
    };
  }

  logout(token: string): void {
    sessionManager.blacklistToken(token);
  }

  async getMe(idUsuario: number) {
    return this.repository.findById(idUsuario);
  }
}

export const authService = new AuthService();
