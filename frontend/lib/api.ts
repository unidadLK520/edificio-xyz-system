// frontend/lib/api.ts
// Cliente fetch centralizado con manejo de autenticación y errores del servidor

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers)
  if (!headers.has('Authorization') && typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  let res: Response
  try {
    res = await fetch(input, { ...init, headers })
  } catch (err: any) {
    throw new Error(
      err?.message || 'Error de conexión al conectar con el servidor.'
    )
  }

  // Manejo de 401 No Autorizado / Sesión Expirada
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_role')
        localStorage.removeItem('user_profile')
        document.cookie =
          'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      } catch {}
      window.location.href = '/login'
    }
    return res
  }

  // Manejo de errores de servidor 5xx (500, 502, 503, 504)
  if (res.status >= 500) {
    let errorMsg = `Error en el servidor (${res.status})`
    try {
      const cloned = res.clone()
      const json = await cloned.json()
      if (json && (json.message || json.error)) {
        errorMsg = `Error (${res.status}): ${json.message || json.error}`
      }
    } catch {
      try {
        const cloned = res.clone()
        const text = await cloned.text()
        if (text && text.length < 200) {
          errorMsg = `Error (${res.status}): ${text}`
        }
      } catch {}
    }
    throw new Error(errorMsg)
  }

  return res
}
