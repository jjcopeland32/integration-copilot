# Integration Copilot - Testing Guide

## 🎯 Overview

This guide shows you how to test all the features of the Integration Copilot application.

---

## 🚀 Getting Started

### 1. Start the Application

```bash
cd integration-copilot
pnpm install
pnpm dev
```

Then open http://localhost:3000, go to `/login`, and sign in with the demo account:
- **Email:** `demo@integration.local`
- **Password:** `demo123`

---

## 📋 Features You Can Test

### 1. **Dashboard** (`/dashboard`)

**What to see:**
- 4 animated stat cards with gradients
- Recent activity feed
- Quick action buttons
- Integration health metrics

**Interactive elements:**
- Click on quick action buttons (they show what they would do)
- Hover over cards to see lift effects

---

### 2. **Projects** (`/projects`)

**What to see:**
- Project cards with live stats (specs/mocks/tests pulled from Prisma)
- Glassmorphism cards with gradients and status badges

**Interactive elements:**
- Click **New Project** to open the modal (name, status, description)
- Open a project card to import specs inline, trigger the “Generate Mock & Tests” automation CTA, or delete the project
- Hover to see animations / quick metrics snap-ins

---

### 3. **API Specifications** (`/specs`) ⭐ **FULLY FUNCTIONAL**

**What you can test:**

#### Load Sample Specs
1. Click "Load Sample Specs" button (optionally with `?projectId=...` in the URL)
2. See confirmation that specs are loaded
3. Two spec cards appear: Stripe Payment API and Todo API (scoped to the current project context)

#### Generate Blueprint
1. Click "Generate Blueprint" on any spec card
2. See detailed information about what a blueprint contains:
   - Endpoint documentation
   - Authentication requirements
   - Data models
   - Integration steps

#### Generate Mock Server
1. Click **Mock** on any spec card
2. A new mock instance is created, its Express server auto-starts on the next available port (3001+), and the config + Postman collection are stored in Prisma
3. Verify the mock is RUNNING on `/mocks` and hit the logged base URL to see responses

#### Generate Tests
1. Click **Tests** on any spec card
2. Ten golden tests (38 cases) are generated and stored as a `TestSuite` for that project
3. Suites automatically target the latest running mock so `/tests` can execute against the simulated API

---

### 4. **Mock Services** (`/mocks`)

**What to see:**
- Mock server cards with live status + base URLs
- Request counters (placeholder until telemetry lands)
- Start/Stop controls for each Express instance

**Interactive elements:**
- Click **Start** to boot the Express mock (server manager spins it up and status flips to RUNNING)
- Click **Stop** to tear down the server
- Download Postman collections for quick manual testing

---

### 5. **Test Suites** (`/tests`) ⭐ **FULLY FUNCTIONAL**

**What you can test:**

#### Run Individual Tests
1. Click "Run Test" on any test card
2. Watch the loading animation (2 seconds)
3. See pass/fail results appear
4. Notice the card color changes based on results:
   - Green = All passed
   - Orange/Red = Some failed

#### Run All Tests
1. Click "Run All Tests" button at the top
2. Watch all 10 test suites run sequentially
3. See suite-level pass/fail counts update (latest run persisted)
4. Note: per-case details are still pending UI work—use the server logs or `.artifacts/testruns` for deeper inspection for now

#### Test Categories
The page shows 10 golden test categories:
1. **Authentication Tests** (5 tests) - Security
2. **Idempotency Tests** (3 tests) - Reliability
3. **Rate Limiting Tests** (4 tests) - Performance
4. **Error Handling Tests** (6 tests) - Robustness
5. **Webhook Tests** (4 tests) - Integration
6. **Pagination Tests** (3 tests) - Data
7. **Filtering Tests** (4 tests) - Data
8. **Versioning Tests** (2 tests) - Compatibility
9. **CORS Tests** (3 tests) - Security
10. **Security Headers Tests** (4 tests) - Security

**Total: 38 tests across 10 categories**

---

### 6. **Traces** (`/traces`)

**What to see:**
- Request/response traces stored in Prisma for the active project
- Validation verdicts, latency, and status codes

**Notes:**
- Posting to `/api/trace` (with the HMAC header) immediately surfaces here
- Mock/test traffic will hook into this view in an upcoming telemetry pass

---

### 7. **Plan Board** (`/plan`)

**What to see:**
- 5-phase integration roadmap seeded automatically per project
- Overall progress bar + per-phase completion (based on real `PlanItem` status)

