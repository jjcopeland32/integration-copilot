import fs from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { runSuite } from '@integration-copilot/testkit';
import { RBACError, requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { Actor, MockStatus } from '@prisma/client';
import { ensureMockServer } from '@/lib/mock-server-manager';

export const dynamic = 'force-dynamic';

interface RunPayload {
  suiteId: string;
  baseUrl?: string;
  actor?: Actor;
}

type StoredTestCase = {
  id?: string;
  name?: string;
  category?: string;
  request?: {
    method?: string;
    url?: string;
    path?: string;
    headers?: Record<string, string>;
    body?: unknown;
    repeat?: number;
    simulate?: Record<string, unknown>;
  };
  expectedStatus?: number;
  expect?: { status?: number };
};

function normalizeCases(rawCases: unknown[]): StoredTestCase[] {
  return rawCases.map((test, index) => {
    if (!test || typeof test !== 'object') {
      return {
        id: `case_${index}`,
        name: `Case ${index + 1}`,
      };
    }

    const value = test as StoredTestCase;
    const request = value.request ?? {};
    const { path, ...restRequest } = request;
    const url = request.url ?? path ?? '/';

    return {
      id: value.id ?? `case_${index}`,
      name: value.name ?? `Case ${index + 1}`,
      category: value.category,
      request: url
        ? {
            ...restRequest,
            url,
          }
        : undefined,
      expect: {
        status: value.expectedStatus ?? value.expect?.status,
      },
    };
  });
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

  const suiteRecord = await prisma.testSuite.findUnique({
    where: { id: payload.suiteId },
  });
  if (!suiteRecord) {
    return NextResponse.json({ ok: false, error: 'Suite not found' }, { status: 404 });
  }

  const rawCases = Array.isArray(suiteRecord.cases)
    ? (suiteRecord.cases as unknown[])
    : [];

  const cases = normalizeCases(rawCases);

  const suite = {
    name: suiteRecord.name,
    version: suiteRecord.version,
    cases,
  };

  const actor: Actor =
    payload.actor && Object.values(Actor).includes(payload.actor as Actor)
      ? (payload.actor as Actor)
      : Actor.VENDOR;
  let baseUrl = payload.baseUrl || process.env.APP_URL || 'http://localhost:3000';

  const mockInstance = await prisma.mockInstance.findFirst({
    where: { projectId: suiteRecord.projectId },
    orderBy: { createdAt: 'desc' },
  });

  if (mockInstance) {
    try {
      await ensureMockServer(mockInstance);
      if (mockInstance.status !== MockStatus.RUNNING) {
        await prisma.mockInstance.update({
          where: { id: mockInstance.id },
          data: { status: MockStatus.RUNNING },
        });
      }
    } catch (error) {
      console.warn('[Mock] Failed to start mock server', error);
    }
    baseUrl = mockInstance.baseUrl;
  }

  try {
    const rawResult = await runSuite({
      suite,
      baseUrl,
      actor,
    });
    await persistArtifacts(rawResult);

    const derivedSummary = rawResult.summary ?? {
      total: rawResult.results?.length ?? suite.cases.length,
      passed: rawResult.results?.filter((r) => r.status === 'passed')?.length ?? 0,
      failed: rawResult.results?.filter((r) => r.status !== 'passed')?.length ?? 0,
      skipped: rawResult.results?.filter((r) => r.status === 'skipped')?.length ?? 0,
    };
    const startedAtMs = rawResult.startedAt ? new Date(rawResult.startedAt).getTime() : undefined;
    const finishedAtMs = rawResult.finishedAt ? new Date(rawResult.finishedAt).getTime() : undefined;
    const summary = {
      ...derivedSummary,
      durationMs:
        typeof startedAtMs === 'number' && typeof finishedAtMs === 'number'
          ? Math.max(finishedAtMs - startedAtMs, 0)
          : undefined,
    };

    const normalizedResult = {
      suiteId: suiteRecord.id,
      startedAt: rawResult.startedAt,
      finishedAt: rawResult.finishedAt,
      summary,
      cases: (rawResult.results ?? []).map((test) => ({
        id: test.id,
        name: test.name,
        status: test.status,
        message: test.message,
        response: test.response,
      })),
    };

    await prisma.testRun.create({
      data: {
        suiteId: suiteRecord.id,
        actor,
        env: baseUrl,
        results: normalizedResult,
      },
    });

    return NextResponse.json({ ok: true, result: normalizedResult });
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
