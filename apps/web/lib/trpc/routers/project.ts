import { router, protectedProcedure } from '../server';
import { z } from 'zod';
import { createOrchestrator } from '@integration-copilot/orchestrator';

export const projectRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        name: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const orchestrator = createOrchestrator(ctx.prisma);
      return orchestrator.createProject({
        ...input,
        userId: ctx.userId!,
      });
    }),

  list: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      return ctx.prisma.project.findMany({
        where: { orgId: input.orgId },
        orderBy: { createdAt: 'desc' },
        include: {
          specs: { take: 1, orderBy: { createdAt: 'desc' } },
          _count: {
            select: {
              specs: true,
              suites: true,
              traces: true,
            },
          },
        },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.prisma.project.findUnique({
        where: { id: input.id },
        include: {
          specs: { orderBy: { createdAt: 'desc' } },
          suites: { orderBy: { createdAt: 'desc' } },
          mocks: { orderBy: { createdAt: 'desc' } },
          planItems: { orderBy: { createdAt: 'asc' } },
          reports: { orderBy: { createdAt: 'desc' } },
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return ctx.prisma.project.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.project.delete({
        where: { id: input.id },
      });
    }),
});
