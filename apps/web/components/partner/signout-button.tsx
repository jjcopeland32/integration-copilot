'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function PartnerLogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await fetch('/api/partner/auth/logout', {
        method: 'POST',
      });
      router.push('/partner/login');
      router.refresh();
    });
  };

  return (
    <Button
      variant="outline"
      onClick={handleLogout}
      disabled={isPending}
      className="gap-2 border-white/20 bg-transparent text-white hover:border-white/40 hover:bg-white/10"
    >
      <LogOut className="h-4 w-4" />
      {isPending ? 'Signing out...' : 'Sign out'}
    </Button>
  );
}
