import { router, publicProcedure } from '../server';
import { z } from 'zod';
import { createPlanBoardManager } from '@integration-copilot/orchestrator';
import { PlanStatus } from '@prisma/client';

const statusFilters: Array<{ status: PlanStatus; field: 'done' | 'inProgress' | 'blocked' }> = [
  { status: PlanStatus.DONE, field: 'done' },
  { status: PlanStatus.IN_PROGRESS, field: 'inProgress' },
  { status: PlanStatus.BLOCKED, field: 'blocked' },
];

export const planRouter = router({
  get: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });
      if (!project) {
        throw new Error('Project not found');
      }
      const planBoard = createPlanBoardManager(ctx.prisma);

      const existingItems = await ctx.prisma.planItem.count({
        where: { projectId: input.projectId },
      });

      if (existingItems === 0) {
        await planBoard.initializeProjectPlan(input.projectId);
      }

      const board = await planBoard.getPlanBoard(input.projectId);
      const phases = Object.values(board).map((phase) => {
        const counters = {
          total: phase.items.length,
          done: 0,
          inProgress: 0,
          blocked: 0,
        };

        for (const item of phase.items) {
          const match = statusFilters.find((filter) => item.status === filter.status);
          if (match) {
            counters[match.field] += 1;
          }
        }

        return {
          key: phase.name,
          title: phase.title,
          description: phase.description,
          exitCriteria: phase.exitCriteria,
          total: counters.total,
          done: counters.done,
          inProgress: counters.inProgress,
          blocked: counters.blocked,
          items: phase.items.map((item) => ({
            id: item.id,
            title: item.title,
            status: item.status,
            ownerId: item.ownerId,
            dueAt: item.dueAt,
            evidenceCount: Array.isArray(item.evidence?.items) ? item.evidence.items.length : 0,
          })),
        };
      });

      return { phases };
    }),
});
