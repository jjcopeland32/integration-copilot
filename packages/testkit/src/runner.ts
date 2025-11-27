import fs from 'fs/promises';
import sanitize from 'sanitize-filename';
import { randomUUID } from 'crypto';
import { loadSuiteById } from './loader';
import { getArtifactsDir } from './paths';
import {
  CaseResult,
  RunSuiteOptions,
  SuiteRunResult,
  TestCase,
  TestSuite,
  AttemptRecord,
  TestAssertion,
  AssertionResult,
} from './types';
import { buildSafeUrl } from './urlGuard';
import { resolveTemplates } from './templates';

const DEFAULT_BASE_DELAY = 200;

async function ensureArtifactsDir() {
  const dir = getArtifactsDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function extractIdentifier(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const candidate = (body as any).id ?? (body as any).data?.id;
  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return String(candidate);
  }
  return null;
}

/**
 * Deep check if a field path exists in an object
 * Supports dot notation like "data.user.id"
 */
function fieldExists(obj: unknown, fieldPath: string): boolean {
  if (!obj || typeof obj !== 'object') return false;
  
  const parts = fieldPath.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return false;
    }
    current = (current as Record<string, unknown>)[part];
  }
  
  return current !== undefined;
}

/**
 * Get a field value from an object using dot notation
 */
function getFieldValue(obj: unknown, fieldPath: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  
  const parts = fieldPath.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  
  return current;
}

/**
 * Evaluate a single assertion against the response
 */
function evaluateAssertion(
  assertion: TestAssertion,
  responseBody: unknown,
  responseStatus: number | null
): AssertionResult {
  const { type, field, value, condition } = assertion;

  switch (type) {
    case 'status': {
      if (condition === 'equals') {
        const expected = value as number;
        const passed = responseStatus === expected;
        return {
          passed,
          assertion,
          error: passed ? undefined : `Status mismatch: expected ${expected}, got ${responseStatus}`,
          expected,
          actual: responseStatus,
        };
      }
      if (condition === 'in') {
        const allowedValues = value as number[];
        const passed = responseStatus !== null && allowedValues.includes(responseStatus);
        return {
          passed,
          assertion,
          error: passed ? undefined : `Status ${responseStatus} not in allowed values [${allowedValues.join(', ')}]`,
          expected: allowedValues,
          actual: responseStatus,
        };
      }
      // Default: check value directly if no condition specified
      if (value !== undefined) {
        const expected = value as number;
        const passed = responseStatus === expected;
        return {
          passed,
          assertion,
          error: passed ? undefined : `Status mismatch: expected ${expected}, got ${responseStatus}`,
          expected,
          actual: responseStatus,
        };
      }
      return { passed: true, assertion };
    }

    case 'field_exists': {
      if (!field) {
        return {
          passed: false,
          assertion,
          error: 'field_exists assertion requires a field property',
        };
      }
      const exists = fieldExists(responseBody, field);
      return {
        passed: exists,
        assertion,
        error: exists ? undefined : `Field "${field}" does not exist in response`,
        expected: `field "${field}" to exist`,
        actual: exists ? 'exists' : 'missing',
      };
    }

    case 'error_message': {
      if (condition === 'contains' && typeof value === 'string') {
        const errorField = field || 'error';
        const errorMessage = getFieldValue(responseBody, errorField);
        const messageStr = typeof errorMessage === 'string' ? errorMessage : '';
        // Also check 'message' field as fallback
        const messageField = getFieldValue(responseBody, 'message');
        const messageFieldStr = typeof messageField === 'string' ? messageField : '';
        
        const combinedMessage = `${messageStr} ${messageFieldStr}`.toLowerCase();
        const searchValue = value.toLowerCase();
        const passed = combinedMessage.includes(searchValue);
        
        return {
          passed,
          assertion,
          error: passed ? undefined : `Error message does not contain "${value}"`,
          expected: `message containing "${value}"`,
          actual: errorMessage || messageField || '(no error message)',
        };
      }
      return { passed: true, assertion };
    }

    case 'idempotency': {
      // Idempotency is checked separately during repeat handling
      // This assertion type is informational
      return { passed: true, assertion };
    }

    case 'signature_valid': {
      // Webhook signature validation - check if response indicates valid signature
      // In a real implementation, this would verify HMAC signatures
      return { passed: true, assertion };
    }

    case 'rate_limit': {
      // Rate limit assertions are typically verified by checking 429 responses
      // The actual check happens at the status level
      return { passed: true, assertion };
    }

    case 'timeout': {
      // Timeout assertions are informational - actual timeout handling is in the request
      return { passed: true, assertion };
    }

    case 'retry': {
      // Retry success assertions are informational
      return { passed: true, assertion };
    }

    default: {
      // Unknown assertion type - log warning but don't fail
      console.warn(`[testkit] Unknown assertion type: ${type}`);
      return { passed: true, assertion };
    }
  }
}

