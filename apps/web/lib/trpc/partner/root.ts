import { createPartnerRouter } from './server';
import { partnerAuthRouter } from './routers/auth';
import { partnerProjectRouter } from './routers/project';
import { partnerSpecRouter } from './routers/spec';

export const partnerAppRouter = createPartnerRouter({
  auth: partnerAuthRouter,
  project: partnerProjectRouter,
  spec: partnerSpecRouter,
});

export type PartnerAppRouter = typeof partnerAppRouter;
