import { router, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { MockStatus } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { ensureMockServer, stopMockServer } from '../../mock-server-manager';
import { setTimeout as delay } from 'node:timers/promises';
import { config } from '@/lib/config';

const storedMockConfig = z
  .object({
    specId: z.string().optional(),
    specName: z.string().optional(),
    routes: z
      .array(
        z.object({
          path: z.string(),
          method: z.string(),
          statusCode: z.number().optional(),
        })
      )
      .optional(),
    postmanCollection: z.any().optional(),
    settings: z
      .object({
        enableLatency: z.boolean().optional(),
        latencyMs: z.number().optional(),
        enableRateLimit: z.boolean().optional(),
        rateLimit: z.number().optional(),
      })
      .optional(),
  })
  .optional();

type StoredMockConfig = z.infer<typeof storedMockConfig>;

function resolvePort(baseUrl: string): number {
  try {
    const url = new URL(baseUrl);
    if (url.port) {
      return Number(url.port);
    }
    return url.protocol === 'https:' ? 443 : 80;
  } catch {
    return NaN;
  }
}

function describeMock(instance: Awaited<ReturnType<typeof toMockRecord>>) {
  const parsed = storedMockConfig.safeParse(instance.config);
  const config = parsed.success ? parsed.data ?? {} : {};
  const port = resolvePort(instance.baseUrl);
  const routeSummaries =
    config?.routes?.map((route) => ({
      path: route.path,
      method: route.method.toUpperCase(),
      statusCode: route.statusCode ?? 200,
    })) ?? [];

  return {
    id: instance.id,
    status: instance.status,
    baseUrl: instance.baseUrl,
    healthStatus: (instance as any).healthStatus ?? 'unknown',
    createdAt: instance.createdAt,
    updatedAt: instance.updatedAt,
    projectId: instance.projectId,
    specName: config?.specName ?? 'Mock Service',
    specId: config?.specId ?? null,
    port: Number.isNaN(port) ? (instance as any).port ?? null : port,
    lastStartedAt: (instance as any).lastStartedAt ?? null,
    lastStoppedAt: (instance as any).lastStoppedAt ?? null,
    lastHealthAt: (instance as any).lastHealthAt ?? null,
    uptimeSeconds:
      instance.status === MockStatus.RUNNING && (instance as any).lastStartedAt
        ? Math.max(
            0,
            Math.round(
              (Date.now() - new Date((instance as any).lastStartedAt as Date).getTime()) / 1000
            )
          )
        : 0,
    routeCount: routeSummaries.length,
    routes: routeSummaries,
    hasPostmanCollection: Boolean(config?.postmanCollection),
    postmanCollection: config?.postmanCollection ?? null,
    settings: {
      enableLatency: config?.settings?.enableLatency ?? true,
      latencyMs: config?.settings?.latencyMs ?? 50,
      enableRateLimit: config?.settings?.enableRateLimit ?? false,
      rateLimit: config?.settings?.rateLimit ?? 100,
    },
  };
}

async function toMockRecord(ctx: any, id: string) {
  return ctx.prisma.mockInstance.findUnique({
    where: { id },
  });
}

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

/**
 * Helper to verify project belongs to the user's org
 */
async function verifyProjectAccess(
  prisma: PrismaClient,
  projectId: string,
  orgId: string
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId },
  });
  if (!project) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Project not found or access denied',
    });
  }
  return project;
}

/**
 * Helper to verify mock instance belongs to user's org via its project
 */
async function verifyMockAccess(
  prisma: PrismaClient,
  mockId: string,
  orgId: string
) {
  const mock = await prisma.mockInstance.findFirst({
    where: { id: mockId },
    include: { project: true },
  });
  if (!mock || mock.project.orgId !== orgId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Mock instance not found or access denied',
    });
  }
  return mock;
}

export const mockRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify project belongs to user's org
      await verifyProjectAccess(ctx.prisma, input.projectId, ctx.orgId);

      const instances = await ctx.prisma.mockInstance.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: 'desc' },
      });
      return instances.map(describeMock);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify mock belongs to user's org
      const instance = await verifyMockAccess(ctx.prisma, input.id, ctx.orgId);
      return describeMock(instance);
    }),

  start: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify mock belongs to user's org
      const mock = await verifyMockAccess(ctx.prisma, input.id, ctx.orgId);
      
      await ensureMockServer(mock, { forceRestart: true });
      const now = new Date();
      return ctx.prisma.mockInstance.update({
        where: { id: input.id },
        data: {
          status: MockStatus.RUNNING,
          healthStatus: 'healthy',
          lastStartedAt: now,
          lastHealthAt: now,
          lastStoppedAt: null,
        },
      });
    }),

  stop: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify mock belongs to user's org
      await verifyMockAccess(ctx.prisma, input.id, ctx.orgId);
      
      await stopMockServer(input.id);
      return ctx.prisma.mockInstance.update({
        where: { id: input.id },
        data: {
          status: MockStatus.STOPPED,
          healthStatus: 'stopped',
          lastStoppedAt: new Date(),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify mock belongs to user's org
      await verifyMockAccess(ctx.prisma, input.id, ctx.orgId);
      
      await stopMockServer(input.id);
      return ctx.prisma.mockInstance.delete({
        where: { id: input.id },
      });
    }),

  checkHealth: protectedProcedure
    .input(z.object({ id: z.string(), timeoutMs: z.number().min(500).max(10000).optional() }))
    .mutation(async ({ ctx, input }) => {
      // Verify mock belongs to user's org
      const mock = await verifyMockAccess(ctx.prisma, input.id, ctx.orgId);

      const timeoutMs = input.timeoutMs ?? config.mocks.healthCheckTimeoutMs;
      const now = new Date();
      let healthStatus: string = 'unknown';
      let status = mock.status;

      try {
        await ensureMockServer(mock, { forceRestart: false });
        const result = await pingMock(mock.baseUrl, timeoutMs);
        healthStatus = result;
        status = result === 'unhealthy' ? MockStatus.STOPPED : MockStatus.RUNNING;
      } catch (error) {
        healthStatus = 'unhealthy';
        status = MockStatus.STOPPED;
        await stopMockServer(mock.id).catch(() => undefined);
      }

      const updated = await ctx.prisma.mockInstance.update({
        where: { id: mock.id },
        data: {
          healthStatus,
          status,
          lastHealthAt: now,
          lastStoppedAt: status === MockStatus.STOPPED ? now : mock.lastStoppedAt,
        },
      });

      return describeMock(updated as any);
    }),

  checkAll: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        timeoutMs: z.number().min(500).max(10000).optional(),
        autoRestart: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify project belongs to user's org
      await verifyProjectAccess(ctx.prisma, input.projectId, ctx.orgId);
      
      const timeoutMs = input.timeoutMs ?? config.mocks.healthCheckTimeoutMs;
      const autoRestart = input.autoRestart ?? config.mocks.autoRestart;
      const mocks = await ctx.prisma.mockInstance.findMany({
        where: { projectId: input.projectId },
      });

      const results: any[] = [];
      for (const mock of mocks) {
        const now = new Date();
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

        const updated = await ctx.prisma.mockInstance.update({
          where: { id: mock.id },
          data: {
            status,
            healthStatus,
            lastHealthAt: now,
            lastStoppedAt: status === MockStatus.STOPPED ? now : mock.lastStoppedAt,
          },
        });
        results.push(describeMock(updated as any));
      }

      return { ok: true, mocks: results };
    }),
});
