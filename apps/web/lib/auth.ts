// Minimal Auth.js wiring placeholder.
// You can add providers (e.g., GitHub/Google) or Credentials here.
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Demo',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials, request) => {
        if (!credentials?.email) return null;
        // TODO: validate against DB
        return { id: 'demo', email: credentials.email as string };
      },
    }),
  ],
  session: { strategy: 'jwt' },
});