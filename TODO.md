# Integration Copilot – TODO / Priorities

For a detailed, file-level tracker, see `docs/ISSUE_TRACKER.md`.

---

## ✅ Recently Completed

### Project-Centric Navigation (Nov 27, 2025)
- [x] Create tabbed layout for `/projects/[id]` with Overview/Specs/Mocks/Tests/Traces/Plan/Reports tabs
- [x] Move all project-scoped pages under `/projects/[id]/*`
- [x] Update sidebar navigation to only show Projects
- [x] Delete deprecated top-level routes
- [x] Update middleware for new route patterns
- [x] Update all documentation

---

## 🔄 Next Priorities

## 1. E2E Testing Setup
- [ ] Add Playwright/Cypress test framework
- [ ] Create core user journey tests:
  - Login → Projects → Select project → Tabs navigation
  - Import spec → Generate mocks → Generate tests → Run tests
  - View traces → Check plan → View reports
- [ ] Run E2E tests in CI with Docker

## 2. Mock Lifecycle & Cleanup
- [ ] Add automated health checks/restart logic for mocks
- [ ] Add bulk delete/reset + retention policy for stale mocks/ports
- [ ] Improve mock health indicators on Mocks tab

## 3. Golden Test Insights
- [ ] Surface per-case test results in Tests tab UI
- [ ] Provide download links or modal views for failure logs
- [ ] Attach failing cases to related plan items + readiness evidence
- [ ] Allow exporting suite runs as artifacts

## 4. Plan Board & Scope Configuration
- [ ] Let projects enable/disable phases (e.g., optional webhooks/UAT)
- [ ] Capture required UAT scenarios & performance benchmarks per project
- [ ] Implement evidence upload/view flows on plan items

## 5. Telemetry & Reporting
- [ ] Enable readiness report signing/download workflows
- [ ] Add per-phase/status summaries to Reports tab cards
- [ ] Link traces to plan items and reports

## 6. Production Auth
- [ ] Add OAuth providers (GitHub, Google)
- [ ] Implement multi-org selection flow
- [ ] Add user invite workflows
- [ ] Role assignment UI in project settings

## 7. SDK & Spec Automation
- [ ] Accept SDK/webhook-delivered OpenAPI updates per project
- [ ] Refresh mocks/tests automatically when a spec changes
- [ ] Alert on spec drift between versions

## 8. AI & UX Enhancements
- [ ] Add an AI assistant that summarizes test/plan/report status per project
- [ ] Provide troubleshooting suggestions when suites fail (based on traces)
- [ ] Improve in-app guidance (empty states, contextual tips, toasts)

## 9. Security Hardening
- [ ] Apply rate limiting to sensitive API routes
- [ ] Implement real HMAC validation in validator middleware
- [ ] Add webhook endpoint security

## 10. Code Quality
- [ ] Remove `any` casts in test runner and mock dashboards
- [ ] Create typed DTOs for suite/case snapshots
- [ ] Add proper error boundaries in React components

---

## 📁 Route Reference

```
Client Portal:
/login                          → Authentication
/projects                       → Projects list
/projects/[id]                  → Overview tab
/projects/[id]/specs            → Specs tab
/projects/[id]/mocks            → Mocks tab
/projects/[id]/tests            → Tests tab
/projects/[id]/traces           → Traces tab
/projects/[id]/plan             → Plan tab
/projects/[id]/reports          → Reports tab
/projects/[id]/reports/[id]     → Report detail

Partner Portal:
/partner/login                  → Partner authentication
/partner                        → Partner dashboard
/partner/specs                  → Shared specs
/partner/mocks                  → Mock services
/partner/tests                  → Test suites
/partner/plan                   → Integration progress
/partner/traces                 → Trace access
```
