import { router, protectedProcedure } from '../server';
import { z } from 'zod';
import { createMockGenerator, createGoldenTestGenerator } from '@integration-copilot/mockgen';

const mockGen = createMockGenerator();
const testGen = createGoldenTestGenerator();

export const mockRouter = router({
  generate: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        specId: z.string(),
        baseUrl: z.string(),
        enableLatency: z.boolean().optional(),
        latencyMs: z.number().optional(),
        enableRateLimit: z.boolean().optional(),
        rateLimit: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const spec = await ctx.prisma.spec.findUnique({
        where: { id: input.specId },
      });

      if (!spec) {
        throw new Error('Spec not found');
      }

      const { routes, postmanCollection } = mockGen.generate(spec.normalized as any, {
        baseUrl: input.baseUrl,
        enableLatency: input.enableLatency,
        latencyMs: input.latencyMs,
        enableRateLimit: input.enableRateLimit,
        rateLimit: input.rateLimit,
      });

      const mockInstance = await ctx.prisma.mockInstance.create({
        data: {
          projectId: input.projectId,
          baseUrl: input.baseUrl,
          config: {
            enableLatency: input.enableLatency,
            latencyMs: input.latencyMs,
            enableRateLimit: input.enableRateLimit,
            rateLimit: input.rateLimit,
          } as any,
          status: 'RUNNING',
        },
      });

      return {
        mockInstance,
        routeCount: routes.length,
        postmanCollection,
      };
    }),

  generateTests: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        specId: z.string(),
        baseUrl: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const spec = await ctx.prisma.spec.findUnique({
        where: { id: input.specId },
      });

      if (!spec) {
        throw new Error('Spec not found');
      }

      const tests = testGen.generate(spec.normalized as any, input.baseUrl);

      const suite = await ctx.prisma.testSuite.create({
        data: {
          projectId: input.projectId,
          name: 'Golden Test Suite',
          version: '1.0',
          cases: tests as any,
        },
      });

      return { suite, testCount: tests.length };
    }),

  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.prisma.mockInstance.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: 'desc' },
      });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['RUNNING', 'STOPPED']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.mockInstance.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),
});
