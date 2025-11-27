'use client';

import { Building2, ShieldCheck, Sparkles } from 'lucide-react';
import { PartnerNav } from './nav';
import { usePartnerSession } from './session-context';
import { PartnerLogoutButton } from './signout-button';
import { cn, formatDate } from '@/lib/utils';

export function PartnerShell({ children }: { children: React.ReactNode }) {
  const { session } = usePartnerSession();

  return (
    <div className="relative min-h-screen overflow-hidden text-slate-50">
      {/* Animated Aurora Background */}
      <div className="fixed inset-0 crystal-aurora-bg animate-aurora" />
      
      {/* Floating particles effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-2 h-2 bg-cyan-400/40 rounded-full animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-[20%] right-[10%] w-1.5 h-1.5 bg-purple-400/30 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[60%] left-[15%] w-1 h-1 bg-blue-400/35 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] right-[20%] w-2 h-2 bg-cyan-300/25 rounded-full animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-[80%] left-[40%] w-1.5 h-1.5 bg-purple-300/30 rounded-full animate-float" style={{ animationDelay: '4s' }} />
        <div className="absolute top-[30%] left-[70%] w-1 h-1 bg-blue-300/35 rounded-full animate-float" style={{ animationDelay: '2.5s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-7xl gap-8 px-6 py-10 lg:px-12">
        {/* Crystal Sidebar */}
        <aside className="w-72 flex-shrink-0 glass-crystal-sidebar rounded-3xl p-6 animate-slide-in">
          {/* Logo Section */}
          <div className="mb-10">
            <div className="flex items-center gap-3">
              <div className="relative rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 p-3 shadow-lg animate-glow-pulse">
                <ShieldCheck className="h-6 w-6 text-white" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 opacity-0 hover:opacity-20 transition-opacity" />
              </div>
              <div>
                <p className="text-sm text-cyan-300/80 font-medium tracking-wide">Partner Portal</p>
                <p className="text-lg font-semibold bg-gradient-to-r from-white via-cyan-100 to-purple-200 bg-clip-text text-transparent">
                  Integration Copilot
                </p>
              </div>
            </div>
          </div>

          {/* Partner Info Card */}
          <div className="mb-8 space-y-3 glass-crystal-card rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span className="font-semibold text-white">
                {session?.partnerProject.partnerName ?? 'Partner'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Building2 className="h-4 w-4 text-purple-400/70" />
              <span>{session?.partnerProject.projectName ?? 'Project Workspace'}</span>
            </div>
            <div className="pt-2 border-t border-white/5">
              <p className="text-xs text-slate-500">
                Session active until{' '}
                <span className="text-cyan-400/70">
                  {session ? formatDate(session.expiresAt) : '—'}
                </span>
              </p>
            </div>
          </div>

          {/* Navigation */}
          <PartnerNav />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 animate-in stagger-2">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl glass-crystal-card p-6 mb-10">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/5 to-blue-500/10 pointer-events-none" />
            
            {/* Shimmer effect */}
            <div className="absolute inset-0 shimmer-crystal animate-shimmer pointer-events-none" />
            
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-400/80 font-medium">
                  Active Integration
                </p>
                <h1 className="mt-2 text-3xl font-bold bg-gradient-to-r from-white via-cyan-100 to-purple-200 bg-clip-text text-transparent">
                  {session?.partnerProject.projectName ?? 'Integration Workspace'}
                </h1>
                <p className="mt-1 text-sm text-slate-400 max-w-lg">
                  You have secure access to specs, mocks, tests, and plan milestones for this project.
                </p>
              </div>
              <PartnerLogoutButton />
            </div>
          </div>

          {/* Children Content */}
          <div className="space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
