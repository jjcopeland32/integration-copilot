import NextAuth, { DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import type { Role } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user?: DefaultSession['user'] & {
      id?: string;
      role?: Role;
      orgId?: string;
    };
  }

  interface User {
    role?: Role;
    orgId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: Role;
    orgId?: string;
  }
}
