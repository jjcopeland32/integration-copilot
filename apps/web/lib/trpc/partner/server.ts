import { initTRPC, TRPCError } from '@trpc/server';
import type { PrismaClient } from '@prisma/client';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import superjson from 'superjson';
import { prisma } from '../../prisma';
import {
  getPartnerSessionTokenFromHeaders,
  loadPartnerSession,
  type PartnerSessionWithRelations,
} from '../../partner/session';

export interface PartnerContext {
  prisma: PrismaClient;
  session?: PartnerSessionWithRelations;
}

export const createPartnerContext = async ({
  req,
}: FetchCreateContextFnOptions): Promise<PartnerContext> => {
  const token = getPartnerSessionTokenFromHeaders(req.headers);
  const session = token ? await loadPartnerSession(token) : null;
  return {
    prisma,
    session: session ?? undefined,
  };
};

const t = initTRPC.context<PartnerContext>().create({
  transformer: superjson,
});

export const createPartnerRouter = t.router;
export const partnerPublicProcedure = t.procedure;

const requireSession = t.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const partnerProtectedProcedure = t.procedure.use(requireSession);
