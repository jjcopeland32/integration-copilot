import { MockStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ensureMockServer } from '@/lib/mock-server-manager';

export type EnvKey = 'MOCK' | 'SANDBOX' | 'PROD';
type NonMockEnvKey = Exclude<EnvKey, 'MOCK'>;

type ProjectTestSettings = {
  envOrigins: Partial<Record<NonMockEnvKey, string>>;
  allowedHostnames: Set<string>;
};

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^0\.0\.0\.0$/,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
];

const IPV4_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6_PATTERN = /^[0-9a-f:]+$/i;

const ENV_KEY_ALIASES: Record<string, NonMockEnvKey> = {
  sandbox: 'SANDBOX',
  SANDBOX: 'SANDBOX',
  prod: 'PROD',
  PROD: 'PROD',
  production: 'PROD',
  Production: 'PROD',
  PRODUCTION: 'PROD',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractOriginValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (isRecord(value)) {
    if (typeof value.origin === 'string') return value.origin;
    if (typeof value.url === 'string') return value.url;
  }
  return undefined;
}

function normalizeEnvKey(rawKey: string): NonMockEnvKey | null {
  if (!rawKey) return null;
  if (rawKey in ENV_KEY_ALIASES) {
    return ENV_KEY_ALIASES[rawKey];
  }

  const lowered = rawKey.toLowerCase();
  if (lowered.startsWith('sandbox')) return 'SANDBOX';
  if (lowered.startsWith('prod')) return 'PROD';
  if (lowered.startsWith('production')) return 'PROD';
  return null;
}

function extractEnvOrigins(source: unknown): Partial<Record<NonMockEnvKey, string>> {
  if (!isRecord(source)) {
    return {};
  }

  const origins: Partial<Record<NonMockEnvKey, string>> = {};
  const record = source as Record<string, unknown>;

  const assignFromSource = (source: unknown) => {
    if (!isRecord(source)) return;
    for (const [rawKey, entry] of Object.entries(source)) {
      const normalizedKey = normalizeEnvKey(rawKey);
      if (!normalizedKey) continue;
      const origin = extractOriginValue(entry);
      if (origin) {
        origins[normalizedKey] = origin;
      }
    }
  };

  assignFromSource(record);
  assignFromSource(record['envOrigins']);
  assignFromSource(record['environments']);

  for (const [rawKey, envKey] of Object.entries(ENV_KEY_ALIASES)) {
    const candidate = extractOriginValue(record[`${rawKey}Origin`]);
    if (candidate) {
      origins[envKey] = candidate;
    }
  }

  return origins;
}

function normalizeHostname(hostname: string): string {
  const trimmed = hostname.trim();
  if (!trimmed) return '';
  if (trimmed.includes('://')) {
    try {
      return new URL(trimmed).hostname.toLowerCase();
    } catch {
      return trimmed.toLowerCase();
    }
  }
  return trimmed.toLowerCase();
}

function collectHostnames(source: unknown): string[] {
  if (!source) return [];
  const hosts: string[] = [];

  const pushHost = (value: unknown) => {
    if (typeof value !== 'string') return;
    const normalized = normalizeHostname(value);
    if (normalized) {
      hosts.push(normalized);
    }
  };

  if (Array.isArray(source)) {
    for (const entry of source) {
      pushHost(entry);
    }
    return hosts;
  }

  if (isRecord(source)) {
    for (const entry of Object.values(source)) {
      pushHost(entry);
    }
    return hosts;
  }

  pushHost(source);
  return hosts;
}

function normalizeTestSettings(configValue: unknown): ProjectTestSettings {
  if (!isRecord(configValue)) {
    return { envOrigins: {}, allowedHostnames: new Set() };
  }

  const recordConfig = configValue as Record<string, unknown>;
  const testsCandidate = recordConfig['tests'];
  const testsConfig = isRecord(testsCandidate) ? (testsCandidate as Record<string, unknown>) : undefined;
  const envOrigins: Partial<Record<NonMockEnvKey, string>> = {
    ...extractEnvOrigins(recordConfig),
    ...extractEnvOrigins(testsConfig),
  };

  const allowedHostnames = new Set<string>();
  const hostSources = [
    recordConfig['allowedHostnames'],
    testsConfig?.['allowedHostnames'],
    testsConfig?.['allowedHosts'],
    testsConfig?.['hostnames'],
  ];
  for (const source of hostSources) {
    for (const host of collectHostnames(source)) {
      allowedHostnames.add(host);
    }
  }

  return { envOrigins, allowedHostnames };
}

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function isIpAddress(hostname: string): boolean {
  return IPV4_PATTERN.test(hostname) || (hostname.includes(':') && IPV6_PATTERN.test(hostname));
}

async function loadProjectTestSettings(projectId: string): Promise<ProjectTestSettings> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { vendorConfig: true },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  return normalizeTestSettings(project.vendorConfig);
}

function requireConfiguredOrigin(
  envKey: NonMockEnvKey,
  config: ProjectTestSettings
): URL {
  const configured = config.envOrigins[envKey];
  if (!configured) {
    throw new Error(`${envKey.toLowerCase()} origin is not configured for this project`);
  }

  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error(`Invalid ${envKey.toLowerCase()} origin configured for this project`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`${envKey.toLowerCase()} origin must use https://`);
  }

  return parsed;
}

function assertHostnameAllowed(hostname: string, allowedHostnames: Set<string>) {
  const normalized = hostname.toLowerCase();
  if (isPrivateHost(normalized) || isIpAddress(normalized)) {
    throw new Error('External environments cannot target localhost or private networks');
  }
  if (allowedHostnames.size === 0) {
    throw new Error('No allowed hostnames configured for this project');
  }
  if (!allowedHostnames.has(normalized)) {
    throw new Error(`Hostname ${hostname} is not registered for this project`);
  }
}

export async function resolveOriginFromEnv(
  envKey: EnvKey,
  projectId: string
): Promise<string> {
  if (envKey === 'MOCK') {
    const mockInstance = await prisma.mockInstance.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    if (!mockInstance) {
      throw new Error('No mock instances available for this project');
    }

    await ensureMockServer(mockInstance);
    if (mockInstance.status !== MockStatus.RUNNING) {
      await prisma.mockInstance.update({
        where: { id: mockInstance.id },
        data: { status: MockStatus.RUNNING },
      });
    }

    return mockInstance.baseUrl;
  }

  const settings = await loadProjectTestSettings(projectId);
  const parsedOrigin = requireConfiguredOrigin(envKey, settings);
  assertHostnameAllowed(parsedOrigin.hostname, settings.allowedHostnames);
  return parsedOrigin.origin;
}
