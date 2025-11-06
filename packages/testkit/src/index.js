import crypto from 'node:crypto';
import { URL } from 'node:url';

/**
 * @typedef {('VENDOR'|'PARTNER')} Actor
 */

/**
 * @typedef {Object} GoldenTestRequest
 * @property {string} [method]
 * @property {string} url
 * @property {Record<string, string>} [headers]
 * @property {*} [body]
 * @property {number} [repeat]
 * @property {Record<string, unknown>} [simulate]
 */

/**
 * @typedef {Object} GoldenTestExpect
 * @property {number} [status]
 */

/**
 * @typedef {Object} GoldenTestCase
 * @property {string} id
 * @property {string} name
 * @property {string} [type]
 * @property {GoldenTestRequest} [request]
 * @property {Record<string, unknown>} [webhook]
 * @property {GoldenTestExpect} [expect]
 */

/**
 * @typedef {Object} GoldenTestSuite
 * @property {string} name
 * @property {string} [version]
 * @property {GoldenTestCase[]} cases
 */

/**
 * @typedef {Object} CaseRunResult
 * @property {string} id
 * @property {string} name
 * @property {'passed'|'failed'|'skipped'} status
 * @property {string} [message]
 * @property {{status: number, body?: unknown}} [response]
 */

/**
 * @typedef {Object} SuiteRunResult
 * @property {string} suiteId
 * @property {string} baseUrl
 * @property {Actor} [actor]
 * @property {string} startedAt
 * @property {string} finishedAt
 * @property {{total: number, passed: number, failed: number, skipped: number}} summary
 * @property {CaseRunResult[]} results
 */

/**
 * @typedef {Object} RunSuiteOptions
 * @property {GoldenTestSuite} suite
 * @property {string} baseUrl
 * @property {Actor} [actor]
 * @property {typeof fetch} [fetchImpl]
 */

function resolveTemplates(value, artifacts) {
  if (typeof value === 'string') {
    if (value === '{{uuid}}') {
      return crypto.randomUUID();
    }
    if (value === '{{timestamp}}') {
      return Date.now();
    }
    const fromMatch = value.match(/^\{\{from:([^}]+)\}\}$/);
    if (fromMatch) {
      const ref = artifacts.get(fromMatch[1]);
      if (ref && typeof ref === 'object' && ref !== null && 'body' in ref) {
        return ref.body?.id ?? ref;
      }
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveTemplates(item, artifacts));
  }

  if (value && typeof value === 'object') {
    const next = {};
    for (const [key, val] of Object.entries(value)) {
      next[key] = resolveTemplates(val, artifacts);
    }
    return next;
  }

  return value;
}

function normaliseHeaders(headers) {
  if (!headers) return {};
  const result = {};
  for (const [key, value] of Object.entries(headers)) {
    result[key] = String(value);
  }
  return result;
}

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type');
  const text = await response.text();
  if (!text) return undefined;
  if (contentType && contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function buildUrl(baseUrl, requestUrl) {
  try {
    return new URL(requestUrl, baseUrl).toString();
  } catch {
    const base = baseUrl.replace(/\/?$/, '');
    const separator = requestUrl.startsWith('/') ? '' : '/';
    return `${base}${separator}${requestUrl}`;
  }
}

/**
 * @param {RunSuiteOptions} options
 * @returns {Promise<SuiteRunResult>}
 */
export async function runSuite(options) {
  const { suite, baseUrl, actor, fetchImpl = fetch } = options;
  const startedAt = new Date();
  /** @type {CaseRunResult[]} */
  const results = [];
  const artifacts = new Map();
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const testCase of suite.cases) {
    if (!testCase.request) {
      results.push({
        id: testCase.id,
        name: testCase.name,
        status: 'skipped',
        message: 'No HTTP request defined for this case in MVP runner',
      });
      skipped += 1;
      continue;
    }

    const repeat = Math.max(1, testCase.request.repeat ?? 1);
    let lastResponse;
    let lastBody;
    let errorMessage;

    for (let attempt = 0; attempt < repeat; attempt += 1) {
      const resolvedRequest = resolveTemplates(testCase.request, artifacts);
      const url = buildUrl(baseUrl, resolvedRequest.url);
      const method = (resolvedRequest.method || 'GET').toUpperCase();
      const headers = normaliseHeaders(resolvedRequest.headers);
      let body;

      if (resolvedRequest.body !== undefined) {
        const resolvedBody = resolveTemplates(resolvedRequest.body, artifacts);
        if (headers['content-type']?.includes('application/json') || typeof resolvedBody === 'object') {
          body = JSON.stringify(resolvedBody);
        } else {
          body = String(resolvedBody);
        }
        if (!headers['content-type']) {
          headers['content-type'] = 'application/json';
        }
      }

      try {
        lastResponse = await fetchImpl(url, {
          method,
          headers,
          body,
        });
        lastBody = await parseResponseBody(lastResponse);
        artifacts.set(testCase.id, { response: lastResponse, body: lastBody });
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Unknown fetch error';
        break;
      }
    }

    if (!lastResponse) {
      failed += 1;
      results.push({
        id: testCase.id,
        name: testCase.name,
        status: 'failed',
        message: errorMessage || 'Request was not executed',
      });
      continue;
    }

    const expectedStatus = testCase.expect?.status;
    const actualStatus = lastResponse.status;

    if (expectedStatus !== undefined && expectedStatus !== actualStatus) {
      failed += 1;
      results.push({
        id: testCase.id,
        name: testCase.name,
        status: 'failed',
        message: `Expected status ${expectedStatus} but received ${actualStatus}` +
          (errorMessage ? ` (${errorMessage})` : ''),
        response: { status: actualStatus, body: lastBody },
      });
      continue;
    }

    passed += 1;
    results.push({
      id: testCase.id,
      name: testCase.name,
      status: 'passed',
      response: { status: actualStatus, body: lastBody },
    });
  }

  const finishedAt = new Date();

  return {
    suiteId: suite.name,
    baseUrl,
    actor,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    summary: {
      total: suite.cases.length,
      passed,
      failed,
      skipped,
    },
    results,
  };
}

export default {
  runSuite,
};
