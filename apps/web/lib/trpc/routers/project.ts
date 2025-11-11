import { router, publicProcedure } from '../server';
import { z } from 'zod';
import { ensureDemoWorkspace } from '../../workspace';

function mapProject(project: any) {
  return {
    ...project,
    tests: project.suites ?? [],
    planItems: project.planItems ?? [],
    reports: project.reports ?? [],
    _count: {
      specs: project.specs?.length ?? 0,
      suites: project.suites?.length ?? 0,
      traces: project.traces?.length ?? 0,
    },
  };
}

export const projectRouter = router({
  list: publicProcedure
    .input(z.object({ orgId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const { org } = await ensureDemoWorkspace(ctx.prisma, {
        userId: ctx.userId,
        orgId: input?.orgId ?? ctx.orgId,
      });

      const orgIds = input?.orgId ? [input.orgId] : [org.id];
      const projects = await ctx.prisma.project.findMany({
        where: { orgId: { in: orgIds } },
        include: {
          specs: true,
          mocks: true,
          suites: { include: { runs: { orderBy: { createdAt: 'desc' } } } },
          planItems: true,
          reports: true,
          traces: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return projects.map(mapProject);
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.id },
        include: {
          specs: true,
          mocks: true,
          suites: { include: { runs: { orderBy: { createdAt: 'desc' } } } },
          planItems: true,
          reports: true,
          traces: true,
        },
      });
      if (!project) return null;
      return mapProject(project);
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        orgId: z.string().optional(),
        status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { org } = await ensureDemoWorkspace(ctx.prisma, {
        userId: ctx.userId,
        orgId: input.orgId ?? ctx.orgId,
      });

      return ctx.prisma.project.create({
        data: {
          orgId: org.id,
          name: input.name,
          status: input.status ?? 'DRAFT',
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return ctx.prisma.project.update({
        where: { id },
        data: updates,
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.project.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),

  stats: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.id },
        include: {
          specs: true,
          mocks: true,
          suites: { include: { runs: true } },
        },
      });
      if (!project) {
        return {
          specsCount: 0,
          mocksCount: 0,
          runningMocksCount: 0,
          testsCount: 0,
          totalTests: 0,
          passedTests: 0,
          testPassRate: 0,
        };
      }

      const runningMocks = project.mocks.filter((m) => m.status === 'RUNNING').length;
      const totalTests = project.suites.reduce((sum, suite) => {
        const caseValue = suite.cases as unknown;
        const caseList = Array.isArray(caseValue) ? (caseValue as unknown[]) : [];
        return sum + caseList.length;
      }, 0);
      const passedTests = project.suites.reduce((sum, suite) => {
        const latestRun = suite.runs[0] as { results?: Record<string, any> } | undefined;
        const passedValue = latestRun?.results?.passed;
        const passed = typeof passedValue === 'number' ? passedValue : 0;
        return sum + passed;
      }, 0);

      return {
        specsCount: project.specs.length,
        mocksCount: project.mocks.length,
        runningMocksCount: runningMocks,
        testsCount: project.suites.length,
        totalTests,
        passedTests,
        testPassRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
      };
    }),
});
