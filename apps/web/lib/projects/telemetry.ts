import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';

const DEFAULT_BASE_URL =
  process.env.COPILOT_BASE_URL ||
  process.env.APP_URL ||
  process.env.VERCEL_URL ||
  'http://localhost:3000';

function buildBaseUrl() {
  if (!DEFAULT_BASE_URL) {
    return 'http://localhost:3000';
  }
  if (DEFAULT_BASE_URL.startsWith('http://') || DEFAULT_BASE_URL.startsWith('https://')) {
    return DEFAULT_BASE_URL.replace(/\/$/, '');
  }
  return `https://${DEFAULT_BASE_URL.replace(/\/$/, '')}`;
}

export function generateTelemetrySecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function rotateTelemetrySecret(projectId: string) {
  const secret = generateTelemetrySecret();
  await prisma.project.update({
    where: { id: projectId },
    data: { telemetrySecret: secret },
  });
  return secret;
}

export async function ensureTelemetrySecret(projectId: string): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { telemetrySecret: true },
  });
  if (!project) {
    throw new Error('Project not found');
  }
  if (project.telemetrySecret) {
    return project.telemetrySecret;
  }
  const secret = generateTelemetrySecret();
  await prisma.project.update({
    where: { id: projectId },
    data: { telemetrySecret: secret },
  });
  return secret;
}

export type TelemetryDelivery = {
  id: string;
  createdAt: string;
  verdict: string;
  signatureStatus: string;
  method?: string;
  path?: string;
  statusCode?: number | null;
};

export type ProjectTelemetrySummary = {
  endpoint: string;
  secret: string;
  deliveries: TelemetryDelivery[];
};

export async function getProjectTelemetrySummary(projectId: string): Promise<ProjectTelemetrySummary> {
  const [secret, traces] = await Promise.all([
    ensureTelemetrySecret(projectId),
    prisma.trace.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        verdict: true,
        signatureStatus: true,
        requestMeta: true,
        responseMeta: true,
      },
    }),
  ]);

  const deliveries: TelemetryDelivery[] = traces.map((trace) => {
    const requestMeta = trace.requestMeta as { method?: string; path?: string } | null;
    const responseMeta = trace.responseMeta as { status?: number } | null;
    return {
      id: trace.id,
      createdAt: trace.createdAt.toISOString(),
      verdict: trace.verdict,
      signatureStatus: trace.signatureStatus,
      method: requestMeta?.method,
      path: requestMeta?.path,
      statusCode: typeof responseMeta?.status === 'number' ? responseMeta?.status : null,
    };
  });

  const endpoint = `${buildBaseUrl()}/api/trace`;

  return {
    endpoint,
    secret,
    deliveries,
  };
}
