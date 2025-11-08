import fs from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { FileCode, Server, Sparkles, TestTube, CheckCircle, Upload } from 'lucide-react';
import { ingestOpenAPI, generateBlueprint } from '@integration-copilot/spec-engine';
import { stripePaymentSpec } from '@/lib/sample-specs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const BLUEPRINT_DIR = path.join(process.cwd(), 'apps/web/public/blueprints');
const CACHE_DIR = path.join(process.cwd(), '.cache');
const DEMO_STATE_PATH = path.join(CACHE_DIR, 'spec-demo.json');
const LAST_RUN_PATH = path.join(CACHE_DIR, 'spec-demo-last-run.json');

interface DemoState {
  blueprintUrl: string;
  mockBaseUrl: string;
  updatedAt: string;
  title: string;
}

interface RunState {
  ok: boolean;
  summary?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  finishedAt?: string;
  status?: number;
  error?: string;
}

interface SampleSpec {
  id: string;
  name: string;
  type: string;
  endpoints: number;
  description: string;
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJsonFile(filePath: string, data: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function loadSampleSpecAction() {
  'use server';

  try {
    const petstoreUrl = 'https://petstore3.swagger.io/api/v3/openapi.json';
    let model;
    try {
      model = await ingestOpenAPI({ urlOrString: petstoreUrl });
    } catch (error) {
      console.warn('[Specs] Falling back to local sample spec', error);
      model = await ingestOpenAPI({ urlOrString: stripePaymentSpec });
    }

    const blueprint = generateBlueprint(model, { scope: 'demo' });
    await fs.mkdir(BLUEPRINT_DIR, { recursive: true });
    const blueprintPath = path.join(BLUEPRINT_DIR, 'petstore-demo.md');
    await fs.writeFile(blueprintPath, blueprint.markdown);

    const demoState: DemoState = {
      blueprintUrl: '/blueprints/petstore-demo.md',
      mockBaseUrl: 'http://localhost:4010/mock/petstore',
      updatedAt: new Date().toISOString(),
      title: blueprint.json.title ?? 'Petstore',
    };

    await writeJsonFile(DEMO_STATE_PATH, demoState);
    revalidatePath('/specs');
  } catch (error) {
    console.error('[Specs] Unable to load sample spec', error);
    throw error;
  }
}

async function runPaymentsBaselineAction() {
  'use server';

  const demoState = await readJsonFile<DemoState>(DEMO_STATE_PATH);
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  let runState: RunState;

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tests/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        suiteId: 'PAYMENTS_BASELINE_v1',
        baseUrl: demoState?.mockBaseUrl || baseUrl,
      }),
    });
    const data = await response
      .json()
      .catch(() => ({ ok: false, error: 'Unable to parse response from runner' }));

    if (!response.ok) {
      runState = {
        ok: false,
        status: response.status,
        error:
          typeof data?.error === 'string'
            ? data.error
            : 'Golden test runner returned an error response',
        finishedAt: new Date().toISOString(),
      };
    } else {
      runState = {
        ok: true,
        status: response.status,
        summary: data.result?.summary,
        finishedAt: data.result?.finishedAt || new Date().toISOString(),
      };
    }
  } catch (error) {
    runState = {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unexpected error running PAYMENTS baseline',
      finishedAt: new Date().toISOString(),
    };
  }

  await writeJsonFile(LAST_RUN_PATH, runState);
  revalidatePath('/specs');
}

function getSampleSpecs(demoState: DemoState | null): SampleSpec[] {
  return [
    {
      id: 'petstore',
      name: demoState?.title ?? 'Petstore Sample API',
      type: 'OPENAPI 3.0',
      endpoints: 20,
      description: 'Canonical Petstore reference spec imported from Swagger.',
    },
    {
      id: 'stripe',
      name: 'Stripe Payments API',
      type: 'OPENAPI (local sample)',
      endpoints: 32,
      description: 'Curated payments flows used for baseline certification demos.',
    },
  ];
}

export const dynamic = 'force-dynamic';

