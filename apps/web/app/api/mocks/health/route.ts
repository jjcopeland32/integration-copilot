import { NextRequest, NextResponse } from 'next/server';
import { MockStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import { ensureMockServer, stopMockServer } from '@/lib/mock-server-manager';
import { setTimeout as delay } from 'node:timers/promises';

export const dynamic = 'force-dynamic';

async function pingMock(baseUrl: string, timeoutMs: number): Promise<'healthy' | 'unhealthy' | 'degraded'> {
  const controller = new AbortController();
  const timer = delay(timeoutMs, null, { signal: controller.signal }).catch(() => null);
  try {
    const result = (await Promise.race([
      fetch(baseUrl, { method: 'GET', signal: controller.signal }).catch((err) => {
        throw err;
      }),
      timer,
    ])) as Response | null;
    controller.abort();
    if (!result) return 'unhealthy';
    return result.ok ? 'healthy' : 'degraded';
  } catch {
    controller.abort();
    return 'unhealthy';
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.MOCK_HEALTH_CRON_SECRET;
  if (secret) {
    const provided = req.headers.get('x-health-secret');
    if (provided !== secret) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  }

  const timeoutMs = config.mocks.healthCheckTimeoutMs;
  const autoRestart = config.mocks.autoRestart;
  const now = new Date();

  const mocks = await prisma.mockInstance.findMany();
  const results: Array<{ id: string; status: string; healthStatus: string }> = [];

  for (const mock of mocks) {
    let healthStatus: string = 'unknown';
    let status = mock.status;
    try {
      const result = await pingMock(mock.baseUrl, timeoutMs);
      healthStatus = result;
      if (result === 'unhealthy') {
        status = MockStatus.STOPPED;
        await stopMockServer(mock.id).catch(() => undefined);
        if (autoRestart) {
          await ensureMockServer(mock, { forceRestart: true }).catch(() => undefined);
          status = MockStatus.RUNNING;
          healthStatus = 'healthy';
        }
      } else {
        status = MockStatus.RUNNING;
      }
    } catch {
      healthStatus = 'unhealthy';
      status = MockStatus.STOPPED;
      await stopMockServer(mock.id).catch(() => undefined);
    }

    const updated = await prisma.mockInstance.update({
      where: { id: mock.id },
      data: {
        status,
        healthStatus,
        lastHealthAt: now,
        lastStoppedAt: status === MockStatus.STOPPED ? now : mock.lastStoppedAt,
      },
    });
    results.push({ id: updated.id, status: updated.status, healthStatus: (updated as any).healthStatus ?? 'unknown' });
  }

  return NextResponse.json({ ok: true, checked: results.length, results });
}
