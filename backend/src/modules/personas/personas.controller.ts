//-----------------------------Giovani Quiroz------------------------
// backend/src/modules/personas/personas.controller.ts
// Controlador HTTP para la gestión de personas, copropietarios y asignaciones (HU02)

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { personasService, PersonasService } from './personas.service';
import {
  crearPersonaSchema,
  actualizarPersonaSchema,
  asignarUnidadSchema,
  finalizarOcupacionSchema,
  consultarPersonasQuerySchema,
} from './personas.types';

export class PersonasController {
  constructor(private readonly service: PersonasService = personasService) {}

  /**
   * POST /api/v1/personas
   * Registra una nueva persona (CA1, CA4)
   */
  crear = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = crearPersonaSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos para registrar persona',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const idOperador = req.user?.idUsuario;
      const result = await this.service.crearPersona(parsed.data, idOperador);

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          error: result.error,
          message: result.message,
        });
        return;
      }

      res.status(201).json({
        message: 'Persona registrada exitosamente',
        data: result.data,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/personas
   * Consulta paginada y búsqueda de personas (CA2, CA5)
   */
  listar = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = consultarPersonasQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Parámetros de consulta inválidos',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const resultado = await this.service.obtenerPersonas(parsed.data);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/personas/:id
   * Consulta detallada de una persona por ID (CA8)
   */
  obtenerPorId = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de persona inválido' });
        return;
      }

      const result = await this.service.obtenerPersonaPorId(id);
      if (!result.success) {
        res.status(result.statusCode || 404).json({
          error: result.error,
          message: result.message,
        });
        return;
      }

      res.json({ data: result.data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /api/v1/personas/:id
   * Modifica los datos de una persona (CA3)
   */
  actualizar = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de persona inválido' });
        return;
      }

      const parsed = actualizarPersonaSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos para actualizar persona',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const idOperador = req.user?.idUsuario;
      const result = await this.service.actualizarPersona(id, parsed.data, idOperador);

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          error: result.error,
          message: result.message,
        });
        return;
      }

      res.json({
        message: 'Persona actualizada exitosamente',
        data: result.data,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/personas/:id/unidades
   * Asigna una persona a un departamento (CA6)
   */
  asignarUnidad = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idPersona = parseInt(req.params.id, 10);
      if (isNaN(idPersona) || idPersona <= 0) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de persona inválido' });
        return;
      }

      const parsed = asignarUnidadSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos para la asignación de unidad',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const idOperador = req.user?.idUsuario;
      const result = await this.service.asignarAUnidad(idPersona, parsed.data, idOperador);

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          error: result.error,
          message: result.message,
        });
        return;
      }

      res.status(201).json({
        message: 'Asignación realizada exitosamente',
        data: result.data,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /api/v1/personas/ocupaciones/:idOcupacion/finalizar
   * Finaliza una ocupación activa (CA6, CA7)
   */
  finalizarOcupacion = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idOcupacion = parseInt(req.params.idOcupacion, 10);
      if (isNaN(idOcupacion) || idOcupacion <= 0) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de ocupación inválido' });
        return;
      }

      const parsed = finalizarOcupacionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Datos inválidos para finalizar ocupación',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const idOperador = req.user?.idUsuario;
      const result = await this.service.finalizarOcupacion(
        idOcupacion,
        parsed.data.fechaFin,
        idOperador
      );

      if (!result.success) {
        res.status(result.statusCode || 400).json({
          error: result.error,
          message: result.message,
        });
        return;
      }

      res.json({
        message: 'Ocupación finalizada exitosamente',
        data: result.data,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/personas/:id/historial
   * Consulta el historial de unidades de una persona (CA7)
   */
  historialPersona = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idPersona = parseInt(req.params.id, 10);
      if (isNaN(idPersona) || idPersona <= 0) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de persona inválido' });
        return;
      }

      const result = await this.service.obtenerHistorialPersona(idPersona);
      if (!result.success) {
        res.status(result.statusCode || 404).json({
          error: result.error,
          message: result.message,
        });
        return;
      }

      res.json(result.data);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/personas/departamentos/:idDepartamento/historial
   * Consulta el historial de ocupantes de un departamento (CA7)
   */
  historialDepartamento = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idDepartamento = parseInt(req.params.idDepartamento, 10);
      if (isNaN(idDepartamento) || idDepartamento <= 0) {
        res.status(400).json({ error: 'Bad Request', message: 'ID de departamento inválido' });
        return;
      }

      const result = await this.service.obtenerHistorialDepartamento(idDepartamento);
      if (!result.success) {
        res.status(result.statusCode || 404).json({
          error: result.error,
          message: result.message,
        });
        return;
      }

      res.json(result.data);
    } catch (err) {
      next(err);
    }
  };
}

export const personasController = new PersonasController();
