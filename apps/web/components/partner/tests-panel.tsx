'use client';

import { useState } from 'react';
import { partnerTrpc } from '@/lib/trpc/partner/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FlaskConical, Download, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';

type RunResults = {
  summary?: {
    total?: number;
    passed?: number;
    failed?: number;
    durationMs?: number;
  };
  cases?: Array<{
    id: string;
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    message?: string | null;
  }>;
};

export function PartnerTestsPanel() {
  const utils = partnerTrpc.useUtils();
  const { data, isLoading } = partnerTrpc.project.current.useQuery(undefined, {
    staleTime: 60_000,
  });
  const [runningSuite, setRunningSuite] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
        Loading golden suites...
      </div>
    );
  }

  const suites = data?.project.suites ?? [];

  const handleRunSuite = async (suiteId: string) => {
    setRunningSuite(suiteId);
    setStatusMessage(null);
    setError(null);
    try {
      const response = await fetch('/api/partner/tests/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ suiteId }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? 'Unable to run suite');
      }
      const summary = body?.result?.summary;
      if (summary) {
        setStatusMessage(
          `Suite complete: ${summary.passed ?? 0}/${summary.total ?? 0} passed`
        );
      } else {
        setStatusMessage('Suite run completed.');
      }
      await utils.project.current.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to run suite');
    } finally {
      setRunningSuite(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Quality Gates</p>
        <h1 className="text-3xl font-semibold text-white">Golden Test Suites</h1>
        <p className="text-sm text-slate-300">
          SYF generates these cases to validate required behaviors and failure handling.
        </p>
      </div>

      {statusMessage && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {statusMessage}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {suites.length === 0 ? (
        <Card className="border-dashed border-white/20 bg-white/5 text-slate-200">
          <CardContent className="p-10 text-center">
            No suites available yet. Once SYF generates tests, they will appear here with logs.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {suites.map((suite) => {
            const latestRun = suite.runs?.[0] as
              | ({ results?: RunResults; createdAt?: Date; id: string })
              | undefined;
            const summary = latestRun?.results?.summary;
            const totalCases = Array.isArray(suite.cases)
              ? (suite.cases as unknown[]).length
              : 0;
            const status =
              summary?.failed && summary.failed > 0
                ? 'error'
                : summary?.passed === summary?.total
                  ? 'success'
                  : 'default';

            return (
              <Card
                key={suite.id}
                className="border-white/10 bg-white/5 text-slate-50 backdrop-blur"
              >
                <CardHeader className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="rounded-2xl bg-purple-500/20 p-3">
                      <FlaskConical className="h-5 w-5 text-purple-200" />
                    </span>
                    <div>
                      <CardTitle className="text-xl">{suite.name}</CardTitle>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        {suite.version}
                      </p>
                    </div>
                  </div>
                  <Badge variant={status}>
                    {summary
                      ? `${summary.passed ?? 0}/${summary.total ?? totalCases} passed`
                      : `${totalCases} cases`}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="text-sm text-slate-300">
                      <p>
                        Latest run:{' '}
                        {latestRun?.createdAt
                          ? formatDateTime(latestRun.createdAt)
                          : 'No executions yet'}
                      </p>
                      {summary?.durationMs && (
                        <p className="text-xs text-slate-500">
                          Duration {(summary.durationMs / 1000).toFixed(1)}s
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="gradient"
                        className="gap-2"
                        onClick={() => handleRunSuite(suite.id)}
                        disabled={runningSuite === suite.id}
                      >
                        {runningSuite === suite.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Running…
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            Run suite
                          </>
                        )}
                      </Button>
                      <Button variant="outline" className="gap-2 text-white" disabled={!latestRun}>
                        <Download className="h-4 w-4" />
                        Download logs
                      </Button>
                    </div>
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