export default async function SpecsPage() {
  const demoState = await readJsonFile<DemoState>(DEMO_STATE_PATH);
  const runState = await readJsonFile<RunState>(LAST_RUN_PATH);
  const sampleSpecs = getSampleSpecs(demoState);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold gradient-text">API Specifications</h1>
          <p className="text-lg text-gray-600 mt-2">
            Import public specs, generate blueprints, and wire up deterministic mock servers.
          </p>
        </div>
        <form action={loadSampleSpecAction} className="flex justify-end">
          <Button type="submit" size="lg" variant="gradient" className="gap-2">
            <Upload className="h-5 w-5" />
            Load Sample Spec (Petstore)
          </Button>
        </form>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {sampleSpecs.map((spec, index) => (
          <Card key={spec.id} className="card-hover animate-in" style={{ animationDelay: `${index * 100}ms` }}>
            <CardHeader>
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                  <FileCode className="h-6 w-6 text-white" />
                </div>
                <Badge variant={demoState ? 'success' : 'info'} className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {demoState ? 'Ready' : 'Demo'}
                </Badge>
              </div>
              <CardTitle className="text-xl">{spec.name}</CardTitle>
              <p className="text-sm text-gray-600">
                {spec.type} • {spec.endpoints} endpoints
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">{spec.description}</p>
              {spec.id === 'petstore' && demoState && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm">
                  <p className="font-semibold text-blue-700 mb-1">Blueprint & Mock ready</p>
                  <p className="text-blue-700">
                    Blueprint:{' '}
                    <Link className="underline" href={demoState.blueprintUrl}>
                      View generated markdown
                    </Link>
                  </p>
                  <p className="text-blue-700">Mock base URL: {demoState.mockBaseUrl}</p>
                  <p className="text-xs text-blue-500 mt-2">
                    Generated {new Date(demoState.updatedAt).toLocaleString()}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <Button type="button" className="bg-gradient-to-r from-purple-500 to-pink-500 gap-2">
                  <Sparkles className="h-4 w-4" /> Blueprint
                </Button>
                <Button type="button" variant="outline" className="gap-1">
                  <Server className="h-4 w-4" /> Mock
                </Button>
                <Button type="button" variant="outline" className="gap-1">
                  <TestTube className="h-4 w-4" /> Tests
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="animate-in" style={{ animationDelay: '300ms' }}>
        <CardHeader>
          <CardTitle className="text-xl">🚀 Golden Test Baseline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Kick off the PAYMENTS baseline suite using the TestKit runner. Results are cached below for quick demos.
          </p>
          <form action={runPaymentsBaselineAction}>
            <Button type="submit" className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
              <TestTube className="h-4 w-4" /> Run PAYMENTS Baseline
            </Button>
          </form>
          {runState && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                runState.ok
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {runState.ok && runState.summary ? (
                <p>
                  Total {runState.summary.total} • Passed {runState.summary.passed} • Failed {runState.summary.failed} • Skipped{' '}
                  {runState.summary.skipped}
                </p>
              ) : null}
              {!runState.ok ? (
                <div className="space-y-1">
                  <p className="font-semibold">
                    Last attempt failed{runState.status ? ` (HTTP ${runState.status})` : ''}
                  </p>
                  <p>{runState.error ?? 'Unknown error encountered while running the suite.'}</p>
                </div>
              ) : null}
              {runState.ok && !runState.summary ? <p>No summary recorded yet.</p> : null}
              <p className="text-xs mt-1">
                {runState.finishedAt
                  ? `Last run: ${new Date(runState.finishedAt).toLocaleString()}`
                  : 'Run the suite to populate demo metrics.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="animate-in" style={{ animationDelay: '400ms' }}>
        <CardHeader>
          <CardTitle className="text-xl">🛠️ How the demo works</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-gray-700 md:grid-cols-3">
          <div>
            <h3 className="font-semibold mb-1">1. Load Sample Specs</h3>
            <p>Pulls the Petstore OpenAPI document (with a local fallback) and stores the normalized model.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">2. Generate Blueprint & Mock</h3>
            <p>Writes a markdown blueprint to <code>apps/web/public/blueprints/</code> and stages a deterministic mock base URL.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">3. Run Golden Tests</h3>
            <p>Calls <code>/api/tests/run</code> which delegates to the TestKit CLI logic for summary + artifact capture.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
