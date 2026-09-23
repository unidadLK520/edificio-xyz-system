'use client'

import React, { useState } from 'react'
import {
  Megaphone,
  AlertCircle,
  Calendar,
  FileText,
  Download,
  Search,
  Filter,
  Pin,
  CheckCircle2,
  X,
  Building2,
  ChevronRight,
  ShieldCheck,
  Clock,
  Sparkles,
  Info
} from 'lucide-react'

interface Notice {
  id: string
  title: string
  category: 'ASAMBLEA' | 'MANTENIMIENTO' | 'URGENTE' | 'NORMATIVA' | 'FINANZAS'
  priority: 'ALTA' | 'MEDIA' | 'INFORMATIVA'
  date: string
  author: string
  isPinned: boolean
  summary: string
  fullContent: string
  attachments?: { name: string; size: string; type: string }[]
}

const NOTICES: Notice[] = [
  {
    id: 'COM-2026-001',
    title: 'Convocatoria Oficial: Asamblea General Ordinaria de Copropietarios 2026',
    category: 'ASAMBLEA',
    priority: 'ALTA',
    date: '2026-09-20',
    author: 'Mesa Directiva & Administración',
    isPinned: true,
    summary:
      'Se convoca a todos los propietarios a la Asamblea Anual para tratar el balance financiero 2026, proyecto de pintura exterior y renovación del Directorio.',
    fullContent: `Estimados Copropietarios del Edificio XYZ:

De conformidad con el Reglamento Interno de Copropiedad y el Código Civil vigente, se convoca a la ASAMBLEA GENERAL ORDINARIA correspondiente a la gestión 2026.

FECHA: Sábado 03 de Octubre de 2026
HORA: Primer llamado: 15:00 hrs. / Segundo llamado: 15:30 hrs.
LUGAR: Salón de Eventos y Multiuso (Planta Baja).

ORDEN DEL DÍA:
1. Verificación de quórum reglamentario y lectura del acta anterior.
2. Presentación y consideración de los Estados Financieros y Rendición de Cuentas de Ingresos/Egresos.
3. Propuesta y cotizaciones para el mantenimiento preventivo y pintura de la fachada exterior.
4. Determinación de la cuota extraordinaria para el fondo de imprevistos.
5. Elección y posesión del nuevo Directorio para el período 2026 - 2028.
6. Varios.

Se recuerda que para tener derecho a voto es indispensable encontrarse al día en el pago de expensas comunes. En caso de no poder asistir de manera presencial, puede delegar su representación mediante carta poder simple.`,
    attachments: [
      { name: 'Convocatoria_Oficial_Asamblea_2026.pdf', size: '1.2 MB', type: 'PDF' },
      { name: 'Modelo_Carta_Poder_Representacion.pdf', size: '240 KB', type: 'PDF' }
    ]
  },
  {
    id: 'COM-2026-002',
    title: 'Mantenimiento Preventivo y Calibración de Ascensores (Torre A y B)',
    category: 'MANTENIMIENTO',
    priority: 'MEDIA',
    date: '2026-09-18',
    author: 'Administración Edificio XYZ',
    isPinned: false,
    summary:
      'Corte programado de ascensores por calibración electromecánica y cambio de cables de tracción este sábado de 08:00 a 13:00.',
    fullContent: `Estimados Residentes:

Hacemos de su conocimiento que la empresa técnica 'Otis Elevator Services' realizará el mantenimiento preventivo mensual y la certificación de seguridad semestral de los dos ascensores del edificio.

HORARIO DE INTERRUPCIÓN:
- Sábado 26 de Septiembre, de 08:00 a 13:00 hrs.
- El ascensor de la Torre A estará inactivo de 08:00 a 10:30 hrs.
- El ascensor de la Torre B estará inactivo de 10:30 a 13:00 hrs.

Rogamos a los residentes tomar las previsiones correspondientes al planificar traslados de cargas pesadas durante estas horas.`,
    attachments: [{ name: 'Cronograma_Mantenimiento_Ascensores.pdf', size: '480 KB', type: 'PDF' }]
  },
  {
    id: 'COM-2026-003',
    title: 'Recordatorio: Protocolo de Seguridad en Portón Automático y Parqueos',
    category: 'NORMATIVA',
    priority: 'INFORMATIVA',
    date: '2026-09-12',
    author: 'Comité de Seguridad',
    isPinned: false,
    summary:
      'Por la seguridad de todos, espere el cierre total del portón vehicular antes de continuar su marcha y no preste el control remoto a terceros.',
    fullContent: `Estimados Copropietarios y Residentes:

Con el objetivo de resguardar los vehículos y la integridad de nuestro condominio:
1. Al ingresar o salir con su vehículo, es OBLIGATORIO detenerse unos segundos hasta verificar que el portón eléctrico ha cerrado completamente.
2. Queda terminantemente prohibido estacionar en zonas de giro o frente a hidrantes de emergencia.
3. La velocidad máxima en el sótano y rampas es de 10 km/h.

Agradecemos su valiosa cooperación.`
  },
  {
    id: 'COM-2026-004',
    title: 'Campaña de Fumigación y Desinfección de Ductos y Áreas Comunes',
    category: 'MANTENIMIENTO',
    priority: 'MEDIA',
    date: '2026-09-05',
    author: 'Administración',
    isPinned: false,
    summary:
      'Fumigación de ductos de basura, parqueos, pasillos y jardines exteriores el próximo martes de 09:00 a 12:00.',
    fullContent: `Se informa que el martes 29 de Septiembre se llevará a cabo la fumigación trimestral contra plagas en áreas comunes. Se solicita a los residentes mantener cerradas las compuertas de los ductos de basura durante esa mañana.`,
    attachments: [{ name: 'Ficha_Tecnica_Productos_Fumigacion.pdf', size: '320 KB', type: 'PDF' }]
  }
]

