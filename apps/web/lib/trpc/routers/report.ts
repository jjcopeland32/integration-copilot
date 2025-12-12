import { router, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  PLAN_PHASES,
  createReportGenerator,
  normalizePhaseConfig,
  type ReadinessReport,
} from '@integration-copilot/orchestrator';
import { Prisma } from '@prisma/client';

function parseMeta(meta: unknown): ReadinessReport | null {
  if (!meta || typeof meta !== 'object') {
    return null;
  }
  return meta as ReadinessReport;
}

function normalizeRisk(meta: ReadinessReport | null | undefined): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN' {
  if (!meta) return 'UNKNOWN';
  const severities = meta.risks?.map((risk) => risk.severity.toUpperCase()) ?? [];
  if (severities.includes('CRITICAL')) return 'CRITICAL';
  if (severities.includes('HIGH')) return 'HIGH';
  if (severities.includes('MEDIUM')) return 'MEDIUM';
  if (severities.includes('LOW')) return 'LOW';
  return meta.readyForProduction ? 'LOW' : 'MEDIUM';
}

function deriveStatus(meta: ReadinessReport | null, signedAt?: Date | null) {
  if (signedAt) return 'SIGNED';
  if (meta?.readyForProduction) return 'READY';
  return 'DRAFT';
}

export const reportRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify project belongs to user's org
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.projectId, orgId: ctx.orgId },
      });
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found or access denied',
        });
      }

      const generator = createReportGenerator(ctx.prisma);
      const phaseConfig = normalizePhaseConfig(project.phaseConfig);
      let reports = await ctx.prisma.report.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: 'desc' },
      });

      if (reports.length === 0) {
        const readiness = await generator.generateReadinessReport(input.projectId);
        await generator.saveReport(input.projectId, readiness);
        reports = await ctx.prisma.report.findMany({
          where: { projectId: input.projectId },
          orderBy: { createdAt: 'desc' },
        });
      }

      // Refresh metrics so recent test runs/traces are reflected in the list view
      const refreshedReports = await Promise.all(
        reports.map(async (report) => {
          const readiness = await generator.generateReadinessReport(input.projectId);
          const updated = await ctx.prisma.report.update({
            where: { id: report.id },
            data: { meta: readiness as Prisma.InputJsonValue },
          });
          return { ...updated, meta: readiness };
        })
      );

      const phaseSummariesBase = PLAN_PHASES.map((phase) => {
        const settings = phaseConfig[phase.key];
        return {
          key: phase.key,
          title: phase.title,
          optional: !!phase.optional,
          enabled: settings.enabled,
          notes: settings.notes ?? null,
          scenarios: settings.uatScenarios ?? [],
          performanceBenchmark: settings.performanceBenchmark ?? null,
        };
      });

      return refreshedReports.map((report) => {
        const meta = parseMeta(report.meta);
        const metrics = meta?.metrics;
        const testsPassed = metrics?.passedTests ?? 0;
        const testsTotal = metrics?.totalTests ?? 0;
        const phaseCompletion = metrics?.phaseCompletion ?? {};
        const phaseValues = Object.values(phaseCompletion);
        const planCompletion =
          phaseValues.length > 0
            ? Math.round(phaseValues.reduce((sum, value) => sum + value, 0) / phaseValues.length)
            : 0;
        const phaseSummaries = phaseSummariesBase.map((phase) => ({
          ...phase,
          completion: phase.enabled ? phaseCompletion[phase.key] ?? 0 : null,
        }));

        return {
          id: report.id,
          projectId: report.projectId,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
          readyForProduction: meta?.readyForProduction ?? false,
          status: deriveStatus(meta, report.signedAt),
          score: meta?.metrics?.testPassRate ?? 0,
          risk: normalizeRisk(meta),
          signedAt: report.signedAt,
          testsPassed,
          testsTotal,
          planCompletion,
          phaseCompletion,
          phaseConfig,
          phaseSummaries,
        };
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const generator = createReportGenerator(ctx.prisma);
      
      // Verify report belongs to user's org via its project
      const report = await ctx.prisma.report.findFirst({
        where: { id: input.id },
        include: { project: true },
      });

      if (!report || report.project.orgId !== ctx.orgId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Report not found or access denied',
        });
      }

      let meta = parseMeta(report.meta);
      if (!meta) {
        meta = await generator.generateReadinessReport(report.projectId);
        await ctx.prisma.report.update({
          where: { id: report.id },
          data: { meta: meta as unknown as Prisma.InputJsonValue },
        });
      }

      const phaseConfig = normalizePhaseConfig(report.project.phaseConfig);
      const phaseSummaries = PLAN_PHASES.map((phase) => {
        const settings = phaseConfig[phase.key];
        return {
          key: phase.key,
          title: phase.title,
          optional: !!phase.optional,
          enabled: settings.enabled,
          notes: settings.notes ?? null,
          scenarios: settings.uatScenarios ?? [],
          performanceBenchmark: settings.performanceBenchmark ?? null,
          completion: settings.enabled ? meta.metrics?.phaseCompletion?.[phase.key] ?? 0 : null,
        };
      });
      const markdown = generator.generateMarkdown(meta);

      return {
        id: report.id,
        projectId: report.projectId,
        projectName: report.project.name,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        status: deriveStatus(meta, report.signedAt),
        risk: normalizeRisk(meta),
        markdown,
        readyForProduction: meta.readyForProduction,
        metrics: meta.metrics,
        risks: meta.risks,
        recommendations: meta.recommendations,
        signedAt: report.signedAt,
        signedBy: (meta as any)?.signedBy,
        phaseConfig,
        phaseSummaries,
      };
    }),
});
