import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import yaml from 'js-yaml';
import { z } from 'zod';
import { BlueprintGenerator, createNormalizer } from '@integration-copilot/spec-engine';
import { MockGenerator, GoldenTestGenerator } from '@integration-copilot/mockgen';

const DEMO_KEY = 'petstore';
const BLUEPRINT_DIR = path.join(process.cwd(), '.artifacts/blueprints');
const SpecShape = z.object({
  info: z.object({
    title: z.string().min(1),
    version: z.string().min(1),
  }),
  paths: z.record(z.any()),
});

const normalizer = createNormalizer();
const blueprintGenerator = new BlueprintGenerator();
const mockGenerator = new MockGenerator();
const testsGenerator = new GoldenTestGenerator();

export async function POST() {
  try {
    const repoRoot = path.resolve(process.cwd(), '../..');
    const specPath = path.join(repoRoot, 'apps/web/data/petstore-openapi.yaml');
    const raw = await fs.readFile(specPath, 'utf8');

    const specDocument = yaml.load(raw);
    SpecShape.parse(specDocument);

    const normalized = await normalizer.normalizeFromObject(specDocument);
    const blueprint = blueprintGenerator.generate(normalized);
    const blueprintId = `${DEMO_KEY}-${Date.now()}`;
    await fs.mkdir(BLUEPRINT_DIR, { recursive: true });
    const blueprintFile = path.join(BLUEPRINT_DIR, `${blueprintId}.md`);
    await fs.writeFile(blueprintFile, blueprint.markdown, 'utf8');

    const mockConfig = {
      baseUrl: 'http://localhost:3999',
      enableLatency: true,
      latencyMs: 50,
      enableRateLimit: false,
    };
    const { routes, postmanCollection } = mockGenerator.generate(normalized, mockConfig);
    const tests = testsGenerator.generate(normalized, mockConfig.baseUrl);

    return NextResponse.json({
      blueprintId,
      blueprintPath: blueprintFile,
      spec: {
        title: normalized.title,
        version: normalized.version,
        endpoints: normalized.endpoints.length,
      },
      mockPreview: {
        settings: mockConfig,
        routes,
        postmanCollection,
      },
      tests,
    });
  } catch (error) {
    console.error('[specs/petstore] failed to load demo', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Demo spec is missing required OpenAPI fields.', issues: error.errors },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: 'Unable to load Petstore demo spec.' },
      { status: 500 }
    );
  }
}
