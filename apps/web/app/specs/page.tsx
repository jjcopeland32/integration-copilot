import fs from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { ingestOpenAPI, generateBlueprint } from '@integration-copilot/spec-engine';
import { stripePaymentSpec } from '@/lib/sample-specs';

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
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tests/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      suiteId: 'PAYMENTS_BASELINE_v1',
      baseUrl: demoState?.mockBaseUrl || baseUrl,
    }),
  });
  const data = await response.json();

  const runState: RunState = {
    ok: response.ok,
    summary: data.result?.summary,
    finishedAt: data.result?.finishedAt,
  };

  await writeJsonFile(LAST_RUN_PATH, runState);
  revalidatePath('/specs');
}

export const dynamic = 'force-dynamic';

export default async function SpecsPage() {
  const demoState = await readJsonFile<DemoState>(DEMO_STATE_PATH);
  const runState = await readJsonFile<RunState>(LAST_RUN_PATH);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Spec → Blueprint → Mock</h1>
        <p className="text-sm text-gray-500">
          Load the Petstore sample spec, generate a deterministic blueprint, and stage a mock base URL for demos.
        </p>
      </div>

      <form action={loadSampleSpecAction}>
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 transition"
        >
          Load Sample Spec (Petstore)
        </button>
      </form>

      {demoState && (
        <div className="rounded-lg border border-gray-200 p-4 space-y-2">
          <p className="text-sm text-gray-500">
            Last generated at {new Date(demoState.updatedAt).toLocaleString()}.
          </p>
          <p className="text-sm">
            Blueprint:{' '}
            <Link className="text-blue-600 underline" href={demoState.blueprintUrl}>
              {demoState.title} blueprint
            </Link>
          </p>
          <p className="text-sm">Mock base URL: {demoState.mockBaseUrl}</p>
        </div>
      )}

      <form action={runPaymentsBaselineAction}>
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 transition"
        >
          Run PAYMENTS Baseline
        </button>
      </form>

      {runState && (
        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold">Last Golden Test Run</h2>
          <p className="text-sm text-gray-500">
            {runState.finishedAt ? `Finished ${new Date(runState.finishedAt).toLocaleString()}` : 'No completed run yet.'}
          </p>
          {runState.summary ? (
            <p className="text-sm">
              Total {runState.summary.total} · Passed {runState.summary.passed} · Failed {runState.summary.failed} · Skipped {runState.summary.skipped}
            </p>
          ) : (
            <p className="text-sm text-gray-500">No summary recorded yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
