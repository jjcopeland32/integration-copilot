import { NextRequest, NextResponse } from 'next/server';
import { RBACError, requireRole } from '@/lib/rbac';
import { getSuiteById } from '@/lib/test-suites';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, context: any) {
  const { params } = context as { params: { suiteId: string } };
  try {
    await requireRole(['OWNER','ADMIN','VENDOR','PARTNER']);
  } catch (error) {
    if (error instanceof RBACError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error('[tests] RBAC check failed', error);
    return NextResponse.json({ ok: false, error: 'Authorization error' }, { status: 500 });
  }
  try {
    const suite = await getSuiteById(params.suiteId);
    if (!suite) {
      return NextResponse.json({ ok: false, error: `Suite ${params.suiteId} not found` }, { status: 404 });
    }
    return NextResponse.json(suite);
  } catch (error) {
    console.error('[tests] failed to load suite', error);
    return NextResponse.json({ ok: false, error: 'Unable to load suite definition' }, { status: 500 });
  }
}

