# Configuration Guide

> How to configure environments, test profiles, and feature flags in Integration Copilot.

---

## Environment Configuration

### Concept

Each project can have multiple **environments** representing different targets for test execution:

| Environment | Purpose | When to Use |
|-------------|---------|-------------|
| **Mock** | Auto-generated Express server | Early exploration, demos, offline testing |
| **Vendor Sandbox** | Vendor's sandbox environment | Partner integration development |
| **Vendor UAT** | Vendor's pre-production environment | Certification testing |

### Why This Matters

Running golden tests against mocks validates that **your mock works correctly**. Running tests against UAT validates that **the partner's integration actually works**.

For go-to-market, you need both:
- Mock environment for onboarding and practice
- UAT environment for real certification

### Configuration (Coming Soon)

```typescript
// Example environment configuration per project
{
  projectId: "proj_123",
  environments: [
    {
      name: "Mock",
      type: "mock",
      baseUrl: "http://localhost:3001", // auto-generated
      credentials: null,
      isDefault: true
    },
    {
      name: "Vendor Sandbox",
      type: "sandbox",
      baseUrl: "https://sandbox.api.vendor.com",
      credentials: {
        type: "bearer",
        tokenUrl: "https://auth.vendor.com/oauth/token",
        clientId: "partner_client_id",
        clientSecret: "***" // encrypted
      },
      isDefault: false
    },
    {
      name: "Vendor UAT",
      type: "uat",
      baseUrl: "https://uat.api.vendor.com",
      credentials: { /* ... */ },
      isDefault: false
    }
  ]
}
```

### Test Execution Flow

```
Partner clicks "Run Tests"
    │
    ▼
Select environment (Mock, Sandbox, or UAT)
    │
    ▼
Test runner loads:
    - Golden test suite
    - Environment config (baseUrl, credentials)
    - Partner parameters (test_account_id, etc.)
    │
    ▼
Execute tests against selected environment
    │
    ▼
Results stored with environment metadata
    │
    ▼
Readiness reports show results per environment
```

---

## Test Profiles

### Concept

Not all APIs need all test categories. A **Test Profile** defines which golden test categories apply to a specific API:

| Category | Payments API | Account Summary API |
|----------|--------------|---------------------|
| Authentication | ✅ Required | ✅ Required |
| Idempotency | ✅ Required | ❌ N/A (read-only) |
| Rate Limiting | ✅ Required | ✅ Required |
| Error Handling | ✅ Required | ✅ Required |
| Webhooks | ✅ Required | ❌ N/A |
| Pagination | ❌ N/A | ✅ Required |
| Filtering | ❌ N/A | ✅ Optional |
| Versioning | ✅ Optional | ✅ Optional |
| CORS | ✅ Required | ✅ Required |
| Security Headers | ✅ Required | ✅ Required |

### Category Status

| Status | Meaning | Report Behavior |
|--------|---------|-----------------|
| **Required** | Must pass for certification | Fail = blocks readiness |
| **Optional** | Nice to have | Fail = warning only |
| **N/A** | Not applicable to this API | Skipped, not shown |

### Auto-Detection

The spec-engine can auto-detect applicable categories based on:

| Spec Signal | Detected Category |
|-------------|-------------------|
| POST/PUT/PATCH methods | Idempotency eligible |
| `Idempotency-Key` header defined | Idempotency required |
| `page`, `limit`, `cursor` params | Pagination applicable |
| `filter`, `search`, `q` params | Filtering applicable |
| Webhook callback URLs in spec | Webhooks applicable |
| API versioning in path/header | Versioning applicable |

### Vendor Override

Vendors can explicitly configure test profiles to override auto-detection:

```typescript
// Example test profile configuration
{
  specId: "spec_payments",
  profile: {
    authentication: { status: "required" },
    idempotency: { status: "required" },
    rate_limiting: { status: "required" },
    error_handling: { status: "required" },
    webhooks: { status: "required" },
    pagination: { status: "na" },
    filtering: { status: "na" },
    versioning: { status: "optional" },
    cors: { status: "required" },
    security_headers: { status: "required" }
  }
}
```

### Report Impact

Readiness reports respect test profiles:

```
Payments API Readiness:
  ✅ Authentication: 5/5 passing
  ✅ Idempotency: 3/3 passing
  ✅ Rate Limiting: 4/4 passing
  ✅ Error Handling: 6/6 passing
  ✅ Webhooks: 4/4 passing
  ⚪ Pagination: N/A
  ⚪ Filtering: N/A
  ⚠️ Versioning: 1/2 passing (optional)
  ✅ CORS: 3/3 passing
  ✅ Security Headers: 4/4 passing

  Overall: 30/32 required tests passing (93.8%)
  Status: READY FOR CERTIFICATION
```

---

## Partner Parameters

### Concept

Some tests need partner-specific data that can't be auto-generated:

| Parameter | Example | Why Needed |
|-----------|---------|------------|
| `test_account_id` | `"acct_12345"` | Tests need a real account in sandbox |
| `test_customer_id` | `"cus_67890"` | Customer operations need existing customer |
| `api_key` | `"sk_test_..."` | Partner's sandbox API key |
| `tenant_id` | `"tenant_abc"` | Multi-tenant APIs |

### Configuration

Partners configure these in their portal:

```typescript
// Partner parameter configuration
{
  partnerProjectId: "pp_123",
  parameters: {
    test_account_id: "acct_12345",
    test_customer_id: "cus_67890",
    api_key: "sk_test_abc123"
  }
}
```

### Usage in Tests

Golden tests use parameterized templates:

```typescript
// Test template (vendor-defined)
{
  name: "Create Payment",
  request: {
    method: "POST",
    path: "/payments",
    body: {
      account_id: "{{test_account_id}}",
      amount: 1000,
      currency: "USD"
    }
  }
}

// At runtime, {{test_account_id}} is replaced with partner's value
```

