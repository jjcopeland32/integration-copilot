# Integration Copilot - Testing Guide

This guide shows how to test all features of the Integration Copilot application.

---

## Quick Start

```bash
cd integration-copilot
pnpm install
pnpm dev
```

Open http://localhost:3000 and sign in:
- **Email:** `demo@integration.local`
- **Password:** `demo123`

---

## Testing Flow

### 1. Projects (`/projects`)

**Test these interactions:**
- Click **New Project** → Modal opens with name, status, description fields
- Create a project → Card appears with status badge
- Click a project card → Navigate to project detail with tabs
- Delete a project → Confirmation modal, then card removed

### 2. Specs Tab (`/projects/[id]/specs`)

**Test these interactions:**
- Click **Load Sample Specs** → Two specs appear (Stripe Payments, Todo API)
- Click **Generate Blueprint** on a spec → Info modal about blueprint contents
- Click **Mock** on a spec → Mock server created, visible in Mocks tab
- Click **Tests** on a spec → Golden tests generated, visible in Tests tab

### 3. Mocks Tab (`/projects/[id]/mocks`)

**Test these interactions:**
- Mock cards show status (RUNNING/STOPPED) and base URL
- Click **Start** → Express server boots, status changes to RUNNING
- Click **Stop** → Server stops, status changes to STOPPED
- Download Postman collection → JSON file downloads

### 4. Tests Tab (`/projects/[id]/tests`)

**Test these interactions:**
- Click **Run Test** on any suite → Loading animation, then pass/fail results
- Click **Run All Tests** → All suites run sequentially
- Observe card colors: Green = passed, Orange/Red = failed
- Expand "Case Results" to see individual test outcomes

### 5. Traces Tab (`/projects/[id]/traces`)

**Test these interactions:**
- After running tests, traces appear in the list
- Each trace shows: method, path, status, verdict, latency
- Traces are project-scoped (only current project's traces)

### 6. Plan Tab (`/projects/[id]/plan`)

**Test these interactions:**
- 5-phase board displays: Auth → Core → Webhooks → UAT → Cert
- Progress bar shows overall completion
- Phase cards show item counts and status

### 7. Reports Tab (`/projects/[id]/reports`)

**Test these interactions:**
- Report cards show score and risk badges
- Click a report → Detail view with markdown content
- Metrics derived from stored tests/traces

---

## Golden Test Categories

The test runner executes these 10 categories (38 total tests):

| Category | Tests | What It Validates |
|----------|-------|-------------------|
| 🔒 Authentication | 5 | OAuth, API keys, JWT |
| 🔄 Idempotency | 3 | Duplicate request handling |
| ⚡ Rate Limiting | 4 | Throttling and quotas |
| ❌ Error Handling | 6 | Error responses and codes |
| 🔔 Webhooks | 4 | Event delivery and retries |
| 📄 Pagination | 3 | Cursor and offset pagination |
| 🔍 Filtering | 4 | Query parameters and search |
| 🔢 Versioning | 2 | API version compatibility |
| 🌐 CORS | 3 | Cross-origin policies |
| 🛡️ Security Headers | 4 | CSP, HSTS, etc. |

---

## CLI Testing

Run golden tests from command line:

```bash
pnpm testkit:run
```

This resolves suites from `/api/tests/:suiteId`, runs HTTP checks, and stores artifacts in `./.artifacts/testruns/`.

---

## HMAC Trace Ingestion

Test the trace API directly:

```bash
export PROJECT_ID=<project-id>
export TELEMETRY_SECRET=<secret-from-project-telemetry-tab>

PAYLOAD='{"projectId":"'"$PROJECT_ID"'","requestMeta":{"method":"POST","path":"/payments"},"responseMeta":{"status":200},"verdict":"pass"}'

SIG=$(node -e "const crypto=require('crypto');const [payload, secret]=process.argv.slice(2);process.stdout.write(crypto.createHmac('sha256', secret).update(payload).digest('hex'));" "$PAYLOAD" "$TELEMETRY_SECRET")

curl -sS -X POST http://localhost:3000/api/trace \
  -H 'content-type: application/json' \
  -H "x-trace-signature: $SIG" \
  -d "$PAYLOAD"
```

Expected response: `{ ok: true }`

---

## Partner Portal Testing

The partner portal uses a separate theme (Crystal Ice) and auth flow:

1. Navigate to `http://localhost:3000/partner/login`
2. Enter a valid invite token
3. Access partner-scoped data with Crystal Ice theme

---

## Theme Testing

### Enterprise Glass (Client Portal)
- Light mesh gradient background
- Frosted glass cards with backdrop blur
- Indigo/purple accents

### Crystal Ice (Partner Portal)
- Dark aurora background
- Crystal-like glass effects
- Cyan/purple accents

---

## What Works vs What's Pending

### ✅ Fully Functional
- Project CRUD with org scoping
- Spec import and sample loading
- Mock generation and start/stop
- Golden test execution
- Trace storage with redaction
- Plan board (read-only)
- Readiness reports
- Authentication middleware

### ⚠️ In Progress
See [docs/ISSUE_TRACKER.md](./docs/ISSUE_TRACKER.md) for complete list:
- Environment switching (Mock/Sandbox/UAT)
- Per-API test profiles
- Partner playground
- AI assistant
- Blueprint annotations
