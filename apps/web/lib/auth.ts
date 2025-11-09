// Minimal Auth.js wiring placeholder.
// You can add providers (e.g., GitHub/Google) or Credentials here.
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { Role } from '@prisma/client';

const demoUser = {
  id: process.env.DEMO_USER_ID ?? 'user_demo',
  email: process.env.DEMO_USER_EMAIL ?? 'demo@integration.local',
  name: process.env.DEMO_USER_NAME ?? 'Demo Integrator',
  orgId: process.env.DEMO_ORG_ID ?? 'org_demo',
  role: (process.env.DEMO_USER_ROLE as Role) ?? 'OWNER',
  password: process.env.DEMO_USER_PASSWORD ?? 'demo123',
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'Demo',
      credentials: {
        email: { label: 'Email', type: 'email', value: demoUser.email },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const email = String(credentials.email).toLowerCase();
        if (email !== demoUser.email.toLowerCase()) {
          return null;
        }

        if (credentials.password !== demoUser.password) {
          return null;
        }

        return {
          id: demoUser.id,
          email: demoUser.email,
          name: demoUser.name,
          role: demoUser.role,
          orgId: demoUser.orgId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.orgId = (user as any).orgId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id;
        session.user.role = token.role as Role | undefined;
        session.user.orgId = token.orgId as string | undefined;
      }
      return session;
    },
  },
});
