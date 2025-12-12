# Integration Copilot - Quick Start Prompts

**Purpose:** Copy-paste ready prompts for Claude Code. Use these for fastest execution.

**Prerequisites:** Clone the repository and ensure pnpm install completes successfully.

---

## PROMPT 1: Environment Model (P0.1)

```
I'm working on Integration Copilot, an API vendor onboarding platform. The codebase is a Next.js 15 monorepo with Prisma ORM at apps/web/prisma/schema.prisma and tRPC routers at apps/web/lib/trpc/routers/.

Currently, tests only run against auto-generated mocks. I need partners to test against real vendor environments (Sandbox/UAT).

Please:
1. Add an Environment model to the Prisma schema with:
   - id (cuid), projectId (relation), name, type (enum: MOCK/SANDBOX/UAT/PRODUCTION)
   - baseUrl (nullable), authType (enum: NONE/API_KEY/OAUTH2/BASIC), credentials (Json), headers (Json)
   - isDefault, isActive, timestamps

2. Create migration

3. Create apps/web/lib/trpc/routers/environment.ts with CRUD operations:
   - list, create, update, delete, setDefault, testConnection
   - All procedures must be protected and org-scoped via project.orgId
   - Never return raw credentials in responses

4. Export from apps/web/lib/trpc/routers/index.ts

Run prisma generate after schema changes.
```

---

## PROMPT 2: Environment UI (P0.2)

```
Continuing Integration Copilot work. The Environment model exists in Prisma.

Please create the environment management UI:

1. apps/web/app/(portal)/projects/[id]/environments/page.tsx
   - List environments with status (🟢 Active, 🔴 Inactive)
   - Add/Edit/Delete actions
   - "Test Connection" button
   - Default environment indicator

2. apps/web/components/environments/environment-form.tsx
   - Type selector, name, baseUrl
   - Dynamic auth fields based on authType
   - Custom headers as key-value pairs
   - Form validation with zod

3. apps/web/components/environments/environment-selector.tsx
   - Reusable dropdown for selecting environment
   - Icons per type (mock=🔧, sandbox=🧪, uat=✅)
   - "Mock (Built-in)" always available
   - Persist selection to localStorage

4. Update apps/web/app/(portal)/projects/[id]/layout.tsx to add "Environments" tab

Use existing shadcn components from apps/web/components/ui/. Match the Enterprise Glass theme (frosted glass cards, indigo accents).
```

---

## PROMPT 3: Test Profile Schema (P0.3)

```
Continuing Integration Copilot. We have 10 golden test categories but not all APIs need all categories (read-only APIs don't need idempotency tests).

Please:

1. Add to Prisma schema:
   - TestProfile model (specId, apiGroup, categorySettings as Json, detectedCapabilities as Json)
   - TestCategoryStatus enum (REQUIRED, OPTIONAL, NA, AUTO)

2. Create packages/spec-engine/src/capability-detector.ts:
   - detectCapabilities(normalizedSpec) function
   - Detect: hasIdempotency (Idempotency-Key header), hasPagination (page/limit params), hasWebhooks (callbacks), hasWriteOperations (POST/PUT/DELETE), hasAuth (securitySchemes)

3. Create packages/spec-engine/src/profile-defaults.ts:
   - Map capabilities to default test profile
   - !hasWriteOperations → Idempotency = NA
   - !hasWebhooks → Webhook tests = NA

4. Update packages/spec-engine/src/normalizer.ts:
   - Call capability detection during normalization
   - Group endpoints by first path segment

5. Create apps/web/lib/trpc/routers/test-profile.ts:
   - getBySpec, update, resetToDefaults, getCategories

Run prisma migrate dev after schema changes.
```

---

## PROMPT 4: Test Profile UI (P0.4)

```
Continuing Integration Copilot. TestProfile model and capability detection exist.

Please create the vendor UI for configuring test profiles:

1. apps/web/components/specs/test-profile-config.tsx:
   - Grouped by API group (e.g., "Payments API")
   - Table: Category | Detected | Setting | Description
   - Setting dropdown: Required ✓ | Optional ○ | N/A ✗ | Auto 🔄
   - Visual indicators (green check, yellow circle, gray X, blue arrows)
   - Tooltips explaining each category
   - "Reset to Defaults" button
   - Save changes via tRPC

2. apps/web/lib/test-categories.ts:
   - Export TEST_CATEGORIES constant with name, description, icon, defaultRequired for all 10 categories:
     AUTHENTICATION, CREATE_RESOURCE, IDEMPOTENCY, INVALID_INPUT, WEBHOOK, RATE_LIMITING, TIMEOUT, REFUND_REVERSAL, RETRY_LOGIC, INVALID_PARAMETER

3. Update apps/web/app/(portal)/projects/[id]/specs/page.tsx:
   - Add collapsible "Test Profile" section below endpoint list
   - Show summary: "3 Required, 5 Optional, 2 N/A"
```

