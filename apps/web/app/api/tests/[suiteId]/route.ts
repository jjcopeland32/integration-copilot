import { NextRequest, NextResponse } from 'next/server';
import { RBACError, requireRole } from '@/lib/rbac';
import { getSuiteById } from '@/lib/test-suites';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { suiteId: string } }
) {
  try {
    await requireRole(['OWNER', 'ADMIN', 'VENDOR', 'PARTNER']);
  } catch (error) {
    if (error instanceof RBACError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    throw error;
  }

  const suite = await getSuiteById(params.suiteId);
  if (!suite) {
    return NextResponse.json({ ok: false, error: 'Suite not found' }, { status: 404 });
  }

  return NextResponse.json(suite);
}
