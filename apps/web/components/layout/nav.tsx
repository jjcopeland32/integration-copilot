'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  FolderKanban,
  Settings,
} from 'lucide-react';

const navigation = [
  { name: 'Projects', href: '/projects', icon: FolderKanban, color: 'indigo' },
];

const colorStyles: Record<string, { bg: string; text: string; glow: string }> = {
  indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600', glow: 'shadow-indigo-500/30' },
  purple: { bg: 'bg-purple-500', text: 'text-purple-600', glow: 'shadow-purple-500/30' },
  slate: { bg: 'bg-slate-500', text: 'text-slate-600', glow: 'shadow-slate-500/30' },
};

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1.5">
      {navigation.map((item, index) => {
        const isActive = pathname?.startsWith(item.href);
        const colors = colorStyles[item.color];

        return (
          <Link key={item.name} href={item.href}>
            <div
              className={cn(
                'enterprise-nav-item group flex items-center gap-3 text-sm font-medium animate-slide-in',
                isActive && 'active'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Icon container */}
              <div
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300',
                  isActive
                    ? `${colors.bg} shadow-lg ${colors.glow}`
                    : 'bg-slate-100/80 group-hover:bg-slate-200/80'
                )}
              >
                <item.icon
                  className={cn(
                    'h-4.5 w-4.5 transition-all duration-300',
                    isActive ? 'text-white' : `${colors.text} group-hover:scale-110`
                  )}
                />
              </div>

              {/* Label */}
              <span className={cn(
                'flex-1 transition-colors duration-300',
                isActive ? 'text-slate-900 font-semibold' : 'text-slate-600 group-hover:text-slate-900'
              )}>
                {item.name}
              </span>

              {/* Active indicator dot */}
              {isActive && (
                <div className={cn(
                  'w-2 h-2 rounded-full animate-pulse-soft',
                  colors.bg
                )} />
              )}
            </div>
          </Link>
        );
      })}
      
      {/* Spacer */}
      <div className="my-4 border-t border-slate-200/50" />
      
      {/* Helper text */}
      <p className="px-3 text-xs text-slate-400">
        Select a project to access Specs, Mocks, Tests, and more.
      </p>
    </nav>
  );
}
