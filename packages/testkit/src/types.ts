export interface RetryPolicy {
  maxAttempts?: number;
  baseDelayMs?: number;
}

export interface TestRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  repeat?: number;
  thinkTimeMs?: number;
  policy?: RetryPolicy;
  simulate?: {
    rateLimit?: boolean;
  };
}

export interface TestExpectations {
  status?: number;
  uniqueness?: 'single_resource';
  clientBackoff?: boolean;
  [key: string]: unknown;
}

export interface TestCase {
  id: string;
  name: string;
  type: string;
  request?: TestRequest;
  expect?: TestExpectations;
}

export interface TestSuite {
  name: string;
  version: string;
  cases: TestCase[];
}

export interface AttemptRecord {
  status: number;
  body: unknown;
  durationMs: number;
  timestamp: number;
}

export interface RepeatRecord {
  repeatIndex: number;
  attempts: AttemptRecord[];
}

export interface CaseResult {
  id: string;
  name: string;
  status: 'passed' | 'failed';
  repeats: RepeatRecord[];
  errors: string[];
}

export interface SuiteRunResult {
  suite: TestSuite;
  suiteId: string;
  runId: string;
  startedAt: string;
  finishedAt: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    durationMs: number;
  };
  cases: CaseResult[];
}

export interface RunSuiteOptions {
  baseUrl: string;
  saveArtifacts?: boolean;
}
