import { createMockServer, MockServer, type MockConfig, type MockRoute } from '@integration-copilot/mockgen';

type MockInstanceLike = {
  id: string;
  baseUrl: string;
  config?: any;
};

type GlobalWithMocks = typeof globalThis & {
  __integrationCopilotMockServers__?: Map<string, MockServer>;
};

const globalWithMocks = globalThis as GlobalWithMocks;
const serverMap =
  globalWithMocks.__integrationCopilotMockServers__ ??
  new Map<string, MockServer>();

if (!globalWithMocks.__integrationCopilotMockServers__) {
  globalWithMocks.__integrationCopilotMockServers__ = serverMap;
}

function extractRoutes(config: any): MockRoute[] | null {
  if (!config || typeof config !== 'object') return null;
  const routes = (config as any).routes;
  if (!Array.isArray(routes)) return null;
  return routes as MockRoute[];
}

function extractSettings(config: any, baseUrl: string): MockConfig {
  const defaults: MockConfig = {
    baseUrl,
    enableLatency: true,
    latencyMs: 50,
    enableRateLimit: false,
    rateLimit: 100,
  };

  if (!config || typeof config !== 'object') {
    return defaults;
  }
  if (typeof config.settings !== 'object' || config.settings === null) {
    return defaults;
  }
  return {
    ...defaults,
    ...(config.settings as Partial<MockConfig>),
    baseUrl,
  };
}

function resolvePort(baseUrl: string): number {
  try {
    const url = new URL(baseUrl);
    if (url.port) return Number(url.port);
    return url.protocol === 'https:' ? 443 : 80;
  } catch {
    throw new Error(`Invalid mock base URL: ${baseUrl}`);
  }
}

export async function ensureMockServer(instance: MockInstanceLike): Promise<void> {
  if (serverMap.has(instance.id)) {
    return;
  }

  const routes = extractRoutes(instance.config);
  if (!routes) {
    throw new Error('Mock instance missing route configuration');
  }

  const settings = extractSettings(instance.config, instance.baseUrl);
  const server = createMockServer(settings);
  server.registerRoutes(routes);
  await server.listen(resolvePort(instance.baseUrl));
  serverMap.set(instance.id, server);
}

export async function stopMockServer(id: string): Promise<void> {
  const server = serverMap.get(id);
  if (!server) return;
  try {
    await server.close();
  } finally {
    serverMap.delete(id);
  }
}

export function isMockServerRunning(id: string): boolean {
  return serverMap.has(id);
}
