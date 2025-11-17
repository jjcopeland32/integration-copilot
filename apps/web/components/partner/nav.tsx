'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GaugeCircle,
  FileText,
  FlaskConical,
  Boxes,
  ClipboardCheck,
  LineChart,
  BotMessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { label: 'Dashboard', href: '/partner', icon: GaugeCircle },
  { label: 'Specs', href: '/partner/specs', icon: FileText },
  { label: 'Mocks', href: '/partner/mocks', icon: Boxes },
  { label: 'Tests', href: '/partner/tests', icon: FlaskConical },
  { label: 'Plan', href: '/partner/plan', icon: ClipboardCheck },
  { label: 'Traces', href: '/partner/traces', icon: LineChart },
  { label: 'Assistant', href: '/partner/assistant', icon: BotMessageSquare },
];

export function PartnerNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {links.map(({ label, href, icon: Icon }) => {
        const isRoot = href === '/partner';
        const active = isRoot
          ? pathname === '/partner'
          : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 border border-transparent',
              active
                ? 'bg-gradient-to-r from-blue-600/80 to-purple-600/80 text-white shadow-lg border-white/10'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
