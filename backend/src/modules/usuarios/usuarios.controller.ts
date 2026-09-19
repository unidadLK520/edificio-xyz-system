// backend/src/modules/usuarios/usuarios.controller.ts
// Controlador HTTP para endpoints de administración de usuarios y personas (CA09)

import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { usuariosService, UsuariosService } from './usuarios.service';

const personaSchema = z.object({
  nombres: z.string().min(2, 'Los nombres deben tener al menos 2 caracteres'),
  apellidos: z.string().min(2, 'Los apellidos deben tener al menos 2 caracteres'),
  ciNit: z.string().min(3, 'El CI / NIT es obligatorio'),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  correo: z.string().email('Correo de persona inválido').optional().nullable(),
});

const registrarUsuarioSchema = z.object({
  nombreUsuario: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres'),
  correo: z.string().email('Debe ser un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  rol: z.string().min(1, 'El rol es obligatorio'),
  idPersona: z.number().optional().nullable(),
  persona: personaSchema.optional().nullable(),
  activo: z.boolean().optional(),
});

const cambiarEstadoSchema = z.object({
  activo: z.boolean({ required_error: 'El campo activo es obligatorio' }),
});

const cambiarRolSchema = z.object({
  rol: z.string().min(1, 'El rol es obligatorio'),
});

export class UsuariosController {
  constructor(private readonly service: UsuariosService = usuariosService) {}

  listarUsuarios = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const usuarios = await this.service.obtenerUsuarios();
      res.json(usuarios);
    } catch (error: any) {
      res.status(500).json({ error: 'Error Interno', message: error.message });
    }
  };

  listarRoles = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const roles = await this.service.obtenerRoles();
      res.json(roles);
    } catch (error: any) {
      res.status(500).json({ error: 'Error Interno', message: error.message });
    }
  };

  listarPersonas = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const personas = await this.service.obtenerPersonas();
      res.json(personas);
    } catch (error: any) {
      res.status(500).json({ error: 'Error Interno', message: error.message });
    }
  };

  registrarUsuario = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parseResult = registrarUsuarioSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Bad Request',
          message: parseResult.error.errors.map((e) => e.message).join(', '),
        });
        return;
      }

      const adminId = req.user?.idUsuario ?? 1;
      const nuevoUsuario = await this.service.registrarUsuario(parseResult.data, adminId);
      res.status(201).json(nuevoUsuario);
    } catch (error: any) {
      res.status(400).json({ error: 'Error al registrar usuario y persona', message: error.message });
    }
  };

  cambiarEstado = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const idUsuario = parseInt(req.params.id, 10);
      if (isNaN(idUsuario)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de usuario inválido' });
        return;
      }

      const parseResult = cambiarEstadoSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Bad Request',
          message: parseResult.error.errors.map((e) => e.message).join(', '),
        });
        return;
      }

      const adminId = req.user?.idUsuario ?? 1;
      const actualizado = await this.service.cambiarEstadoUsuario(
        idUsuario,
        parseResult.data.activo,
        adminId
      );
      res.json(actualizado);
    } catch (error: any) {
      res.status(400).json({ error: 'Error al cambiar estado', message: error.message });
    }
  };

  cambiarRol = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const idUsuario = parseInt(req.params.id, 10);
      if (isNaN(idUsuario)) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de usuario inválido' });
        return;
      }

      const parseResult = cambiarRolSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Bad Request',
          message: parseResult.error.errors.map((e) => e.message).join(', '),
        });
        return;
      }

      const adminId = req.user?.idUsuario ?? 1;
      const actualizado = await this.service.cambiarRolUsuario(
        idUsuario,
        parseResult.data.rol,
        adminId
      );
      res.json(actualizado);
    } catch (error: any) {
      res.status(400).json({ error: 'Error al cambiar rol', message: error.message });
    }
  };
}

export const usuariosController = new UsuariosController();