---

## PROMPT 5: Test Runner Integration (P0.5)

```
Continuing Integration Copilot. Environment model and test profiles exist.

Please update the test runner to use environments and profiles:

1. Update packages/testkit/src/runner.ts:
   - Accept TestRunnerConfig with environment (type, baseUrl, auth, headers) and testProfile (categorySettings, detectedCapabilities)
   - Filter test cases by applicable categories (skip NA)
   - Mark OPTIONAL failures as warnings
   - Apply auth credentials to requests

2. Create packages/testkit/src/auth-handler.ts:
   - getAuthHeaders(authConfig): Return headers for API_KEY/OAUTH2/BASIC
   - refreshOAuthToken(config): Handle token refresh

3. Create/update apps/web/lib/trpc/routers/test.ts:
   - runTests(specId, environmentId): Decrypt creds, call runner, store results
   - getRunStatus(runId): Poll for completion
   - getRunResults(runId): Get detailed results

4. Update packages/mockgen/src/golden-tests.ts:
   - Add category property to each test case (AUTHENTICATION, IDEMPOTENCY, etc.)

5. Create packages/testkit/src/results.ts:
   - Aggregate results by category
   - Calculate pass rates
   - Identify blocking failures (REQUIRED category failures)
```

---

## PROMPT 6: Partner Playground (P1.1 + P1.2)

```
Continuing Integration Copilot. I need a playground for partners to experiment with API calls.

Please create:

1. apps/web/app/partner/playground/page.tsx:
   - Layout: Endpoint selector + Environment selector at top
   - Left panel: Request editor (headers, body)
   - Right panel: Response display
   - Bottom: Validation results

2. apps/web/components/playground/endpoint-selector.tsx:
   - Dropdown grouped by path prefix
   - Shows method badge (GET=green, POST=blue)
   - Search/filter
   - On select: Load example from spec

3. apps/web/components/playground/request-editor.tsx:
   - JSON editor with syntax highlighting (Monaco Editor)
   - Headers editor (key-value)
   - Path params inline editing
   - "Reset to Example" button

4. apps/web/components/playground/response-display.tsx:
   - Status code with color
   - Response time
   - Collapsible headers
   - JSON body with highlighting
   - "Copy as cURL" button

5. apps/web/components/playground/validation-panel.tsx:
   - Real-time validation (debounced)
   - Status: ✅ Valid | ⚠️ Warnings | ❌ Errors
   - Error list with JSON path and expected vs actual

6. apps/web/lib/trpc/partner/routers/playground.ts:
   - getEndpoints, getEndpointDetails, validateRequest, executeRequest

7. Update apps/web/app/partner/layout.tsx to add Playground nav item

Use react-monaco-editor for the JSON editor.
```

---

## PROMPT 7: AI Assistant Backend (P1.3 + P1.4)

```
Continuing Integration Copilot. The AI assistant should replace Zoom calls for partner debugging.

Please create:

1. apps/web/lib/ai/config.ts:
   - AI_CONFIG with provider, model, maxTokens, temperature
   - Support Anthropic and OpenAI

2. apps/web/lib/ai/client.ts:
   - Wrapper for both Anthropic and OpenAI APIs
   - Streaming support
   - Rate limiting and usage logging

3. apps/web/lib/ai/prompts.ts:
   - PROMPTS.TROUBLESHOOT_FAILURE: Template with spec, test results, traces, annotations context
   - PROMPTS.EXPLAIN_ENDPOINT
   - PROMPTS.SUGGEST_NEXT_STEPS

4. apps/web/lib/ai/context-builder.ts:
   - buildContext(partnerProjectId, userMessage): Returns specSummary, recentTraces, latestTestRun, relevantAnnotations, currentPhase

5. apps/web/lib/ai/spec-summarizer.ts:
   - Summarize spec to ~2000 tokens
   - Focus on relevant endpoints

6. Add to Prisma schema:
   - AIConversation (id, partnerProjectId, messages, timestamps)
   - AIMessage (id, conversationId, role, content, contextUsed, tokensUsed, timestamp)

7. apps/web/lib/trpc/partner/routers/ai.ts:
   - chat(message, conversationId?): Build context, call AI, stream response, log
   - getConversationHistory(conversationId, limit)
   - suggestQuestions(): Based on recent failures

8. apps/web/lib/ai/rate-limiter.ts:
   - 20 messages/hour per partner
   - 100 messages/day per project
```

---

## PROMPT 8: AI Assistant Frontend (P1.5)

