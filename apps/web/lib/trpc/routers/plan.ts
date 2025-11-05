import { router, protectedProcedure } from '../server';
import { z } from 'zod';
import { createPlanBoardManager } from '@integration-copilot/orchestrator';

export const planRouter = router({
  initialize: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const planBoard = createPlanBoardManager(ctx.prisma);
      await planBoard.initializeProjectPlan(input.projectId);
      return { success: true };
    }),

  getBoard: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      const planBoard = createPlanBoardManager(ctx.prisma);
      return planBoard.getPlanBoard(input.projectId);
    }),

  getProgress: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      const planBoard = createPlanBoardManager(ctx.prisma);
      return planBoard.getProjectProgress(input.projectId);
    }),

  updateItem: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED']).optional(),
        ownerId: z.string().optional(),
        dueAt: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const planBoard = createPlanBoardManager(ctx.prisma);
      const { itemId, ...data } = input;
      return planBoard.updatePlanItem(itemId, data);
    }),

  uploadEvidence: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        evidence: z.object({
          type: z.enum(['file', 'screenshot', 'log', 'note']),
          url: z.string().optional(),
          content: z.string().optional(),
          metadata: z.any().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const planBoard = createPlanBoardManager(ctx.prisma);
      return planBoard.uploadEvidence(input.itemId, input.evidence);
    }),

  createItem: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        phase: z.string(),
        title: z.string(),
        ownerId: z.string().optional(),
        dueAt: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const planBoard = createPlanBoardManager(ctx.prisma);
      return planBoard.createPlanItem(input);
    }),
});
