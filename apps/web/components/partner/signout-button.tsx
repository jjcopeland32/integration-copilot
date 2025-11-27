'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';

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
      onClick={handleLogout}
      disabled={isPending}
      className="btn-crystal-outline gap-2"
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Signing out...
        </>
      ) : (
        <>
          <LogOut className="h-4 w-4" />
          Sign out
        </>
      )}
    </Button>
  );
}
