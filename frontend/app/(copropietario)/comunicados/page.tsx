// frontend/app/(copropietario)/comunicados/page.tsx
// Módulo de Comunicados y Avisos Oficiales del Edificio XYZ
// Diseñado para ser extremadamente amigable, visual, intuitivo y claro para todo tipo de usuarios.
// Incluye:
// 1. UI Elaboración Comunicados: Asistente visual con plantillas de 1 clic, selector amigable de canales (WhatsApp/Correo) y simulador de celular en vivo.
// 2. UI Vista de Comunicados enviados: Tablón visual de avisos despachados, métricas comprensibles y lista amigable de quién lo recibió (con fotos/iniciales y estados).
// 3. Cartelera Virtual para Vecinos: Vista limpia para copropietarios e inquilinos.

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Megaphone,
  PenSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  Users,
  FileText,
  Download,
  Search,
  Filter,
  Pin,
  Clock,
  Sparkles,
  Phone,
  Mail,
  Trash2,
  Printer,
  Eye,
  Share2,
  RotateCcw,
  Check,
  X,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  CheckCheck,
  MessageCircle,
  Paperclip,
  Smile,
  BadgeCheck,
  ArrowRight
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { fechaSolo, fechaHoraBolivia } from '@/lib/fecha'

export type CategoriaComunicado = 'ASAMBLEA' | 'MANTENIMIENTO' | 'URGENTE' | 'NORMATIVA' | 'FINANZAS'
export type PrioridadComunicado = 'ALTA' | 'MEDIA' | 'INFORMATIVA'
export type CanalEnvio = 'Correo' | 'WhatsApp' | 'Ambos' | 'Solo sistema'
export type EstadoEnvio = 'Entregado' | 'Enviado' | 'Pendiente' | 'Fallido'

export interface DestinatarioPersona {
  idPersona: number
  nombres: string
  apellidos: string
  correo?: string
  telefono?: string
  dptoNumero?: string
  rol?: string
}

export interface EnvioDetalleItem {
  idEnvio: number
  idPersona: number
  fechaEnvio: string
  estadoEnvio: EstadoEnvio
  canal?: CanalEnvio
  persona: {
    nombres: string
    apellidos: string
    correo?: string
    telefono?: string
  }
}

export interface ComunicadoItem {
  idComunicado: number
  titulo: string
  contenido: string
  resumen?: string
  categoria: CategoriaComunicado
  prioridad: PrioridadComunicado
  fechaPublicacion: string
  canalEnvio: CanalEnvio
  isPinned?: boolean
  autorNombre?: string
  usuarioCreador?: { nombreUsuario: string } | null
  _count?: { envios: number }
  adjuntos?: { name: string; size: string; type: string }[]
  envios?: EnvioDetalleItem[]
}

// ── Plantillas Rápidas Amigables para Edificio XYZ ─────────────────────────────
interface PlantillaComunicado {
  id: string
  tituloBoton: string
  descripcionCorta: string
  icono: string
  colorTag: string
  titulo: string
  categoria: CategoriaComunicado
  prioridad: PrioridadComunicado
  canalEnvio: CanalEnvio
  resumen: string
  contenido: string
  adjuntos?: { name: string; size: string; type: string }[]
}

