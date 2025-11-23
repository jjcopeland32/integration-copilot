import { router, publicProcedure } from '../server';
import { z } from 'zod';
import { resolveProject } from '../../workspace';
import { MockStatus } from '@prisma/client';
import { ensureMockServer, stopMockServer } from '../../mock-server-manager';
import { setTimeout as delay } from 'node:timers/promises';

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

export const mockRouter = router({
  list: publicProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx.prisma, {
        projectId: input?.projectId,
        userId: ctx.userId,
        orgId: ctx.orgId,
      });

      const instances = await ctx.prisma.mockInstance.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: 'desc' },
      });
      return instances.map(describeMock);
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const instance = await toMockRecord(ctx, input.id);
      if (!instance) {
        throw new Error('Mock instance not found');
      }
      return describeMock(instance);
    }),

  start: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const mock = await ctx.prisma.mockInstance.findUnique({
        where: { id: input.id },
      });
      if (!mock) {
        throw new Error('Mock instance not found');
      }
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

  stop: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
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

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await stopMockServer(input.id);
      return ctx.prisma.mockInstance.delete({
        where: { id: input.id },
      });
    }),

  checkHealth: publicProcedure
    .input(z.object({ id: z.string(), timeoutMs: z.number().min(500).max(10000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const mock = await ctx.prisma.mockInstance.findUnique({
        where: { id: input.id },
      });
      if (!mock) {
        throw new Error('Mock instance not found');
      }

      const timeoutMs = input.timeoutMs ?? 3000;
      const now = new Date();
      let healthStatus: string = 'unknown';
      let status = mock.status;

      try {
        await ensureMockServer(mock, { forceRestart: false });
        const controller = new AbortController();
        const timer = delay(timeoutMs, null, { signal: controller.signal }).catch(() => null);
        const fetchPromise = fetch(mock.baseUrl, {
          method: 'GET',
          signal: controller.signal,
        }).catch((err) => {
          throw err;
        });
        const result = await Promise.race([fetchPromise, timer]);
        controller.abort();
        if (result && (result as Response).ok !== undefined) {
          const res = result as Response;
          healthStatus = res.ok ? 'healthy' : 'degraded';
          status = MockStatus.RUNNING;
        } else {
          healthStatus = 'unhealthy';
          status = MockStatus.STOPPED;
        }
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
});
