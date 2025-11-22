import paymentsSuite from '../../../tools/golden-tests.payments.sample.json';
import financingSuite from '../../../tools/golden-tests.financing.sample.json';
type GoldenTestSuite = {
  name: string;
  version?: string;
  cases: Array<Record<string, unknown>>;
};

const inlineSuites: GoldenTestSuite[] = [
  paymentsSuite as GoldenTestSuite,
  financingSuite as GoldenTestSuite,
];

let cache: Map<string, GoldenTestSuite> | null = null;

async function loadSuites(): Promise<Map<string, GoldenTestSuite>> {
  if (cache) return cache;
  const suites = new Map<string, GoldenTestSuite>();
  for (const suite of inlineSuites) {
    suites.set(suite.name, suite);
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
