'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Key, User } from 'lucide-react';
import { InputHTMLAttributes } from 'react';

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-2xl border border-cyan-500/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
    />
  );
}

export function PartnerLoginForm() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const response = await fetch('/api/partner/auth/accept', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), name: name.trim() || undefined }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? 'Unable to join workspace');
        return;
      }
      router.push('/partner');
      router.refresh();
    });
  };

  return (
    <div className="glass-crystal-card rounded-3xl p-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Access Partner Workspace</h2>
        <p className="mt-2 text-sm text-slate-400">
          Paste the secure invite token from your onboarding email to continue.
        </p>
      </div>

      {/* Form */}
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Key className="h-4 w-4 text-cyan-400" />
            Invite Token
          </label>
          <Input
            required
            placeholder="icp_XXXXXXXXXXXXXXXXX"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <User className="h-4 w-4 text-purple-400" />
            Your Name (optional)
          </label>
          <Input
            placeholder="Casey Partner"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        {error && (
          <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          variant="crystal"
          disabled={token.trim().length === 0 || isPending}
          className="w-full gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Validating...
            </>
          ) : (
            'Enter Workspace'
          )}
        </Button>
      </form>

      {/* Footer hint */}
      <p className="mt-6 text-center text-xs text-slate-500">
        Don&apos;t have an invite? Contact your integration manager.
      </p>
    </div>
  );
}
