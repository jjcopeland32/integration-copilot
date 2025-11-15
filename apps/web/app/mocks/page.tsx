'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Play, Square, Download, Activity, Trash2, Gauge, Loader2 } from 'lucide-react';
import { useProjectContext } from '@/components/project-context';
import { trpc } from '@/lib/trpc/client';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/lib/trpc/root';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type MockSummary = RouterOutputs['mock']['list'][number];

export default function MocksPage() {
  const { projectId, projectName } = useProjectContext();
  const utils = trpc.useUtils();
  const mocksQuery = trpc.mock.list.useQuery(
    projectId ? { projectId } : { projectId: undefined },
    { enabled: !!projectId }
  );

  const startMutation = trpc.mock.start.useMutation({
    onSuccess: async () => {
      await utils.mock.list.invalidate(projectId ? { projectId } : undefined);
    },
  });
  const stopMutation = trpc.mock.stop.useMutation({
    onSuccess: async () => {
      await utils.mock.list.invalidate(projectId ? { projectId } : undefined);
    },
  });
  const deleteMutation = trpc.mock.delete.useMutation({
    onSuccess: async () => {
      await utils.mock.list.invalidate(projectId ? { projectId } : undefined);
    },
  });

  const mocks = useMemo(() => mocksQuery.data ?? [], [mocksQuery.data]);
  const isLoading = mocksQuery.isLoading;
  const totalMocks = mocks.length;
  const runningMocks = useMemo(() => mocks.filter((mock) => mock.status === 'RUNNING').length, [mocks]);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleDownload = (mock: MockSummary) => {
    if (!mock.postmanCollection) return;
    const blob = new Blob([JSON.stringify(mock.postmanCollection, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${mock.specName.replace(/\s+/g, '-').toLowerCase()}-postman.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(
      { id },
      {
        onSettled: () => setConfirmingId(null),
      }
    );
  };

  if (!projectId) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-12 text-center shadow-inner">
        <h2 className="text-2xl font-semibold text-gray-900">Select a project to manage mock services</h2>
        <p className="mt-2 text-sm text-gray-600">
          Mock services belong to a single integration. Choose a project first, then manage its mocks here.
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

  return (
    <div className="space-y-8">
      <div className="animate-in">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{projectName}</p>
        <h1 className="text-4xl font-bold gradient-text">Mock Services</h1>
        <p className="text-lg text-gray-600 mt-2">Manage your API mock servers</p>
        <div className="mt-4 flex gap-4 text-sm text-gray-600">
          <span>Total mocks: <strong>{totalMocks}</strong></span>
          <span>Running: <strong>{runningMocks}</strong></span>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-gray-100 bg-white/70 p-12 text-center text-gray-500 shadow-inner">
          Loading mocks…
        </div>
      ) : mocks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-12 text-center shadow-inner">
          <p className="text-gray-600">No mock services yet. Generate one from the Specs page.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mocks.map((mock, index) => {
            const running = mock.status === 'RUNNING';
            const gradient = running ? 'from-green-500 to-emerald-500' : 'from-blue-500 to-cyan-500';
            const portLabel = mock.port ? `${mock.port}` : '—';
            const showConfirm = confirmingId === mock.id;
            return (
              <Card key={mock.id} className="card-hover animate-in" style={{ animationDelay: `${index * 90}ms` }}>
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
                      <Server className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={running ? 'success' : 'default'}>{mock.status}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setConfirmingId(mock.id)}
                        disabled={deleteMutation.isPending && showConfirm}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-xl">{mock.specName}</CardTitle>
                  <p className="text-sm text-gray-500">{mock.baseUrl}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-gray-50 to-blue-50 p-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <span>{mock.routeCount} routes</span>
                    </div>
                    <span className="text-xs text-gray-400">Port {portLabel}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-gray-50 p-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Gauge className="h-3 w-3 text-indigo-500" />
                      <span>Latency: {mock.settings.latencyMs}ms</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Gauge className="h-3 w-3 text-emerald-500" />
                      <span>
                        Rate limit:{' '}
                        {mock.settings.enableRateLimit ? `${mock.settings.rateLimit}/min` : 'off'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={running ? 'destructive' : 'default'}
                      className="flex-1"
                      onClick={() =>
                        running
                          ? stopMutation.mutate({ id: mock.id })
                          : startMutation.mutate({ id: mock.id })
                      }
                      disabled={startMutation.isPending || stopMutation.isPending}
                    >
                      {running ? <Square className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                      {running ? 'Stop' : 'Start'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(mock)}
                      disabled={!mock.hasPostmanCollection}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  {showConfirm && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      <p className="font-medium">Remove this mock service?</p>
                      <p className="text-xs text-red-600/80">
                        Deleting stops the Express server and removes its stored configuration.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          onClick={() => handleDelete(mock.id)}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Removing…
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmingId(null)}
                          disabled={deleteMutation.isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
