# Integration Copilot – Issue Tracker

**Last Updated:** December 2025

This is the **authoritative list** of remaining work items. All TODO.md and future-enhancements.md content has been consolidated here.

---

## ✅ Completed

### Navigation & Structure (Nov 2025)
- [x] Project-centric navigation – All features nested under `/projects/[id]/*`
- [x] Tabbed layout for project detail pages
- [x] Sidebar cleanup – Only shows Projects
- [x] Middleware updates for new route structure
- [x] Documentation updates

### Security (Previously Completed)
- [x] tRPC protected procedures with org scoping
- [x] Middleware authentication for client and partner portals
- [x] Org-scoped queries on all data access
- [x] Partner token validation with expiration

### Core Features (Previously Completed)
- [x] Spec import and normalization
- [x] Mock server generation and auto-start
- [x] Golden test suite generation (10 categories, 38 tests)
- [x] Trace storage with HMAC verification
- [x] Plan board with 5 phases
- [x] Readiness report generation

---

## 🔴 P0 - Critical for GTM

### Environment Configuration
**Status:** Not started  
**Impact:** Without this, partners can't test against real vendor systems

- [ ] Add `Environment` model to Prisma schema
- [ ] Support Mock / Sandbox / UAT environment types
- [ ] Environment switcher in test runner UI
- [ ] Store environment credentials securely
- [ ] Update test execution to use selected environment

**Files:**
- `prisma/schema.prisma`
- `apps/web/lib/trpc/routers/mock.ts`
- `apps/web/app/(portal)/projects/[id]/tests/page.tsx`
- `packages/testkit/src/runner.ts`

### Per-API Test Profiles
**Status:** Not started  
**Impact:** Without this, reports show irrelevant failures (idempotency on read-only APIs)

- [ ] Add `TestProfile` model linking API groups to test categories
- [ ] Auto-detect capabilities from spec (pagination params, idempotency headers)
- [ ] UI for vendor to mark categories as Required / Optional / N/A
- [ ] Filter test execution by applicable categories
- [ ] Update reports to show only relevant results

**Files:**
- `prisma/schema.prisma`
- `packages/spec-engine/src/normalizer.ts` (capability detection)
- `apps/web/app/(portal)/projects/[id]/specs/page.tsx` (profile UI)
- `packages/testkit/src/runner.ts`
- `packages/orchestrator/src/reports.ts`

---

## 🟠 P1 - High Impact

### Partner Playground
**Status:** Not started  
**Impact:** Key differentiator for partner self-service

- [ ] Create `/partner/playground` route
- [ ] Endpoint selector from loaded specs
- [ ] Editable JSON body and headers
- [ ] Environment selector (Mock / Sandbox)
- [ ] Send request and display response
- [ ] Inline spec validation with error highlighting
- [ ] Save request as template

**Files:**
- `apps/web/app/partner/playground/page.tsx` (new)
- `packages/validator/src/validator.ts`

### AI Assistant
**Status:** Stub exists  
**Impact:** Replaces Zoom calls for partner debugging

- [ ] Wire `PartnerAssistant` component to real endpoint
- [ ] Build context service (gather latest tests/traces/plan status)
- [ ] Create prompt templates ("Troubleshoot failure", "What's next?")
- [ ] Rate limiting and usage logging
- [ ] Surface relevant blueprint annotations in responses

**Files:**
- `apps/web/components/partner/assistant-panel.tsx`
- `apps/web/lib/trpc/partner/routers/ai.ts` (new)
- `apps/web/lib/ai/context-builder.ts` (new)

### Blueprint Annotations
**Status:** Not started  
**Impact:** Captures tribal knowledge that reduces support burden

- [ ] Add `Annotation` model to Prisma
- [ ] Annotation types: `auth_note`, `field_note`, `error_note`, `condition_note`
- [ ] Vendor UI to add/edit annotations per endpoint/field
- [ ] Surface annotations in partner playground (inline hints)
- [ ] Include annotations in AI assistant context
- [ ] Export annotations in blueprint markdown

**Files:**
- `prisma/schema.prisma`
- `apps/web/app/(portal)/projects/[id]/specs/page.tsx`
- `packages/spec-engine/src/blueprint.ts`

### Parameterized Test Templates
**Status:** Not started  
**Impact:** Bridges vendor control with partner flexibility

- [ ] Template syntax: `{{ variable_name }}`
- [ ] Partner config UI for providing values
- [ ] Substitute values at test runtime
- [ ] Store partner config in `PartnerProject`

**Files:**
- `packages/testkit/src/runner.ts`
- `apps/web/app/partner/tests/page.tsx`
- `prisma/schema.prisma` (PartnerProject.testConfig)

---

## 🟡 P2 - Important

