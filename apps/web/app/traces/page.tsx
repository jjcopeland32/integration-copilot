import Link from 'next/link';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useProjectContext } from '@/components/project-context';

export default function TracesPage() {
  const { projectId, projectName } = useProjectContext();
  const projectQuery = trpc.project.get.useQuery(
    projectId ? { id: projectId } : { id: '' },
    { enabled: !!projectId }
  );
  const traces = projectQuery.data?.traces ?? [];

  if (!projectId) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-12 text-center shadow-inner">
        <h2 className="text-2xl font-semibold text-gray-900">Select a project to view traces</h2>
        <p className="mt-2 text-sm text-gray-600">
          Telemetry traces belong to a single integration. Choose a project to see its latest requests.
        </p>
        <Link
          href="/projects"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg"
        >
          View Projects
        </Link>
      </div>
    );
  }

  const totalTraces = traces.length;
  const passCount = traces.filter((trace: any) => (trace.verdict ?? '').toLowerCase() === 'pass').length;
  const passRate = totalTraces > 0 ? Math.round((passCount / totalTraces) * 100) : 0;
  const avgLatency = useMemo(() => {
    if (totalTraces === 0) return 0;
    const sum = traces.reduce((acc: number, trace: any) => {
      const latency = trace.responseMeta?.latencyMs;
      return acc + (typeof latency === 'number' ? latency : 0);
    }, 0);
    return Math.round(sum / totalTraces);
  }, [traces, totalTraces]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{projectName}</p>
        <h1 className="text-3xl font-bold">Traces</h1>
        <p className="text-gray-500 mt-2">Request/response validation traces</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Traces</CardDescription>
            <CardTitle className="text-3xl">{totalTraces}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pass Rate</CardDescription>
            <CardTitle className="text-3xl text-green-600">{passRate}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg Latency</CardDescription>
            <CardTitle className="text-3xl">{avgLatency}ms</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Traces</CardTitle>
          <CardDescription>Latest validation results</CardDescription>
        </CardHeader>
        <CardContent>
          {traces.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No traces yet. Post telemetry to /api/trace for this project.</p>
          ) : (
            <div className="space-y-4">
              {traces.map((trace: any) => {
                const verdict = (trace.verdict ?? '').toLowerCase();
                const method = trace.requestMeta?.method ?? 'POST';
                const path = trace.requestMeta?.path ?? '/';
                const status = trace.responseMeta?.statusCode ?? '—';
                const latency = trace.responseMeta?.latencyMs ?? '—';
                const timestamp = trace.createdAt
                  ? new Date(trace.createdAt).toLocaleString()
                  : trace.requestMeta?.timestamp ?? '—';
                return (
                  <div
                    key={trace.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0"
                  >
                    <div className="flex items-center gap-4">
                      {verdict === 'pass' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default">{method}</Badge>
                          <code className="text-sm">{path}</code>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-500">
                          <span>Status: {status}</span>
                          <span>{latency}ms</span>
                          <span>{timestamp}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={verdict === 'pass' ? 'success' : 'error'}>
                      {verdict.toUpperCase() || 'UNKNOWN'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
