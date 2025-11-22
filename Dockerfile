FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/connectors/package.json ./packages/connectors/
COPY packages/mockgen/package.json ./packages/mockgen/
COPY packages/orchestrator/package.json ./packages/orchestrator/
COPY packages/spec-engine/package.json ./packages/spec-engine/
COPY packages/testkit/package.json ./packages/testkit/
COPY packages/validator/package.json ./packages/validator/
COPY tools ./tools
ENV SKIP_ENSURE_WORKSPACE=1
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app /app
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
