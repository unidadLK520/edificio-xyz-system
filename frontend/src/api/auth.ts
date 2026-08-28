import { apiClient } from './client';

export interface Usuario {
  id_usuario: number;
  correo: string;
  rol: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  usuario: Usuario;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', {
    email,
    password,
  });
  return data;
}
