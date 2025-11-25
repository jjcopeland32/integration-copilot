import { router, publicProcedure } from '../server';
import { z } from 'zod';
import {
  PLAN_PHASES,
  createPlanBoardManager,
  normalizePhaseConfig,
} from '@integration-copilot/orchestrator';
import { PlanStatus, EvidenceKind } from '@prisma/client';

const statusFilters: Array<{ status: PlanStatus; field: 'done' | 'inProgress' | 'blocked' }> = [
  { status: PlanStatus.DONE, field: 'done' },
  { status: PlanStatus.IN_PROGRESS, field: 'inProgress' },
  { status: PlanStatus.BLOCKED, field: 'blocked' },
];

type EvidenceApprovalStatus = 'pending' | 'approved' | 'rejected';

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
          items: items.map((item: any) => ({
            id: item.id,
            title: item.title,
            status: item.status,
            ownerId: item.ownerId,
            dueAt: item.dueAt,
            evidenceCount:
              (Array.isArray(item.evidences) ? item.evidences.length : 0) +
              (Array.isArray(item.evidence?.items) ? item.evidence.items.length : 0),
          })),
        };
      });

      return { phases, config: phaseConfig };
    }),

  listEvidence: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const planItems = await ctx.prisma.planItem.findMany({
        where: { projectId: input.projectId },
        include: {
          evidences: {
            include: {
              partnerProject: true,
              uploadedByPartnerUser: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return planItems.map((item) => ({
        id: item.id,
        phase: item.phase,
        title: item.title,
        status: item.status,
        evidences: item.evidences.map((ev) => {
          // Extract approval status from metadata
          const metadata = ev.metadata as Record<string, unknown> | null;
          const approvalStatus = (metadata?.approvalStatus as EvidenceApprovalStatus) ?? 'pending';
          const approvedAt = metadata?.approvedAt as string | undefined;
          const approvedBy = metadata?.approvedBy as string | undefined;
          const rejectionReason = metadata?.rejectionReason as string | undefined;

          return {
            id: ev.id,
            kind: ev.kind,
            url: ev.url,
            notes: ev.notes,
            createdAt: ev.createdAt,
            partnerProjectId: ev.partnerProjectId,
            partnerName: ev.partnerProject.partnerName,
            uploadedBy: ev.uploadedByPartnerUser
              ? {
                  id: ev.uploadedByPartnerUser.id,
                  email: ev.uploadedByPartnerUser.email,
                  name: ev.uploadedByPartnerUser.name,
                }
              : null,
            approvalStatus,
            approvedAt,
            approvedBy,
            rejectionReason,
          };
        }),
      }));
    }),

  updateItemStatus: publicProcedure
    .input(
      z.object({
        itemId: z.string(),
        status: z.nativeEnum(PlanStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.planItem.update({
        where: { id: input.itemId },
        data: { status: input.status },
      });
      return item;
    }),

  approveEvidence: publicProcedure
    .input(
      z.object({
        evidenceId: z.string(),
        approved: z.boolean(),
        rejectionReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const evidence = await ctx.prisma.planItemEvidence.findUnique({
        where: { id: input.evidenceId },
        include: { planItem: true },
      });

      if (!evidence) {
        throw new Error('Evidence not found');
      }

      const existingMetadata = (evidence.metadata as Record<string, unknown>) ?? {};
      const newMetadata: Record<string, unknown> = {
        ...existingMetadata,
        approvalStatus: input.approved ? 'approved' : 'rejected',
        approvedAt: new Date().toISOString(),
        approvedBy: ctx.userId ?? 'system',
      };

      if (!input.approved && input.rejectionReason) {
        newMetadata.rejectionReason = input.rejectionReason;
      }

      const updated = await ctx.prisma.planItemEvidence.update({
        where: { id: input.evidenceId },
        data: { metadata: newMetadata },
        include: {
          partnerProject: true,
          uploadedByPartnerUser: true,
        },
      });

      // If approved and all evidences for this plan item are approved,
      // optionally mark the plan item as DONE
      if (input.approved) {
        const allEvidences = await ctx.prisma.planItemEvidence.findMany({
          where: { planItemId: evidence.planItemId },
        });

        const allApproved = allEvidences.every((ev) => {
          const meta = ev.metadata as Record<string, unknown> | null;
          return meta?.approvalStatus === 'approved';
        });

        if (allApproved && allEvidences.length > 0) {
          await ctx.prisma.planItem.update({
            where: { id: evidence.planItemId },
            data: { status: PlanStatus.DONE },
          });
        }
      }

      return {
        id: updated.id,
        approvalStatus: input.approved ? 'approved' : 'rejected',
      };
    }),

  uploadEvidence: publicProcedure
    .input(
      z.object({
        planItemId: z.string(),
        kind: z.nativeEnum(EvidenceKind).default(EvidenceKind.NOTE),
        url: z.string().url().optional(),
        notes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const planItem = await ctx.prisma.planItem.findUnique({
        where: { id: input.planItemId },
        include: { project: { include: { partnerProjects: true } } },
      });

      if (!planItem) {
        throw new Error('Plan item not found');
      }

      // For buyer-uploaded evidence, we don't have a partner project context
      // We'll create a "vendor evidence" entry that's not tied to a partner
      // For now, just update the plan item's evidence JSON field
      const existingEvidence = (planItem.evidence as Record<string, unknown[]>) ?? { items: [] };
      const items = Array.isArray(existingEvidence.items) ? existingEvidence.items : [];

      items.push({
        id: `vendor_ev_${Date.now()}`,
        kind: input.kind,
        url: input.url,
        notes: input.notes,
        uploadedBy: ctx.userId ?? 'vendor',
        createdAt: new Date().toISOString(),
      });

      const updated = await ctx.prisma.planItem.update({
        where: { id: input.planItemId },
        data: {
          evidence: { items },
        },
      });

      return { success: true, itemId: updated.id };
    }),
});
