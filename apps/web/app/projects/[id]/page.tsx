'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Play, FileText, Trash2, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { useProjectContext } from '@/components/project-context';

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const projectQuery = trpc.project.get.useQuery({ id: params.id });
  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => router.push('/projects'),
  });
  const utils = trpc.useUtils();
  const { setActiveProject } = useProjectContext();

  const project = projectQuery.data;
  const [showDelete, setShowDelete] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const importSpec = trpc.spec.importFromUrl.useMutation({
    onSuccess: async () => {
      await projectQuery.refetch();
      setImportStatus('Spec imported successfully.');
      setShowImport(false);
      setImportUrl('');
    },
    onError: (error) => {
      setImportStatus(error.message || 'Failed to import spec.');
    },
  });

  useEffect(() => {
    if (project) {
      setActiveProject({ id: project.id, name: project.name });
    }
  }, [project?.id, project?.name, setActiveProject]);

  if (projectQuery.isLoading || !project) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white/70 p-12 text-center text-gray-500 shadow-inner">
        {projectQuery.isLoading ? 'Loading project…' : 'Project not found.'}
      </div>
    );
  }

  const createdAt = new Date(project.createdAt).toLocaleDateString();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => router.push(`/specs?projectId=${project.id}`)}
          >
            Manage Specs
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" className="gap-1" onClick={() => setShowDelete(true)}>
            <Trash2 className="h-4 w-4" />
            Delete Project
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <Badge variant={project.status === 'ACTIVE' ? 'success' : project.status === 'DRAFT' ? 'warning' : 'default'}>
              {project.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-gray-500">Created {createdAt}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="cursor-pointer hover:shadow-lg transition"
          onClick={() => setShowImport(true)}
        >
          <CardHeader>
            <Upload className="mb-2 h-8 w-8 text-blue-600" />
            <CardTitle className="text-lg text-gray-900">Import Spec</CardTitle>
            <CardDescription>Upload OpenAPI specs scoped to this project</CardDescription>
          </CardHeader>
        </Card>
        <Card className="hover:shadow-lg transition cursor-not-allowed opacity-60">
          <CardHeader>
            <Play className="mb-2 h-8 w-8 text-green-600" />
            <CardTitle className="text-lg text-gray-900">Start Mock</CardTitle>
            <CardDescription>Coming soon: start mock services from this view</CardDescription>
          </CardHeader>
        </Card>
        <Card className="hover:shadow-lg transition cursor-not-allowed opacity-60">
          <CardHeader>
            <FileText className="mb-2 h-8 w-8 text-purple-600" />
            <CardTitle className="text-lg text-gray-900">Generate Report</CardTitle>
            <CardDescription>Coming soon: readiness reports from project context</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Specifications</CardTitle>
          <CardDescription>Specs attached to this project</CardDescription>
        </CardHeader>
        <CardContent>
          {project.specs.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No specs yet. Head to the Specs page to import one.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {project.specs.map((spec) => (
                <div key={spec.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-gray-900">{spec.name}</p>
                    <p className="text-sm text-gray-500">Version {spec.version}</p>
                  </div>
                  <Badge variant="outline">{spec.kind}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/95 p-6 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">Delete project?</h3>
              <p className="text-sm text-gray-600">
                This will permanently remove <strong>{project.name}</strong> and all related specs, mocks, and test suites.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowDelete(false)} disabled={deleteMutation.isLoading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="gap-1"
                onClick={() => deleteMutation.mutate({ id: project.id })}
                disabled={deleteMutation.isLoading}
              >
                {deleteMutation.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/95 p-6 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">Import spec to {project.name}</h3>
              <p className="text-sm text-gray-600">
                Paste an OpenAPI JSON/YAML URL. It will be stored under this project for mocks and tests.
              </p>
            </div>
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                importSpec.mutate({ projectId: project.id, url: importUrl });
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Spec URL</label>
                <input
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-gray-900 shadow-inner outline-none transition focus:border-blue-400"
                  placeholder="https://example.com/openapi.yaml"
                />
              </div>
              {importStatus && <p className="text-sm text-gray-500">{importStatus}</p>}
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowImport(false)} disabled={importSpec.isLoading}>
                  Cancel
                </Button>
                <Button type="submit" className="gap-2" disabled={!importUrl || importSpec.isLoading}>
                  {importSpec.isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing…
                    </>
                  ) : (
                    'Import Spec'
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
