import { router, publicProcedure } from '../server';
import { z } from 'zod';
import { ensureDemoWorkspace } from '../../workspace';
import {
  createPlanBoardManager,
  PLAN_PHASES,
  normalizePhaseConfig,
} from '@integration-copilot/orchestrator';

const scenarioSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().max(500).optional(),
});

const performanceSchema = z
  .object({
    targetLatencyMs: z.number().min(0).max(60000).optional(),
    maxErrorRatePercent: z.number().min(0).max(100).optional(),
    targetSuccessRatePercent: z.number().min(0).max(100).optional(),
  })
  .partial();

const phaseSettingsSchema = z.object({
  enabled: z.boolean(),
  notes: z.string().max(500).nullable().optional(),
  uatScenarios: z.array(scenarioSchema).optional(),
  performanceBenchmark: performanceSchema.nullable().optional(),
});

const phaseConfigSchema = z.object(
  PLAN_PHASES.reduce(
    (acc, phase) => {
      acc[phase.key] = phaseSettingsSchema;
      return acc;
    },
    {} as Record<string, typeof phaseSettingsSchema>
  )
);

const projectInclude = {
  specs: true,
  mocks: true,
  suites: { include: { runs: { orderBy: { createdAt: 'desc' } } } },
  planItems: true,
  reports: true,
  traces: true,
} as const;

function mapProject(project: any) {
  return {
    ...project,
    tests: project.suites ?? [],
    planItems: project.planItems ?? [],
    reports: project.reports ?? [],
    phaseConfig: normalizePhaseConfig(project.phaseConfig),
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
        include: projectInclude,
        orderBy: { createdAt: 'desc' },
      });

      return projects.map(mapProject);
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.id },
        include: projectInclude,
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
      const defaultConfig = normalizePhaseConfig(undefined);

      const project = await ctx.prisma.project.create({
        data: {
          orgId: org.id,
          name: input.name,
          status: input.status ?? 'DRAFT',
          phaseConfig: defaultConfig,
        },
        include: projectInclude,
      });
      return mapProject(project);
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
      const updated = await ctx.prisma.project.update({
        where: { id },
        data: updates,
        include: projectInclude,
      });
      return mapProject(updated);
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(async (tx) => {
        const suites = await tx.testSuite.findMany({
          where: { projectId: input.id },
          select: { id: true },
        });
        const suiteIds = suites.map((suite) => suite.id);

        if (suiteIds.length > 0) {
          await tx.testRun.deleteMany({
            where: { suiteId: { in: suiteIds } },
          });
        }

        await tx.testSuite.deleteMany({
          where: { id: { in: suiteIds } },
        });
        await tx.mockInstance.deleteMany({
          where: { projectId: input.id },
        });
        await tx.planItem.deleteMany({
          where: { projectId: input.id },
        });
        await tx.report.deleteMany({
          where: { projectId: input.id },
        });
        await tx.trace.deleteMany({
          where: { projectId: input.id },
        });
        await tx.blueprint.deleteMany({
          where: { projectId: input.id },
        });
        await tx.spec.deleteMany({
          where: { projectId: input.id },
        });
        await tx.project.delete({
          where: { id: input.id },
        });
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

  configurePhases: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        config: phaseConfigSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const normalized = normalizePhaseConfig(input.config);
      const project = await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { phaseConfig: normalized },
        include: projectInclude,
      });
      const planBoard = createPlanBoardManager(ctx.prisma);
      await planBoard.initializeProjectPlan(project.id, normalized);
      return mapProject(project);
    }),
});
