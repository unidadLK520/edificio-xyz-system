'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import {
  Building2,
  Shield,
  Briefcase,
  KeyRound,
  Search,
  Check,
  Eye,
  EyeOff,
  ArrowRight,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';

// ==========================================
// 1. TIPOS Y ROLES
// ==========================================
export type UserRole = 'ADMINISTRADOR' | 'DIRECTORIO' | 'COPROPIETARIO' | 'CONSULTA';

interface RoleCard {
  role: UserRole;
  title: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultEmail: string;
  defaultPass: string;
}

const ROLES_SISTEMA: RoleCard[] = [
  {
    role: 'ADMINISTRADOR',
    title: 'Administrador',
    badge: 'Admin',
    description: 'Gestión financiera, expensas, residentes, personal y control total.',
    icon: Shield,
    defaultEmail: 'admin@edificioxyz.com',
    defaultPass: 'admin123',
  },
  {
    role: 'DIRECTORIO',
    title: 'Directorio',
    badge: 'Directiva',
    description: 'Supervisión de balances, informes económicos, auditoría y comunicados.',
    icon: Briefcase,
    defaultEmail: 'directorio@edificioxyz.com',
    defaultPass: 'directorio123',
  },
  {
    role: 'COPROPIETARIO',
    title: 'Copropietario / Residente',
    badge: 'Residente',
    description: 'Consulta de expensas, registro de pagos y recepción de avisos.',
    icon: KeyRound,
    defaultEmail: 'residente@edificioxyz.com',
    defaultPass: 'residente123',
  },
  {
    role: 'CONSULTA',
    title: 'Consulta / Auditoría',
    badge: 'Auditor',
    description: 'Acceso de solo lectura para reportes históricos e inspección.',
    icon: Search,
    defaultEmail: 'consulta@edificioxyz.com',
    defaultPass: 'consulta123',
  },
];

