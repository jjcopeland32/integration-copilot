import { createPartnerRouter } from './server';
import { partnerAuthRouter } from './routers/auth';
import { partnerProjectRouter } from './routers/project';

export const partnerAppRouter = createPartnerRouter({
  auth: partnerAuthRouter,
  project: partnerProjectRouter,
});

export type PartnerAppRouter = typeof partnerAppRouter;
