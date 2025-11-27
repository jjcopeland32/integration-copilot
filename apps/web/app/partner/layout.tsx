import type { Metadata } from 'next';
import '../globals.css';
import { PartnerTRPCProvider } from '@/lib/trpc/partner/client';
import {
  PartnerSessionProvider,
  type PartnerSessionData,
} from '@/components/partner/session-context';
import { resolvePartnerSessionFromCookies } from '@/lib/partner/session';

export const metadata: Metadata = {
  title: 'Partner Portal | Integration Copilot',
  description: 'Partner workspace for collaborating on API integrations.',
};

const fontClass = 'font-sans antialiased';

async function mapSession(): Promise<PartnerSessionData | null> {
  const session = await resolvePartnerSessionFromCookies();
  if (!session) return null;
  return {
    id: session.id,
    expiresAt: session.expiresAt.toISOString(),
    partnerProjectId: session.partnerProjectId,
    projectId: session.partnerProject.projectId,
    partnerUser: {
      id: session.partnerUser.id,
      email: session.partnerUser.email,
      name: session.partnerUser.name,
    },
    partnerProject: {
      id: session.partnerProject.id,
      partnerName: session.partnerProject.partnerName,
      status: session.partnerProject.status,
      requirements: session.partnerProject.requirements ?? undefined,
      projectName: session.partnerProject.project.name,
    },
  };
}

/**
 * Root partner layout - provides TRPC and session context.
 * Actual session validation and redirects happen in (portal)/layout.tsx.
 */
export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await mapSession();

  return (
    <html lang="en">
      <body className={`${fontClass} bg-slate-950 text-slate-50`}>
        <PartnerTRPCProvider>
          <PartnerSessionProvider initialSession={session}>
            {children}
          </PartnerSessionProvider>
        </PartnerTRPCProvider>
      </body>
    </html>
  );
}