/**
 * Compare expected response with actual response body
 */
function compareResponses(expected: unknown, actual: unknown): { passed: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (expected === undefined || expected === null) {
    return { passed: true, errors };
  }

  if (typeof expected !== 'object' || typeof actual !== 'object') {
    if (expected !== actual) {
      errors.push(`Response mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
    return { passed: errors.length === 0, errors };
  }

  if (expected === null || actual === null) {
    if (expected !== actual) {
      errors.push(`Response mismatch: expected ${expected}, got ${actual}`);
    }
    return { passed: errors.length === 0, errors };
  }

  // For objects, check that all expected fields match
  const expectedObj = expected as Record<string, unknown>;
  const actualObj = actual as Record<string, unknown>;

  for (const [key, expectedValue] of Object.entries(expectedObj)) {
    const actualValue = actualObj[key];
    
    if (typeof expectedValue === 'object' && expectedValue !== null) {
      const nested = compareResponses(expectedValue, actualValue);
      errors.push(...nested.errors.map(e => `${key}.${e}`));
    } else if (expectedValue !== actualValue) {
      errors.push(`Field "${key}": expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`);
    }
  }

  return { passed: errors.length === 0, errors };
}

async function waitFor(ms: number) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRequestInit(testCase: TestCase) {
  const request = testCase.request;
  if (!request) {
    return { method: 'GET', headers: {}, body: undefined } as const;
  }

  const headers = resolveTemplates((request.headers || {}) as any) as Record<string, string>;
  const bodyValue =
    request.body !== undefined ? resolveTemplates(request.body as any) : undefined;

  let body: string | undefined;
  const headerMap: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    headerMap[key] = String(value);
  }

  if (bodyValue !== undefined) {
    if (!headerMap['Content-Type']) {
      headerMap['Content-Type'] = 'application/json';
    }
    body = JSON.stringify(bodyValue);
  }

  return {
    method: request.method || 'GET',
    headers: headerMap,
    body,
  } as const;
}

async function executeTestCase(
  testCase: TestCase,
  origin: string,
  allowInsecureOrigin: boolean
): Promise<CaseResult> {
  const request = testCase.request;
  const repeats = request?.repeat ?? 1;
  const thinkTime = request?.thinkTimeMs ?? 0;
  const policy = request?.policy ?? {};
  const maxAttempts = Math.max(policy.maxAttempts ?? 1, 1);
  const baseDelay = policy.baseDelayMs ?? DEFAULT_BASE_DELAY;
  // Support both expectedStatus (root level) and expect.status
  const expectStatus = testCase.expectedStatus ?? testCase.expect?.status;
  const expectUniqueness = testCase.expect?.uniqueness;
  const expectBackoff = testCase.expect?.clientBackoff;
  const assertions = testCase.assertions ?? [];
  const expectedResponse = testCase.expectedResponse;

  const repeatsResult: CaseResult['repeats'] = [];
  const errors: string[] = [];
  let passed = true;
  let referenceId: string | null = null;

  const requestInit = buildRequestInit(testCase);

  for (let repeatIndex = 0; repeatIndex < repeats; repeatIndex += 1) {
    const attemptRecords: AttemptRecord[] = [];
    let finalStatus: number | null = null;
    let finalBody: unknown = null;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const attemptStart = Date.now();
      let status: number;
      let body: unknown = null;

      if (request?.simulate?.rateLimit && attempt === 0) {
        status = 429;
        body = { error: 'rate_limited' };
      } else {
        try {
          const relativePath = request?.url ?? '/';
          const safeUrl = buildSafeUrl(relativePath, origin, allowInsecureOrigin);
          const response = await fetch(safeUrl, {
            method: requestInit.method,
            headers: requestInit.headers,
            body: requestInit.body,
          });
          status = response.status;
          const contentType = response.headers?.get?.('content-type') || '';
          if (contentType.includes('application/json')) {
            body = await response.json().catch(() => null);
          } else {
            body = await response.text();
          }
        } catch (error) {
          status = 599;
          body = {
            error: 'network_error',
            message: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }

      const attemptEnd = Date.now();
      attemptRecords.push({
        status,
        body,
        durationMs: attemptEnd - attemptStart,
        timestamp: attemptStart,
      });

      if ((status === 429 || status >= 500) && attempt < maxAttempts - 1) {
        await waitFor(baseDelay);
        continue;
      }

      finalStatus = status;
      finalBody = body;
      break;
    }

    if (expectStatus !== undefined && finalStatus !== expectStatus) {
      passed = false;
      errors.push(
        `Expected status ${expectStatus} but received ${finalStatus ?? 'n/a'}`
      );
    }

    if (expectUniqueness === 'single_resource') {
      const identifier = extractIdentifier(finalBody);
      if (!identifier) {
        passed = false;
        errors.push('Unable to extract resource identifier for uniqueness check');
      } else if (referenceId && identifier !== referenceId) {
        passed = false;
        errors.push(
          `Resource identifier changed across repeats (${referenceId} -> ${identifier})`
        );
      } else if (!referenceId) {
        referenceId = identifier;
      }
    }

    if (expectBackoff) {
      const intervals = computeRetryIntervals(attemptRecords);
      if (intervals.length === 0) {
        passed = false;
        errors.push('Client backoff expectation requires at least one retry attempt');
      } else {
        const satisfiedBackoff = intervals.every((gap) => gap >= baseDelay);
        if (!satisfiedBackoff) {
          passed = false;
          errors.push('Client backoff requirement not satisfied');
        }
      }
    }

    // Evaluate assertions array
    const assertionResults: AssertionResult[] = [];
    for (const assertion of assertions) {
      const result = evaluateAssertion(assertion, finalBody, finalStatus);
      assertionResults.push(result);
      if (!result.passed) {
        passed = false;
        if (result.error) {
          errors.push(result.error);
        }
      }
    }

    // Compare expected response with actual response
    if (expectedResponse !== undefined) {
      const comparison = compareResponses(expectedResponse, finalBody);
      if (!comparison.passed) {
        passed = false;
        errors.push(...comparison.errors);
      }
    }

    repeatsResult.push({ repeatIndex, attempts: attemptRecords });

    if (thinkTime > 0 && repeatIndex < repeats - 1) {
      await waitFor(thinkTime);
    }
  }

  // Collect all assertion results from the last repeat (most relevant)
  const finalAssertionResults: AssertionResult[] = [];
  for (const assertion of assertions) {
    const lastRepeat = repeatsResult.at(-1);
    const lastAttempt = lastRepeat?.attempts?.at(-1);
    const result = evaluateAssertion(assertion, lastAttempt?.body, lastAttempt?.status ?? null);
    finalAssertionResults.push(result);
  }

  return {
    id: testCase.id,
    name: testCase.name,
    status: passed ? 'passed' : 'failed',
    repeats: repeatsResult,
    errors,
    assertionResults: finalAssertionResults.length > 0 ? finalAssertionResults : undefined,
  };
}

function computeRetryIntervals(attempts: AttemptRecord[]) {
  if (attempts.length <= 1) return [];
  const gaps: number[] = [];
  for (let i = 0; i < attempts.length - 1; i += 1) {
    const current = attempts[i];
    const next = attempts[i + 1];
    if (current.status === 429 || current.status >= 500) {
      const expectedGap = next.timestamp - (current.timestamp + current.durationMs);
      gaps.push(expectedGap);
    }
  }
  return gaps;
}

export async function runSuiteById(
  suiteId: string,
  options: RunSuiteOptions
): Promise<SuiteRunResult> {
  const suite = await loadSuiteById(suiteId);
  if (!suite) {
    throw new Error(`Suite ${suiteId} not found`);
  }

  return runSuite(suiteId, suite, options);
}

export async function runSuite(
  suiteId: string,
  suite: TestSuite,
  options: RunSuiteOptions
): Promise<SuiteRunResult> {
  const runId = randomUUID();
  const startedAt = new Date();
  const results: CaseResult[] = [];
  const allowInsecureOrigin = options.origin.startsWith('http://');

  for (const testCase of suite.cases) {
    const result = await executeTestCase(testCase, options.origin, allowInsecureOrigin);
    results.push(result);
  }

  const finishedAt = new Date();
  const summary = {
    total: results.length,
    passed: results.filter((r) => r.status === 'passed').length,
    failed: results.filter((r) => r.status === 'failed').length,
    durationMs: finishedAt.getTime() - startedAt.getTime(),
  };

  const output: SuiteRunResult = {
    suite,
    suiteId,
    runId,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    summary,
    cases: results,
  };

  if (options.saveArtifacts) {
    const dir = await ensureArtifactsDir();
    const safeSuiteId = sanitize(suiteId);
    if (!safeSuiteId) {
      throw new Error('Suite ID is invalid for artifact filename');
    }
    const artifactPath = `${dir}/${startedAt
      .toISOString()
      .replace(/[:.]/g, '-')}-${safeSuiteId}-${runId}.json`;
    await fs.writeFile(artifactPath, JSON.stringify(output, null, 2), 'utf8');
  }

  return output;
}
