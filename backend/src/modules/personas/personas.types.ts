//-----------------------------Giovani Quiroz------------------------
// backend/src/modules/personas/personas.types.ts
// Tipos, interfaces y schemas de validación con Zod para el módulo de Personas (HU02)

import { z } from 'zod';

// ============================================================================
// Schemas Zod de Validación
// ============================================================================

export const crearPersonaSchema = z.object({
  ciNit: z
    .string({ required_error: 'El CI/NIT es obligatorio' })
    .trim()
    .min(3, 'El CI/NIT debe tener al menos 3 caracteres')
    .max(30, 'El CI/NIT no puede exceder 30 caracteres'),
  nombres: z
    .string({ required_error: 'Los nombres son obligatorios' })
    .trim()
    .min(2, 'Los nombres deben tener al menos 2 caracteres')
    .max(100, 'Los nombres no pueden exceder 100 caracteres'),
  apellidos: z
    .string({ required_error: 'Los apellidos son obligatorios' })
    .trim()
    .min(2, 'Los apellidos deben tener al menos 2 caracteres')
    .max(100, 'Los apellidos no pueden exceder 100 caracteres'),
  telefono: z
    .string()
    .trim()
    .max(30, 'El teléfono no puede exceder 30 caracteres')
    .optional()
    .nullable(),
  correo: z
    .string()
    .trim()
    .email('El formato del correo electrónico es inválido')
    .max(150, 'El correo no puede exceder 150 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  direccion: z
    .string()
    .trim()
    .max(500, 'La dirección no puede exceder 500 caracteres')
    .optional()
    .nullable(),
});

export const actualizarPersonaSchema = z.object({
  ciNit: z
    .string()
    .trim()
    .min(3, 'El CI/NIT debe tener al menos 3 caracteres')
    .max(30, 'El CI/NIT no puede exceder 30 caracteres')
    .optional(),
  nombres: z
    .string()
    .trim()
    .min(2, 'Los nombres deben tener al menos 2 caracteres')
    .max(100, 'Los nombres no pueden exceder 100 caracteres')
    .optional(),
  apellidos: z
    .string()
    .trim()
    .min(2, 'Los apellidos deben tener al menos 2 caracteres')
    .max(100, 'Los apellidos no pueden exceder 100 caracteres')
    .optional(),
  telefono: z
    .string()
    .trim()
    .max(30, 'El teléfono no puede exceder 30 caracteres')
    .optional()
    .nullable(),
  correo: z
    .string()
    .trim()
    .email('El formato del correo electrónico es inválido')
    .max(150, 'El correo no puede exceder 150 caracteres')
    .optional()
    .nullable()
    .or(z.literal('')),
  direccion: z
    .string()
    .trim()
    .max(500, 'La dirección no puede exceder 500 caracteres')
    .optional()
    .nullable(),
});

export const TipoOcupanteEnum = z.enum(['Propietario', 'Inquilino'], {
  errorMap: () => ({ message: "tipoOcupante debe ser 'Propietario' o 'Inquilino'" }),
});

export const asignarUnidadSchema = z.object({
  idDepartamento: z
    .number({ required_error: 'El ID del departamento es obligatorio' })
    .int('El ID del departamento debe ser un entero')
    .positive('El ID del departamento debe ser mayor a 0'),
  tipoOcupante: TipoOcupanteEnum,
  fechaInicio: z
    .string({ required_error: 'La fecha de inicio es obligatoria' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'El formato de fechaInicio debe ser YYYY-MM-DD'),
  fechaFin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'El formato de fechaFin debe ser YYYY-MM-DD')
    .optional()
    .nullable(),
  esPropietarioDirecto: z.boolean().optional(),
});

export const finalizarOcupacionSchema = z.object({
  fechaFin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'El formato de fechaFin debe ser YYYY-MM-DD')
    .optional(),
});

export const consultarPersonasQuerySchema = z.object({
  buscar: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  tipoOcupante: z.string().trim().optional(),
});

// ============================================================================
// Tipos TypeScript inferidos de los Schemas
// ============================================================================

export type CrearPersonaDTO = z.infer<typeof crearPersonaSchema>;
export type ActualizarPersonaDTO = z.infer<typeof actualizarPersonaSchema>;
export type AsignarUnidadDTO = z.infer<typeof asignarUnidadSchema>;
export type FinalizarOcupacionDTO = z.infer<typeof finalizarOcupacionSchema>;
export type ConsultarPersonasFiltros = z.infer<typeof consultarPersonasQuerySchema>;

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; message: string; statusCode?: number };

