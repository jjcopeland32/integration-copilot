import { NormalizedSpec, NormalizedEndpoint } from '@integration-copilot/spec-engine';

export interface GoldenTest {
  id: string;
  name: string;
  type: string;
  description: string;
  category: 'auth' | 'core' | 'edge_case' | 'webhook' | 'error';
  request: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: any;
  };
  /** @deprecated Use expect.status instead */
  expectedStatus: number;
  /** Expected response body for comparison */
  expectedResponse?: any;
  /** Standard format for test expectations */
  expect: {
    status: number;
    [key: string]: unknown;
  };
  /** Array of assertions to evaluate against the response */
  assertions: Array<{
    type: string;
    field?: string;
    value?: any;
    condition?: string;
  }>;
}

export class GoldenTestGenerator {
  generate(spec: NormalizedSpec, baseUrl: string): GoldenTest[] {
    const tests: GoldenTest[] = [];

    // 1. Authentication test
    tests.push(this.generateAuthTest(spec, baseUrl));

    // 2. Core endpoint tests
    const coreEndpoints = spec.endpoints.filter(
      (e) => e.method === 'POST' || e.method === 'GET'
    );
    const postEndpoints = spec.endpoints.filter((e) => e.method === 'POST');
    const preferredEndpoint = postEndpoints[0];
    if (preferredEndpoint) {
      tests.push(this.generateCreateTest(preferredEndpoint, baseUrl));
    }

    // 3. Idempotency test
    if (preferredEndpoint) {
      tests.push(this.generateIdempotencyTest(preferredEndpoint, baseUrl));
    }

    // 4. Invalid input test
    if (preferredEndpoint) {
      tests.push(this.generateInvalidInputTest(preferredEndpoint, baseUrl));
    }

    // 5. Webhook signature test
    if (spec.webhooks) {
      tests.push(this.generateWebhookSignatureTest(spec, baseUrl));
    }

    // 6. Rate limit test
    tests.push(this.generateRateLimitTest(spec, baseUrl));

    // 7. Timeout test
    if (coreEndpoints.length > 0) {
      tests.push(this.generateTimeoutTest(coreEndpoints[0], baseUrl));
    }

    // 8. Refund/reversal test (if applicable)
    const deleteEndpoints = spec.endpoints.filter((e) => e.method === 'DELETE');
    if (deleteEndpoints.length > 0) {
      tests.push(this.generateRefundTest(deleteEndpoints[0], baseUrl));
    }

    // 9. Retry test
    if (postEndpoints.length > 0) {
      tests.push(this.generateRetryTest(postEndpoints[0], baseUrl));
    }

    // 10. Invalid currency/parameter test
    if (preferredEndpoint) {
      tests.push(this.generateInvalidParameterTest(preferredEndpoint, baseUrl));
    }

    return tests.slice(0, 10); // Ensure exactly 10 tests
  }

  private generateAuthTest(spec: NormalizedSpec, baseUrl: string): GoldenTest {
    const endpoint = spec.endpoints[0];
    const status = 200;
    return {
      id: 'auth_001',
      name: 'Authentication - Valid Credentials',
      type: 'positive',
      description: 'Verify that valid authentication credentials are accepted',
      category: 'auth',
      request: {
        method: endpoint.method,
        url: endpoint.path,
        headers: {
          Authorization: 'Bearer test_token_valid',
        },
      },
      expectedStatus: status,
      expect: { status },
      assertions: [
        {
          type: 'status',
          condition: 'equals',
          value: status,
        },
      ],
    };
  }

  private generateCreateTest(endpoint: NormalizedEndpoint, baseUrl: string): GoldenTest {
    const status = endpoint.method === 'POST' ? 201 : 200;
    return {
      id: 'core_001',
      name: 'Create Resource - Success',
      type: 'positive',
      description: 'Successfully create a new resource',
      category: 'core',
      request: {
        method: endpoint.method,
        url: endpoint.path,
        headers: {
          'Content-Type': 'application/json',
        },
        body: this.generateSampleBody(endpoint),
      },
      expectedStatus: status,
      expect: { status },
      assertions: [
        {
          type: 'status',
          condition: 'in',
          value: [200, 201],
        },
        {
          type: 'field_exists',
          field: 'id',
        },
      ],
    };
  }

