import { createPartnerRouter } from './server';
import { partnerAuthRouter } from './routers/auth';
import { partnerProjectRouter } from './routers/project';
import { partnerSpecRouter } from './routers/spec';
import { partnerPlanRouter } from './routers/plan';
import { partnerEnvironmentRouter } from './routers/environment';

export const partnerAppRouter = createPartnerRouter({
  auth: partnerAuthRouter,
  project: partnerProjectRouter,
  spec: partnerSpecRouter,
  plan: partnerPlanRouter,
  environment: partnerEnvironmentRouter,
});

export type PartnerAppRouter = typeof partnerAppRouter;
