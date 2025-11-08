import fs from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { runSuite, Actor } from '@integration-copilot/testkit';
import { RBACError, requireRole } from '@/lib/rbac';
import { getSuiteById } from '@/lib/test-suites';

export const dynamic = 'force-dynamic';

interface RunPayload {
  suiteId: string;
  baseUrl?: string;
  actor?: Actor;
}

async function persistArtifacts(result: unknown) {
  try {
    const artifactsDir = path.join(process.cwd(), '.artifacts/testruns');
    await fs.mkdir(artifactsDir, { recursive: true });
    const fileName = `${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await fs.writeFile(path.join(artifactsDir, fileName), JSON.stringify(result, null, 2));
  } catch (error) {
    console.warn('[TestKit] Unable to persist artifacts', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(['OWNER', 'ADMIN', 'VENDOR', 'PARTNER']);
  } catch (error) {
    if (error instanceof RBACError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    throw error;
  }

  let payload: RunPayload;
  try {
    payload = (await req.json()) as RunPayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!payload?.suiteId) {
    return NextResponse.json({ ok: false, error: 'suiteId is required' }, { status: 400 });
  }

  const suite = await getSuiteById(payload.suiteId);
  if (!suite) {
    return NextResponse.json({ ok: false, error: 'Suite not found' }, { status: 404 });
  }

  const baseUrl = payload.baseUrl || process.env.APP_URL || 'http://localhost:3000';

  try {
    const result = await runSuite({ suite, baseUrl, actor: payload.actor });
    await persistArtifacts(result);

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to run golden test suite';
    const failureArtifact = {
      ok: false,
      suiteId: suite.name,
      baseUrl,
      actor: payload.actor,
      error: message,
      occurredAt: new Date().toISOString(),
    };
    await persistArtifacts(failureArtifact);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