### Auth & RBAC Improvements
**Status:** Partially implemented  
**Impact:** Required for multi-tenant production

- [ ] OAuth providers (GitHub, Google)
- [ ] Multi-org selection flow
- [ ] User invite workflows with email
- [ ] Role assignment UI in project settings
- [ ] Org/user management admin pages

**Files:**
- `apps/web/lib/auth.ts`
- `apps/web/app/(portal)/settings/` (new)

### Mock Lifecycle & Cleanup
**Status:** Partially implemented  
**Impact:** Prevents resource leaks in production

- [ ] Health check cron with auto-restart
- [ ] Retention policy for stale mocks
- [ ] Bulk delete/reset controls
- [ ] Port pooling and reuse
- [ ] Health indicators on Mocks tab

**Files:**
- `apps/web/lib/mock-server-manager.ts`
- `apps/web/app/(portal)/projects/[id]/mocks/page.tsx`
- `apps/web/app/api/cron/mock-health/route.ts` (new)

### Golden Test Insights
**Status:** Suite-level only  
**Impact:** Partners need per-case details to debug

- [ ] Per-case result display in Tests tab
- [ ] Artifact viewer for `.artifacts/testruns`
- [ ] Download links for failure logs
- [ ] Link failing cases to plan items
- [ ] Test run history with diffs

**Files:**
- `apps/web/app/(portal)/projects/[id]/tests/page.tsx`
- `apps/web/lib/tests/golden-runner.ts`

### Slack/Jira Integration
**Status:** Package implemented, not wired  
**Impact:** Alerts vendors when partners get stuck

- [ ] Invoke Slack on test failures
- [ ] Invoke Slack on phase completion
- [ ] Create Jira issues from failures
- [ ] Feature flag toggles in project settings
- [ ] Webhook URL configuration UI

**Files:**
- `packages/connectors/src/slack.ts`
- `packages/connectors/src/jira.ts`
- `apps/web/app/(portal)/projects/[id]/settings/` (new)

---

## 🟢 P3 - Nice to Have

### Spec Automation
- [ ] Accept webhook-delivered OpenAPI updates
- [ ] Auto-refresh mocks/tests on spec change
- [ ] Drift detection between spec versions
- [ ] Changelog generation

### Failure Pattern Analytics
- [ ] Aggregate failures across partners
- [ ] Surface patterns to vendor: "12 partners failed X"
- [ ] Suggest annotations based on common failures

### Advanced Reporting
- [ ] PDF export with styling
- [ ] Scheduled report generation
- [ ] Report comparison over time
- [ ] Executive summary dashboard

### E2E Testing
- [ ] Playwright test framework setup
- [ ] Core user journey tests
- [ ] CI integration with Docker
- [ ] Visual regression testing

---

## Future Enhancements (Post-MVP)

### Per-Partner Data Isolation
Currently all partners in a project see the same data. Future enhancement could add visibility controls:
- Spec visibility per partner project
- Mock/test scoping per partner
- Evidence is already partner-scoped

**Implementation:** Add `visibleToPartnerProjects` relations on Spec, MockInstance, TestSuite.

### Custom Test Builder
Allow vendors to create custom test cases beyond the 10 golden categories:
- Visual test builder UI
- Custom assertions
- Chained request sequences

### SDK Generation
Auto-generate client libraries from specs:
- TypeScript SDK
- Python SDK
- Java SDK

### Compliance Mode
Enterprise features for regulated industries:
- Audit logging
- Data retention policies
- SOC 2 controls
- SSO/SAML

---

## File Reference

### Project-Centric Routes
```
apps/web/app/(portal)/projects/[id]/
├── layout.tsx              # Tabbed navigation
├── page.tsx                # Overview tab
├── specs/page.tsx          
├── mocks/page.tsx          
├── tests/page.tsx          
├── traces/page.tsx         
├── plan/page.tsx           
└── reports/
    ├── page.tsx            
    └── [reportId]/page.tsx 
```

### Partner Portal Routes
```
apps/web/app/partner/
├── layout.tsx
├── login/page.tsx
├── page.tsx                # Dashboard
├── specs/page.tsx
├── mocks/page.tsx
├── tests/page.tsx
├── traces/page.tsx
├── plan/page.tsx
└── playground/page.tsx     # NEW - to be created
```

### Key Backend Files
```
packages/
├── spec-engine/src/
│   ├── normalizer.ts       # Add capability detection
│   └── blueprint.ts        # Add annotation support
├── testkit/src/
│   └── runner.ts           # Add environment + profile support
├── orchestrator/src/
│   └── reports.ts          # Add profile-aware reporting
└── connectors/src/
    ├── slack.ts            # Wire to events
    └── jira.ts             # Wire to events
```
