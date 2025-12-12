# Integration Copilot - Usage Examples

## Table of Contents

1. [Complete Integration Flow](#complete-integration-flow)
2. [Spec Engine Examples](#spec-engine-examples)
3. [Mock Service Examples](#mock-service-examples)
4. [Validator Examples](#validator-examples)
5. [Plan Board Examples](#plan-board-examples)
6. [Readiness Report Examples](#readiness-report-examples)
7. [Integration Examples](#integration-examples)

## Complete Integration Flow

### End-to-End Example

```typescript
import { PrismaClient } from '@prisma/client';
import { createSpecEngine } from '@integration-copilot/spec-engine';
import { createMockGenerator, createMockServer, createGoldenTestGenerator } from '@integration-copilot/mockgen';
import { createOrchestrator, createPlanBoardManager, createReportGenerator } from '@integration-copilot/orchestrator';
import { createSlackConnector } from '@integration-copilot/connectors';

const prisma = new PrismaClient();

async function onboardPartner() {
  // 1. Create organization and project
  const orchestrator = createOrchestrator(prisma);
  
  const org = await orchestrator.createOrganization({
    name: 'Acme Payments',
    ownerUserId: 'user_vendor_123',
  });

  const project = await orchestrator.createProject({
    orgId: org.id,
    name: 'Stripe Payment Integration',
    userId: 'user_vendor_123',
  });

  // 2. Import and process spec
  const specEngine = createSpecEngine();
  const spec = await specEngine.importFromURL(
    'https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json'
  );

  // Save spec to database
  await prisma.spec.create({
    data: {
      projectId: project.id,
      kind: 'OPENAPI',
      version: spec.version,
      rawUrl: 'https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json',
      normalized: spec as any,
    },
  });

  // 3. Generate customer-scoped blueprint
  const blueprint = specEngine.generateBlueprint(spec, {
    customerScope: {
      includedEndpoints: [
        'createPaymentIntent',
        'retrievePaymentIntent',
        'confirmPaymentIntent',
        'createRefund',
      ],
    },
    webhooks: {
      enabled: true,
      endpoints: ['payment_intent.succeeded', 'payment_intent.payment_failed'],
    },
  });

  // Save blueprint
  await prisma.blueprint.create({
    data: {
      projectId: project.id,
      specId: (await prisma.spec.findFirst({ where: { projectId: project.id } }))!.id,
      version: blueprint.version,
      customerScope: blueprint.config as any,
      markdownUrl: '/blueprints/stripe-payment.md',
    },
  });

  console.log('Blueprint generated:', blueprint.markdown);

  // 4. Generate and start mock service
  const mockGen = createMockGenerator();
  const { routes, postmanCollection } = mockGen.generate(spec, {
    baseUrl: 'http://localhost:3001',
    enableLatency: true,
    latencyMs: 100,
    enableRateLimit: true,
    rateLimit: 100,
  });

  const mockServer = createMockServer({
    baseUrl: 'http://localhost:3001',
    enableLatency: true,
    latencyMs: 100,
  });
  mockServer.registerRoutes(routes);
  await mockServer.listen(3001);

  // Save mock instance
  await prisma.mockInstance.create({
    data: {
      projectId: project.id,
      baseUrl: 'http://localhost:3001',
      config: { latencyMs: 100, rateLimit: 100 } as any,
      status: 'RUNNING',
    },
  });

  // Export Postman collection
  console.log('Postman collection:', JSON.stringify(postmanCollection, null, 2));

  // 5. Generate golden tests
  const testGen = createGoldenTestGenerator();
  const goldenTests = testGen.generate(spec, 'http://localhost:3001');

  // Save test suite
  await prisma.testSuite.create({
    data: {
      projectId: project.id,
      name: 'Golden Test Suite',
      version: '1.0',
      cases: goldenTests as any,
    },
  });

  console.log(`Generated ${goldenTests.length} golden tests`);

  // 6. Initialize plan board
  const planBoard = createPlanBoardManager(prisma);
  await planBoard.initializeProjectPlan(project.id);

  const board = await planBoard.getPlanBoard(project.id);
  console.log('Plan board initialized with phases:', Object.keys(board));

  // 7. Simulate partner progress
  // Mark auth phase items as done
  const authItems = await prisma.planItem.findMany({
    where: { projectId: project.id, phase: 'auth' },
  });

  for (const item of authItems) {
    await planBoard.updatePlanItem(item.id, { status: 'DONE' });
  }

  // Upload evidence
  await planBoard.uploadEvidence(authItems[0].id, {
    type: 'screenshot',
    url: 'https://example.com/auth-test-screenshot.png',
    metadata: { testName: 'Authentication Test' },
  });

  // 8. Generate readiness report
  const reportGen = createReportGenerator(prisma);
  const report = await reportGen.generateReadinessReport(project.id);

  console.log('Readiness Report:');
  console.log(`- Ready for production: ${report.readyForProduction}`);
  console.log(`- Test pass rate: ${report.metrics.testPassRate}%`);
  console.log(`- Risks: ${report.risks.length}`);

  const reportMarkdown = reportGen.generateMarkdown(report);
  console.log(reportMarkdown);

  // Save report
  await reportGen.saveReport(project.id, report, '/reports/stripe-readiness.pdf');

  // 9. Send Slack notification
  if (process.env.SLACK_WEBHOOK_URL) {
    const slack = createSlackConnector({
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
    });

    await slack.notifyReadinessReport(
      'Stripe Payment Integration',
      report.readyForProduction,
      'https://app.example.com/reports/stripe-readiness'
    );
  }

  console.log('✅ Partner onboarding complete!');
}

onboardPartner().catch(console.error);
```

## Spec Engine Examples

### Import from URL

```typescript
import { createSpecEngine } from '@integration-copilot/spec-engine';

const engine = createSpecEngine();

// Import Stripe API
const stripeSpec = await engine.importFromURL(
  'https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json'
);

console.log(`Imported: ${stripeSpec.title} v${stripeSpec.version}`);
console.log(`Endpoints: ${stripeSpec.endpoints.length}`);
console.log(`Webhooks: ${Object.keys(stripeSpec.webhooks || {}).length}`);
```

### Import from Object

```typescript
const customSpec = {
  openapi: '3.0.0',
  info: {
    title: 'My API',
    version: '1.0.0',
  },
  paths: {
    '/users': {
      get: {
        summary: 'List users',
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const spec = await engine.importFromObject(customSpec);
```

### Generate Blueprint with Scoping

```typescript
const blueprint = engine.generateBlueprint(spec, {
  customerScope: {
    // Only include specific endpoints
    includedEndpoints: ['createUser', 'getUser', 'updateUser'],
    
    // Or exclude specific endpoints
    excludedEndpoints: ['deleteUser', 'adminEndpoint'],
    
    // Scope specific fields
    includedFields: {
      User: ['id', 'name', 'email'], // Only these fields
    },
  },
  auth: {
    type: 'bearer',
    instructions: 'Use your API key as a Bearer token',
  },
  webhooks: {
    enabled: true,
    endpoints: ['user.created', 'user.updated'],
  },
});

// Export blueprint as Markdown
console.log(blueprint.markdown);

// Access structured data
console.log('Endpoints:', blueprint.endpoints.map(e => `${e.method} ${e.path}`));
console.log('Auth:', blueprint.auth);
console.log('Webhooks:', blueprint.webhooks.map(w => w.event));
console.log('Rules:', blueprint.rules.map(r => r.type));
```

## Mock Service Examples

### Basic Mock Server

```typescript
import { createMockGenerator, createMockServer } from '@integration-copilot/mockgen';

const generator = createMockGenerator();
const { routes } = generator.generate(spec, {
  baseUrl: 'http://localhost:3001',
});

const server = createMockServer({
  baseUrl: 'http://localhost:3001',
});

server.registerRoutes(routes);
await server.listen(3001);

console.log('Mock server running on http://localhost:3001');
```

### Mock with Latency and Rate Limiting

```typescript
const { routes } = generator.generate(spec, {
  baseUrl: 'http://localhost:3001',
  enableLatency: true,
  latencyMs: 200, // 200ms delay
  enableRateLimit: true,
  rateLimit: 50, // 50 requests per minute
});

const server = createMockServer({
  baseUrl: 'http://localhost:3001',
  enableLatency: true,
  latencyMs: 200,
  enableRateLimit: true,
  rateLimit: 50,
});

server.registerRoutes(routes);
await server.listen(3001);
```

### Export Postman Collection

```typescript
const { postmanCollection } = generator.generate(spec, {
  baseUrl: 'http://localhost:3001',
});

// Save to file
import fs from 'fs';
fs.writeFileSync(
  'stripe-mock-collection.json',
  JSON.stringify(postmanCollection, null, 2)
);

console.log('Postman collection exported!');
// Import this file into Postman to test the mock
```

### Generate Golden Tests

```typescript
import { createGoldenTestGenerator } from '@integration-copilot/mockgen';

const testGen = createGoldenTestGenerator();
const tests = testGen.generate(spec, 'http://localhost:3001');

console.log(`Generated ${tests.length} tests:`);
for (const test of tests) {
  console.log(`- [${test.category}] ${test.name}`);
}

// Run tests (example with axios)
import axios from 'axios';

for (const test of tests) {
  try {
    const response = await axios({
      method: test.request.method,
      url: `http://localhost:3001${test.request.path}`,
      headers: test.request.headers,
      data: test.request.body,
    });
    
    console.log(`✅ ${test.name}: ${response.status}`);
  } catch (error) {
    console.log(`❌ ${test.name}: ${error.message}`);
  }
}
```

## Validator Examples

### Request Validation

```typescript
import { createValidator } from '@integration-copilot/validator';

const validator = createValidator();

const requestSchema = {
  type: 'object',
  required: ['amount', 'currency'],
  properties: {
    amount: {
      type: 'number',
      minimum: 1,
    },
    currency: {
      type: 'string',
      enum: ['USD', 'EUR', 'GBP'],
    },
    description: {
      type: 'string',
    },
  },
};

const requestBody = {
  amount: 1000,
  currency: 'USD',
  description: 'Payment for order #123',
};

const result = validator.validateRequest(requestBody, requestSchema);

if (result.valid) {
  console.log('✅ Request is valid');
} else {
  console.log('❌ Validation errors:');
  for (const error of result.errors) {
    console.log(validator.generateHumanReadableError(error));
  }
}
```

### Response Validation

```typescript
const responseSchema = {
  type: 'object',
  required: ['id', 'status'],
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
    },
    status: {
      type: 'string',
      enum: ['pending', 'succeeded', 'failed'],
    },
    amount: {
      type: 'number',
    },
  },
};

const responseBody = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  status: 'succeeded',
  amount: 1000,
};

