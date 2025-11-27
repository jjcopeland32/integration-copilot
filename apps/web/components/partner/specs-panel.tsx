'use client';

import { useState, useCallback } from 'react';
import { partnerTrpc } from '@/lib/trpc/partner/client';
import { Button } from '@/components/ui/button';
import { FileText, Upload, RefreshCcw, Loader2, X, Download, Eye, Sparkles, CheckCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in">
      <div className="relative max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-3xl glass-crystal animate-scale-in">
        {/* Gradient border effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/20 via-transparent to-purple-500/20 pointer-events-none" />
        
        <div className="relative flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 p-2.5 shadow-lg shadow-cyan-500/25">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-white to-cyan-100 bg-clip-text text-transparent">
                Integration Blueprint
              </h2>
              <p className="text-sm text-slate-400">{specName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload} 
              className="btn-crystal-outline gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition-all hover:bg-white/10 hover:text-cyan-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="max-h-[calc(85vh-80px)] overflow-y-auto p-6">
          <pre className="whitespace-pre-wrap rounded-2xl bg-black/40 border border-white/5 p-6 text-sm text-slate-300 font-mono">
            {markdown}
          </pre>
        </div>
      </div>
    </div>
  );
}

export function PartnerSpecsPanel() {
  const { data, isLoading, refetch, isRefetching } =
    partnerTrpc.project.current.useQuery(undefined, { staleTime: 60_000 });
  const utils = partnerTrpc.useUtils();
  const submitSpec = partnerTrpc.spec.submit.useMutation({
    onSuccess: async () => {
      await utils.project.current.invalidate();
      setContent('');
      setName('');
      setVersion('');
      setSource('');
      setStatus('Spec submitted for review.');
    },
    onError: (error) => {
      setStatus(error.message || 'Unable to submit spec.');
    },
  });
  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  
  // Blueprint modal state
  const [blueprintModal, setBlueprintModal] = useState<{
    isOpen: boolean;
    markdown: string;
    specName: string;
  }>({ isOpen: false, markdown: '', specName: '' });
  const [loadingBlueprint, setLoadingBlueprint] = useState<string | null>(null);
  
  const handleViewBlueprint = async (specId: string, specName: string) => {
    setLoadingBlueprint(specId);
    try {
      const result = await utils.spec.getBlueprint.fetch({ specId });
      if (result?.markdown) {
        setBlueprintModal({
          isOpen: true,
          markdown: result.markdown,
          specName,
        });
      } else {
        setStatus('Blueprint not available yet. Contact SYF to generate one.');
      }
    } catch {
      setStatus('Failed to load blueprint.');
    } finally {
      setLoadingBlueprint(null);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-crystal-card rounded-3xl p-8 text-center animate-in">
        <div className="flex items-center justify-center gap-3 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          Loading specs...
        </div>
      </div>
    );
  }

  const specs = data?.project.specs ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 animate-in">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-400/80 font-medium">Blueprints</p>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-cyan-100 to-purple-200 bg-clip-text text-transparent">
            Specs shared by SYF
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review and acknowledge each version before deploying to sandbox.
          </p>
        </div>
        <Button
          variant="outline"
          className="btn-crystal-outline gap-2"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCcw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Sync
        </Button>
      </div>

      {/* Submit Form Card */}
      <div className="glass-crystal-card rounded-3xl p-6 animate-in stagger-1">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-600/20 p-2.5">
            <Upload className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Submit Updated Spec</h2>
            <p className="text-sm text-slate-400">
              Paste your latest OpenAPI document (JSON or YAML). We&apos;ll normalize it and notify SYF.
            </p>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setStatus(null);
            submitSpec.mutate({
              content,
              name: name || undefined,
              version: version || undefined,
              source: source || undefined,
            });
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-slate-400 font-medium">Display Name</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                placeholder="Partner Payments Spec"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400 font-medium">Version</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                placeholder="1.2.0"
                value={version}
                onChange={(event) => setVersion(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400 font-medium">Reference URL (optional)</label>
            <input
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
              placeholder="https://partner.example.com/openapi.yaml"
              value={source}
              onChange={(event) => setSource(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400 font-medium">OpenAPI Document</label>
            <textarea
              className="min-h-[200px] w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none"
              placeholder="Paste JSON or YAML..."
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
            />
          </div>
          {status && (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {status}
            </div>
          )}
          <Button
            type="submit"
            className="btn-crystal w-full gap-2"
            disabled={submitSpec.isPending || content.trim().length < 10}
          >
            {submitSpec.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Normalizing…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Submit for review
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Specs List */}
      {specs.length === 0 ? (
        <div className="glass-crystal-card rounded-3xl border-dashed p-10 text-center animate-in stagger-2">
          <FileText className="mx-auto h-10 w-10 text-cyan-400/40 mb-3" />
          <p className="text-slate-400">No specs shared yet. Your SYF contact will send an invite when the blueprint is ready.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {specs.map((spec, index) => (
            <div
              key={spec.id}
              className="glass-crystal-card group rounded-3xl p-6 animate-in"
              style={{ animationDelay: `${(index + 2) * 100}ms` }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 p-3 group-hover:from-cyan-500/30 group-hover:to-blue-600/30 transition-all">
                  <FileText className="h-5 w-5 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white truncate group-hover:text-cyan-100 transition-colors">
                    {spec.name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Updated {formatDateTime(spec.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="badge-crystal">{spec.kind}</span>
                {spec.submittedByPartnerProjectId ? (
                  <span className="badge-warning-crystal">Partner submission</span>
                ) : (
                  <span className="badge-success-crystal flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    SYF canonical
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-400">
                  Version <span className="font-semibold text-white">{spec.version}</span>
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full btn-crystal-outline gap-2"
                onClick={() => handleViewBlueprint(spec.id, spec.name)}
                disabled={loadingBlueprint === spec.id}
              >
                {loadingBlueprint === spec.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    View Blueprint
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
      
      <BlueprintModal
        isOpen={blueprintModal.isOpen}
        onClose={() => setBlueprintModal((prev) => ({ ...prev, isOpen: false }))}
        markdown={blueprintModal.markdown}
        specName={blueprintModal.specName}
      />
    </div>
  );
}