```
Continuing Integration Copilot. AI backend exists.

Please create the partner-facing AI chat interface:

1. apps/web/components/partner/ai-assistant-panel.tsx:
   - Slide-out panel from right
   - Toggle button in bottom-right (Cmd+K to open)
   - Chat message list
   - Input with send button
   - Suggested questions above input
   - Clear conversation option
   - Loading indicator (typing animation)

2. apps/web/components/partner/ai-message.tsx:
   - User messages right-aligned
   - Assistant messages left-aligned with avatar
   - Markdown rendering
   - Code blocks with syntax highlighting and copy button
   - Clickable spec section links
   - "Retry" on failed messages

3. apps/web/components/partner/suggested-questions.tsx:
   - 3-4 contextual suggestions
   - Click to send
   - Based on recent failures and current page

4. apps/web/lib/ai/page-context.ts:
   - getPageSuggestions(pathname, pageData): Return relevant questions based on current route

5. apps/web/hooks/useAIChat.ts:
   - Manage conversation state
   - Handle streaming responses
   - Track rate limits

6. Update apps/web/app/partner/layout.tsx:
   - Add AIAssistantPanel
   - Manage open/closed state

Match Crystal Ice theme (dark aurora, cyan/purple gradients).
```

---

## PROMPT 9: Blueprint Annotations (P1.6 + P1.7 + P1.8)

```
Continuing Integration Copilot. Annotations capture tribal knowledge like "OAuth v3 elevated scope for transactions > $10K".

Please create:

1. Add to Prisma schema:
   - Annotation model: id, specId, path, method?, field?, type (AUTH_NOTE/FIELD_NOTE/ERROR_NOTE/CONDITION_NOTE/EXAMPLE_NOTE/WARNING), condition?, message, severity (INFO/WARNING/CRITICAL), createdBy, keywords[], errorCodes[], timestamps

2. apps/web/lib/trpc/routers/annotation.ts:
   - create, update, delete, listBySpec, listByEndpoint, search(keyword/errorCode)

3. Update packages/spec-engine/src/blueprint.ts:
   - Include annotations in output
   - Add to markdown and JSON exports

4. apps/web/components/annotations/annotation-form.tsx:
   - Type selector with icons
   - Path/method/field dropdowns (from spec)
   - Condition, message (markdown), severity
   - Error codes field
   - Preview mode

5. apps/web/components/annotations/annotation-list.tsx:
   - Grouped by endpoint
   - Expandable cards
   - Edit/Delete actions
   - Filter by type, search

6. apps/web/components/annotations/inline-annotation.tsx:
   - Small badge next to annotated items
   - Hover preview, click expand

7. Update apps/web/app/(portal)/projects/[id]/specs/page.tsx:
   - Add "Annotations" section with count
   - "Add Annotation" button
   - Show suggestions for common failures

8. Update apps/web/components/playground/request-editor.tsx:
   - Show annotation icons next to annotated fields
   - Tooltips with annotation content

9. Update apps/web/lib/ai/context-builder.ts:
   - Include relevant annotations in AI context
```

---

## PROMPT 10: Production Hardening (PROD.1-5)

```
Continuing Integration Copilot. Final production hardening.

Please implement:

1. Error Handling:
   - apps/web/components/error-boundary.tsx: Catch React errors, show friendly message
   - apps/web/lib/logger.ts: Structured logging with pino, JSON format, request ID tracking
   - Wrap root layout in error boundary

2. Security:
   - Update apps/web/middleware.ts with rate limiting (100 req/min per IP)
   - Update next.config.js with security headers (CSP, X-Frame-Options, HSTS, etc.)

3. Database:
   - Add indexes to Prisma schema:
     - Trace: @@index([projectId, createdAt]), @@index([endpoint, statusCode])
     - Annotation: @@index([specId, path, method]), @@index([errorCodes])
   - Configure connection pooling for serverless

4. Health Checks:
   - apps/web/app/api/health/route.ts: Check DB, return status JSON
   - apps/web/app/api/ready/route.ts: For load balancer

5. Environment Validation:
   - apps/web/lib/env.ts: Zod schema validating all env vars
   - Fail fast on startup with clear errors
   - Update .env.example with all variables documented

Run prisma migrate dev after index changes.
```

---

## Quick Commands Reference

```bash
# After any Prisma schema changes
pnpm prisma generate
pnpm prisma migrate dev --name <migration_name>

# Build all packages
pnpm build:packages

# Run development server
pnpm dev

# Type check
pnpm typecheck

# Lint
pnpm lint
```

---

## Success Criteria

After completing all prompts, verify:

1. **Environment Configuration**: Can create Sandbox/UAT environments and run tests against them
2. **Test Profiles**: Can mark test categories as Required/Optional/N/A per API
3. **Partner Playground**: Partners can send test requests with validation feedback
4. **AI Assistant**: Partners can ask questions and get contextual answers
5. **Annotations**: Vendors can add notes that surface to partners
6. **Production Ready**: Health checks pass, security headers present, errors handled gracefully
