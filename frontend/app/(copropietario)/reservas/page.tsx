// frontend/app/(copropietario)/reservas/page.tsx
// Las reservas de áreas extras no forman parte del modelo administrativo del edificio (exclusivamente expensas comunes).
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ReservasRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/mi-cuenta')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-xs text-[#7d776f] animate-pulse">
        Redirigiendo a Mi Cuenta y Expensas...
      </div>
    </div>
  )
}
