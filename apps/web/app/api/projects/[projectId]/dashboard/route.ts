import { NextRequest, NextResponse } from 'next/server';
import { RBACError, requireRole } from '@/lib/rbac';
import { getProjectDashboardSummary } from '@/lib/projects/dashboard';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: {
    projectId: string;
  };
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    await requireRole(['OWNER', 'ADMIN', 'VENDOR']);
  } catch (error) {
    if (error instanceof RBACError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    throw error;
  }

  const projectId = context.params?.projectId;
  if (!projectId) {
    return NextResponse.json({ ok: false, error: 'Project ID is required' }, { status: 400 });
  }

  try {
    const summary = await getProjectDashboardSummary(projectId);
    return NextResponse.json({ ok: true, dashboard: summary });
  } catch (error) {
    if (error instanceof Error && error.message === 'Project not found') {
      return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
    }
    console.error('[projects/dashboard] failed to build summary', error);
    const message = error instanceof Error ? error.message : 'Unable to load dashboard';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
