import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import yaml from 'js-yaml';
import { BlueprintGenerator, createNormalizer } from '@integration-copilot/spec-engine';
import { createMockGenerator } from '@integration-copilot/mockgen';
import { registerMockRoutes } from '@/lib/mock-registry';

const DEMO_KEY = 'petstore';
const normalizer = createNormalizer();
const blueprintGenerator = new BlueprintGenerator();

export async function POST() {
  try {
    const repoRoot = path.resolve(process.cwd(), '../..');
    const specPath = path.join(repoRoot, 'apps/web/data/petstore-openapi.yaml');
    const raw = await fs.readFile(specPath, 'utf8');

    const specDocument = yaml.load(raw);
    const normalized = await normalizer.normalizeFromObject(specDocument);
    const blueprint = blueprintGenerator.generate(normalized);
    const blueprintId = `${DEMO_KEY}-${Date.now()}`;
    const blueprintDir = path.join(repoRoot, 'apps/web/public/blueprints');
    await fs.mkdir(blueprintDir, { recursive: true });
    await fs.writeFile(path.join(blueprintDir, `${blueprintId}.md`), blueprint.markdown, 'utf8');

    const generator = createMockGenerator();
    const mockConfig = {
      baseUrl: '/api/mock',
      enableLatency: true,
      latencyMs: 50,
      enableRateLimit: false,
    };

    const { routes } = generator.generate(normalized, mockConfig);
    registerMockRoutes(DEMO_KEY, {
      routes,
      latencyMs: mockConfig.latencyMs || 0,
    });

    return NextResponse.json({
      blueprintId,
      blueprintUrl: `/blueprints/${blueprintId}.md`,
      mockBaseUrl: '/api/mock',
      suiteId: 'PAYMENTS_BASELINE_v1',
      spec: {
        title: normalized.title,
        version: normalized.version,
        endpoints: normalized.endpoints.length,
      },
    });
  } catch (error) {
    console.error('[specs/petstore] failed to load demo', error);
    return NextResponse.json(
      { error: 'Unable to load Petstore demo spec.' },
      { status: 500 }
    );
  }
}
