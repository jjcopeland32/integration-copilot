'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TestTube, Play, CheckCircle, XCircle, Loader2, Download, Link as LinkIcon, FileText } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useProjectContext } from '@/components/project-context';

type SuiteRunResult = {
  summary?: {
    total: number;
    passed: number;
    failed: number;
    durationMs?: number;
  };
  cases?: Array<{
    id: string;
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    message?: string;
    response?: {
      status?: number;
      body?: unknown;
    };
  }>;
  startedAt?: string;
  finishedAt?: string;
  runId?: string;
  suiteId?: string;
};

type CaseResult = NonNullable<SuiteRunResult['cases']>[number];

function CaseRow({ result }: { result: CaseResult }) {
  const variant = result.status === 'passed' ? 'success' : result.status === 'failed' ? 'error' : 'default';
  const responseBody =
    result.response && typeof result.response.body === 'object'
      ? JSON.stringify(result.response.body, null, 2)
      : result.response?.body;
  const traceHint = result.response && typeof result.response.body === 'object' ? result.response.body?.traceId : null;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-inner space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{result.name}</p>
          {result.message && <p className="text-xs text-gray-500">{result.message}</p>}
        </div>
        <Badge variant={variant}>{result.status.toUpperCase()}</Badge>
      </div>
      {result.response && (
        <div className="rounded-xl bg-gray-50 p-2 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <span>HTTP {result.response.status ?? '—'}</span>
            {traceHint && (
              <span className="inline-flex items-center gap-1 text-indigo-600">
                <LinkIcon className="h-3 w-3" />
                trace: {String(traceHint)}
              </span>
            )}
          </div>
          <pre className="mt-1 overflow-x-auto text-[11px] text-gray-700">{String(responseBody ?? '—')}</pre>
        </div>
      )}
    </div>
  );
}

