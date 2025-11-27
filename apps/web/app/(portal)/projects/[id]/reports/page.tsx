'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, CheckCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

const riskBadge = (risk: string) => {
  switch (risk) {
    case 'LOW':
      return <Badge variant="success">Low Risk</Badge>;
    case 'MEDIUM':
      return <Badge variant="warning">Medium Risk</Badge>;
    case 'HIGH':
    case 'CRITICAL':
      return <Badge variant="error">{risk.charAt(0) + risk.slice(1).toLowerCase()} Risk</Badge>;
    default:
      return <Badge>Unknown</Badge>;
  }
};

export default function ProjectReportsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const projectQuery = trpc.project.get.useQuery({ id: projectId });
  const projectName = projectQuery.data?.name ?? 'Project';

  const reportsQuery = trpc.report.list.useQuery({ projectId });
  const reports = reportsQuery.data ?? [];

  if (reportsQuery.isLoading) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white/70 p-12 text-center text-gray-500 shadow-inner">
        Loading reports…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Readiness Reports</h1>
          <p className="text-gray-500 mt-2">Production go-live assessments</p>
        </div>
        <Button disabled className="cursor-not-allowed">
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-12 text-center shadow-inner">
          <p className="text-gray-600">No reports yet. Run tests and gather traces to unlock readiness scoring.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{projectName}</CardTitle>
                    <CardDescription className="mt-1">
                      Created {new Date(report.createdAt).toLocaleString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {riskBadge(report.risk ?? 'LOW')}
                    {report.status === 'SIGNED' && (
                      <Badge variant="success">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Signed
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 text-sm md:grid-cols-3">
                    <div className="rounded-2xl bg-gray-50 px-4 py-2">
                      <p className="text-xs uppercase text-gray-500">Pass Rate</p>
                      <p className="text-lg font-semibold text-gray-900">{report.score ?? 0}%</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-4 py-2">
                      <p className="text-xs uppercase text-gray-500">Tests</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {report.testsPassed ?? 0}/{report.testsTotal ?? 0} passed
                      </p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 px-4 py-2">
                      <p className="text-xs uppercase text-gray-500">Plan Completion</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {report.planCompletion ?? 0}%
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {(report.phaseSummaries ?? [])
                        .filter((phase) => phase.enabled)
                        .map((phase) => (
                          <Badge
                            key={`${report.id}-${phase.key}`}
                            variant={
                              (phase.completion ?? 0) === 100 ? 'success' : phase.completion ? 'info' : 'outline'
                            }
                            className="text-xs"
                          >
                            {phase.title}: {phase.completion ?? 0}%
                          </Badge>
                        ))}
                      {(report.phaseSummaries ?? []).filter((phase) => !phase.enabled).length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {(report.phaseSummaries ?? []).filter((phase) => !phase.enabled).length} out-of-scope
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/projects/${projectId}/reports/${report.id}`}>
                        <Button variant="outline" size="sm">
                          View Report
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" disabled>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

