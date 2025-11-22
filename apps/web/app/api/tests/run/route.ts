import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Actor } from '@prisma/client';
import { runSuite } from '@integration-copilot/testkit';
import { RBACError, requireRole } from '@/lib/rbac';
import {
  loadSuiteExecutionContext,
  persistSuiteRun,
  SuiteForbiddenError,
  SuiteNotFoundError,
} from '@/lib/tests/golden-runner';
import { resolveOriginFromEnv, type EnvKey } from '@/lib/tests/origin';

export const dynamic = 'force-dynamic';

const PayloadSchema = z.object({
  suiteId: z.string().min(1),
  envKey: z.enum(['MOCK', 'SANDBOX', 'PROD']).default('MOCK'),
});

export async function POST(req: NextRequest) {
  try {
    await requireRole(['OWNER', 'ADMIN', 'VENDOR', 'PARTNER']);
  } catch (error) {
    if (error instanceof RBACError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    throw error;
  }

  const parsed = PayloadSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  }

  const { suiteId, envKey } = parsed.data;

  try {
    const context = await loadSuiteExecutionContext(suiteId);
    const origin = await resolveOriginFromEnv(envKey as EnvKey, context.suiteRecord.projectId);
    const runResult = await runSuite(suiteId, context.runnerSuite, {
      origin,
      saveArtifacts: true,
    });
    const persisted = await persistSuiteRun({
      context,
      actor: Actor.VENDOR,
      origin,
      runResult,
    });
    return NextResponse.json({ ok: true, result: persisted });
  } catch (error) {
    if (error instanceof SuiteNotFoundError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
    }
    if (error instanceof SuiteForbiddenError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    }
    console.error('[tests/run] suite execution error', error);
    const message =
      error instanceof Error ? error.message : 'Unable to run golden test suite';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
