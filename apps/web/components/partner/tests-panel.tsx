'use client';

import { useState } from 'react';
import { partnerTrpc } from '@/lib/trpc/partner/client';
import { Badge } from '@/components/ui/badge';
import { FlaskConical, Download, Play, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp, AlertTriangle, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
import { PartnerEnvironmentSelector } from '@/components/environments/partner-environment-selector';

type AssertionResult = {
  passed: boolean;
  assertion: {
    type: string;
    field?: string;
    value?: unknown;
    condition?: string;
  };
  error?: string;
  expected?: unknown;
  actual?: unknown;
};

type CaseResult = {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  message?: string | null;
  errors?: string[];
  response?: {
    status?: number | null;
    body?: unknown;
  };
  assertionResults?: AssertionResult[];
};

type RunResults = {
  summary?: {
    total?: number;
    passed?: number;
    failed?: number;
    durationMs?: number;
  };
  cases?: CaseResult[];
};

function AssertionDetail({ assertion }: { assertion: AssertionResult }) {
  return (
    <div className={`rounded-xl p-3 text-xs border ${
      assertion.passed 
        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' 
        : 'bg-red-500/10 border-red-500/20 text-red-200'
    }`}>
      <div className="flex items-center gap-2">
        {assertion.passed ? (
          <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-red-400" />
        )}
        <span className="font-medium">{assertion.assertion.type}</span>
        {assertion.assertion.field && (
          <span className="text-slate-500">({assertion.assertion.field})</span>
        )}
      </div>
      {!assertion.passed && assertion.error && (
        <p className="mt-2 pl-5 text-red-300/80">{assertion.error}</p>
      )}
      {!assertion.passed && (assertion.expected !== undefined || assertion.actual !== undefined) && (
        <div className="mt-2 pl-5 space-y-1">
          {assertion.expected !== undefined && (
            <p className="text-emerald-300/80">Expected: <code className="bg-black/20 px-1.5 py-0.5 rounded">{JSON.stringify(assertion.expected)}</code></p>
          )}
          {assertion.actual !== undefined && (
            <p className="text-red-300/80">Actual: <code className="bg-black/20 px-1.5 py-0.5 rounded">{JSON.stringify(assertion.actual)}</code></p>
          )}
        </div>
      )}
    </div>
  );
}

function CaseRow({ result }: { result: CaseResult }) {
  const [expanded, setExpanded] = useState(false);
  
  const failedAssertions = result.assertionResults?.filter((a) => !a.passed) ?? [];
  const allErrors = [...(result.errors ?? []), ...(result.message ? [result.message] : [])];
  const hasDetails = failedAssertions.length > 0 || allErrors.length > 0 || result.response;
  
  const responseBody = result.response && typeof result.response.body === 'object'
    ? JSON.stringify(result.response.body, null, 2)
    : result.response?.body;
  
  return (
    <div className="glass-crystal-card rounded-xl p-4 space-y-3 border-white/5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className={`rounded-lg p-1.5 ${
            result.status === 'passed' ? 'bg-emerald-500/20' : 
            result.status === 'failed' ? 'bg-red-500/20' : 'bg-slate-500/20'
          }`}>
            {result.status === 'passed' ? (
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            ) : result.status === 'failed' ? (
              <XCircle className="h-4 w-4 text-red-400" />
            ) : (
              <Clock className="h-4 w-4 text-slate-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white truncate">{result.name}</p>
              {hasDetails && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-slate-500 hover:text-cyan-400 transition-colors"
                >
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              )}
            </div>
            {result.status === 'failed' && failedAssertions.length > 0 && !expanded && (
              <p className="text-xs text-red-400/80 flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" />
                {failedAssertions.length} assertion{failedAssertions.length > 1 ? 's' : ''} failed
              </p>
            )}
            {result.status === 'failed' && allErrors.length > 0 && failedAssertions.length === 0 && !expanded && (
              <p className="text-xs text-red-400/80 mt-1 truncate">{allErrors[0]}</p>
            )}
          </div>
        </div>
        <Badge className={
          result.status === 'passed' ? 'badge-success-crystal' :
          result.status === 'failed' ? 'bg-red-500/15 text-red-300 border border-red-500/25' :
          'badge-crystal'
        }>
          {result.status.toUpperCase()}
        </Badge>
      </div>
      
      {expanded && (
        <div className="space-y-3 mt-3 pt-3 border-t border-white/5">
          {/* Assertion Results */}
          {result.assertionResults && result.assertionResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assertions</p>
              <div className="space-y-2">
                {result.assertionResults.map((assertion, i) => (
                  <AssertionDetail key={i} assertion={assertion} />
                ))}
              </div>
            </div>
          )}
          
          {/* Error Messages */}
          {allErrors.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Errors</p>
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-200 space-y-1">
                {allErrors.map((error, i) => (
                  <p key={i}>{error}</p>
                ))}
              </div>
            </div>
          )}
          
          {/* Response Details */}
          {result.response && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Response</p>
              <div className="rounded-xl bg-black/30 border border-white/5 p-3 text-xs text-slate-300">
                <p className="font-medium text-cyan-300">HTTP {result.response.status ?? '—'}</p>
                <pre className="mt-2 overflow-x-auto text-[11px] text-slate-400 max-h-32 overflow-y-auto">
                  {String(responseBody ?? '—')}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PartnerTestsPanel() {
  const utils = partnerTrpc.useUtils();
  const { data, isLoading } = partnerTrpc.project.current.useQuery(undefined, {
    staleTime: 60_000,
  });
  const [runningSuite, setRunningSuite] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="glass-crystal-card rounded-3xl p-8 text-center animate-in">
        <div className="flex items-center justify-center gap-3 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
          Loading golden suites...
        </div>
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
      {/* Header */}
      <div className="animate-in">
        <p className="text-xs uppercase tracking-[0.3em] text-purple-400/80 font-medium">Quality Gates</p>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-100 to-cyan-200 bg-clip-text text-transparent">
          Golden Test Suites
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          These cases validate required behaviors and failure handling per the integration blueprint.
        </p>
      </div>

      {/* Environment Selector */}
      <div className="animate-in" style={{ animationDelay: '50ms' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-400">Test against:</span>
          <PartnerEnvironmentSelector
            value={selectedEnvId}
            onChange={(id) => setSelectedEnvId(id)}
            showMockOption={true}
            className="flex-1 max-w-md"
          />
        </div>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 flex items-center gap-2 animate-in">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          {statusMessage}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-center gap-2 animate-in">
          <XCircle className="h-4 w-4 text-red-400" />
          {error}
        </div>
      )}

      {/* Suites */}
      {suites.length === 0 ? (
        <div className="glass-crystal-card rounded-3xl border-dashed p-10 text-center animate-in stagger-1">
          <FlaskConical className="mx-auto h-10 w-10 text-purple-400/40 mb-3" />
          <p className="text-slate-400">No suites available yet. Once tests are generated, they will appear here with logs.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {suites.map((suite, index) => {
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

            const caseResults = latestRun?.results?.cases ?? [];
            const failedCases = caseResults.filter((c) => c.status === 'failed');
            const passRate = summary?.total 
              ? Math.round(((summary.passed ?? 0) / summary.total) * 100)
              : null;
            
            return (
              <div
                key={suite.id}
                className="glass-crystal-card rounded-3xl p-6 animate-in"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
              >
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-xl p-3 ${
                      status === 'success' ? 'bg-emerald-500/20' : 
                      status === 'error' ? 'bg-red-500/20' : 'bg-purple-500/20'
                    }`}>
                      <FlaskConical className={`h-6 w-6 ${
                        status === 'success' ? 'text-emerald-400' : 
                        status === 'error' ? 'text-red-400' : 'text-purple-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{suite.name}</h3>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {suite.version}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {passRate !== null && (
                      <div className={`text-2xl font-bold ${
                        status === 'success' ? 'text-emerald-400' :
                        status === 'error' ? 'text-red-400' : 'text-purple-400'
                      }`}>
                        {passRate}%
                      </div>
                    )}
                    <Badge className={
                      status === 'success' ? 'badge-success-crystal' :
                      status === 'error' ? 'bg-red-500/15 text-red-300 border border-red-500/25' :
                      'badge-crystal'
                    }>
                      {summary
                        ? `${summary.passed ?? 0}/${summary.total ?? totalCases} passed`
                        : `${totalCases} cases`}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/5">
                  <div className="text-sm text-slate-400 flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-slate-500" />
                      {latestRun?.createdAt
                        ? formatDateTime(latestRun.createdAt)
                        : 'No executions yet'}
                    </span>
                    {summary?.durationMs && (
                      <span className="flex items-center gap-1.5 text-cyan-400/70">
                        <Zap className="h-4 w-4" />
                        {(summary.durationMs / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      className="btn-crystal gap-2"
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
                    <Button 
                      variant="outline" 
                      className="btn-crystal-outline gap-2" 
                      disabled={!latestRun}
                    >
                      <Download className="h-4 w-4" />
                      Download logs
                    </Button>
                  </div>
                </div>
                
                {/* Show failed cases first, then passed */}
                {caseResults.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                      Test Results 
                      {failedCases.length > 0 && (
                        <span className="text-red-400">({failedCases.length} failed)</span>
                      )}
                    </p>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {/* Show failed cases first */}
                      {failedCases.map((result) => (
                        <CaseRow key={result.id} result={result} />
                      ))}
                      {/* Then show passed cases */}
                      {caseResults
                        .filter((c) => c.status === 'passed')
                        .map((result) => (
                          <CaseRow key={result.id} result={result} />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



