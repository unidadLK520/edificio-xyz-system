// backend/src/modules/usuarios/usuarios.routes.ts
// Rutas protegidas para administración de usuarios (CA04, CA09)

import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';
import { usuariosController } from './usuarios.controller';

export const usuariosRouter: Router = Router();

// Todas las rutas requieren token y rol de ADMINISTRADOR
usuariosRouter.use(authMiddleware);
usuariosRouter.use(authorizeRoles('ADMINISTRADOR'));

usuariosRouter.get('/', usuariosController.listarUsuarios);
usuariosRouter.get('/roles', usuariosController.listarRoles);
usuariosRouter.get('/personas', usuariosController.listarPersonas);
usuariosRouter.post('/', usuariosController.registrarUsuario);
usuariosRouter.patch('/:id/estado', usuariosController.cambiarEstado);
usuariosRouter.patch('/:id/rol', usuariosController.cambiarRol);
