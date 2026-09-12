// backend/src/modules/auth/auth.service.ts
// Lógica de negocio de autenticación (verificación de credenciales, control de intentos fallidos y JWT)

import { compare } from 'bcryptjs';
import { decodeJwt, SignJWT } from 'jose';
import { config } from '../../config';
import { sessionManager } from './session.manager';
import { authRepository, AuthRepository } from './auth.repository';
import { auditoriaService, AuditoriaService } from '../auditoria';

export interface LoginCredentials {
  correo: string;
  password: string;
}

export interface LoginMetadata {
  ip?: string;
  userAgent?: string;
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
  constructor(
    private readonly repository: AuthRepository = authRepository,
    private readonly auditoria: AuditoriaService = auditoriaService
  ) {}

  async login(
    credentials: LoginCredentials,
    metadata?: LoginMetadata
  ): Promise<LoginResult> {
    const usuario = await this.repository.findByCorreo(credentials.correo);

    // 1. Si el usuario no existe, rechazar con mensaje genérico (CA02) y auditar
    if (!usuario) {
      await this.auditoria.registrarLoginFallido(null, {
        correo: credentials.correo,
        motivo: 'Usuario inexistente',
        resultado: 'CREDENCIALES_INVALIDAS',
        ip: metadata?.ip,
        userAgent: metadata?.userAgent,
      });

      return {
        success: false,
        reason: 'INVALID_CREDENTIALS',
        message: 'Credenciales inválidas',
      };
    }

    // 2. CA03: Si el usuario está inactivo, rechazar con mensaje indicando que no está habilitado y auditar
    if (!usuario.activo) {
      await this.auditoria.registrarLoginFallido(usuario.idUsuario, {
        correo: credentials.correo,
        motivo: 'El usuario no está habilitado (inactivo)',
        resultado: 'USUARIO_INACTIVO',
        ip: metadata?.ip,
        userAgent: metadata?.userAgent,
      });

      return {
        success: false,
        reason: 'USER_INACTIVE',
        message: 'El usuario no está habilitado',
      };
    }

    const now = new Date();

    // 3. CA02 / CA07 / CA10: Verificar si el usuario se encuentra bloqueado temporalmente
    const estaBloqueado = usuario.bloqueadoHasta && usuario.bloqueadoHasta > now;
    if (estaBloqueado) {
      await this.auditoria.registrarLoginFallido(usuario.idUsuario, {
        correo: credentials.correo,
        motivo: 'Intento durante bloqueo temporal activo',
        resultado: 'CUENTA_BLOQUEADA',
        ip: metadata?.ip,
        userAgent: metadata?.userAgent,
      });

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

      // Al 3er intento fallido consecutivo, bloquear por 10 minutos (CA07 / CA10)
      if (nuevosIntentos >= 3) {
        const bloqueadoHasta = new Date(now.getTime() + 10 * 60 * 1000);
        await this.repository.registrarIntentoFallido(
          usuario.idUsuario,
          nuevosIntentos,
          bloqueadoHasta
        );

        // Registrar evento específico de bloqueo temporal
        await this.auditoria.registrarBloqueoTemporal(usuario.idUsuario, {
          correo: credentials.correo,
          bloqueadoHasta,
          ip: metadata?.ip,
          userAgent: metadata?.userAgent,
        });

        // Registrar también el login fallido
        await this.auditoria.registrarLoginFallido(usuario.idUsuario, {
          correo: credentials.correo,
          motivo: 'Tercer intento fallido consecutivo - Cuenta bloqueada por 10 minutos',
          resultado: 'BLOQUEO_TEMPORAL',
          intentos: nuevosIntentos,
          ip: metadata?.ip,
          userAgent: metadata?.userAgent,
        });
      } else {
        await this.repository.registrarIntentoFallido(
          usuario.idUsuario,
          nuevosIntentos,
          null
        );

        await this.auditoria.registrarLoginFallido(usuario.idUsuario, {
          correo: credentials.correo,
          motivo: 'Contraseña inválida',
          resultado: 'CREDENCIALES_INVALIDAS',
          intentos: nuevosIntentos,
          ip: metadata?.ip,
          userAgent: metadata?.userAgent,
        });
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

    // Registrar auditoría de login exitoso (CA08)
    await this.auditoria.registrarLoginExitoso(usuario.idUsuario, {
      correo: usuario.correo,
      rol: usuario.rol.nombre,
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
    });

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

  async logout(token: string, metadata?: LoginMetadata): Promise<void> {
    sessionManager.blacklistToken(token);

    let idUsuario: number | null = null;
    try {
      const decoded = decodeJwt(token);
      if (decoded && typeof (decoded as any).idUsuario === 'number') {
        idUsuario = (decoded as any).idUsuario;
      }
    } catch {
      // Si el formato del token es inválido, continúa con idUsuario null
    }

    // Registrar evento de logout en auditoría (CA08)
    await this.auditoria.registrarLogout(idUsuario, {
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
    });
  }

  async getMe(idUsuario: number) {
    return this.repository.findById(idUsuario);
  }
}

export const authService = new AuthService();
