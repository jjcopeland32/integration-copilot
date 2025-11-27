# Integration Copilot – Tracked Issues & File Pointers

This list captures remaining work items for MVP-ready E2E coverage. Each bullet links to relevant code or docs to modify.

---

## ✅ Completed Items

### Navigation & Structure (Completed Nov 27, 2025)
- [x] **Project-centric navigation** – All features now nested under `/projects/[id]/*` with tabbed interface
- [x] **Route restructure** – Moved specs, mocks, tests, traces, plan, reports under project detail
- [x] **Sidebar cleanup** – Removed project-scoped items from sidebar, now shows only Projects
- [x] **Tab navigation** – Horizontal tabs in project layout (`apps/web/app/(portal)/projects/[id]/layout.tsx`)
- [x] **Middleware updates** – Updated protected patterns for new route structure (`apps/web/middleware.ts`)
- [x] **Documentation** – Updated README, TESTING_GUIDE, UI_COMPLETE, PROJECT_SUMMARY

### Security (Completed Previously)
- [x] **tRPC protected procedures** – All routers use `protectedProcedure` with org scoping
- [x] **Middleware authentication** – Route protection for client and partner portals
- [x] **Org-scoped queries** – All data queries include `orgId` filter
- [x] **Partner token validation** – Partner portal uses invite tokens with expiration

### Themes (Completed Previously)
- [x] **Enterprise Glass theme** – Client portal with light mesh gradient, floating orbs
- [x] **Crystal Ice theme** – Partner portal with dark aurora, floating particles
- [x] **Glassmorphism components** – Card, Badge, Button variants

---

## 🔄 In Progress / Remaining

## 1) Auth & RBAC
- Prisma-backed credentials auth is implemented (`apps/web/lib/auth.ts`); demo login works.
- **Remaining:**
  - Org/user management UI and APIs
  - Multi-org selection flow
  - Optional OAuth providers (GitHub, Google)
  - Role assignment UI

## 2) Mock Lifecycle & Cleanup
- Health checks implemented with endpoint + UI trigger.
- **Remaining:**
  - Retention cleanup for stale mocks/ports
  - Bulk delete/reset controls
  - Auto-restart on health check failure

**Files:** `apps/web/lib/trpc/routers/mock.ts`, `apps/web/app/(portal)/projects/[id]/mocks/page.tsx`

## 3) Golden Test Insights & Artifacts
- Suite-level results displayed in Tests tab.
- **Remaining:**
  - Per-case result details in UI
  - Artifact viewer for `.artifacts/testruns`
  - Link failing cases to plan items/reports

**Files:** `apps/web/app/(portal)/projects/[id]/tests/page.tsx`, `apps/web/lib/tests/golden-runner.ts`

## 4) Plan Board & Scope Configuration
- 5-phase board auto-seeded per project.
- **Remaining:**
  - Phase enable/disable UI
  - UAT scenarios configuration
  - Performance benchmarks persistence
  - Evidence upload/view flows

**Files:** `apps/web/app/(portal)/projects/[id]/plan/page.tsx`, `packages/orchestrator/src/plan-board.ts`

## 5) Telemetry & Validator
- Trace storage implemented with HMAC verification.
- **Remaining:**
  - Real HMAC signing in validator middleware
  - Rate limiting on sensitive API routes
  - Trace→plan/report linkage in UI

**Files:** `packages/validator/src/middleware/express.ts`, `apps/web/app/(portal)/projects/[id]/traces/page.tsx`

## 6) AI Assistant & Partner Experience
- Partner portal with Crystal Ice theme.
- **Remaining:**
  - Wire PartnerAssistant to real summary endpoint
  - Validate partner flows update core models with RBAC

**Files:** `apps/web/components/partner/assistant-panel.tsx`

## 7) Integrations (Slack/Jira)
- Connector packages implemented.
- **Remaining:**
  - Invoke connectors on test failures
  - Phase completion notifications
  - Report creation hooks
  - Feature flag toggles

**Files:** `packages/connectors/src/*`, `apps/web/lib/config.ts`

## 8) Security & Rate Limiting
- RBAC and org scoping in place.
- **Remaining:**
  - Rate limiting on `/api/tests/run`, `/api/trace`
  - Webhook endpoint hardening

**Files:** `apps/web/app/api/*`, `apps/web/lib/config.ts`

## 9) Testing & CI
- Build and TypeScript checks pass.
- **Remaining:**
  - Playwright/Cypress E2E flows
  - Test project-centric navigation
  - Docker image testing in CI

**Files:** `.github/workflows/*`

## 10) Documentation & Templates
- Core docs updated for project-centric navigation.
- **Remaining:**
  - Keep `.env` guidance aligned
  - Document feature flags
  - CI Docker workflow permissions

**Files:** `README.md`, `DEPLOYMENT.md`, `.github/workflows/docker.yml`

---

## File Structure Reference

### New Project-Centric Routes

```
apps/web/app/(portal)/projects/[id]/
├── layout.tsx              # Tabbed navigation layout
├── page.tsx                # Overview tab
├── specs/page.tsx          # Specs tab
├── mocks/page.tsx          # Mocks tab
├── tests/page.tsx          # Tests tab
├── traces/page.tsx         # Traces tab
├── plan/page.tsx           # Plan tab
└── reports/
    ├── page.tsx            # Reports list tab
    └── [reportId]/page.tsx # Report detail
```

### Deprecated Routes (Deleted)

The following top-level routes have been removed in favor of project-scoped routes:
- `apps/web/app/(portal)/specs/page.tsx`
- `apps/web/app/(portal)/mocks/page.tsx`
- `apps/web/app/(portal)/tests/page.tsx`
- `apps/web/app/(portal)/traces/page.tsx`
- `apps/web/app/(portal)/plan/page.tsx`
- `apps/web/app/(portal)/reports/*`
- `apps/web/app/(portal)/dashboard/page.tsx`
