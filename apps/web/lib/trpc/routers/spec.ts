import { router, publicProcedure } from '../server';
import { z } from 'zod';
import yaml from 'js-yaml';
import { SpecNormalizer, type NormalizedSpec } from '@integration-copilot/spec-engine';
import { MockGenerator, GoldenTestGenerator } from '@integration-copilot/mockgen';
import { sampleSpecs } from '../../sample-specs';
import { ensureProjectForSpec, resolveProject } from '../../workspace';
import { MockStatus, SpecKind, Prisma } from '@prisma/client';
import { ensureMockServer } from '../../mock-server-manager';
import type { PrismaClient } from '@prisma/client';

const normalizer = new SpecNormalizer();
const mockGenerator = new MockGenerator();
const goldenTestGenerator = new GoldenTestGenerator();

async function normalizeSpec(content: any): Promise<NormalizedSpec> {
  return normalizer.normalizeFromObject(content);
}

async function ensureNormalizedSpec(prisma: PrismaClient, specId: string): Promise<NormalizedSpec> {
  const spec = await prisma.spec.findUnique({ where: { id: specId } });
  if (!spec) throw new Error('Spec not found');

  if (spec.normalized) {
    return spec.normalized as unknown as NormalizedSpec;
  }

  if (!spec.raw) {
    throw new Error('Spec lacks raw content for normalization');
  }

  const normalized = await normalizeSpec(spec.raw);
  await prisma.spec.update({
    where: { id: specId },
    data: { normalized: normalized as unknown as Prisma.InputJsonValue },
  });
  return normalized;
}

function buildBlueprintMarkdown(spec: NormalizedSpec): string {
  const lines: string[] = [];
  lines.push(`# ${spec.title ?? 'API'} Integration Blueprint`);
  lines.push('');
  lines.push(`**Version:** ${spec.version ?? '1.0.0'}`);
  if (spec.description) {
    lines.push('');
    lines.push(spec.description);
  }
  lines.push('');
  lines.push(`## Endpoints (${spec.endpoints.length})`);
  lines.push('');
  for (const endpoint of spec.endpoints.slice(0, 50)) {
    lines.push(`- **${endpoint.method} ${endpoint.path}** ${endpoint.summary ?? ''}`);
  }
  return lines.join('\n');
}

async function parseSpecPayload(payload: any) {
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.parse(trimmed);
    }
    return yaml.load(trimmed);
  }
  return payload;
}

function extractSpecName(payload: any, fallback = 'Imported Spec') {
  if (payload && typeof payload === 'object' && 'info' in payload) {
    const title = (payload as any).info?.title;
    if (typeof title === 'string' && title.length > 0) {
      return title;
    }
  }
  return fallback;
}

