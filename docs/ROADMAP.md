# Integration Copilot - Roadmap

> Single source of truth for what's done, what's in progress, and what's next.

---

## Strategic Context

### Target Buyer
API vendors and the teams that own individual APIs and help partners integrate with them.

### Primary Pain Point
**Communication friction during integration.** Complex nuances (OAuth v3 scopes, conditional auth, edge cases) get explained repeatedly over Zoom/Teams calls, leading to:
- Salary overhead from repetitive explanations
- Misunderstandings → trial and error → more calls
- Slow time-to-integration

### Product Thesis
Integration Copilot should be **the asynchronous expert** that answers integration questions at 2am when partners are coding—not just a test runner.

---

## Current State (as of Nov 2025)

### ✅ Complete

| Feature | Status | Notes |
|---------|--------|-------|
| **Core Packages** | ✅ | spec-engine, mockgen, validator, orchestrator, connectors |
| **Project-Centric Navigation** | ✅ | All features under `/projects/[id]/*` with tabs |
| **Golden Test Suites** | ✅ | 10 categories, 38 tests, stored in Prisma |
| **Mock Server Generation** | ✅ | Auto-start Express mocks with latency/rate-limit |
| **Trace Ingestion** | ✅ | HMAC-verified, PII redaction |
| **Plan Board** | ✅ | 5-phase roadmap, auto-seeded per project |
| **Readiness Reports** | ✅ | Metrics from tests/traces, markdown viewer |
| **Dual Portal Architecture** | ✅ | Client (Enterprise Glass) + Partner (Crystal Ice) |
| **tRPC + Org Scoping** | ✅ | All queries scoped by orgId |
| **Middleware Auth** | ✅ | Route protection for client/partner portals |

### ⚠️ Partial / In Progress

| Feature | Status | Gap |
|---------|--------|-----|
| **Mock Lifecycle** | ⚠️ | No delete/reset, no health auto-restart |
| **Test Insights** | ⚠️ | Suite-level only, no per-case UI |
| **AI Assistant** | ⚠️ | UI exists, not wired to real data |
| **Partner Portal** | ⚠️ | Theme done, flows need validation |

### ❌ Not Built (Required for GTM)

| Feature | Priority | Why It Matters |
|---------|----------|----------------|
| **Environment Configuration** | 🔴 Critical | Partners need to point tests at UAT, not just mocks |
| **Test Profiles per API** | 🔴 Critical | Not all APIs need all tests (idempotency N/A for read-only) |
| **Partner Playground** | 🔴 Critical | Freeform payload editing is where integration happens |
| **Blueprint Annotations** | 🟡 High | Encode tribal knowledge (OAuth v3 nuances, etc.) |
| **AI Assistant Integration** | 🟡 High | Wire to test failures, traces, docs |

---

## Priority Roadmap

### Phase 1: GTM Essentials (Next 4 weeks)

#### 1.1 Environment Configuration
**Goal:** Make pointing tests at UAT trivially easy.

```
Project
├── Environments
│   ├── Mock (auto-generated, always available)
│   ├── Vendor Sandbox (URL + creds)
│   └── Vendor UAT (URL + creds)
```

**Tasks:**
- [ ] Add `Environment` model to Prisma schema
- [ ] Create environment CRUD in `projectRouter`
- [ ] Add environment selector UI in Tests tab
- [ ] Update test runner to use selected environment's base URL
- [ ] Update traces to record which environment was used

**Files:** `prisma/schema.prisma`, `lib/trpc/routers/project.ts`, `app/(portal)/projects/[id]/tests/page.tsx`

#### 1.2 Test Profiles per API
**Goal:** Configure which test categories apply to each API.

```
Payments API:
  ✅ Authentication (Required)
  ✅ Idempotency (Required)
  ✅ Rate Limiting (Required)
  ❌ Pagination (N/A)

Account Summary API:
  ✅ Authentication (Required)
  ❌ Idempotency (N/A - read-only)
  ✅ Pagination (Required)
```

**Tasks:**
- [ ] Add `TestProfile` model linking Spec → test categories
- [ ] Auto-detect applicable categories from spec (HTTP methods, headers)
- [ ] Add Test Profile configuration UI in Specs tab
- [ ] Filter test suites by profile when running
- [ ] Update reports to show N/A vs failed

**Files:** `prisma/schema.prisma`, `packages/spec-engine/src/blueprint.ts`, `app/(portal)/projects/[id]/specs/page.tsx`

#### 1.3 Partner Playground
**Goal:** Partners can edit payloads and test against sandbox with real-time validation.

**Tasks:**
- [ ] Create Playground tab in partner portal
- [ ] Load endpoints from spec with example requests
- [ ] Editable JSON body/headers with Monaco editor
- [ ] Real-time spec validation as they type
- [ ] Send request to selected environment
- [ ] Show response + validation result inline
- [ ] Save working requests as partner test cases

**Files:** `app/partner/playground/page.tsx`, `components/partner/playground-editor.tsx`