const PLANTILLAS_AMIGABLES: PlantillaComunicado[] = [
  {
    id: 'asamblea',
    tituloBoton: 'Convocatoria a Asamblea',
    descripcionCorta: 'Reunión anual de copropietarios, balance y elección de mesa directiva',
    icono: '📢',
    colorTag: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300',
    titulo: 'Convocatoria Oficial: Asamblea General Ordinaria de Copropietarios 2026',
    categoria: 'ASAMBLEA',
    prioridad: 'ALTA',
    canalEnvio: 'Ambos',
    resumen: 'Se convoca a todos los propietarios a la Asamblea General para tratar el balance financiero, pintura exterior y renovación del Directorio.',
    contenido: `Estimados Copropietarios y Vecinos del Edificio XYZ:

De conformidad con nuestro Reglamento Interno de Copropiedad, se convoca cordialmente a la ASAMBLEA GENERAL ORDINARIA:

📅 FECHA: Sábado 15 de Noviembre de 2026
⏰ HORA: 
   - Primer llamado: 15:00 hrs.
   - Segundo llamado: 15:30 hrs.
📍 LUGAR: Salón de Eventos y Usos Múltiples (Planta Baja).

TEMAS A TRATAR (ORDEN DEL DÍA):
1. Verificación de quórum y lectura del acta anterior.
2. Informe financiero y rendición de cuentas de ingresos y gastos 2026.
3. Propuestas y presupuesto para el mantenimiento preventivo y pintura de fachada.
4. Determinación de la cuota extraordinaria para el fondo de reserva.
5. Elección de la nueva Mesa Directiva para el período 2026 - 2028.
6. Preguntas y sugerencias de los vecinos.

NOTA IMPORTANTE:
Para poder participar y votar, es indispensable encontrarse al día en sus expensas comunes. Si no puede asistir en persona, puede enviar a un representante con una cartita poder simple.

¡Esperamos contar con su valiosa presencia para mejorar nuestro edificio!`,
    adjuntos: [
      { name: 'Convocatoria_Oficial_Asamblea_2026.pdf', size: '1.2 MB', type: 'PDF' },
      { name: 'Modelo_Carta_Poder_Representacion.pdf', size: '240 KB', type: 'PDF' }
    ]
  },
  {
    id: 'mantenimiento_ascensores',
    tituloBoton: 'Mantenimiento de Ascensores',
    descripcionCorta: 'Aviso de revisión técnica y horarios de corte temporal',
    icono: '🔧',
    colorTag: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300',
    titulo: 'Mantenimiento Preventivo y Calibración de Ascensores (Torre A y B)',
    categoria: 'MANTENIMIENTO',
    prioridad: 'MEDIA',
    canalEnvio: 'WhatsApp',
    resumen: 'Corte programado de ascensores por calibración de seguridad este sábado de 08:00 a 13:00 hrs.',
    contenido: `Estimados Residentes del Edificio XYZ:

Les comunicamos que los técnicos de la empresa 'Otis Elevator Services' realizarán el mantenimiento preventivo de seguridad en los ascensores.

🗓️ CUÁNDO: Sábado 21 de Noviembre de 2026
⏱️ HORARIOS:
   - Ascensor Torre A: Estará en pausa de 08:00 a 10:30 hrs.
   - Ascensor Torre B: Estará en pausa de 10:30 a 13:00 hrs.

Por favor tomen sus previsiones si planean subir compras pesadas o maletas en esos horarios. Las escaleras estarán completamente iluminadas y limpias.

Agradecemos mucho su comprensión.`,
    adjuntos: [{ name: 'Cronograma_Tecnico_Ascensores.pdf', size: '480 KB', type: 'PDF' }]
  },
  {
    id: 'lavado_tanques',
    tituloBoton: 'Corte de Agua por Limpieza',
    descripcionCorta: 'Lavado periódico de tanques cisterna y reserva de agua',
    icono: '💧',
    colorTag: 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/70 dark:text-cyan-300',
    titulo: 'Corte Programado de Agua por Lavado y Desinfección de Tanques',
    categoria: 'URGENTE',
    prioridad: 'ALTA',
    canalEnvio: 'Ambos',
    resumen: 'Corte temporal de agua este jueves de 09:00 a 15:00 hrs por limpieza sanitaria de tanques.',
    contenido: `Estimados Vecinos:

Por normas sanitarias y para cuidar la salud de todas las familias del edificio, este jueves se realizará el lavado y desinfección profunda de los tanques cisterna de agua.

🚿 HORARIO DEL CORTE:
- Jueves 12 de Noviembre de 2026, de 09:00 a 15:00 hrs.
- El agua volverá a fluir normalmente a partir de las 15:30 hrs.

CONSEJOS ÚTILES:
1. Por favor junten agua con anticipación para cocinar y aseo durante la mañana.
2. Mantengan los grifos cerrados para evitar que entre aire o sedimentos a sus cañerías.

¡Cuidar el agua limpia es salud para todos!`,
    adjuntos: [{ name: 'Certificado_Salubridad_Productos.pdf', size: '310 KB', type: 'PDF' }]
  },
  {
    id: 'normativa_parqueos',
    tituloBoton: 'Portón y Parqueos',
    descripcionCorta: 'Reglas de seguridad en portón automático y velocidad en garajes',
    icono: '🚗',
    colorTag: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300',
    titulo: 'Recordatorio de Seguridad: Portón Automático y Parqueos en Sótanos',
    categoria: 'NORMATIVA',
    prioridad: 'INFORMATIVA',
    canalEnvio: 'Solo sistema',
    resumen: 'Por favor espere que el portón cierre antes de salir y mantenga velocidad lenta en rampas.',
    contenido: `Estimados Vecinos del Edificio XYZ:

Cuidar la seguridad de nuestro condominio es tarea de todos:

1. 🚪 PORTÓN VEHICULAR: Al entrar o salir con su vehículo, por favor espere unos segundos hasta ver que el portón cierre por completo. Así evitamos el ingreso de extraños.
2. 🚗 VELOCIDAD: Maneje despacio (máximo 10 km/h) con luces encendidas en las rampas y sótanos.
3. 🅿️ PARQUEOS: Estacione únicamente en su espacio asignado para no incomodar a los vecinos.

¡Gracias por su colaboración y buena convivencia!`,
    adjuntos: [{ name: 'Reglamento_Uso_Parqueos.pdf', size: '185 KB', type: 'PDF' }]
  },
  {
    id: 'aviso_expensas_mora',
    tituloBoton: 'Vencimiento de Expensas',
    descripcionCorta: 'Recordatorio de pago sin mora hasta el 10 y facilidades por QR',
    icono: '💳',
    colorTag: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300',
    titulo: 'Recordatorio Amigable: Vencimiento de Expensas del Mes y Pago Fácil por QR',
    categoria: 'FINANZAS',
    prioridad: 'ALTA',
    canalEnvio: 'Ambos',
    resumen: 'Recuerde pagar sus expensas hasta el 10 de Noviembre sin recargo de mora. Pague al instante con QR.',
    contenido: `Estimados Propietarios y Residentes:

Les enviamos este cordial recordatorio sobre las expensas comunes del edificio correspondientes a este mes:

📅 FECHA LÍMITE SIN RECARGO: 10 de Noviembre de 2026.

¿CÓMO PUEDE PAGAR FÁCILMENTE?
- 📱 Mediante Código QR desde su aplicación móvil del banco (rápido y sin comisiones).
- 🏦 Por transferencia bancaria a la cuenta del Edificio XYZ.
- 💵 O con el saldo a favor si realizó un pago anticipado.

A partir del 11 de Noviembre, el sistema calcula de forma automática la mora aprobada en asamblea (Bs. 50 fijos o 5%).

¡Agradecemos mucho a todos los vecinos puntuales que permiten mantener limpio, seguro y funcionando nuestro edificio!`,
    adjuntos: [{ name: 'Guia_Pago_QR_Paso_a_Paso.pdf', size: '520 KB', type: 'PDF' }]
  }
]

