'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import ThemeToggle from '@/components/ThemeToggle'
import edificioBg from '@/public/images/edificio_bg.jpg'
import edificioLobby from '@/public/images/edificio_lobby.jpg'
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
  ShieldCheck
} from 'lucide-react'

// ==========================================
// 1. TIPOS Y ROLES
// ==========================================
export type UserRole = 'ADMINISTRADOR' | 'DIRECTORIO' | 'COPROPIETARIO' | 'CONSULTA'

interface RoleCard {
  role: UserRole
  title: string
  badge: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  defaultEmail: string
  defaultPass: string
}

const ROLES_SISTEMA: RoleCard[] = [
  {
    role: 'ADMINISTRADOR',
    title: 'Administrador',
    badge: 'Admin',
    description: 'Gestión financiera, expensas, residentes, personal y control total.',
    icon: Shield,
    defaultEmail: 'admin@edificioxyz.com',
    defaultPass: 'admin123'
  },
  {
    role: 'DIRECTORIO',
    title: 'Directorio',
    badge: 'Directiva',
    description: 'Supervisión de balances, informes económicos, auditoría y comunicados.',
    icon: Briefcase,
    defaultEmail: 'directorio@edificioxyz.com',
    defaultPass: 'directorio123'
  },
  {
    role: 'COPROPIETARIO',
    title: 'Copropietario / Residente',
    badge: 'Residente',
    description: 'Consulta de expensas, registro de pagos y recepción de avisos.',
    icon: KeyRound,
    defaultEmail: 'residente@edificioxyz.com',
    defaultPass: 'residente123'
  },
  {
    role: 'CONSULTA',
    title: 'Consulta / Auditoría',
    badge: 'Auditor',
    description: 'Acceso de solo lectura para reportes históricos e inspección.',
    icon: Search,
    defaultEmail: 'consulta@edificioxyz.com',
    defaultPass: 'consulta123'
  }
]

