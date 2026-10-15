// backend/src/modules/agua/agua.types.ts
// Tipos e interfaces del módulo de gestión de agua (tarifas y lecturas)

export interface ConfigurarTarifaAguaInput {
  precioM3: number;
  idUsuario?: number | null;
}

export interface RegistrarLecturaAguaInput {
  idDepartamento: number;
  periodo: string | Date;
  lecturaActual: number;
  lecturaAnterior?: number;
  idUsuario?: number | null;
}

export interface CorregirLecturaAguaInput {
  idLectura: number;
  lecturaActual?: number;
  lecturaAnterior?: number;
  idUsuario?: number | null;
}

export interface FiltrosLecturasAgua {
  periodo?: string | Date;
  idDepartamento?: number;
  page?: number;
  limit?: number;
}
