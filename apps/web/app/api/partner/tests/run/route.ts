import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Actor } from '@prisma/client';
import { runSuiteById } from '@integration-copilot/testkit';
import {
  getPartnerSessionTokenFromHeaders,
  loadPartnerSession,
} from '@/lib/partner/session';
import {
  loadSuiteExecutionContext,
  persistSuiteRun,
  SuiteForbiddenError,
  SuiteNotFoundError,
} from '@/lib/tests/golden-runner';
import { resolveOriginFromEnv, type EnvKey } from '@/lib/tests/origin';
import { withRateLimit, testExecutionConfig } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const PayloadSchema = z.object({
  suiteId: z.string().min(1),
  envKey: z.enum(['MOCK', 'SANDBOX', 'PROD']).default('MOCK'),
});

export async function POST(req: NextRequest) {
  // Check rate limit first - test execution is resource-intensive
  const rateLimitResponse = withRateLimit(req, testExecutionConfig);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const token = getPartnerSessionTokenFromHeaders(req.headers);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const session = await loadPartnerSession(token);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = PayloadSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'suiteId is required' }, { status: 400 });
  }

  try {
    const { suiteId, envKey } = parsed.data;
    const context = await loadSuiteExecutionContext(
      suiteId,
      session.partnerProject.projectId
    );
    const origin = await resolveOriginFromEnv(envKey as EnvKey, context.suiteRecord.projectId);
    const runResult = await runSuiteById(suiteId, { origin, saveArtifacts: true });
    const persisted = await persistSuiteRun({
      context,
      actor: Actor.PARTNER,
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
    const message =
      error instanceof Error ? error.message : 'Unable to run golden test suite';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
