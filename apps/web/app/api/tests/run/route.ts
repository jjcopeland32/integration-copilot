import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { runSuite } from '@integration-copilot/testkit';
import { RBACError, requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { Actor, MockStatus, PlanStatus, Prisma } from '@prisma/client';
import { ensureMockServer } from '@/lib/mock-server-manager';
import { normalizePhaseConfig, PLAN_PHASES, type PhaseKey } from '@integration-copilot/orchestrator';

export const dynamic = 'force-dynamic';

interface RunPayload {
  suiteId: string;
  baseUrl?: string;
  actor?: Actor;
}

type CategorizedTestCase = {
  id: string;
  name: string;
  type: string;
  category?: string;
  request?: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: unknown;
    repeat?: number;
    thinkTimeMs?: number;
    policy?: {
      maxAttempts?: number;
      baseDelayMs?: number;
    };
    simulate?: Record<string, unknown>;
  };
  expect?: {
    status?: number;
    [key: string]: unknown;
  };
};

type SuitePayload = {
  name: string;
  version: string;
  cases: CategorizedTestCase[];
};

type CaseSnapshot = {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  message: string | null;
  response: {
    status: number | null;
    body: unknown;
  } | null;
};

type StoredRunResult = {
  suiteId: string;
  runId: string;
  startedAt: string | null;
  finishedAt: string | null;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    durationMs: number | null;
  };
  cases: CaseSnapshot[];
};

function normalizeCases(rawCases: unknown[]): CategorizedTestCase[] {
  return rawCases.map((test, index) => {
    if (!test || typeof test !== 'object') {
      return {
        id: `case_${index}`,
        name: `Case ${index + 1}`,
        type: 'generic',
      };
    }

    const value = test as Record<string, unknown>;
    const rawRequest =
      value.request && typeof value.request === 'object'
        ? (value.request as Record<string, unknown>)
        : undefined;
    const resolvedUrl =
      typeof rawRequest?.url === 'string'
        ? rawRequest.url
        : typeof rawRequest?.path === 'string'
          ? rawRequest.path
          : '/';

    const expectStatus =
      typeof value.expectedStatus === 'number'
        ? value.expectedStatus
        : typeof (value.expect as Record<string, unknown> | undefined)?.status === 'number'
          ? ((value.expect as Record<string, unknown>).status as number)
          : undefined;

    return {
      id: typeof value.id === 'string' && value.id.length > 0 ? value.id : `case_${index}`,
      name: typeof value.name === 'string' && value.name.length > 0 ? value.name : `Case ${index + 1}`,
      type: typeof value.type === 'string' && value.type.length > 0 ? value.type : 'generic',
      category: typeof value.category === 'string' ? value.category : undefined,
      request: rawRequest
        ? {
            ...rawRequest,
            url: resolvedUrl,
          }
        : undefined,
      expect:
        expectStatus !== undefined
          ? {
              ...(value.expect as Record<string, unknown> | undefined),
              status: expectStatus,
            }
          : ((value.expect as Record<string, unknown>) ?? undefined),
    };
  });
}

