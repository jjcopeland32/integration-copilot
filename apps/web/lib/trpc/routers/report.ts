import { router, protectedProcedure } from '../server';
import { z } from 'zod';
import { createReportGenerator } from '@integration-copilot/orchestrator';

export const reportRouter = router({
  generate: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const reportGen = createReportGenerator(ctx.prisma);
      const report = await reportGen.generateReadinessReport(input.projectId);
      const markdown = reportGen.generateMarkdown(report);

      const saved = await reportGen.saveReport(
        input.projectId,
        report,
        `/reports/${input.projectId}-${Date.now()}.md`
      );

      return { ...saved, report, markdown };
    }),

  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.prisma.report.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: 'desc' },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const report = await ctx.prisma.report.findUnique({
        where: { id: input.id },
      });

      if (!report) {
        throw new Error('Report not found');
      }

      const reportGen = createReportGenerator(ctx.prisma);
      const markdown = reportGen.generateMarkdown(report.meta as any);

      return { ...report, markdown };
    }),

  sign: protectedProcedure
    .input(
      z.object({
        reportId: z.string(),
        signedBy: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const reportGen = createReportGenerator(ctx.prisma);
      return reportGen.signReport(input.reportId, input.signedBy);
    }),
});
