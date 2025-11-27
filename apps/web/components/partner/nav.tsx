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
    <nav className="space-y-2">
      {links.map(({ label, href, icon: Icon }, index) => {
        const isRoot = href === '/partner';
        const active = isRoot
          ? pathname === '/partner'
          : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'crystal-nav-item group flex items-center gap-3 text-sm font-medium',
              'animate-slide-in',
              active && 'active'
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300',
                active
                  ? 'bg-gradient-to-br from-cyan-500/30 to-purple-500/30 shadow-lg shadow-cyan-500/20'
                  : 'bg-white/5 group-hover:bg-cyan-500/10'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 transition-colors duration-300',
                  active ? 'text-cyan-300' : 'text-slate-400 group-hover:text-cyan-400'
                )}
              />
            </div>
            <span className="relative">
              {label}
              {active && (
                <span className="absolute -bottom-1 left-0 h-px w-full bg-gradient-to-r from-cyan-400/50 to-transparent" />
              )}
            </span>
            {active && (
              <div className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50 animate-pulse-soft" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
