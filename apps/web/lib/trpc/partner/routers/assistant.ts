import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  createPartnerRouter,
  partnerProtectedProcedure,
} from '../server';

type TestRunSummary = {
  total: number;
  passed: number;
  failed: number;
  durationMs?: number;
};

type TestCaseResult = {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  error?: string;
  durationMs?: number;
};

type RunResult = {
  summary?: TestRunSummary;
  cases?: TestCaseResult[];
  finishedAt?: string;
};

type PlanItemStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';

function buildContextSummary(data: {
  projectName: string;
  partnerName: string | null;
  suites: Array<{
    name: string;
    runs: Array<{
      results: unknown;
      createdAt: Date;
    }>;
  }>;
  planItems: Array<{
    phase: string;
    title: string;
    status: PlanItemStatus;
    evidences: Array<{ id: string }>;
  }>;
  traces: Array<{
    verdict: string;
    requestMeta: unknown;
    createdAt: Date;
  }>;
}) {
  // Analyze test results
  const testAnalysis: string[] = [];
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  const failingTests: { suite: string; cases: string[] }[] = [];

  for (const suite of data.suites) {
    const latestRun = suite.runs[0];
    if (!latestRun) continue;

    const results = latestRun.results as RunResult | undefined;
    if (!results?.summary) continue;

    totalTests += results.summary.total ?? 0;
    totalPassed += results.summary.passed ?? 0;
    totalFailed += results.summary.failed ?? 0;

    // Find failing cases
    if (results.cases) {
      const failedCases = results.cases
        .filter((c) => c.status === 'fail')
        .map((c) => c.name);
      if (failedCases.length > 0) {
        failingTests.push({ suite: suite.name, cases: failedCases });
      }
    }
  }

  const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

  if (totalTests > 0) {
    testAnalysis.push(`Test pass rate: ${passRate}% (${totalPassed}/${totalTests})`);
    if (totalFailed > 0) {
      testAnalysis.push(`${totalFailed} failing test${totalFailed > 1 ? 's' : ''} need attention`);
    }
  } else {
    testAnalysis.push('No test runs yet. Consider running golden tests to validate your integration.');
  }

  // Analyze plan progress
  const planAnalysis: string[] = [];
  const phaseProgress: Record<string, { done: number; total: number; blocked: number }> = {};

  for (const item of data.planItems) {
    if (!phaseProgress[item.phase]) {
      phaseProgress[item.phase] = { done: 0, total: 0, blocked: 0 };
    }
    phaseProgress[item.phase].total++;
    if (item.status === 'DONE') phaseProgress[item.phase].done++;
    if (item.status === 'BLOCKED') phaseProgress[item.phase].blocked++;
  }

  const blockedItems = data.planItems.filter((p) => p.status === 'BLOCKED');
  const todoItems = data.planItems.filter((p) => p.status === 'TODO');
  const inProgressItems = data.planItems.filter((p) => p.status === 'IN_PROGRESS');
  const doneItems = data.planItems.filter((p) => p.status === 'DONE');

  const overallProgress =
    data.planItems.length > 0
      ? Math.round((doneItems.length / data.planItems.length) * 100)
      : 0;

  planAnalysis.push(`Plan progress: ${overallProgress}% complete (${doneItems.length}/${data.planItems.length} items done)`);

  if (blockedItems.length > 0) {
    planAnalysis.push(`${blockedItems.length} item${blockedItems.length > 1 ? 's' : ''} blocked`);
  }
  if (inProgressItems.length > 0) {
    planAnalysis.push(`${inProgressItems.length} item${inProgressItems.length > 1 ? 's' : ''} in progress`);
  }

  // Analyze traces
  const traceAnalysis: string[] = [];
  const passTraces = data.traces.filter((t) => t.verdict?.toLowerCase() === 'pass');
  const failTraces = data.traces.filter((t) => t.verdict?.toLowerCase() === 'fail');

  if (data.traces.length > 0) {
    traceAnalysis.push(`Recent traces: ${passTraces.length} pass, ${failTraces.length} fail`);
  } else {
    traceAnalysis.push('No telemetry traces yet. Start sending requests to /api/trace to track your integration.');
  }

  return {
    testAnalysis,
    planAnalysis,
    traceAnalysis,
    failingTests,
    blockedItems: blockedItems.map((b) => ({ phase: b.phase, title: b.title })),
    nextActions: generateNextActions({
      passRate,
      totalTests,
      totalFailed,
      overallProgress,
      blockedItems: blockedItems.length,
      inProgressItems: inProgressItems.length,
      failTraces: failTraces.length,
      failingTests,
    }),
    stats: {
      passRate,
      totalTests,
      totalPassed,
      totalFailed,
      planProgress: overallProgress,
      planTotal: data.planItems.length,
      planDone: doneItems.length,
      planBlocked: blockedItems.length,
      traces: data.traces.length,
    },
  };
}

