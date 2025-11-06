import { router, publicProcedure } from '../server';
import { z } from 'zod';
import { specStore, mockStore, testStore } from '../../demo-store';
import { sampleSpecs } from '../../sample-specs';
import { SpecNormalizer } from '@integration-copilot/spec-engine';
import { MockGenerator } from '@integration-copilot/mockgen';

export const specRouter = router({
  // List all specs
  list: publicProcedure
    .input(z.object({ projectId: z.string().optional() }))
    .query(({ input }) => {
      if (input.projectId) {
        return specStore.getByProjectId(input.projectId);
      }
      return specStore.getAll();
    }),

  // Get spec by ID
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      return specStore.getById(input.id);
    }),

  // Import spec from URL or content
  importFromUrl: publicProcedure
    .input(z.object({
      projectId: z.string(),
      url: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      const { projectId, url } = input;
      
      // For demo, use sample specs
      const name = url.includes('stripe') ? 'Stripe Payment API' : 'Todo API';
      const content = url.includes('stripe') ? sampleSpecs.stripe : sampleSpecs.todo;

      const spec = specStore.create({
        projectId,
        name,
        type: 'OPENAPI',
        url,
        content,
      });

      return spec;
    }),

  // Import from object
  importFromObject: publicProcedure
    .input(z.object({
      projectId: z.string(),
      spec: z.any(),
    }))
    .mutation(async ({ input }) => {
      const spec = specStore.create({
        projectId: input.projectId,
        name: input.spec.info?.title || 'Imported Spec',
        type: 'OPENAPI',
        content: input.spec,
      });

      return spec;
    }),

  // Generate blueprint from spec
  generateBlueprint: publicProcedure
    .input(z.object({ 
      specId: z.string(),
      config: z.object({
        customerScope: z.object({
          includedEndpoints: z.array(z.string()).optional(),
          excludedEndpoints: z.array(z.string()).optional(),
        }).optional(),
        webhooks: z.object({
          enabled: z.boolean(),
          endpoints: z.array(z.string()).optional(),
        }).optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const spec = specStore.getById(input.specId);
      if (!spec) throw new Error('Spec not found');

      try {
        const normalizer = new SpecNormalizer();
        const normalized = await normalizer.normalize(spec.content);
        
        return {
          success: true,
          endpoints: normalized.paths?.length || 0,
          operations: Object.keys(normalized.paths || {}).length,
          blueprint: normalized,
          markdown: `# API Blueprint: ${spec.name}\n\nGenerated from OpenAPI specification.`,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    }),

  // Generate mock from spec
  generateMock: publicProcedure
    .input(z.object({ specId: z.string() }))
    .mutation(async ({ input }) => {
      const spec = specStore.getById(input.specId);
      if (!spec) throw new Error('Spec not found');

      try {
        const generator = new MockGenerator();
        const mockConfig = generator.generateFromSpec(spec.content);

        // Create mock instance
        const mock = mockStore.create({
          projectId: spec.projectId,
          specId: spec.id,
          name: `${spec.name} Mock`,
          status: 'STOPPED',
          port: 3001 + mockStore.getAll().length,
          requests: 0,
        });

        return {
          success: true,
          mock,
          config: mockConfig,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    }),

  // Generate tests from spec
  generateTests: publicProcedure
    .input(z.object({ specId: z.string() }))
    .mutation(async ({ input }) => {
      const spec = specStore.getById(input.specId);
      if (!spec) throw new Error('Spec not found');

      try {
        const generator = new MockGenerator();
        const tests = generator.generateGoldenTests(spec.content);

        // Create test suite
        const testSuite = testStore.create({
          projectId: spec.projectId,
          name: `${spec.name} Golden Tests`,
          status: 'PENDING',
          passed: 0,
          failed: 0,
          total: tests.length,
        });

        return {
          success: true,
          testSuite,
          tests,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    }),

  // Load sample specs
  loadSamples: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(({ input }) => {
      const specs = [
        specStore.create({
          projectId: input.projectId,
          name: 'Stripe Payment API',
          type: 'OPENAPI',
          content: sampleSpecs.stripe,
        }),
        specStore.create({
          projectId: input.projectId,
          name: 'Todo API',
          type: 'OPENAPI',
          content: sampleSpecs.todo,
        }),
      ];

      return specs;
    }),
});
