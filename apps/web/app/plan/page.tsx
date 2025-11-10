'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Rocket, Webhook, TestTube2, Award, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useProjectContext } from '@/components/project-context';
import { trpc } from '@/lib/trpc/client';

const iconMap: Record<string, { icon: any; gradient: string }> = {
  Authentication: { icon: Lock, gradient: 'from-blue-500 to-cyan-500' },
  'Core Integration': { icon: Rocket, gradient: 'from-purple-500 to-pink-500' },
  Webhooks: { icon: Webhook, gradient: 'from-green-500 to-emerald-500' },
  UAT: { icon: TestTube2, gradient: 'from-orange-500 to-red-500' },
  Certification: { icon: Award, gradient: 'from-indigo-500 to-purple-500' },
};

export default function PlanPage() {
  const { projectId, projectName } = useProjectContext();

  if (!projectId) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-12 text-center shadow-inner">
        <h2 className="text-2xl font-semibold text-gray-900">Select a project to view the plan board</h2>
        <p className="mt-2 text-sm text-gray-600">
          Integration plans are scoped per project. Choose a project to see its progress.
        </p>
        <Link
          href="/projects"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg"
        >
          View Projects
        </Link>
      </div>
    );
  }

  const planQuery = trpc.plan.get.useQuery({ projectId });
  const phases = planQuery.data?.phases ?? [];

  if (planQuery.isLoading) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white/70 p-12 text-center text-gray-500 shadow-inner">
        Loading plan board…
      </div>
    );
  }

  const totalItems = phases.reduce((sum, phase) => sum + (phase.items ?? 0), 0);
  const totalDone = phases.reduce((sum, phase) => sum + (phase.done ?? 0), 0);
  const progress = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="animate-in">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{projectName}</p>
        <h1 className="text-4xl font-bold gradient-text">Plan Board</h1>
        <p className="text-lg text-gray-600 mt-2">Track your 5-phase integration roadmap</p>
      </div>

      <Card className="animate-in">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall Progress</p>
              <p className="text-3xl font-bold gradient-text">{progress}%</p>
            </div>
            <Badge variant="gradient" className="text-lg px-4 py-2">
              {totalDone} / {totalItems || 0} Complete
            </Badge>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    {phases.map((phase, index) => {
      const meta = iconMap[phase.name] ?? { icon: Rocket, gradient: 'from-gray-500 to-gray-700' };
      return (
        <Card key={phase.name} className="card-hover animate-in" style={{ animationDelay: `${index * 100}ms` }}>
          <CardHeader>
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${meta.gradient} shadow-lg`}>
                <meta.icon className="h-6 w-6 text-white" />
              </div>
              <Badge variant={phase.done === phase.items ? 'success' : phase.done ? 'info' : 'default'}>
                {phase.done}/{phase.items}
              </Badge>
            </div>
            <CardTitle className="text-xl">{phase.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: phase.items }).map((_, taskIndex) => (
                <div
                  key={taskIndex}
                  className={`flex items-center gap-3 rounded-lg p-3 ${
                    taskIndex < phase.done
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50'
                      : 'bg-gray-50'
                  }`}
                >
                  {taskIndex < phase.done ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : taskIndex === phase.done ? (
                    <Clock className="h-5 w-5 text-blue-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  )}
                  <span className={`text-sm font-medium ${taskIndex < phase.done ? 'text-gray-900' : 'text-gray-500'}`}>
                    Task {taskIndex + 1}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    })}
  </div>
    </div>
  );
}
