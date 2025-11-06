'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TestTube, Play, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

const goldenTests = [
  { id: '1', name: 'Authentication Tests', category: 'Security', tests: 5 },
  { id: '2', name: 'Idempotency Tests', category: 'Reliability', tests: 3 },
  { id: '3', name: 'Rate Limiting Tests', category: 'Performance', tests: 4 },
  { id: '4', name: 'Error Handling Tests', category: 'Robustness', tests: 6 },
  { id: '5', name: 'Webhook Tests', category: 'Integration', tests: 4 },
  { id: '6', name: 'Pagination Tests', category: 'Data', tests: 3 },
  { id: '7', name: 'Filtering Tests', category: 'Data', tests: 4 },
  { id: '8', name: 'Versioning Tests', category: 'Compatibility', tests: 2 },
  { id: '9', name: 'CORS Tests', category: 'Security', tests: 3 },
  { id: '10', name: 'Security Headers Tests', category: 'Security', tests: 4 },
];

export default function TestsPage() {
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { passed: number; failed: number }>>({});

  const handleRunTest = async (testId: string, testName: string) => {
    setRunning(testId);
    
    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const test = goldenTests.find(t => t.id === testId);
    const passed = test ? Math.floor(Math.random() * test.tests) + Math.floor(test.tests * 0.7) : 0;
    const failed = test ? test.tests - passed : 0;
    
    setResults(prev => ({ ...prev, [testId]: { passed, failed } }));
    setRunning(null);
  };

  const handleRunAll = async () => {
    for (const test of goldenTests) {
      await handleRunTest(test.id, test.name);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-in">
        <div>
          <h1 className="text-4xl font-bold gradient-text">Golden Test Suites</h1>
          <p className="text-lg text-gray-600 mt-2">
            Run comprehensive API integration tests
          </p>
        </div>
        <Button 
          size="lg" 
          variant="gradient" 
          className="gap-2"
          onClick={handleRunAll}
          disabled={running !== null}
        >
          {running ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
          Run All Tests
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {goldenTests.map((test, index) => {
          const result = results[test.id];
          const isRunning = running === test.id;
          const hasRun = !!result;
          
          return (
            <Card
              key={test.id}
              className="card-hover animate-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${
                    hasRun && result.failed === 0
                      ? 'from-green-500 to-emerald-500'
                      : hasRun && result.failed > 0
                      ? 'from-orange-500 to-red-500'
                      : 'from-purple-500 to-pink-500'
                  } shadow-lg`}>
                    <TestTube className="h-6 w-6 text-white" />
                  </div>
                  {hasRun && (
                    <Badge variant={result.failed === 0 ? 'success' : 'warning'}>
                      {result.passed}/{test.tests} Passed
                    </Badge>
                  )}
                  {isRunning && (
                    <Badge variant="info">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Running
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{test.name}</CardTitle>
                <p className="text-sm text-gray-600">{test.category} • {test.tests} tests</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasRun && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50">
                      <div className="flex items-center gap-1 mb-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="text-xs text-gray-600">Passed</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{result.passed}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-gradient-to-br from-red-50 to-rose-50">
                      <div className="flex items-center gap-1 mb-1">
                        <XCircle className="h-3 w-3 text-red-600" />
                        <span className="text-xs text-gray-600">Failed</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{result.failed}</p>
                    </div>
                  </div>
                )}
                <Button
                  className="w-full"
                  variant={hasRun ? 'outline' : 'default'}
                  onClick={() => handleRunTest(test.id, test.name)}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : hasRun ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Again
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Test
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Test Categories Info */}
      <Card className="animate-in" style={{ animationDelay: '500ms' }}>
        <CardHeader>
          <CardTitle className="text-xl">📋 Test Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-semibold text-gray-900 mb-2">🔒 Security</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Authentication & Authorization</li>
                <li>• CORS Configuration</li>
                <li>• Security Headers</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-2">⚡ Performance</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Rate Limiting</li>
                <li>• Response Times</li>
                <li>• Pagination</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-2">🔄 Reliability</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Idempotency</li>
                <li>• Error Handling</li>
                <li>• Retry Logic</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-2">🔌 Integration</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Webhooks</li>
                <li>• API Versioning</li>
                <li>• Data Filtering</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
