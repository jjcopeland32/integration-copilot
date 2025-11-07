import { MockRoute } from '@integration-copilot/mockgen';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface MockRegistryEntry {
  routes: MockRoute[];
  latencyMs: number;
}

type MockRegistry = Record<string, MockRegistryEntry>;

declare global {
  // eslint-disable-next-line no-var
  var __integrationCopilotMockRegistry: MockRegistry | undefined;
}

function getRegistry(): MockRegistry {
  if (!globalThis.__integrationCopilotMockRegistry) {
    globalThis.__integrationCopilotMockRegistry = {};
  }
  return globalThis.__integrationCopilotMockRegistry;
}

export function registerMockRoutes(
  key: string,
  entry: MockRegistryEntry
) {
  const registry = getRegistry();
  registry[key] = entry;
}

export function getMockEntry(method: Method, path: string) {
  const registry = getRegistry();
  const entries = Object.values(registry);

  for (const entry of entries) {
    const route = entry.routes.find(
      (r) => r.method.toUpperCase() === method && matchPath(r.path, path)
    );

    if (route) {
      return { entry, route };
    }
  }

  return undefined;
}

function matchPath(routePath: string, requestPath: string) {
  const normalizedRoute = routePath.replace(/:[^/]+/g, '([^/]+)');
  const pattern = new RegExp(`^${normalizedRoute}$`);
  return pattern.test(requestPath);
}

export function getLatencyForKey(key: string) {
  const registry = getRegistry();
  return registry[key]?.latencyMs ?? 0;
}
