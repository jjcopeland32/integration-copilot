'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ReportsPage() {
  // Mock data
  const reports = [
    {
      id: '1',
      project: 'Stripe Payment Integration',
      type: 'READINESS',
      status: 'SIGNED',
      risk: 'LOW',
      passRate: 95,
      createdAt: '2025-11-01',
      signedBy: 'John Doe',
    },
    {
      id: '2',
      project: 'PayPal Checkout',
      type: 'READINESS',
      status: 'DRAFT',
      risk: 'MEDIUM',
      passRate: 88,
      createdAt: '2025-11-02',
      signedBy: null,
    },
  ];

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return <Badge variant="success">Low Risk</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">Medium Risk</Badge>;
      case 'HIGH':
        return <Badge variant="error">High Risk</Badge>;
      case 'CRITICAL':
        return <Badge variant="error">Critical Risk</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Readiness Reports</h1>
          <p className="text-gray-500 mt-2">Production go-live assessments</p>
        </div>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>

      <div className="space-y-4">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{report.project}</CardTitle>
                  <CardDescription className="mt-1">
                    Created {report.createdAt}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {getRiskBadge(report.risk)}
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
              <div className="flex items-center justify-between">
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Test Pass Rate:</span>{' '}
                    <span className="font-medium">{report.passRate}%</span>
                  </div>
                  {report.signedBy && (
                    <div>
                      <span className="text-gray-500">Signed by:</span>{' '}
                      <span className="font-medium">{report.signedBy}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link href={`/reports/${report.id}`}>
                    <Button variant="outline" size="sm">
                      View Report
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Template Info */}
      <Card>
        <CardHeader>
          <CardTitle>Report Contents</CardTitle>
          <CardDescription>What's included in readiness reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              'Test pass rate and coverage',
              'Error rate analysis',
              'Average latency metrics',
              'Phase completion status',
              'Risk assessment (Critical/High/Medium/Low)',
              'Security review results',
              'Documentation completeness',
              'Recommendations for go-live',
              'Evidence and audit trail',
              'E-signature support',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
