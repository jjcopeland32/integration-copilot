# Integration Copilot — Web App
## Quickstart
1) `pnpm install`
2) Copy `.env.example` to `.env.local` at repo root and set DATABASE_URL (or skip Prisma for now).
3) `pnpm dev` (runs Next.js at http://localhost:3000)
4) Open `/docs` to view project docs; POST to `/api/trace` to test ingest.

> Note: Prisma models are in `/prisma/schema.prisma`. Run `pnpm prisma:migrate` when ready.