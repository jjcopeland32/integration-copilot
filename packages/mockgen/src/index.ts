import { NormalizedSpec } from '@integration-copilot/spec-engine';
import { createServer as createTcpServer } from 'net';
import { MockGenerator } from './generator';
import { createMockServer } from './server';

export * from './generator';
export * from './server';
export * from './golden-tests';

export async function startMockServer(
  model: NormalizedSpec,
  {
    port,
    latencyMs = 50,
    errorRate = 0,
    maxPortIncrements = 5,
  }: { port: number; latencyMs?: number; errorRate?: number; maxPortIncrements?: number }
) {
  const assignedPort = await findAvailablePort(port, maxPortIncrements);
  const baseUrl = `http://localhost:${assignedPort}`;
  const generator = new MockGenerator();
  const { routes } = generator.generate(model, {
    baseUrl,
    enableLatency: latencyMs > 0,
    latencyMs,
  });

  const server = createMockServer({
    baseUrl,
    enableLatency: latencyMs > 0,
    latencyMs,
    enableRateLimit: false,
  });

  server.registerRoutes(routes);
  await server.listen(assignedPort);

  if (errorRate > 0) {
    console.log('[Mock] errorRate handling not implemented in MVP - using deterministic responses');
  }
  if (assignedPort !== port) {
    console.log(`[Mock] Port ${port} busy, started on ${assignedPort} instead`);
  }

  return {
    baseUrl,
    port: assignedPort,
    close: () => server.close(),
  };
}

export async function fireMockWebhook(targetUrl: string | undefined, payload: unknown) {
  if (!targetUrl) {
    console.log('[MockWebhook] No target configured, payload:', payload);
    return { status: 200 };
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
    });
    console.log('[MockWebhook] Sent payload to', targetUrl, 'status', response.status);
    return { status: response.status };
  } catch (error) {
    console.warn('[MockWebhook] Failed to reach target, falling back to console log', error);
    return { status: 200 };
  }
}

async function findAvailablePort(startPort: number, maxIncrements: number): Promise<number> {
  for (let i = 0; i <= maxIncrements; i++) {
    const candidate = startPort + i;
    if (await isPortFree(candidate)) {
      return candidate;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const tester = createTcpServer();
    tester.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }
      reject(error);
    });
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, '0.0.0.0');
  });
}
