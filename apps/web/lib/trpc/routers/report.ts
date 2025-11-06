import { router, publicProcedure } from '../server';
import { z } from 'zod';

export const reportRouter = router({
  list: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(() => {
      return [
        {
          id: '1',
          name: 'Integration Readiness Report',
          status: 'READY',
          score: 85,
          createdAt: new Date(),
        },
      ];
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(() => {
      return {
        id: '1',
        name: 'Integration Readiness Report',
        markdown: '# Integration Readiness Report\n\n## Overall Score: 85%\n\n### Summary\nYour integration is ready for production with minor improvements needed.',
      };
    }),
});
