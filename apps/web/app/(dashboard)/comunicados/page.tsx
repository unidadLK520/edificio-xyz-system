import React from 'react';
import { prisma } from '@edificio-xyz/database';
import { formatDate } from '@/lib/utils';
import { Megaphone, Send, Bell, PlusCircle, CheckCircle2 } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

async function crearComunicadoAction(formData: FormData) {
  'use server';
  const titulo = formData.get('titulo') as string;
  const contenido = formData.get('contenido') as string;
  const canalEnvio = formData.get('canalEnvio') as string;
  const session = await getSession();

  if (!titulo || !contenido) return;

  await prisma.comunicado.create({
    data: {
      titulo,
      contenido,
      canalEnvio: canalEnvio || 'Ambos',
      idUsuarioCreador: session?.idUsuario,
    },
  });

  revalidatePath('/comunicados');
  revalidatePath('/');
}

export default async function ComunicadosPage() {
  const comunicados = await prisma.comunicado.findMany({
    include: {
      usuarioCreador: true,
      envios: true,
    },
    orderBy: { fechaPublicacion: 'desc' },
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Megaphone className="w-6 h-6 text-pink-400" />
            Comunicados y Avisos a Copropietarios
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Publicación digital de avisos, mantenimiento programado y asambleas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Publicar Form */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-400" />
            Emitir Nuevo Aviso
          </h2>
          <p className="text-xs text-slate-400 mb-5">
            Notifica a los residentes por los canales seleccionados.
          </p>

          <form action={crearComunicadoAction} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Título del Comunicado
              </label>
              <input
                type="text"
                name="titulo"
                required
                placeholder="Ej. Mantenimiento del tanque de agua"
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Canal de Notificación
              </label>
              <select
                name="canalEnvio"
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Ambos">Ambos (Correo y WhatsApp)</option>
                <option value="Correo">Correo Electrónico</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Solo sistema">Solo en Portal Web</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mensaje Detallado
              </label>
              <textarea
                name="contenido"
                required
                rows={4}
                placeholder="Escribe el cuerpo del mensaje para los copropietarios..."
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/25 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Publicar Comunicado
            </button>
          </form>
        </div>

        {/* Listado de Comunicados */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            Historial de Publicaciones ({comunicados.length})
          </h2>

          {comunicados.length === 0 ? (
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center text-slate-500 text-sm">
              No hay comunicados publicados en el edificio.
            </div>
          ) : (
            comunicados.map((c) => (
              <div
                key={c.idComunicado}
                className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-md hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-950 text-pink-300 border border-pink-800/50">
                    {c.canalEnvio || 'Sistema'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDate(c.fechaPublicacion)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">
                  {c.titulo}
                </h3>
                <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                  {c.contenido}
                </p>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Publicado por: {c.usuarioCreador?.nombreUsuario || 'Administración'}</span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Transmitido
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
