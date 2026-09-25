// frontend/app/(admin)/ingresos/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function IngresosRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/egresos?tipo=Ingreso')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-xs text-[#7d776f] animate-pulse">
        Redirigiendo al módulo de finanzas (Ingresos y Egresos)...
      </div>
    </div>
  )
}
