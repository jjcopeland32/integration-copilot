'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Link as LinkIcon, MessageSquare, CheckCircle, XCircle, Clock, User, Building2, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type ApprovalStatus = 'pending' | 'approved' | 'rejected';

function EvidenceStatusBadge({ status }: { status: ApprovalStatus }) {
  if (status === 'approved') {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Approved
      </Badge>
    );
  }
  if (status === 'rejected') {
    return (
      <Badge variant="error" className="gap-1">
        <XCircle className="h-3 w-3" />
        Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="gap-1">
      <Clock className="h-3 w-3" />
      Pending Review
    </Badge>
  );
}

function EvidenceKindIcon({ kind }: { kind: string }) {
  if (kind === 'FILE') {
    return <FileText className="h-4 w-4 text-blue-500" />;
  }
  if (kind === 'LINK') {
    return <LinkIcon className="h-4 w-4 text-indigo-500" />;
  }
  return <MessageSquare className="h-4 w-4 text-gray-500" />;
}

export default function EvidenceReviewPage({ params }: { params: { id: string } }) {
  const utils = trpc.useUtils();
  const projectQuery = trpc.project.get.useQuery({ id: params.id });
  const evidenceQuery = trpc.plan.listEvidence.useQuery({ projectId: params.id });

  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const approveMutation = trpc.plan.approveEvidence.useMutation({
    onSuccess: () => {
      utils.plan.listEvidence.invalidate({ projectId: params.id });
      setSelectedEvidence(null);
      setRejectionReason('');
    },
  });

  const project = projectQuery.data;
  const planItems = evidenceQuery.data ?? [];

  // Filter to only items with evidence
  const itemsWithEvidence = planItems.filter((item) => item.evidences.length > 0);

  // Count stats
  const totalEvidence = itemsWithEvidence.reduce((sum, item) => sum + item.evidences.length, 0);
  const pendingCount = itemsWithEvidence.reduce(
    (sum, item) => sum + item.evidences.filter((e) => e.approvalStatus === 'pending').length,
    0
  );
  const approvedCount = itemsWithEvidence.reduce(
    (sum, item) => sum + item.evidences.filter((e) => e.approvalStatus === 'approved').length,
    0
  );

  if (projectQuery.isLoading || evidenceQuery.isLoading) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white/70 p-12 text-center text-gray-500 shadow-inner">
        Loading evidence...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-12 text-center shadow-inner">
        <h2 className="text-2xl font-semibold text-gray-900">Project not found</h2>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${params.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Button>
          </Link>
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{project.name}</p>
        <h1 className="text-3xl font-bold text-gray-900">Partner Evidence Review</h1>
        <p className="mt-2 text-gray-600">
          Review and approve evidence submitted by partners for plan milestones.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total Evidence</p>
            <p className="text-3xl font-bold text-gray-900">{totalEvidence}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Pending Review</p>
            <p className="text-3xl font-bold text-yellow-700">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Approved</p>
            <p className="text-3xl font-bold text-green-700">{approvedCount}</p>
          </CardContent>
        </Card>
      </div>

      {itemsWithEvidence.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No evidence submitted yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Partners will submit evidence as they complete plan milestones.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {itemsWithEvidence.map((planItem) => (
            <Card key={planItem.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      {planItem.phase.toUpperCase()}
                    </Badge>
                    <CardTitle className="text-lg">{planItem.title}</CardTitle>
                    <CardDescription>
                      {planItem.evidences.length} evidence submission
                      {planItem.evidences.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      planItem.status === 'DONE'
                        ? 'success'
                        : planItem.status === 'IN_PROGRESS'
                          ? 'info'
                          : planItem.status === 'BLOCKED'
                            ? 'error'
                            : 'outline'
                    }
                  >
                    {planItem.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {planItem.evidences.map((evidence) => (
                  <div
                    key={evidence.id}
                    className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <EvidenceKindIcon kind={evidence.kind} />
                        <div>
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {evidence.partnerName}
                            </span>
                          </div>
                          {evidence.uploadedBy && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <User className="h-3 w-3" />
                              <span>
                                {evidence.uploadedBy.name ?? evidence.uploadedBy.email}
                              </span>
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Submitted {new Date(evidence.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <EvidenceStatusBadge status={evidence.approvalStatus as ApprovalStatus} />
                    </div>

                    {evidence.notes && (
                      <div className="rounded-xl bg-white p-3 text-sm text-gray-700">
                        {evidence.notes}
                      </div>
                    )}

                    {evidence.url && (
                      <a
                        href={evidence.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        <LinkIcon className="h-4 w-4" />
                        View attachment
                      </a>
                    )}

                    {evidence.rejectionReason && (
                      <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">
                        <strong>Rejection reason:</strong> {evidence.rejectionReason}
                      </div>
                    )}

                    {evidence.approvalStatus === 'pending' && (
                      <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-200">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() =>
                            approveMutation.mutate({ evidenceId: evidence.id, approved: true })
                          }
                          disabled={approveMutation.isPending}
                        >
                          {approveMutation.isPending && selectedEvidence === evidence.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Approve
                        </Button>
                        {selectedEvidence === evidence.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                              placeholder="Reason for rejection (optional)"
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                approveMutation.mutate({
                                  evidenceId: evidence.id,
                                  approved: false,
                                  rejectionReason: rejectionReason || undefined,
                                })
                              }
                              disabled={approveMutation.isPending}
                            >
                              {approveMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Confirm Reject'
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedEvidence(null);
                                setRejectionReason('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setSelectedEvidence(evidence.id)}
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </Button>
                        )}
                      </div>
                    )}

                    {evidence.approvalStatus !== 'pending' && evidence.approvedAt && (
                      <p className="text-xs text-gray-400">
                        {evidence.approvalStatus === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                        {new Date(evidence.approvedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

