'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileCode,
  Sparkles,
  Server,
  TestTube,
  Loader2,
  Link as LinkIcon,
  Rocket,
} from 'lucide-react';

interface DemoState {
  blueprintId: string;
  blueprintUrl: string;
  mockBaseUrl: string;
  suiteId: string;
  spec: {
    title: string;
    version: string;
    endpoints: number;
  };
}

interface RunResultSummary {
  suiteId: string;
  runId: string;
  summary: {
    passed: number;
    failed: number;
    total: number;
    durationMs: number;
  };
}

export default function SpecsPage() {
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demo, setDemo] = useState<DemoState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runningTests, setRunningTests] = useState(false);
  const [testResult, setTestResult] = useState<RunResultSummary | null>(null);

  const handleLoadPetstore = async () => {
    try {
      setLoadingDemo(true);
      setError(null);
      setTestResult(null);
      const response = await fetch('/api/specs/petstore', { method: 'POST' });

      if (!response.ok) {
        throw new Error('Failed to load Petstore spec');
      }

      const payload: DemoState = await response.json();
      setDemo(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setDemo(null);
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleRunBaseline = async () => {
    if (!demo) return;
    try {
      setRunningTests(true);
      setError(null);
      const origin = window.location.origin;
      const baseUrl = new URL(demo.mockBaseUrl, origin).toString();
      const response = await fetch('/api/tests/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suiteId: demo.suiteId,
          baseUrl,
        }),
      });

      if (!response.ok) {
        const message = await response.json().catch(() => ({}));
        throw new Error(message.error || 'Test run failed');
      }

      const payload: RunResultSummary = await response.json();
      setTestResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setRunningTests(false);
    }
  };

  const callToAction = useMemo(() => {
    if (!demo) {
      return 'Load the sample Petstore spec to generate a blueprint, deterministic mock, and baseline test suite.';
    }
    return `Blueprint and mock ready for ${demo.spec.title}. Run the baseline suite to verify the integration.`;
  }, [demo]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-in">
        <div>
          <h1 className="text-4xl font-bold gradient-text">One-click Specs</h1>
          <p className="text-lg text-gray-600 mt-2">{callToAction}</p>
        </div>
        <Button
          size="lg"
          variant="gradient"
          className="gap-2"
          onClick={handleLoadPetstore}
          disabled={loadingDemo}
        >
          {loadingDemo ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Rocket className="h-5 w-5" />
          )}
          {loadingDemo ? 'Loading Petstore…' : 'Load Sample Spec (Petstore)'}
        </Button>
      </div>

      {error && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="py-4 text-sm text-red-800">
            {error}
          </CardContent>
        </Card>
      )}

      {demo ? (
        <Card className="animate-in" style={{ animationDelay: '150ms' }}>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                <FileCode className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">{demo.spec.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Version {demo.spec.version} • {demo.spec.endpoints} endpoints
                </p>
              </div>
            </div>
            <Badge variant="success">Mock mounted at {demo.mockBaseUrl}</Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2">
              <Button asChild variant="outline" className="justify-start gap-2">
                <a href={demo.blueprintUrl} target="_blank" rel="noreferrer">
                  <Sparkles className="h-4 w-4" />
                  View generated blueprint
                </a>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2">
                <a href={demo.mockBaseUrl} target="_blank" rel="noreferrer">
                  <Server className="h-4 w-4" />
                  Explore mock responses
                </a>
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TestTube className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-gray-900">Payments baseline suite</span>
                <Badge variant="outline">{demo.suiteId}</Badge>
              </div>
              <Button
                className="w-full md:w-auto"
                onClick={handleRunBaseline}
                disabled={runningTests}
              >
                {runningTests ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running…
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4 mr-2" /> Run Payments Baseline
                  </>
                )}
              </Button>
              {testResult && (
                <div className="rounded-lg border border-muted bg-muted/40 p-4 text-sm">
                  <p className="font-medium text-gray-900 mb-2">
                    Run {testResult.runId} — {testResult.summary.passed} passed /{' '}
                    {testResult.summary.failed} failed
                  </p>
                  <p className="text-muted-foreground">
                    Completed in {(testResult.summary.durationMs / 1000).toFixed(2)}s.
                    Artifacts are saved to <code>.artifacts/testruns</code>.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="animate-in" style={{ animationDelay: '150ms' }}>
          <CardHeader>
            <CardTitle className="text-xl">Petstore demo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <p>
              Generate a working integration blueprint and deterministic mock by loading the
              OpenAPI Petstore example. The mock is mounted at <code>/api/mock</code> with 50ms
              latency so you can exercise the generated endpoints locally.
            </p>
            <p>
              Once generated, launch the Payments Baseline golden test suite to hit the mock server
              using the new repeat, think time, and retry controls.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
