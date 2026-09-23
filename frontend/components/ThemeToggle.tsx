// frontend/components/ThemeToggle.tsx
// Componente interactivo para alternar entre Modo Claro (Normal) y Modo Oscuro

'use client'

import React, { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    } else {
      // Default dark
      setTheme('dark')
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    document.documentElement.classList.toggle('dark', nextTheme === 'dark')
  }

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-xl bg-slate-800/40 border border-slate-700/50 ${className}`}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Cambiar a Modo Claro (Normal)' : 'Cambiar a Modo Oscuro'}
      className={`relative p-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center ${
        theme === 'dark'
          ? 'bg-slate-900/80 border-slate-800 text-amber-400 hover:bg-slate-800 hover:text-amber-300 shadow-sm'
          : 'bg-white/90 border-slate-200 text-blue-600 hover:bg-slate-100 hover:text-blue-700 shadow-sm'
      } ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 animate-in spin-in-90 duration-300" />
      ) : (
        <Moon className="w-4 h-4 animate-in spin-in-90 duration-300" />
      )}
    </button>
  )
}
