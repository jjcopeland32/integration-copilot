import { redirect } from 'next/navigation';
import { PartnerLoginForm } from '@/components/partner/login-form';
import { resolvePartnerSessionFromCookies } from '@/lib/partner/session';
import { ShieldCheck } from 'lucide-react';

export default async function PartnerLoginPage() {
  const session = await resolvePartnerSessionFromCookies();
  if (session) {
    redirect('/partner');
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Crystal Aurora Background */}
      <div className="fixed inset-0 crystal-aurora-bg animate-aurora" />
      
      {/* Floating particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-2 h-2 bg-cyan-400/40 rounded-full animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-[20%] right-[10%] w-1.5 h-1.5 bg-purple-400/30 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[60%] left-[15%] w-1 h-1 bg-blue-400/35 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] right-[20%] w-2 h-2 bg-cyan-300/25 rounded-full animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-[80%] left-[40%] w-1.5 h-1.5 bg-purple-300/30 rounded-full animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg animate-in">
          {/* Logo/Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 shadow-lg animate-glow-pulse">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-400/80 font-medium">
              Partner Access
            </p>
            <h1 className="mt-3 text-4xl font-bold bg-gradient-to-r from-white via-cyan-100 to-purple-200 bg-clip-text text-transparent">
              Welcome to Integration Copilot
            </h1>
            <p className="mt-3 text-slate-400 max-w-md mx-auto">
              Invite-only workspace for API partners to collaborate on testing, plan readiness, and traces.
            </p>
          </div>

          {/* Login Form */}
          <PartnerLoginForm />
        </div>
      </div>
    </div>
  );
}
