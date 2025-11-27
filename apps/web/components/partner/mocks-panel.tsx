'use client';

import { partnerTrpc } from '@/lib/trpc/partner/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Server, RefreshCcw, Loader2, ExternalLink, Zap, Activity } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export function PartnerMocksPanel() {
  const { data, isLoading, refetch, isRefetching } =
    partnerTrpc.project.current.useQuery(undefined, { staleTime: 60_000 });

  if (isLoading) {
    return (
      <div className="glass-crystal-card rounded-3xl p-8 text-center animate-in">
        <div className="flex items-center justify-center gap-3 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
          Loading mock instances...
        </div>
      </div>
    );
  }

  const mocks = data?.project.mocks ?? [];
  const runningCount = mocks.filter(m => m.status === 'RUNNING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 animate-in">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-400/80 font-medium">Partner Sandbox</p>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-emerald-100 to-cyan-200 bg-clip-text text-transparent">
            Mock Servers
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            These mock instances mirror SYF&apos;s reference implementation for testing flows.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="btn-crystal-outline gap-2"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCcw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button className="btn-crystal gap-2" disabled>
            <Zap className="h-4 w-4" />
            Request reset
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      {mocks.length > 0 && (
        <div className="glass-crystal-card rounded-2xl p-4 flex items-center gap-6 animate-in stagger-1">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2">
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{runningCount}</p>
              <p className="text-xs text-slate-500">Running</p>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/20 p-2">
              <Server className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{mocks.length}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
        </div>
      )}

      {/* Mocks List */}
      {mocks.length === 0 ? (
        <div className="glass-crystal-card rounded-3xl border-dashed p-10 text-center animate-in stagger-2">
          <Server className="mx-auto h-10 w-10 text-emerald-400/40 mb-3" />
          <p className="text-slate-400">No mock servers yet. Ask your SYF pod to generate mocks from the Specs page.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {mocks.map((mock, index) => {
            const isRunning = mock.status === 'RUNNING';
            
            return (
              <div
                key={mock.id}
                className="glass-crystal-card group rounded-3xl p-6 animate-in"
                style={{ animationDelay: `${(index + 2) * 100}ms` }}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-xl p-3 transition-all ${
                      isRunning 
                        ? 'bg-emerald-500/20 animate-pulse-soft' 
                        : 'bg-amber-500/20'
                    }`}>
                      <Server className={`h-5 w-5 ${
                        isRunning ? 'text-emerald-400' : 'text-amber-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-cyan-100 transition-colors">
                        Mock #{mock.id.slice(-4)}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Updated {formatDateTime(mock.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <Badge className={
                    isRunning ? 'badge-success-crystal' : 'badge-warning-crystal'
                  }>
                    {isRunning && <span className="mr-1.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />}
                    {mock.status.toLowerCase()}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl bg-black/30 border border-white/5 p-3">
                    <p className="text-xs text-slate-500 mb-1">Base URL</p>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm text-cyan-300 font-mono truncate">{mock.baseUrl}</code>
                      {isRunning && (
                        <a 
                          href={mock.baseUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-slate-500 hover:text-cyan-400 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {mock.config && (
                    <div className="rounded-xl bg-black/20 border border-white/5 p-3">
                      <p className="text-xs text-slate-500 mb-1">Configuration</p>
                      <pre className="text-xs text-slate-400 font-mono overflow-x-auto">
                        {JSON.stringify(mock.config, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