export const specRouter = router({
  list: publicProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx.prisma, {
        projectId: input?.projectId,
        userId: ctx.userId,
        orgId: ctx.orgId,
      });

      return ctx.prisma.spec.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: 'desc' },
      });
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.spec.findUnique({
        where: { id: input.id },
      });
    }),

  importFromUrl: publicProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        url: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProjectForSpec(ctx.prisma, input.projectId, {
        userId: ctx.userId,
        orgId: ctx.orgId,
      });

      const response = await fetch(input.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch spec from ${input.url}`);
      }
      const rawText = await response.text();
      const parsed = await parseSpecPayload(rawText);
      const normalized = await normalizeSpec(parsed);
      const specName = extractSpecName(parsed, input.url);

      return ctx.prisma.spec.create({
        data: {
          projectId: project.id,
          name: specName,
          kind: SpecKind.OPENAPI,
          version: normalized.version ?? '1.0.0',
          rawUrl: input.url,
          raw: parsed as unknown as Prisma.InputJsonValue,
          normalized: normalized as unknown as Prisma.InputJsonValue,
        },
      });
    }),

  importFromObject: publicProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        spec: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProjectForSpec(ctx.prisma, input.projectId, {
        userId: ctx.userId,
        orgId: ctx.orgId,
      });

      const parsed = await parseSpecPayload(input.spec);
      const normalized = await normalizeSpec(parsed);
      const specName = extractSpecName(parsed);

      return ctx.prisma.spec.create({
        data: {
          projectId: project.id,
          name: specName,
          kind: SpecKind.OPENAPI,
          version: normalized.version ?? '1.0.0',
          raw: parsed as unknown as Prisma.InputJsonValue,
          normalized: normalized as unknown as Prisma.InputJsonValue,
        },
      });
    }),

  generateBlueprint: publicProcedure
    .input(
      z.object({
        specId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const spec = await ctx.prisma.spec.findUnique({
        where: { id: input.specId },
      });
      if (!spec) throw new Error('Spec not found');

      const normalized = await ensureNormalizedSpec(ctx.prisma, input.specId);
      const markdown = buildBlueprintMarkdown(normalized);

      // Check if a blueprint already exists for this spec
      const existingBlueprint = await ctx.prisma.blueprint.findFirst({
        where: { specId: input.specId },
        orderBy: { createdAt: 'desc' },
      });

      let blueprint;
      if (existingBlueprint) {
        // Update existing blueprint
        blueprint = await ctx.prisma.blueprint.update({
          where: { id: existingBlueprint.id },
          data: {
            version: normalized.version ?? '1.0.0',
            customerScope: {
              markdown,
              endpoints: normalized.endpoints.length,
              generatedAt: new Date().toISOString(),
            } as unknown as Prisma.InputJsonValue,
          },
        });
      } else {
        // Create new blueprint
        blueprint = await ctx.prisma.blueprint.create({
          data: {
            projectId: spec.projectId,
            specId: input.specId,
            version: normalized.version ?? '1.0.0',
            customerScope: {
              markdown,
              endpoints: normalized.endpoints.length,
              generatedAt: new Date().toISOString(),
            } as unknown as Prisma.InputJsonValue,
          },
        });
      }

      return {
        success: true,
        blueprintId: blueprint.id,
        endpoints: normalized.endpoints.length,
        markdown,
        spec: normalized,
      };
    }),

  getBlueprint: publicProcedure
    .input(z.object({ specId: z.string() }))
    .query(async ({ ctx, input }) => {
      const blueprint = await ctx.prisma.blueprint.findFirst({
        where: { specId: input.specId },
        orderBy: { createdAt: 'desc' },
      });
      
      if (!blueprint) {
        return null;
      }

      const customerScope = blueprint.customerScope as { markdown?: string; endpoints?: number } | null;
      return {
        id: blueprint.id,
        specId: blueprint.specId,
        version: blueprint.version,
        markdown: customerScope?.markdown ?? null,
        endpoints: customerScope?.endpoints ?? 0,
        createdAt: blueprint.createdAt,
        updatedAt: blueprint.updatedAt,
      };
    }),

  generateMock: publicProcedure
    .input(z.object({ specId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const specRecord = await ctx.prisma.spec.findUnique({
        where: { id: input.specId },
      });
      if (!specRecord) throw new Error('Spec not found');

      const normalized = await ensureNormalizedSpec(ctx.prisma, input.specId);
      const existingInstances = await ctx.prisma.mockInstance.findMany({
        where: { projectId: specRecord.projectId },
      });

      const existingForSpec = existingInstances.find((instance) => {
        const config = instance.config as any;
        return config?.specId === specRecord.id;
      });

      const usedPorts = new Set<number>();
      for (const inst of existingInstances) {
        const port =
          typeof inst.port === 'number' && Number.isFinite(inst.port)
            ? inst.port
            : (() => {
                try {
                  const url = new URL(inst.baseUrl);
                  return url.port ? Number(url.port) : null;
                } catch {
                  return null;
                }
              })();
        if (typeof port === 'number') usedPorts.add(port);
      }

      const allocatePort = () => {
        if (existingForSpec) {
          const port =
            typeof existingForSpec.port === 'number' && Number.isFinite(existingForSpec.port)
              ? existingForSpec.port
              : (() => {
                  try {
                    const url = new URL(existingForSpec.baseUrl);
                    return url.port ? Number(url.port) : null;
                  } catch {
                    return null;
                  }
                })();
          if (typeof port === 'number') return port;
        }
        let port = 3001;
        while (usedPorts.has(port)) {
          port += 1;
        }
        return port;
      };

      const port = allocatePort();
      const baseUrl = existingForSpec?.baseUrl ?? `http://localhost:${port}`;

      const defaultSettings = {
        baseUrl,
        enableLatency: true,
        latencyMs: 50,
        enableRateLimit: true,
        rateLimit: 100,
      };
      const existingSettings = (existingForSpec?.config as any)?.settings ?? {};
      const mergedSettings = {
        ...defaultSettings,
        ...existingSettings,
        baseUrl,
      };

      const { routes, postmanCollection } = mockGenerator.generate(normalized, mergedSettings);

      const now = new Date();
      let mock =
        existingForSpec ??
        (await ctx.prisma.mockInstance.create({
          data: {
            projectId: specRecord.projectId,
            baseUrl,
            port,
            status: MockStatus.STOPPED,
            healthStatus: 'unknown',
            config: {} as Prisma.InputJsonValue,
          },
        }));

      mock = await ctx.prisma.mockInstance.update({
        where: { id: mock.id },
        data: {
          baseUrl,
          port,
          status: MockStatus.RUNNING,
          healthStatus: 'healthy',
          lastStartedAt: now,
          lastHealthAt: now,
          lastStoppedAt: null,
          config: {
            specId: specRecord.id,
            specName: specRecord.name,
            routes,
            postmanCollection,
            settings: mergedSettings,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      await ensureMockServer(
        {
          id: mock.id,
          baseUrl: mock.baseUrl,
          port: mock.port,
          config: mock.config,
        },
        { forceRestart: true }
      );

      return {
        success: true,
        mock: {
          id: mock.id,
          status: mock.status,
          baseUrl: mock.baseUrl,
          port: mock.port,
          projectId: mock.projectId,
          createdAt: mock.createdAt,
          updatedAt: mock.updatedAt,
        },
        routes,
      };
    }),

  generateTests: publicProcedure
    .input(z.object({ specId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const spec = await ctx.prisma.spec.findUnique({
        where: { id: input.specId },
      });
      if (!spec) throw new Error('Spec not found');

      const normalized = await ensureNormalizedSpec(ctx.prisma, input.specId);
      const runningMock = await ctx.prisma.mockInstance.findFirst({
        where: { projectId: spec.projectId, status: MockStatus.RUNNING },
        orderBy: { createdAt: 'desc' },
      });
      const baseUrl = runningMock?.baseUrl ?? process.env.APP_URL ?? 'http://localhost:3000';
      const tests = goldenTestGenerator.generate(normalized, baseUrl);
      const suiteName = `${extractSpecName(spec.raw, 'Integration')} Golden Tests`;

      const testSuite = await ctx.prisma.testSuite.create({
        data: {
          projectId: spec.projectId,
          name: suiteName,
          version: normalized.version ?? '1.0.0',
          cases: tests as unknown as Prisma.InputJsonValue,
        },
      });

      return {
        success: true,
        testSuite,
        tests,
      };
    }),

  loadSamples: publicProcedure
    .input(z.object({ projectId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProjectForSpec(ctx.prisma, input.projectId, {
        userId: ctx.userId,
        orgId: ctx.orgId,
      });

      const specs = [];
      for (const specDoc of [sampleSpecs.stripe, sampleSpecs.todo]) {
        const normalized = await normalizeSpec(specDoc);
        const name = extractSpecName(specDoc, specDoc?.info?.title ?? 'Sample Spec');
        const spec = await ctx.prisma.spec.create({
          data: {
            projectId: project.id,
            name,
            kind: SpecKind.OPENAPI,
            version: normalized.version ?? '1.0.0',
            raw: specDoc as unknown as Prisma.InputJsonValue,
            normalized: normalized as unknown as Prisma.InputJsonValue,
          },
        });
        specs.push(spec);
      }
      return specs;
    }),
});
