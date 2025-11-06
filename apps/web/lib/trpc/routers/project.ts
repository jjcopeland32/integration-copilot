import { router, publicProcedure } from '../server';
import { z } from 'zod';
import { projectStore, specStore, mockStore, testStore } from '../../demo-store';

export const projectRouter = router({
  // List all projects
  list: publicProcedure
    .input(z.object({ orgId: z.string().optional() }).optional())
    .query(() => {
      return projectStore.getAll();
    }),

  // Get project by ID
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const project = projectStore.getById(input.id);
      if (!project) return null;

      // Enrich with related data
      return {
        ...project,
        specs: specStore.getByProjectId(input.id),
        mocks: mockStore.getByProjectId(input.id),
        suites: testStore.getByProjectId(input.id),
        tests: testStore.getByProjectId(input.id),
        planItems: [],
        reports: [],
        _count: {
          specs: specStore.getByProjectId(input.id).length,
          suites: testStore.getByProjectId(input.id).length,
          traces: 0,
        },
      };
    }),

  // Create project
  create: publicProcedure
    .input(z.object({
      name: z.string(),
      orgId: z.string().optional(),
    }))
    .mutation(({ input }) => {
      return projectStore.create({
        name: input.name,
        status: 'DRAFT',
        specs: [],
        mocks: [],
        tests: [],
      });
    }),

  // Update project
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...updates } = input;
      return projectStore.update(id, updates);
    }),

  // Delete project
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      // In demo mode, just return success
      return { success: true };
    }),

  // Get project stats
  stats: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const specs = specStore.getByProjectId(input.id);
      const mocks = mockStore.getByProjectId(input.id);
      const tests = testStore.getByProjectId(input.id);

      const runningMocks = mocks.filter(m => m.status === 'RUNNING').length;
      const totalTests = tests.reduce((sum, t) => sum + t.total, 0);
      const passedTests = tests.reduce((sum, t) => sum + t.passed, 0);

      return {
        specsCount: specs.length,
        mocksCount: mocks.length,
        runningMocksCount: runningMocks,
        testsCount: tests.length,
        totalTests,
        passedTests,
        testPassRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
      };
    }),
});
