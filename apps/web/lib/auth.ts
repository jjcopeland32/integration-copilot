import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import { prisma } from './prisma';
import { ensureDemoWorkspace } from './workspace';

type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  orgId: string;
  role: Role;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const demoDefaults = {
  email: process.env.DEMO_USER_EMAIL ?? 'demo@integration.local',
  password: process.env.DEMO_USER_PASSWORD ?? 'demo123',
  name: process.env.DEMO_USER_NAME ?? 'Demo Integrator',
  orgId: process.env.DEMO_ORG_ID ?? 'org_demo',
  orgName: process.env.DEMO_ORG_NAME ?? 'Demo Integration Org',
  role: (process.env.DEMO_USER_ROLE as Role) ?? 'OWNER',
};

async function ensureUserMembership(userId: string, orgId?: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId, orgId: orgId ?? undefined },
    orderBy: { createdAt: 'asc' },
  });
  if (membership) return membership;

  // If caller passed an orgId, attach there; otherwise create a personal org
  let targetOrgId = orgId;
  if (!targetOrgId) {
    const org = await prisma.organization.create({
      data: {
        name: 'My Organization',
      },
    });
    targetOrgId = org.id;
  }

  return prisma.membership.create({
    data: {
      userId,
      orgId: targetOrgId,
      role: 'OWNER',
    },
  });
}

async function authorizeUser(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const normalizedEmail = normalizeEmail(email);
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      memberships: true,
    },
  });

  if (!user) {
    // Create a new user and org, defaulting to OWNER
    const passwordHash = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0],
        passwordHash,
        memberships: {
          create: {
            role: 'OWNER',
            org: {
              create: {
                name: `${normalizedEmail.split('@')[0]}'s Org`,
              },
            },
          },
        },
      },
      include: { memberships: true },
    });
  }

  if (!user.passwordHash) {
    const passwordHash = await bcrypt.hash(password, 10);
    user = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
      include: { memberships: true },
    });
  } else {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
  }

  // Prefer the first membership; if none, create one
  const existingMembership = user.memberships?.[0];
  const membership = existingMembership || (await ensureUserMembership(user.id, undefined));

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    orgId: membership.orgId,
    role: membership.role as Role,
  };
}

async function authorizeDemo(email: string, password: string): Promise<AuthUser | null> {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail !== normalizeEmail(demoDefaults.email)) return null;
  if (password !== demoDefaults.password) return null;

  const workspace = await ensureDemoWorkspace(prisma, {
    userId: undefined,
    orgId: demoDefaults.orgId,
  });

  return {
    id: workspace.user.id,
    email: workspace.user.email,
    name: workspace.user.name,
    orgId: workspace.org.id,
    role: demoDefaults.role,
  } as AuthUser;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials.password) {
          return null;
        }
        const email = String(credentials.email);
        const password = String(credentials.password);

        // Prefer real user auth; fall back to demo if it matches the demo email
        const user =
          (await authorizeUser(email, password)) ?? (await authorizeDemo(email, password));
        return user;
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
