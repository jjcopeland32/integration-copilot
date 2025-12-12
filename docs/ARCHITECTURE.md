# Integration Copilot - Architecture

> Technical reference for the Integration Copilot codebase. For getting started, see [README.md](./README.md).

---

## System Overview

Integration Copilot is a monorepo containing:
- **5 core packages** (backend logic)
- **1 web application** (Next.js 15)
- **Prisma schema** (14 models)

```
integration-copilot/
├── apps/
│   └── web/                     # Next.js 15 application
├── packages/
│   ├── spec-engine/             # OpenAPI/AsyncAPI processing
│   ├── mockgen/                 # Mock server + test generation
│   ├── validator/               # Request/response validation
│   ├── orchestrator/            # RBAC, plan board, reports
│   ├── testkit/                 # Test runner and assertions
│   └── connectors/              # Slack & Jira integrations
├── prisma/
│   └── schema.prisma            # Database schema
└── tools/                       # Seed scripts, golden test samples
```

---

## Core Packages

### 1. Spec Engine (`packages/spec-engine`)

**Purpose:** Import and normalize OpenAPI/AsyncAPI specs, generate customer-scoped blueprints.

**Key Files:**
```
src/
├── types.ts          # Type definitions for normalized specs
├── normalizer.ts     # OpenAPI normalization logic
├── blueprint.ts      # Blueprint generation with customer scoping
└── index.ts          # Main API exports
```

**Capabilities:**
- Import specs from URL or object
- Normalize to internal model
- Generate customer-scoped blueprints
- Export as Markdown + JSON
- Auth instructions generation
- Webhook configuration

**Usage:**
```typescript
import { createSpecEngine } from '@integration-copilot/spec-engine';

const engine = createSpecEngine();
const spec = await engine.importFromURL('https://api.example.com/openapi.json');
const blueprint = engine.generateBlueprint(spec, {
  customerScope: {
    includedEndpoints: ['createPayment', 'getPayment'],
  },
});
```

---

### 2. Mock Generator (`packages/mockgen`)

**Purpose:** Generate deterministic mocks with example payloads, create golden test suites.

**Key Files:**
```
src/
├── generator.ts      # Mock route and Postman collection generation
├── server.ts         # Express-based mock server
├── golden-tests.ts   # 10 baseline test generator
└── index.ts          # Package exports
```

**Capabilities:**
- Deterministic mock responses from schemas
- Latency simulation
- Rate limiting
- Idempotency key support
- Postman collection export
- 10 Golden Test categories (38 tests total)

**Usage:**
```typescript
import { createMockGenerator, createMockServer } from '@integration-copilot/mockgen';

const generator = createMockGenerator();
const { routes, postmanCollection } = generator.generate(spec, {
  baseUrl: 'http://localhost:3001',
  enableLatency: true,
  latencyMs: 100,
});

const server = createMockServer({ baseUrl: 'http://localhost:3001' });
server.registerRoutes(routes);
await server.listen(3001);
```

---

### 3. Validator (`packages/validator`)

**Purpose:** Validate requests/responses against schemas, emit signed traces with human-readable errors.

**Key Files:**
```
src/
├── validator.ts              # Schema validation logic
├── trace.ts                  # Trace storage and redaction
├── security.ts               # HMAC signatures, rate limiting
├── middleware/
│   ├── express.ts            # Express middleware
│   └── next-api.ts           # Next.js middleware
└── index.ts                  # Package exports
```

**Capabilities:**
- Request/response validation against OpenAPI schemas
- Human-readable error messages with spec links
- PII redaction (configurable fields)
- HMAC signature verification
- Rate limiting (100 req/min default)

**Usage:**
```typescript
import { createValidator, createTraceManager } from '@integration-copilot/validator';

const validator = createValidator();
const result = validator.validateRequest(requestBody, schema);

if (!result.valid) {
  for (const error of result.errors) {
    console.log(validator.generateHumanReadableError(error));
  }
}
```

---

### 4. Orchestrator (`packages/orchestrator`)

**Purpose:** RBAC, project management, plan board, readiness reports.

**Key Files:**
```
src/
├── index.ts          # Organization and project management
├── rbac.ts           # Role-based access control
├── plan-board.ts     # 5-phase plan board management
└── reports.ts        # Readiness report generation
```

**Capabilities:**

**RBAC:**
- Roles: OWNER, ADMIN, VENDOR, PARTNER, VIEWER
- Server-side permission checks
- Role-based project access

**Plan Board:**
- 5 phases: Auth → Core → Webhooks → UAT → Cert
- Exit criteria tracking
- Evidence uploads (immutable audit log)
- Progress tracking per phase

**Readiness Reports:**
- Test pass rate calculation
- Error rate analysis
- Performance metrics
- Risk identification
- Markdown export
- E-signature support

---

### 5. Connectors (`packages/connectors`)

**Purpose:** Slack and Jira integrations for alerts and issue tracking.

**Capabilities:**

**Slack:**
- Test failure notifications
- Phase completion alerts
- Readiness report notifications

**Jira:**
- Auto-create issues from test failures
- Auto-create issues from validation errors
- Issue updates and comments

---

## Web Application

### Route Structure

