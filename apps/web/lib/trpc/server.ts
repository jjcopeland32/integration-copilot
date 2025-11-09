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

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
