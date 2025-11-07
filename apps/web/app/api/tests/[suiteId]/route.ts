import { NextRequest, NextResponse } from 'next/server';
import { loadSuiteById } from '@integration-copilot/testkit';

export async function GET(
  _request: NextRequest,
  context: { params: { suiteId: string } }
) {
  const { suiteId } = context.params;

  try {
    const suite = await loadSuiteById(suiteId);
    if (!suite) {
      return NextResponse.json(
        { error: `Suite ${suiteId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(suite);
  } catch (error) {
    console.error('[tests] failed to load suite', error);
    return NextResponse.json(
      { error: 'Unable to load suite definition' },
      { status: 500 }
    );
  }
}
