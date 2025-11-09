'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, LogIn, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function UserBar() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const initials = useMemo(() => {
    const name = session?.user?.name ?? session?.user?.email ?? '';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [session?.user?.name, session?.user?.email]);

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-2 shadow-sm">
        <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
        <div className="space-y-1">
          <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
          <div className="h-2 w-16 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-100">
          <User className="h-5 w-5 text-gray-500" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-700">Guest Session</span>
          <span className="text-xs text-gray-500">Sign in to sync data</span>
        </div>
        <Link href="/login">
          <Button size="sm" className="gap-1">
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white/90 px-4 py-3 shadow-md backdrop-blur">
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white shadow-lg',
          'bg-gradient-to-br from-indigo-500 to-purple-500'
        )}
      >
        {initials || <User className="h-5 w-5" />}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-gray-900">{session.user.name ?? session.user.email}</span>
        <span className="text-xs uppercase tracking-wide text-gray-500">
          {session.user.role ?? 'Member'}
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="gap-1"
        onClick={async () => {
          await signOut({ redirect: false });
          router.push('/login');
        }}
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}
