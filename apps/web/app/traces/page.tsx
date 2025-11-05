'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function TracesPage() {
  // Mock data
  const traces = [
    {
      id: '1',
      method: 'POST',
      path: '/v1/payment_intents',
      status: 200,
      verdict: 'pass',
      latency: 145,
      timestamp: '2025-11-03 14:32:15',
    },
    {
      id: '2',
      method: 'GET',
      path: '/v1/payment_intents/pi_123',
      status: 200,
      verdict: 'pass',
      latency: 89,
      timestamp: '2025-11-03 14:31:42',
    },
    {
      id: '3',
      method: 'POST',
      path: '/v1/payment_intents',
      status: 400,
      verdict: 'fail',
      latency: 52,
      timestamp: '2025-11-03 14:30:18',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Traces</h1>
        <p className="text-gray-500 mt-2">Request/response validation traces</p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Traces</CardDescription>
            <CardTitle className="text-3xl">1,234</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pass Rate</CardDescription>
            <CardTitle className="text-3xl text-green-600">94.2%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg Latency</CardDescription>
            <CardTitle className="text-3xl">127ms</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Traces List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Traces</CardTitle>
          <CardDescription>Latest validation results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {traces.map((trace) => (
              <div
                key={trace.id}
                className="flex items-center justify-between border-b pb-4 last:border-0"
              >
                <div className="flex items-center gap-4">
                  {trace.verdict === 'pass' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{trace.method}</Badge>
                      <code className="text-sm">{trace.path}</code>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>Status: {trace.status}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {trace.latency}ms
                      </span>
                      <span>{trace.timestamp}</span>
                    </div>
                  </div>
                </div>
                <Badge variant={trace.verdict === 'pass' ? 'success' : 'error'}>
                  {trace.verdict.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
