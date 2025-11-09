'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { Loader2, Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const DEMO_EMAIL = 'demo@integration.local';
const DEMO_PASSWORD = 'demo123';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('loading');
    setError(null);
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl: '/dashboard',
    });

    if (result?.error) {
      setStatus('error');
      setError('Invalid credentials. Use the demo email/password shown below.');
      return;
    }

    router.push('/dashboard');
  };

  return (
    <div className="relative flex h-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Image
        src="https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1600&q=80"
        alt="background"
        fill
        className="object-cover opacity-30"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-transparent" />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/90 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-semibold text-slate-900">Sign in to Copilot</h1>
          <p className="mt-2 text-sm text-slate-500">
            Use the demo credentials below to explore the workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 shadow-inner outline-none ring-0 transition focus:border-blue-400"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-slate-900 shadow-inner outline-none transition focus:border-blue-400"
              required
            />
            <p className="text-xs text-slate-400">
              Demo account: <strong>{DEMO_EMAIL}</strong> / <strong>{DEMO_PASSWORD}</strong>
            </p>
          </div>

          {error && <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:opacity-60"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Access Workspace'
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
          <Link href="/dashboard" className="flex items-center gap-1 text-slate-400 hover:text-slate-600">
            <ArrowLeft className="h-3 w-3" />
            Back to app
          </Link>
          <span>Secure credential auth</span>
        </div>
      </div>
    </div>
  );
}
