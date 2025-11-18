'use client';

import { useMemo, useState } from 'react';
import { EvidenceKind } from '@prisma/client';
import { partnerTrpc } from '@/lib/trpc/partner/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Upload, X, Loader2 } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

type PlanItem = {
  id: string;
  title: string;
  phase: string;
  status: string;
  dueAt?: string | Date | null;
  evidences?: Array<{
    id: string;
    kind: EvidenceKind;
    url?: string | null;
    notes?: string | null;
    createdAt: string | Date;
  }>;
};

export function PartnerPlanPanel() {
  const utils = partnerTrpc.useUtils();
  const { data, isLoading } = partnerTrpc.project.current.useQuery(undefined, {
    staleTime: 60_000,
  });
  const planItems = useMemo(() => data?.project.planItems ?? [], [data]);
  const [selectedItem, setSelectedItem] = useState<PlanItem | null>(null);
  const [kind, setKind] = useState<EvidenceKind>(EvidenceKind.NOTE);
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitEvidence = partnerTrpc.plan.submitEvidence.useMutation({
    onSuccess: async () => {
      setStatus('Evidence submitted for review.');
      setError(null);
      setSelectedItem(null);
      setUrl('');
      setNotes('');
      await utils.project.current.invalidate();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
        Loading plan board...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Readiness Plan
          </p>
          <h1 className="text-3xl font-semibold text-white">Milestones & Evidence</h1>
          <p className="text-sm text-slate-300">
            Upload proof once each phase is satisfied so SYF can unlock the next gate.
          </p>
        </div>
        {status && (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {status}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>

      {planItems.length === 0 ? (
        <Card className="border-dashed border-white/20 bg-white/5 text-slate-200">
          <CardContent className="p-10 text-center">
            Plan board not provisioned yet. Your SYF contact will assign milestones.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {planItems.map((item: PlanItem) => (
            <Card
              key={item.id}
              className="border-white/10 bg-white/5 text-slate-50 backdrop-blur"
            >
              <CardHeader className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {item.phase}
                  </p>
                </div>
                <Badge
                  variant={
                    item.status === 'DONE'
                      ? 'success'
                      : item.status === 'IN_PROGRESS'
                        ? 'info'
                        : item.status === 'BLOCKED'
                          ? 'warning'
                          : 'outline'
                  }
                >
                  {item.status.replace('_', ' ')}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    {item.dueAt ? (
                      <p>Due {formatDateTime(item.dueAt)}</p>
                    ) : (
                      <p>No due date set</p>
                    )}
                    <p className="text-xs text-slate-500">
                      {item.evidences?.length ?? 0} evidence item(s) attached
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="gap-2 text-white"
                    onClick={() => {
                      setSelectedItem(item);
                      setKind(EvidenceKind.NOTE);
                      setUrl('');
                      setNotes('');
                      setError(null);
                      setStatus(null);
                    }}
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    Add evidence
                  </Button>
                </div>

                {item.evidences && item.evidences.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2 text-xs text-slate-400">
                    {item.evidences.map((evidence) => (
                      <div
                        key={evidence.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2 last:border-b-0 last:pb-0"
                      >
                        <div>
                          <p className="text-slate-200 font-medium">{evidence.kind}</p>
                          {evidence.notes && <p>{evidence.notes}</p>}
                          {evidence.url && (
                            <a
                              href={evidence.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-300 underline"
                            >
                              {evidence.url}
                            </a>
                          )}
                        </div>
                        <span>{formatDateTime(evidence.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/20 bg-slate-950/90 p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-blue-200/70">
                  Submit evidence
                </p>
                <h2 className="mt-2 text-2xl font-semibold">{selectedItem.title}</h2>
                <p className="text-sm text-slate-300">{selectedItem.phase} phase</p>
              </div>
              <button
                className="rounded-full border border-white/20 p-2 text-slate-300 hover:text-white"
                onClick={() => setSelectedItem(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                submitEvidence.mutate({
                  planItemId: selectedItem.id,
                  kind,
                  url: url || undefined,
                  notes: notes || undefined,
                });
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-300">
                  Evidence type
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                    value={kind}
                    onChange={(event) => setKind(event.target.value as EvidenceKind)}
                  >
                    <option value={EvidenceKind.NOTE}>Summary note</option>
                    <option value={EvidenceKind.LINK}>Link / dashboard</option>
                    <option value={EvidenceKind.FILE}>File reference</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-slate-300">
                  Supporting URL
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500"
                    placeholder="https://..."
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    type="url"
                  />
                </label>
              </div>
              <label className="space-y-2 text-sm text-slate-300">
                Notes / summary
                <textarea
                  className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
                  placeholder="Describe the test evidence, metrics, or attached artifact."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  required={!url}
                />
              </label>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="text-white"
                  onClick={() => setSelectedItem(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gradient"
                  className="gap-2"
                  disabled={submitEvidence.isPending}
                >
                  {submitEvidence.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Submit evidence
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
