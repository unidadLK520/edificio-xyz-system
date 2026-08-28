import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import {
  Building2,
  LayoutDashboard,
  Receipt,
  Home,
  Wallet,
  Megaphone,
  Users2,
  LogOut,
  Shield,
  Activity,
} from 'lucide-react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950/90 border-r border-slate-800/80 flex flex-col justify-between hidden md:flex shrink-0">
        <div>
          {/* Brand */}
          <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-wide block">
                Edificio XYZ
              </span>
              <span className="text-[11px] text-blue-400 font-medium block">
                Panel de Control
              </span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="p-3 space-y-1">
            <Link
              href="/"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all group"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
              <span>Resumen General</span>
            </Link>

            <Link
              href="/expensas"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all group"
            >
              <Receipt className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
              <span>Expensas y Pagos</span>
            </Link>

            <Link
              href="/departamentos"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all group"
            >
              <Home className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
              <span>Departamentos</span>
            </Link>

            <Link
              href="/movimientos"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all group"
            >
              <Wallet className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              <span>Caja y Finanzas</span>
            </Link>

            <Link
              href="/comunicados"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all group"
            >
              <Megaphone className="w-4 h-4 text-slate-400 group-hover:text-pink-400 transition-colors" />
              <span>Comunicados</span>
            </Link>

            <Link
              href="/personal"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all group"
            >
              <Users2 className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              <span>Personal y Empleados</span>
            </Link>
          </nav>
        </div>

        {/* User Card & Logout in Sidebar */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
                {session.nombreUsuario.slice(0, 2).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <span className="block text-xs font-semibold text-white truncate">
                  {session.nombreUsuario}
                </span>
                <span className="block text-[11px] text-slate-400 truncate">
                  {session.correo}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/50">
                <Shield className="w-2.5 h-2.5" /> {session.rol}
              </span>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  title="Cerrar sesión"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 px-6 bg-slate-950/70 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200 text-sm">
                Edificio Central XYZ
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span>Turborepo + Next.js 15 + Prisma</span>
            </div>
            <form action="/api/auth/logout" method="POST" className="md:hidden">
              <button
                type="submit"
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-950/40">
          {children}
        </main>
      </div>
    </div>
  );
}
