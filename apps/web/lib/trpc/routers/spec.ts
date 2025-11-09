import { router, publicProcedure } from '../server';
import { z } from 'zod';
import yaml from 'js-yaml';
import { SpecNormalizer, type NormalizedSpec } from '@integration-copilot/spec-engine';
import { MockGenerator, GoldenTestGenerator } from '@integration-copilot/mockgen';
import { sampleSpecs } from '../../sample-specs';
import { ensureProjectForSpec, resolveProject } from '../../workspace';
import { MockStatus, SpecKind } from '@prisma/client';
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
    return spec.normalized as NormalizedSpec;
  }

  if (!spec.raw) {
    throw new Error('Spec lacks raw content for normalization');
  }

  const normalized = await normalizeSpec(spec.raw);
  await prisma.spec.update({
    where: { id: specId },
    data: { normalized },
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
          raw: parsed,
          normalized,
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
          raw: parsed,
          normalized,
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
      const normalized = await ensureNormalizedSpec(ctx.prisma, input.specId);
      return {
        success: true,
        endpoints: normalized.endpoints.length,
        markdown: buildBlueprintMarkdown(normalized),
        spec: normalized,
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
      const mockCount = await ctx.prisma.mockInstance.count({
        where: { projectId: specRecord.projectId },
      });
      const port = 3001 + mockCount;
      const baseUrl = `http://localhost:${port}`;
      const { routes, postmanCollection } = mockGenerator.generate(normalized, {
        baseUrl,
        enableLatency: true,
        latencyMs: 50,
      });

      const mock = await ctx.prisma.mockInstance.create({
        data: {
          projectId: specRecord.projectId,
          baseUrl,
          status: MockStatus.STOPPED,
          config: {
            routes,
            postmanCollection,
          },
        },
      });

      return {
        success: true,
        mock,
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
      const baseUrl = process.env.APP_URL ?? 'http://localhost:3000';
      const tests = goldenTestGenerator.generate(normalized, baseUrl);
      const suiteName = `${extractSpecName(spec.raw, 'Integration')} Golden Tests`;

      const testSuite = await ctx.prisma.testSuite.create({
        data: {
          projectId: spec.projectId,
          name: suiteName,
          version: normalized.version ?? '1.0.0',
          cases: tests,
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
            raw: specDoc,
            normalized,
          },
        });
        specs.push(spec);
      }
      return specs;
    }),
});