**Notes:**
- Items are currently read-only from the UI; mutate via Prisma or upcoming management flows
- Future telemetry work will auto-advance these stages when tests/traces pass

---

### 8. **Reports** (`/reports`)

**What to see:**
- Readiness report cards (auto-generated if none exist for the project)
- Score + risk badges
- Markdown-rendered reports on `/reports/[id]`

**Notes:**
- Signing/download controls are stubbed until the approval workflow lands
- Metrics currently derive from stored tests/traces; expect richer evidence once telemetry hooks in

---

## 🎨 UI Features to Test

### Animations
- **Page Load**: All pages fade in smoothly
- **Card Hover**: Cards lift and scale on hover
- **Button Hover**: Buttons show shadow effects

### Gradients
- **Backgrounds**: Blue-to-indigo gradient background
- **Buttons**: Colorful gradient buttons
- **Icons**: Gradient-colored icon backgrounds
- **Text**: Gradient text on headers

### Glass Morphism
- **Cards**: Frosted glass effect with backdrop blur
- **Borders**: Subtle white borders
- **Shadows**: Soft shadows for depth

---

## 🧪 Sample API Specs Included

### 1. Stripe Payment API
- **12 endpoints**
- POST /charges - Create a charge
- GET /charges - List charges
- POST /customers - Create a customer
- Full request/response schemas

### 2. Todo API
- **5 endpoints**
- GET /todos - Get all todos
- POST /todos - Create a todo
- GET /todos/{id} - Get todo by ID
- PUT /todos/{id} - Update todo
- DELETE /todos/{id} - Delete todo

---

## 🔧 Technical Details

### Backend
- **PostgreSQL + Prisma** - Persistent workspace data (projects/specs/mocks/tests/plan/report)
- **Sample OpenAPI specs** - Stripe-style Payments + Todo APIs
- **tRPC API** - Type-safe router stack with project-scoped contexts
- **5 core packages** - spec-engine, mockgen, validator, orchestrator, connectors

### Frontend
- **Next.js 15 / React 18** - App Router + server components
- **Tailwind CSS 3** - Modern styling
- **Lucide Icons** - Iconography
- **React Query + tRPC hooks** - Data fetching/state tied to the active project

---

## 📊 What Works vs What's Pending

### ✅ Fully Functional Today
- **Projects/Specs** – Real Prisma data, automation CTA, inline import
- **Mocks** – Generates + starts actual Express servers, start/stop controls work
- **Tests** – Runs suites against the running mock via `/api/tests/run`, persists results
- **Plan Board & Reports** – Backed by real `PlanItem` + `Report` rows, auto-seeded per project
- **Traces** – Displays stored trace rows scoped to the active project

### ⚠️ Still in Progress
- **Dashboard metrics** – Currently show static/demo data
- **Per-case test insights** – UI only shows summary counts (artifacts available in logs)
- **Mock lifecycle cleanup** – No delete/reset controls yet, so ports accumulate
- **Telemetry loop** – Plan board + reports don’t yet auto-update based on trace/test outcomes

---

## 🎯 Recommended Testing Flow

1. **Start at Dashboard** - Get overview
2. **Go to Specs** - Load sample specs
3. **Generate features** - Try blueprint, mock, and test generation
4. **Go to Tests** - Run the golden tests
5. **Explore other pages** - See the full UI

---

## 🐛 Known Limitations

- **Mock deletion/reset** – You can start/stop mocks but not delete them yet, so unused ports persist
- **Golden test insights** – Suite results lack per-case details in the UI (check `.artifacts/testruns` for now)
- **Plan/report automation** – Plan items and readiness scores don’t auto-update based on telemetry yet
- **Dashboard metrics** – High-level stats still use placeholder data
- **Auth** – Demo credentials only; no multi-user onboarding flows wired yet

---

## 🚀 Next Steps

1. **Add mock cleanup controls** – Delete/reset actions plus shared port pool
2. **Expose detailed test results** – UI for per-case logs and download links
3. **Telemetry-driven evidence** – Emit trace rows for mock/test traffic and auto-advance plan stages
4. **Dashboard refresh** – Replace placeholder stats with real Prisma aggregates
5. **SDK/spec automation** – Hook upcoming telemetry SDK into spec ingestion so projects stay current

---

## 📞 Support

For questions or issues:
- GitHub: https://github.com/jjcopeland32/integration-copilot
- Documentation: See README_FINAL.md

---

**Enjoy testing! 🎉**
