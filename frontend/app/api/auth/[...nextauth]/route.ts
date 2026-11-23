import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('signIn callback triggered', { account, profile });
      if (account?.provider === 'google' && profile?.email) {
        try {
          console.log('Calling backend with:', { email: profile.email, name: profile.name });
          // Sync with backend to get JWT token
          const response = await fetch(`${BACKEND_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: profile.email,
              name: profile.name,
              picture: profile.picture,
            }),
          });

          console.log('Backend response status:', response.status);
          const data = await response.json();
          console.log('Backend response data:', data);

          if (response.ok) {
            // Store backend token in user object
            user.backendToken = data.token;
            user.backendUser = data.usuario;
            console.log('Backend auth successful');
            return true;
          } else {
            console.error('Backend auth error:', data.message);
            // Allow sign in even if backend sync fails (for now)
            return true;
          }
        } catch (error) {
          console.error('Error syncing with backend:', error);
          // Allow sign in even if backend sync fails (for now)
          return true;
        }
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      console.log('[JWT callback] Triggered', { hasUser: !!user, hasToken: !!token.backendToken });
      if (user) {
        console.log('[JWT callback] Creating new token from user');
        token.email = user.email;
        token.name = user.name;
        token.picture = user.picture;
        token.backendToken = user.backendToken;
        token.backendUser = user.backendUser;
        console.log('[JWT callback] Backend token stored:', !!token.backendToken);
      } else if (!token.backendToken && token.email) {
        // If no backend token but we have email, sync with backend
        console.log('[JWT callback] No backend token, syncing with backend for:', token.email);
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
            console.log('[JWT callback] Backend sync successful');
          } else {
            console.log('[JWT callback] Backend sync failed, status:', response.status);
          }
        } catch (error) {
          console.error('[JWT callback] Error syncing with backend:', error);
        }
      } else {
        console.log('[JWT callback] Reusing existing token');
      }
      return token;
    },
    async session({ session, token }) {
      // @ts-ignore
      session.user = token;
      // @ts-ignore
      session.backendToken = token.backendToken;
      // @ts-ignore
      session.backendUser = token.backendUser;
      return session;
    },
    async signOut({ token }) {
      // When signing out from NextAuth, also notify backend
      const backendToken = token.backendToken;
      if (backendToken) {
        try {
          await fetch(`${BACKEND_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${backendToken}`,
            },
          });
          console.log('Backend logout successful');
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
