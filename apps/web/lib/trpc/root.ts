import { router } from './server';
import { projectRouter } from './routers/project';
import { specRouter } from './routers/spec';
import { mockRouter } from './routers/mock';
import { planRouter } from './routers/plan';
import { reportRouter } from './routers/report';

export const appRouter = router({
  project: projectRouter,
  spec: specRouter,
  mock: mockRouter,
  plan: planRouter,
  report: reportRouter,
});

export type AppRouter = typeof appRouter;
