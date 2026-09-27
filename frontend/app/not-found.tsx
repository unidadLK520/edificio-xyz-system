// frontend/app/not-found.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, Home, ArrowLeft, Search, ShieldAlert, Receipt, Wallet } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#ede9e1] dark:bg-slate-950 text-[#262422] dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 transition-colors duration-300">
      {/* Background glow decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/10 dark:bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg bg-[#f5f2eb]/90 dark:bg-slate-900/90 border border-[#cec8bc] dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md text-center space-y-6">
        {/* Brand / Logo */}
        <div className="flex items-center justify-center gap-2.5 mx-auto">
          <div className="w-10 h-10 rounded-2xl bg-blue-700 dark:bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-800/20">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="font-black text-xl tracking-tight text-[#262422] dark:text-white">
            Edificio <span className="text-blue-700 dark:text-indigo-400">XYZ</span>
          </span>
        </div>

        {/* 404 Badge & Heading */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            Error 404 &bull; Recurso no encontrado
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-[#262422] dark:text-white tracking-tight">
            Página No Encontrada
          </h1>
          <p className="text-xs sm:text-sm text-[#5c5750] dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            La ruta o recurso al que intentas acceder no existe, ha sido movido o no cuentas con los permisos necesarios para visualizarlo.
          </p>
        </div>

        {/* Quick Links / Helpful paths */}
        <div className="p-4 rounded-2xl bg-[#eae5dc] dark:bg-slate-950/60 border border-[#cec8bc]/80 dark:border-slate-800/80 text-left space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7d776f] dark:text-slate-400 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" />
            Accesos rápidos sugeridos
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/usuarios"
              className="p-2 rounded-xl bg-[#f5f2eb] dark:bg-slate-900 hover:border-blue-500 border border-[#cec8bc]/50 dark:border-slate-800 flex items-center gap-2 font-medium transition-colors"
            >
              <Home className="w-3.5 h-3.5 text-blue-600" />
              <span>Panel Admin</span>
            </Link>
            <Link
              href="/egresos"
              className="p-2 rounded-xl bg-[#f5f2eb] dark:bg-slate-900 hover:border-rose-500 border border-[#cec8bc]/50 dark:border-slate-800 flex items-center gap-2 font-medium transition-colors"
            >
              <Wallet className="w-3.5 h-3.5 text-rose-600" />
              <span>Finanzas</span>
            </Link>
            <Link
              href="/expensas"
              className="p-2 rounded-xl bg-[#f5f2eb] dark:bg-slate-900 hover:border-emerald-500 border border-[#cec8bc]/50 dark:border-slate-800 flex items-center gap-2 font-medium transition-colors"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              <span>Expensas</span>
            </Link>
            <Link
              href="/login"
              className="p-2 rounded-xl bg-[#f5f2eb] dark:bg-slate-900 hover:border-indigo-500 border border-[#cec8bc]/50 dark:border-slate-800 flex items-center gap-2 font-medium transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Iniciar Sesión</span>
            </Link>
          </div>
        </div>

        {/* Navigation Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#262422] dark:text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver atrás
          </button>
          <Link
            href="/usuarios"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-800/20"
          >
            <Home className="w-4 h-4" />
            Ir al Inicio del Sistema
          </Link>
        </div>

        <div className="text-[11px] text-[#7d776f] dark:text-slate-500 pt-2 border-t border-[#cec8bc]/60 dark:border-slate-800">
          Sistema de Administración Integral &bull; Edificio XYZ &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
