import { z } from 'zod';
import { EvidenceKind } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import {
  createPartnerRouter,
  partnerProtectedProcedure,
} from '../server';
import { notifyEvidenceSubmitted } from '@/lib/notifications';

export const partnerPlanRouter = createPartnerRouter({
  submitEvidence: partnerProtectedProcedure
    .input(
      z.object({
        planItemId: z.string(),
        kind: z.nativeEnum(EvidenceKind).default(EvidenceKind.NOTE).optional(),
        url: z.string().url().optional(),
        notes: z.string().max(2000).optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const planItem = await ctx.prisma.planItem.findUnique({
        where: { id: input.planItemId },
      });
      if (!planItem) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan item not found' });
      }
      if (planItem.projectId !== ctx.session!.partnerProject.projectId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const evidence = await ctx.prisma.planItemEvidence.create({
        data: {
          planItemId: planItem.id,
          partnerProjectId: ctx.session!.partnerProjectId,
          uploadedByPartnerUserId: ctx.session!.partnerUser.id,
          kind: input.kind ?? EvidenceKind.NOTE,
          url: input.url,
          notes: input.notes,
          metadata: input.metadata as any,
        },
        include: {
          planItem: {
            include: {
              project: true,
            },
          },
        },
      });

      // Send notification for evidence submission
      notifyEvidenceSubmitted({
        projectId: evidence.planItem.projectId,
        projectName: evidence.planItem.project.name,
        partnerName: ctx.session!.partnerProject.partnerName ?? 'Partner',
        planItemTitle: evidence.planItem.title,
        phase: evidence.planItem.phase,
      }).catch((err) => {
        console.error('[partner-plan] Failed to send evidence notification:', err);
      });

      return {
        evidence: {
          id: evidence.id,
          planItemId: evidence.planItemId,
          notes: evidence.notes,
          url: evidence.url,
          kind: evidence.kind,
          createdAt: evidence.createdAt,
        },
      };
    }),
});