function generateNextActions(data: {
  passRate: number;
  totalTests: number;
  totalFailed: number;
  overallProgress: number;
  blockedItems: number;
  inProgressItems: number;
  failTraces: number;
  failingTests: { suite: string; cases: string[] }[];
}): string[] {
  const actions: string[] = [];

  // Priority 1: Blocked items
  if (data.blockedItems > 0) {
    actions.push('Resolve blocked plan items to unblock progress');
  }

  // Priority 2: Failing tests
  if (data.totalFailed > 0 && data.failingTests.length > 0) {
    const topFailing = data.failingTests[0];
    actions.push(`Fix failing tests in "${topFailing.suite}" suite (${topFailing.cases.length} failing)`);
  }

  // Priority 3: No tests run
  if (data.totalTests === 0) {
    actions.push('Run golden tests to establish a baseline for your integration');
  }

  // Priority 4: Low pass rate
  if (data.totalTests > 0 && data.passRate < 90) {
    actions.push(`Improve test pass rate from ${data.passRate}% to 90%+ for certification`);
  }

  // Priority 5: Plan progress
  if (data.overallProgress < 100 && data.inProgressItems === 0 && data.blockedItems === 0) {
    actions.push('Start working on the next plan item to continue progress');
  }

  // Priority 6: Trace failures
  if (data.failTraces > 0) {
    actions.push('Investigate failing telemetry traces for integration issues');
  }

  // Default positive message
  if (actions.length === 0) {
    if (data.passRate >= 90 && data.overallProgress === 100) {
      actions.push('Outstanding! You\'re on track for certification. Review the readiness report.');
    } else if (data.passRate >= 90) {
      actions.push('Tests are passing well. Continue completing plan items.');
    } else {
      actions.push('Keep up the momentum! Check test results and plan items.');
    }
  }

  return actions.slice(0, 3); // Return top 3 actions
}

