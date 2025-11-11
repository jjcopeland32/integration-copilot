export type PhaseKey = 'auth' | 'core' | 'webhooks' | 'uat' | 'cert';

export interface PhaseDefinition {
  key: PhaseKey;
  title: string;
  description: string;
  exitCriteria: string[];
  optional?: boolean;
}

export interface PhaseScenario {
  id: string;
  name: string;
  description?: string;
}

export interface PerformanceBenchmark {
  targetLatencyMs?: number | null;
  maxErrorRatePercent?: number | null;
  targetSuccessRatePercent?: number | null;
}

export interface PhaseSettings {
  enabled: boolean;
  notes?: string | null;
  uatScenarios: PhaseScenario[];
  performanceBenchmark?: PerformanceBenchmark | null;
}

export type ProjectPhaseConfig = Record<PhaseKey, PhaseSettings>;

export const PLAN_PHASES: PhaseDefinition[] = [
  {
    key: 'auth',
    title: 'Authentication Setup',
    description: 'Configure and validate credential flows across environments.',
    exitCriteria: [
      'API credentials issued and stored securely',
      'Authentication integration test passes',
      'Token refresh/rotation documented',
    ],
  },
  {
    key: 'core',
    title: 'Core Integration',
    description: 'Implement and validate primary API endpoints.',
    exitCriteria: [
      'All required endpoints implemented',
      'Primary golden tests passing',
      'Error handling instrumented',
    ],
  },
  {
    key: 'webhooks',
    title: 'Webhooks & Eventing',
    description: 'Stand up webhook endpoints, secrets, and replay flows.',
    exitCriteria: [
      'Webhook endpoint configured',
      'Signature verification implemented',
      'Replay/ordering strategy documented',
    ],
    optional: true,
  },
  {
    key: 'uat',
    title: 'User Acceptance Testing',
    description: 'Run full UAT scenarios and performance benchmarks.',
    exitCriteria: [
      'Golden tests passing for 7 consecutive days',
      'Stakeholder sign-off on UAT scope',
      'Performance baselines captured',
    ],
    optional: true,
  },
  {
    key: 'cert',
    title: 'Certification & Launch',
    description: 'Finalize readiness report, evidence, and go-live approvals.',
    exitCriteria: [
      'Readiness report signed',
      'Operational runbooks completed',
      'Support contacts confirmed',
    ],
  },
];

function defaultSettings(phase: PhaseDefinition): PhaseSettings {
  return {
    enabled: true,
    notes: null,
    uatScenarios: [],
    performanceBenchmark: null,
  };
}

export const DEFAULT_PHASE_CONFIG: ProjectPhaseConfig = PLAN_PHASES.reduce<ProjectPhaseConfig>((acc, phase) => {
  acc[phase.key] = {
    ...defaultSettings(phase),
    enabled: true,
  };
  return acc;
}, {} as ProjectPhaseConfig);

function cloneDefaultConfig(): ProjectPhaseConfig {
  const clone: ProjectPhaseConfig = {} as ProjectPhaseConfig;
  for (const phase of PLAN_PHASES) {
    clone[phase.key] = {
      enabled: DEFAULT_PHASE_CONFIG[phase.key].enabled,
      notes: DEFAULT_PHASE_CONFIG[phase.key].notes ?? null,
      uatScenarios: [],
      performanceBenchmark: null,
    };
  }
  return clone;
}

function sanitizeScenario(scenario: any, index: number): PhaseScenario {
  const fallbackName = `Scenario ${index + 1}`;
  const name =
    typeof scenario?.name === 'string' && scenario.name.trim().length > 0
      ? scenario.name.trim()
      : fallbackName;
  const description =
    typeof scenario?.description === 'string' && scenario.description.trim().length > 0
      ? scenario.description.trim()
      : undefined;
  const idCandidate =
    typeof scenario?.id === 'string' && scenario.id.trim().length > 0
      ? scenario.id.trim()
      : null;
  const id = idCandidate ?? `scenario_${index}_${Math.random().toString(36).slice(2, 8)}`;

  return { id, name, description };
}

function sanitizeNumber(value: unknown): number | undefined {
  if (typeof value !== 'number') return undefined;
  if (!Number.isFinite(value)) return undefined;
  return value;
}

function sanitizePercent(value: unknown): number | undefined {
  const numeric = sanitizeNumber(value);
  if (typeof numeric !== 'number') return undefined;
  if (numeric < 0 || numeric > 100) return undefined;
  return numeric;
}

export function normalizePhaseConfig(config: unknown): ProjectPhaseConfig {
  const normalized = cloneDefaultConfig();

  if (!config || typeof config !== 'object') {
    return normalized;
  }

  for (const phase of PLAN_PHASES) {
    const raw = (config as Record<string, any>)[phase.key];
    if (!raw || typeof raw !== 'object') {
      continue;
    }

    if (typeof raw.enabled === 'boolean') {
      normalized[phase.key].enabled = raw.enabled;
    }

    if (typeof raw.notes === 'string') {
      normalized[phase.key].notes = raw.notes.slice(0, 500);
    } else if (raw.notes === null) {
      normalized[phase.key].notes = null;
    }

    if (Array.isArray(raw.uatScenarios)) {
      normalized[phase.key].uatScenarios = raw.uatScenarios.map((scenario: any, index: number) =>
        sanitizeScenario(scenario, index)
      );
    }

    if (raw.performanceBenchmark && typeof raw.performanceBenchmark === 'object') {
      const normalizedBenchmark: PerformanceBenchmark = {};
      const latency = sanitizeNumber(raw.performanceBenchmark.targetLatencyMs);
      if (typeof latency === 'number') {
        normalizedBenchmark.targetLatencyMs = Math.max(0, Math.round(latency));
      }
      const errorRate = sanitizePercent(raw.performanceBenchmark.maxErrorRatePercent);
      if (typeof errorRate === 'number') {
        normalizedBenchmark.maxErrorRatePercent = errorRate;
      }
      const successRate = sanitizePercent(raw.performanceBenchmark.targetSuccessRatePercent);
      if (typeof successRate === 'number') {
        normalizedBenchmark.targetSuccessRatePercent = successRate;
      }

      const hasBenchmark =
        typeof normalizedBenchmark.targetLatencyMs === 'number' ||
        typeof normalizedBenchmark.maxErrorRatePercent === 'number' ||
        typeof normalizedBenchmark.targetSuccessRatePercent === 'number';

      normalized[phase.key].performanceBenchmark = hasBenchmark ? normalizedBenchmark : null;
    }
  }

  return normalized;
}

export function listEnabledPhases(config?: ProjectPhaseConfig): PhaseDefinition[] {
  const normalized = normalizePhaseConfig(config);
  return PLAN_PHASES.filter((phase) => normalized[phase.key]?.enabled);
}
