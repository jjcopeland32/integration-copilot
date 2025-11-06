import { router, publicProcedure } from '../server';
import { z } from 'zod';

export const planRouter = router({
  get: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(() => {
      return {
        phases: [
          { name: 'Authentication', items: 3, done: 3 },
          { name: 'Core Integration', items: 5, done: 5 },
          { name: 'Webhooks', items: 4, done: 2 },
          { name: 'UAT', items: 3, done: 0 },
          { name: 'Certification', items: 2, done: 0 },
        ],
      };
    }),
});
