import fs from 'node:fs/promises';
import path from 'node:path';
import { GoldenTestSuite } from '@integration-copilot/testkit';

const SUITE_FILES = [
  'tools/golden-tests.payments.sample.json',
  'tools/golden-tests.financing.sample.json',
];

let cache: Map<string, GoldenTestSuite> | null = null;

async function loadSuites(): Promise<Map<string, GoldenTestSuite>> {
  if (cache) return cache;
  const suites = new Map<string, GoldenTestSuite>();
  for (const relativePath of SUITE_FILES) {
    const absolutePath = path.join(process.cwd(), relativePath);
    try {
      const raw = await fs.readFile(absolutePath, 'utf8');
      const parsed = JSON.parse(raw) as GoldenTestSuite;
      suites.set(parsed.name, parsed);
    } catch (error) {
      console.warn('[TestKit] Failed to load suite', relativePath, error);
    }
  }
  cache = suites;
  return suites;
}

export async function getSuiteById(id: string): Promise<GoldenTestSuite | undefined> {
  const suites = await loadSuites();
  return suites.get(id);
}

export async function listSuites(): Promise<GoldenTestSuite[]> {
  const suites = await loadSuites();
  return Array.from(suites.values());
}

export function clearSuiteCache() {
  cache = null;
}
