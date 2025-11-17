'use client';

import { partnerTrpc } from '@/lib/trpc/partner/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Server, RefreshCcw } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export function PartnerMocksPanel() {
  const { data, isLoading, refetch, isRefetching } =
    partnerTrpc.project.current.useQuery(undefined, { staleTime: 60_000 });

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
        Loading mock instances...
      </div>
    );
  }

  const mocks = data?.project.mocks ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Partner Sandbox</p>
          <h1 className="text-3xl font-semibold text-white">Mock Servers</h1>
          <p className="text-sm text-slate-300">
            These mock instances mirror SYF’s reference implementation for testing flows.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2 border-white/20 text-white hover:bg-white/10"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="gradient" disabled>
            Request reset
          </Button>
        </div>
      </div>

      {mocks.length === 0 ? (
        <Card className="border-dashed border-white/20 bg-white/5 text-slate-200">
          <CardContent className="p-10 text-center">
            No mock servers yet. Ask your SYF pod to generate mocks from the Specs page.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {mocks.map((mock) => (
            <Card
              key={mock.id}
              className="border-white/10 bg-white/5 text-slate-50 backdrop-blur"
            >
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-2xl bg-purple-500/20 p-3">
                    <Server className="h-5 w-5 text-purple-200" />
                  </span>
                  <div>
                    <CardTitle className="text-xl">Mock #{mock.id.slice(-4)}</CardTitle>
                    <p className="text-sm text-slate-300">
                      Updated {formatDateTime(mock.updatedAt)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={mock.status === 'RUNNING' ? 'success' : 'warning'}
                  className="capitalize"
                >
                  {mock.status.toLowerCase()}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <p className="font-mono text-slate-100">{mock.baseUrl}</p>
                <p className="text-xs text-slate-400">
                  Config: {mock.config ? JSON.stringify(mock.config) : '—'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
