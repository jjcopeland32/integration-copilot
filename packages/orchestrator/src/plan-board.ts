import { PrismaClient, PlanStatus } from '@prisma/client';
import {
  PLAN_PHASES,
  type PhaseDefinition,
  type PhaseKey,
  type PhaseSettings,
  type ProjectPhaseConfig,
  normalizePhaseConfig,
} from './phases';

type PlanItemRecord = {
  id: string;
  projectId: string;
  phase: string;
  title: string;
  status: PlanStatus;
  ownerId?: string | null;
  dueAt?: Date | string | null;
  evidence?: { items?: EvidenceItem[] } | null;
  evidences?: { id: string }[];
};

type EvidenceItem = {
  type: 'file' | 'screenshot' | 'log' | 'note';
  url?: string;
  content?: string;
  metadata?: Record<string, any> | null;
  uploadedAt?: string;
};

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

function buildExitCriteria(phase: PhaseDefinition, settings: PhaseSettings): string[] {
  const criteria = [...phase.exitCriteria];

  if (phase.key === 'uat' && settings.uatScenarios.length > 0) {
    for (const scenario of settings.uatScenarios) {
      criteria.push(`UAT: ${scenario.name}`);
    }
  }

  if (settings.performanceBenchmark) {
    const benchmarkParts: string[] = [];
    if (typeof settings.performanceBenchmark.targetLatencyMs === 'number') {
      benchmarkParts.push(`≤ ${settings.performanceBenchmark.targetLatencyMs}ms latency`);
    }
    if (typeof settings.performanceBenchmark.targetSuccessRatePercent === 'number') {
      benchmarkParts.push(`${settings.performanceBenchmark.targetSuccessRatePercent}% success rate`);
    }
    if (typeof settings.performanceBenchmark.maxErrorRatePercent === 'number') {
      benchmarkParts.push(`≤ ${settings.performanceBenchmark.maxErrorRatePercent}% error rate`);
    }
    if (benchmarkParts.length > 0) {
      criteria.push(`Performance target: ${benchmarkParts.join(' • ')}`);
    }
  }

  if (settings.customRequirements && settings.customRequirements.length > 0) {
    for (const requirement of settings.customRequirements) {
      criteria.push(requirement.name);
    }
  }

  return criteria;
}

export class PlanBoardManager {
  constructor(private prisma: PrismaClient) {}

  async initializeProjectPlan(
    projectId: string,
    config?: ProjectPhaseConfig
  ): Promise<void> {
    const normalized = normalizePhaseConfig(config);
    const enabledPhases = PLAN_PHASES.filter((phase) => normalized[phase.key].enabled);
    if (enabledPhases.length === 0) return;

    const existingItems = await this.prisma.planItem.findMany({
      where: { projectId },
      select: { id: true, phase: true, title: true },
    });
    const seen = new Set(existingItems.map((item) => `${item.phase}:${item.title}`));
    const desiredKeys = new Set<string>();

    const items: Array<{ projectId: string; phase: string; title: string; status: PlanStatus }> =
      [];

    for (const phase of enabledPhases) {
      const settings = normalized[phase.key];
      const exitCriteria = buildExitCriteria(phase, settings);
      for (const criterion of exitCriteria) {
        const key = `${phase.key}:${criterion}`;
        desiredKeys.add(key);
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        items.push({
          projectId,
          phase: phase.key,
          title: criterion,
          status: PlanStatus.TODO,
        });
      }
    }

    if (items.length > 0) {
      await this.prisma.planItem.createMany({
        data: items,
      });
    }

    const staleIds = existingItems
      .filter((item) => !desiredKeys.has(`${item.phase}:${item.title}`))
      .map((item) => item.id);
    if (staleIds.length > 0) {
      const delegate = this.prisma.planItem as unknown as {
        deleteMany(args: { where: { id: { in: string[] } } }): Promise<unknown>;
      };
      await delegate.deleteMany({
        where: { id: { in: staleIds } },
      });
    }
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

  async getPlanBoard(projectId: string, config?: ProjectPhaseConfig) {
    const normalized = normalizePhaseConfig(config);
    const enabledPhases = PLAN_PHASES.filter((phase) => normalized[phase.key].enabled);
    const items = (await this.prisma.planItem.findMany({
      where: { projectId },
      orderBy: [{ phase: 'asc' }, { createdAt: 'asc' }],
      include: { evidences: true },
    })) as PlanItemRecord[];

    const board: Record<PhaseKey, any> = {} as Record<PhaseKey, any>;
    for (const phase of enabledPhases) {
      board[phase.key] = {
        ...phase,
        settings: normalized[phase.key],
        items: items.filter((item) => item.phase === phase.key),
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

  async getProjectProgress(projectId: string, config?: ProjectPhaseConfig) {
    const normalized = normalizePhaseConfig(config);
    const enabledPhases = PLAN_PHASES.filter((phase) => normalized[phase.key].enabled);
    const progress: Array<{
      phase: string;
      total: number;
      done: number;
      inProgress: number;
      blocked: number;
      percentComplete: number;
    }> = [];
    
    for (const phase of enabledPhases) {
      const phaseProgress = await this.getPhaseProgress(projectId, phase.key);
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
