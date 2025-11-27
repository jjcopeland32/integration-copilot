import { initTRPC, TRPCError } from '@trpc/server';
import type { PrismaClient } from '@prisma/client';
import superjson from 'superjson';
import { prisma } from '../prisma';
import { auth } from '../auth';

export interface Context {
  prisma: PrismaClient;
  userId?: string;
  orgId?: string;
}

export interface AuthedContext extends Context {
  userId: string;
  orgId: string;
}

export const createContext = async (): Promise<Context> => {
  const session = await auth();
  const userId = session?.user?.id;
  const orgId = session?.user?.orgId;
  return {
    prisma,
    userId: userId ?? undefined,
    orgId: orgId ?? undefined,
  };
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Middleware that requires both userId and orgId to be present.
 * Use this for all client portal procedures that access org-scoped data.
 */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId || !ctx.orgId) {
    throw new TRPCError({ 
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      orgId: ctx.orgId,
    } as AuthedContext,
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
