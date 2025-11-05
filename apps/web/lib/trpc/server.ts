import { initTRPC, TRPCError } from '@trpc/server';
import { PrismaClient } from '@prisma/client';
import superjson from 'superjson';

const prisma = new PrismaClient();

export interface Context {
  prisma: PrismaClient;
  userId?: string;
  orgId?: string;
}

export const createContext = async (): Promise<Context> => {
  // TODO: Get userId and orgId from session
  return {
    prisma,
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
