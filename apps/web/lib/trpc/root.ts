import { router } from './server';
import { projectRouter } from './routers/project';
import { specRouter } from './routers/spec';
import { mockRouter } from './routers/mock';
import { planRouter } from './routers/plan';
import { reportRouter } from './routers/report';
import { environmentRouter } from './routers/environment';
import { testProfileRouter } from './routers/test-profile';

export const appRouter = router({
  project: projectRouter,
  spec: specRouter,
  mock: mockRouter,
  plan: planRouter,
  report: reportRouter,
  environment: environmentRouter,
  testProfile: testProfileRouter,
});

export type AppRouter = typeof appRouter;
