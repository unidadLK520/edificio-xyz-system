// frontend/app/layout.tsx
// Layout raíz de la aplicación web

import LogoutHandler from './components/LogoutHandler';
import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

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
    <html lang="es" className="dark" suppressHydrationWarning>
      {/* Cliente que realiza logout al cerrar la página */}
      {/* <LogoutHandler /> */}

      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const savedTheme = localStorage.getItem('theme');
                if (savedTheme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>

      <body className="min-h-screen bg-[#e6e2da] dark:bg-slate-950 text-[#262422] dark:text-slate-100 antialiased selection:bg-blue-500 selection:text-white transition-colors duration-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
