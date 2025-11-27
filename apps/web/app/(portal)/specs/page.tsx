'use client';

import { useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileCode2,
  CheckCircle2,
  Sparkles,
  Beaker,
  Database,
  Loader2,
  Rocket,
  X,
  Download,
  Eye,
  FileText,
} from 'lucide-react';
import { useProjectContext } from '@/components/project-context';

type ActionKind = 'blueprint' | 'mock' | 'tests' | 'import';

interface BlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdown: string;
  specName: string;
}

function BlueprintModal({ isOpen, onClose, markdown, specName }: BlueprintModalProps) {
  const handleDownload = useCallback(() => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${specName.replace(/\s+/g, '-').toLowerCase()}-blueprint.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [markdown, specName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 p-2 text-white shadow">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Integration Blueprint</h2>
              <p className="text-sm text-gray-500">{specName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="max-h-[calc(85vh-80px)] overflow-y-auto p-6">
          <div className="prose prose-slate max-w-none">
            <pre className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-6 text-sm text-slate-700">
              {markdown}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero({
  onLoadSamples,
  loadingSamples,
}: {
  onLoadSamples: () => void;
  loadingSamples: boolean;
}) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-2xl">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
            Specs & Blueprints
          </p>
          <h1 className="text-4xl font-semibold leading-tight">
            Ingest specs, build blueprints, and spin up mocks in minutes.
          </h1>
          <p className="text-sm text-white/80">
            Import OpenAPI docs, auto-generate reference blueprints, and trigger mock + golden test generation
            directly from your workspace.
          </p>
          <div className="flex flex-wrap gap-3 text-xs uppercase tracking-wide text-white/60">
            <Badge variant="gradient" className="bg-white/20 text-xs font-semibold text-white shadow">
              Secure Imports
            </Badge>
            <Badge variant="gradient" className="bg-white/20 text-xs font-semibold text-white shadow">
              Blueprint Engine
            </Badge>
            <Badge variant="gradient" className="bg-white/20 text-xs font-semibold text-white shadow">
              Mock Automation
            </Badge>
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl bg-white/10 p-6 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/20 p-3">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-white/60">Starter kit</p>
                <p className="text-lg font-semibold">Stripe-style Payments + Todo APIs</p>
              </div>
            </div>
          <Button
            variant="gradient"
            onClick={onLoadSamples}
            disabled={loadingSamples}
            className="gap-2"
          >
            {loadingSamples ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Load Sample Specs
              </>
            )}
          </Button>
          <p className="text-xs text-white/70">
            Instantly primes your workspace with Stripe payments-style and Todo API specs for demos.
          </p>
        </div>
      </div>
    </div>
  );
}

function SpecCard({
  spec,
  onAction,
  loadingAction,
  onViewBlueprint,
  hasBlueprint,
}: {
  spec: {
    id: string;
    name: string;
    version: string;
    createdAt: Date;
    kind: string;
  };
  onAction: (kind: ActionKind, specId: string) => void;
  loadingAction: ActionKind | null;
  onViewBlueprint: (specId: string) => void;
  hasBlueprint: boolean;
}) {
  const created = useMemo(() => new Date(spec.createdAt).toLocaleString(), [spec.createdAt]);

  return (
    <Card className="group card-hover bg-white/90 backdrop-blur">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl text-gray-900">{spec.name}</CardTitle>
            <p className="text-xs text-gray-500">Version {spec.version}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-3 text-white shadow-lg">
            <FileCode2 className="h-5 w-5" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <Badge variant="outline">{spec.kind}</Badge>
          {hasBlueprint && (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Blueprint Ready
            </Badge>
          )}
          <span>Imported {created}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button
            size="sm"
            className="flex-1 gap-1"
            disabled={loadingAction === 'blueprint'}
            onClick={() => onAction('blueprint', spec.id)}
          >
            {loadingAction === 'blueprint' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {hasBlueprint ? 'Regenerate' : 'Blueprint'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
            disabled={loadingAction === 'mock'}
            onClick={() => onAction('mock', spec.id)}
          >
            {loadingAction === 'mock' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Beaker className="h-4 w-4" />
            )}
            Mock
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
            disabled={loadingAction === 'tests'}
            onClick={() => onAction('tests', spec.id)}
          >
            {loadingAction === 'tests' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            Tests
          </Button>
        </div>
        {hasBlueprint && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
            onClick={() => onViewBlueprint(spec.id)}
          >
            <Eye className="h-4 w-4" />
            View Blueprint
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function SpecsPage() {
  const searchParams = useSearchParams();
  const { projectId } = useProjectContext();
  const projectFilter = searchParams.get('projectId') || projectId || undefined;
  const utils = trpc.useUtils();
  const { data: specs = [], isLoading } = trpc.spec.list.useQuery(
    projectFilter ? { projectId: projectFilter } : { projectId: undefined }
  );
  const [url, setUrl] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<ActionKind | null>(null);
  
  // Blueprint modal state
  const [blueprintModal, setBlueprintModal] = useState<{
    isOpen: boolean;
    markdown: string;
    specName: string;
  }>({ isOpen: false, markdown: '', specName: '' });
  
  // Track which specs have blueprints
  const [blueprintCache, setBlueprintCache] = useState<Record<string, string>>({});

  const loadSamples = trpc.spec.loadSamples.useMutation({
    onSuccess: async () => {
      await utils.spec.list.invalidate();
      setActionMessage('Sample specs loaded successfully.');
    },
    onError: () => setActionMessage('Failed to load sample specs.'),
  });

  const importFromUrl = trpc.spec.importFromUrl.useMutation({
    onSuccess: async () => {
      await utils.spec.list.invalidate();
      setUrl('');
      setActionMessage('Spec imported and normalized.');
      setLoadingAction(null);
    },
    onError: (error) => {
      setActionMessage(error.message || 'Import failed.');
      setLoadingAction(null);
    },
  });

  const blueprint = trpc.spec.generateBlueprint.useMutation({
    onSuccess: (result) => {
      setActionMessage(`Blueprint ready for ${result.spec.title}`);
      setLoadingAction(null);
      // Cache the blueprint and open the modal
      setBlueprintCache((prev) => ({
        ...prev,
        [result.blueprintId]: result.markdown,
      }));
      setBlueprintModal({
        isOpen: true,
        markdown: result.markdown,
        specName: result.spec.title ?? 'API Blueprint',
      });
    },
    onError: () => {
      setActionMessage('Blueprint generation failed.');
      setLoadingAction(null);
    },
  });

  const mock = trpc.spec.generateMock.useMutation({
    onSuccess: (result) => {
      setActionMessage(`Mock created at ${result.mock.baseUrl}`);
      setLoadingAction(null);
    },
    onError: () => {
      setActionMessage('Mock generation failed.');
      setLoadingAction(null);
    },
  });

  const tests = trpc.spec.generateTests.useMutation({
    onSuccess: (result) => {
      setActionMessage(`Golden tests created: ${result.tests.length} cases.`);
      setLoadingAction(null);
    },
    onError: () => {
      setActionMessage('Test generation failed.');
      setLoadingAction(null);
    },
  });

  const handleAction = (kind: ActionKind, specId: string) => {
    setActionMessage(null);
    setLoadingAction(kind);
    if (kind === 'blueprint') {
      blueprint.mutate({ specId });
      return;
    }
    if (kind === 'mock') {
      mock.mutate({ specId });
      return;
    }
    if (kind === 'tests') {
      tests.mutate({ specId });
      return;
    }
  };
  
  const handleViewBlueprint = async (specId: string) => {
    // Fetch the blueprint for this spec
    try {
      const result = await utils.spec.getBlueprint.fetch({ specId });
      if (result?.markdown) {
        const spec = specs.find((s) => s.id === specId);
        setBlueprintModal({
          isOpen: true,
          markdown: result.markdown,
          specName: spec?.name ?? 'API Blueprint',
        });
      } else {
        setActionMessage('Blueprint not found. Generate one first.');
      }
    } catch {
      setActionMessage('Failed to load blueprint.');
    }
  };

  const handleImport = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!url) return;
    setLoadingAction('import');
    importFromUrl.mutate({ projectId: projectFilter, url });
  };
  
  // Check which specs have blueprints
  const specBlueprintStatus = useMemo(() => {
    const status: Record<string, boolean> = {};
    // Mark specs with cached blueprints as having blueprints
    for (const specId of Object.keys(blueprintCache)) {
      status[specId] = true;
    }
    return status;
  }, [blueprintCache]);

  return (
    <>
      <div className="space-y-10">
        <Hero onLoadSamples={() => loadSamples.mutate({ projectId: projectFilter })} loadingSamples={loadSamples.isPending} />

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 bg-white/90 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-gray-900">Import Spec</CardTitle>
              <p className="text-sm text-gray-500">Paste an OpenAPI URL and we&apos;ll ingest + normalize it.</p>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleImport}>
                <input
                  type="url"
                  placeholder="https://example.com/openapi.yaml"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-gray-900 shadow-inner outline-none transition focus:border-blue-400"
                />
                <Button type="submit" disabled={!url || loadingAction === 'import'}>
                  {loadingAction === 'import' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing…
                    </>
                  ) : (
                    'Import from URL'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-gray-900">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl bg-gray-50 p-4 shadow-inner">
                {actionMessage ? (
                  <p>{actionMessage}</p>
                ) : (
                  <p>Trigger an action to see live status updates.</p>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Every action stores normalized specs, mock configs, and golden tests in Prisma for downstream pages.
              </p>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Specs in Workspace</h2>
            <Badge variant="outline">{specs.length} total</Badge>
          </div>
          {isLoading ? (
            <div className="rounded-3xl border border-gray-100 bg-white/70 p-12 text-center text-gray-500 shadow-inner">
              Fetching specs…
            </div>
          ) : specs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 p-12 text-center text-gray-500">
              No specs yet. Import one or load the sample set above.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {specs.map((spec) => (
                <SpecCard
                  key={spec.id}
                  spec={spec as any}
                  onAction={handleAction}
                  loadingAction={loadingAction}
                  onViewBlueprint={handleViewBlueprint}
                  hasBlueprint={!!specBlueprintStatus[spec.id]}
                />
              ))}
            </div>
          )}
        </section>
      </div>
      
      <BlueprintModal
        isOpen={blueprintModal.isOpen}
        onClose={() => setBlueprintModal((prev) => ({ ...prev, isOpen: false }))}
        markdown={blueprintModal.markdown}
        specName={blueprintModal.specName}
      />
    </>
  );
}
