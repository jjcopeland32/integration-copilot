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
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, gradient: 'from-blue-500 to-cyan-500', requiresProject: true },
  { name: 'Projects', href: '/projects', icon: FileCode, gradient: 'from-purple-500 to-pink-500', requiresProject: false },
  { name: 'Specs', href: '/specs', icon: Zap, gradient: 'from-yellow-500 to-orange-500', requiresProject: true },
  { name: 'Mocks', href: '/mocks', icon: Server, gradient: 'from-green-500 to-emerald-500', requiresProject: true },
  { name: 'Tests', href: '/tests', icon: TestTube, gradient: 'from-red-500 to-rose-500', requiresProject: true },
  { name: 'Traces', href: '/traces', icon: Activity, gradient: 'from-indigo-500 to-purple-500', requiresProject: true },
  { name: 'Plan Board', href: '/plan', icon: ClipboardCheck, gradient: 'from-teal-500 to-cyan-500', requiresProject: true },
  { name: 'Reports', href: '/reports', icon: FileText, gradient: 'from-orange-500 to-amber-500', requiresProject: true },
];

export function Nav() {
  const pathname = usePathname();
  const { projectId } = useProjectContext();

  return (
    <nav className="flex flex-col gap-2">
      {navigation.map((item, index) => {
        const disabled = item.requiresProject && !projectId;
        const isActive = pathname?.startsWith(item.href);
        const linkProps = disabled ? { href: '#' } : { href: item.href };
        const content = (
          <div
            className={cn(
              'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300',
              'hover:scale-105',
              isActive
                ? 'bg-gradient-to-r ' + item.gradient + ' text-white shadow-lg'
                : 'text-gray-700 hover:bg-white/60 hover:shadow-md'
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Icon with gradient background for inactive state */}
            <div className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-all',
              isActive 
                ? 'bg-white/20' 
                : 'bg-gradient-to-br ' + item.gradient + ' group-hover:scale-110'
            )}>
              <item.icon className={cn(
                'h-5 w-5 transition-all',
                isActive ? 'text-white' : 'text-white'
              )} />
            </div>
            
            <span className="flex-1">{item.name}</span>

            {/* Active indicator */}
            {isActive && (
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            )}
          </div>
        );
        return disabled ? (
          <div key={item.name} className="cursor-not-allowed opacity-50">
            {content}
          </div>
        ) : (
          <Link key={item.name} {...linkProps}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
