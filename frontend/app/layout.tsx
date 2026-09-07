// frontend/app/layout.tsx
// Layout raíz de la aplicación web

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Edificio XYZ - Sistema de Administración Integral',
  description:
    'Plataforma integral de gestión de copropietarios, expensas, finanzas y mantenimiento para el Edificio XYZ.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 antialiased text-slate-900 selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
