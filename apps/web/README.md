# Integration Copilot — Web App
## Quickstart
1) `pnpm install`
2) Copy `.env.example` to `.env.local` at repo root and set `DATABASE_URL` (Postgres powers specs/mocks/tests/plan/report)
3) `pnpm dev` (runs Next.js at http://localhost:3000 and spins up mock servers as you generate them)
4) Visit `/projects` → Create or select a project → Go to the **Specs** tab → **Load Sample Specs** → **Generate Mock & Tests** to light up the workspace, then explore the **Tests**, **Plan**, and **Reports** tabs

> Prisma models live in `/prisma/schema.prisma`. Run `pnpm prisma:migrate` whenever you change the schema; mock/test automation relies on those tables being up to date.
