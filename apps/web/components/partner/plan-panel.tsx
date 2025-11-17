'use client';

import { partnerTrpc } from '@/lib/trpc/partner/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Upload } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export function PartnerPlanPanel() {
  const { data, isLoading } = partnerTrpc.project.current.useQuery(undefined, {
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
        Loading plan board...
      </div>
    );
  }

  const planItems = data?.project.planItems ?? [];

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
        <Button variant="gradient" className="gap-2" disabled>
          <Upload className="h-4 w-4" />
          Submit evidence (soon)
        </Button>
      </div>

      {planItems.length === 0 ? (
        <Card className="border-dashed border-white/20 bg-white/5 text-slate-200">
          <CardContent className="p-10 text-center">
            Plan board not provisioned yet. Your SYF contact will assign milestones.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {planItems.map((item) => (
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
              <CardContent className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-300">
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
                <Button variant="outline" className="gap-2 text-white" disabled>
                  <ClipboardCheck className="h-4 w-4" />
                  Add attachment
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
