'use client'

import { SessionProvider } from "next-auth/react";
import { FechaSistemaProvider } from '@/context/FechaSistemaContext';
import { useEffect } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
  : 'http://localhost:4000/api/v1';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <BackendTokenHandler />
      <FechaSistemaProvider>{children}</FechaSistemaProvider>
    </SessionProvider>
  );
}

function BackendTokenHandler() {
  useEffect(() => {
    let syncFailed = false; // Flag to stop retrying if sync fails

    // Check if there's a NextAuth session with backend token
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const session = await response.json();

          if (session?.backendToken) {
            document.cookie = `auth_token=${session.backendToken}; path=/; max-age=28800; samesite=lax`;
            if (typeof window !== 'undefined') {
              localStorage.setItem('auth_token', session.backendToken);
              const rol = session.backendUser?.rol || 'ADMINISTRADOR';
              localStorage.setItem('user_role', rol);
              localStorage.setItem(
                'user_profile',
                JSON.stringify({
                  email: session.user?.email || 'usuario@google.com',
                  nombre: session.backendUser?.nombreUsuario || session.user?.name || 'Usuario',
                  rolActivo: rol
                })
              );
            }
            syncFailed = false;
          } else if (session?.user?.email && !syncFailed) {
            // Check if we already have an auth_token cookie (maybe from a previous session)
            const existingToken = document.cookie
              .split('; ')
              .find(row => row.startsWith('auth_token='));

            if (existingToken) {
              return;
            }

            // If we have a NextAuth session but no backend token, sync with backend
            try {
              const backendResponse = await fetch(`${BACKEND_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: session.user.email,
                  name: session.user.name,
                  picture: session.user.image,
                }),
              });

              if (backendResponse.ok) {
                const data = await backendResponse.json();
                document.cookie = `auth_token=${data.token}; path=/; max-age=28800; samesite=lax`;
                syncFailed = false;
              } else if (backendResponse.status === 401) {
                // 401 means user already has active session - stop retrying
                syncFailed = true;
              }
            } catch (error) {
              // Silently fail - will retry on next check unless 401
            }
          }
        }
      } catch (error) {
        // Silently fail
      }
    };

    checkSession();
    // Check session more frequently initially (every 2 seconds for first 30 seconds)
    const quickInterval = setInterval(checkSession, 2000);
    setTimeout(() => clearInterval(quickInterval), 30000);

    // Then check periodically (every 30 seconds)
    const interval = setInterval(checkSession, 30000);
    return () => {
      clearInterval(quickInterval);
      clearInterval(interval);
    };
  }, []);

  return null;
}
