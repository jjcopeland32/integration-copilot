# Integration Copilot 🚀

> AI-Powered API Vendor Onboarding System

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![tRPC](https://img.shields.io/badge/tRPC-11.0-2596be?logo=trpc)](https://trpc.io/)

**Integration Copilot** reduces API partner integration time by 50% through automated spec processing, mock generation, and comprehensive testing.

---

## Value Proposition

**Cut partner onboarding time by 50%** by turning specs into customer-scoped blueprints, hosted mocks with golden tests, live validation with traces, and executive go-live reports.

### Target Outcomes

| Metric | Target |
|--------|--------|
| Time-to-first-successful-call (TTFSC) | ≤ 24 hours |
| Time-to-certification | ↓ ≥50% |
| Spec-question support tickets | ↓ ≥40% |
| Partner golden test pass rate | >90% by week 2 |

---

## Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **OpenAPI/AsyncAPI Import** | Load and normalize API specifications |
| **Blueprint Generation** | Auto-generated integration documentation per spec |
| **Mock Server Automation** | Express mocks with latency/rate-limit simulation |
| **Golden Tests** | 10 suites (38 tests) covering auth, idempotency, webhooks, etc. |
| **Trace Validation** | Request/response validation with PII redaction |
| **Plan Board** | 5-phase integration roadmap (Auth → Core → Webhooks → UAT → Cert) |
| **Readiness Reports** | Auto-generated go-live assessments with risk scoring |

### Dual Portal Architecture

| Portal | Theme | Purpose |
|--------|-------|---------|
| **Client Portal** | Enterprise Glass | Vendor configuration, governance, oversight |
| **Partner Portal** | Crystal Ice | Partner execution, debugging, self-service |

### Project-Centric Navigation

All functionality is organized under projects:

```
/projects                      # Project list
/projects/[id]                 # Project overview (tabbed navigation)
/projects/[id]/specs           # API specifications
/projects/[id]/mocks           # Mock servers
/projects/[id]/tests           # Golden test suites
/projects/[id]/traces          # Request/response traces
/projects/[id]/plan            # Integration plan board
/projects/[id]/reports         # Readiness reports
```

---

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 14+ (or use included Docker Compose)

### Installation

```bash
# Clone the repository
git clone https://github.com/jjcopeland32/integration-copilot.git
cd integration-copilot

# Install dependencies (runs workspace bootstrap)
pnpm install

# Ensure packages, Prisma client, and local Postgres are ready
pnpm ensure:workspace --with-db

# Start development server
pnpm dev
```

### Sign In

Open [http://localhost:3000](http://localhost:3000) and sign in with:
- **Email:** `demo@integration.local`
- **Password:** `demo123`

---

## Usage Flow

### 1. Create or Select a Project
Navigate to `/projects` and create a new project or select an existing one.

### 2. Load API Specs
In the **Specs** tab, click **Load Sample Specs** to import Stripe-style Payments + Todo APIs.

### 3. Generate Mocks & Tests
On the **Overview** tab, click **Generate Mock & Tests**. This:
- Spins up Express mock servers
- Generates golden test suites
- Stores everything in Prisma

### 4. Run Golden Tests
In the **Tests** tab, run individual suites or **Run All Tests**. Results persist and emit telemetry traces.

### 5. Track Progress
- **Traces** – Request/response logs
- **Plan** – 5-phase integration roadmap
- **Reports** – Auto-generated readiness assessments

---

## Golden Test Suites

10 comprehensive test categories:

| Category | Tests | Coverage |
|----------|-------|----------|
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

**Total: 38 automated tests**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Next.js 15 Web App                         │
│              (React UI + tRPC API Routes)                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
│ Orchestrator │ │  Validator  │ │ Connectors │
│  - RBAC      │ │  - Validate │ │  - Slack   │
│  - Plan Board│ │  - Trace    │ │  - Jira    │
│  - Reports   │ │  - Security │ │            │
└──────┬───────┘ └──────┬──────┘ └────────────┘
       │                │
       │         ┌──────▼──────┐
       │         │ Spec Engine │
       │         │  - Normalize│
       │         │  - Blueprint│
       └─────────┤             │
                 └──────┬──────┘
                        │
                 ┌──────▼──────┐
                 │   Mockgen   │
                 │  - Mock API │
                 │  - Tests    │
                 │  - Postman  │
                 └─────────────┘
```

### Monorepo Structure

```
integration-copilot/
├── apps/web/                    # Next.js 15 application
│   ├── app/(auth)/              # Login pages
│   ├── app/(portal)/            # Client portal (project-centric)
│   └── app/partner/             # Partner portal
├── packages/
│   ├── spec-engine/             # OpenAPI/AsyncAPI processing
│   ├── mockgen/                 # Mock server + test generation
│   ├── validator/               # Request/response validation
│   ├── orchestrator/            # RBAC, plan board, reports
│   ├── testkit/                 # Test runner
│   └── connectors/              # Slack & Jira integrations
└── prisma/                      # Database schema
```

### Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 15, React 18, Tailwind CSS 3, tRPC 11 |
| **Backend** | tRPC, Prisma ORM, PostgreSQL |
| **Packages** | TypeScript 5, Zod, Express (mocks), Swagger Parser |

---

## Development

### Build Packages

```bash
# Build all packages in dependency order
pnpm build:packages

# Build specific package
pnpm -C packages/spec-engine build
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

### Testing

```bash
# Run all tests
pnpm test

# Run golden tests via CLI
pnpm testkit:run
```

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Quick Deploy (Vercel)

```bash
pnpm add -g vercel
cd apps/web
vercel --prod
```

### Docker

```bash
docker build -t integration-copilot .
docker run -p 3000:3000 --env-file .env integration-copilot
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment guide |
| [EXAMPLES.md](./EXAMPLES.md) | Code usage examples |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Feature testing instructions |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Technical deep-dive |
| [docs/ISSUE_TRACKER.md](./docs/ISSUE_TRACKER.md) | Remaining work items |
| [docs/partner-portal.md](./docs/partner-portal.md) | Partner portal architecture |
| [docs/API_CONTRACTS.md](./docs/API_CONTRACTS.md) | tRPC API surface |
| [docs/PRODUCT_STRATEGY.md](./docs/PRODUCT_STRATEGY.md) | GTM strategy & positioning |

---

## Roadmap

See [docs/ISSUE_TRACKER.md](./docs/ISSUE_TRACKER.md) for the authoritative list. Key priorities:

1. **Environment Configuration** – Easy UAT/Sandbox pointing
2. **Per-API Test Profiles** – Required/Optional/N/A per capability
3. **Partner Playground** – Freeform payload editing
4. **AI Assistant** – Failure explanation and guidance
5. **Blueprint Annotations** – Tribal knowledge capture

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Made with ❤️ for API Integration Teams**
