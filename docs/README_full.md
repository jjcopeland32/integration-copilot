# Integration Copilot — Full README
**Updated:** 2025-11-03

## 1) Value Prop (one-liner)
**Cut partner onboarding time by 50%** by turning specs into **customer-scoped blueprints**, a **hosted mock + golden tests**, a **live validator/trace**, and an **exec go‑live report**.

## 2) Outcomes & KPIs
- Time-to-first-successful call (TTFSC) ≤ **24 hours**
- Time-to-certification ↓ **≥50%**
- Spec-question tickets ↓ **≥40%**
- Partner pass rate on Golden Tests **>90%** by week 2

## 3) Architecture (expanded)
- **Spec Engine**: OpenAPI/AsyncAPI ingest → normalized model → Blueprint generator → Mock/Test generators.
- **Mock Service**: Deterministic responses, rate-limit/latency simulation, error injection.
- **Validator/Proxy**: Request/response validation, rule evaluation, trace storage.
- **Orchestrator**: Projects, roles/RBAC, plan board, evidence, reports, integrations (Slack/Jira).
- **Storage**: Postgres (core), Object storage (request/response bodies & artifacts).

## 4) Data Model (Prisma in docs/prisma.schema.example)
Key entities:
- Organization, User, Membership
- Project, Spec, Blueprint
- MockInstance, TestSuite, TestRun, Trace
- PlanItem, Report

## 5) API Contracts (docs/api_contracts.trpc.md)
Surface area:
- spec.import, spec.list, blueprint.generate, mock.create, tests.generate, tests.run, trace.ingest, plan.*, report.generate

## 6) Golden Tests
Two baseline suites included under /tools:
- **Payments Checkout** — idempotency, webhooks, refunds, retries.
- **Financing/BNPL** — prequal/apply, plan codes, partial returns, decision webhooks.

## 7) Security
- Webhook signature verification (HMAC)
- Redaction policy for traces (PII toggle)
- RBAC server-side; audit logs; signed URLs for artifacts

## 8) Roadmap
- MVP: 8 weeks (see root README)
- v2: Synthetic data, chaos suite, SDK stubs, spec drift alerts, compliance mode, SSO/SAML

## 9) Dev Quickstart
See root README for setup. Run `pnpm dev`, then import a public OpenAPI to test the pipeline.

---

## Appendix A — Acceptance Criteria (detailed)
- Importing a spec yields a Blueprint in < 60s.
- Mock URL spins in < 10s; example requests return 200 with deterministic payloads.
- 10 Golden Tests generated and runnable via UI and CLI.
- Trace UI shows human-readable errors with spec links.
- Readiness report emits a signed PDF with pass rates and risks.
- RBAC enforced on server actions; audit logs present.
