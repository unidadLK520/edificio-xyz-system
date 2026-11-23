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
      reason: 'INVALID_CREDENTIALS' | 'USER_INACTIVE' | 'SESSION_ACTIVE';
      status?: number;
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

    // 5. Contraseña válida: verificar si ya existe sesión activa (Prompt 5)
    const fechaActual = new Date();
    const sesionActiva = await this.repository.findSesionActiva(usuario.idUsuario);

    // Always deactivate existing sessions to allow re-login
    if (sesionActiva) {
      await this.repository.desactivarSesionesUsuario(usuario.idUsuario);
    }

    // 6. Crear la nueva sesión en BD respetando el índice único parcial (P2002 -> 409)
    let nuevaSesion;
    try {
      nuevaSesion = await this.repository.crearSesion({
        idUsuario: usuario.idUsuario,
        ip: metadata?.ip,
        userAgent: metadata?.userAgent,
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        await this.auditoria.registrarSesionRechazada(usuario.idUsuario, {
          correo: usuario.correo,
          motivo: 'Esta cuenta ya tiene una sesión activa (violación índice único parcial)',
          ip: metadata?.ip,
          userAgent: metadata?.userAgent,
        });

        return {
          success: false,
          reason: 'SESSION_ACTIVE',
          status: 409,
          message: 'Esta cuenta ya tiene una sesión activa',
        };
      }
      throw err;
    }

    // 7. Reiniciar intentos fallidos y actualizar último acceso en tabla usuarios
    await this.repository.resetIntentos(usuario.idUsuario, fechaActual);

    // 8. Generar JWT (8 horas) incluyendo sid
    const token = await new SignJWT({
      idUsuario: usuario.idUsuario,
      nombreUsuario: usuario.nombreUsuario,
      correo: usuario.correo,
      rol: usuario.rol.nombre,
      idRol: usuario.idRol,
      sid: nuevaSesion.idSesion,
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
          ultimoAcceso: fechaActual,
        },
      },
    };
  }

  async logout(token: string, metadata?: LoginMetadata): Promise<void> {
    console.log('[Logout] Processing logout for token');
    sessionManager.blacklistToken(token);

    let idUsuario: number | null = null;
    let sid: string | null = null;
    try {
      const decoded = decodeJwt(token);
      if (decoded) {
        if (typeof (decoded as any).idUsuario === 'number') {
          idUsuario = (decoded as any).idUsuario;
        }
        if (typeof (decoded as any).sid === 'string') {
          sid = (decoded as any).sid;
        }
      }
      console.log('[Logout] Decoded token:', { idUsuario, sid });
    } catch (error) {
      console.error('[Logout] Error decoding token:', error);
    }

    if (sid) {
      console.log('[Logout] Deactivating session by sid:', sid);
      await this.repository.desactivarSesion(sid);
    } else if (idUsuario) {
      console.log('[Logout] Deactivating all sessions for user:', idUsuario);
      await this.repository.desactivarSesionesUsuario(idUsuario);
    }

    // Registrar evento de logout en auditoría (CA08)
    await this.auditoria.registrarLogout(idUsuario, {
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
    });
    console.log('[Logout] Logout completed');
  }

  async forzarCierreSesion(
    idOperador: number,
    idUsuarioObjetivo: number,
    metadata?: LoginMetadata
  ) {
    const updateResult = await this.repository.desactivarSesionesUsuario(idUsuarioObjetivo);

    await this.auditoria.registrarSesionForzada(idOperador, idUsuarioObjetivo, {
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      cerradas: updateResult.count,
    });

    return {
      idUsuario: idUsuarioObjetivo,
      sesionesCerradas: updateResult.count,
    };
  }

  async getMe(idUsuario: number) {
    return this.repository.findById(idUsuario);
  }

  async googleAuth(googleUser: { email: string; name: string; picture?: string }) {
    // Buscar usuario por correo
    const usuario = await this.repository.findByCorreo(googleUser.email);

    if (usuario) {
      // Usuario existe, verificar si está activo
      if (!usuario.activo) {
        return {
          success: false,
          message: 'El usuario no está habilitado',
        };
      }

      // Verificar si ya tiene sesión activa
      const sesionActiva = await this.repository.findSesionActiva(usuario.idUsuario);
      if (sesionActiva) {
        // Always deactivate existing sessions for Google auth (allow re-login)
        await this.repository.desactivarSesionesUsuario(usuario.idUsuario);
      }

      // Crear nueva sesión
      const nuevaSesion = await this.repository.crearSesion({ idUsuario: usuario.idUsuario });

      // Reiniciar intentos fallidos
      await this.repository.resetIntentos(usuario.idUsuario, new Date());

      // Generar JWT
      const token = await new SignJWT({
        idUsuario: usuario.idUsuario,
        nombreUsuario: usuario.nombreUsuario,
        correo: usuario.correo,
        rol: usuario.rol.nombre,
        idRol: usuario.idRol,
        sid: nuevaSesion.idSesion,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('8h')
        .sign(config.jwtSecret);

      // Registrar actividad
      sessionManager.recordActivity(token);

      // Registrar auditoría
      await this.auditoria.registrarLoginExitoso(usuario.idUsuario, {
        correo: usuario.correo,
        rol: usuario.rol.nombre,
        ip: '0.0.0.0', // Google auth no tiene IP del cliente
        userAgent: 'Google OAuth',
      });

      return {
        success: true,
        token,
        usuario: {
          idUsuario: usuario.idUsuario,
          nombreUsuario: usuario.nombreUsuario,
          correo: usuario.correo,
          rol: usuario.rol.nombre,
          ultimoAcceso: new Date(),
        },
      };
    }

    // Usuario no existe - crear automáticamente con rol por defecto (ADMINISTRADOR)
    try {
      const nombreUsuario = googleUser.name.split(' ')[0] || googleUser.email.split('@')[0];
      const nuevoUsuario = await this.repository.crearUsuario({
        nombreUsuario,
        correo: googleUser.email,
        rol: 'ADMINISTRADOR', // Rol por defecto para usuarios de Google
      });

      // Crear sesión para el nuevo usuario
      const nuevaSesion = await this.repository.crearSesion({ idUsuario: nuevoUsuario.idUsuario });

      // Generar JWT
      const token = await new SignJWT({
        idUsuario: nuevoUsuario.idUsuario,
        nombreUsuario: nuevoUsuario.nombreUsuario,
        correo: nuevoUsuario.correo,
        rol: nuevoUsuario.rol.nombre,
        idRol: nuevoUsuario.idRol,
        sid: nuevaSesion.idSesion,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('8h')
        .sign(config.jwtSecret);

      // Registrar actividad
      sessionManager.recordActivity(token);

      // Registrar auditoría de creación y login
      await this.auditoria.registrarLoginExitoso(nuevoUsuario.idUsuario, {
        correo: nuevoUsuario.correo,
        rol: nuevoUsuario.rol.nombre,
        ip: '0.0.0.0',
        userAgent: 'Google OAuth (nuevo usuario)',
      });

      return {
        success: true,
        token,
        usuario: {
          idUsuario: nuevoUsuario.idUsuario,
          nombreUsuario: nuevoUsuario.nombreUsuario,
          correo: nuevoUsuario.correo,
          rol: nuevoUsuario.rol.nombre,
          ultimoAcceso: new Date(),
        },
      };
    } catch (error) {
      console.error('Error creando usuario de Google:', error);
      return {
        success: false,
        message: 'Error al crear usuario automáticamente',
      };
    }
  }
}

export const authService = new AuthService();
