import { router, publicProcedure } from '../server';
import { z } from 'zod';
import { mockStore } from '../../demo-store';

export const mockRouter = router({
  list: publicProcedure
    .input(z.object({ projectId: z.string().optional() }))
    .query(({ input }) => {
      if (input.projectId) {
        return mockStore.getByProjectId(input.projectId);
      }
      return mockStore.getAll();
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      return mockStore.getById(input.id);
    }),

  start: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      return mockStore.updateStatus(input.id, 'RUNNING');
    }),

  stop: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      return mockStore.updateStatus(input.id, 'STOPPED');
    }),
});
