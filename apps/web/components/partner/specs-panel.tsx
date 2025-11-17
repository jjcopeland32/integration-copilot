'use client';

import { useState } from 'react';
import { partnerTrpc } from '@/lib/trpc/partner/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, RefreshCcw, Loader2 } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

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

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
        Loading specs...
      </div>
    );
  }

  const specs = data?.project.specs ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Blueprints</p>
          <h1 className="text-3xl font-semibold text-white">Specs shared by SYF</h1>
          <p className="text-sm text-slate-300">
            Review and acknowledge each version before deploying to sandbox.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 border-white/20 text-white hover:bg-white/10"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCcw className="h-4 w-4" />
          Sync
        </Button>
      </div>

      <Card className="border-white/10 bg-white/5 text-slate-50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Submit Updated Spec</CardTitle>
          <p className="text-sm text-slate-300">
            Paste your latest OpenAPI document (JSON or YAML). We’ll normalize it and notify SYF.
          </p>
        </CardHeader>
        <CardContent>
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
                <label className="text-sm text-slate-300">Display Name</label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Partner Payments Spec"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Version</label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="1.2.0"
                  value={version}
                  onChange={(event) => setVersion(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Reference URL (optional)</label>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="https://partner.example.com/openapi.yaml"
                value={source}
                onChange={(event) => setSource(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">OpenAPI Document</label>
              <textarea
                className="min-h-[200px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="Paste JSON or YAML..."
                value={content}
                onChange={(event) => setContent(event.target.value)}
                required
              />
            </div>
            {status && (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                {status}
              </div>
            )}
            <Button
              type="submit"
              variant="gradient"
              className="w-full gap-2"
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
        </CardContent>
      </Card>

      {specs.length === 0 ? (
        <Card className="border-dashed border-white/20 bg-white/5 text-slate-200">
          <CardContent className="p-10 text-center">
            No specs shared yet. Your SYF contact will send an invite when the blueprint is ready.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {specs.map((spec) => (
            <Card
              key={spec.id}
              className="border-white/10 bg-white/5 text-slate-50 backdrop-blur"
            >
              <CardHeader className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-2xl bg-blue-500/20 p-3">
                    <FileText className="h-5 w-5 text-blue-200" />
                  </span>
                  <div>
                    <CardTitle className="text-xl">{spec.name}</CardTitle>
                    <p className="text-sm text-slate-400">
                      Updated {formatDateTime(spec.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-200">
                  <Badge variant="outline">{spec.kind}</Badge>
                  {spec.submittedByPartnerProjectId ? (
                    <Badge variant="warning">Partner submission</Badge>
                  ) : (
                    <Badge variant="success">SYF canonical</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-300">
                  Version <span className="font-semibold text-white">{spec.version}</span>
                </p>
                <Button variant="outline" className="text-white" disabled>
                  Download (soon)
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
