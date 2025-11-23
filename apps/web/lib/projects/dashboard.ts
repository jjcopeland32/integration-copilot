import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type SuiteWithLatestRun = {
  runs: Array<{
    createdAt: Date;
    results: Prisma.JsonValue | null;
  }>;
};

type PlanItemLike = {
  phase: string;
  status: string;
};

type SpecLike = {
  normalized: Prisma.JsonValue | null;
};

type TraceLike = {
  verdict: string;
  responseMeta: Prisma.JsonValue | null;
};

export type ProjectDashboardSummary = {
  mocks: {
    total: number;
    running: number;
    healthy: number;
    unhealthy: number;
  };
  suites: {
    pass: number;
    fail: number;
    lastRunAt: string | null;
  };
  traces24h: {
    count: number;
    errRate: number;
    p95: number | null;
  };
  readinessPct: number;
  specs: {
    paths: number;
    capabilities: string[];
  };
};

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function getProjectDashboardSummary(
  projectId: string
): Promise<ProjectDashboardSummary> {
  const [project, recentTraces] = await prisma.$transaction([
    prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        mocks: {
          select: {
            status: true,
            healthStatus: true,
          },
        },
        suites: {
          select: {
            runs: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                createdAt: true,
                results: true,
              },
            },
          },
        },
        planItems: {
          select: {
            phase: true,
            status: true,
          },
        },
        specs: {
          select: {
            normalized: true,
          },
        },
      },
    }),
    prisma.trace.findMany({
      where: {
        projectId,
        createdAt: {
          gte: new Date(Date.now() - TWENTY_FOUR_HOURS_MS),
        },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        verdict: true,
        responseMeta: true,
      },
    }),
  ]);

  if (!project) {
    throw new Error('Project not found');
  }

  return {
    mocks: summarizeMocks(project.mocks as any),
    suites: summarizeSuites(project.suites),
    traces24h: summarizeTraces(recentTraces),
    readinessPct: calculateReadiness(project.planItems),
    specs: summarizeSpecs(project.specs),
  };
}

function summarizeMocks(
  mocks: Array<{ status: string; healthStatus?: string | null }>
): ProjectDashboardSummary['mocks'] {
  const total = mocks.length;
  let running = 0;
  let healthy = 0;
  let unhealthy = 0;

  for (const mock of mocks) {
    if (mock.status === 'RUNNING') running += 1;
    const health = (mock.healthStatus ?? '').toLowerCase();
    if (health === 'healthy') healthy += 1;
    if (health === 'unhealthy') unhealthy += 1;
  }

  return { total, running, healthy, unhealthy };
}

function summarizeSuites(suites: SuiteWithLatestRun[]): ProjectDashboardSummary['suites'] {
  let pass = 0;
  let fail = 0;
  let latestRun: Date | null = null;

  for (const suite of suites) {
    const [latest] = suite.runs;
    if (!latest) continue;
    if (!latestRun || latest.createdAt > latestRun) {
      latestRun = latest.createdAt;
    }
    const results = latest.results as any;
    const summary = results?.summary;
    const failed = typeof summary?.failed === 'number' ? summary.failed > 0 : false;
    if (failed) {
      fail += 1;
    } else {
      pass += 1;
    }
  }

  return {
    pass,
    fail,
    lastRunAt: latestRun ? latestRun.toISOString() : null,
  };
}

function summarizeTraces(traces: TraceLike[]): ProjectDashboardSummary['traces24h'] {
  const count = traces.length;
  if (count === 0) {
    return {
      count: 0,
      errRate: 0,
      p95: null,
    };
  }

  const failures = traces.filter((trace) => trace.verdict === 'fail').length;
  const errRate = Math.round((failures / count) * 100);

  const latencies = traces
    .map((trace) => {
      const response = trace.responseMeta as { latencyMs?: unknown } | null;
      const latency = response?.latencyMs;
      return typeof latency === 'number' ? latency : null;
    })
    .filter((latency): latency is number => typeof latency === 'number' && latency > 0)
    .sort((a, b) => a - b);

  const p95 =
    latencies.length > 0
      ? latencies[Math.min(latencies.length - 1, Math.max(0, Math.ceil(latencies.length * 0.95) - 1))]
      : null;

  return {
    count,
    errRate,
    p95,
  };
}

function calculateReadiness(planItems: PlanItemLike[]): number {
  if (planItems.length === 0) {
    return 0;
  }
  const phaseStats = new Map<
    string,
    {
      total: number;
      done: number;
    }
  >();

  for (const item of planItems) {
    const stats = phaseStats.get(item.phase) ?? { total: 0, done: 0 };
    stats.total += 1;
    if (item.status === 'DONE') {
      stats.done += 1;
    }
    phaseStats.set(item.phase, stats);
  }

  const completions: number[] = [];
  for (const stats of phaseStats.values()) {
    if (stats.total === 0) continue;
    completions.push((stats.done / stats.total) * 100);
  }

  if (completions.length === 0) {
    return 0;
  }
  const average = completions.reduce((sum, value) => sum + value, 0) / completions.length;
  return Math.round(average);
}

function summarizeSpecs(specs: SpecLike[]): ProjectDashboardSummary['specs'] {
  let paths = 0;
  const capabilitySet = new Set<string>();

  for (const spec of specs) {
    const normalized = spec.normalized as
      | {
          endpoints?: Array<{ summary?: string; method?: string; path?: string }>;
        }
      | null
      | undefined;

    const endpoints = Array.isArray(normalized?.endpoints) ? normalized!.endpoints : [];
    paths += endpoints.length;
    for (const endpoint of endpoints) {
      const label =
        endpoint.summary ||
        [endpoint.method, endpoint.path]
          .filter((part) => typeof part === 'string' && part.length > 0)
          .join(' ');
      if (label) {
        capabilitySet.add(label);
      }
    }
  }

  return {
    paths,
    capabilities: Array.from(capabilitySet).slice(0, 6),
  };
}
