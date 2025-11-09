import { router, publicProcedure } from '../server';
import { z } from 'zod';
import { resolveProject } from '../../workspace';
import { MockStatus } from '@prisma/client';

export const mockRouter = router({
  list: publicProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx.prisma, {
        projectId: input?.projectId,
        userId: ctx.userId,
        orgId: ctx.orgId,
      });

      return ctx.prisma.mockInstance.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: 'desc' },
      });
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.mockInstance.findUnique({
        where: { id: input.id },
      });
    }),

  start: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.mockInstance.update({
        where: { id: input.id },
        data: { status: MockStatus.RUNNING },
      });
    }),

  stop: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.mockInstance.update({
        where: { id: input.id },
        data: { status: MockStatus.STOPPED },
      });
    }),
});