async function persistArtifacts(result: unknown) {
  try {
    const artifactsDir = path.join(process.cwd(), '.artifacts/testruns');
    await fs.mkdir(artifactsDir, { recursive: true });
    const fileName = `${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await fs.writeFile(path.join(artifactsDir, fileName), JSON.stringify(result, null, 2));
  } catch (error) {
    console.warn('[TestKit] Unable to persist artifacts', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(['OWNER', 'ADMIN', 'VENDOR', 'PARTNER']);
  } catch (error) {
    if (error instanceof RBACError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    throw error;
  }

  let payload: RunPayload;
  try {
    payload = (await req.json()) as RunPayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!payload?.suiteId) {
    return NextResponse.json({ ok: false, error: 'suiteId is required' }, { status: 400 });
  }

  const suiteRecord = await prisma.testSuite.findUnique({
    where: { id: payload.suiteId },
  });
  if (!suiteRecord) {
    return NextResponse.json({ ok: false, error: 'Suite not found' }, { status: 404 });
  }
  const project = await prisma.project.findUnique({
    where: { id: suiteRecord.projectId },
    select: { phaseConfig: true },
  });
  const phaseConfig = normalizePhaseConfig(project?.phaseConfig);
  const enabledPhaseSet = new Set(
    PLAN_PHASES.filter((phase) => phaseConfig[phase.key].enabled).map((phase) => phase.key)
  );

  const rawCases = Array.isArray(suiteRecord.cases) ? (suiteRecord.cases as unknown[]) : [];
  const categorizedCases = normalizeCases(rawCases);
  const suite: SuitePayload = {
    name: suiteRecord.name,
    version: suiteRecord.version,
    cases: categorizedCases,
  };

  const actor: Actor =
    payload.actor && Object.values(Actor).includes(payload.actor as Actor)
      ? (payload.actor as Actor)
      : Actor.VENDOR;
  let baseUrl = payload.baseUrl || process.env.APP_URL || 'http://localhost:3000';

  const mockInstance = await prisma.mockInstance.findFirst({
    where: { projectId: suiteRecord.projectId },
    orderBy: { createdAt: 'desc' },
  });

  if (mockInstance) {
    try {
      await ensureMockServer(mockInstance);
      if (mockInstance.status !== MockStatus.RUNNING) {
        await prisma.mockInstance.update({
          where: { id: mockInstance.id },
          data: { status: MockStatus.RUNNING },
        });
      }
    } catch (error) {
      console.warn('[Mock] Failed to start mock server', error);
    }
    baseUrl = mockInstance.baseUrl;
  }

  try {
    type RunnerResult = {
      cases?: Array<{
        id: string;
        name: string;
        status: 'passed' | 'failed' | 'skipped';
        errors?: string[];
        repeats?: Array<{ attempts?: Array<{ status?: number; body?: unknown }> }>;
      }>;
      summary?: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
      };
      startedAt?: string;
      finishedAt?: string;
      runId?: string;
    };

    const runSuiteWithPayload = runSuite as unknown as (
      suiteId: string,
      suite: SuitePayload,
      options: { baseUrl: string }
    ) => Promise<RunnerResult>;

    const rawResult = await runSuiteWithPayload(suiteRecord.id, suite, { baseUrl });
    await persistArtifacts(rawResult);

    const caseResults = rawResult.cases ?? [];
    const derivedSummary = rawResult.summary ?? {
      total: caseResults.length,
      passed: caseResults.filter((result) => result.status === 'passed').length,
      failed: caseResults.filter((result) => result.status === 'failed').length,
      skipped: caseResults.filter((result) => result.status === 'skipped').length,
    };
    const startedAtMs = rawResult.startedAt ? new Date(rawResult.startedAt).getTime() : undefined;
    const finishedAtMs = rawResult.finishedAt ? new Date(rawResult.finishedAt).getTime() : undefined;
    const summary = {
      ...derivedSummary,
      durationMs:
        typeof startedAtMs === 'number' && typeof finishedAtMs === 'number'
          ? Math.max(finishedAtMs - startedAtMs, 0)
          : null,
    };

    const runIdentifier = rawResult.runId ?? crypto.randomUUID();
    const caseSnapshots: CaseSnapshot[] = caseResults.map((testCase) => {
      const latestAttempt = testCase.repeats?.at(-1)?.attempts?.at(-1);
      return {
        id: testCase.id,
        name: testCase.name,
        status: testCase.status,
        message: testCase.errors?.join('\n') ?? null,
        response: latestAttempt
          ? {
              status: latestAttempt.status ?? null,
              body: latestAttempt.body ?? null,
            }
          : null,
      };
    });

    const normalizedResult: StoredRunResult = {
      suiteId: suiteRecord.id,
      runId: runIdentifier,
      startedAt: rawResult.startedAt ?? null,
      finishedAt: rawResult.finishedAt ?? null,
      summary: {
        total: summary.total,
        passed: summary.passed,
        failed: summary.failed,
        skipped: summary.skipped,
        durationMs: summary.durationMs ?? null,
      },
      cases: caseSnapshots,
    };

    await prisma.testRun.create({
      data: {
        suiteId: suiteRecord.id,
        actor,
        env: baseUrl,
        results: normalizedResult as unknown as Prisma.InputJsonValue,
      },
    });
    const tracePayloads = caseSnapshots.map((caseResult) => {
      const expectedStatus =
        categorizedCases.find((testCase) => testCase.id === caseResult.id)?.expect?.status ?? null;
      return {
        projectId: suiteRecord.projectId,
        requestMeta: {
          suiteId: suiteRecord.id,
          suiteName: suiteRecord.name,
          caseId: caseResult.id,
          caseName: caseResult.name,
          runId: runIdentifier,
          expectedStatus,
        } as Prisma.InputJsonValue,
        responseMeta: {
          status: caseResult.response?.status ?? null,
          body: caseResult.response?.body ?? null,
          baseUrl,
        } as Prisma.InputJsonValue,
        verdict: caseResult.status === 'passed' ? 'pass' : 'fail',
      };
    });
    if (tracePayloads.length > 0) {
      await prisma.$transaction(
        tracePayloads.map((payload) =>
          prisma.trace.create({
            data: payload,
          })
        )
      );
    }
    const categoryPhaseMap: Record<string, PhaseKey> = {
      auth: 'auth',
      webhook: 'webhooks',
      webhooks: 'webhooks',
      error: 'core',
      edge_case: 'core',
      uat: 'uat',
    };
    const touchedPhases = new Set<PhaseKey>();
    for (const testCase of categorizedCases) {
      const category = testCase.category ?? 'core';
      const phase = categoryPhaseMap[category] ?? 'core';
      if (enabledPhaseSet.has(phase)) {
        touchedPhases.add(phase);
      }
    }

    const planStatus =
      summary.failed && summary.failed > 0 ? PlanStatus.IN_PROGRESS : PlanStatus.DONE;
    if (touchedPhases.size > 0) {
      await Promise.all(
        Array.from(touchedPhases).map((phase) =>
          prisma.planItem.updateMany({
            where: { projectId: suiteRecord.projectId, phase },
            data: { status: planStatus },
          })
        )
      );
    }

    return NextResponse.json({ ok: true, result: normalizedResult });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to run golden test suite';
    const failureArtifact = {
      ok: false,
      suiteId: suite.name,
      baseUrl,
      actor: payload.actor,
      error: message,
      occurredAt: new Date().toISOString(),
    };
    await persistArtifacts(failureArtifact);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
