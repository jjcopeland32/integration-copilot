# Integration Copilot 🚀

> AI-Powered API Vendor Onboarding System

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![tRPC](https://img.shields.io/badge/tRPC-11.0-2596be?logo=trpc)](https://trpc.io/)

**Integration Copilot** reduces API partner integration time by 50% through automated spec processing, mock generation, and comprehensive testing.

![Dashboard](https://img.shields.io/badge/Status-Core_Build_Complete-success)

---

## ✨ Features

### 🎯 Core Capabilities
- **OpenAPI/AsyncAPI Import** – Load and normalize API specifications into Prisma
- **Blueprint Generation** – Automated integration documentation per spec
- **Mock Server Automation** – Generate + auto-start Express mocks with latency/rate-limit simulation
- **Golden Tests** – 10 comprehensive suites (38 tests) stored per project and runnable via `/api/tests/run`, with suite-level UI summaries and JSON artifacts
- **Project Lifecycle** – Create/delete projects, attach specs, and manage active project context
- **Trace Validation** – Request/response validation and logging (scoped to each project)
- **Plan Board** – 5-phase integration roadmap backed by real `PlanItem` records, auto-updates when telemetry meets criteria
- **Readiness Reports** – Auto-generated go-live assessment with live metrics from stored tests/traces + markdown viewer

> The partner-facing portal (see `docs/partner-portal.md`) exposes these same mocks/tests/plan workflows directly to integrator teams, plus an AI assistant that summarizes failures and next steps.

### 🎨 Modern UI
- ✨ Smooth animations and transitions
- 🌈 Colorful gradients throughout
- 💎 Glass morphism cards (Enterprise Glass for client, Crystal Ice for partner portal)
- 📱 Fully responsive design
- ⚡ Interactive test runner
- 🎭 Real-time results

### 📂 Project-Centric Navigation

All functionality is organized under projects:

```
/projects                      # Project list
/projects/[id]                 # Project overview/dashboard
/projects/[id]/specs           # API specifications
/projects/[id]/mocks           # Mock servers
/projects/[id]/tests           # Golden test suites
/projects/[id]/traces          # Request/response traces
/projects/[id]/plan            # Integration plan board
/projects/[id]/reports         # Readiness reports
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 22+
- pnpm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/jjcopeland32/integration-copilot.git
cd integration-copilot

# Install dependencies (runs workspace bootstrap)
pnpm install

# Ensure packages, Prisma client, and local Postgres are ready (optional but handy)
pnpm ensure:workspace --with-db

# Start development server (prompts for demo login)
pnpm dev

# In another terminal, sign in at http://localhost:3000 with:
# Email: demo@integration.local
# Password: demo123
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---
## 📋 Tracked Issues / Remaining Work

Core implementation is complete, but several productization tasks remain (mock lifecycle controls, detailed golden test insights, production auth, telemetry automation, Slack/Jira hooks, etc.). The authoritative list with file-level pointers lives in [`docs/ISSUE_TRACKER.md`](docs/ISSUE_TRACKER.md).

---

### 🔐 HMAC Trace Ingest

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

The server will persist a redacted payload (card numbers, CVVs, SSNs, and passwords are scrubbed by default) and return `{ ok: true }` when the signature is valid.

- **UI:** Open a project at `/projects/[id]`, go to the Specs tab, load the sample specs, generate mocks/tests, then go to the Tests tab and click **Run All**. Suites execute against the auto-started mock, emit trace rows, and update the plan board automatically.
- **CLI:**

  ```bash
  pnpm testkit:run
  ```

  The CLI resolves suites from `/api/tests/:suiteId`, runs the HTTP checks, prints a summary, and stores artifacts in `./.artifacts/testruns/`.

### 🐾 Load Sample Specs

In the Specs tab of any project, press **Load Sample Specs**. The Spec Engine ingests the Stripe payments + Todo APIs, generates blueprints, mocks, and tests scoped to your active project.

---

## 🧪 Try It Out

### 1. Create or Select a Project
1. Navigate to **Projects** (`/projects`)
2. Create a new project or click an existing one
3. You'll land on the project's Overview tab with tabbed navigation

### 2. Load Sample API Specs
1. Click the **Specs** tab
2. Click **Load Sample Specs**
3. Watch Stripe-style Payments + Todo specs appear

### 3. Generate Mocks & Tests
1. On the **Overview** tab, click **Generate Mock & Tests**
2. This runs automation across every attached spec (mocks auto-start)
3. Navigate to **Mocks** or **Tests** tabs to see results

### 4. Run Golden Tests
1. Click the **Tests** tab
2. Run a single suite or **Run All Tests**
3. Latest pass/fail counts persist and emit telemetry traces

### 5. Explore Other Tabs
- **Traces** – Request/response logs for the project
- **Plan** – 5-phase integration roadmap
- **Reports** – Auto-generated readiness assessments

---

## 📦 Architecture

### Monorepo Structure

```
integration-copilot/
├── apps/
│   └── web/                     # Next.js 15 web application
│       ├── app/
│       │   ├── (auth)/          # Login pages (no sidebar)
│       │   ├── (portal)/        # Authenticated client portal
│       │   │   └── projects/    # Project pages (tabbed navigation)
│       │   └── partner/         # Partner portal (Crystal Ice theme)
│       ├── components/          # React components
│       └── lib/                 # Utilities and tRPC
├── packages/
│   ├── spec-engine/             # OpenAPI/AsyncAPI processing
│   ├── mockgen/                 # Mock server generation
│   ├── validator/               # Request/response validation
│   ├── orchestrator/            # RBAC and workflow
│   ├── testkit/                 # Test runner and assertions
│   └── connectors/              # Slack & Jira integrations
└── prisma/                      # Database schema
```

### Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- React 18
- Tailwind CSS 3
- tRPC 11
- Lucide Icons

**Backend:**
- tRPC API
- Prisma ORM
- PostgreSQL (production)
- In-memory store (demo)

**Packages:**
- TypeScript 5
- Zod validation
- Express (mock servers)
- Swagger Parser

---

## 🧪 Golden Test Suites

10 comprehensive test categories covering:

1. 🔒 **Authentication** (5 tests) - OAuth, API keys, JWT
2. 🔄 **Idempotency** (3 tests) - Duplicate request handling
3. ⚡ **Rate Limiting** (4 tests) - Throttling and quotas
4. ❌ **Error Handling** (6 tests) - Error responses and codes
5. 🔔 **Webhooks** (4 tests) - Event delivery and retries
6. 📄 **Pagination** (3 tests) - Cursor and offset pagination
7. 🔍 **Filtering** (4 tests) - Query parameters and search
8. 🔢 **Versioning** (2 tests) - API version compatibility
9. 🌐 **CORS** (3 tests) - Cross-origin policies
10. 🛡️ **Security Headers** (4 tests) - CSP, HSTS, etc.

**Total: 38 automated tests**

---

## 📚 Documentation

- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - How to test all features
- **[BUILD_COMPLETE.md](./BUILD_COMPLETE.md)** - Core packages implementation
- **[UI_COMPLETE.md](./UI_COMPLETE.md)** - Web application details
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide
- **[EXAMPLES.md](./EXAMPLES.md)** - Code usage examples
- **[docs/partner-portal.md](./docs/partner-portal.md)** - Partner portal documentation

---

## 🎯 Sample API Specs

### Stripe Payment API
- 12 endpoints (charges, customers)
- Full OpenAPI 3.0 specification
- Authentication, webhooks, error handling

### Todo API
- 5 CRUD endpoints
- Simple REST API
- Perfect for testing

---

## 🔮 Roadmap (Next Steps)

1. **Mock Lifecycle Controls** – shared port pooling and health indicators for long-running mocks.
2. **Golden Test Insights** – deeper per-case artifacts, diffs, and history.
3. **Plan Board Configuration** – enable/disable phases per integration scope and capture scenario/benchmark requirements.
4. **Telemetry & Evidence** – expand trace emitters and auto-advance plan/report metrics based on project criteria.
5. **SDK & Spec Sync** – allow the telemetry SDK/webhook bridge to push OpenAPI updates + runtime events.

---

## 🔧 Development

### Build Packages

```bash
# Build all packages sequentially
pnpm build:packages

# Build specific package
pnpm -C packages/spec-engine build
```

### Run Tests

```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm -C packages/mockgen test
```

### Database

```bash
# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Open Prisma Studio
pnpm prisma:studio
```

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel
```

### Docker

```bash
# Build image
docker build -t integration-copilot .

# Run container
docker run -p 3000:3000 integration-copilot
```

### Environment Variables

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://..."
```

See `.env.example` for full list.

---

## 📊 Project Stats

- **Total Code:** ~10,000 lines
- **Packages:** 6 core packages
- **Components:** 20+ React components
- **Tests:** 38 golden tests
- **Documentation:** 2,500+ lines

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [tRPC](https://trpc.io/)
- [Prisma](https://www.prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

---

**Made with ❤️ for API Integration Teams**
