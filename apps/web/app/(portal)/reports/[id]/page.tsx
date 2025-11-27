import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, FileSignature } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { appRouter } from '@/lib/trpc/root';
import { createContext } from '@/lib/trpc/server';
import { notFound } from 'next/navigation';

const riskVariant = (risk: string | undefined) => {
  switch (risk) {
    case 'LOW':
      return 'success';
    case 'MEDIUM':
      return 'warning';
    case 'HIGH':
    case 'CRITICAL':
      return 'error';
    default:
      return 'default';
  }
};

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const caller = appRouter.createCaller(await createContext());
  const report = await caller.report.get({ id: params.id }).catch(() => null);

  if (!report) {
    notFound();
  }

  const createdAt = new Date(report.createdAt).toLocaleString();
  const metrics = report.metrics ?? {
    testPassRate: 0,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    averageLatencyMs: 0,
    errorRate: 0,
    phaseCompletion: {},
  };
  const phaseSummaries = report.phaseSummaries ?? [];
  const inScopePhases = phaseSummaries.filter((phase: any) => phase.enabled);
  const outOfScopePhases = phaseSummaries.filter((phase: any) => !phase.enabled);
  const risks = report.risks ?? [];
  const recommendations = report.recommendations ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/reports">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{report.projectName}</h1>
            <Badge variant={riskVariant(report.risk)}>
              {report.risk ?? 'UNKNOWN'} Risk
            </Badge>
          </div>
          <p className="text-gray-500 mt-2">Created {createdAt}</p>
        </div>
        <div className="flex gap-2">
          {report.status === 'DRAFT' && (
            <Button disabled className="cursor-not-allowed">
              <FileSignature className="h-4 w-4 mr-2" />
              Sign Report
            </Button>
          )}
          <Button variant="outline" disabled className="cursor-not-allowed">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase text-gray-500">Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{metrics.testPassRate ?? 0}%</p>
            <p className="text-sm text-gray-500">
              {metrics.passedTests ?? 0}/{metrics.totalTests ?? 0} tests passed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase text-gray-500">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{metrics.errorRate ?? 0}%</p>
            <p className="text-sm text-gray-500">Based on latest trace verdicts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase text-gray-500">Avg Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{metrics.averageLatencyMs ?? 0} ms</p>
            <p className="text-sm text-gray-500">Across recent traces</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phase Completion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {inScopePhases.length === 0 ? (
            <p className="text-sm text-gray-500">No plan items yet. Initialize the plan board to track phases.</p>
          ) : (
            inScopePhases.map((phase: any) => (
              <div key={phase.key}>
                <div className="flex items-center justify-between text-sm font-medium text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="uppercase tracking-wide">{phase.title}</span>
                    {phase.optional && <Badge variant="outline" className="text-[10px] uppercase">Optional</Badge>}
                  </div>
                  <span>{phase.completion ?? 0}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600"
                    style={{ width: `${phase.completion ?? 0}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scope & Benchmarks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {phaseSummaries.length === 0 ? (
            <p className="text-sm text-gray-500">Phase configuration unavailable for this project.</p>
          ) : (
            phaseSummaries.map((phase: any) => (
              <div
                key={phase.key}
                className="rounded-2xl border border-gray-100 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{phase.title}</p>
                    {phase.optional && <Badge variant="outline">Optional</Badge>}
                  </div>
                  <Badge variant={phase.enabled ? 'success' : 'outline'}>
                    {phase.enabled ? 'In Scope' : 'Out of Scope'}
                  </Badge>
                </div>
                {phase.enabled && typeof phase.completion === 'number' && (
                  <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                    Completion: {phase.completion}%
                  </p>
                )}
                {phase.notes && (
                  <p className="mt-2 text-sm text-gray-600">{phase.notes}</p>
                )}
                {phase.scenarios?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      UAT Scenarios
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-600">
                      {phase.scenarios.map((scenario: any) => (
                        <li key={scenario.id}>{scenario.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {phase.performanceBenchmark && (
                  <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
                    {typeof phase.performanceBenchmark.targetLatencyMs === 'number' && (
                      <div className="rounded-2xl bg-gray-50 px-3 py-2">
                        Target Latency: {phase.performanceBenchmark.targetLatencyMs}ms
                      </div>
                    )}
                    {typeof phase.performanceBenchmark.maxErrorRatePercent === 'number' && (
                      <div className="rounded-2xl bg-gray-50 px-3 py-2">
                        Error ≤ {phase.performanceBenchmark.maxErrorRatePercent}%
                      </div>
                    )}
                    {typeof phase.performanceBenchmark.targetSuccessRatePercent === 'number' && (
                      <div className="rounded-2xl bg-gray-50 px-3 py-2">
                        Success ≥ {phase.performanceBenchmark.targetSuccessRatePercent}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          {outOfScopePhases.length > 0 && (
            <p className="text-xs text-gray-500">
              {outOfScopePhases.length} phase{outOfScopePhases.length > 1 ? 's' : ''} intentionally out of scope for this project.
            </p>
          )}
        </CardContent>
      </Card>

      {risks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Risks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {risks.map((risk, index) => (
              <div key={`${risk.category}-${index}`} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center gap-3">
                  <Badge variant={riskVariant(risk.severity.toUpperCase())}>{risk.severity.toUpperCase()}</Badge>
                  <p className="font-semibold text-gray-900">{risk.category}</p>
                </div>
                <p className="mt-2 text-sm text-gray-600">{risk.description}</p>
                <p className="mt-1 text-sm text-gray-500">
                  <span className="font-medium">Recommendation:</span> {risk.recommendation}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Next Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
              {recommendations.map((rec, index) => (
                <li key={`${rec}-${index}`}>{rec}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{report.markdown}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
