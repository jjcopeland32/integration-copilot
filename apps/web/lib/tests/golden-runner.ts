import {
  Actor,
  PlanStatus,
  Prisma,
  TestSuite as PrismaTestSuite,
} from '@prisma/client';
import type { SuiteRunResult, TestSuite as RunnerTestSuite } from '@integration-copilot/testkit';
import { prisma } from '@/lib/prisma';
import {
  normalizePhaseConfig,
  PLAN_PHASES,
  type PhaseKey,
} from '@integration-copilot/orchestrator';
import { getSuiteById } from '@/lib/test-suites';

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

type AssertionResultSnapshot = {
  passed: boolean;
  assertion: {
    type: string;
    field?: string;
    value?: unknown;
    condition?: string;
  };
  error?: string;
  expected?: unknown;
  actual?: unknown;
};

type RunnerCaseResult = {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  repeats: Array<{
    attempts?: Array<{
      status?: number | null;
      body?: unknown;
    }>;
  }>;
  errors: string[];
  assertionResults?: AssertionResultSnapshot[];
};

type CaseSnapshot = {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  message: string | null;
  errors?: string[];
  response: {
    status: number | null;
    body: unknown;
  } | null;
  assertionResults?: AssertionResultSnapshot[];
};

export type StoredRunResult = {
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

export class SuiteNotFoundError extends Error {
  constructor(message = 'Suite not found') {
    super(message);
    this.name = 'SuiteNotFoundError';
  }
}

export class SuiteForbiddenError extends Error {
  constructor(message = 'Suite does not belong to this project') {
    super(message);
    this.name = 'SuiteForbiddenError';
  }
}

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

function buildCaseSnapshots(results: RunnerCaseResult[]): CaseSnapshot[] {
  return results.map((result) => {
    const lastRepeat = result.repeats.at(-1);
    const lastAttempt = lastRepeat?.attempts?.at(-1);
    return {
      id: result.id,
      name: result.name,
      status: result.status,
      message: result.errors.length > 0 ? result.errors.join('\n') : null,
      errors: result.errors.length > 0 ? result.errors : undefined,
      response: lastAttempt
        ? {
            status: typeof lastAttempt.status === 'number' ? lastAttempt.status : null,
            body: lastAttempt.body ?? null,
          }
        : null,
      assertionResults: result.assertionResults,
    };
  });
}

function buildRunnerSuite(record: PrismaTestSuite): RunnerTestSuite {
  const rawCases = Array.isArray(record.cases) ? (record.cases as unknown[]) : [];
  return {
    name: record.name,
    version: record.version,
    cases: rawCases as unknown as RunnerTestSuite['cases'],
  };
}

export type SuiteExecutionContext = {
  suiteRecord: PrismaTestSuite;
  runnerSuite: RunnerTestSuite;
  categorizedCases: CategorizedTestCase[];
  enabledPhaseSet: Set<PhaseKey>;
  /**
   * When true, persistence side effects (TestRun/Trace/PlanItem writes)
   * are skipped. Used in CI fallback mode where Prisma tables may not exist.
   */
  persistenceDisabled?: boolean;
};

async function loadEphemeralSuiteExecutionContext(
  suiteId: string
): Promise<SuiteExecutionContext> {
  const suite = await getSuiteById(suiteId);
  if (!suite) {
    throw new SuiteNotFoundError();
  }

  const phaseConfig = normalizePhaseConfig(undefined);
  const enabledPhaseSet = new Set<PhaseKey>(
    PLAN_PHASES.filter((phase) => phaseConfig[phase.key].enabled).map((phase) => phase.key)
  );

  const rawCases = Array.isArray(suite.cases) ? (suite.cases as unknown[]) : [];
  const categorizedCases = normalizeCases(rawCases);
  const now = new Date();

  const suiteRecord: PrismaTestSuite = {
    id: suiteId,
    projectId: 'ephemeral-project',
    name: suite.name,
    version: suite.version ?? '1.0.0',
    cases: suite.cases as unknown as Prisma.JsonValue,
    createdAt: now,
    updatedAt: now,
  };

  return {
    suiteRecord,
    runnerSuite: {
      name: suite.name,
      version: suite.version ?? '1.0.0',
      cases: Array.isArray(suite.cases)
        ? (suite.cases as unknown as RunnerTestSuite['cases'])
        : [],
    },
    categorizedCases,
    enabledPhaseSet,
    persistenceDisabled: true,
  };
}

export async function loadSuiteExecutionContext(
  suiteId: string,
  expectedProjectId?: string
): Promise<SuiteExecutionContext> {
  const allowFallback = process.env.COPILOT_TESTKIT_FALLBACK === 'file';

  let suiteRecord: PrismaTestSuite | null = null;
  try {
    suiteRecord = await prisma.testSuite.findUnique({
      where: { id: suiteId },
    });
  } catch (error) {
    if (!allowFallback) {
      throw error;
    }
    console.warn(
      '[golden-runner] Prisma lookup failed for TestSuite; falling back to file-based suite',
      error
    );
    return loadEphemeralSuiteExecutionContext(suiteId);
  }

  if (!suiteRecord) {
    if (!allowFallback) {
      throw new SuiteNotFoundError();
    }
    console.warn(
      '[golden-runner] TestSuite not found in database; falling back to file-based suite',
      { suiteId }
    );
    return loadEphemeralSuiteExecutionContext(suiteId);
  }

  if (expectedProjectId && suiteRecord.projectId !== expectedProjectId) {
    throw new SuiteForbiddenError();
  }

  const project = await prisma.project.findUnique({
    where: { id: suiteRecord.projectId },
    select: { phaseConfig: true },
  });

  const phaseConfig = normalizePhaseConfig(project?.phaseConfig);
  const enabledPhaseSet = new Set<PhaseKey>(
    PLAN_PHASES.filter((phase) => phaseConfig[phase.key].enabled).map((phase) => phase.key)
  );

  const rawCases = Array.isArray(suiteRecord.cases) ? (suiteRecord.cases as unknown[]) : [];
  const categorizedCases = normalizeCases(rawCases);

  return {
    suiteRecord,
    runnerSuite: buildRunnerSuite(suiteRecord),
    categorizedCases,
    enabledPhaseSet,
  };
}

export async function persistSuiteRun({
  context,
  actor,
  origin,
  runResult,
}: {
  context: SuiteExecutionContext;
  actor: Actor;
  origin: string;
  runResult: SuiteRunResult;
}): Promise<StoredRunResult> {
  const { suiteRecord, categorizedCases, enabledPhaseSet, persistenceDisabled } = context;
  const caseSnapshots = buildCaseSnapshots(runResult.cases);
  const summary = runResult.summary;
  const skipped = Math.max(summary.total - summary.passed - summary.failed, 0);

  const storedResult: StoredRunResult = {
    suiteId: suiteRecord.id,
    runId: runResult.runId,
    startedAt: runResult.startedAt,
    finishedAt: runResult.finishedAt,
    summary: {
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      skipped,
      durationMs: summary.durationMs ?? null,
    },
    cases: caseSnapshots,
  };

  if (persistenceDisabled) {
    return storedResult;
  }

  await prisma.testRun.create({
    data: {
      suiteId: suiteRecord.id,
      actor,
      env: origin,
      results: storedResult as unknown as Prisma.InputJsonValue,
    },
  });

  const categorizedLookup = new Map(
    categorizedCases.map((testCase) => [testCase.id, testCase.expect?.status ?? null])
  );

  const tracePayloads = caseSnapshots.map((snapshot) => {
    const expectedStatus = categorizedLookup.get(snapshot.id) ?? null;
    return {
      projectId: suiteRecord.projectId,
      requestMeta: {
        suiteId: suiteRecord.id,
        suiteName: suiteRecord.name,
        caseId: snapshot.id,
        caseName: snapshot.name,
        runId: runResult.runId,
        expectedStatus,
      } as Prisma.InputJsonValue,
      responseMeta: {
        status: snapshot.response?.status ?? null,
        body: snapshot.response?.body ?? null,
        origin,
      } as Prisma.InputJsonValue,
      verdict: snapshot.status === 'passed' ? 'pass' : 'fail',
    };
  });

  if (tracePayloads.length > 0) {
    await prisma.$transaction(
      tracePayloads.map((payload) => prisma.trace.create({ data: payload }))
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

  return storedResult;
}
