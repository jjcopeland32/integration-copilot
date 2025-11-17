import { redirect } from 'next/navigation';
import { PartnerShell } from '@/components/partner/shell';
import { resolvePartnerSessionFromCookies } from '@/lib/partner/session';

export default async function PartnerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await resolvePartnerSessionFromCookies();
  if (!session) {
    redirect('/partner/login');
  }

  return <PartnerShell>{children}</PartnerShell>;
}
