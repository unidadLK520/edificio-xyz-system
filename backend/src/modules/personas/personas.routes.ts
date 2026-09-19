//-----------------------------Giovani Quiroz------------------------
// backend/src/modules/personas/personas.routes.ts
// Definición de endpoints HTTP para el módulo de personas (HU02)

import { Router, IRouter } from 'express';
import { personasController } from './personas.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/role.middleware';

export const personasRouter: IRouter = Router();

// Todas las rutas de administración de personas requieren autenticación
personasRouter.use(authMiddleware);

// Rutas de consulta y búsqueda (CA2, CA5, CA8) - Administrador, Directorio y Consulta
personasRouter.get(
  '/',
  authorizeRoles('Administrador', 'Directorio', 'Consulta'),
  personasController.listar
);

personasRouter.get(
  '/:id(\\d+)',
  authorizeRoles('Administrador', 'Directorio', 'Consulta'),
  personasController.obtenerPorId
);

personasRouter.get(
  '/:id(\\d+)/historial',
  authorizeRoles('Administrador', 'Directorio', 'Consulta'),
  personasController.historialPersona
);

personasRouter.get(
  '/departamentos/:idDepartamento(\\d+)/historial',
  authorizeRoles('Administrador', 'Directorio', 'Consulta'),
  personasController.historialDepartamento
);

// Rutas de modificación y gestión (CA1, CA3, CA4, CA6) - Administrador y Directorio
personasRouter.post(
  '/',
  authorizeRoles('Administrador', 'Directorio'),
  personasController.crear
);

personasRouter.put(
  '/:id(\\d+)',
  authorizeRoles('Administrador', 'Directorio'),
  personasController.actualizar
);

personasRouter.post(
  '/:id(\\d+)/unidades',
  authorizeRoles('Administrador', 'Directorio'),
  personasController.asignarUnidad
);

personasRouter.patch(
  '/ocupaciones/:idOcupacion(\\d+)/finalizar',
  authorizeRoles('Administrador', 'Directorio'),
  personasController.finalizarOcupacion
);
