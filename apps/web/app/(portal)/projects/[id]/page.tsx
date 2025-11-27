'use client';

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { Upload, Play, FileText, Trash2, Loader2, CheckCircle2, AlertCircle, Settings2, Thermometer } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { UI_PLAN_PHASES, type UIPhaseKey } from '@/data/plan-phases';
import { ProjectTelemetryPanel } from '@/components/projects/telemetry-panel';

type AutomationState = 'idle' | 'running' | 'success' | 'error';
type ScenarioState = { id: string; name: string; description?: string };
type BenchmarkState = {
  targetLatencyMs?: number;
  maxErrorRatePercent?: number;
  targetSuccessRatePercent?: number;
} | null;
type RequirementState = { id: string; name: string; description?: string };

type PhaseSettingsState = {
  enabled: boolean;
  notes?: string | null;
  uatScenarios: ScenarioState[];
  performanceBenchmark: BenchmarkState;
  customRequirements: RequirementState[];
};
type PhaseConfigState = Record<UIPhaseKey, PhaseSettingsState>;

const lockedPhases = new Set<UIPhaseKey>(['auth', 'core', 'cert']);

export default function ProjectOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  
  const projectQuery = trpc.project.get.useQuery({ id: projectId });
  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => router.push('/projects'),
  });
  const utils = trpc.useUtils();

  const project = projectQuery.data;
  const [showDelete, setShowDelete] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [automationLog, setAutomationLog] = useState<string[]>([]);
  const [automationState, setAutomationState] = useState<AutomationState>('idle');
  const [phaseConfig, setPhaseConfig] = useState<PhaseConfigState | null>(null);
  const [phaseMessage, setPhaseMessage] = useState<string | null>(null);

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

  const mockAutomation = trpc.spec.generateMock.useMutation();
  const testsAutomation = trpc.spec.generateTests.useMutation();
  const configurePhases = trpc.project.configurePhases.useMutation({
    onSuccess: async () => {
      setPhaseMessage('Plan scope updated.');
      await Promise.all([projectQuery.refetch(), utils.project.list.invalidate()]);
      setTimeout(() => setPhaseMessage(null), 4000);
    },
    onError: (error) => {
      setPhaseMessage(error.message || 'Unable to update plan scope.');
    },
  });

  // Initialize phase config from project data
  useState(() => {
    if (!project?.phaseConfig) {
      setPhaseConfig(null);
      return;
    }
    const nextState: PhaseConfigState = {} as PhaseConfigState;
    for (const phase of UI_PLAN_PHASES) {
      const incoming = (project.phaseConfig as PhaseConfigState | undefined)?.[phase.key];
      nextState[phase.key] = {
        enabled: incoming?.enabled ?? true,
        notes: incoming?.notes ?? null,
        uatScenarios: Array.isArray(incoming?.uatScenarios) ? incoming.uatScenarios : [],
        performanceBenchmark: incoming?.performanceBenchmark ?? null,
        customRequirements: Array.isArray(incoming?.customRequirements) ? incoming.customRequirements : [],
      };
    }
    setPhaseConfig(nextState);
  });

  if (projectQuery.isLoading || !project) {
    return null; // Layout handles loading state
  }

  const createdAt = new Date(project.createdAt).toLocaleDateString();
  const automationDisabled = automationState === 'running' || project.specs.length === 0;
  const automationStatusCopy: Record<AutomationState, string> = {
    idle: 'Idle',
    running: 'Running',
    success: 'Ready',
    error: 'Needs attention',
  };

  const runAutomation = async () => {
    if (!project?.specs.length) {
      setAutomationLog(['Import a spec before running automation.']);
      return;
    }

    setAutomationState('running');
    setAutomationLog([`Starting automation for ${project.specs.length} spec${project.specs.length > 1 ? 's' : ''}…`]);

    try {
      for (const spec of project.specs) {
        setAutomationLog((prev) => [...prev, `Generating mock for ${spec.name}`]);
        await mockAutomation.mutateAsync({ specId: spec.id });
        setAutomationLog((prev) => [...prev, `Mock ready for ${spec.name}`]);

        setAutomationLog((prev) => [...prev, `Generating golden tests for ${spec.name}`]);
        await testsAutomation.mutateAsync({ specId: spec.id });
        setAutomationLog((prev) => [...prev, `Golden tests stored for ${spec.name}`]);
      }

      setAutomationState('success');
      setAutomationLog((prev) => [...prev, 'Automation complete. Specs now include mocks + tests.']);
      await Promise.all([projectQuery.refetch(), utils.project.list.invalidate()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Automation failed.';
      setAutomationState('error');
      setAutomationLog((prev) => [...prev, `Automation failed: ${message}`]);
    }
  };

  const ensurePhaseState = (key: UIPhaseKey): PhaseSettingsState => {
    if (phaseConfig && phaseConfig[key]) return phaseConfig[key];
    return {
      enabled: true,
      notes: null,
      uatScenarios: [],
      performanceBenchmark: null,
      customRequirements: [],
    };
  };

  const updatePhaseState = (key: UIPhaseKey, updater: (current: PhaseSettingsState) => PhaseSettingsState) => {
    setPhaseConfig((prev) => {
      const current = ensurePhaseState(key);
      const next = updater(current);
      return {
        ...(prev ?? ({} as PhaseConfigState)),
        [key]: next,
      };
    });
  };

  const handleScenarioChange = (key: UIPhaseKey, value: string) => {
    const lines = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    updatePhaseState(key, (current) => {
      const nextScenarios: ScenarioState[] = lines.map((line, index) => ({
        id: current.uatScenarios?.[index]?.id ?? `${key}_scenario_${index}`,
        name: line,
      }));
      return {
        ...current,
        uatScenarios: nextScenarios,
      };
    });
  };

  const handleRequirementChange = (key: UIPhaseKey, value: string) => {
    const lines = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    updatePhaseState(key, (current) => {
      const nextRequirements: RequirementState[] = lines.map((line, index) => ({
        id: current.customRequirements?.[index]?.id ?? `${key}_requirement_${index}`,
        name: line,
      }));
      return { ...current, customRequirements: nextRequirements };
    });
  };

  const handleBenchmarkChange = (key: UIPhaseKey, field: keyof NonNullable<BenchmarkState>, rawValue: string) => {
    updatePhaseState(key, (current) => {
      const numeric = rawValue === '' ? undefined : Number(rawValue);
      const existing = current.performanceBenchmark ?? {};
      const nextBenchmark = { ...existing } as NonNullable<BenchmarkState>;
      if (typeof numeric === 'number' && Number.isFinite(numeric)) {
        nextBenchmark[field] = numeric;
      } else {
        delete nextBenchmark[field];
      }
      const hasValues = Object.keys(nextBenchmark).length > 0;
      return { ...current, performanceBenchmark: hasValues ? nextBenchmark : null };
    });
  };

  const handleNotesChange = (key: UIPhaseKey, notes: string) => {
    updatePhaseState(key, (current) => ({
      ...current,
      notes: notes.length ? notes : null,
    }));
  };

  const handleTogglePhase = (key: UIPhaseKey, enabled: boolean) => {
    if (lockedPhases.has(key)) return;
    updatePhaseState(key, (current) => ({
      ...current,
      enabled,
    }));
  };

  const handleSaveScope = () => {
    if (!phaseConfig) return;
    configurePhases.mutate({
      projectId: project.id,
      config: phaseConfig,
    });
  };

  return (
    <div className="space-y-8">
      {/* Project Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-gray-500">Created {createdAt}</p>
        <Button variant="destructive" size="sm" className="gap-1" onClick={() => setShowDelete(true)}>
          <Trash2 className="h-4 w-4" />
          Delete Project
        </Button>
      </div>

      {/* Quick Actions */}
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
        <Card className="hover:shadow-lg transition bg-white/95 backdrop-blur">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Play className="mb-2 h-8 w-8 text-green-600" />
                <CardTitle className="text-lg text-gray-900">Generate Mock & Tests</CardTitle>
                <CardDescription>Run automation across every spec in this project.</CardDescription>
              </div>
              <Badge variant={automationState === 'error' ? 'error' : automationState === 'success' ? 'success' : 'outline'}>
                {automationStatusCopy[automationState]}
              </Badge>
            </div>
            <Button
              className="gap-2"
              onClick={runAutomation}
              disabled={automationDisabled}
              variant={automationState === 'error' ? 'destructive' : 'default'}
            >
              {automationState === 'running' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Automating…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  {project.specs.length ? 'Generate assets' : 'Import a spec first'}
                </>
              )}
            </Button>
            <p className="text-sm text-gray-500">
              We&apos;ll normalize each spec, create a mock service, and capture golden test suites in sequence so downstream
              pages immediately light up.
            </p>
          </CardHeader>
          <CardContent>
            {automationLog.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                No automation runs yet. Kick things off once specs are imported.
              </div>
            ) : (
              <div className="space-y-2 rounded-2xl border border-gray-100 bg-gray-50/80 p-4 text-sm text-gray-700">
                {automationLog.map((entry, index) => (
                  <div key={`${entry}-${index}`} className="flex items-start gap-2">
                    {entry.toLowerCase().includes('failed') ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 text-red-500" />
                    ) : entry.toLowerCase().includes('complete') || entry.toLowerCase().includes('ready') ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                    ) : (
                      <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-blue-500" />
                    )}
                    <span>{entry}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition"
          onClick={() => router.push(`/projects/${project.id}/reports`)}
        >
          <CardHeader>
            <FileText className="mb-2 h-8 w-8 text-purple-600" />
            <CardTitle className="text-lg text-gray-900">View Reports</CardTitle>
            <CardDescription>Access readiness reports for this project</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <ProjectTelemetryPanel projectId={project.id} />

      {/* Plan Scope Configuration */}
      <Card>
        <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Settings2 className="h-6 w-6 text-indigo-500" />
              <div>
                <CardTitle>Plan Scope & Benchmarks</CardTitle>
                <CardDescription>
                  Toggle optional phases and capture UAT/performance requirements for this project.
                </CardDescription>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {phaseMessage && <span className="text-sm text-gray-600">{phaseMessage}</span>}
            <Button
              onClick={handleSaveScope}
              disabled={!phaseConfig || configurePhases.isPending}
              className="gap-2"
            >
              {configurePhases.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Settings2 className="h-4 w-4" />
                  Save Scope
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!phaseConfig ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-gray-500">
              Loading phase configuration…
            </div>
          ) : (
            <div className="space-y-4">
              {UI_PLAN_PHASES.map((phase) => {
                const state = phaseConfig[phase.key] ?? ensurePhaseState(phase.key);
                const scenarioText = state.uatScenarios?.map((s) => s.name).join('\n') ?? '';
                const requirementsText = state.customRequirements?.map((r) => r.name).join('\n') ?? '';
                const benchmark = state.performanceBenchmark ?? {};
                return (
                  <div
                    key={phase.key}
                    className={clsx(
                      'rounded-3xl border border-gray-100 bg-white/80 p-5 shadow-sm transition',
                      !state.enabled && 'opacity-70'
                    )}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{phase.title}</p>
                        <p className="text-sm text-gray-600">{phase.description}</p>
                        {phase.helper && (
                          <p className="mt-1 text-xs text-gray-500">{phase.helper}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={state.enabled ? 'success' : 'outline'}>
                          {state.enabled ? 'In scope' : 'Skipped'}
                        </Badge>
                        <label
                          className={clsx(
                            'relative inline-flex h-6 w-11 items-center rounded-full transition',
                            phase.locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={state.enabled}
                            disabled={phase.locked}
                            onChange={(event) => handleTogglePhase(phase.key, event.target.checked)}
                          />
                          <span
                            className={clsx(
                              'block h-6 w-11 rounded-full transition',
                              state.enabled ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gray-300'
                            )}
                          />
                          <span
                            className={clsx(
                              'absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition',
                              state.enabled ? 'translate-x-5' : 'translate-x-0'
                            )}
                          />
                        </label>
                      </div>
                    </div>
                    {state.enabled && (
                      <div className="mt-4 space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Notes
                          </label>
                          <textarea
                            value={state.notes ?? ''}
                            onChange={(event) => handleNotesChange(phase.key, event.target.value)}
                            rows={2}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 shadow-inner outline-none transition focus:border-indigo-400"
                            placeholder="Add implementation context or owner notes…"
                          />
                        </div>

                        {phase.key === 'uat' && (
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                UAT Scenarios (one per line)
                              </label>
                              <textarea
                                rows={4}
                                value={scenarioText}
                                onChange={(event) => handleScenarioChange(phase.key, event.target.value)}
                                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 shadow-inner outline-none transition focus:border-indigo-400"
                                placeholder="Card presentment – decline path&#10;Partial refund – manual review"
                              />
                            </div>
                            <div className="space-y-3 rounded-2xl border border-dashed border-indigo-200 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Performance Benchmarks
                              </p>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <label className="text-xs text-gray-500">Target Latency (ms)</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={benchmark.targetLatencyMs ?? ''}
                                    onChange={(event) =>
                                      handleBenchmarkChange(phase.key, 'targetLatencyMs', event.target.value)
                                    }
                                    className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-inner outline-none transition focus:border-indigo-400"
                                    placeholder="500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs text-gray-500">Max Error Rate (%)</label>
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={benchmark.maxErrorRatePercent ?? ''}
                                    onChange={(event) =>
                                      handleBenchmarkChange(phase.key, 'maxErrorRatePercent', event.target.value)
                                    }
                                    className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-inner outline-none transition focus:border-indigo-400"
                                    placeholder="2"
                                  />
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                  <label className="text-xs text-gray-500">Target Success Rate (%)</label>
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={benchmark.targetSuccessRatePercent ?? ''}
                                    onChange={(event) =>
                                      handleBenchmarkChange(phase.key, 'targetSuccessRatePercent', event.target.value)
                                    }
                                    className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-inner outline-none transition focus:border-indigo-400"
                                    placeholder="98"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {phase.key === 'webhooks' && (
                          <div className="flex items-start gap-3 rounded-2xl bg-emerald-50/70 p-4 text-sm text-emerald-900">
                            <Thermometer className="mt-0.5 h-4 w-4" />
                            <p>
                              Document delivery expectations and retry cadence so downstream test automation can assert the
                              correct webhook flows.
                            </p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Custom checklist items (one per line)
                          </label>
                          <textarea
                            rows={3}
                            value={requirementsText}
                            onChange={(event) => handleRequirementChange(phase.key, event.target.value)}
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 shadow-inner outline-none transition focus:border-indigo-400"
                            placeholder="Security review signed&#10;Partner runbook shared"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Specifications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Specifications</CardTitle>
            <CardDescription>Specs attached to this project</CardDescription>
          </div>
          <Link href={`/projects/${project.id}/specs`}>
            <Button variant="outline" size="sm">
              Manage Specs
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {project.specs.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No specs yet. Go to the Specs tab to import one.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {project.specs.map((spec: (typeof project.specs)[number]) => (
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

      {/* Delete Modal */}
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
              <Button variant="ghost" onClick={() => setShowDelete(false)} disabled={deleteMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="gap-1"
                onClick={() => deleteMutation.mutate({ id: project.id })}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
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

      {/* Import Modal */}
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
                <Button variant="ghost" onClick={() => setShowImport(false)} disabled={importSpec.isPending}>
                  Cancel
                </Button>
                <Button type="submit" className="gap-2" disabled={!importUrl || importSpec.isPending}>
                  {importSpec.isPending ? (
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
