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
