import { router, protectedProcedure } from '../server';
import { z } from 'zod';
import { createSpecEngine } from '@integration-copilot/spec-engine';

const specEngine = createSpecEngine();

export const specRouter = router({
  importFromUrl: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        url: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const spec = await specEngine.importFromURL(input.url);

      const saved = await ctx.prisma.spec.create({
        data: {
          projectId: input.projectId,
          kind: 'OPENAPI',
          version: spec.version,
          rawUrl: input.url,
          normalized: spec as any,
        },
      });

      return saved;
    }),

  importFromObject: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        spec: z.any(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const spec = await specEngine.importFromObject(input.spec);

      const saved = await ctx.prisma.spec.create({
        data: {
          projectId: input.projectId,
          kind: 'OPENAPI',
          version: spec.version,
          normalized: spec as any,
        },
      });

      return saved;
    }),

  generateBlueprint: protectedProcedure
    .input(
      z.object({
        specId: z.string(),
        config: z.object({
          customerScope: z
            .object({
              includedEndpoints: z.array(z.string()).optional(),
              excludedEndpoints: z.array(z.string()).optional(),
            })
            .optional(),
          webhooks: z
            .object({
              enabled: z.boolean(),
              endpoints: z.array(z.string()).optional(),
            })
            .optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const spec = await ctx.prisma.spec.findUnique({
        where: { id: input.specId },
      });

      if (!spec) {
        throw new Error('Spec not found');
      }

      const blueprint = specEngine.generateBlueprint(
        spec.normalized as any,
        input.config
      );

      const saved = await ctx.prisma.blueprint.create({
        data: {
          projectId: spec.projectId,
          specId: spec.id,
          version: blueprint.version,
          customerScope: input.config as any,
          markdownUrl: `/blueprints/${spec.id}.md`,
        },
      });

      return { ...saved, markdown: blueprint.markdown };
    }),

  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      return ctx.prisma.spec.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: 'desc' },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.prisma.spec.findUnique({
        where: { id: input.id },
        include: { blueprints: true },
      });
    }),
});
