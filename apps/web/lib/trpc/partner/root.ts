import { createPartnerRouter } from './server';
import { partnerAuthRouter } from './routers/auth';
import { partnerProjectRouter } from './routers/project';
import { partnerSpecRouter } from './routers/spec';
import { partnerPlanRouter } from './routers/plan';
import { partnerAssistantRouter } from './routers/assistant';

export const partnerAppRouter = createPartnerRouter({
  auth: partnerAuthRouter,
  project: partnerProjectRouter,
  spec: partnerSpecRouter,
  plan: partnerPlanRouter,
  assistant: partnerAssistantRouter,
});

export type PartnerAppRouter = typeof partnerAppRouter;
