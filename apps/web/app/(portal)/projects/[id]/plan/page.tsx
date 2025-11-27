'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Rocket, Webhook, TestTube2, Award, CheckCircle, Clock, AlertCircle, Activity, Notebook, Gauge } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

const iconMap: Record<
  string,
  { icon: any; gradient: string; label: string }
> = {
  auth: { icon: Lock, gradient: 'from-blue-500 to-cyan-500', label: 'Authentication' },
  core: { icon: Rocket, gradient: 'from-purple-500 to-pink-500', label: 'Core Integration' },
  webhooks: { icon: Webhook, gradient: 'from-green-500 to-emerald-500', label: 'Webhooks' },
  uat: { icon: TestTube2, gradient: 'from-orange-500 to-red-500', label: 'UAT' },
  cert: { icon: Award, gradient: 'from-indigo-500 to-purple-500', label: 'Certification' },
};

const statusStyles: Record<
  string,
  { icon: any; card: string; text: string; badgeVariant: 'success' | 'warning' | 'error' | 'default' }
> = {
  DONE: {
    icon: CheckCircle,
    card: 'bg-gradient-to-r from-green-50 to-emerald-50',
    text: 'text-emerald-900',
    badgeVariant: 'success',
  },
  IN_PROGRESS: {
    icon: Clock,
    card: 'bg-gradient-to-r from-sky-50 to-indigo-50',
    text: 'text-sky-900',
    badgeVariant: 'warning',
  },
  BLOCKED: {
    icon: AlertCircle,
    card: 'bg-gradient-to-r from-rose-50 to-orange-50',
    text: 'text-rose-900',
    badgeVariant: 'error',
  },
  TODO: {
    icon: Activity,
    card: 'bg-gray-50',
    text: 'text-gray-700',
    badgeVariant: 'default',
  },
};

export default function ProjectPlanPage() {
  const params = useParams();
  const projectId = params.id as string;

  const planQuery = trpc.plan.get.useQuery({ projectId });
  const phases = planQuery.data?.phases ?? [];
  const config = planQuery.data?.config;

  if (planQuery.isLoading) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white/70 p-12 text-center text-gray-500 shadow-inner">
        Loading plan board…
      </div>
    );
  }

  const totalItems = phases.reduce((sum, phase) => sum + (phase.total ?? 0), 0);
  const totalDone = phases.reduce((sum, phase) => sum + (phase.done ?? 0), 0);
  const progress = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;

  if (!planQuery.isLoading && phases.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-12 text-center shadow-inner">
        <h2 className="text-2xl font-semibold text-gray-900">No phases enabled for this project</h2>
        <p className="mt-2 text-sm text-gray-600">
          Configure the scope from the Overview tab to populate the plan board.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-in">
        <h1 className="text-4xl font-bold gradient-text">Plan Board</h1>
        <p className="text-lg text-gray-600 mt-2">Track your 5-phase integration roadmap</p>
      </div>

      <Card className="animate-in">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall Progress</p>
              <p className="text-3xl font-bold gradient-text">{progress}%</p>
            </div>
            <Badge variant="gradient" className="text-lg px-4 py-2">
              {totalDone} / {totalItems || 0} Complete
            </Badge>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {phases.map((phase, index) => {
          const meta = iconMap[phase.key] ?? { icon: Rocket, gradient: 'from-gray-500 to-gray-700', label: phase.title };
          const settings = config?.[phase.key];
          const scenarios = settings?.uatScenarios ?? [];
          const benchmarks = settings?.performanceBenchmark ?? null;
          return (
            <Card key={phase.key} className="card-hover animate-in" style={{ animationDelay: `${index * 100}ms` }}>
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${meta.gradient} shadow-lg`}>
                    <meta.icon className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant={phase.done === phase.total ? 'success' : phase.done ? 'info' : 'default'}>
                    {phase.done}/{phase.total}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{meta.label ?? phase.title}</CardTitle>
                <p className="mt-2 text-sm text-gray-500">{phase.description}</p>
              </CardHeader>
              <CardContent>
                {phase.items.length === 0 ? (
                  <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">No checklist items yet.</div>
                ) : (
                  <div className="space-y-2">
                    {phase.items.map((item: any) => {
                      const status = statusStyles[item.status] ?? statusStyles.TODO;
                      const StatusIcon = status.icon;
                      return (
                        <div key={item.id} className={`rounded-xl p-3 transition ${status.card}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="rounded-full bg-white/60 p-2 shadow-inner">
                                <StatusIcon className={`h-4 w-4 ${status.text}`} />
                              </div>
                              <div>
                                <p className={`text-sm font-medium ${status.text}`}>{item.title}</p>
                                <p className="text-xs text-gray-500">
                                  {item.dueAt ? `Due ${new Date(item.dueAt).toLocaleDateString()}` : 'No due date'}
                                  {item.evidenceCount ? ` • ${item.evidenceCount} evidence item${item.evidenceCount > 1 ? 's' : ''}` : ''}
                                </p>
                              </div>
                            </div>
                            <Badge variant={status.badgeVariant}>{item.status.replace('_', ' ')}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {settings?.notes && (
                  <div className="mt-3 flex items-start gap-2 rounded-2xl bg-indigo-50/70 p-3 text-xs text-indigo-900">
                    <Notebook className="mt-0.5 h-4 w-4" />
                    <p>{settings.notes}</p>
                  </div>
                )}
                {scenarios.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-dashed border-gray-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">UAT Scenarios</p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-700">
                      {scenarios.map((scenario) => (
                        <li key={scenario.id} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                          {scenario.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {benchmarks && (
                  <div className="mt-3 grid gap-3 rounded-2xl border border-gray-100 bg-white/70 p-3 text-xs text-gray-700 sm:grid-cols-3">
                    {typeof benchmarks.targetLatencyMs === 'number' && (
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-indigo-500" />
                        <span>{benchmarks.targetLatencyMs}ms target</span>
                      </div>
                    )}
                    {typeof benchmarks.maxErrorRatePercent === 'number' && (
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-rose-500" />
                        <span>≤ {benchmarks.maxErrorRatePercent}% errors</span>
                      </div>
                    )}
                    {typeof benchmarks.targetSuccessRatePercent === 'number' && (
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-emerald-500" />
                        <span>{benchmarks.targetSuccessRatePercent}% success</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

