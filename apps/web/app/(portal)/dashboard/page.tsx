'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCode, Server, TestTube, Activity, TrendingUp, Clock, Zap, AlertTriangle } from 'lucide-react';
import { useProjectContext } from '@/components/project-context';
import { trpc } from '@/lib/trpc/client';

export default function DashboardPage() {
  const { projectId, projectName } = useProjectContext();

  if (!projectId) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-12 text-center shadow-inner">
        <h2 className="text-2xl font-semibold text-gray-900">Select a project to view the dashboard</h2>
        <p className="mt-2 text-sm text-gray-600">Choose a project in the Projects view to focus the dashboard, specs, mocks, tests, and traces.</p>
        <Link href="/projects" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg">
          Go to Projects
        </Link>
      </div>
    );
  }

  const projectQuery = trpc.project.get.useQuery({ id: projectId });
  const project = projectQuery.data;

  if (projectQuery.isLoading || !project) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white/70 p-12 text-center text-gray-500 shadow-inner">
        Loading project metrics…
      </div>
    );
  }

  const specCount = project.specs.length;
  const mockCount = project.mocks.length;
  const runningMocks = project.mocks.filter((mock: any) => mock.status === 'RUNNING').length;
  const healthyMocks = project.mocks.filter((mock: any) => (mock as any).healthStatus === 'healthy').length;
  const unhealthyMocks = project.mocks.filter((mock: any) => (mock as any).healthStatus === 'unhealthy').length;
  const suiteCount = project.suites.length;
  const totalCases = project.suites.reduce((sum: number, suite: any) => {
    const cases = Array.isArray(suite.cases as unknown[]) ? (suite.cases as unknown[]).length : 0;
    return sum + cases;
  }, 0);
  const totalPassed = project.suites.reduce((sum: number, suite: any) => {
    const latestRun = suite.runs?.[0] as { results?: Record<string, any> } | undefined;
    const passedValue = latestRun?.results?.passed;
    return sum + (typeof passedValue === 'number' ? passedValue : 0);
  }, 0);
  const passRate = totalCases > 0 ? Math.round((totalPassed / totalCases) * 100) : 0;
  const traceCount = project.traces.length;
  const recentTraces = project.traces.slice(0, 4);
  const recentTestRuns = project.suites
    .map((suite: any) => {
      const latestRun = suite.runs?.[0] as { results?: Record<string, any>; createdAt?: string } | undefined;
      if (!latestRun?.results) return null;
      return {
        suiteId: suite.id,
        suiteName: suite.name,
        summary: latestRun.results.summary as { passed?: number; total?: number } | undefined,
        finishedAt: latestRun.results.finishedAt ?? latestRun.createdAt ?? null,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => {
      const dateA = a?.finishedAt ? new Date(a.finishedAt).getTime() : 0;
      const dateB = b?.finishedAt ? new Date(b.finishedAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 4) as Array<{
      suiteId: string;
      suiteName: string;
      summary?: { passed?: number; total?: number };
      finishedAt: string | null;
    }>;

  const stats = [
    {
      title: 'Specs',
      value: specCount,
      change: `${suiteCount} suites`,
      icon: FileCode,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      title: 'Mocks',
      value: mockCount,
      change: `${runningMocks} running • ${healthyMocks} healthy${unhealthyMocks ? ` • ${unhealthyMocks} unhealthy` : ''}`,
      icon: Server,
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50 to-emerald-50',
    },
    {
      title: 'Tests',
      value: suiteCount,
      change: `${passRate}% pass rate`,
      icon: TestTube,
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50',
    },
    {
      title: 'Traces',
      value: traceCount,
      change: project.traces.length > 0 ? 'Latest telemetry available' : 'No traces yet',
      icon: Activity,
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-50 to-red-50',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="animate-in">
        <h1 className="text-4xl font-bold gradient-text mb-2">
          {projectName ? `${projectName} overview` : 'Project overview'}
        </h1>
        <p className="text-lg text-gray-600">
          Live metrics for specs, mocks, tests, and telemetry.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card
            key={stat.title}
            className="card-hover animate-in group"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.bgGradient} group-hover:scale-110 transition-transform duration-300`}>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500 mt-2">{stat.change}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {unhealthyMocks > 0 && (
          <Card className="animate-in border-red-200 bg-red-50/60" style={{ animationDelay: '350ms' }}>
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/90">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-red-900">Mock Health Alert</CardTitle>
                <CardDescription className="text-red-700">
                  {unhealthyMocks} mock{unhealthyMocks > 1 ? 's' : ''} reported unhealthy. Run health checks or restart.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        )}

        <Card className="animate-in" style={{ animationDelay: '400ms' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl">Recent Traces</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {recentTraces.length === 0 ? (
              <p className="text-sm text-gray-500">No telemetry yet. Post to /api/trace to see live activity.</p>
            ) : (
              <div className="space-y-3">
                {recentTraces.map((trace: any) => {
                  const verdict = (trace.verdict ?? '').toUpperCase();
                  const method = trace.requestMeta?.method ?? 'POST';
                  const path = trace.requestMeta?.path ?? '/';
                  const timestamp = trace.createdAt
                    ? new Date(trace.createdAt).toLocaleString()
                    : trace.requestMeta?.timestamp ?? '—';
                  return (
                    <div key={trace.id} className="flex items-start gap-4 rounded-xl bg-gradient-to-r from-gray-50 to-blue-50 p-4">
                      <Badge variant={verdict === 'PASS' ? 'success' : 'error'}>{verdict || 'UNKNOWN'}</Badge>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{method} {path}</p>
                        <p className="text-xs text-gray-500">{timestamp}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-in" style={{ animationDelay: '500ms' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl">Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Manage Specs', gradient: 'from-blue-500 to-cyan-500', href: '/specs' },
                { label: 'Manage Mocks', gradient: 'from-green-500 to-emerald-500', href: '/mocks' },
                { label: 'Run Tests', gradient: 'from-purple-500 to-pink-500', href: '/tests' },
                { label: 'View Traces', gradient: 'from-orange-500 to-red-500', href: '/traces' },
              ].map((action) => (
                <Link
                  href={action.href}
                  key={action.label}
                  className={`block w-full rounded-xl bg-gradient-to-r ${action.gradient} p-4 text-white shadow-lg transition hover:shadow-xl`}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="animate-in" style={{ animationDelay: '600ms' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <TestTube className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl">Recent Test Runs</CardTitle>
            </div>
            <CardDescription>Latest golden suite executions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTestRuns.length === 0 ? (
              <p className="text-sm text-gray-500">No tests have been executed yet.</p>
            ) : (
              <div className="space-y-3">
                {recentTestRuns.map((run) => {
                  const passed = run.summary?.passed ?? 0;
                  const total = run.summary?.total ?? 0;
                  const dateLabel = run.finishedAt
                    ? new Date(run.finishedAt).toLocaleString()
                    : '—';
                  const success = total > 0 && passed === total;
                  return (
                    <div
                      key={run.suiteId}
                      className="flex items-start gap-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 p-4"
                    >
                      <Badge variant={success ? 'success' : 'warning'}>
                        {passed}/{total}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{run.suiteName}</p>
                        <p className="text-xs text-gray-500">{dateLabel}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
