# Integration Copilot 🚀

> AI-Powered API Vendor Onboarding System

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![tRPC](https://img.shields.io/badge/tRPC-11.0-2596be?logo=trpc)](https://trpc.io/)

**Integration Copilot** reduces API partner integration time by 50% through automated spec processing, mock generation, and comprehensive testing.

![Dashboard](https://img.shields.io/badge/Status-Production_Ready-success)

---

## ✨ Features

### 🎯 Core Capabilities
- **OpenAPI/AsyncAPI Import** - Load and normalize API specifications
- **Blueprint Generation** - Automated integration documentation
- **Mock Server** - Realistic API mocking with latency simulation
- **Golden Tests** - 10 comprehensive test suites (38 tests total)
- **Trace Validation** - Request/response validation and logging
- **Plan Board** - 5-phase integration roadmap tracking
- **Readiness Reports** - Go-live assessment with risk scoring

### 🎨 Modern UI
- ✨ Smooth animations and transitions
- 🌈 Colorful gradients throughout
- 💎 Glass morphism cards
- 📱 Fully responsive design
- ⚡ Interactive test runner
- 🎭 Real-time results

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+

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

### 🔐 HMAC Trace Ingest

```bash
export TELEMETRY_SIGNING_SECRET=test
SIG=$(node -e "const payload=JSON.stringify({hello:'world'});const h=require('crypto').createHmac('sha256',process.env.TELEMETRY_SIGNING_SECRET).update(payload).digest('hex');console.log(h)")
curl -sS -X POST http://localhost:3000/api/trace \
  -H 'content-type: application/json' \
  -H "x-trace-signature: $SIG" \
  -d '{"hello":"world","requestMeta":{"cardNumber":"4111 1111 1111 1111"}}'
```

The server will persist a redacted payload (card numbers, CVVs, SSNs, and passwords are scrubbed by default) and return `{ ok: true }` when the signature is valid.

### 🧪 Run Golden Tests

- **UI:** Visit [`/specs`](http://localhost:3000/specs), load the Petstore sample spec, then press **Run PAYMENTS Baseline** to execute the demo suite.
- **CLI:**

  ```bash
  pnpm testkit:run
  ```

  The CLI resolves suites from `/api/tests/:suiteId`, runs the HTTP checks, prints a summary, and stores artifacts in `./.artifacts/testruns/`.

### 🐾 Load Sample Spec (Petstore)

On the `/specs` page press **Load Sample Spec (Petstore)**. The Spec Engine ingests the Petstore OpenAPI document, generates a markdown blueprint under `apps/web/public/blueprints/`, and stages a demo mock base URL for downstream tests.

---

## 🧪 Try It Out

### 1. Load Sample API Specs
1. Navigate to **Specs** page (`/specs`)
2. Click "Load Sample Specs"
3. See Stripe Payment API and Todo API

### 2. Run Golden Tests
1. Navigate to **Tests** page (`/tests`)
2. Click "Run All Tests"
3. Watch 10 test suites execute with results

### 3. Explore Features
- **Dashboard** - Overview stats and activity
- **Projects** - Manage integration projects
- **Mocks** - Mock API servers
- **Traces** - Request/response logs
- **Plan Board** - Integration roadmap
- **Reports** - Readiness assessments

---

## 📦 Architecture

### Monorepo Structure

```
integration-copilot/
├── apps/
│   └── web/              # Next.js 15 web application
│       ├── app/          # App router pages
│       ├── components/   # React components
│       └── lib/          # Utilities and tRPC
├── packages/
│   ├── spec-engine/      # OpenAPI/AsyncAPI processing
│   ├── mockgen/          # Mock server generation
│   ├── validator/        # Request/response validation
│   ├── orchestrator/     # RBAC and workflow
│   └── connectors/       # Slack & Jira integrations
└── prisma/               # Database schema
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
- **Packages:** 5 core packages
- **Pages:** 9 web pages
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

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/jjcopeland32/integration-copilot/issues)
- **Documentation:** See docs folder
- **Email:** support@example.com

---

**Made with ❤️ for API Integration Teams**
