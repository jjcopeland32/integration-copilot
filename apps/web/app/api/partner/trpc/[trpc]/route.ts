import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { partnerAppRouter } from '@/lib/trpc/partner/root';
import { createPartnerContext } from '@/lib/trpc/partner/server';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/partner/trpc',
    req,
    router: partnerAppRouter,
    createContext: createPartnerContext,
  });

export { handler as GET, handler as POST };
