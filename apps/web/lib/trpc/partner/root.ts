import { createPartnerRouter } from './server';
import { partnerAuthRouter } from './routers/auth';
import { partnerProjectRouter } from './routers/project';
import { partnerSpecRouter } from './routers/spec';
import { partnerPlanRouter } from './routers/plan';

export const partnerAppRouter = createPartnerRouter({
  auth: partnerAuthRouter,
  project: partnerProjectRouter,
  spec: partnerSpecRouter,
  plan: partnerPlanRouter,
});

export type PartnerAppRouter = typeof partnerAppRouter;
