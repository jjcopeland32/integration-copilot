import { MockStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ensureMockServer } from '@/lib/mock-server-manager';

export type EnvKey = 'MOCK' | 'SANDBOX' | 'PROD';

const ENV_ORIGINS: Record<Exclude<EnvKey, 'MOCK'>, string | undefined> = {
  SANDBOX: process.env.TESTS_SANDBOX_ORIGIN,
  PROD: process.env.TESTS_PROD_ORIGIN,
};

function requireHttpsOrigin(origin: string, label: string) {
  if (!origin.startsWith('https://')) {
    throw new Error(`${label} must use https:// origins`);
  }
  return origin;
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

  const envName = envKey === 'SANDBOX' ? 'TESTS_SANDBOX_ORIGIN' : 'TESTS_PROD_ORIGIN';
  const origin = ENV_ORIGINS[envKey];
  if (!origin) {
    throw new Error(`${envName} is not configured`);
  }

  return requireHttpsOrigin(origin, envName);
}