  private generateIdempotencyTest(endpoint: NormalizedEndpoint, baseUrl: string): GoldenTest {
    const status = endpoint.method === 'POST' ? 201 : 200;
    return {
      id: 'edge_001',
      name: 'Idempotency - Duplicate Request',
      type: 'consistency',
      description: 'Verify that duplicate requests with same idempotency key return same result',
      category: 'edge_case',
      request: {
        method: endpoint.method,
        url: endpoint.path,
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'test_idem_key_001',
        },
        body: this.generateSampleBody(endpoint),
      },
      expectedStatus: status,
      expect: { status },
      assertions: [
        {
          type: 'idempotency',
          condition: 'same_response_on_retry',
        },
      ],
    };
  }

  private generateInvalidInputTest(endpoint: NormalizedEndpoint, baseUrl: string): GoldenTest {
    const status = 400;
    return {
      id: 'error_001',
      name: 'Invalid Input - Missing Required Fields',
      type: 'negative',
      description: 'Verify proper error handling for invalid input',
      category: 'error',
      request: {
        method: endpoint.method,
        url: endpoint.path,
        headers: {
          'Content-Type': 'application/json',
          'x-simulate-invalid': 'missing-body',
        },
        body: {},
      },
      expectedStatus: status,
      expect: { status },
      assertions: [
        {
          type: 'status',
          condition: 'equals',
          value: status,
        },
        {
          type: 'field_exists',
          field: 'error',
        },
      ],
    };
  }

  private generateWebhookSignatureTest(spec: NormalizedSpec, baseUrl: string): GoldenTest {
    const status = 200;
    return {
      id: 'webhook_001',
      name: 'Webhook - Signature Verification',
      type: 'positive',
      description: 'Verify webhook signature validation',
      category: 'webhook',
      request: {
        method: 'POST',
        url: '/webhooks/test',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'sha256=test_signature',
        },
        body: { event: 'test.event', data: {} },
      },
      expectedStatus: status,
      expect: { status },
      assertions: [
        {
          type: 'signature_valid',
        },
      ],
    };
  }

  private generateRateLimitTest(spec: NormalizedSpec, baseUrl: string): GoldenTest {
    const endpoint = spec.endpoints[0];
    const status = 429;
    return {
      id: 'edge_002',
      name: 'Rate Limiting - Exceeded',
      type: 'resilience',
      description: 'Verify rate limit enforcement',
      category: 'edge_case',
      request: {
        method: endpoint.method,
        url: endpoint.path,
        headers: {
          'x-simulate-rate-limit': 'exceed',
        },
      },
      expectedStatus: status,
      expect: { status },
      assertions: [
        {
          type: 'rate_limit',
          condition: 'exceeded_after_n_requests',
          value: 100,
        },
      ],
    };
  }

  private generateTimeoutTest(endpoint: NormalizedEndpoint, baseUrl: string): GoldenTest {
    const status = 408;
    return {
      id: 'edge_003',
      name: 'Timeout Handling',
      type: 'resilience',
      description: 'Verify proper timeout handling',
      category: 'edge_case',
      request: {
        method: endpoint.method,
        url: endpoint.path,
        headers: {
          'X-Simulate-Delay': '5000',
        },
      },
      expectedStatus: status,
      expect: { status },
      assertions: [
        {
          type: 'timeout',
          value: 3000,
        },
      ],
    };
  }

  private generateRefundTest(endpoint: NormalizedEndpoint, baseUrl: string): GoldenTest {
    const status = 200;
    return {
      id: 'core_002',
      name: 'Refund/Reversal - Success',
      type: 'positive',
      description: 'Successfully process a refund or reversal',
      category: 'core',
      request: {
        method: endpoint.method,
        url: endpoint.path.replace('{id}', 'test_resource_001'),
      },
      expectedStatus: status,
      expect: { status },
      assertions: [
        {
          type: 'status',
          condition: 'in',
          value: [200, 204],
        },
      ],
    };
  }

  private generateRetryTest(endpoint: NormalizedEndpoint, baseUrl: string): GoldenTest {
    const status = 503;
    return {
      id: 'edge_004',
      name: 'Retry Logic - Transient Failure',
      type: 'resilience',
      description: 'Verify retry behavior on transient failures',
      category: 'edge_case',
      request: {
        method: endpoint.method,
        url: endpoint.path,
        headers: {
          'X-Simulate-Error': '503',
        },
      },
      expectedStatus: status,
      expect: { status },
      assertions: [
        {
          type: 'retry',
          condition: 'success_after_n_retries',
          value: 3,
        },
      ],
    };
  }

  private generateInvalidParameterTest(endpoint: NormalizedEndpoint, baseUrl: string): GoldenTest {
    const status = 400;
    return {
      id: 'error_002',
      name: 'Invalid Parameter - Unsupported Currency',
      type: 'negative',
      description: 'Verify error handling for invalid parameters',
      category: 'error',
      request: {
        method: endpoint.method,
        url: endpoint.path,
        body: {
          currency: 'INVALID',
          amount: 1000,
        },
      },
      expectedStatus: status,
      expect: { status },
      assertions: [
        {
          type: 'status',
          condition: 'equals',
          value: status,
        },
        {
          type: 'error_message',
          condition: 'contains',
          value: 'currency',
        },
      ],
    };
  }

  private generateSampleBody(endpoint: NormalizedEndpoint): any {
    if (!endpoint.requestBody) return undefined;

    const schema = endpoint.requestBody.content['application/json']?.schema;
    if (!schema) return {};

    // Generate sample based on schema
    return {
      amount: 1000,
      currency: 'USD',
      description: 'Test transaction',
    };
  }
}

export function createGoldenTestGenerator(): GoldenTestGenerator {
  return new GoldenTestGenerator();
}