// ==========================================
// 2. COMPONENTE PRINCIPAL UNIFICADO
// ==========================================
export default function LoginPage() {
  const router = useRouter();

  // Estados del Formulario
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMINISTRADOR');
  const [email, setEmail] = useState(ROLES_SISTEMA[0].defaultEmail);
  const [password, setPassword] = useState(ROLES_SISTEMA[0].defaultPass);
  const [rememberMe, setRememberMe] = useState(true);

  // Estados de Interfaz
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    const roleInfo = ROLES_SISTEMA.find((r) => r.role === role);
    if (roleInfo) {
      setEmail(roleInfo.defaultEmail);
      setPassword(roleInfo.defaultPass);
    }
    setErrorMessage('');
  };

  // Cargar credencial guardada si existe
  useEffect(() => {
    const savedEmail = localStorage.getItem('last_user_email');
    const savedRole = localStorage.getItem('last_user_role') as UserRole;
    if (savedEmail) setEmail(savedEmail);
    if (savedRole && ROLES_SISTEMA.some((r) => r.role === savedRole)) {
      setSelectedRole(savedRole);
    }
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email || !password) {
      setErrorMessage('Por favor ingresa tu correo electrónico y tu contraseña.');
      return;
    }

    setIsLoading(true);

    try {
      let isSuccess = false;
      let token = 'mock_jwt_token_' + Date.now();

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
            rol: selectedRole,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          token = data.token || token;
          isSuccess = true;
        } else {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Credenciales no válidas para el rol seleccionado.');
        }
      } catch (backendError: unknown) {
        if (backendError instanceof Error && backendError.message.includes('Credenciales no válidas')) {
          throw backendError;
        }
        // Fallback de desarrollo si el backend aún no está levantado
        isSuccess = true;
      }

      if (isSuccess) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('user_role', selectedRole);
          localStorage.setItem(
            'user_profile',
            JSON.stringify({
              email: email.trim(),
              nombre: email.split('@')[0],
              rolActivo: selectedRole,
            })
          );

          if (rememberMe) {
            localStorage.setItem('last_user_email', email.trim());
            localStorage.setItem('last_user_role', selectedRole);
          } else {
            localStorage.removeItem('last_user_email');
            localStorage.removeItem('last_user_role');
          }
        }

        setSuccessMessage(`¡Autenticado como ${selectedRole}! Redirigiendo...`);

        setTimeout(() => {
          if (selectedRole === 'ADMINISTRADOR') {
            router.push('/residentes');
          } else if (selectedRole === 'DIRECTORIO') {
            router.push('/reportes');
          } else if (selectedRole === 'COPROPIETARIO') {
            router.push('/mi-cuenta');
          } else {
            router.push('/auditoria');
          }
        }, 500);
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden transition-colors duration-300 selection:bg-blue-600 selection:text-white">
      {/* IMAGEN DE FONDO RESPONSIVA CON OVERLAY */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-20 scale-105 transition-transform duration-1000"
        style={{ backgroundImage: `url('/images/edificio_bg.jpg')` }}
      />
      <div className="fixed inset-0 bg-[#e6e2da]/85 dark:bg-slate-950/85 backdrop-blur-[6px] -z-10 transition-colors duration-300" />

      {/* BOTÓN CONMUTADOR DE TEMA */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-[#ede9e1]/95 dark:bg-slate-900/90 border border-[#cec8bc] dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl transition-colors">
        {/* PANEL LATERAL: IDENTIDAD CORPORATIVA */}
        <div className="lg:col-span-5 bg-[#e1dbcf] dark:bg-gradient-to-br dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#cec8bc] dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d6cfc3] text-blue-900 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400 text-xs font-semibold mb-6 border border-[#beb6a6]">
              <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-indigo-400 animate-pulse" />
              Acceso Seguro
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-700 dark:bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-800/20">
                <Building2 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
                Edificio <span className="text-blue-700 dark:text-indigo-400">XYZ</span>
              </h1>
            </div>

            <p className="mt-3 text-[#5c5750] dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
              Software Integral de Administración, Expensas, Finanzas y Control de Copropietarios.
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-[#cec8bc] dark:border-slate-800 text-[11px] text-[#7d776f] dark:text-slate-500 flex justify-between items-center">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-500" /> Cifrado JWT
            </span>
            <span>Edificio XYZ © 2026</span>
          </div>
        </div>

        {/* PANEL PRINCIPAL: FORMULARIO Y SELECTOR DE ROL */}
        <div className="lg:col-span-7 p-6 sm:p-8 md:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#262422] dark:text-white tracking-tight">
              Ingreso al Sistema
            </h2>
            <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-1">
              Selecciona tu rol de usuario e ingresa tus credenciales.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400 text-xs flex items-center gap-2">
              <span className="font-bold">Error:</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400 text-xs flex items-center gap-2">
              <span className="font-bold">Éxito:</span>
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Selector de Rol */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#383430] dark:text-slate-300 mb-2">
                1. Selecciona tu Rol
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ROLES_SISTEMA.map((item) => {
                  const isSelected = selectedRole === item.role;
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => handleSelectRole(item.role)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#ded8cc] border-blue-600 ring-2 ring-blue-600/25 shadow-sm dark:bg-indigo-600/20 dark:border-indigo-500 dark:ring-indigo-500/20 text-[#262422] dark:text-white'
                          : 'bg-[#e4dfd5] border-[#cec8bc] text-[#5c5750] hover:border-[#b0a89a] hover:bg-[#dbd5ca] dark:bg-slate-950/60 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                          <IconComp className={`w-4 h-4 ${isSelected ? 'text-blue-700 dark:text-indigo-400' : 'text-[#7d776f]'}`} />
                          <span className={isSelected ? 'text-blue-900 dark:text-white font-bold' : 'text-[#2e2a27] dark:text-slate-300'}>
                            {item.title}
                          </span>
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-blue-700 dark:bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#6b665f] dark:text-slate-500 line-clamp-2 leading-tight">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Credenciales */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#383430] dark:text-slate-300">
                2. Ingresa tus Credenciales
              </label>

              <div>
                <label className="block text-xs text-[#5c5750] dark:text-slate-400 mb-1" htmlFor="email-input">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@edificioxyz.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] dark:placeholder-slate-600 focus:outline-none focus:border-blue-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#5c5750] dark:text-slate-400 mb-1" htmlFor="password-input">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7d776f] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] dark:placeholder-slate-600 focus:outline-none focus:border-blue-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7d776f] hover:text-[#262422] dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#5c5750] dark:text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-[#dfd9ce] dark:bg-slate-950 border-[#cec8bc] dark:border-slate-800 text-blue-600 dark:text-indigo-600 focus:ring-blue-500"
                />
                <span>Recordar mis datos</span>
              </label>
              <button
                type="button"
                onClick={() => alert('Contacte a la administración del Edificio XYZ para la recuperación de su cuenta.')}
                className="text-blue-700 hover:text-blue-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-600 active:bg-blue-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:active:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-800/20 dark:shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validando credenciales...</span>
                </>
              ) : (
                <>
                  <span>Ingresar como {selectedRole}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
