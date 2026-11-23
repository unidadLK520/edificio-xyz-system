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
    // Check if there's a NextAuth session with backend token
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const session = await response.json();
          console.log('[BackendTokenHandler] Session data:', session);

          if (session?.backendToken) {
            // Set the auth_token cookie for backend API calls
            console.log('[BackendTokenHandler] Setting auth_token cookie');
            document.cookie = `auth_token=${session.backendToken}; path=/; max-age=28800; samesite=lax`;
          } else if (session?.user?.email) {
            // Check if we already have an auth_token cookie (maybe from a previous session)
            const existingToken = document.cookie
              .split('; ')
              .find(row => row.startsWith('auth_token='));

            if (existingToken) {
              console.log('[BackendTokenHandler] Already have auth_token cookie, skipping sync');
              return;
            }

            // If we have a NextAuth session but no backend token, sync with backend
            console.log('[BackendTokenHandler] Syncing with backend for:', session.user.email);
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
                console.log('[BackendTokenHandler] Backend sync successful');
                document.cookie = `auth_token=${data.token}; path=/; max-age=28800; samesite=lax`;
              } else {
                const errorData = await backendResponse.json().catch(() => ({}));
                console.error('[BackendTokenHandler] Backend sync failed:', backendResponse.status, errorData);
                // If 401, it means user already has active session - try to refresh by re-login
                if (backendResponse.status === 401) {
                  console.log('[BackendTokenHandler] User has active session, will use NextAuth session only');
                }
              }
            } catch (error) {
              console.error('[BackendTokenHandler] Error syncing with backend:', error);
            }
          } else {
            console.log('[BackendTokenHandler] No NextAuth session');
          }
        }
      } catch (error) {
        console.error('[BackendTokenHandler] Error checking session:', error);
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