const result = validator.validateResponse(responseBody, responseSchema, 200);
```

### Trace Management

```typescript
import { createTraceManager } from '@integration-copilot/validator';

// In-memory storage (for demo)
const traces = new Map();
const storage = {
  async save(trace) {
    const id = `trace_${Date.now()}`;
    traces.set(id, trace);
    return id;
  },
  async get(id) {
    return traces.get(id) || null;
  },
  async list(projectId, limit = 50) {
    return Array.from(traces.values())
      .filter(t => t.projectId === projectId)
      .slice(0, limit);
  },
};

const traceManager = createTraceManager(storage, {
  enabled: true,
  fields: ['password', 'token', 'ssn'],
  patterns: [/credit.*card/i, /api.*key/i],
});

// Save trace
const traceId = await traceManager.saveTrace({
  projectId: 'proj_123',
  requestMeta: {
    method: 'POST',
    path: '/payments',
    headers: { 'content-type': 'application/json' },
    body: { amount: 1000, currency: 'USD' },
    timestamp: new Date().toISOString(),
  },
  responseMeta: {
    statusCode: 200,
    headers: {},
    body: { id: 'pay_123', status: 'succeeded' },
    timestamp: new Date().toISOString(),
    latencyMs: 150,
  },
  verdict: 'pass',
  validation: { valid: true, errors: [], warnings: [] },
});

