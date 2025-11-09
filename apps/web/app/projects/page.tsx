'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, FileCode, Server, TestTube, TrendingUp, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProjectContext } from '@/components/project-context';

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: string | number;
  icon: any;
  gradient: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/60 px-4 py-3 shadow-sm ring-1 ring-gray-100">
      <div className={`rounded-2xl bg-gradient-to-br ${gradient} p-3 shadow-lg`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gradient-to-br from-white to-gray-50 p-12 text-center shadow-inner">
      <div className="mb-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4">
        <FileCode className="h-8 w-8 text-blue-600" />
      </div>
      <h3 className="text-2xl font-semibold text-gray-900">Start your first integration</h3>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Import a spec or create a project to unlock golden tests, mock servers, and readiness reports.
      </p>
      <Button className="mt-6" variant="gradient">
        <Plus className="mr-2 h-4 w-4" />
        New Project
      </Button>
    </div>
  );
}

function ProjectGrid({
  projects,
  onSelectProject,
}: {
  projects: Array<{
    id: string;
    name: string;
    status: string;
    specs: any[];
    mocks: any[];
    suites: any[];
  }>;
  onSelectProject: (project: { id: string; name: string }) => void;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, index) => {
        const specsCount = project.specs.length;
        const mocksCount = project.mocks.length;
        const testsCount = project.suites.length;

        return (
            <Card
              key={project.id}
              className="card-hover animate-in h-full bg-white/90 backdrop-blur"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-2">
                    <CardTitle className="text-xl text-gray-900">{project.name}</CardTitle>
                    <Badge
                      variant={
                        project.status === 'ACTIVE'
                          ? 'success'
                          : project.status === 'DRAFT'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-3 shadow-lg">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 p-4">
                  <FileCode className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-500">Specs</p>
                    <p className="text-lg font-semibold text-gray-900">{specsCount}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4">
                  <Server className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm text-gray-500">Mocks</p>
                    <p className="text-lg font-semibold text-gray-900">{mocksCount}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 p-4">
                  <TestTube className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-500">Test Suites</p>
                    <p className="text-lg font-semibold text-gray-900">{testsCount}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => onSelectProject({ id: project.id, name: project.name })}
                  >
                    Open Workspace
                  </Button>
                  <Button variant="outline" size="sm">
                    <Link href={`/projects/${project.id}`}>Details</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
        );
      })}
    </div>
  );
}

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = trpc.project.list.useQuery();
  const utils = trpc.useUtils();
  const { setActiveProject } = useProjectContext();
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [projectName, setProjectName] = useState('New Integration Project');
  const [projectStatus, setProjectStatus] = useState<'DRAFT' | 'ACTIVE' | 'ARCHIVED'>('DRAFT');
  const [projectDescription, setProjectDescription] = useState('Describe the integration goals, vendor, or scope.');

  const createProject = trpc.project.create.useMutation({
    onSuccess: async (created) => {
      await utils.project.list.invalidate();
      setActiveProject({ id: created.id, name: created.name });
      router.push('/dashboard');
      setProjectName('New Integration Project');
      setProjectDescription('Describe the integration goals, vendor, or scope.');
      setProjectStatus('DRAFT');
      setShowDialog(false);
    },
  });

  const totals = useMemo(() => {
    return projects.reduce(
      (acc, project) => {
        acc.specs += project.specs.length;
        acc.mocks += project.mocks.length;
        acc.tests += project.suites.length;
        return acc;
      },
      { specs: 0, mocks: 0, tests: 0 }
    );
  }, [projects]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">Projects</p>
          <h1 className="text-4xl font-semibold text-gray-900">Integration Workspace</h1>
          <p className="text-gray-500">
            Manage specs, mocks, and golden tests for every integration program.
          </p>
        </div>
        <Button
          size="lg"
          variant="gradient"
          className="gap-2"
          onClick={() => setShowDialog(true)}
        >
          <Plus className="h-5 w-5" />
          New Project
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Specs" value={totals.specs} icon={FileCode} gradient="from-blue-500 to-cyan-500" />
        <StatCard label="Mocks" value={totals.mocks} icon={Server} gradient="from-emerald-500 to-teal-500" />
        <StatCard label="Test Suites" value={totals.tests} icon={TestTube} gradient="from-purple-500 to-pink-500" />
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-gray-100 bg-white/70 p-12 text-center text-gray-500 shadow-inner">
          Loading your projects…
        </div>
      ) : projects.length === 0 ? (
        <EmptyState />
      ) : (
        <ProjectGrid
          projects={projects}
          onSelectProject={(project) => {
            setActiveProject(project);
            router.push('/dashboard');
          }}
        />
      )}

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
                Create Project
              </p>
              <h2 className="text-2xl font-semibold text-gray-900">
                Name your next integration
              </h2>
              <p className="text-sm text-gray-500">
                Projects connect specs, mocks, and golden tests into a single workspace.
              </p>
            </div>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                createProject.mutate({
                  name: projectName,
                  status: projectStatus,
                });
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Project name</label>
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-gray-900 shadow-inner outline-none transition focus:border-blue-400"
                  placeholder="Payments Baseline"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Status</label>
                <select
                  value={projectStatus}
                  onChange={(e) => setProjectStatus(e.target.value as any)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-gray-900 shadow-inner outline-none transition focus:border-blue-400"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Description</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-gray-900 shadow-inner outline-none transition focus:border-blue-400"
                />
              </div>

              {createProject.error && (
                <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600">
                  {createProject.error.message}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowDialog(false)}
                  disabled={createProject.isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" className="gap-2" disabled={createProject.isLoading}>
                  {createProject.isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Project
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
