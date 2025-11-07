import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { getToolsDir } from './paths';
import { TestSuite } from './types';

const suiteCache = new Map<string, TestSuite>();

const SuiteSchema = z.object({
  name: z.string(),
  version: z.string(),
  cases: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      request: z
        .object({
          method: z.string(),
          url: z.string(),
          headers: z.record(z.string()).optional(),
          body: z.any().optional(),
          repeat: z.number().optional(),
          thinkTimeMs: z.number().optional(),
          policy: z
            .object({
              maxAttempts: z.number().optional(),
              baseDelayMs: z.number().optional(),
            })
            .optional(),
          simulate: z
            .object({
              rateLimit: z.boolean().optional(),
            })
            .optional(),
        })
        .optional(),
      expect: z
        .object({
          status: z.number().optional(),
          uniqueness: z.enum(['single_resource']).optional(),
          clientBackoff: z.boolean().optional(),
        })
        .passthrough()
        .optional(),
    })
  ),
});

async function readSuiteFiles() {
  const toolsDir = getToolsDir();
  const entries: string[] = await fs.readdir(toolsDir);
  return entries.filter((file: string) => file.startsWith('golden-tests') && file.endsWith('.json'));
}

async function loadSuiteFromFile(file: string): Promise<TestSuite | null> {
  const toolsDir = getToolsDir();
  const content = await fs.readFile(path.join(toolsDir, file), 'utf8');
  const parsed = SuiteSchema.safeParse(JSON.parse(content));
  if (!parsed.success) {
    console.warn(`[testkit] Failed to parse suite ${file}`, parsed.error);
    return null;
  }

  return parsed.data;
}

export async function loadSuiteById(id: string): Promise<TestSuite | null> {
  if (suiteCache.has(id)) {
    return suiteCache.get(id)!;
  }

  const files = await readSuiteFiles();
  for (const file of files) {
    const suite = await loadSuiteFromFile(file);
    if (!suite) continue;
    suiteCache.set(suite.name, suite);
    if (suite.name === id) {
      return suite;
    }
  }

  return suiteCache.get(id) || null;
}

export function clearSuiteCache() {
  suiteCache.clear();
}
