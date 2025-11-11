import { router, publicProcedure } from '../server';
import { z } from 'zod';
import { createReportGenerator, type ReadinessReport } from '@integration-copilot/orchestrator';

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
  list: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });
      if (!project) {
        throw new Error('Project not found');
      }

      const generator = createReportGenerator(ctx.prisma);
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

      return reports.map((report) => {
        const meta = parseMeta(report.meta);
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
        };
      });
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const generator = createReportGenerator(ctx.prisma);
      const report = await ctx.prisma.report.findUnique({
        where: { id: input.id },
        include: { project: true },
      });

      if (!report) {
        throw new Error('Report not found');
      }

      let meta = parseMeta(report.meta);
      if (!meta) {
        meta = await generator.generateReadinessReport(report.projectId);
        await ctx.prisma.report.update({
          where: { id: report.id },
          data: { meta },
        });
      }

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
      };
    }),
});
