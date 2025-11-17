'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { useState } from 'react';
import superjson from 'superjson';
import type { PartnerAppRouter } from './root';

export const partnerTrpc = createTRPCReact<PartnerAppRouter>();

export function PartnerTRPCProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    partnerTrpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/partner/trpc',
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <partnerTrpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </partnerTrpc.Provider>
  );
}
