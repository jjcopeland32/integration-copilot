# Integration Copilot - Deployment Guide

## Build Order Issue & Solution

The packages have interdependencies that require sequential building:

```
spec-engine (no deps) → mockgen (depends on spec-engine) → validator → orchestrator → web
```

### Correct Build Command

```bash
# Build packages in dependency order
pnpm -C packages/spec-engine build && \
pnpm -C packages/mockgen build && \
pnpm -C packages/validator build && \
pnpm -C packages/orchestrator build && \
pnpm -C packages/connectors build
```

Or use this single command:

```bash
pnpm build:packages
```

Add this to root `package.json`:

```json
{
  "scripts": {
    "build:packages": "pnpm -C packages/spec-engine build && pnpm -C packages/mockgen build && pnpm -C packages/validator build && pnpm -C packages/orchestrator build && pnpm -C packages/connectors build",
    "build": "pnpm build:packages && pnpm -C apps/web build"
  }
}

## Mock Server Runtime

Mock instances now spin up real Express servers whenever you generate or start a mock in the UI. Each instance:

- Runs inside the Next.js process via `apps/web/lib/mock-server-manager.ts`
- Listens on incremental ports (3001+) based on how many mocks exist per project
- Persists its configuration (routes + Postman collection + runtime settings) in Prisma

### Production Considerations

| Concern | Recommendation |
|---------|----------------|
| **Process restarts** | Ensure your process manager (PM2, systemd, Vercel function reloader, etc.) can gracefully restart mocks or move them into a dedicated worker service. |
| **Port allocation** | For multi-tenant hosts, consider proxying mocks behind a path-based router or use dynamic subdomains instead of raw ports. |
| **Cleanup** | Provide delete/reset controls (coming soon) or schedule a cron job to prune stale `MockInstance` rows so ports don’t accumulate. |
| **Telemetry** | Pipe mock server logs into your central logging stack to monitor traffic and trace issues. |
```

## Quick Start

### 1. Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 14+

### 2. Installation

```bash
# Clone or extract the buildpack
cd integration-copilot

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup

```bash
# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Optional: Seed database
pnpm -C tools seed
```

### 4. Build

```bash
# Build all packages in correct order
pnpm build:packages

# Or build individually
pnpm -C packages/spec-engine build
pnpm -C packages/mockgen build
pnpm -C packages/validator build
pnpm -C packages/orchestrator build
pnpm -C packages/connectors build
```

### 5. Development

```bash
# Start Next.js dev server
pnpm dev

# Or run individual package in watch mode
pnpm -C packages/spec-engine dev
```

## Environment Configuration

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/integration_copilot

# Authentication
AUTH_SECRET=your-secret-key-minimum-32-characters
```

### Optional Variables

```bash
# Feature Flags
FEATURE_MOCK_SERVICE=true
FEATURE_GOLDEN_TESTS=true
FEATURE_VALIDATOR=true
FEATURE_PLAN_BOARD=true
FEATURE_READINESS_REPORTS=true

# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_ENABLED=false

# Jira Integration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=PROJ
JIRA_ENABLED=false

# Security
WEBHOOK_SECRET=your-webhook-secret-change-in-production
TRACE_SIGNING_SECRET=your-trace-secret-change-in-production
ENABLE_REDACTION=true
REDACTION_FIELDS=password,token,secret,ssn,creditCard,api_key

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

## Production Deployment

### Docker Deployment (Recommended)

Create `Dockerfile`:

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json ./packages/
COPY apps/*/package.json ./apps/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build:packages
RUN pnpm -C apps/web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "apps/web/server.js"]
```

Build and run:

```bash
docker build -t integration-copilot .
docker run -p 3000:3000 --env-file .env integration-copilot
```

### Vercel Deployment

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
cd apps/web
vercel --prod
```

Configure environment variables in Vercel dashboard.

### Railway/Render Deployment

1. Connect your Git repository
2. Set build command: `pnpm build:packages && pnpm -C apps/web build`
3. Set start command: `pnpm -C apps/web start`
4. Add environment variables
5. Deploy

## Database Migrations

### Create Migration

```bash
pnpm prisma:migrate dev --name add_new_feature
```

### Apply Migrations in Production

```bash
pnpm prisma:migrate deploy
```

### Reset Database (Development Only)

```bash
pnpm prisma:migrate reset
```

## Monitoring & Logging

### Health Check Endpoint

The app exposes a health check at `/api/health`:

```bash
curl http://localhost:3000/api/health
```

### Logs

Application logs are written to stdout. In production, use a log aggregation service:

- **Vercel**: Built-in log streaming
- **Railway**: Built-in logs
- **Docker**: Use `docker logs` or logging driver
- **Self-hosted**: Configure log rotation with `logrotate`

### Metrics

Key metrics to monitor:

- Request latency (p50, p95, p99)
- Error rate
- Database connection pool
- Mock service uptime
- Test pass rate
- Trace ingestion rate

## Troubleshooting

### Build Failures

**Issue:** `Cannot find module '@integration-copilot/spec-engine'`

**Solution:** The workspace bootstrapper now builds any missing package output automatically. It runs as part of `pnpm install`/`pnpm dev`, but you can trigger it manually:
```bash
pnpm ensure:workspace
```

**Issue:** Prisma client not generated

**Solution:** Prisma generation is now baked into the workspace bootstrap/build scripts. If you need to re-run it explicitly:
```bash
pnpm prisma:generate
```

### Runtime Errors

**Issue:** Database connection failed

**Solution:** `.env` now ships with a local Postgres configuration and `pnpm dev` ensures the dockerized database is running (`pnpm ensure:workspace --with-db`). If it is stopped, bring it back with:
```bash
docker compose up -d db
```

**Issue:** Mock server not starting

**Solution:** The mock server now auto-selects the next available port if 3001 is busy and logs the actual port that was used.

### Performance Issues

**Issue:** Slow spec processing

**Solution:** Spec normalization now includes an in-memory LRU cache (5-minute TTL by default). No additional action is required, but you can tune it via `new SpecNormalizer({ cacheSize, ttlMs })` if needed.

## Backup & Recovery

### Database Backup

```bash
# Backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

### File Storage Backup

If using S3 for evidence/reports:

```bash
aws s3 sync s3://your-bucket ./backup/
```

## Security Checklist

- [ ] Change all default secrets in `.env`
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up WAF (Web Application Firewall)
- [ ] Enable audit logging
- [ ] Configure PII redaction
- [ ] Set up webhook signature verification
- [ ] Enable database encryption at rest
- [ ] Configure backup retention policy
- [ ] Set up monitoring and alerting
- [ ] Review and update dependencies regularly

## Scaling

### Horizontal Scaling

The application is stateless and can be scaled horizontally:

```bash
# Docker Compose
docker-compose up --scale web=3

# Kubernetes
kubectl scale deployment integration-copilot --replicas=3
```

### Database Scaling

- Use connection pooling (PgBouncer)
- Enable read replicas for reporting
- Consider partitioning large tables (traces, test_runs)

### Caching

Add Redis for:
- Spec normalization cache
- Session storage
- Rate limiting
- Blueprint cache

## Support

For issues or questions:
1. Check [BUILD_COMPLETE.md](./BUILD_COMPLETE.md)
2. Review [EXAMPLES.md](./EXAMPLES.md)
3. Examine PROMPTS sequence

---

**Last Updated:** 2025-11-03  
**Version:** 1.0.0
