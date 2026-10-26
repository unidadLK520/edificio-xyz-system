// frontend/lib/fecha.ts
// Utilidades de manejo de fechas y conversión a hora oficial de Bolivia (America/La_Paz)

/**
 * Extrae YYYY-MM-DD directamente del string sin convertir a Date
 * para evitar desfases de zona horaria en campos de tipo DATE (periodo, vencimiento, emisión).
 */
export function fechaSolo(v: string | Date | null | undefined): string {
  if (!v) return ''
  if (typeof v === 'string') {
    const match = v.match(/^\d{4}-\d{2}-\d{2}/)
    if (match) return match[0]
    if (v.includes('T')) return v.split('T')[0]
    return v.slice(0, 10)
  }
  if (v instanceof Date && !isNaN(v.getTime())) {
    const year = v.getFullYear()
    const month = String(v.getMonth() + 1).padStart(2, '0')
    const day = String(v.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return ''
}

/**
 * Formatea un timestamp (fechaCreacion, logins, auditoría) a hora oficial de Bolivia (America/La_Paz).
 */
export function fechaHoraBolivia(
  v: string | Date | null | undefined,
  includeTime: boolean = true
): string {
  if (!v) return '—'
  const d = typeof v === 'string' ? new Date(v) : v
  if (!(d instanceof Date) || isNaN(d.getTime())) return String(v)

  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(includeTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }
      : {})
  }

  return new Intl.DateTimeFormat('es-BO', options).format(d)
}

/**
 * Formatea un timestamp a fecha en hora de Bolivia (DD/MM/YYYY).
 */
export function fechaBolivia(v: string | Date | null | undefined): string {
  return fechaHoraBolivia(v, false)
}