### Phase 2: Differentiation (Weeks 5-8)

#### 2.1 Blueprint Annotations
**Goal:** Vendors encode tribal knowledge that surfaces to partners at the right moment.

```typescript
// Example annotation on /payments endpoint
{
  endpoint: "POST /payments",
  annotations: [
    {
      type: "auth_nuance",
      condition: "amount > 10000",
      message: "High-risk transactions require OAuth v3 elevated scope token",
      link: "/docs/auth#elevated-scope"
    }
  ]
}
```

**Tasks:**
- [ ] Add `Annotation` model to schema
- [ ] Create annotation editor UI in Specs tab (vendor side)
- [ ] Surface annotations in Playground (partner side)
- [ ] Surface annotations in AI Assistant responses
- [ ] Surface annotations when tests fail

**Files:** `prisma/schema.prisma`, `app/(portal)/projects/[id]/specs/page.tsx`, `components/partner/annotation-viewer.tsx`

#### 2.2 AI Assistant Integration
**Goal:** Wire assistant to real test failures, traces, and annotations.

**Tasks:**
- [ ] Create context builder service that gathers:
  - Recent test failures for this partner
  - Recent traces with errors
  - Relevant blueprint annotations
  - Open plan items
- [ ] Create prompt templates:
  - "Why did this test fail?"
  - "What should I do next?"
  - "Explain this error"
- [ ] Wire assistant panel to context service
- [ ] Add usage throttling per partner

**Files:** `lib/ai/context-builder.ts`, `lib/ai/prompts.ts`, `app/partner/components/assistant-panel.tsx`

#### 2.3 Golden Test Insights
**Goal:** Per-case results, artifacts, and failure linkage.

**Tasks:**
- [ ] Surface per-case results in Tests tab UI
- [ ] Store test artifacts in `.artifacts/testruns/`
- [ ] Add artifact viewer modal
- [ ] Link failing cases to plan items
- [ ] Link failing cases to readiness evidence

**Files:** `app/(portal)/projects/[id]/tests/page.tsx`, `lib/tests/golden-runner.ts`

### Phase 3: Production Hardening (Weeks 9-12)

#### 3.1 Auth & Multi-Org
- [ ] Add OAuth providers (GitHub, Google)
- [ ] Multi-org selection flow
- [ ] User invite workflows
- [ ] Role assignment UI

#### 3.2 Mock Lifecycle
- [ ] Delete/reset unused mocks
- [ ] Shared port pooling
- [ ] Health check auto-restart
- [ ] Retention policy for stale mocks

#### 3.3 Integrations
- [ ] Trigger Slack on test failures
- [ ] Trigger Jira issue creation
- [ ] Phase completion notifications
- [ ] Feature flag toggles

#### 3.4 Security Hardening
- [ ] Rate limiting on `/api/tests/run`, `/api/trace`
- [ ] Real HMAC validation in validator middleware
- [ ] Webhook endpoint security

#### 3.5 E2E Testing
- [ ] Playwright/Cypress test framework
- [ ] Core user journey tests
- [ ] Docker image testing in CI

---

## Backlog (Post-GTM)

### Per-Partner Data Isolation
Currently all partners in a project see the same specs/mocks/tests. Future enhancement to allow per-partner visibility scoping.

### Spec Drift Alerts
Accept SDK/webhook-delivered OpenAPI updates and alert when spec changes break existing tests.

### Synthetic Data Generation
Generate realistic test data based on spec schemas.

### Compliance Mode
SOC2, HIPAA compliance logging and controls.

### SSO/SAML
Enterprise single sign-on support.

---

## File Reference

### Key Files to Modify (Phase 1)

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add Environment, TestProfile, Annotation models |
| `lib/trpc/routers/project.ts` | Environment CRUD, test profile management |
| `lib/trpc/routers/spec.ts` | Annotation management |
| `app/(portal)/projects/[id]/tests/page.tsx` | Environment selector, profile filtering |
| `app/(portal)/projects/[id]/specs/page.tsx` | Test profile config, annotation editor |
| `app/partner/playground/page.tsx` | New playground feature |
| `lib/tests/golden-runner.ts` | Environment-aware test execution |

### Deprecated Routes (Already Deleted)

These top-level routes were removed in favor of project-scoped routes:
- `app/(portal)/specs/page.tsx`
- `app/(portal)/mocks/page.tsx`
- `app/(portal)/tests/page.tsx`
- `app/(portal)/traces/page.tsx`
- `app/(portal)/plan/page.tsx`
- `app/(portal)/reports/*`
- `app/(portal)/dashboard/page.tsx`

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Time-to-first-successful-call | ≤ 24 hours | Trace timestamp from first success |
| Time-to-certification | ↓ 50% | Plan board completion time |
| Spec-question tickets | ↓ 40% | Support ticket volume |
| Partner test pass rate | >90% by week 2 | Test run metrics |
| AI assistant usage | 3+ queries/partner/day | Assistant analytics |

---

*Last updated: December 2025*
