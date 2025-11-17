import { NextRequest, NextResponse } from 'next/server';
import { Actor } from '@prisma/client';
import {
  getPartnerSessionTokenFromHeaders,
  loadPartnerSession,
} from '@/lib/partner/session';
import {
  runGoldenSuite,
  SuiteForbiddenError,
  SuiteNotFoundError,
} from '@/lib/tests/golden-runner';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const token = getPartnerSessionTokenFromHeaders(req.headers);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const session = await loadPartnerSession(token);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.suiteId !== 'string') {
    return NextResponse.json({ ok: false, error: 'suiteId is required' }, { status: 400 });
  }

  try {
    const result = await runGoldenSuite({
      suiteId: body.suiteId,
      actor: Actor.PARTNER,
      expectedProjectId: session.partnerProject.projectId,
    });
    return NextResponse.json({ ok: true, result });
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