export default function TestsPage() {
  const { projectId, projectName } = useProjectContext();
  const utils = trpc.useUtils();
  const suitesQuery = trpc.project.get.useQuery(
    projectId ? { id: projectId } : { id: '' },
    { enabled: !!projectId }
  );
  const suitesData = suitesQuery.data?.suites;
  const suites = useMemo(() => suitesData ?? [], [suitesData]);
  const totalSuites = suites.length;
  const totalCases = useMemo(
    () =>
      suites.reduce((sum: number, suite: any) => {
        const cases = Array.isArray(suite.cases as unknown[]) ? (suite.cases as unknown[]).length : 0;
        return sum + cases;
      }, 0),
    [suites]
  );

  const [runningSuite, setRunningSuite] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!projectId) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-12 text-center shadow-inner">
        <h2 className="text-2xl font-semibold text-gray-900">Select a project to run tests</h2>
        <p className="mt-2 text-sm text-gray-600">Golden tests are scoped to a single integration.</p>
        <Link
          href="/projects"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg"
        >
          View Projects
        </Link>
      </div>
    );
  }

  const handleRunSuite = async (suiteId: string) => {
    setRunningSuite(suiteId);
    setError(null);
    try {
      const res = await fetch('/api/tests/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ suiteId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Unable to run suite');
      }
      if (projectId) {
        await utils.project.get.invalidate({ id: projectId });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to run suite');
    } finally {
      setRunningSuite(null);
    }
  };

  const handleRunAll = async () => {
    for (const suite of suites) {
      await handleRunSuite(suite.id);
    }
  };

  const handleDownloadResults = (suite: any) => {
    const latestRun = suite.runs?.[0] as { results?: SuiteRunResult } | undefined;
    if (!latestRun?.results) return;
    const blob = new Blob([JSON.stringify(latestRun.results, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${suite.name.replace(/\s+/g, '-').toLowerCase()}-latest-run.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-in">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{projectName}</p>
          <h1 className="text-4xl font-bold gradient-text">Golden Test Suites</h1>
          <p className="text-lg text-gray-600 mt-2">
            {totalSuites} suites • {totalCases} cases
          </p>
        </div>
        <Button
          size="lg"
          variant="gradient"
          className="gap-2"
          onClick={handleRunAll}
          disabled={runningSuite !== null || suites.length === 0}
        >
          {runningSuite ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
          Run All Tests
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}
      {suites.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-12 text-center shadow-inner">
          <p className="text-gray-600">No suites yet. Generate tests from the Specs page for this project.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {suites.map((suite: any, index: number) => {
            const latestRun = suite.runs?.[0] as { results?: SuiteRunResult; createdAt?: string } | undefined;
            const caseCount = Array.isArray(suite.cases as unknown[]) ? (suite.cases as unknown[]).length : 0;
            const summary = latestRun?.results?.summary;
            const passed = summary?.passed ?? 0;
            const failed = summary?.failed ?? 0;
            const caseResults = Array.isArray(latestRun?.results?.cases) ? (latestRun?.results?.cases as CaseResult[]) : [];
            const finishedAt = latestRun?.results?.finishedAt ?? latestRun?.createdAt;
            const isRunning = runningSuite === suite.id;

            return (
              <Card
                key={suite.id}
                className="card-hover animate-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`p-3 rounded-xl bg-gradient-to-br ${
                        failed === 0 && !isRunning
                          ? 'from-green-500 to-emerald-500'
                          : 'from-purple-500 to-pink-500'
                      } shadow-lg`}
                    >
                      <TestTube className="h-6 w-6 text-white" />
                    </div>
                    {latestRun && (
                      <Badge variant={failed === 0 ? 'success' : 'warning'}>
                        {passed}/{caseCount} Passed
                      </Badge>
                    )}
                    {isRunning && (
                      <Badge variant="info">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Running
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{suite.name}</CardTitle>
                  <p className="text-sm text-gray-600">
                    {caseCount} cases
                    {finishedAt && (
                      <span className="text-xs text-gray-400 block">
                        Last run {new Date(finishedAt).toLocaleString()}
                      </span>
                    )}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {latestRun && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50">
                        <div className="flex items-center gap-1 mb-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span className="text-xs text-gray-600">Passed</span>
                        </div>
                        <p className="text-xl font-bold text-gray-900">{passed}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-gradient-to-br from-red-50 to-rose-50">
                        <div className="flex items-center gap-1 mb-1">
                          <XCircle className="h-3 w-3 text-red-600" />
                          <span className="text-xs text-gray-600">Failed</span>
                        </div>
                        <p className="text-xl font-bold text-gray-900">{failed}</p>
                      </div>
                    </div>
                  )}
                  <Button
                    className="w-full"
                    variant={latestRun ? 'outline' : 'default'}
                    onClick={() => handleRunSuite(suite.id)}
                    disabled={isRunning}
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        {latestRun ? 'Run Again' : 'Run Test'}
                      </>
                    )}
                  </Button>
                  {caseResults.length > 0 && (
                    <div className="mt-2 space-y-2 rounded-2xl border border-gray-100 bg-gray-50/80 p-3 max-h-60 overflow-auto">
                      {caseResults.map((caseResult) => {
                        const statusBadge =
                          caseResult.status === 'passed'
                            ? 'success'
                            : caseResult.status === 'failed'
                            ? 'warning'
                            : 'outline';
                        const description =
                          caseResult.status === 'passed'
                            ? `Status ${caseResult.response?.status ?? '200'}`
                            : caseResult.message ?? 'Assertion failed';
                        return (
                          <div
                            key={caseResult.id}
                            className="flex items-start justify-between gap-3 rounded-xl bg-white p-3 shadow-inner"
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{caseResult.name}</p>
                              <p className="text-xs text-gray-500">{description}</p>
                            </div>
                            <Badge variant={statusBadge}>
                              {caseResult.status.toUpperCase()}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    {summary?.durationMs !== undefined && summary?.durationMs !== null && (
                      <span>Duration: {(summary.durationMs / 1000).toFixed(1)}s</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-indigo-600 hover:text-indigo-700"
                      onClick={() => handleDownloadResults(suite)}
                      disabled={!latestRun?.results}
                    >
                      <Download className="h-3 w-3" />
                      Latest JSON
                    </Button>
                  </div>
                  {caseResults.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Case Results
                        </p>
                        <Link
                          href="/traces"
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          <FileText className="h-3 w-3" />
                          View traces
                        </Link>
                      </div>
                      <div className="space-y-2 max-h-56 overflow-auto pr-1">
                        {caseResults.map((result) => (
                          <CaseRow key={result.id} result={result} />
                        ))}
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