// Retrieve trace
const trace = await traceManager.getTrace(traceId);
console.log(traceManager.generateHumanReadableDiff(trace));
```

## Plan Board Examples

### Initialize Project Plan

```typescript
import { createPlanBoardManager } from '@integration-copilot/orchestrator';

const planBoard = createPlanBoardManager(prisma);

// Initialize with default 5 phases
await planBoard.initializeProjectPlan('proj_123');

// Get board
const board = await planBoard.getPlanBoard('proj_123');

for (const [phaseName, phase] of Object.entries(board)) {
  console.log(`\n${phase.title}:`);
  for (const item of phase.items) {
    console.log(`  - [${item.status}] ${item.title}`);
  }
}
```

### Update Plan Items

```typescript
// Get all auth phase items
const authItems = await prisma.planItem.findMany({
  where: { projectId: 'proj_123', phase: 'auth' },
});

// Mark first item as in progress
await planBoard.updatePlanItem(authItems[0].id, {
  status: 'IN_PROGRESS',
  ownerId: 'user_partner_456',
  dueAt: new Date('2025-11-10'),
});

// Mark as done
await planBoard.updatePlanItem(authItems[0].id, {
  status: 'DONE',
});
```

### Upload Evidence

```typescript
// Upload screenshot
await planBoard.uploadEvidence(itemId, {
  type: 'screenshot',
  url: 'https://s3.amazonaws.com/evidence/auth-test.png',
  metadata: {
    testName: 'Authentication Test',
    timestamp: new Date().toISOString(),
  },
});

