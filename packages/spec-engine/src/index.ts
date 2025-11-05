export * from './types';
export * from './normalizer';
export * from './blueprint';

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