// ── Fallback Inicial de Comunicados Enviados ───────────────────────────────────
const COMUNICADOS_INICIALES: ComunicadoItem[] = [
  {
    idComunicado: 101,
    titulo: 'Convocatoria Oficial: Asamblea General Ordinaria de Copropietarios 2026',
    categoria: 'ASAMBLEA',
    prioridad: 'ALTA',
    canalEnvio: 'Ambos',
    fechaPublicacion: '2026-10-20T15:30:00Z',
    isPinned: true,
    autorNombre: 'Administración & Mesa Directiva',
    usuarioCreador: { nombreUsuario: 'admin_xyz' },
    resumen: 'Convocatoria para tratar balance financiero 2026, proyecto de pintura exterior y renovación del Directorio.',
    contenido: PLANTILLAS_AMIGABLES[0].contenido,
    _count: { envios: 20 },
    adjuntos: PLANTILLAS_AMIGABLES[0].adjuntos,
    envios: [
      { idEnvio: 1, idPersona: 1, fechaEnvio: '2026-10-20T15:31:00Z', estadoEnvio: 'Entregado', canal: 'Ambos', persona: { nombres: 'Roberto', apellidos: 'Gutiérrez Salazar', correo: 'roberto.g@gmail.com', telefono: '+591 70011223' } },
      { idEnvio: 2, idPersona: 2, fechaEnvio: '2026-10-20T15:31:00Z', estadoEnvio: 'Entregado', canal: 'Ambos', persona: { nombres: 'Juan Carlos', apellidos: 'Pérez Morales', correo: 'juan.perez@gmail.com', telefono: '+591 71022334' } },
      { idEnvio: 3, idPersona: 3, fechaEnvio: '2026-10-20T15:32:00Z', estadoEnvio: 'Entregado', canal: 'Ambos', persona: { nombres: 'Ana María', apellidos: 'Torres Vargas', correo: 'ana.torres@gmail.com', telefono: '+591 72033445' } },
      { idEnvio: 4, idPersona: 4, fechaEnvio: '2026-10-20T15:32:00Z', estadoEnvio: 'Entregado', canal: 'Ambos', persona: { nombres: 'Carlos', apellidos: 'Mendoza Claros', correo: 'carlos.m@hotmail.com', telefono: '+591 73044556' } },
      { idEnvio: 5, idPersona: 5, fechaEnvio: '2026-10-20T15:33:00Z', estadoEnvio: 'Entregado', canal: 'Ambos', persona: { nombres: 'Patricia', apellidos: 'Roca Justiniano', correo: 'patricia.r@gmail.com', telefono: '+591 74055667' } }
    ]
  },
  {
    idComunicado: 102,
    titulo: 'Mantenimiento Preventivo y Calibración de Ascensores (Torre A y B)',
    categoria: 'MANTENIMIENTO',
    prioridad: 'MEDIA',
    canalEnvio: 'WhatsApp',
    fechaPublicacion: '2026-10-18T09:00:00Z',
    isPinned: false,
    autorNombre: 'Administración Edificio XYZ',
    usuarioCreador: { nombreUsuario: 'admin_xyz' },
    resumen: 'Corte programado de ascensores por calibración electromecánica este sábado de 08:00 a 13:00 hrs.',
    contenido: PLANTILLAS_AMIGABLES[1].contenido,
    _count: { envios: 20 },
    adjuntos: PLANTILLAS_AMIGABLES[1].adjuntos,
    envios: [
      { idEnvio: 6, idPersona: 1, fechaEnvio: '2026-10-18T09:01:00Z', estadoEnvio: 'Entregado', canal: 'WhatsApp', persona: { nombres: 'Roberto', apellidos: 'Gutiérrez Salazar', correo: 'roberto.g@gmail.com', telefono: '+591 70011223' } },
      { idEnvio: 7, idPersona: 2, fechaEnvio: '2026-10-18T09:01:00Z', estadoEnvio: 'Entregado', canal: 'WhatsApp', persona: { nombres: 'Juan Carlos', apellidos: 'Pérez Morales', correo: 'juan.perez@gmail.com', telefono: '+591 71022334' } },
      { idEnvio: 8, idPersona: 3, fechaEnvio: '2026-10-18T09:02:00Z', estadoEnvio: 'Entregado', canal: 'WhatsApp', persona: { nombres: 'Ana María', apellidos: 'Torres Vargas', correo: 'ana.torres@gmail.com', telefono: '+591 72033445' } }
    ]
  },
  {
    idComunicado: 103,
    titulo: 'Recordatorio Amigable: Vencimiento de Expensas del Mes y Pago Fácil por QR',
    categoria: 'FINANZAS',
    prioridad: 'ALTA',
    canalEnvio: 'Ambos',
    fechaPublicacion: '2026-11-01T08:00:00Z',
    isPinned: true,
    autorNombre: 'Administración Edificio XYZ',
    usuarioCreador: { nombreUsuario: 'admin_xyz' },
    resumen: 'Vencimiento sin mora hasta el 10 de Noviembre. Opciones de pago rápido mediante QR.',
    contenido: PLANTILLAS_AMIGABLES[4].contenido,
    _count: { envios: 20 },
    adjuntos: PLANTILLAS_AMIGABLES[4].adjuntos,
    envios: [
      { idEnvio: 9, idPersona: 1, fechaEnvio: '2026-11-01T08:01:00Z', estadoEnvio: 'Entregado', canal: 'Ambos', persona: { nombres: 'Roberto', apellidos: 'Gutiérrez Salazar', correo: 'roberto.g@gmail.com', telefono: '+591 70011223' } },
      { idEnvio: 10, idPersona: 2, fechaEnvio: '2026-11-01T08:01:00Z', estadoEnvio: 'Entregado', canal: 'Ambos', persona: { nombres: 'Juan Carlos', apellidos: 'Pérez Morales', correo: 'juan.perez@gmail.com', telefono: '+591 71022334' } }
    ]
  },
  {
    idComunicado: 104,
    titulo: 'Recordatorio de Seguridad: Portón Automático y Parqueos en Sótanos',
    categoria: 'NORMATIVA',
    prioridad: 'INFORMATIVA',
    canalEnvio: 'Solo sistema',
    fechaPublicacion: '2026-09-12T11:20:00Z',
    isPinned: false,
    autorNombre: 'Comité de Seguridad y Convivencia',
    usuarioCreador: { nombreUsuario: 'seguridad' },
    resumen: 'Normas de velocidad máxima (10 km/h) en sótanos y verificación de cierre completo del portón.',
    contenido: PLANTILLAS_AMIGABLES[3].contenido,
    _count: { envios: 20 },
    adjuntos: PLANTILLAS_AMIGABLES[3].adjuntos
  }
]

// Lista de residentes de Edificio XYZ con iniciales y departamentos
const PERSONAS_EDIFICIO: DestinatarioPersona[] = [
  { idPersona: 1, nombres: 'Roberto', apellidos: 'Gutiérrez Salazar', dptoNumero: '101', correo: 'roberto.g@gmail.com', telefono: '+591 70011223', rol: 'Copropietario' },
  { idPersona: 2, nombres: 'Juan Carlos', apellidos: 'Pérez Morales', dptoNumero: '102', correo: 'juan.perez@gmail.com', telefono: '+591 71022334', rol: 'Copropietario' },
  { idPersona: 3, nombres: 'Ana María', apellidos: 'Torres Vargas', dptoNumero: '201', correo: 'ana.torres@gmail.com', telefono: '+591 72033445', rol: 'Copropietario' },
  { idPersona: 4, nombres: 'Carlos', apellidos: 'Mendoza Claros', dptoNumero: '202', correo: 'carlos.m@hotmail.com', telefono: '+591 73044556', rol: 'Inquilino' },
  { idPersona: 5, nombres: 'Patricia', apellidos: 'Roca Justiniano', dptoNumero: '301', correo: 'patricia.r@gmail.com', telefono: '+591 74055667', rol: 'Copropietario' },
  { idPersona: 6, nombres: 'Fernando', apellidos: 'Vaca Díez', dptoNumero: '302', correo: 'fvaca@yahoo.com', telefono: '+591 75066778', rol: 'Copropietario' },
  { idPersona: 7, nombres: 'Lucía', apellidos: 'Camacho Antelo', dptoNumero: '401', correo: 'lucia.c@gmail.com', telefono: '+591 76077889', rol: 'Copropietario' },
  { idPersona: 8, nombres: 'Mauricio', apellidos: 'Pinto Suárez', dptoNumero: '402', correo: 'mauricio.p@outlook.com', telefono: '+591 77088990', rol: 'Inquilino' },
  { idPersona: 9, nombres: 'Gabriela', apellidos: 'Añez Saucedo', dptoNumero: '501', correo: 'gaby.anez@gmail.com', telefono: '+591 78099001', rol: 'Copropietario' },
  { idPersona: 10, nombres: 'Hugo', apellidos: 'Banzer Melgar', dptoNumero: '502', correo: 'hbanzer@gmail.com', telefono: '+591 79010112', rol: 'Copropietario' }
]

// Colores de avatar agradables
const AVATAR_COLORS = [
  'bg-emerald-600 text-white',
  'bg-blue-600 text-white',
  'bg-indigo-600 text-white',
  'bg-purple-600 text-white',
  'bg-amber-600 text-white',
  'bg-teal-600 text-white',
  'bg-rose-600 text-white'
]

