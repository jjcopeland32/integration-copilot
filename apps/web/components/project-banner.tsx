'use client';

import Link from 'next/link';
import { useProjectContext } from '@/components/project-context';

export function ProjectBanner() {
  const { projectId, projectName } = useProjectContext();

  if (!projectId) {
    return (
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-dashed border-gray-300 bg-white/80 px-4 py-3 text-sm text-gray-600">
        <span>Select a project to unlock Specs, Mocks, Tests, Traces, Plan, and Reports.</span>
        <Link href="/projects" className="font-semibold text-blue-600 hover:text-blue-700">
          View Projects
        </Link>
      </div>
    );
  }

  return null;
}
