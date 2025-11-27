# Partner Portal Architecture & Build Guide

## 1. Purpose
The existing Integration Copilot UI targets *our* customer (the enterprise API owner). They can ingest partner specs, spin up mocks, run golden tests, and assess readiness. We now need the companion portal for the *partner* (e.g., a retailer integrating a payments API). This portal should help the partner team:

1. Understand exactly what the API owner expects (latest blueprint + plan).
2. Upload their own sandbox credentials/spec changes.
3. Run the same golden tests/mocks themselves, see evidence, and share logs with the integration team.
4. Ask AI-guided questions like "Why is the Idempotency test failing?" or "What remains before UAT sign-off?"

## 2. Personas & User Journeys

| Persona | Goals | Key Views |
| --- | --- | --- |
| Partner Engineer | Import spec, run golden tests, view traces, request help | Dashboard, Specs, Tests, Traces, AI Assistant |
| Partner PM / Lead | Track plan status, submit evidence, request extensions | Plan Board, Evidence Uploads, Reports |
| Integration Manager (read-only) | Observe progress without logging into internal cockpit | Shared Reports, Activity Feed |

### Core Journey
1. **Invite** – The API owner invites a partner (email, token). Partner self-onboards and lands on Partner Dashboard.
2. **Spec Sync** – Partner either confirms the spec shared or uploads their own variant (diff surfaced back to the API owner).
3. **Mock/Test Runs** – Partner can trigger the same automation CTA (generate mocks/tests) scoped to their sandbox credentials.
4. **Evidence & Plan** – Partner sees their specific plan phases and uploads evidence per exit criterion.
5. **AI Guidance** – Partner can ask questions referencing latest tests/traces/evidence.
6. **Report Sharing** – Partner can request readiness review; API owner approves via internal cockpit.

## 3. Architecture Overview

```
┌──────────────────────────────┐
│  Partner Portal (Next.js)    │
│  - Auth (magic link / email) │
│  - tRPC client (partner scope)│
│  - AI Assistant UI           │
└──────────────┬───────────────┘
               │ tRPC (new partner router namespace)
┌──────────────▼───────────────┐
│  Shared Backend (Apps/Web)   │
│  - PartnerProject, PartnerUser│
│  - Spec import, mocks, tests │
│  - Evidence + plan state     │
│  - AI context service        │
└──────────────┬───────────────┘
               │ Prisma / Postgres models (extend existing schema)
┌──────────────▼───────────────┐
│  External Services           │
│  - AI providers (OpenAI)     │
│  - Email/Magic link service  │
│  - Object storage for proof  │
└──────────────────────────────┘
```

### Key Backend Extensions
1. **PartnerUser / PartnerSession** tables (authentication separate from internal users).
2. **PartnerProject** linking to the main Project (one project ↔ multiple partner projects).
3. **EvidenceItem** / `PlanItemEvidence` table so partner-provided proof is tracked.
4. **AI Context Service**: helper that bundles latest tests/traces/plan status per partner project and feeds prompts to the AI provider. Shared with internal cockpit later.

## 4. Feature Scope

| Feature | Partner Portal | Notes |
| --- | --- | --- |
| Auth | Magic link (email) + invite token | No password to reduce friction |
| Dashboard | Summary of mocks, tests, plan progress, AI tips | Similar to internal dashboard but scoped per partner |
| Specs | View latest spec, upload partner variant, diff viewer | Diffs notify API owner via internal cockpit |
| Mocks | Start/stop partner mock, download Postman | Reuse existing mock manager; partner sees only their instances |
| Tests | Run golden suites, view per-case results, download logs | Reuse `/api/tests/run` with partner project ID |
| Traces | Display partner-run telemetry only | Same trace model, filtered |
| Plan & Evidence | Show required phases, allow evidence upload/reference | Evidence stored as structured metadata (files link to object storage) |
| AI Assistant | Chat widget referencing latest tests/traces/evidence | Build as TRPC endpoint calling AI provider |

## 5. Build Plan (Phases)

### Phase 1 – Foundations
1. **DB & tRPC**
   - Add `PartnerUser`, `PartnerProject`, `PartnerInvite`, `PlanItemEvidence`.
   - Create `partnerRouter` (tRPC) with `auth`, `project`, `spec`, `mock`, `test`, `plan`, `trace`, `ai` subrouters.
2. **Auth**
   - Invitation flow: API owner triggers invite → email link (`token`).
   - Partner login page + session middleware scoped separately from internal NextAuth.
3. **Layout**
   - New app route `/partner` with custom layout & nav (Dashboard, Specs, Mocks, Tests, Plan, Traces, Assistant).

### Phase 2 – Core Functionality
1. **Dashboard** – show metrics using partner project data.
2. **Specs** – read-only blueprint + upload/diff view (persist partner-submitted spec, mark as pending review).
3. **Mocks/Tests** – reuse existing controllers; ensure partner project IDs are passed and Postman/test logs exposed.
4. **Plan** – read-only view of required phases, plus evidence upload modal (files to storage, metadata to DB).
5. **Traces** – filtered list of partner trace rows with pagination/search.

### Phase 3 – AI Assistant
1. **Context builder** – API to gather latest failures, open plan items, recent traces for that partner.
2. **Prompt templates** – at least two flows ("Troubleshoot failure", "What's next?").
3. **UI** – floating chat panel with conversation history per partner project.
4. **Rails** – throttle usage, log prompts/responses for support team visibility.

### Phase 4 – Integrations & Polishing
1. **Evidence Notifications** – when partner uploads evidence, notify API owner inside internal cockpit + Slack/Jira hooks.
2. **Report Preview** – partner can request readiness; portal shows status ("Under Review", "Approved").
3. **Observability** – partner-level activity feed for integration manager visibility.

## 6. Risks & Considerations
- **Security**: ensure partner scopes can never access other partners' data (row-level checks on every tRPC resolver).
- **Rate limiting**: protect `/api/tests/run` and AI endpoints from abuse (per-partner quotas).
- **Storage**: evidence uploads need object storage (S3, R2) with signed URLs.
- **AI costs**: cache assistant outputs or summarize context before sending to LLM.

## 7. Deliverables
1. Database migration + Prisma models for partner entities.
2. `partnerRouter` tRPC endpoints with auth middleware.
3. Partner portal Next.js app pages + shared components (reuse design system).
4. AI assistant service + UX.
5. Documentation updates (README, onboarding guide, runbooks).
