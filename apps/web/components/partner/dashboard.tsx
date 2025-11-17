'use client';

import { partnerTrpc } from '@/lib/trpc/partner/client';
import type { ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  FileText,
  FlaskConical,
  LineChart,
  Loader2,
  Target,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

type RunResult = {
  summary?: {
    total?: number;
    passed?: number;
    failed?: number;
    durationMs?: number;
  };
};

export function PartnerDashboard() {
  const { data, isLoading } = partnerTrpc.project.current.useQuery(undefined, {
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading partner workspace...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-10 text-center text-slate-300">
        Unable to load partner project. Refresh or request a new invite.
      </div>
    );
  }

  const specs = data.project.specs ?? [];
  const planItems = data.project.planItems ?? [];
  const traces = data.project.traces ?? [];
  const mocks = data.project.mocks ?? [];
  const suites = data.project.suites ?? [];

  const completedPlan = planItems.filter((item) => item.status === 'DONE')
    .length;
  const nextPlanItems = planItems
    .filter((item) => item.status !== 'DONE')
    .slice(0, 3);
  const runningMocks = mocks.filter((mock) => mock.status === 'RUNNING').length;

  const recentRuns = suites
    .flatMap((suite) => {
      const latestRun = suite.runs?.[0] as
        | ({ results?: RunResult; createdAt: Date } & { id: string })
        | undefined;
      return latestRun
        ? [
            {
              id: latestRun.id,
              suiteName: suite.name,
              createdAt: latestRun.createdAt,
              summary: latestRun.results?.summary,
            },
          ]
        : [];
    })
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<FileText className="h-5 w-5" />}
          label="Specs"
          value={`${specs.length}`}
          helper="Blueprints shared by SYF"
        />
        <MetricCard
          icon={<FlaskConical className="h-5 w-5" />}
          label="Golden Tests"
          value={`${suites.length}`}
          helper="Suites ready to execute"
        />
        <MetricCard
          icon={<Activity className="h-5 w-5" />}
          label="Running Mocks"
          value={`${runningMocks}`}
          helper="Sandbox endpoints live"
        />
        <MetricCard
          icon={<LineChart className="h-5 w-5" />}
          label="Traces (24h)"
          value={`${traces.length}`}
          helper="Latest telemetry captured"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/5 text-slate-50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-blue-300" />
              Plan Readiness
            </CardTitle>
            <p className="text-sm text-slate-300">
              {completedPlan} / {planItems.length} milestones complete
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextPlanItems.length === 0 ? (
              <p className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                Pending evidence? Upload proof on the Plan page to close the loop.
              </p>
            ) : (
              nextPlanItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        {item.phase}
                      </p>
                    </div>
                    <Badge
                      variant={
                        item.status === 'DONE'
                          ? 'success'
                          : item.status === 'IN_PROGRESS'
                            ? 'info'
                            : 'outline'
                      }
                    >
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {item.dueAt && (
                    <p className="mt-2 text-xs text-slate-400">
                      Due {formatDateTime(item.dueAt)}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-slate-50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FlaskConical className="h-5 w-5 text-purple-300" />
              Latest Partner Runs
            </CardTitle>
            <p className="text-sm text-slate-300">
              Review your most recent golden test executions.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentRuns.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-6 text-center text-sm text-slate-300">
                No partner-triggered runs yet. Generate mocks and request a run from the SYF team.
              </p>
            ) : (
              recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-white">{run.suiteName}</p>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(run.createdAt)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-300">
                    <p>
                      Passed {run.summary?.passed ?? 0}/{run.summary?.total ?? 0}
                    </p>
                    {typeof run.summary?.durationMs === 'number' && (
                      <p className="text-slate-500">
                        {(run.summary.durationMs / 1000).toFixed(1)}s
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="border-white/10 bg-white/5 text-slate-50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-base">
          <span className="rounded-2xl bg-white/10 p-2 text-blue-200">{icon}</span>
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-semibold text-white">{value}</p>
        <p className="mt-2 text-sm text-slate-300">{helper}</p>
      </CardContent>
    </Card>
  );
}
