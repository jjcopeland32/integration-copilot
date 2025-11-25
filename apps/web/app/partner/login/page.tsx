import { redirect } from 'next/navigation';
import { PartnerLoginForm } from '@/components/partner/login-form';
import { resolvePartnerSessionFromCookies } from '@/lib/partner/session';

type SearchParams = { token?: string };

export default async function PartnerLoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await resolvePartnerSessionFromCookies();
  if (session) {
    redirect('/partner');
  }

  const params = await searchParams;
  const tokenFromUrl = params.token ?? '';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-16 text-white">
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-blue-200/70">
          Partner Access
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Welcome to Integration Copilot</h1>
        <p className="mt-2 mb-8 text-slate-300">
          Invite-only workspace for API partners to collaborate on testing, plan readiness, and traces.
        </p>
        <PartnerLoginForm initialToken={tokenFromUrl} />
      </div>
    </div>
  );
}
