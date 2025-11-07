import { NextRequest, NextResponse } from 'next/server';
import { runSuiteById } from '@integration-copilot/testkit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const suiteId = body?.suiteId as string | undefined;
    const baseUrl = body?.baseUrl as string | undefined;

    if (!suiteId || !baseUrl) {
      return NextResponse.json(
        { error: 'suiteId and baseUrl are required' },
        { status: 400 }
      );
    }

    const result = await runSuiteById(suiteId, {
      baseUrl,
      saveArtifacts: true,
    });

    return NextResponse.json({
      suiteId,
      runId: result.runId,
      summary: result.summary,
    });
  } catch (error) {
    console.error('[tests/run] failed to execute suite', error);
    return NextResponse.json(
      { error: 'Failed to execute golden tests' },
      { status: 500 }
    );
  }
}