// ==========================================
// 2. COMPONENTE PRINCIPAL UNIFICADO
// ==========================================
export default function LoginPage() {
  const router = useRouter()

  // Estados del Formulario
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMINISTRADOR')
  const [email, setEmail] = useState(ROLES_SISTEMA[0].defaultEmail)
  const [password, setPassword] = useState(ROLES_SISTEMA[0].defaultPass)
  const [rememberMe, setRememberMe] = useState(true)

  // Estados de Interfaz
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role)
    const roleInfo = ROLES_SISTEMA.find((r) => r.role === role)
    if (roleInfo) {
      setEmail(roleInfo.defaultEmail)
      setPassword(roleInfo.defaultPass)
    }
    setErrorMessage('')
  }

  // Cargar credencial guardada si existe
  useEffect(() => {
    const savedEmail = localStorage.getItem('last_user_email')
    const savedRole = localStorage.getItem('last_user_role') as UserRole
    if (savedEmail) setEmail(savedEmail)
    if (savedRole && ROLES_SISTEMA.some((r) => r.role === savedRole)) {
      setSelectedRole(savedRole)
    }
  }, [])

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!email || !password) {
      setErrorMessage('Por favor ingresa tu correo electrónico y tu contraseña.')
      return
    }

    setIsLoading(true)

    try {
      let isSuccess = false
      let token = 'mock_jwt_token_' + Date.now()

      let actualRole: UserRole = selectedRole

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          correo: email.trim(),
          password,
          rol: selectedRole
        })
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok && data.token) {
        token = data.token
        isSuccess = true
        if (data.usuario?.rol) {
          actualRole = data.usuario.rol as UserRole
        }
      } else {
        const errorMsg = data.message || 'Credenciales inválidas. Por favor intente nuevamente.'
        throw new Error(errorMsg)
      }

      if (isSuccess) {
        if (typeof window !== 'undefined') {
          // Guardar cookie accesible por el cliente/navegador
          document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 8}; SameSite=Lax`

          localStorage.setItem('auth_token', token)
          localStorage.setItem('user_role', actualRole)
          localStorage.setItem(
            'user_profile',
            JSON.stringify({
              email: email.trim(),
              nombre: data.usuario?.nombreUsuario || email.split('@')[0],
              rolActivo: actualRole
            })
          )

          if (rememberMe) {
            localStorage.setItem('last_user_email', email.trim())
            localStorage.setItem('last_user_role', actualRole)
          } else {
            localStorage.removeItem('last_user_email')
            localStorage.removeItem('last_user_role')
          }
        }

        setSuccessMessage(`¡Autenticado como ${actualRole}! Redirigiendo...`)

        setTimeout(() => {
          const roleUpper = String(actualRole).toUpperCase()
          if (roleUpper === 'ADMINISTRADOR') {
            router.push('/residentes')
          } else if (roleUpper === 'DIRECTORIO') {
            router.push('/reportes')
          } else if (roleUpper === 'COPROPIETARIO') {
            router.push('/mi-cuenta')
          } else {
            router.push('/auditoria')
          }
        }, 500)
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Ocurrió un error inesperado al conectar con el servidor.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden transition-colors duration-300 selection:bg-blue-600 selection:text-white">
      {/* IMAGEN DE FONDO RESPONSIVA DEL EDIFICIO */}
      <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
        <Image
          src={edificioBg}
          alt="Fachada Edificio XYZ"
          fill
          priority
          placeholder="blur"
          className="object-cover object-center scale-100 transition-transform duration-1000"
        />
      </div>
      {/* OVERLAY CON TRANSPARENCIA BALANCEADA */}
      <div className="fixed inset-0 bg-gradient-to-tr from-black/40 via-black/20 to-black/45 dark:from-slate-950/75 dark:via-slate-900/50 dark:to-slate-950/70 -z-10 transition-colors duration-300" />

      {/* BOTÓN CONMUTADOR DE TEMA */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-[#ede9e1]/95 dark:bg-slate-900/90 border border-[#cec8bc] dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl transition-colors my-auto">
        {/* PANEL LATERAL: IDENTIDAD CORPORATIVA CON FOTOGRAFÍA DEL LOBBY */}
        <div className="lg:col-span-5 relative p-4 sm:p-6 lg:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#cec8bc] dark:border-slate-800 overflow-hidden group">
          {/* Fotografía de Fondo del Lobby */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <Image
              src={edificioLobby}
              alt="Lobby Edificio XYZ"
              fill
              placeholder="blur"
              className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          {/* Overlay de contraste y textura */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#ede9e1]/92 via-[#e6e2da]/88 to-[#ded8cc]/96 dark:from-slate-950/94 dark:via-slate-900/90 dark:to-slate-950/96 backdrop-blur-[2px] transition-colors -z-10" />

          <div className="relative z-10">
            <div className="flex items-center justify-between lg:block mb-3 lg:mb-6">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#ede9e1]/90 text-blue-900 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300 text-[11px] sm:text-xs font-semibold border border-[#cec8bc] dark:border-indigo-500/30 shadow-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-indigo-400 animate-pulse" />
                Acceso Seguro
              </div>

              <span className="lg:hidden text-[10px] text-[#7d776f] dark:text-slate-400 font-medium">
                Edificio XYZ © 2026
              </span>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 mb-2 lg:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-700 dark:bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-800/20 shrink-0">
                <Building2 className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-[#262422] dark:text-white">
                Edificio <span className="text-blue-700 dark:text-indigo-400">XYZ</span>
              </h1>
            </div>

            <p className="text-[#5c5750] dark:text-slate-300 text-xs sm:text-sm leading-relaxed hidden sm:block">
              Software Integral de Administración, Expensas, Finanzas y Control de Copropietarios.
            </p>

            {/* Mini Tarjeta Fotográfica de la Recepción (Visible en pantallas grandes) */}
            <div className="mt-6 p-2 rounded-2xl bg-[#ede9e1]/80 dark:bg-slate-900/80 border border-[#cec8bc]/80 dark:border-slate-800 shadow-md backdrop-blur-md hidden lg:block">
              <div className="relative h-28 w-full rounded-xl overflow-hidden">
                <Image
                  src={edificioLobby}
                  alt="Recepción y Lobby Edificio XYZ"
                  fill
                  placeholder="blur"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none z-10" />
                <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white text-[11px] font-medium pointer-events-none z-20">
                  <span>Recepción & Lobby</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-xs font-semibold">
                    Edificio XYZ
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-4 lg:pt-6 mt-4 lg:mt-6 border-t border-[#cec8bc] dark:border-slate-800 text-[11px] text-[#7d776f] dark:text-slate-400 hidden lg:flex justify-between items-center">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-500" /> Cifrado
              JWT
            </span>
            <span>Edificio XYZ © 2026</span>
          </div>
        </div>

        {/* PANEL PRINCIPAL: FORMULARIO Y SELECTOR DE ROL */}
        <div className="lg:col-span-7 p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-[#262422] dark:text-white tracking-tight">
              Ingreso al Sistema
            </h2>
            <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400 mt-0.5 sm:mt-1">
              Selecciona tu rol de usuario e ingresa tus credenciales.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400 text-xs flex items-center gap-2">
              <span className="font-bold">Error:</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400 text-xs flex items-center gap-2">
              <span className="font-bold">Éxito:</span>
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-3 sm:space-y-4">
            {/* Selector de Rol en Grid Responsivo 2 columnas */}
            <div>
              <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#383430] dark:text-slate-300 mb-1.5 sm:mb-2">
                1. Selecciona tu Rol
              </label>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {ROLES_SISTEMA.map((item) => {
                  const isSelected = selectedRole === item.role
                  const IconComp = item.icon
                  return (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => handleSelectRole(item.role)}
                      className={`p-2 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#ded8cc] border-blue-600 ring-2 ring-blue-600/25 shadow-sm dark:bg-indigo-600/20 dark:border-indigo-500 dark:ring-indigo-500/20 text-[#262422] dark:text-white'
                          : 'bg-[#e4dfd5] border-[#cec8bc] text-[#5c5750] hover:border-[#b0a89a] hover:bg-[#dbd5ca] dark:bg-slate-950/60 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                        <span className="text-xs font-semibold flex items-center gap-1.5 truncate">
                          <IconComp
                            className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-700 dark:text-indigo-400' : 'text-[#7d776f]'}`}
                          />
                          <span
                            className={`truncate ${isSelected ? 'text-blue-900 dark:text-white font-bold' : 'text-[#2e2a27] dark:text-slate-300'}`}
                          >
                            {item.title}
                          </span>
                        </span>
                        {isSelected && (
                          <span className="w-3.5 h-3.5 rounded-full bg-blue-700 dark:bg-indigo-600 text-white flex items-center justify-center text-[9px] shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-[#6b665f] dark:text-slate-500 line-clamp-1 sm:line-clamp-2 leading-tight">
                        {item.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Credenciales */}
            <div className="space-y-2 sm:space-y-3 pt-1">
              <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#383430] dark:text-slate-300">
                2. Ingresa tus Credenciales
              </label>

              <div>
                <label
                  className="block text-[11px] sm:text-xs text-[#5c5750] dark:text-slate-400 mb-1"
                  htmlFor="email-input"
                >
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
                    className="w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] dark:placeholder-slate-600 focus:outline-none focus:border-blue-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-[11px] sm:text-xs text-[#5c5750] dark:text-slate-400 mb-1"
                  htmlFor="password-input"
                >
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
                    className="w-full pl-10 pr-12 py-2 sm:py-2.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs sm:text-sm text-[#1c1917] dark:text-white placeholder-[#857f76] dark:placeholder-slate-600 focus:outline-none focus:border-blue-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7d776f] hover:text-[#262422] dark:hover:text-slate-200 cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#5c5750] dark:text-slate-400 pt-0.5">
              <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none">
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
                onClick={() =>
                  alert(
                    'Contacte a la administración del Edificio XYZ para la recuperación de su cuenta.'
                  )
                }
                className="text-blue-700 hover:text-blue-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-600 active:bg-blue-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:active:bg-indigo-700 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-blue-800/20 dark:shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1 sm:mt-2 cursor-pointer"
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
  )
}
