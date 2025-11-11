export type UIPhaseKey = 'auth' | 'core' | 'webhooks' | 'uat' | 'cert';

export type UIPlanPhase = {
  key: UIPhaseKey;
  title: string;
  description: string;
  accent: string;
  optional?: boolean;
  locked?: boolean;
  helper?: string;
};

export const UI_PLAN_PHASES: UIPlanPhase[] = [
  {
    key: 'auth',
    title: 'Authentication',
    description: 'Credentials, token rotation, and secrets handling.',
    accent: 'from-blue-500 to-cyan-500',
    locked: true,
    helper: 'Required for every integration.',
  },
  {
    key: 'core',
    title: 'Core Integration',
    description: 'Primary API endpoints and golden tests.',
    accent: 'from-purple-500 to-pink-500',
    locked: true,
    helper: 'Tracks mandatory endpoint coverage.',
  },
  {
    key: 'webhooks',
    title: 'Webhooks',
    description: 'Optional event/webhook implementation.',
    accent: 'from-emerald-500 to-green-500',
    optional: true,
    helper: 'Disable if the vendor has no event callbacks.',
  },
  {
    key: 'uat',
    title: 'UAT & Benchmarks',
    description: 'Scenario playback and performance standards.',
    accent: 'from-orange-500 to-amber-500',
    optional: true,
    helper: 'Add concrete UAT scenarios and latency goals.',
  },
  {
    key: 'cert',
    title: 'Certification',
    description: 'Launch readiness, documents, and sign-off.',
    accent: 'from-slate-500 to-indigo-500',
    locked: true,
    helper: 'Tracks final go-live evidence.',
  },
];