export default function ComunicadosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS')
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null)

  const filteredNotices = NOTICES.filter((notice) => {
    const matchesSearch =
      notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notice.summary.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'TODOS' || notice.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#ede9e1]/90 dark:bg-slate-900/90 p-5 sm:p-6 rounded-2xl border border-[#cec8bc] dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Megaphone className="w-4 h-4" />
            Cartelera Virtual Oficial
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#262422] dark:text-white tracking-tight">
            Comunicados y Avisos de la Copropiedad
          </h1>
          <p className="text-xs sm:text-sm text-[#7d776f] dark:text-slate-400">
            Mantente al tanto de las resoluciones de asamblea, cronogramas de mantenimiento y
            normativas de convivencia.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#7d776f] dark:text-slate-400 bg-[#dfd9ce]/60 dark:bg-slate-800/60 px-3.5 py-2 rounded-xl border border-[#cec8bc] dark:border-slate-700">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{NOTICES.length} avisos vigentes</span>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros de Categoría */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7d776f]" />
          <input
            type="text"
            placeholder="Buscar por tema, palabra clave o fecha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#ded8cc] dark:bg-slate-800 border border-[#cec8bc] dark:border-slate-700 text-[#262422] dark:text-slate-100 rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-xs"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          {['TODOS', 'ASAMBLEA', 'MANTENIMIENTO', 'NORMATIVA', 'FINANZAS'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-700 text-white font-bold shadow-xs'
                  : 'bg-[#ded8cc] dark:bg-slate-800 text-[#5c5750] dark:text-slate-400 hover:text-[#262422] dark:hover:text-white border border-[#cec8bc] dark:border-slate-700'
              }`}
            >
              {cat === 'TODOS' ? 'Todos los Avisos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Comunicados (Cards) */}
      <div className="space-y-4">
        {filteredNotices.map((notice) => {
          const isAssembly = notice.category === 'ASAMBLEA'
          const isHighPriority = notice.priority === 'ALTA'

          return (
            <div
              key={notice.id}
              onClick={() => setActiveNotice(notice)}
              className={`bg-[#ede9e1]/90 dark:bg-slate-900/90 p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md hover:border-emerald-600/40 dark:hover:border-emerald-500/40 relative overflow-hidden ${
                notice.isPinned
                  ? 'border-emerald-600/50 bg-[#e7e1d5]/90 dark:bg-slate-900 ring-1 ring-emerald-600/20'
                  : 'border-[#cec8bc] dark:border-slate-800'
              }`}
            >
              {notice.isPinned && (
                <div className="absolute top-0 right-0 bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-bl-xl flex items-center gap-1 shadow-xs">
                  <Pin className="w-3 h-3" />
                  Fijado
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isHighPriority
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                      }`}
                    >
                      Prioridad {notice.priority}
                    </span>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ded8cc] dark:bg-slate-800 text-[#5c5750] dark:text-slate-300">
                      {notice.category}
                    </span>

                    <span className="text-[11px] text-[#7d776f] dark:text-slate-400 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {notice.date}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-[#262422] dark:text-white leading-snug">
                    {notice.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#5c5750] dark:text-slate-300 leading-relaxed">
                    {notice.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-[#7d776f] dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      {notice.author}
                    </span>

                    {notice.attachments && notice.attachments.length > 0 && (
                      <span className="flex items-center gap-1 font-semibold text-emerald-800 dark:text-emerald-400">
                        <FileText className="w-3.5 h-3.5" />
                        {notice.attachments.length} archivo(s) adjunto(s)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ded8cc] dark:bg-slate-800 text-[#262422] dark:text-white text-xs font-bold hover:bg-emerald-700 hover:text-white dark:hover:bg-emerald-600 transition-all shadow-xs"
                  >
                    <span>Leer Completo</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal: Vista Completa del Comunicado */}
      {activeNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#ede9e1] dark:bg-slate-900 border border-[#cec8bc] dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col justify-between">
            <div className="space-y-3 overflow-y-auto pr-1">
              <div className="flex items-center justify-between border-b border-[#cec8bc] dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                    {activeNotice.category}
                  </span>
                  <span className="text-xs text-[#7d776f] dark:text-slate-400 font-mono">
                    {activeNotice.date}
                  </span>
                </div>
                <button
                  onClick={() => setActiveNotice(null)}
                  className="text-[#7d776f] hover:text-[#262422] dark:hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-[#262422] dark:text-white leading-tight">
                {activeNotice.title}
              </h2>

              <div className="text-xs text-[#7d776f] dark:text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  Emitido formalmente por:{' '}
                  <span className="font-bold text-[#262422] dark:text-white">
                    {activeNotice.author}
                  </span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-950/70 border border-[#cec8bc] dark:border-slate-800 text-xs sm:text-sm text-[#262422] dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans shadow-inner">
                {activeNotice.fullContent}
              </div>

              {activeNotice.attachments && activeNotice.attachments.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-bold text-[#5c5750] dark:text-slate-300">
                    Documentos Oficiales Adjuntos:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeNotice.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        onClick={() => alert(`Descargando archivo: ${att.name}`)}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#ded8cc]/70 dark:bg-slate-800/70 border border-[#cec8bc] dark:border-slate-700 hover:border-emerald-600 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                          <div className="truncate">
                            <div className="text-xs font-bold text-[#262422] dark:text-white truncate">
                              {att.name}
                            </div>
                            <div className="text-[10px] text-[#7d776f] dark:text-slate-400">
                              {att.size}
                            </div>
                          </div>
                        </div>
                        <Download className="w-4 h-4 text-[#7d776f] shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#cec8bc] dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveNotice(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-md active:scale-95"
              >
                Entendido y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