---

## Feature Flags

### Environment Variables

```bash
# Core Features
FEATURE_MOCK_SERVICE=true          # Enable mock server generation
FEATURE_GOLDEN_TESTS=true          # Enable golden test suites
FEATURE_VALIDATOR=true             # Enable request/response validation
FEATURE_PLAN_BOARD=true            # Enable 5-phase plan board
FEATURE_READINESS_REPORTS=true     # Enable readiness reports

# Integrations
FEATURE_SLACK=false                # Enable Slack notifications
FEATURE_JIRA=false                 # Enable Jira issue creation
FEATURE_AI_ASSISTANT=false         # Enable AI assistant (coming soon)

# Development
FEATURE_DEMO_MODE=true             # Enable demo credentials
FEATURE_SAMPLE_SPECS=true          # Enable "Load Sample Specs" button
```

### Checking Flags in Code

```typescript
// lib/config.ts
export const features = {
  mockService: process.env.FEATURE_MOCK_SERVICE === 'true',
  goldenTests: process.env.FEATURE_GOLDEN_TESTS === 'true',
  validator: process.env.FEATURE_VALIDATOR === 'true',
  planBoard: process.env.FEATURE_PLAN_BOARD === 'true',
  readinessReports: process.env.FEATURE_READINESS_REPORTS === 'true',
  slack: process.env.FEATURE_SLACK === 'true',
  jira: process.env.FEATURE_JIRA === 'true',
  aiAssistant: process.env.FEATURE_AI_ASSISTANT === 'true',
};

// Usage in components
if (features.aiAssistant) {
  // Show AI assistant panel
}
```

---

## Blueprint Annotations (Coming Soon)

### Concept

Vendors can add contextual notes to endpoints that surface to partners at the right moment. This encodes the "tribal knowledge" that currently gets explained over Zoom calls.

### Annotation Types

| Type | Purpose | Example |
|------|---------|---------|
| `auth_nuance` | Authentication edge cases | "High-risk transactions require OAuth v3 elevated scope" |
| `field_requirement` | Conditional field rules | "metadata.order_id is required for marketplace transactions" |
| `common_error` | Known failure patterns | "Error 422 usually means the account isn't fully onboarded" |
| `timing` | Timing/sequencing requirements | "Wait 5 seconds after creating customer before first charge" |
| `testing_tip` | Test setup guidance | "Use test card 4242... for successful payments" |

### Example Annotation

```typescript
{
  endpoint: "POST /payments",
  annotations: [
    {
      id: "ann_1",
      type: "auth_nuance",
      condition: "amount > 10000",
      title: "Elevated Scope Required",
      message: "Transactions over $10,000 require OAuth v3 elevated scope token. Standard OAuth tokens will return 403.",
      link: "https://docs.vendor.com/auth#elevated-scope",
      createdBy: "user_vendor_123",
      createdAt: "2025-11-01T00:00:00Z"
    },
    {
      id: "ann_2",
      type: "common_error",
      condition: "error.code === 'insufficient_funds'",
      title: "Insufficient Funds",
      message: "This error means the test account doesn't have enough balance. Add funds via the sandbox dashboard.",
      link: "https://sandbox.vendor.com/accounts"
    }
  ]
}
```

### Where Annotations Surface

1. **Partner Playground** - Shown when editing requests for that endpoint
2. **AI Assistant** - Included in context when partner asks "why did this fail?"
3. **Test Failure Details** - Shown when a test for that endpoint fails
4. **Blueprint Documentation** - Included in generated docs

---

## Security Configuration

### HMAC Signing

Traces and webhooks use HMAC signatures for verification:

```bash
# Per-project telemetry secret (generated on project creation)
TELEMETRY_SIGNING_SECRET=your-project-specific-secret
```

### PII Redaction

Configure which fields are redacted in traces:

```bash
# Default redaction fields
REDACTION_FIELDS=password,token,secret,ssn,creditCard,api_key,cardNumber,cvv

# Enable/disable redaction
ENABLE_REDACTION=true
```

### Rate Limiting

```bash
# Rate limiting configuration
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

---

## Complete .env Example

```bash
# ===================
# Database
# ===================
DATABASE_URL=postgresql://user:password@localhost:5432/integration_copilot

# ===================
# Authentication
# ===================
AUTH_SECRET=your-secret-key-minimum-32-characters
NEXTAUTH_SECRET=your-secret-key-minimum-32-characters
NEXTAUTH_URL=http://localhost:3000

# Demo credentials (for development)
DEMO_USER_EMAIL=demo@integration.local
DEMO_USER_PASSWORD=demo123

# ===================
# Feature Flags
# ===================
FEATURE_MOCK_SERVICE=true
FEATURE_GOLDEN_TESTS=true
FEATURE_VALIDATOR=true
FEATURE_PLAN_BOARD=true
FEATURE_READINESS_REPORTS=true
FEATURE_SLACK=false
FEATURE_JIRA=false
FEATURE_AI_ASSISTANT=false
FEATURE_DEMO_MODE=true
FEATURE_SAMPLE_SPECS=true

# ===================
# Security
# ===================
ENABLE_REDACTION=true
REDACTION_FIELDS=password,token,secret,ssn,creditCard,api_key
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# ===================
# Integrations (optional)
# ===================
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=PROJ

# ===================
# Mock Server
# ===================
MOCK_HEALTH_INTERVAL_MS=300000
MOCK_HEALTH_TIMEOUT_MS=3000
MOCK_HEALTH_AUTORESTART=true
```

---

*For deployment configuration, see [DEPLOYMENT.md](../DEPLOYMENT.md)*
