export * from './types';
export * from './normalizer';
export * from './blueprint';

import { load as loadYaml } from 'js-yaml';
import axios from 'axios';
import { createNormalizer } from './normalizer';
import { createBlueprintGenerator } from './blueprint';
import { NormalizedSpec, BlueprintConfig, Blueprint } from './types';

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

export async function ingestOpenAPI({
  urlOrString,
}: {
  urlOrString: string | object;
}): Promise<NormalizedSpec> {
  const engine = createSpecEngine();

  if (typeof urlOrString === 'object') {
    return engine.importFromObject(urlOrString);
  }

  const trimmed = urlOrString.trim();

  try {
    const url = new URL(trimmed);
    const response = await axios.get(url.toString(), { responseType: 'text' });
    const text = response.data as string;
    if (text.trim().startsWith('{')) {
      return engine.importFromObject(JSON.parse(text));
    }
    return engine.importFromObject(loadYaml(text));
  } catch {
    if (trimmed.startsWith('{')) {
      return engine.importFromObject(JSON.parse(trimmed));
    }
    return engine.importFromObject(loadYaml(trimmed));
  }
}

export function generateBlueprint(
  model: NormalizedSpec,
  { scope }: { scope?: string } = {}
): { markdown: string; json: any } {
  const generator = createBlueprintGenerator();
  const blueprint = generator.generate(model, {});

  return {
    markdown: blueprint.markdown,
    json: {
      title: model.title,
      version: model.version,
      scope: scope ?? 'full',
      endpoints: blueprint.endpoints.length,
    },
  };
}
