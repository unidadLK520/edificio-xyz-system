// backend/src/modules/auditoria/auditoria.mask.ts
// Utilidad recursiva para enmascarar campos sensibles (password, hash, token, etc.) en auditoría

const CAMPOS_SENSIBLES = [
  'password',
  'passwd',
  'pass',
  'hash',
  'token',
  'secret',
  'jwt',
  'contrasena',
  'contraseña',
  'authorization',
  'accesstoken',
  'refreshtoken',
];

/**
 * Enmascara recursivamente cualquier propiedad cuyo nombre contenga términos sensibles
 */
export function enmascararDatosSensibles(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => enmascararDatosSensibles(item));
  }

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    const keyNormalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const esSensible = CAMPOS_SENSIBLES.some((s) => keyNormalized.includes(s));

    if (esSensible) {
      result[key] = '********';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = enmascararDatosSensibles(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}
