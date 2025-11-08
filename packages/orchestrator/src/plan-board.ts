import { PrismaClient, PlanStatus } from '@prisma/client';

type PlanItemRecord = {
  id: string;
  projectId: string;
  phase: string;
  title: string;
  status: PlanStatus;
  ownerId?: string | null;
  dueAt?: Date | string | null;
  evidence?: { items?: EvidenceItem[] } | null;
};

type EvidenceItem = {
  type: 'file' | 'screenshot' | 'log' | 'note';
  url?: string;
  content?: string;
  metadata?: Record<string, any> | null;
  uploadedAt?: string;
};

export interface PlanPhase {
  name: string;
  title: string;
  description: string;
  exitCriteria: string[];
}

export const DEFAULT_PHASES: PlanPhase[] = [
  {
    name: 'auth',
    title: 'Authentication Setup',
    description: 'Configure and test authentication mechanism',
    exitCriteria: [
      'API credentials obtained',
      'Authentication test passes',
      'Token refresh mechanism understood',
    ],
  },
  {
    name: 'core',
    title: 'Core Integration',
    description: 'Implement core API endpoints',
    exitCriteria: [
      'All required endpoints implemented',
      'Happy path tests passing',
      'Error handling implemented',
    ],
  },
  {
    name: 'webhooks',
    title: 'Webhooks Implementation',
    description: 'Set up webhook handlers and signature verification',
    exitCriteria: [
      'Webhook endpoint configured',
      'Signature verification working',
      'Event processing implemented',
    ],
  },
  {
    name: 'uat',
    title: 'User Acceptance Testing',
    description: 'End-to-end testing in staging environment',
    exitCriteria: [
      'All golden tests passing',
      'UAT scenarios completed',
      'Performance benchmarks met',
    ],
  },
  {
    name: 'cert',
    title: 'Certification',
    description: 'Final certification and go-live approval',
    exitCriteria: [
      'Security review completed',
      'Documentation finalized',
      'Go-live checklist approved',
    ],
  },
];

export interface CreatePlanItemInput {
  projectId: string;
  phase: string;
  title: string;
  ownerId?: string;
  dueAt?: Date;
}

export interface UpdatePlanItemInput {
  status?: PlanStatus;
  ownerId?: string;
  dueAt?: Date;
  evidence?: any;
}

export class PlanBoardManager {
  constructor(private prisma: PrismaClient) {}

  async initializeProjectPlan(projectId: string): Promise<void> {
    const items: Array<Omit<PlanItemRecord, 'id'>> = [];

    for (const phase of DEFAULT_PHASES) {
      for (const criterion of phase.exitCriteria) {
        items.push({
          projectId,
          phase: phase.name,
          title: criterion,
          status: PlanStatus.TODO,
        });
      }
    }

    await this.prisma.planItem.createMany({
      data: items,
    });
  }

  async createPlanItem(input: CreatePlanItemInput) {
    return this.prisma.planItem.create({
      data: {
        projectId: input.projectId,
        phase: input.phase,
        title: input.title,
        ownerId: input.ownerId,
        dueAt: input.dueAt,
        status: PlanStatus.TODO,
      },
    });
  }

  async updatePlanItem(itemId: string, input: UpdatePlanItemInput) {
    return this.prisma.planItem.update({
      where: { id: itemId },
      data: input,
    });
  }

  async getPlanBoard(projectId: string) {
    const items = (await this.prisma.planItem.findMany({
      where: { projectId },
      orderBy: [{ phase: 'asc' }, { createdAt: 'asc' }],
    })) as PlanItemRecord[];

    // Group by phase
    const board: Record<string, any> = {};
    for (const phase of DEFAULT_PHASES) {
      board[phase.name] = {
        ...phase,
        items: items.filter((item) => item.phase === phase.name),
      };
    }

    return board;
  }

  async uploadEvidence(
    itemId: string,
    evidence: {
      type: 'file' | 'screenshot' | 'log' | 'note';
      url?: string;
      content?: string;
      metadata?: any;
    }
  ) {
    const item = (await this.prisma.planItem.findUnique({
      where: { id: itemId },
    })) as (PlanItemRecord & { evidence?: { items?: EvidenceItem[] } | null }) | null;

    if (!item) {
      throw new Error('Plan item not found');
    }

    const currentEvidence = item.evidence ?? { items: [] as EvidenceItem[] };
    if (!currentEvidence.items) {
      currentEvidence.items = [] as EvidenceItem[];
    }
    currentEvidence.items.push({
      ...evidence,
      uploadedAt: new Date().toISOString(),
    });

    return this.prisma.planItem.update({
      where: { id: itemId },
      data: {
        evidence: currentEvidence,
      },
    });
  }

  async getPhaseProgress(projectId: string, phase: string) {
    const items = (await this.prisma.planItem.findMany({
      where: { projectId, phase },
    })) as PlanItemRecord[];

    const total = items.length;
    const done = items.filter((i) => i.status === PlanStatus.DONE).length;
    const inProgress = items.filter(
      (i) => i.status === PlanStatus.IN_PROGRESS
    ).length;
    const blocked = items.filter((i) => i.status === PlanStatus.BLOCKED).length;

    return {
      phase,
      total,
      done,
      inProgress,
      blocked,
      percentComplete: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }

  async getProjectProgress(projectId: string) {
    const progress: Array<{
      phase: string;
      total: number;
      done: number;
      inProgress: number;
      blocked: number;
      percentComplete: number;
    }> = [];
    
    for (const phase of DEFAULT_PHASES) {
      const phaseProgress = await this.getPhaseProgress(projectId, phase.name);
      progress.push(phaseProgress);
    }

    const totalItems = progress.reduce((sum, p) => sum + p.total, 0);
    const totalDone = progress.reduce((sum, p) => sum + p.done, 0);

    return {
      phases: progress,
      overall: {
        total: totalItems,
        done: totalDone,
        percentComplete:
          totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0,
      },
    };
  }
}

export function createPlanBoardManager(prisma: PrismaClient): PlanBoardManager {
  return new PlanBoardManager(prisma);
}
