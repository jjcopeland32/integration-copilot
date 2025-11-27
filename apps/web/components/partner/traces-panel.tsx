'use client';

import { partnerTrpc } from '@/lib/trpc/partner/client';
import { Badge } from '@/components/ui/badge';
import { Activity, Loader2, CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

type TraceRecord = {
  id: string;
  verdict: string;
  requestMeta: Record<string, unknown>;
  responseMeta: Record<string, unknown>;
  createdAt: Date;
};

function extractString(meta: Record<string, unknown>, key: string) {
  const value = meta?.[key];
  return typeof value === 'string' ? value : undefined;
}

export function PartnerTracesPanel() {
  const { data, isLoading } = partnerTrpc.project.current.useQuery(undefined, {
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="glass-crystal-card rounded-3xl p-8 text-center animate-in">
        <div className="flex items-center justify-center gap-3 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
          Loading telemetry...
        </div>
      </div>
    );
  }

  const traces = (data?.project.traces ?? []) as TraceRecord[];
  const passCount = traces.filter(t => t.verdict?.toLowerCase() === 'pass').length;
  const failCount = traces.filter(t => t.verdict?.toLowerCase() === 'fail').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-in">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-400/80 font-medium">Telemetry</p>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-amber-100 to-orange-200 bg-clip-text text-transparent">
          Most Recent Traces
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Each mock/test run emits telemetry so you can debug failures.
        </p>
      </div>

      {/* Stats Bar */}
      {traces.length > 0 && (
        <div className="glass-crystal-card rounded-2xl p-4 flex items-center gap-6 animate-in stagger-1">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{passCount}</p>
              <p className="text-xs text-slate-500">Passed</p>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/20 p-2">
              <XCircle className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{failCount}</p>
              <p className="text-xs text-slate-500">Failed</p>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/20 p-2">
              <Activity className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{traces.length}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
        </div>
      )}

      {/* Traces */}
      {traces.length === 0 ? (
        <div className="glass-crystal-card rounded-3xl border-dashed p-10 text-center animate-in stagger-2">
          <Activity className="mx-auto h-10 w-10 text-amber-400/40 mb-3" />
          <p className="text-slate-400">No partner traces yet. Trigger requests against your mock sandbox to populate telemetry.</p>
        </div>
      ) : (
        <div className="glass-crystal-card rounded-3xl p-6 animate-in stagger-2">
          <div className="space-y-3">
            {traces.map((trace, index) => {
              const method =
                extractString(trace.requestMeta, 'method') ??
                extractString(trace.requestMeta, 'httpMethod') ??
                'GET';
              const path =
                extractString(trace.requestMeta, 'path') ??
                extractString(trace.requestMeta, 'url') ??
                '/';
              const status =
                extractString(trace.responseMeta, 'status') ??
                extractString(trace.responseMeta, 'statusCode') ??
                '—';
              const verdict = trace.verdict?.toLowerCase() ?? 'unknown';
              const isPass = verdict === 'pass';
              const isFail = verdict === 'fail';

              return (
                <div
                  key={trace.id}
                  className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 px-4 py-4 text-sm transition-all duration-300 hover:bg-white/5 hover:border-white/10 animate-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg p-2 ${
                      isPass ? 'bg-emerald-500/20' : 
                      isFail ? 'bg-red-500/20' : 'bg-amber-500/20'
                    }`}>
                      {isPass ? (
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      ) : isFail ? (
                        <XCircle className="h-4 w-4 text-red-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono text-white flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          method === 'GET' ? 'bg-emerald-500/20 text-emerald-300' :
                          method === 'POST' ? 'bg-blue-500/20 text-blue-300' :
                          method === 'PUT' ? 'bg-amber-500/20 text-amber-300' :
                          method === 'DELETE' ? 'bg-red-500/20 text-red-300' :
                          'bg-slate-500/20 text-slate-300'
                        }`}>
                          {method}
                        </span>
                        <ArrowRight className="h-3 w-3 text-slate-500" />
                        <span className="text-cyan-300 group-hover:text-cyan-200 transition-colors">{path}</span>
                      </span>
                      <span className="text-xs text-slate-500 mt-1">
                        {formatDateTime(trace.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500">
                      Status <span className="text-white font-medium">{status}</span>
                    </span>
                    <Badge className={
                      isPass ? 'badge-success-crystal' :
                      isFail ? 'bg-red-500/15 text-red-300 border border-red-500/25' :
                      'badge-warning-crystal'
                    }>
                      {trace.verdict}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
