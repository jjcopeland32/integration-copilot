declare module '@integration-copilot/testkit' {
  export type Actor = 'VENDOR' | 'PARTNER';

  export interface GoldenTestRequest {
    method?: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    repeat?: number;
    simulate?: Record<string, unknown>;
  }

  export interface GoldenTestExpect {
    status?: number;
    [key: string]: unknown;
  }

  export interface GoldenTestCase {
    id: string;
    name: string;
    type?: string;
    request?: GoldenTestRequest;
    webhook?: Record<string, unknown>;
    expect?: GoldenTestExpect;
  }

  export interface GoldenTestSuite {
    name: string;
    version?: string;
    cases: GoldenTestCase[];
  }

  export interface CaseRunResult {
    id: string;
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    message?: string;
    response?: {
      status: number;
      body?: unknown;
    };
  }

  export interface SuiteRunResult {
    suiteId: string;
    baseUrl: string;
    actor?: Actor;
    startedAt: string;
    finishedAt: string;
    summary: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
    };
    results: CaseRunResult[];
  }

  export interface RunSuiteOptions {
    suite: GoldenTestSuite;
    baseUrl: string;
    actor?: Actor;
    fetchImpl?: typeof fetch;
  }

  export function runSuite(options: RunSuiteOptions): Promise<SuiteRunResult>;
  const _default: {
    runSuite: typeof runSuite;
  };
  export default _default;
}
