# Integration Copilot – Tracked Issues & File Pointers

This list captures remaining work items for MVP-ready E2E coverage. Each bullet links to relevant code or docs to modify.

## 1) Auth & RBAC
- Replace demo-only Credentials auth with real Auth.js + Prisma users/memberships (`apps/web/lib/auth.ts`, `prisma/schema.prisma`, `apps/web/lib/rbac.ts`).
- Add org/user management + role assignment UI and APIs (project/org routes, membership UI in `apps/web/app/projects/*`).

## 2) Mock Lifecycle & Cleanup
- Implement automated health checks/restarts and retention cleanup; port reuse + health/uptime metadata now stored (`apps/web/lib/mock-server-manager.ts`, `prisma/mockInstance`, `/mocks` UI).
- Surface mock health/uptime on dashboard cards (`apps/web/app/dashboard/page.tsx`).

## 3) Golden Test Insights & Artifacts
- Surface per-case results, logs, and trace links in `/tests` UI; add artifact viewer for `.artifacts/testruns` (`apps/web/app/tests/page.tsx`, `apps/web/lib/tests/golden-runner.ts`).
- Link failing cases to plan items/reports (plan/report UIs + persistence).

## 4) Plan Board & Scope Configuration
- Finish phase enable/disable + UAT scenarios + performance benchmarks persistence/UI (`apps/web/app/projects/[id]/page.tsx`, `apps/web/app/plan/page.tsx`, `packages/orchestrator/src/phases.ts`, `.../plan-board.ts`).
- Evidence upload/view flows on plan items (UI wiring to `PlanBoardManager.uploadEvidence`).

## 5) Telemetry & Validator
- Implement real HMAC signing + schema validation in validator middleware (`packages/validator/src/middleware/express.ts`); wire rate limiting/security to API routes.
- Tie telemetry deliveries to plan/report metrics; show trace→plan/report linkage in UI (`apps/web/components/projects/telemetry-panel.tsx`, `/traces`, reports).

## 6) AI Assistant & Partner Experience
- Wire PartnerAssistant to real summary endpoint across tests/traces/plan/reports (`apps/web/components/partner/assistant-panel.tsx` + new API).
- Validate partner flows update core models (partner spec submission, plan, evidence) with RBAC enforced.

## 7) Integrations (Slack/Jira)
- Invoke connectors on test failures, phase completion, and report creation/signing (feature flags in `apps/web/lib/config.ts`, hooks in orchestrator/golden runner).
- Add error-safe logging and toggles in env/feature flags.

## 8) Security & Rate Limiting
- Apply rate limiting to sensitive API routes (`/api/tests/run`, `/api/trace`, partner APIs) using `config.rateLimit`.
- Harden incoming webhook/spec automation endpoint (to be added) using `WEBHOOK_SECRET`.

## 9) Testing & CI
- Add Playwright/Cypress flows for core E2E path (login → create project → import spec → generate mock/tests → run tests → traces → plan → report) and run against Docker image in CI (`.github/workflows/*`).
- Add tests around auth/RBAC, plan scope config, validator HMAC, and mock lifecycle.

## 10) Documentation & Templates
- Keep `.env` guidance aligned with required/optional envs (`README_FINAL.md`, `DEPLOYMENT.md`, `TESTING_GUIDE.md`).
- Decide on `.env.example` policy (restore sanitized template or document copy steps); ensure feature flags documented with actual behavior.
