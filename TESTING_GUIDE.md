# Integration Copilot - Testing Guide

## 🎯 Overview

This guide shows you how to test all the features of the Integration Copilot application using the **project-centric navigation** model.

---

## 🚀 Getting Started

### 1. Start the Application

```bash
cd integration-copilot
pnpm install
pnpm dev
```

Then open http://localhost:3000 and sign in:
- **Email:** `demo@integration.local`
- **Password:** `demo123`

You will be redirected to `/projects` after successful login.

---

## 🧭 Navigation Structure

The application uses a **project-centric** navigation model. All core features are accessed through a project:

```
/login              → Sign in page
/projects           → Projects list (main landing page after login)
/projects/[id]      → Project detail with tabbed navigation:
  ├── Overview      → Project summary and quick actions
  ├── Specs         → API specifications
  ├── Mocks         → Mock services
  ├── Tests         → Test suites
  ├── Traces        → Request/response traces
  ├── Plan          → Integration roadmap
  └── Reports       → Readiness reports
```

---

## 📋 Features You Can Test

### 1. **Projects** (`/projects`)

**What to see:**
- Project cards with live stats (specs/mocks/tests pulled from Prisma)
- Glassmorphism cards with gradients and status badges

**Interactive elements:**
- Click **New Project** to open the modal (name, status, description)
- Click a project card to enter the project detail page with tabbed navigation
- Hover to see animations / quick metrics

---

### 2. **Project Overview** (`/projects/[id]`)

**What to see:**
- Project header with name, status badge, and creation date
- Horizontal tab navigation for all project sections
- Quick action cards for generating mocks/tests and reports
- Project telemetry panel

**Interactive elements:**
- Click on any tab (Specs, Mocks, Tests, etc.) to navigate within the project
- Use quick action buttons to generate features

---

### 3. **API Specifications** (`/projects/[id]/specs`) ⭐ **FULLY FUNCTIONAL**

**What you can test:**

#### Load Sample Specs
1. Navigate to a project and click the "Specs" tab
2. Click "Load Sample Specs" button
3. See confirmation that specs are loaded
4. Two spec cards appear: Stripe Payment API and Todo API

#### Generate Blueprint
1. Click "Generate Blueprint" on any spec card
2. See detailed information about what a blueprint contains:
   - Endpoint documentation
   - Authentication requirements
   - Data models
   - Integration steps

#### Generate Mock Server
1. Click **Mock** on any spec card
2. A new mock instance is created, its Express server auto-starts on the next available port (3001+)
3. Verify the mock is RUNNING on the Mocks tab

#### Generate Tests
1. Click **Tests** on any spec card
2. Golden tests are generated and stored as a `TestSuite` for that project
3. Navigate to the Tests tab to see and run the suites

---

### 4. **Mock Services** (`/projects/[id]/mocks`)

**What to see:**
- Mock server cards with live status + base URLs
- Request counters
- Start/Stop controls for each Express instance

**Interactive elements:**
- Click **Start** to boot the Express mock (server manager spins it up)
- Click **Stop** to tear down the server
- Download Postman collections for quick manual testing

---

### 5. **Test Suites** (`/projects/[id]/tests`) ⭐ **FULLY FUNCTIONAL**

**What you can test:**

#### Run Individual Tests
1. Click "Run Test" on any test card
2. Watch the loading animation
3. See pass/fail results appear
4. Notice the card color changes based on results:
   - Green = All passed
   - Orange/Red = Some failed
5. Inspect the "Case Results" section on each suite card

#### Run All Tests
1. Click "Run All Tests" button at the top
2. Watch all test suites run sequentially
3. See suite-level pass/fail counts update

#### Test Categories
The page shows golden test categories including:
- **Authentication Tests** - Security
- **Idempotency Tests** - Reliability
- **Rate Limiting Tests** - Performance
- **Error Handling Tests** - Robustness
- **Webhook Tests** - Integration
- **Pagination Tests** - Data
- **Filtering Tests** - Data
- **Versioning Tests** - Compatibility
- **CORS Tests** - Security
- **Security Headers Tests** - Security

