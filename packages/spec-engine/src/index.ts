import path from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml';

export * from './types';
export * from './normalizer';
export * from './blueprint';

import { createNormalizer } from './normalizer';
import { createBlueprintGenerator } from './blueprint';
import {
  NormalizedSpec,
  BlueprintConfig,
  Blueprint,
} from './types';

export class SpecEngine {
  private normalizer = createNormalizer();
  private blueprintGen = createBlueprintGenerator();

  async importFromURL(url: string): Promise<NormalizedSpec> {
    return this.normalizer.normalizeFromURL(url);
  }

  async importFromObject(spec: any): Promise<NormalizedSpec> {
    return this.normalizer.normalizeFromObject(spec);
  }

  generateBlueprint(
    spec: NormalizedSpec,
    config?: BlueprintConfig
  ): Blueprint {
    return this.blueprintGen.generate(spec, config);
  }
}

export function createSpecEngine(): SpecEngine {
  return new SpecEngine();
}

const repoRoot = path.resolve(__dirname, '../../..');
const blueprintDir = path.join(repoRoot, 'apps/web/public/blueprints');

export async function ingestOpenAPI(
  contents: string | Record<string, unknown>
): Promise<NormalizedSpec> {
  const engine = createSpecEngine();
  const document =
    typeof contents === 'string'
      ? (yaml.load(contents) as Record<string, unknown>)
      : contents;

  return engine.importFromObject(document);
}

interface GenerateBlueprintOptions {
  id: string;
  spec: NormalizedSpec;
  config?: BlueprintConfig;
  outputDir?: string;
}

export async function generateBlueprint({
  id,
  spec,
  config,
  outputDir,
}: GenerateBlueprintOptions): Promise<{
  blueprint: Blueprint;
  markdownPath: string;
  markdown: string;
}> {
  const engine = createSpecEngine();
  const blueprint = engine.generateBlueprint(spec, config);
  const targetDir = outputDir || blueprintDir;

  await fs.mkdir(targetDir, { recursive: true });

  const markdownPath = path.join(targetDir, `${id}.md`);
  await fs.writeFile(markdownPath, blueprint.markdown, 'utf8');

  return {
    blueprint,
    markdownPath,
    markdown: blueprint.markdown,
  };
}
