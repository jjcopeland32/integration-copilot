'use client';

import { partnerTrpc } from '@/lib/trpc/partner/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';
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
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
        Loading telemetry...
      </div>
    );
  }

  const traces = (data?.project.traces ?? []) as TraceRecord[];

  return (
    <Card className="border-white/10 bg-white/5 text-slate-50 backdrop-blur">
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Activity className="h-5 w-5 text-emerald-300" />
            Most Recent Traces
          </CardTitle>
          <p className="text-sm text-slate-300">
            Each mock/test run emits telemetry so you can debug failures.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {traces.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-6 text-center text-sm text-slate-300">
            No partner traces yet. Trigger requests against your mock sandbox to populate telemetry.
          </p>
        ) : (
          <div className="space-y-3">
            {traces.map((trace) => {
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
              const variant =
                verdict === 'pass'
                  ? 'success'
                  : verdict === 'fail'
                    ? 'error'
                    : 'info';

              return (
                <div
                  key={trace.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-white">
                      {method} {path}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDateTime(trace.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">Status {status}</span>
                    <Badge variant={variant}>{trace.verdict}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