```
apps/web/app/
├── (auth)/                          # Authentication (no sidebar)
│   └── login/page.tsx
├── (portal)/                        # Client portal (protected)
│   ├── layout.tsx                   # Sidebar navigation
│   └── projects/
│       ├── page.tsx                 # Projects list
│       └── [id]/
│           ├── layout.tsx           # Tabbed navigation
│           ├── page.tsx             # Overview
│           ├── specs/page.tsx       # Specifications
│           ├── mocks/page.tsx       # Mock services
│           ├── tests/page.tsx       # Test suites
│           ├── traces/page.tsx      # Request traces
│           ├── plan/page.tsx        # Plan board
│           └── reports/
│               ├── page.tsx         # Reports list
│               └── [reportId]/page.tsx
└── partner/                         # Partner portal
    ├── layout.tsx                   # Crystal Ice theme
    ├── login/page.tsx
    └── ...
```

### URL Patterns

| Route | Purpose |
|-------|---------|
| `/login` | Client authentication |
| `/projects` | Projects list (landing page) |
| `/projects/[id]` | Project overview with tabs |
| `/projects/[id]/specs` | API specifications |
| `/projects/[id]/mocks` | Mock services |
| `/projects/[id]/tests` | Test suites |
| `/projects/[id]/traces` | Request/response traces |
| `/projects/[id]/plan` | Integration roadmap |
| `/projects/[id]/reports` | Readiness reports |
| `/partner/*` | Partner portal |

### tRPC Routers

| Router | Purpose |
|--------|---------|
| `projectRouter` | CRUD operations, org-scoped |
| `specRouter` | Spec import, blueprint generation |
| `mockRouter` | Start/stop mocks, health checks |
| `planRouter` | Plan board management |
| `reportRouter` | Readiness report generation |

All routers use `protectedProcedure` with org scoping via `ctx.orgId`.

### Themes

**Enterprise Glass (Client Portal):**
- Light mesh gradient background
- Frosted glass cards with backdrop blur
- Indigo/purple accent colors

**Crystal Ice (Partner Portal):**
- Dark aurora background
- Crystal-like glass effects
- Cyan/purple gradient accents

---

## Database Schema

### Core Entities

```
Organization ─┬─► Membership ◄─┬─ User
              │                │
              └─► Project ─────┼─► Spec ──► Blueprint
                               │
                               ├─► MockInstance
                               ├─► TestSuite ──► TestRun
                               ├─► Trace
                               ├─► PlanItem
                               └─► Report
```

### Key Models

| Model | Purpose |
|-------|---------|
| `Organization` | Multi-tenant container |
| `User` | Authentication entity |
| `Membership` | User ↔ Org with Role |
| `Project` | Integration workspace |
| `Spec` | OpenAPI/AsyncAPI specifications |
| `Blueprint` | Customer-scoped documentation |
| `MockInstance` | Running mock server |
| `TestSuite` | Collection of test cases |
| `TestRun` | Execution results |
| `Trace` | Request/response logs |
| `PlanItem` | Integration roadmap item |
| `Report` | Readiness assessment |

### Enums

```prisma
enum Role { OWNER, ADMIN, VENDOR, PARTNER, VIEWER }
enum ProjectStatus { DRAFT, ACTIVE, ARCHIVED }
enum SpecKind { OPENAPI, ASYNCAPI, JSON_SCHEMA }
enum MockStatus { RUNNING, STOPPED }
enum Actor { VENDOR, PARTNER }
enum PlanStatus { TODO, IN_PROGRESS, DONE, BLOCKED }
enum ReportKind { READINESS, MIGRATION, AUDIT }
```

---

## Security

### Implemented

| Feature | Implementation |
|---------|----------------|
| HMAC Signature Verification | Webhook payload signing, trace signing |
| PII Redaction | Configurable fields, pattern-based |
| Rate Limiting | Per-IP tracking, 100 req/min default |
| Input Sanitization | XSS prevention, script tag removal |
| Password Hashing | PBKDF2 with salt |
| RBAC | Server-side role checks on all mutations |
| Middleware Protection | Route-level auth for client/partner portals |

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
AUTH_SECRET=your-secret-key-minimum-32-characters

# Optional Feature Flags
FEATURE_MOCK_SERVICE=true
FEATURE_GOLDEN_TESTS=true
FEATURE_VALIDATOR=true
FEATURE_PLAN_BOARD=true
FEATURE_READINESS_REPORTS=true

# Optional Integrations
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=...
JIRA_API_TOKEN=...
```

---

## Build & Development

### Build Order

Packages have interdependencies requiring sequential builds:

```
spec-engine → mockgen → validator → orchestrator → connectors → web
```

### Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build:packages

# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Start development
pnpm dev

# Run tests
pnpm test
```

---

## Code Statistics

| Component | Lines | Files |
|-----------|-------|-------|
| spec-engine | ~800 | 10 |
| mockgen | ~900 | 12 |
| validator | ~1,200 | 16 |
| orchestrator | ~1,400 | 14 |
| connectors | ~700 | 8 |
| web app | ~10,000 | 50+ |
| prisma schema | ~400 | 1 |
| **Total** | **~15,400** | **110+** |

---

## Next: See Also

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- [docs/ROADMAP.md](./docs/ROADMAP.md) - What's done, what's next
- [docs/configuration.md](./docs/configuration.md) - Environment and test profile setup