// Upload log file
await planBoard.uploadEvidence(itemId, {
  type: 'log',
  url: 'https://s3.amazonaws.com/evidence/test-run.log',
  content: 'Test run completed successfully...',
});

// Add note
await planBoard.uploadEvidence(itemId, {
  type: 'note',
  content: 'Completed authentication setup. All tests passing.',
});
```

### Track Progress

```typescript
// Phase progress
const authProgress = await planBoard.getPhaseProgress('proj_123', 'auth');
console.log(`Auth phase: ${authProgress.percentComplete}% complete`);
console.log(`- Done: ${authProgress.done}/${authProgress.total}`);
console.log(`- In Progress: ${authProgress.inProgress}`);
console.log(`- Blocked: ${authProgress.blocked}`);

// Overall project progress
const progress = await planBoard.getProjectProgress('proj_123');
console.log(`\nOverall: ${progress.overall.percentComplete}% complete`);

for (const phase of progress.phases) {
  console.log(`- ${phase.phase}: ${phase.percentComplete}%`);
}
```

## Readiness Report Examples

### Generate Report

```typescript
import { createReportGenerator } from '@integration-copilot/orchestrator';

const reportGen = createReportGenerator(prisma);
const report = await reportGen.generateReadinessReport('proj_123');

console.log('Readiness Report Summary:');
console.log(`- Ready for Production: ${report.readyForProduction ? 'YES' : 'NO'}`);
console.log(`- Test Pass Rate: ${report.metrics.testPassRate}%`);
console.log(`- Error Rate: ${report.metrics.errorRate}%`);
console.log(`- Avg Latency: ${report.metrics.averageLatencyMs}ms`);
console.log(`\nPhase Completion:`);
for (const [phase, completion] of Object.entries(report.metrics.phaseCompletion)) {
  console.log(`- ${phase}: ${completion}%`);
}

console.log(`\nRisks (${report.risks.length}):`);
for (const risk of report.risks) {
  console.log(`- [${risk.severity.toUpperCase()}] ${risk.category}: ${risk.description}`);
}

console.log(`\nRecommendations:`);
for (const rec of report.recommendations) {
  console.log(`- ${rec}`);
}
```

### Export as Markdown

```typescript
const markdown = reportGen.generateMarkdown(report);

// Save to file
import fs from 'fs';
fs.writeFileSync('readiness-report.md', markdown);

console.log('Report saved to readiness-report.md');
```

### Sign Report

```typescript
// Save report first
const savedReport = await reportGen.saveReport('proj_123', report, '/reports/readiness.pdf');

// Sign it
await reportGen.signReport(savedReport.id, 'john.doe@example.com');

console.log('Report signed!');
```

## Integration Examples

### Slack Notifications

```typescript
import { createSlackConnector } from '@integration-copilot/connectors';

const slack = createSlackConnector({
  webhookUrl: process.env.SLACK_WEBHOOK_URL,
  channel: '#integrations',
  username: 'Integration Copilot',
});

// Test failure notification
await slack.notifyTestFailure(
  'Stripe Payment Integration',
  'Idempotency Test',
  'Duplicate idempotency key returned different response'
);

// Phase completion
await slack.notifyPhaseComplete(
  'Stripe Payment Integration',
  'auth',
  100
);

// Readiness report
await slack.notifyReadinessReport(
  'Stripe Payment Integration',
  true,
  'https://app.example.com/reports/stripe-readiness.pdf'
);
```

### Jira Issue Creation

```typescript
import { createJiraConnector } from '@integration-copilot/connectors';

const jira = createJiraConnector({
  baseUrl: process.env.JIRA_BASE_URL,
  email: process.env.JIRA_EMAIL,
  apiToken: process.env.JIRA_API_TOKEN,
  projectKey: 'INTEG',
});

// Create issue from test failure
const issueKey = await jira.createIssueFromTestFailure(
  'Stripe Payment Integration',
  'Idempotency Test',
  'Duplicate idempotency key returned different response',
  'https://app.example.com/traces/trace_123'
);

console.log(`Created Jira issue: ${issueKey}`);

// Create issue from validation error
const validationIssue = await jira.createIssueFromValidationError(
  'Stripe Payment Integration',
  'POST /payment_intents',
  [
    'Field "amount" is required but missing',
    'Field "currency" has invalid value "INVALID"',
  ],
  'https://app.example.com/traces/trace_456'
);

// Add comment
await jira.addComment(issueKey, 'Fixed in commit abc123');
```

---

For more examples, see the test files in each package's `src/` directory.
