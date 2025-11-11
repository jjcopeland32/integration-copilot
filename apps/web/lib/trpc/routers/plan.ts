import { router, publicProcedure } from '../server';
import { z } from 'zod';
import {
  PLAN_PHASES,
  createPlanBoardManager,
  normalizePhaseConfig,
} from '@integration-copilot/orchestrator';
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
      const phaseConfig = normalizePhaseConfig(project.phaseConfig);

      await planBoard.initializeProjectPlan(input.projectId, phaseConfig);

      const board = await planBoard.getPlanBoard(input.projectId, phaseConfig);
      const enabledPhases = PLAN_PHASES.filter((phase) => phaseConfig[phase.key].enabled);

      const phases = enabledPhases.map((phase) => {
        const phaseEntry = board[phase.key];
        const items = phaseEntry?.items ?? [];
        const counters = {
          total: items.length,
          done: 0,
          inProgress: 0,
          blocked: 0,
        };

        for (const item of items) {
          const match = statusFilters.find((filter) => item.status === filter.status);
          if (match) {
            counters[match.field] += 1;
          }
        }

        return {
          key: phase.key,
          title: phase.title,
          description: phase.description,
          exitCriteria: phase.exitCriteria,
          settings: phaseConfig[phase.key],
          total: counters.total,
          done: counters.done,
          inProgress: counters.inProgress,
          blocked: counters.blocked,
          items: items.map((item) => ({
            id: item.id,
            title: item.title,
            status: item.status,
            ownerId: item.ownerId,
            dueAt: item.dueAt,
            evidenceCount: Array.isArray(item.evidence?.items) ? item.evidence.items.length : 0,
          })),
        };
      });

      return { phases, config: phaseConfig };
    }),
});
