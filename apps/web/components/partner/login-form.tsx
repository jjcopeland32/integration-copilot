'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputHTMLAttributes } from 'react';

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
    <Card className="w-full max-w-lg border-white/10 bg-white/5 text-white shadow-2xl backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Access Partner Workspace</CardTitle>
        <p className="mt-1 text-sm text-slate-300">
          Paste the secure invite token from your onboarding email to continue.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Invite Token</label>
            <Input
              required
              placeholder="icp_XXXXXXXXXXXXXXXXX"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Your Name (optional)</label>
            <Input
              placeholder="Casey Partner"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          {error && (
            <p className="rounded-2xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            variant="gradient"
            disabled={token.trim().length === 0 || isPending}
            className="w-full"
          >
            {isPending ? 'Validating...' : 'Enter Workspace'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
