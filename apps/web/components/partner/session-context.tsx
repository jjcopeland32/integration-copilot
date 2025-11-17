'use client';

import { createContext, useContext, useMemo, useState } from 'react';

export type PartnerSessionData = {
  id: string;
  expiresAt: string;
  partnerProjectId: string;
  projectId: string;
  partnerUser: {
    id: string;
    email: string;
    name?: string | null;
  };
  partnerProject: {
    id: string;
    partnerName?: string | null;
    status: string;
    requirements?: unknown;
    projectName?: string | null;
  };
};

type PartnerSessionContextValue = {
  session: PartnerSessionData | null;
  setSession: (value: PartnerSessionData | null) => void;
};

const PartnerSessionContext = createContext<PartnerSessionContextValue | null>(
  null
);

export function PartnerSessionProvider({
  initialSession,
  children,
}: {
  initialSession: PartnerSessionData | null;
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<PartnerSessionData | null>(
    initialSession
  );

  const value = useMemo(
    () => ({
      session,
      setSession,
    }),
    [session]
  );

  return (
    <PartnerSessionContext.Provider value={value}>
      {children}
    </PartnerSessionContext.Provider>
  );
}

export function usePartnerSession() {
  const ctx = useContext(PartnerSessionContext);
  if (!ctx) {
    throw new Error('usePartnerSession must be used within PartnerSessionProvider');
  }
  return ctx;
}
