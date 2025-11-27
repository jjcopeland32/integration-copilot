'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileCode,
  Server,
  TestTube,
  Activity,
  ClipboardCheck,
  FileText,
  Zap,
} from 'lucide-react';
import { useProjectContext } from '@/components/project-context';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'indigo', requiresProject: true },
  { name: 'Projects', href: '/projects', icon: FileCode, color: 'purple', requiresProject: false },
  { name: 'Specs', href: '/specs', icon: Zap, color: 'amber', requiresProject: true },
  { name: 'Mocks', href: '/mocks', icon: Server, color: 'emerald', requiresProject: true },
  { name: 'Tests', href: '/tests', icon: TestTube, color: 'rose', requiresProject: true },
  { name: 'Traces', href: '/traces', icon: Activity, color: 'violet', requiresProject: true },
  { name: 'Plan Board', href: '/plan', icon: ClipboardCheck, color: 'teal', requiresProject: true },
  { name: 'Reports', href: '/reports', icon: FileText, color: 'orange', requiresProject: true },
];

const colorStyles: Record<string, { bg: string; text: string; glow: string }> = {
  indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600', glow: 'shadow-indigo-500/30' },
  purple: { bg: 'bg-purple-500', text: 'text-purple-600', glow: 'shadow-purple-500/30' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-600', glow: 'shadow-amber-500/30' },
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', glow: 'shadow-emerald-500/30' },
  rose: { bg: 'bg-rose-500', text: 'text-rose-600', glow: 'shadow-rose-500/30' },
  violet: { bg: 'bg-violet-500', text: 'text-violet-600', glow: 'shadow-violet-500/30' },
  teal: { bg: 'bg-teal-500', text: 'text-teal-600', glow: 'shadow-teal-500/30' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-600', glow: 'shadow-orange-500/30' },
};

export function Nav() {
  const pathname = usePathname();
  const { projectId } = useProjectContext();

  return (
    <nav className="flex flex-col gap-1.5">
      {navigation.map((item, index) => {
        const disabled = item.requiresProject && !projectId;
        const isActive = pathname?.startsWith(item.href);
        const colors = colorStyles[item.color];

        const content = (
          <div
            className={cn(
              'enterprise-nav-item group flex items-center gap-3 text-sm font-medium animate-slide-in',
              isActive && 'active',
              disabled && 'opacity-40 pointer-events-none'
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
        );

        return disabled ? (
          <div key={item.name} className="cursor-not-allowed">
            {content}
          </div>
        ) : (
          <Link key={item.name} href={item.href}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