---

### 6. **Traces** (`/projects/[id]/traces`)

**What to see:**
- Request/response traces stored for the project
- Validation verdicts, latency, and status codes

**Notes:**
- Mock/test traffic appears here after test runs
- Useful for debugging failed tests

---

### 7. **Plan Board** (`/projects/[id]/plan`)

**What to see:**
- 5-phase integration roadmap seeded automatically per project
- Overall progress bar + per-phase completion

**Notes:**
- Items are currently read-only from the UI
- Plan stages auto-advance based on test/trace results

---

### 8. **Reports** (`/projects/[id]/reports`)

**What to see:**
- Readiness report cards (auto-generated if none exist)
- Score + risk badges
- Detailed report view at `/projects/[id]/reports/[reportId]`

**Notes:**
- Metrics derive from stored tests/traces
- Re-run tests to see readiness score update

---

## 🎨 UI Features to Test

### Enterprise Glass Theme (Client Portal)
- **Background**: Light mesh gradient with floating orbs
- **Cards**: Frosted glass effect with backdrop blur
- **Colors**: Indigo/purple accents

### Crystal Ice Theme (Partner Portal at `/partner`)
- **Background**: Dark aurora effect with floating particles
- **Cards**: Crystal-like glass effects
- **Colors**: Cyan/purple accents

### Animations
- **Page Load**: All pages fade in smoothly
- **Card Hover**: Cards lift and scale on hover
- **Button Hover**: Buttons show shadow effects

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
- **PostgreSQL + Prisma** - Persistent workspace data
- **Sample OpenAPI specs** - Stripe-style Payments + Todo APIs
- **tRPC API** - Type-safe router with org-scoped contexts
- **Core packages** - spec-engine, mockgen, validator, orchestrator, connectors

### Frontend
- **Next.js 15 / React 18** - App Router + server components
- **Tailwind CSS 3** - Modern styling with glassmorphism
- **Lucide Icons** - Iconography
- **React Query + tRPC hooks** - Data fetching tied to active project

---

## 📊 What Works vs What's Pending

### ✅ Fully Functional Today
- **Projects/Specs** – Real Prisma data, automation CTA, inline import
- **Mocks** – Generates + starts Express servers, start/stop controls work
- **Tests** – Golden suites runnable, results persisted
- **Plan Board & Reports** – Backed by real data, auto-seeded per project
- **Traces** – HMAC-protected ingestion with redaction
- **Project-centric navigation** – All features scoped under `/projects/[id]`
- **Authentication** – Middleware protection on all portal routes

### ⚠️ Still in Progress (see `docs/ISSUE_TRACKER.md`)
- Automated mock health checks/restarts
- Validator HMAC signing/real validation
- Dashboard health metrics
- OAuth and multi-user onboarding
- Slack/Jira notification hooks

---

## 🎯 Recommended Testing Flow

1. **Sign in** at `/login` with demo credentials
2. **Go to Projects** (`/projects`) - See your projects list
3. **Select or create a project** - Click to enter project detail
4. **Navigate using tabs** - Use the horizontal tab bar:
   - **Specs tab** - Load sample specs
   - **Mocks tab** - Start mock servers
   - **Tests tab** - Run test suites
   - **Traces tab** - View request/response history
   - **Plan tab** - Check integration progress
   - **Reports tab** - View readiness reports
5. **Test the flow**: Specs → Generate Mocks → Generate Tests → Run Tests → View Results

---

## 🔐 Partner Portal Testing

The partner portal has a separate theme and authentication:

1. Navigate to `http://localhost:3000/partner/login`
2. Enter a valid invite token (create one via database seed)
3. Access the Crystal Ice themed portal with partner-scoped data

---

## 🐛 Known Limitations

- Mock health checks are manual; no auto-restart yet
- Validator currently stubs signing/validation
- Auth is credential-based; OAuth/invite flows pending
- Dashboard lacks real-time health metrics

---

## 📞 Support

For questions or issues:
- GitHub: https://github.com/jjcopeland32/integration-copilot
- Documentation: See README.md

---

**Enjoy testing! 🎉**
