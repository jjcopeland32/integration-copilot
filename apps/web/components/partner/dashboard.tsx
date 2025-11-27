'use client';

import { partnerTrpc } from '@/lib/trpc/partner/client';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  FileText,
  FlaskConical,
  LineChart,
  Loader2,
  Target,
  Sparkles,
  TrendingUp,
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
      <div className="glass-crystal-card flex items-center gap-3 rounded-3xl p-6 text-sm text-slate-300 animate-in">
        <div className="relative">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          <div className="absolute inset-0 animate-ping opacity-30">
            <Loader2 className="h-5 w-5 text-cyan-400" />
          </div>
        </div>
        Loading partner workspace...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-crystal-card rounded-3xl border border-dashed border-cyan-500/30 p-10 text-center text-slate-300 animate-in">
        <Sparkles className="mx-auto h-8 w-8 text-cyan-400/50 mb-3" />
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

  const progressPercent = planItems.length > 0 
    ? Math.round((completedPlan / planItems.length) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Metric Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<FileText className="h-5 w-5" />}
          label="Specs"
          value={`${specs.length}`}
          helper="Blueprints shared by SYF"
          gradient="from-cyan-500 to-blue-600"
          delay={0}
        />
        <MetricCard
          icon={<FlaskConical className="h-5 w-5" />}
          label="Golden Tests"
          value={`${suites.length}`}
          helper="Suites ready to execute"
          gradient="from-purple-500 to-pink-600"
          delay={1}
        />
        <MetricCard
          icon={<Activity className="h-5 w-5" />}
          label="Running Mocks"
          value={`${runningMocks}`}
          helper="Sandbox endpoints live"
          gradient="from-emerald-500 to-teal-600"
          delay={2}
        />
        <MetricCard
          icon={<LineChart className="h-5 w-5" />}
          label="Traces (24h)"
          value={`${traces.length}`}
          helper="Latest telemetry captured"
          gradient="from-amber-500 to-orange-600"
          delay={3}
        />
      </div>

      {/* Two Column Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plan Readiness */}
        <div className="glass-crystal-card rounded-3xl p-6 animate-in stagger-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 p-2.5">
                <Target className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Plan Readiness</h3>
                <p className="text-sm text-slate-400">
                  {completedPlan} / {planItems.length} milestones complete
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-cyan-400">{progressPercent}%</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6 h-2 rounded-full bg-slate-800/50 overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="space-y-3">
            {nextPlanItems.length === 0 ? (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span>All milestones complete! Upload evidence on the Plan page.</span>
                </div>
              </div>
            ) : (
              nextPlanItems.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-2xl border border-white/5 bg-white/5 p-4 text-sm transition-all duration-300 hover:bg-white/10 hover:border-cyan-500/20"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white group-hover:text-cyan-100 transition-colors">{item.title}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mt-1">
                        {item.phase}
                      </p>
                    </div>
                    <Badge
                      className={
                        item.status === 'DONE'
                          ? 'badge-success-crystal'
                          : item.status === 'IN_PROGRESS'
                            ? 'badge-crystal'
                            : 'badge-warning-crystal'
                      }
                    >
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {item.dueAt && (
                    <p className="mt-3 text-xs text-slate-500">
                      Due <span className="text-cyan-400/70">{formatDateTime(item.dueAt)}</span>
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Latest Partner Runs */}
        <div className="glass-crystal-card rounded-3xl p-6 animate-in stagger-5">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-600/20 p-2.5">
              <FlaskConical className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Latest Partner Runs</h3>
              <p className="text-sm text-slate-400">
                Review your most recent golden test executions.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {recentRuns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-slate-400">
                <FlaskConical className="mx-auto h-8 w-8 text-purple-400/40 mb-3" />
                <p>No partner-triggered runs yet.</p>
                <p className="text-xs text-slate-500 mt-1">Generate mocks and request a run from the SYF team.</p>
              </div>
            ) : (
              recentRuns.map((run) => {
                const passRate = run.summary?.total 
                  ? Math.round(((run.summary.passed ?? 0) / run.summary.total) * 100)
                  : 0;
                const isPassing = passRate >= 80;

                return (
                  <div
                    key={run.id}
                    className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-4 text-sm transition-all duration-300 hover:bg-white/10 hover:border-purple-500/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        isPassing 
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-white group-hover:text-purple-100 transition-colors">{run.suiteName}</p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(run.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isPassing ? 'text-emerald-400' : 'text-red-400'}`}>
                        {run.summary?.passed ?? 0}/{run.summary?.total ?? 0}
                      </p>
                      {typeof run.summary?.durationMs === 'number' && (
                        <p className="text-xs text-slate-500">
                          {(run.summary.durationMs / 1000).toFixed(1)}s
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
  gradient,
  delay,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  gradient: string;
  delay: number;
}) {
  return (
    <div 
      className="glass-crystal-card group rounded-3xl p-6 animate-in relative overflow-hidden"
      style={{ animationDelay: `${delay * 100}ms` }}
    >
      {/* Gradient overlay on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
      
      {/* Inner glow effect */}
      <div className="absolute inset-0 crystal-inner-glow opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className={`rounded-xl bg-gradient-to-br ${gradient} p-2.5 shadow-lg`}>
            <span className="text-white">{icon}</span>
          </div>
          <span className="text-sm font-medium text-slate-400">{label}</span>
        </div>
        <p className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
          {value}
        </p>
        <p className="mt-2 text-sm text-slate-500">{helper}</p>
      </div>
    </div>
  );
}
