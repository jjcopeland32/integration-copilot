'use client';

import { useMemo, useState } from 'react';
import { EvidenceKind } from '@prisma/client';
import { partnerTrpc } from '@/lib/trpc/partner/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Upload, X, Loader2, CheckCircle, AlertCircle, Clock, ExternalLink, Target, FileText } from 'lucide-react';
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

  const completedCount = planItems.filter((item) => item.status === 'DONE').length;
  const progressPercent = planItems.length > 0 
    ? Math.round((completedCount / planItems.length) * 100) 
    : 0;

  if (isLoading) {
    return (
      <div className="glass-crystal-card rounded-3xl p-8 text-center animate-in">
        <div className="flex items-center justify-center gap-3 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-teal-400" />
          Loading plan board...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 animate-in">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-teal-400/80 font-medium">Readiness Plan</p>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-teal-100 to-cyan-200 bg-clip-text text-transparent">
            Milestones & Evidence
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload proof once each phase is satisfied to unlock the next gate.
          </p>
        </div>
      </div>

      {/* Status Messages */}
      {status && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 flex items-center gap-2 animate-in">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          {status}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-center gap-2 animate-in">
          <AlertCircle className="h-4 w-4 text-red-400" />
          {error}
        </div>
      )}

      {/* Progress Card */}
      {planItems.length > 0 && (
        <div className="glass-crystal-card rounded-3xl p-6 animate-in stagger-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-600/20 p-2.5">
                <Target className="h-5 w-5 text-teal-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Overall Progress</h3>
                <p className="text-sm text-slate-400">{completedCount} of {planItems.length} milestones complete</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-teal-400">{progressPercent}%</div>
          </div>
          <div className="h-3 rounded-full bg-slate-800/50 overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Plan Items */}
      {planItems.length === 0 ? (
        <div className="glass-crystal-card rounded-3xl border-dashed p-10 text-center animate-in stagger-2">
          <ClipboardCheck className="mx-auto h-10 w-10 text-teal-400/40 mb-3" />
          <p className="text-slate-400">Plan board not provisioned yet. Your integration manager will assign milestones.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {planItems.map((item: PlanItem, index) => {
            const isDone = item.status === 'DONE';
            const isInProgress = item.status === 'IN_PROGRESS';
            const isBlocked = item.status === 'BLOCKED';
            
            return (
              <div
                key={item.id}
                className="glass-crystal-card rounded-3xl p-6 animate-in"
                style={{ animationDelay: `${(index + 2) * 100}ms` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-4">
                    <div className={`rounded-xl p-3 ${
                      isDone ? 'bg-emerald-500/20' : 
                      isInProgress ? 'bg-cyan-500/20' :
                      isBlocked ? 'bg-amber-500/20' : 'bg-slate-500/20'
                    }`}>
                      {isDone ? (
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                      ) : isBlocked ? (
                        <AlertCircle className="h-5 w-5 text-amber-400" />
                      ) : (
                        <Clock className="h-5 w-5 text-cyan-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mt-1">{item.phase}</p>
                    </div>
                  </div>
                  <Badge className={
                    isDone ? 'badge-success-crystal' :
                    isInProgress ? 'badge-crystal' :
                    isBlocked ? 'badge-warning-crystal' :
                    'bg-slate-500/15 text-slate-300 border border-slate-500/25'
                  }>
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
                  <div className="text-sm text-slate-400">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-slate-500" />
                        {item.dueAt ? formatDateTime(item.dueAt) : 'No due date set'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-slate-500" />
                        {item.evidences?.length ?? 0} evidence(s)
                      </span>
                    </div>
                  </div>
                  <Button
                    className="btn-crystal-outline gap-2"
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

                {/* Evidence List */}
                {item.evidences && item.evidences.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attached Evidence</p>
                    <div className="space-y-2">
                      {item.evidences.map((evidence) => (
                        <div
                          key={evidence.id}
                          className="rounded-xl bg-black/20 border border-white/5 p-3 flex flex-wrap items-start justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-white flex items-center gap-2">
                              <span className="badge-crystal text-[10px]">{evidence.kind}</span>
                            </p>
                            {evidence.notes && (
                              <p className="text-xs text-slate-400">{evidence.notes}</p>
                            )}
                            {evidence.url && (
                              <a
                                href={evidence.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {evidence.url}
                              </a>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">{formatDateTime(evidence.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Evidence Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in">
          <div className="glass-crystal w-full max-w-2xl rounded-3xl p-6 animate-scale-in">
            {/* Gradient border effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-teal-500/20 via-transparent to-cyan-500/20 pointer-events-none" />
            
            <div className="relative flex items-start justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-teal-400/80 font-medium">
                  Submit evidence
                </p>
                <h2 className="mt-2 text-2xl font-bold bg-gradient-to-r from-white to-teal-100 bg-clip-text text-transparent">
                  {selectedItem.title}
                </h2>
                <p className="text-sm text-slate-400">{selectedItem.phase} phase</p>
              </div>
              <button
                className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                onClick={() => setSelectedItem(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              className="relative space-y-4"
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
                <div className="space-y-2">
                  <label className="text-sm text-slate-400 font-medium">Evidence type</label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                    value={kind}
                    onChange={(event) => setKind(event.target.value as EvidenceKind)}
                  >
                    <option value={EvidenceKind.NOTE}>Summary note</option>
                    <option value={EvidenceKind.LINK}>Link / dashboard</option>
                    <option value={EvidenceKind.FILE}>File reference</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400 font-medium">Supporting URL</label>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder:text-slate-600 focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                    placeholder="https://..."
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    type="url"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-400 font-medium">Notes / summary</label>
                <textarea
                  className="min-h-[120px] w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all resize-none"
                  placeholder="Describe the test evidence, metrics, or attached artifact."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  required={!url}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  className="btn-crystal-outline"
                  onClick={() => setSelectedItem(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="btn-crystal gap-2"
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
