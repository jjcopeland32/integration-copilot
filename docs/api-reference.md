# API Reference

> tRPC API contracts and usage examples for Integration Copilot.

---

## Overview

Integration Copilot uses [tRPC](https://trpc.io/) for type-safe API communication. All procedures are org-scoped and require authentication.

### Base URL
```
http://localhost:3000/api/trpc
```

### Authentication
All protected procedures require a valid session. The session includes:
- `userId` - Authenticated user ID
- `orgId` - Active organization ID
- `role` - User's role in the organization

---

## API Contracts

### Spec Router

#### `spec.import`
Import an OpenAPI/AsyncAPI specification.

```typescript
// Input
{
  projectId: string;
  source: 'url' | 'file';
  url?: string;
  fileId?: string;
}

// Output
{
  specId: string;
  kind: 'OPENAPI' | 'ASYNCAPI' | 'JSON_SCHEMA';
  version: string;
}
```

#### `spec.list`
List specs for a project.

```typescript
// Input
{ projectId: string }

// Output
Array<{
  id: string;
  kind: string;
  version: string;
  createdAt: Date;
}>
```

---

### Blueprint Router

#### `blueprint.generate`
Generate a customer-scoped blueprint from a spec.

```typescript
// Input
{
  projectId: string;
  specId: string;
  scope: {
    endpoints?: string[];
    webhooks?: string[];
    rules?: Record<string, any>;
  }
}

// Output
{
  blueprintId: string;
  markdownUrl: string;
  version: string;
}
```

---

### Mock Router

#### `mock.create`
Create and start a mock server.

```typescript
// Input
{
  projectId: string;
  specId: string;
  config?: {
    latencyMs?: number;
    errorRate?: number;
  }
}

// Output
{
  mockId: string;
  baseUrl: string;
  status: 'RUNNING' | 'STOPPED';
}
```

#### `mock.start`
Start an existing mock server.

```typescript
// Input
{ mockId: string }

// Output
{ ok: true; port: number }
```

#### `mock.stop`
Stop a running mock server.

```typescript
// Input
{ mockId: string }

// Output
{ ok: true }
```

#### `mock.health`
Check mock server health.

```typescript
// Input
{ mockId: string }

// Output
{
  healthy: boolean;
  latency?: number;
  error?: string;
}
```

---

### Tests Router

#### `tests.generate`
Generate golden test suites for a spec.

```typescript
// Input
{
  projectId: string;
  specId: string;
  playbook?: 'PAYMENTS_BASELINE' | 'FINANCING_BASELINE' | 'CUSTOM';
}

// Output
{
  suiteId: string;
  cases: Array<{
    id: string;
    name: string;
    category: string;
  }>;
}
```

#### `tests.run`
Execute a test suite.

```typescript
// Input
{
  suiteId: string;
  actor: 'VENDOR' | 'PARTNER';
  env?: string;  // Environment name (Mock, Sandbox, UAT)
}

// Output
{
  runId: string;
  pass: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  results: Array<{
    caseId: string;
    status: 'pass' | 'fail' | 'skip';
    error?: string;
    latencyMs?: number;
  }>;
}
```

#### `tests.list`
List test suites for a project.

```typescript
// Input
{ projectId: string }

// Output
Array<{
  id: string;
  name: string;
  version: string;
  caseCount: number;
  lastRun?: {
    id: string;
    pass: boolean;
    createdAt: Date;
  };
}>
```

---

### Trace Router

#### `trace.ingest`
Ingest a signed trace payload.

```typescript
// Input (requires HMAC signature in header)
{
  projectId: string;
  requestMeta: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: any;
    timestamp: string;
  };
  responseMeta: {
    statusCode: number;
    headers?: Record<string, string>;
    body?: any;
    timestamp: string;
    latencyMs: number;
  };
  verdict: 'pass' | 'fail' | 'warn';
}

// Output
{ ok: true; traceId: string }
```

#### `trace.list`
List traces for a project.

```typescript
// Input
{
  projectId: string;
  limit?: number;
  cursor?: string;
}

// Output
{
  traces: Array<{
    id: string;
    verdict: string;
    requestMeta: object;
    responseMeta: object;
    createdAt: Date;
  }>;
  nextCursor?: string;
}
```

---

### Plan Router

#### `plan.initialize`
Initialize the 5-phase plan board for a project.

```typescript
// Input
{ projectId: string }

// Output
{
  ok: true;
  phases: ['auth', 'core', 'webhooks', 'uat', 'cert'];
}
```

#### `plan.update`
Update a plan item.

```typescript
// Input
{
  itemId: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
  ownerId?: string;
  dueAt?: Date;
}

// Output
{ ok: true }
```

#### `plan.evidence`
Add evidence to a plan item.

```typescript
// Input
{
  itemId: string;
  evidence: {
    type: 'screenshot' | 'log' | 'doc' | 'note';
    url?: string;
    content?: string;
    metadata?: Record<string, any>;
  }
}

// Output
{ ok: true; evidenceId: string }
```

#### `plan.progress`
Get project progress.

```typescript
// Input
{ projectId: string }

// Output
{
  overall: {
    percentComplete: number;
    done: number;
    total: number;
  };
  phases: Array<{
    phase: string;
    percentComplete: number;
    done: number;
    inProgress: number;
    blocked: number;
    total: number;
  }>;
}
```

---

### Report Router

#### `report.generate`
Generate a readiness report.

```typescript
// Input
{
  projectId: string;
  kind: 'READINESS' | 'MIGRATION' | 'AUDIT';
}

// Output
{
  reportId: string;
  url: string;
  readyForProduction: boolean;
  metrics: {
    testPassRate: number;
    errorRate: number;
    averageLatencyMs: number;
    phaseCompletion: Record<string, number>;
  };
  risks: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    description: string;
  }>;
}
```

#### `report.sign`
Sign a report with e-signature.

```typescript
// Input
{
  reportId: string;
  signerEmail: string;
}

// Output
{ ok: true; signedAt: Date }
```

---

## Usage Examples

### Complete Integration Flow

```typescript
import { PrismaClient } from '@prisma/client';
import { createSpecEngine } from '@integration-copilot/spec-engine';
import { createMockGenerator, createMockServer, createGoldenTestGenerator } from '@integration-copilot/mockgen';
import { createOrchestrator, createPlanBoardManager, createReportGenerator } from '@integration-copilot/orchestrator';

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

  // 3. Generate customer-scoped blueprint
  const blueprint = specEngine.generateBlueprint(spec, {
    customerScope: {
      includedEndpoints: ['createPaymentIntent', 'retrievePaymentIntent'],
    },
    webhooks: {
      enabled: true,
      endpoints: ['payment_intent.succeeded'],
    },
  });

  // 4. Generate and start mock service
  const mockGen = createMockGenerator();
  const { routes, postmanCollection } = mockGen.generate(spec, {
    baseUrl: 'http://localhost:3001',
    enableLatency: true,
    latencyMs: 100,
  });

  const mockServer = createMockServer({
    baseUrl: 'http://localhost:3001',
    enableLatency: true,
  });
  mockServer.registerRoutes(routes);
  await mockServer.listen(3001);

  // 5. Generate golden tests
  const testGen = createGoldenTestGenerator();
  const goldenTests = testGen.generate(spec, 'http://localhost:3001');

  // 6. Initialize plan board
  const planBoard = createPlanBoardManager(prisma);
  await planBoard.initializeProjectPlan(project.id);

  // 7. Generate readiness report
  const reportGen = createReportGenerator(prisma);
  const report = await reportGen.generateReadinessReport(project.id);

  console.log('Partner onboarding complete!');
  console.log(`Ready for production: ${report.readyForProduction}`);
}
```

### Spec Engine

```typescript
import { createSpecEngine } from '@integration-copilot/spec-engine';

const engine = createSpecEngine();

// Import from URL
const spec = await engine.importFromURL('https://api.example.com/openapi.json');

// Import from object
const spec = await engine.importFromObject({
  openapi: '3.0.0',
  info: { title: 'My API', version: '1.0.0' },
  paths: { /* ... */ },
});

// Generate blueprint with scoping
const blueprint = engine.generateBlueprint(spec, {
  customerScope: {
    includedEndpoints: ['createUser', 'getUser'],
    excludedEndpoints: ['adminEndpoint'],
  },
  auth: {
    type: 'bearer',
    instructions: 'Use your API key as a Bearer token',
  },
});

console.log(blueprint.markdown);
```

### Mock Service

```typescript
import { createMockGenerator, createMockServer } from '@integration-copilot/mockgen';

const generator = createMockGenerator();
const { routes, postmanCollection } = generator.generate(spec, {
  baseUrl: 'http://localhost:3001',
  enableLatency: true,
  latencyMs: 200,
  enableRateLimit: true,
  rateLimit: 50,
});

const server = createMockServer({
  baseUrl: 'http://localhost:3001',
  enableLatency: true,
  latencyMs: 200,
});

server.registerRoutes(routes);
await server.listen(3001);

console.log('Mock server running on http://localhost:3001');
```

### Validator

```typescript
import { createValidator } from '@integration-copilot/validator';

const validator = createValidator();

const schema = {
  type: 'object',
  required: ['amount', 'currency'],
  properties: {
    amount: { type: 'number', minimum: 1 },
    currency: { type: 'string', enum: ['USD', 'EUR', 'GBP'] },
  },
};

const result = validator.validateRequest(
  { amount: 1000, currency: 'USD' },
  schema
);

if (!result.valid) {
  for (const error of result.errors) {
    console.log(validator.generateHumanReadableError(error));
  }
}
```

### Plan Board

```typescript
import { createPlanBoardManager } from '@integration-copilot/orchestrator';

const planBoard = createPlanBoardManager(prisma);

// Initialize
await planBoard.initializeProjectPlan('proj_123');

// Get board
const board = await planBoard.getPlanBoard('proj_123');

// Update item
await planBoard.updatePlanItem(itemId, {
  status: 'DONE',
});

// Upload evidence
await planBoard.uploadEvidence(itemId, {
  type: 'screenshot',
  url: 'https://s3.amazonaws.com/evidence/auth-test.png',
  metadata: { testName: 'Authentication Test' },
});

// Get progress
const progress = await planBoard.getProjectProgress('proj_123');
console.log(`Overall: ${progress.overall.percentComplete}% complete`);
```

### Readiness Reports

```typescript
import { createReportGenerator } from '@integration-copilot/orchestrator';

const reportGen = createReportGenerator(prisma);

// Generate report
const report = await reportGen.generateReadinessReport('proj_123');

console.log(`Ready for production: ${report.readyForProduction}`);
console.log(`Test pass rate: ${report.metrics.testPassRate}%`);
console.log(`Risks: ${report.risks.length}`);

// Export as markdown
const markdown = reportGen.generateMarkdown(report);

// Sign report
await reportGen.signReport(reportId, 'approver@example.com');
```

### Slack Notifications

```typescript
import { createSlackConnector } from '@integration-copilot/connectors';

const slack = createSlackConnector({
  webhookUrl: process.env.SLACK_WEBHOOK_URL,
  channel: '#integrations',
});

// Test failure notification
await slack.notifyTestFailure(
  'Stripe Integration',
  'Idempotency Test',
  'Duplicate idempotency key returned different response'
);

// Phase completion
await slack.notifyPhaseComplete('Stripe Integration', 'auth', 100);

// Readiness report
await slack.notifyReadinessReport('Stripe Integration', true, reportUrl);
```

### Jira Integration

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
  'Stripe Integration',
  'Idempotency Test',
  'Duplicate idempotency key returned different response',
  'https://app.example.com/traces/trace_123'
);

// Add comment
await jira.addComment(issueKey, 'Fixed in commit abc123');
```

---

## HMAC Trace Ingest

For external systems to send traces, use HMAC signing:

```bash
export PROJECT_ID=<project-id>
export TELEMETRY_SECRET=<secret-from-project-telemetry-tab>

PAYLOAD='{"projectId":"'"$PROJECT_ID"'","requestMeta":{"method":"POST","path":"/payments"},"responseMeta":{"status":200},"verdict":"pass"}'

SIG=$(node -e "const crypto=require('crypto');const [payload, secret]=process.argv.slice(2);process.stdout.write(crypto.createHmac('sha256', secret).update(payload).digest('hex'));" "$PAYLOAD" "$TELEMETRY_SECRET")

curl -sS -X POST http://localhost:3000/api/trace \
  -H 'content-type: application/json' \
  -H "x-trace-signature: $SIG" \
  -d "$PAYLOAD"
```

---

*For more examples, see the test files in each package's `src/` directory.*
