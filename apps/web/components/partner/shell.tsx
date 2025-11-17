'use client';

import { Building2, ShieldCheck } from 'lucide-react';
import { PartnerNav } from './nav';
import { usePartnerSession } from './session-context';
import { PartnerLogoutButton } from './signout-button';
import { cn, formatDate } from '@/lib/utils';

export function PartnerShell({ children }: { children: React.ReactNode }) {
  const { session } = usePartnerSession();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-10 lg:px-12">
        <aside className="w-72 flex-shrink-0 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <div className="mb-10">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-3 shadow-lg">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-300">Partner Portal</p>
                <p className="text-lg font-semibold text-white">Integration Copilot</p>
              </div>
            </div>
          </div>
          <div className="mb-8 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <div className="font-semibold text-sm text-white">{session?.partnerProject.partnerName ?? 'Partner'}</div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Building2 className="h-4 w-4" />
              <span>{session?.partnerProject.projectName ?? 'Project Workspace'}</span>
            </div>
            <p className="text-xs text-slate-500">
              Session active until{' '}
              {session ? formatDate(session.expiresAt) : '—'}
            </p>
          </div>
          <PartnerNav />
        </aside>
        <main className={cn('flex-1')}>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-gradient-to-r from-blue-950/60 via-purple-900/40 to-slate-900/60 p-6 shadow-2xl">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200/80">
                Active Integration
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                {session?.partnerProject.projectName ?? 'Integration Workspace'}
              </h1>
              <p className="text-sm text-slate-300">
                You have secure access to specs, mocks, tests, and plan milestones for this project.
              </p>
            </div>
            <PartnerLogoutButton />
          </div>
          <div className="mt-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
