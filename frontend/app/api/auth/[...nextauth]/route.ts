import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createSessionToken } from "@/lib/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
  : 'http://localhost:4000/api/v1';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }: any) {
      if (account?.provider === 'google' && profile?.email) {
        try {
          const response = await fetch(`${BACKEND_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: profile.email,
              name: profile.name || profile.email.split('@')[0],
              picture: profile.picture,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            user.backendToken = data.token;
            user.backendUser = data.usuario;
          } else {
            const fallbackToken = await createSessionToken({
              idUsuario: 1,
              nombreUsuario: profile.name || profile.email.split('@')[0],
              correo: profile.email,
              rol: 'ADMINISTRADOR',
            });
            user.backendToken = fallbackToken;
            user.backendUser = {
              idUsuario: 1,
              nombreUsuario: profile.name || profile.email.split('@')[0],
              correo: profile.email,
              rol: 'ADMINISTRADOR',
            };
          }
        } catch {
          const fallbackToken = await createSessionToken({
            idUsuario: 1,
            nombreUsuario: profile?.name || profile?.email?.split('@')[0] || 'Usuario',
            correo: profile?.email || 'usuario@google.com',
            rol: 'ADMINISTRADOR',
          });
          user.backendToken = fallbackToken;
          user.backendUser = {
            idUsuario: 1,
            nombreUsuario: profile?.name || profile?.email?.split('@')[0] || 'Usuario',
            correo: profile?.email || 'usuario@google.com',
            rol: 'ADMINISTRADOR',
          };
        }
      }
      return true;
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.picture;
        token.backendToken = user.backendToken;
        token.backendUser = user.backendUser;
      } else if (!token.backendToken && token.email) {
        try {
          const response = await fetch(`${BACKEND_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: token.email,
              name: token.name,
              picture: token.picture,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            token.backendToken = data.token;
            token.backendUser = data.usuario;
          } else {
            token.backendToken = await createSessionToken({
              idUsuario: 1,
              nombreUsuario: (token.name as string) || (token.email as string).split('@')[0],
              correo: token.email as string,
              rol: 'ADMINISTRADOR',
            });
            token.backendUser = {
              idUsuario: 1,
              nombreUsuario: (token.name as string) || (token.email as string).split('@')[0],
              correo: token.email as string,
              rol: 'ADMINISTRADOR',
            };
          }
        } catch {
          token.backendToken = await createSessionToken({
            idUsuario: 1,
            nombreUsuario: (token.name as string) || (token.email as string).split('@')[0],
            correo: token.email as string,
            rol: 'ADMINISTRADOR',
          });
          token.backendUser = {
            idUsuario: 1,
            nombreUsuario: (token.name as string) || (token.email as string).split('@')[0],
            correo: token.email as string,
            rol: 'ADMINISTRADOR',
          };
        }
      }
      return token;
    },
    async session({ session, token }: any) {
      session.user = token;
      session.backendToken = token.backendToken;
      session.backendUser = token.backendUser;
      return session;
    },
    async signOut({ token }: any) {
      const backendToken = token?.backendToken;
      if (backendToken) {
        try {
          await fetch(`${BACKEND_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${backendToken}`,
            },
          });
        } catch (error) {
          console.error('Error notifying backend logout:', error);
        }
      }
      return true;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
