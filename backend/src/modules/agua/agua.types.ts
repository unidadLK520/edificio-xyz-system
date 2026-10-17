// backend/src/modules/agua/agua.types.ts
// Tipos e interfaces del módulo de gestión de montos manuales de agua

export interface ItemMontoAguaInput {
  idDepartamento: number;
  montoAgua: number;
}

export interface RegistrarMontosAguaInput {
  periodo: string;
  montos: ItemMontoAguaInput[];
  idUsuario?: number | null;
}

export interface FiltrosObtenerMontosAgua {
  periodo?: string;
  idDepartamento?: number;
}

export interface MontoAguaResponse {
  idMonto: number;
  idDepartamento: number;
  departamento?: {
    numero: string;
    piso?: number | null;
    tipo?: {
      nombre: string;
      montoExpensa: number;
    } | null;
  };
  periodo: string;
  montoAgua: number;
  idUsuarioRegistro?: number | null;
  usuarioRegistro?: {
    idUsuario: number;
    nombreUsuario: string;
    correo: string;
  } | null;
  fechaRegistro: Date;
}
