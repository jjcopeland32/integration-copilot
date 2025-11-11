'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Play, Square, Download, Activity, Trash2 } from 'lucide-react';
import { useProjectContext } from '@/components/project-context';
import { trpc } from '@/lib/trpc/client';
import { useMemo } from 'react';

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

  const mocks = mocksQuery.data ?? [];
  const isLoading = mocksQuery.isLoading;

  const totalMocks = mocks.length;
  const runningMocks = useMemo(() => mocks.filter((mock) => mock.status === 'RUNNING').length, [mocks]);

  const deleteMutation = trpc.mock.delete.useMutation({
    onSuccess: async () => {
      await utils.mock.list.invalidate(projectId ? { projectId } : undefined);
    },
  });

  const handleDownload = (mock: any) => {
    const collection = mock?.config?.postmanCollection;
    if (!collection) return;
    const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${mock.name.replace(/\s+/g, '-').toLowerCase()}-postman.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDelete = (mock: any) => {
    if (!window.confirm(`Delete mock service at ${mock.baseUrl}? This cannot be undone.`)) {
      return;
    }
    deleteMutation.mutate({ id: mock.id });
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
            const routes = mock.config?.routes?.length ?? 0;
            const specLabel = mock.config?.specName ?? mock.name ?? `Mock #${index + 1}`;
            const port = (() => {
              try {
                const url = new URL(mock.baseUrl);
                return url.port || (url.protocol === 'https:' ? '443' : '80');
              } catch {
                return mock.baseUrl?.split(':').pop() ?? '—';
              }
            })();
            return (
              <Card key={mock.id} className="card-hover animate-in" style={{ animationDelay: `${index * 100}ms` }}>
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
                      <Server className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={running ? 'success' : 'default'}>{mock.status}</Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-gray-500 hover:text-red-500"
                        onClick={() => handleDelete(mock)}
                        disabled={deleteMutation.isLoading}
                        title="Delete mock"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-xl">{specLabel}</CardTitle>
                  <p className="text-sm text-gray-500">{mock.baseUrl}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-gray-50 to-blue-50 p-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <span>{routes} routes</span>
                    </div>
                    <span className="text-xs text-gray-400">Port {port}</span>
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
                      disabled={startMutation.isLoading || stopMutation.isLoading}
                    >
                      {running ? <Square className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                      {running ? 'Stop' : 'Start'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(mock)}
                      disabled={!mock.config?.postmanCollection}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
