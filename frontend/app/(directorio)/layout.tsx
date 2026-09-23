// frontend/app/(directorio)/layout.tsx
'use client';

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'
import edificioBg from '@/public/images/edificio_bg.jpg'
import { Building2, FileBarChart, ShieldAlert, LogOut, Menu, X, Briefcase } from 'lucide-react'

const DIRECTORIO_LINKS = [
  { href: '/reportes', label: 'Reportes y Finanzas', icon: FileBarChart },
  { href: '/auditoria', label: 'Auditoría y Trazabilidad', icon: ShieldAlert }
]

export default function DirectorioLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-[#e6e2da] dark:bg-slate-950 text-[#262422] dark:text-slate-100 font-sans overflow-hidden transition-colors duration-300 selection:bg-blue-600 selection:text-white">
      {/* Overlay para móvil */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-[#ede9e1] dark:bg-slate-900/95 border-r border-[#cec8bc] dark:border-slate-800 flex flex-col h-full transition-transform duration-300 ease-in-out transform ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:static md:flex shrink-0 shadow-lg md:shadow-none backdrop-blur-md`}
      >
        <div className="p-5 border-b border-[#cec8bc] dark:border-slate-800 flex justify-between items-center bg-[#e3ded4] dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-700 dark:bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-800/20">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[#262422] dark:text-white leading-tight">
                Edificio <span className="text-purple-700 dark:text-purple-400">XYZ</span>
              </h2>
              <span className="text-[10px] text-purple-900 dark:text-purple-300 uppercase font-bold tracking-wider block">
                Panel Directorio
              </span>
            </div>
          </div>
          <button
            className="md:hidden text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {DIRECTORIO_LINKS.map((link) => {
            const IconComp = link.icon
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#ded8cc] text-purple-900 border border-purple-600/30 dark:bg-purple-600/20 dark:text-white dark:border-purple-500/40 shadow-xs'
                    : 'text-[#5c5750] hover:text-[#262422] hover:bg-[#e4dfd5] dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60'
                }`}
              >
                <IconComp
                  className={`w-4 h-4 ${isActive ? 'text-purple-700 dark:text-purple-400' : 'text-[#7d776f]'}`}
                />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[#cec8bc] dark:border-slate-800 space-y-3 bg-[#e3ded4]/50 dark:bg-slate-950/40">
          <div className="flex items-center justify-between px-1 text-xs font-medium text-[#5c5750] dark:text-slate-400">
            <span>Tema visual</span>
            <ThemeToggle />
          </div>
          <a
            href="/api/auth/logout"
            className="flex items-center justify-center gap-2 w-full text-center py-2.5 px-4 bg-rose-100/70 text-rose-800 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-900/40 border border-rose-300 dark:border-rose-900/50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión
          </a>
        </div>
      </aside>

      {/* Main content wrapper con fondo responsivo de edificio */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        <header className="md:hidden h-14 flex items-center justify-between px-4 border-b border-[#cec8bc] dark:border-slate-800 bg-[#ede9e1] dark:bg-slate-900 shrink-0 z-30">
          <button
            className="text-[#5c5750] dark:text-slate-300 hover:text-[#262422] dark:hover:text-white focus:outline-none p-1.5"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm text-[#262422] dark:text-white">
            Edificio <span className="text-purple-700 dark:text-purple-400">XYZ</span>
          </span>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto relative transition-colors duration-300">
          <div className="fixed inset-0 pointer-events-none opacity-[0.24] dark:opacity-[0.30] overflow-hidden -z-0">
            <Image
              src={edificioBg}
              alt="Edificio XYZ"
              fill
              placeholder="blur"
              className="object-cover object-center"
            />
          </div>
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  )
}
