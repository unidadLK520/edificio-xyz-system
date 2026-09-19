'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ==========================================
// 1. TIPOS Y ROLES
// ==========================================
export type UserRole = 'ADMINISTRADOR' | 'DIRECTORIO' | 'COPROPIETARIO' | 'CONSULTA';

interface RoleCard {
  role: UserRole;
  title: string;
  badge: string;
  description: string;
  icon: string;
}

const ROLES_SISTEMA: RoleCard[] = [
  {
    role: 'ADMINISTRADOR',
    title: 'Administrador',
    badge: 'Admin',
    description: 'Gestión financiera, expensas, personal, ingresos/egresos y control total.',
    icon: '🏢'
  },
  {
    role: 'DIRECTORIO',
    title: 'Directorio',
    badge: 'Directiva',
    description: 'Supervisión de balances, informes económicos, auditoría y comunicados.',
    icon: '👔'
  },
  {
    role: 'COPROPIETARIO',
    title: 'Copropietario / Inquilino',
    badge: 'Residente',
    description: 'Consulta de expensas, registro de comprobantes y recepción de avisos.',
    icon: '🔑'
  },
  {
    role: 'CONSULTA',
    title: 'Consulta / Auditoría',
    badge: 'Auditor',
    description: 'Acceso de solo lectura para reportes históricos e inspección.',
    icon: '🔍'
  }
];

// ==========================================
// 2. COMPONENTE PRINCIPAL UNIFICADO
// ==========================================
export default function LoginPage() {
  const router = useRouter();

  // Estados del Formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMINISTRADOR');
  const [rememberMe, setRememberMe] = useState(true);

  // Estados de Interfaz
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Cargar credencial guardada si existe
  useEffect(() => {
    const savedEmail = localStorage.getItem('last_user_email');
    const savedRole = localStorage.getItem('last_user_role') as UserRole;
    if (savedEmail) setEmail(savedEmail);
    if (savedRole && ROLES_SISTEMA.some(r => r.role === savedRole)) {
      setSelectedRole(savedRole);
    }
  }, []);

  // Manejador del Login
  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor ingresa tu correo electrónico y tu contraseña.');
      return;
    }

    setIsLoading(true);

    try {
      let isSuccess = false;
      let token = 'mock_jwt_token_' + Date.now();

      let actualRole: UserRole = selectedRole;

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          correo: email.trim(),
          password,
          rol: selectedRole
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.token) {
        token = data.token;
        isSuccess = true;
        if (data.usuario?.rol) {
          actualRole = data.usuario.rol as UserRole;
        }
      } else {
        const errorMsg = data.message || 'Credenciales inválidas. Por favor intente nuevamente.';
        throw new Error(errorMsg);
      }

      if (isSuccess) {
        if (typeof window !== 'undefined') {
          // Guardar cookie accesible por el cliente/navegador
          document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 8}; SameSite=Lax`;

          localStorage.setItem('auth_token', token);
          localStorage.setItem('user_role', actualRole);
          localStorage.setItem('user_profile', JSON.stringify({
            email: email.trim(),
            nombre: data.usuario?.nombreUsuario || email.split('@')[0],
            rolActivo: actualRole
          }));

          if (rememberMe) {
            localStorage.setItem('last_user_email', email.trim());
            localStorage.setItem('last_user_role', actualRole);
          } else {
            localStorage.removeItem('last_user_email');
            localStorage.removeItem('last_user_role');
          }
        }

        setSuccessMessage(`¡Autenticado como ${actualRole}! Redirigiendo...`);

        setTimeout(() => {
          const roleUpper = String(actualRole).toUpperCase();
          if (roleUpper === 'ADMINISTRADOR') {
            router.push('/usuarios');
          } else if (roleUpper === 'DIRECTORIO') {
            router.push('/expensas');
          } else if (roleUpper === 'COPROPIETARIO') {
            router.push('/mi-cuenta');
          } else {
            router.push('/expensas');
          }
        }, 600);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Ocurrió un error inesperado al conectar con el servidor.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4 sm:p-6 lg:p-8 text-slate-100 font-sans">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* PANEL LATERAL: IDENTIDAD CORPORATIVA */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
              Acceso Seguro
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Edificio <span className="text-indigo-400">XYZ</span>
            </h1>
            <p className="mt-3 text-slate-400 text-xs sm:text-sm leading-relaxed">
              Software Integral de Administración, Expensas, Finanzas y Control de Copropietarios.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center">
            <span>Control de Acceso</span>
            <span>Cochabamba, 2026</span>
          </div>
        </div>

        {/* PANEL PRINCIPAL: FORMULARIO Y SELECTOR DE ROL */}
        <div className="lg:col-span-7 p-6 sm:p-8 md:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Ingreso al Sistema
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Selecciona tu rol de usuario e ingresa tus credenciales.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <span className="font-bold">Error:</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <span className="font-bold">Éxito:</span>
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Selector de Rol */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                1. Selecciona tu Rol
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ROLES_SISTEMA.map((item) => {
                  const isSelected = selectedRole === item.role;
                  return (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => setSelectedRole(item.role)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500 text-white ring-1 ring-indigo-500 shadow-md shadow-indigo-500/10'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                          <span>{item.icon}</span>
                          <span className={isSelected ? 'text-indigo-300' : 'text-slate-200'}>
                            {item.title}
                          </span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-tight">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Credenciales */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                2. Ingresa tus Credenciales
              </label>

              <div>
                <label className="block text-xs text-slate-400 mb-1" htmlFor="email-input">
                  Correo Electrónico
                </label>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@edificioxyz.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1" htmlFor="password-input">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Recordar mis datos</span>
              </label>
              <button
                type="button"
                onClick={() => alert('Contacte a la administración del Edificio XYZ para la recuperación de su cuenta.')}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <span>Ingresar como {selectedRole}</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
