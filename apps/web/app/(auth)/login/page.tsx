// apps/web/app/(auth)/login/page.tsx
// Página de inicio de sesión de Edificio XYZ

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ShieldCheck, Lock, Mail, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error desconocido');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 left-10 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/25 mb-4 ring-8 ring-blue-500/10">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Edificio XYZ
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sistema Integral de Administración y Copropiedad
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-slate-200">
              Iniciar Sesión
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-950 text-blue-400 border border-blue-800/60">
              <ShieldCheck className="w-3.5 h-3.5" /> Portal Seguro
            </span>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2.5">
              <span className="font-bold">!</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@edificioxyz.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 active:scale-[0.99] transition-all disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Ingresar al Sistema
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Fill for Development */}
          <div className="mt-8 pt-5 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Accesos de Demostración
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('admin@edificioxyz.com', 'admin123')}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 text-slate-300 transition-colors text-left group cursor-pointer"
              >
                <div>
                  <span className="font-medium text-white group-hover:text-blue-400 transition-colors">
                    admin@edificioxyz.com
                  </span>
                  <p className="text-[11px] text-slate-400">Rol: Administrador (Acceso total)</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono text-[10px]">
                  admin123
                </span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('directorio@edificioxyz.com', 'directorio123')}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 text-slate-300 transition-colors text-left group cursor-pointer"
              >
                <div>
                  <span className="font-medium text-white group-hover:text-purple-400 transition-colors">
                    directorio@edificioxyz.com
                  </span>
                  <p className="text-[11px] text-slate-400">Rol: Directorio (Finanzas y reportes)</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 font-mono text-[10px]">
                  directorio123
                </span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('consulta@edificioxyz.com', 'consulta123')}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 text-slate-300 transition-colors text-left group cursor-pointer"
              >
                <div>
                  <span className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                    consulta@edificioxyz.com
                  </span>
                  <p className="text-[11px] text-slate-400">Rol: Consulta (Solo lectura)</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-mono text-[10px]">
                  consulta123
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-6 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Monorepo Turborepo + Next.js + Prisma
        </p>
      </div>
    </main>
  );
}