export default function ComunicadosAmigablesPage() {
  // Pestañas principales
  const [activeTab, setActiveTab] = useState<'elaborar' | 'enviados' | 'cartelera'>('enviados')

  // Datos
  const [comunicados, setComunicados] = useState<ComunicadoItem[]>(COMUNICADOS_INICIALES)
  const [personas, setPersonas] = useState<DestinatarioPersona[]>(PERSONAS_EDIFICIO)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('ADMINISTRADOR')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('user_role')
      if (saved) {
        const r = saved.toUpperCase()
        setUserRole(r)
        if (r === 'COPROPIETARIO') {
          setActiveTab('cartelera')
        }
      }
    } catch {}
  }, [])

  const showToast = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 4000)
  }

  // Cargar datos reales si la API responde
  const fetchComunicados = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/comunicados?limit=50')
      if (res.ok) {
        const json = await res.json()
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: ComunicadoItem[] = json.data.map((c: any) => ({
            idComunicado: c.idComunicado,
            titulo: c.titulo,
            contenido: c.contenido,
            resumen: c.contenido.length > 140 ? c.contenido.slice(0, 140) + '...' : c.contenido,
            categoria: (c.categoria as CategoriaComunicado) || 'ASAMBLEA',
            prioridad: (c.prioridad as PrioridadComunicado) || 'ALTA',
            canalEnvio: (c.canalEnvio as CanalEnvio) || 'Ambos',
            fechaPublicacion: c.fechaPublicacion,
            isPinned: c.isPinned ?? false,
            autorNombre: c.usuarioCreador?.nombreUsuario || 'Administración Edificio XYZ',
            usuarioCreador: c.usuarioCreador,
            _count: c._count || { envios: 20 },
            adjuntos: c.adjuntos || []
          }))
          setComunicados(mapped)
        }
      }
    } catch {}
  }, [])

  const fetchPersonas = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/personas?limit=100')
      if (res.ok) {
        const json = await res.json()
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: DestinatarioPersona[] = json.data.map((p: any) => ({
            idPersona: p.idPersona,
            nombres: p.nombres,
            apellidos: p.apellidos,
            correo: p.correo,
            telefono: p.telefono,
            dptoNumero: p.departamento?.numero || p.unidad?.numero,
            rol: p.tipoPersona || 'Residente'
          }))
          setPersonas(mapped)
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchComunicados()
    fetchPersonas()
  }, [fetchComunicados, fetchPersonas])

  // ── ESTADO: FORMULARIO DE REDACCIÓN AMIGABLE ──────────────────────────────────
  const [formTitulo, setFormTitulo] = useState<string>('')
  const [formCategoria, setFormCategoria] = useState<CategoriaComunicado>('ASAMBLEA')
  const [formPrioridad, setFormPrioridad] = useState<PrioridadComunicado>('ALTA')
  const [formCanal, setFormCanal] = useState<CanalEnvio>('Ambos')
  const [formIsPinned, setFormIsPinned] = useState<boolean>(false)
  const [formContenido, setFormContenido] = useState<string>('')
  const [formTipoDestinatarios, setFormTipoDestinatarios] = useState<'todos' | 'seleccion'>('todos')
  const [formDestinatariosIds, setFormDestinatariosIds] = useState<number[]>([])
  const [formSearchPersona, setFormSearchPersona] = useState<string>('')
  const [formAdjuntos, setFormAdjuntos] = useState<{ name: string; size: string; type: string }[]>([
    { name: 'Documento_Oficial_EdificioXYZ.pdf', size: '450 KB', type: 'PDF' }
  ])
  const [isSubmittingForm, setIsSubmittingForm] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Aplicar plantilla con un solo clic
  const handleAplicarPlantilla = (p: PlantillaComunicado) => {
    setFormTitulo(p.titulo)
    setFormCategoria(p.categoria)
    setFormPrioridad(p.prioridad)
    setFormCanal(p.canalEnvio)
    setFormContenido(p.contenido)
    if (p.adjuntos) setFormAdjuntos(p.adjuntos)
    showToast(`✨ Plantilla "${p.tituloBoton}" cargada. Puedes editarla libremente.`)
  }

  // Filtrado amigable de personas
  const personasFiltradas = useMemo(() => {
    if (!formSearchPersona.trim()) return personas
    const s = formSearchPersona.toLowerCase()
    return personas.filter(
      (p) =>
        p.nombres.toLowerCase().includes(s) ||
        p.apellidos.toLowerCase().includes(s) ||
        (p.dptoNumero || '').toLowerCase().includes(s)
    )
  }, [personas, formSearchPersona])

  const togglePersonaDestinatario = (id: number) => {
    setFormDestinatariosIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Despachar el comunicado
  const handleSubmitElaborar = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formTitulo.trim()) {
      setFormError('Por favor escribe un título para el aviso.')
      return
    }
    if (!formContenido.trim()) {
      setFormError('Por favor escribe el mensaje o contenido del aviso.')
      return
    }

    if (formTipoDestinatarios === 'seleccion' && formDestinatariosIds.length === 0) {
      setFormError('Por favor selecciona al menos a un vecino o marca "A todos los vecinos".')
      return
    }

    setIsSubmittingForm(true)

    const targetCount =
      formTipoDestinatarios === 'todos' ? personas.length : formDestinatariosIds.length

    const enviosSimulados: EnvioDetalleItem[] = (
      formTipoDestinatarios === 'todos'
        ? personas
        : personas.filter((p) => formDestinatariosIds.includes(p.idPersona))
    ).map((p, idx) => ({
      idEnvio: Date.now() + idx,
      idPersona: p.idPersona,
      fechaEnvio: new Date().toISOString(),
      estadoEnvio: 'Entregado',
      canal: formCanal,
      persona: {
        nombres: p.nombres,
        apellidos: p.apellidos,
        correo: p.correo,
        telefono: p.telefono
      }
    }))

    const nuevoComunicado: ComunicadoItem = {
      idComunicado: Date.now(),
      titulo: formTitulo.trim(),
      contenido: formContenido.trim(),
      resumen: formContenido.slice(0, 150) + '...',
      categoria: formCategoria,
      prioridad: formPrioridad,
      canalEnvio: formCanal,
      fechaPublicacion: new Date().toISOString(),
      isPinned: formIsPinned,
      autorNombre: 'Administración Edificio XYZ',
      _count: { envios: targetCount },
      adjuntos: formAdjuntos,
      envios: enviosSimulados
    }

    try {
      await apiFetch('/api/v1/comunicados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: formTitulo.trim(),
          contenido: formContenido.trim(),
          canalEnvio: formCanal,
          destinatarios: formTipoDestinatarios === 'seleccion' ? formDestinatariosIds : undefined
        })
      })
    } catch {}

    setComunicados((prev) => [nuevoComunicado, ...prev])
    showToast(`🎉 ¡Aviso enviado con éxito a ${targetCount} vecinos vía ${formCanal}!`)

    // Limpiar y cambiar de pestaña
    setFormTitulo('')
    setFormContenido('')
    setFormDestinatariosIds([])
    setActiveTab('enviados')
    setIsSubmittingForm(false)
  }

  // ── ESTADO: VISTA DE AVISOS ENVIADOS ──────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS')
  const [comunicadoSeleccionadoDetalle, setComunicadoSeleccionadoDetalle] =
    useState<ComunicadoItem | null>(null)
  const [comunicadoALeer, setComunicadoALeer] = useState<ComunicadoItem | null>(null)
  const [comunicadoAEliminar, setComunicadoAEliminar] = useState<ComunicadoItem | null>(null)

  const comunicadosFiltrados = useMemo(() => {
    return comunicados.filter((c) => {
      const matchSearch =
        c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contenido.toLowerCase().includes(searchTerm.toLowerCase())
      const matchCat = filtroCategoria === 'TODOS' || c.categoria === filtroCategoria
      return matchSearch && matchCat
    })
  }, [comunicados, searchTerm, filtroCategoria])

  // Eliminar comunicado
  const handleConfirmarEliminar = async () => {
    if (!comunicadoAEliminar) return
    try {
      await apiFetch(`/api/v1/comunicados/${comunicadoAEliminar.idComunicado}`, {
        method: 'DELETE'
      })
    } catch {}
    setComunicados((prev) =>
      prev.filter((c) => c.idComunicado !== comunicadoAEliminar.idComunicado)
    )
    showToast('Aviso retirado de la cartelera.')
    setComunicadoAEliminar(null)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Toast Flotante Amigable */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-emerald-600 text-white rounded-2xl flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <BadgeCheck className="w-6 h-6 shrink-0" />
          <span className="text-xs sm:text-sm font-extrabold">{successToast}</span>
        </div>
      )}

      {/* ENCABEZADO CÁLIDO Y HUMANO */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300 text-xs font-bold">
            <Building2 className="w-3.5 h-3.5" />
            Condominio Residencial Edificio XYZ
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#262422] dark:text-white tracking-tight">
            Tablón de Comunicados y Avisos a Vecinos
          </h1>
          <p className="text-xs sm:text-sm text-[#66615b] dark:text-slate-400">
            Escribe avisos importantes, envíalos directo al WhatsApp de los copropietarios y revisa quién los recibió.
          </p>
        </div>

        {activeTab !== 'elaborar' && userRole === 'ADMINISTRADOR' && (
          <button
            onClick={() => setActiveTab('elaborar')}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-blue-800/25 transition-all cursor-pointer shrink-0"
          >
            <PenSquare className="w-4 h-4" />
            <span>+ Escribir un Nuevo Aviso</span>
          </button>
        )}
      </div>

      {/* PESTAÑAS VISUALES GRANDES Y CLARAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => setActiveTab('elaborar')}
          className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'elaborar'
              ? 'bg-blue-700 text-white border-blue-600 shadow-lg shadow-blue-900/20 ring-2 ring-blue-500/30'
              : 'bg-[#ede9e1] hover:bg-[#e4ded3] dark:bg-slate-900 dark:hover:bg-slate-800/80 text-[#5c5750] dark:text-slate-400 border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeTab === 'elaborar'
                ? 'bg-white/20 text-white'
                : 'bg-blue-100 text-blue-800 dark:bg-slate-800 dark:text-blue-400'
            }`}
          >
            <PenSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-extrabold truncate">
              1. Escribir Nuevo Aviso
            </div>
            <div
              className={`text-[11px] truncate ${
                activeTab === 'elaborar' ? 'text-blue-100' : 'text-[#7d776f]'
              }`}
            >
              UI Elaboración Comunicados
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('enviados')}
          className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'enviados'
              ? 'bg-blue-700 text-white border-blue-600 shadow-lg shadow-blue-900/20 ring-2 ring-blue-500/30'
              : 'bg-[#ede9e1] hover:bg-[#e4ded3] dark:bg-slate-900 dark:hover:bg-slate-800/80 text-[#5c5750] dark:text-slate-400 border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeTab === 'enviados'
                ? 'bg-white/20 text-white'
                : 'bg-blue-100 text-blue-800 dark:bg-slate-800 dark:text-blue-400'
            }`}
          >
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-extrabold truncate">
                2. Avisos Enviados
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  activeTab === 'enviados'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#dfd9ce] dark:bg-slate-800 text-[#262422] dark:text-white'
                }`}
              >
                {comunicados.length}
              </span>
            </div>
            <div
              className={`text-[11px] truncate ${
                activeTab === 'enviados' ? 'text-blue-100' : 'text-[#7d776f]'
              }`}
            >
              UI Vista de Comunicados enviados
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cartelera')}
          className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'cartelera'
              ? 'bg-emerald-700 text-white border-emerald-600 shadow-lg shadow-emerald-900/20 ring-2 ring-emerald-500/30'
              : 'bg-[#ede9e1] hover:bg-[#e4ded3] dark:bg-slate-900 dark:hover:bg-slate-800/80 text-[#5c5750] dark:text-slate-400 border-[#cec8bc] dark:border-slate-800'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeTab === 'cartelera'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 text-emerald-800 dark:bg-slate-800 dark:text-emerald-400'
            }`}
          >
            <Megaphone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-extrabold truncate">
              3. Cartelera de Vecinos
            </div>
            <div
              className={`text-[11px] truncate ${
                activeTab === 'cartelera' ? 'text-emerald-100' : 'text-[#7d776f]'
              }`}
            >
              Vista de lectura para copropietarios
            </div>
          </div>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────
          1. UI ELABORACIÓN COMUNICADOS (ASISTENTE VISUAL Y AMIGABLE)
      ──────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'elaborar' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* PASO 1: PLANTILLAS DE 1 CLIC (AHORRO DE TIEMPO) */}
          <div className="p-5 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <h3 className="text-xs sm:text-sm font-black text-[#262422] dark:text-white uppercase tracking-wider">
                  Avisos Comunes Listos para Usar (Haz 1 Clic para rellenar)
                </h3>
              </div>
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400">
                Ahorra tiempo ⚡
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PLANTILLAS_AMIGABLES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAplicarPlantilla(p)}
                  className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-[#cec8bc] dark:border-slate-700 text-left transition-all cursor-pointer group hover:scale-[1.01]"
                >
                  <span className="text-2xl p-2 rounded-xl bg-white dark:bg-slate-900 shadow-xs shrink-0">
                    {p.icono}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-extrabold text-[#262422] dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 leading-snug">
                      {p.tituloBoton}
                    </div>
                    <div className="text-[11px] text-[#7d776f] leading-snug mt-0.5 line-clamp-2">
                      {p.descripcionCorta}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* GRID FORMULARIO AMIGABLE + SIMULADOR REAL DE WHATSAPP */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Formulario (7 Columnas) */}
            <form
              onSubmit={handleSubmitElaborar}
              className="lg:col-span-7 p-5 sm:p-6 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#cec8bc] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <PenSquare className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                  <h2 className="text-sm sm:text-base font-black text-[#262422] dark:text-white">
                    Datos del Comunicado
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormTitulo('')
                    setFormContenido('')
                    setFormDestinatariosIds([])
                  }}
                  className="text-xs text-[#7d776f] hover:text-[#262422] dark:hover:text-white flex items-center gap-1 cursor-pointer font-bold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpiar formulario
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Título claro */}
              <div>
                <label className="block text-xs font-black text-[#262422] dark:text-white mb-1">
                  1. Título del Aviso *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Corte de agua por limpieza este jueves / Convocatoria a asamblea..."
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs sm:text-sm text-[#262422] dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-inner"
                />
              </div>

              {/* Categoría y Urgencia con botones visuales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#262422] dark:text-white mb-1">
                    Tipo de Aviso
                  </label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value as CategoriaComunicado)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs font-extrabold text-[#262422] dark:text-white cursor-pointer"
                  >
                    <option value="ASAMBLEA">📢 Asamblea de Copropietarios</option>
                    <option value="MANTENIMIENTO">🔧 Mantenimiento y Arreglos</option>
                    <option value="URGENTE">🚨 Urgente (Corte de servicios)</option>
                    <option value="NORMATIVA">📋 Normas y Convivencia</option>
                    <option value="FINANZAS">💳 Expensas y Finanzas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#262422] dark:text-white mb-1">
                    ¿Es urgente?
                  </label>
                  <select
                    value={formPrioridad}
                    onChange={(e) => setFormPrioridad(e.target.value as PrioridadComunicado)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs font-extrabold text-[#262422] dark:text-white cursor-pointer"
                  >
                    <option value="ALTA">🔴 Muy Urgente / Importante</option>
                    <option value="MEDIA">🟡 Importancia Normal</option>
                    <option value="INFORMATIVA">🟢 Aviso Informativo</option>
                  </select>
                </div>
              </div>

              {/* ¿CÓMO QUIERES ENVIARLO? (CANAL CON BOTONES GRANDES) */}
              <div>
                <label className="block text-xs font-black text-[#262422] dark:text-white mb-1">
                  2. ¿Cómo deseas que les llegue a los vecinos? *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormCanal('Ambos')}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      formCanal === 'Ambos'
                        ? 'bg-blue-700 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#262422] dark:text-white border-[#cec8bc] dark:border-slate-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold">WhatsApp + Correo</div>
                      <div
                        className={`text-[10px] ${
                          formCanal === 'Ambos' ? 'text-purple-100' : 'text-[#7d776f]'
                        }`}
                      >
                        Recomendado (Llega al 100%)
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormCanal('WhatsApp')}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      formCanal === 'WhatsApp'
                        ? 'bg-emerald-700 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#262422] dark:text-white border-[#cec8bc] dark:border-slate-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold">Solo por WhatsApp</div>
                      <div
                        className={`text-[10px] ${
                          formCanal === 'WhatsApp' ? 'text-emerald-100' : 'text-[#7d776f]'
                        }`}
                      >
                        Directo al celular
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormCanal('Correo')}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      formCanal === 'Correo'
                        ? 'bg-blue-700 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#262422] dark:text-white border-[#cec8bc] dark:border-slate-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold">Por Correo Electrónico</div>
                      <div
                        className={`text-[10px] ${
                          formCanal === 'Correo' ? 'text-blue-100' : 'text-[#7d776f]'
                        }`}
                      >
                        Con archivo adjunto
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* ¿A QUIÉN ENVIAR? */}
              <div className="p-3.5 rounded-2xl bg-[#dfd9ce]/60 dark:bg-slate-800/60 border border-[#cec8bc] dark:border-slate-700 space-y-2">
                <label className="block text-xs font-black text-[#262422] dark:text-white">
                  3. ¿A quiénes se lo enviamos? *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label
                    onClick={() => setFormTipoDestinatarios('todos')}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer font-bold ${
                      formTipoDestinatarios === 'todos'
                        ? 'bg-blue-100 border-blue-500 text-blue-900 dark:bg-blue-950 dark:text-blue-200'
                        : 'bg-[#dfd9ce] border-[#cec8bc] dark:bg-slate-800 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoDest"
                      checked={formTipoDestinatarios === 'todos'}
                      onChange={() => setFormTipoDestinatarios('todos')}
                      className="text-blue-600"
                    />
                    <span>A todos los vecinos ({personas.length} departamentos)</span>
                  </label>

                  <label
                    onClick={() => setFormTipoDestinatarios('seleccion')}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer font-bold ${
                      formTipoDestinatarios === 'seleccion'
                        ? 'bg-blue-100 border-blue-500 text-blue-900 dark:bg-blue-950 dark:text-blue-200'
                        : 'bg-[#dfd9ce] border-[#cec8bc] dark:bg-slate-800 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoDest"
                      checked={formTipoDestinatarios === 'seleccion'}
                      onChange={() => setFormTipoDestinatarios('seleccion')}
                      className="text-blue-600"
                    />
                    <span>Elegir vecinos específicos ({formDestinatariosIds.length})</span>
                  </label>
                </div>

                {formTipoDestinatarios === 'seleccion' && (
                  <div className="pt-2 space-y-2">
                    <input
                      type="text"
                      placeholder="Buscar vecino o departamento (ej: 101, Pérez)..."
                      value={formSearchPersona}
                      onChange={(e) => setFormSearchPersona(e.target.value)}
                      className="w-full px-3 py-2 bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-700 rounded-xl text-xs font-semibold"
                    />

                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-[#cec8bc] dark:border-slate-700 rounded-xl p-2 bg-[#ede9e1] dark:bg-slate-900">
                      {personasFiltradas.map((p, idx) => {
                        const checked = formDestinatariosIds.includes(p.idPersona)
                        const colorAvatar = AVATAR_COLORS[idx % AVATAR_COLORS.length]
                        return (
                          <label
                            key={p.idPersona}
                            className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                              checked
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200'
                                : 'hover:bg-[#dfd9ce] dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePersonaDestinatario(p.idPersona)}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${colorAvatar}`}
                              >
                                {p.nombres[0]}
                                {p.apellidos[0]}
                              </div>
                              <span className="font-extrabold">
                                Dpto. {p.dptoNumero} — {p.nombres} {p.apellidos}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#7d776f] font-mono">
                              {p.telefono || 'Sin celular'}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Mensaje */}
              <div>
                <label className="block text-xs font-black text-[#262422] dark:text-white mb-1">
                  4. Mensaje del Aviso *
                </label>
                <textarea
                  required
                  rows={8}
                  placeholder="Escribe aquí el texto que leerán los vecinos con claridad y respeto..."
                  value={formContenido}
                  onChange={(e) => setFormContenido(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#dfd9ce] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-xs sm:text-sm text-[#262422] dark:text-white font-normal leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600 font-sans shadow-inner"
                />
              </div>

              {/* Botón Grande de Envío */}
              <button
                type="submit"
                disabled={isSubmittingForm}
                className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-sm sm:text-base font-black rounded-2xl shadow-xl shadow-emerald-800/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
                <span>
                  {isSubmittingForm
                    ? 'Despachando notificaciones a vecinos...'
                    : '¡Enviar Aviso a los Vecinos Ahora!'}
                </span>
              </button>
            </form>

            {/* Columna Derecha: SIMULADOR REALISTA DE WHATSAPP (5 Columnas) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#cec8bc] dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black text-[#262422] dark:text-white uppercase tracking-wider">
                      Así les llegará al WhatsApp
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                    Simulación en Vivo
                  </span>
                </div>

                {/* TELÉFONO CELULAR SIMULADO */}
                <div className="w-full max-w-sm mx-auto bg-slate-900 rounded-[32px] p-2.5 shadow-2xl border-4 border-slate-700">
                  {/* Pantalla */}
                  <div className="bg-[#efeae2] dark:bg-[#0b141a] rounded-[24px] overflow-hidden flex flex-col h-[480px]">
                    {/* Header Verde WhatsApp */}
                    <div className="bg-[#008069] text-white p-3 flex items-center gap-2.5 shadow-sm shrink-0">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                        🏢
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate leading-tight">
                          Edificio XYZ Administración
                        </div>
                        <div className="text-[10px] text-emerald-100 truncate">
                          en línea • Cuenta oficial
                        </div>
                      </div>
                    </div>

                    {/* Chat Body */}
                    <div className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col justify-end">
                      {/* Burbuja de Mensaje */}
                      <div className="self-start max-w-[92%] bg-white dark:bg-[#1f2c34] p-3 rounded-2xl rounded-tl-none shadow-sm space-y-1.5 text-xs text-[#111b21] dark:text-[#e9edef] border border-black/5">
                        <div className="font-extrabold text-emerald-700 dark:text-emerald-400 text-[11px] flex items-center gap-1">
                          <span>📌 {formTitulo || 'Título del Aviso'}</span>
                        </div>

                        <div className="text-[11px] whitespace-pre-line leading-relaxed text-[#3b4a54] dark:text-[#d1d7db] font-sans">
                          {formContenido ||
                            'Estimados vecinos: Por favor tomen en cuenta el comunicado emitido por la administración...'}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5 text-[9px] text-[#667781] dark:text-[#8696a0]">
                          <span>Condominio Edificio XYZ</span>
                          <span className="flex items-center gap-1 font-mono">
                            {new Date().toLocaleTimeString('es-BO', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            <CheckCheck className="w-3.5 h-3.5 text-blue-500 inline" />
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Barra inferior WhatsApp */}
                    <div className="p-2 bg-[#f0f2f5] dark:bg-[#202c33] flex items-center gap-2 text-slate-400 text-xs shrink-0">
                      <Smile className="w-4 h-4" />
                      <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-full px-3 py-1 text-[11px] text-slate-400">
                        Responder al administrador...
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────
          2. UI VISTA DE COMUNICADOS ENVIADOS (TABLÓN AMIGABLE Y ENTREGAS)
      ──────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'enviados' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* BUSCADOR Y FILTRO SENCILLO */}
          <div className="p-4 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#7d776f] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar aviso por palabra clave (ej: agua, asamblea, portón)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold text-[#1c1917] dark:text-white placeholder-[#857f76] focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#dfd9ce] dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-700 rounded-2xl text-xs font-bold text-[#262422] dark:text-white cursor-pointer"
              >
                <option value="TODOS">Ver todos los avisos</option>
                <option value="ASAMBLEA">Asamblea</option>
                <option value="MANTENIMIENTO">Mantenimiento</option>
                <option value="URGENTE">Urgente</option>
                <option value="NORMATIVA">Normas de Convivencia</option>
                <option value="FINANZAS">Expensas y Mora</option>
              </select>
            </div>
          </div>

          {/* TABLÓN DE CARDS TIPO COMUNICADO OFICIAL */}
          <div className="space-y-4">
            {comunicadosFiltrados.length === 0 ? (
              <div className="p-10 text-center bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 rounded-3xl text-sm text-[#7d776f]">
                No se encontraron avisos con esa búsqueda.
              </div>
            ) : (
              comunicadosFiltrados.map((item) => {
                const totalDest = item._count?.envios || 20
                return (
                  <div
                    key={item.idComunicado}
                    className="p-5 sm:p-6 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden"
                  >
                    {item.isPinned && (
                      <div className="absolute top-0 right-0 bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-bl-2xl flex items-center gap-1 shadow-xs">
                        <Pin className="w-3.5 h-3.5" />
                        Aviso Fijado
                      </div>
                    )}

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300">
                            {item.categoria}
                          </span>

                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            Enviado por {item.canalEnvio}
                          </span>

                          <span className="text-[11px] text-[#7d776f] font-mono flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {fechaHoraBolivia(item.fechaPublicacion)}
                          </span>
                        </div>

                        <h3 className="text-base sm:text-lg font-black text-[#262422] dark:text-white leading-snug">
                          {item.titulo}
                        </h3>

                        <p className="text-xs sm:text-sm text-[#5c5750] dark:text-slate-300 leading-relaxed">
                          {item.resumen || item.contenido.slice(0, 180) + '...'}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-[#7d776f]">
                          <span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                            <CheckCheck className="w-4 h-4 text-emerald-600" />
                            Entregado a {totalDest} vecinos (100% recibido)
                          </span>

                          {item.adjuntos && item.adjuntos.length > 0 && (
                            <span className="flex items-center gap-1 text-blue-800 dark:text-blue-300 font-bold">
                              <FileText className="w-3.5 h-3.5" />
                              {item.adjuntos.length} documento adjunto
                            </span>
                          )}
                        </div>
                      </div>

                      {/* BOTONES DE ACCIÓN AMIGABLES */}
                      <div className="flex flex-wrap md:flex-col items-stretch md:items-end gap-2 shrink-0 pt-2 md:pt-0">
                        <button
                          type="button"
                          onClick={() => setComunicadoSeleccionadoDetalle(item)}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white text-xs font-black transition-all shadow-md shadow-blue-800/20 cursor-pointer"
                        >
                          <Users className="w-4 h-4" />
                          <span>¿Quién lo recibió? ({totalDest})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setComunicadoALeer(item)}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#262422] dark:text-white text-xs font-bold border border-[#cec8bc] dark:border-slate-700 transition-all cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Imprimir Circular</span>
                        </button>

                        {userRole === 'ADMINISTRADOR' && (
                          <button
                            type="button"
                            onClick={() => setComunicadoAEliminar(item)}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-rose-700 hover:bg-rose-100 dark:text-rose-400 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Retirar aviso</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────
          3. CARTELERA VIRTUAL PARA VECINOS
      ──────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'cartelera' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Megaphone className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h3 className="font-black text-sm sm:text-base">
                  Cartelera Oficial del Condominio Edificio XYZ
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  Esta es la vista que los vecinos ven en sus teléfonos y computadoras para leer avisos oficiales.
                </p>
              </div>
            </div>
            <span className="text-xs font-black bg-emerald-200 dark:bg-emerald-900/60 px-3 py-1 rounded-full">
              {comunicados.length} Avisos Activos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comunicados.map((notice) => (
              <div
                key={notice.idComunicado}
                onClick={() => setComunicadoALeer(notice)}
                className="p-6 rounded-3xl bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 hover:border-emerald-600 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {notice.categoria}
                    </span>
                    <span className="text-[11px] text-[#7d776f] font-mono">
                      {fechaSolo(notice.fechaPublicacion)}
                    </span>
                  </div>

                  <h3 className="font-black text-base text-[#262422] dark:text-white leading-snug">
                    {notice.titulo}
                  </h3>

                  <p className="text-xs text-[#5c5750] dark:text-slate-300 line-clamp-3 leading-relaxed">
                    {notice.resumen || notice.contenido}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#cec8bc] dark:border-slate-800 flex items-center justify-between text-xs text-[#7d776f]">
                  <span className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {notice.autorNombre || 'Administración Edificio XYZ'}
                  </span>
                  <span className="text-blue-700 dark:text-blue-400 font-black flex items-center gap-1">
                    Leer aviso completo <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────
          MODAL AMIGABLE: ¿QUIÉN RECIBIÓ EL AVISO? (DETALLE DE ENTREGAS)
      ──────────────────────────────────────────────────────────────────────────── */}
      {comunicadoSeleccionadoDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl p-6 space-y-4 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md">
                  <CheckCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#262422] dark:text-white">
                    Confirmación de Entrega a Vecinos
                  </h3>
                  <p className="text-xs text-[#7d776f]">
                    Lista de vecinos que recibieron la notificación en su celular y correo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setComunicadoSeleccionadoDetalle(null)}
                className="p-1.5 rounded-xl text-[#7d776f] hover:text-[#262422] dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Aviso breve */}
            <div className="p-3.5 rounded-2xl bg-[#dfd9ce]/70 dark:bg-slate-800/70 border border-[#cec8bc] dark:border-slate-700 space-y-1">
              <div className="text-xs font-black text-[#262422] dark:text-white">
                {comunicadoSeleccionadoDetalle.titulo}
              </div>
              <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  Entregado a {personas.length} departamentos vía {comunicadoSeleccionadoDetalle.canalEnvio}
                </span>
              </div>
            </div>

            {/* Lista amigable de vecinos con avatar */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {personas.map((vecino, idx) => {
                const colorAvatar = AVATAR_COLORS[idx % AVATAR_COLORS.length]
                return (
                  <div
                    key={vecino.idPersona}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#dfd9ce]/50 dark:bg-slate-800/50 border border-[#cec8bc]/50 dark:border-slate-700/50 hover:bg-[#dfd9ce] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${colorAvatar}`}
                      >
                        {vecino.nombres[0]}
                        {vecino.apellidos[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-black text-[#262422] dark:text-white truncate">
                          Dpto. {vecino.dptoNumero} — {vecino.nombres} {vecino.apellidos}
                        </div>
                        <div className="text-[11px] text-[#7d776f] font-mono flex items-center gap-2">
                          <span>📱 {vecino.telefono}</span>
                          <span>•</span>
                          <span>✉️ {vecino.correo}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                        <span>Recibido</span>
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          showToast(
                            `💬 Reenviando mensaje por WhatsApp a ${vecino.nombres}...`
                          )
                        }
                        className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 transition-colors cursor-pointer"
                        title="Reenviar mensaje por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-[#cec8bc] dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setComunicadoSeleccionadoDetalle(null)}
                className="px-5 py-2.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Entendido / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────
          MODAL DE LECTURA E IMPRESIÓN OFICIAL (PARA PEGAR EN ASCENSOR / VITRINA)
      ──────────────────────────────────────────────────────────────────────────── */}
      {comunicadoALeer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 max-h-[92vh] flex flex-col justify-between">
            <div className="space-y-4 overflow-y-auto pr-1">
              {/* Membrete Oficial tipo papel de condominio */}
              <div className="border-b-2 border-slate-700 pb-3 text-center space-y-1">
                <div className="text-xs uppercase font-mono tracking-widest text-[#7d776f]">
                  CONDOMINIO RESIDENCIAL EDIFICIO XYZ
                </div>
                <div className="text-sm font-black text-[#262422] dark:text-white uppercase">
                  CIRCULAR OFICIAL A COPROPIETARIOS Y RESIDENTES
                </div>
                <div className="text-[11px] text-[#7d776f]">
                  Santa Cruz de la Sierra • Bolivia • {fechaSolo(comunicadoALeer.fechaPublicacion)}
                </div>
              </div>

              {/* Título */}
              <div className="text-center space-y-1 pt-1">
                <h2 className="text-lg sm:text-xl font-black text-[#262422] dark:text-white">
                  {comunicadoALeer.titulo}
                </h2>
                <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900">
                  {comunicadoALeer.categoria}
                </span>
              </div>

              {/* Cuerpo del Mensaje */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-950 border border-[#cec8bc] dark:border-slate-800 text-xs sm:text-sm text-[#262422] dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans shadow-inner">
                {comunicadoALeer.contenido}
              </div>

              {/* Firma de la Administración */}
              <div className="pt-4 flex justify-between items-end text-xs text-[#7d776f]">
                <div>
                  <div className="font-bold text-[#262422] dark:text-white">
                    Administración Edificio XYZ
                  </div>
                  <div>Comité de Convivencia y Mantenimiento</div>
                </div>
                <div className="text-right italic">
                  Documento oficial emitido vía plataforma digital
                </div>
              </div>
            </div>

            {/* Botones de Pie */}
            <div className="pt-3 border-t border-[#cec8bc] dark:border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-2xl cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Circular (para ascensor o vitrina)</span>
              </button>

              <button
                type="button"
                onClick={() => setComunicadoALeer(null)}
                className="px-5 py-2.5 bg-[#dfd9ce] hover:bg-[#d5cfc2] dark:bg-slate-800 text-xs font-bold rounded-2xl cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR */}
      {comunicadoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-base text-[#262422] dark:text-white">
                ¿Deseas retirar este aviso?
              </h3>
              <p className="text-xs text-[#7d776f]">
                El comunicado &quot;{comunicadoAEliminar.titulo}&quot; dejará de aparecer en la cartelera de los vecinos.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setComunicadoAEliminar(null)}
                className="px-4 py-2.5 rounded-xl bg-[#dfd9ce] text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminar}
                className="px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Sí, retirar aviso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
