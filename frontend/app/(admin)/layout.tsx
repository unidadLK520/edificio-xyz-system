'use client';

import React, { useState } from 'react';
import ThemeToggle from '@/components/ThemeToggle';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans overflow-hidden transition-colors duration-300">
      
      {/* Overlay para móvil cuando el menú está abierto */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (fijo en PC, deslizante en móvil) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full transition-transform duration-300 ease-in-out transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:flex`}>
        
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-xl text-indigo-600 dark:text-indigo-400">Edificio XYZ</h2>
            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider block mt-1">Panel Administrador</span>
          </div>
          {/* Botón cerrar solo en móvil */}
          <button 
            className="md:hidden text-slate-500 hover:text-slate-800 dark:hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
              <a href="/expensas" onClick={() => setIsMobileMenuOpen(false)} className="block py-2.5 px-4 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white rounded-xl transition-colors">Expensas</a>
              <a href="/residentes" onClick={() => setIsMobileMenuOpen(false)} className="block py-2.5 px-4 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white rounded-xl transition-colors">Residentes</a>
              <a href="/egresos" onClick={() => setIsMobileMenuOpen(false)} className="block py-2.5 px-4 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white rounded-xl transition-colors">Egresos</a>
              <a href="/personal" onClick={() => setIsMobileMenuOpen(false)} className="block py-2.5 px-4 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white rounded-xl transition-colors">Personal</a>

        </nav>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between px-2 text-sm text-slate-500">
            <span>Tema visual</span>
            <ThemeToggle />
          </div>
          <a href="/login" className="block text-center py-2.5 px-4 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800/50 rounded-xl text-sm font-bold transition-colors">
            Cerrar Sesión
          </a>
        </div>
      </aside>
      
      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Topbar para móvil */}
        <header className="md:hidden h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <button 
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white focus:outline-none"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400">Edificio XYZ</span>
          <ThemeToggle />
        </header>

        {/* Contenido principal scrolleable */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
