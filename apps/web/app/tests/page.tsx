'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TestTube, Play, CheckCircle, XCircle } from 'lucide-react';

export default function TestsPage() {
  const suites = [
    { id: '1', name: 'Stripe Golden Tests', total: 10, passed: 10, failed: 0, gradient: 'from-blue-500 to-cyan-500' },
    { id: '2', name: 'PayPal Integration Tests', total: 8, passed: 7, failed: 1, gradient: 'from-purple-500 to-pink-500' },
    { id: '3', name: 'Twilio API Tests', total: 12, passed: 12, failed: 0, gradient: 'from-green-500 to-emerald-500' },
  ];

  return (
    <div className="space-y-8">
      <div className="animate-in">
        <h1 className="text-4xl font-bold gradient-text">Test Suites</h1>
        <p className="text-lg text-gray-600 mt-2">Run and monitor your integration tests</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {suites.map((suite, index) => (
          <Card key={suite.id} className="card-hover animate-in" style={{ animationDelay: `${index * 100}ms` }}>
            <CardHeader>
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${suite.gradient} shadow-lg`}>
                  <TestTube className="h-6 w-6 text-white" />
                </div>
                <Badge variant={suite.failed === 0 ? 'success' : 'warning'}>
                  {Math.round((suite.passed / suite.total) * 100)}% Pass
                </Badge>
              </div>
              <CardTitle className="text-xl">{suite.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-gray-600">Passed</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{suite.passed}</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-red-50 to-rose-50">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-xs text-gray-600">Failed</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{suite.failed}</p>
                </div>
              </div>
              <Button className="w-full" variant="gradient">
                <Play className="h-4 w-4 mr-2" />
                Run Tests
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