function generateResponse(
  question: string,
  context: ReturnType<typeof buildContextSummary>
): string {
  const q = question.toLowerCase();

  // Handle status/overview questions
  if (q.includes('status') || q.includes('how am i doing') || q.includes('overview') || q.includes('progress')) {
    const lines = [
      `Here's your integration status:`,
      '',
      `📊 **Tests**: ${context.stats.passRate}% pass rate (${context.stats.totalPassed}/${context.stats.totalTests})`,
      `📋 **Plan**: ${context.stats.planProgress}% complete (${context.stats.planDone}/${context.stats.planTotal} items)`,
      `📡 **Traces**: ${context.stats.traces} recent telemetry events`,
      '',
      '**Next steps:**',
      ...context.nextActions.map((a) => `• ${a}`),
    ];
    return lines.join('\n');
  }

  // Handle failing/error questions
  if (q.includes('fail') || q.includes('error') || q.includes('wrong') || q.includes('issue') || q.includes('problem')) {
    if (context.failingTests.length === 0 && context.blockedItems.length === 0) {
      return 'Great news! I don\'t see any failing tests or blocked items. Your integration looks healthy. Keep running tests to maintain coverage.';
    }

    const lines: string[] = [];
    if (context.failingTests.length > 0) {
      lines.push('**Failing Tests:**');
      for (const ft of context.failingTests.slice(0, 3)) {
        lines.push(`• **${ft.suite}**: ${ft.cases.slice(0, 3).join(', ')}${ft.cases.length > 3 ? ` (+${ft.cases.length - 3} more)` : ''}`);
      }
      lines.push('');
    }
    if (context.blockedItems.length > 0) {
      lines.push('**Blocked Plan Items:**');
      for (const bi of context.blockedItems.slice(0, 3)) {
        lines.push(`• [${bi.phase}] ${bi.title}`);
      }
    }
    return lines.join('\n');
  }

  // Handle test questions
  if (q.includes('test')) {
    if (context.stats.totalTests === 0) {
      return 'No test runs yet! Head to the Tests page and run the golden test suites to validate your integration against our baseline requirements.';
    }
    const lines = [
      `**Test Results:**`,
      `• Pass rate: ${context.stats.passRate}%`,
      `• Passed: ${context.stats.totalPassed}`,
      `• Failed: ${context.stats.totalFailed}`,
      `• Total: ${context.stats.totalTests}`,
    ];
    if (context.failingTests.length > 0) {
      lines.push('', '**Suites with failures:**');
      for (const ft of context.failingTests) {
        lines.push(`• ${ft.suite} (${ft.cases.length} failing)`);
      }
    }
    return lines.join('\n');
  }

  // Handle plan/readiness questions
  if (q.includes('plan') || q.includes('readiness') || q.includes('ready') || q.includes('certification') || q.includes('go live')) {
    const lines = [
      `**Plan Progress:** ${context.stats.planProgress}%`,
      `• Done: ${context.stats.planDone} items`,
      `• Blocked: ${context.stats.planBlocked} items`,
      `• Total: ${context.stats.planTotal} items`,
    ];
    if (context.stats.planProgress >= 100 && context.stats.passRate >= 90) {
      lines.push('', '✅ You\'re on track for certification! Request a readiness review.');
    } else {
      lines.push('', '**To reach certification:**');
      lines.push(...context.nextActions.map((a) => `• ${a}`));
    }
    return lines.join('\n');
  }

  // Handle next steps questions
  if (q.includes('next') || q.includes('what should') || q.includes('recommend') || q.includes('suggest')) {
    const lines = ['**Recommended next steps:**', ...context.nextActions.map((a) => `• ${a}`)];
    return lines.join('\n');
  }

  // Handle trace questions
  if (q.includes('trace') || q.includes('telemetry') || q.includes('api') || q.includes('request')) {
    if (context.stats.traces === 0) {
      return 'No telemetry traces yet. Start sending requests to your integration and post them to /api/trace to track real-world behavior.';
    }
    return `You have ${context.stats.traces} recent traces. Check the Traces page to review request/response details and validation results.`;
  }

  // Default response with overview
  return [
    'Here\'s what I can help with:',
    '',
    ...context.testAnalysis.map((t) => `• ${t}`),
    ...context.planAnalysis.map((p) => `• ${p}`),
    '',
    '**Next steps:**',
    ...context.nextActions.map((a) => `• ${a}`),
    '',
    'Ask me about tests, plan progress, failures, or next steps!',
  ].join('\n');
}

export const partnerAssistantRouter = createPartnerRouter({
  summarize: partnerProtectedProcedure
    .input(z.object({ question: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const partnerProject = await ctx.prisma.partnerProject.findUnique({
        where: { id: ctx.session.partnerProjectId },
        include: {
          project: {
            include: {
              planItems: {
                include: {
                  evidences: {
                    where: { partnerProjectId: ctx.session.partnerProjectId },
                  },
                },
                orderBy: { createdAt: 'asc' },
              },
              suites: {
                include: {
                  runs: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                  },
                },
              },
              traces: {
                orderBy: { createdAt: 'desc' },
                take: 20,
              },
            },
          },
        },
      });

      if (!partnerProject) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const context = buildContextSummary({
        projectName: partnerProject.project.name,
        partnerName: partnerProject.partnerName,
        suites: partnerProject.project.suites,
        planItems: partnerProject.project.planItems,
        traces: partnerProject.project.traces,
      });

      const response = generateResponse(input.question, context);

      return {
        response,
        context: {
          stats: context.stats,
          nextActions: context.nextActions,
        },
      };
    }),

  getContext: partnerProtectedProcedure.query(async ({ ctx }) => {
    const partnerProject = await ctx.prisma.partnerProject.findUnique({
      where: { id: ctx.session.partnerProjectId },
      include: {
        project: {
          include: {
            planItems: {
              include: {
                evidences: {
                  where: { partnerProjectId: ctx.session.partnerProjectId },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
            suites: {
              include: {
                runs: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
            traces: {
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        },
      },
    });

    if (!partnerProject) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    const context = buildContextSummary({
      projectName: partnerProject.project.name,
      partnerName: partnerProject.partnerName,
      suites: partnerProject.project.suites,
      planItems: partnerProject.project.planItems,
      traces: partnerProject.project.traces,
    });

    return {
      projectName: partnerProject.project.name,
      partnerName: partnerProject.partnerName,
      stats: context.stats,
      nextActions: context.nextActions,
      failingTests: context.failingTests,
      blockedItems: context.blockedItems,
    };
  }),
});

