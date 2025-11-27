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

export interface TestAssertion {
  type: 'status' | 'field_exists' | 'error_message' | 'idempotency' | 'signature_valid' | 'rate_limit' | 'timeout' | 'retry' | string;
  field?: string;
  value?: unknown;
  condition?: 'equals' | 'in' | 'contains' | 'same_response_on_retry' | 'exceeded_after_n_requests' | 'success_after_n_retries' | string;
}

export interface AssertionResult {
  passed: boolean;
  assertion: TestAssertion;
  error?: string;
  expected?: unknown;
  actual?: unknown;
}

export interface TestCase {
  id: string;
  name: string;
  type: string;
  request?: TestRequest;
  expect?: TestExpectations;
  /** Alternative location for expected status (used by GoldenTestGenerator) */
  expectedStatus?: number;
  /** Expected response body for comparison */
  expectedResponse?: unknown;
  /** Array of assertions to evaluate against the response */
  assertions?: TestAssertion[];
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
  /** Detailed assertion results for debugging */
  assertionResults?: AssertionResult[];
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
  origin: string;
  saveArtifacts?: boolean;
}
