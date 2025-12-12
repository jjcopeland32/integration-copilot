'use client';

import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useProjectContext } from '@/components/project-context';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileCode2,
  Server,
  TestTube,
  Activity,
  ClipboardCheck,
  FileText,
  ArrowLeft,
  Loader2,
  Globe,
} from 'lucide-react';

const tabs = [
  { name: 'Overview', href: '', icon: LayoutDashboard },
  { name: 'Specs', href: '/specs', icon: FileCode2 },
  { name: 'Mocks', href: '/mocks', icon: Server },
  { name: 'Environments', href: '/environments', icon: Globe },
  { name: 'Tests', href: '/tests', icon: TestTube },
  { name: 'Traces', href: '/traces', icon: Activity },
  { name: 'Plan', href: '/plan', icon: ClipboardCheck },
  { name: 'Reports', href: '/reports', icon: FileText },
];

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.id as string;
  const { setActiveProject } = useProjectContext();

  const projectQuery = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: !!projectId }
  );

  const project = projectQuery.data;

  // Update active project context
  useEffect(() => {
    if (project) {
      setActiveProject({ id: project.id, name: project.name });
    }
  }, [project, setActiveProject]);

  // Determine active tab
  const activeTab = useMemo(() => {
    const basePath = `/projects/${projectId}`;
    for (const tab of tabs) {
      const tabPath = `${basePath}${tab.href}`;
      if (tab.href === '' && pathname === basePath) {
        return tab.name;
      }
      if (tab.href !== '' && pathname.startsWith(tabPath)) {
        return tab.name;
      }
    }
    return 'Overview';
  }, [pathname, projectId]);

  if (projectQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white/70 p-12 text-center text-gray-500 shadow-inner">
        Project not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            All Projects
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <Badge
            variant={
              project.status === 'ACTIVE'
                ? 'success'
                : project.status === 'DRAFT'
                ? 'warning'
                : 'default'
            }
          >
            {project.status}
          </Badge>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.name;
            const href = `/projects/${projectId}${tab.href}`;

            return (
              <Link
                key={tab.name}
                href={href}
                className={cn(
                  'group flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )}
              >
                <tab.icon
                  className={cn(
                    'h-4 w-4 transition-colors',
                    isActive
                      ? 'text-indigo-500'
                      : 'text-gray-400 group-hover:text-gray-500'
                  )}
                />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>{children}</div>
    </div>
  );
}

