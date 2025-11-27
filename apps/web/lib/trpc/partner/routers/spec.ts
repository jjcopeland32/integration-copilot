import { z } from 'zod';
import yaml from 'js-yaml';
import { SpecNormalizer } from '@integration-copilot/spec-engine';
import { Prisma, SpecKind } from '@prisma/client';
import {
  createPartnerRouter,
  partnerProtectedProcedure,
} from '../server';

const normalizer = new SpecNormalizer();

async function parseSpecPayload(payload: string) {
  const trimmed = payload.trim();
  if (!trimmed) {
    throw new Error('Spec content cannot be empty');
  }
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }
  return yaml.load(trimmed);
}

function inferSpecName(payload: any, fallback = 'Partner Submission') {
  if (payload && typeof payload === 'object') {
    const info = (payload as any).info;
    if (info && typeof info.title === 'string' && info.title.length > 0) {
      return info.title;
    }
  }
  return fallback;
}

function inferVersion(payload: any, fallback = '1.0.0') {
  if (payload && typeof payload === 'object') {
    const version = (payload as any).info?.version;
    if (typeof version === 'string' && version.length > 0) {
      return version;
    }
  }
  return fallback;
}

export const partnerSpecRouter = createPartnerRouter({
  submit: partnerProtectedProcedure
    .input(
      z.object({
        content: z.string().min(10, 'Provide a valid OpenAPI document'),
        name: z.string().min(1).optional(),
        version: z.string().min(1).optional(),
        kind: z.nativeEnum(SpecKind).default(SpecKind.OPENAPI).optional(),
        source: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const parsed = await parseSpecPayload(input.content);
      const normalized = await normalizer.normalizeFromObject(parsed);
      const spec = await ctx.prisma.spec.create({
        data: {
          projectId: ctx.session!.partnerProject.projectId,
          name: input.name ?? inferSpecName(parsed),
          version:
            input.version ?? normalized.version ?? inferVersion(parsed),
          kind: input.kind ?? SpecKind.OPENAPI,
          raw: parsed as unknown as Prisma.InputJsonValue,
          normalized: normalized as unknown as Prisma.InputJsonValue,
          rawUrl: input.source,
          submittedByPartnerProjectId: ctx.session!.partnerProjectId,
        },
      });

      return {
        spec: {
          id: spec.id,
          name: spec.name,
          version: spec.version,
          kind: spec.kind,
          submittedByPartnerProjectId: spec.submittedByPartnerProjectId,
        },
      };
    }),

  getBlueprint: partnerProtectedProcedure
    .input(z.object({ specId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify the spec belongs to the partner's project
      const spec = await ctx.prisma.spec.findFirst({
        where: {
          id: input.specId,
          projectId: ctx.session!.partnerProject.projectId,
        },
      });

      if (!spec) {
        return null;
      }

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
});
