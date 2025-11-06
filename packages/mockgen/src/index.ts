import { NormalizedSpec } from '@integration-copilot/spec-engine';
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
  }: { port: number; latencyMs?: number; errorRate?: number }
) {
  const baseUrl = `http://localhost:${port}`;
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
  await server.listen(port);

  if (errorRate > 0) {
    console.log('[Mock] errorRate handling not implemented in MVP - using deterministic responses');
  }

  return {
    baseUrl,
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
