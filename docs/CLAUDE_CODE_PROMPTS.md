# Integration Copilot - Claude Code Prompts for Production Readiness

**Purpose:** Complete set of prompts for Claude Code to finish Integration Copilot to production-ready state.

**Usage:** Execute these prompts in order within each priority level. Each prompt is self-contained with all necessary context.

---

## Table of Contents

1. [P0 - Critical for GTM](#p0---critical-for-gtm)
   - P0.1: Environment Configuration Model
   - P0.2: Environment Switcher UI
   - P0.3: Per-API Test Profiles - Schema & Detection
   - P0.4: Per-API Test Profiles - Vendor Configuration UI
   - P0.5: Test Runner Environment Integration
   - P0.6: Trace Visibility Enhancements

2. [P1 - High Impact](#p1---high-impact)
   - P1.1: Partner Playground - Core Implementation
   - P1.2: Partner Playground - Validation & Response Display
   - P1.3: AI Assistant - Backend Infrastructure
   - P1.4: AI Assistant - Context Builder
   - P1.5: AI Assistant - Frontend Integration
   - P1.6: Blueprint Annotations - Schema & API
   - P1.7: Blueprint Annotations - Vendor UI
   - P1.8: Blueprint Annotations - Partner Surface
   - P1.9: Parameterized Test Templates

3. [P2 - Important](#p2---important)
   - P2.1: OAuth Provider Setup (GitHub/Google)
   - P2.2: User Invite Workflow
   - P2.3: Mock Lifecycle Management
   - P2.4: Golden Test Insights - Per-Case Display
   - P2.5: Slack Integration Wiring
   - P2.6: Jira Integration Wiring
   - P2.7: Project Settings Page

4. [P3 - Nice to Have](#p3---nice-to-have)
   - P3.1: Spec Webhook Receiver
   - P3.2: Failure Pattern Analytics
   - P3.3: PDF Report Export
   - P3.4: E2E Testing Setup

5. [Production Hardening](#production-hardening)
   - PROD.1: Error Boundaries & Logging
   - PROD.2: Rate Limiting & Security Headers
   - PROD.3: Database Indexing & Optimization
   - PROD.4: Health Check Endpoints
   - PROD.5: Environment Variable Validation

---

## P0 - Critical for GTM

### P0.1: Environment Configuration Model

```
CONTEXT:
Integration Copilot is an API vendor onboarding platform. Currently, tests only run against auto-generated mock servers. For production use, partners need to test against vendor Sandbox and UAT environments.

PROJECT STRUCTURE:
- Monorepo with pnpm workspaces
- Database: PostgreSQL with Prisma ORM
- Schema location: apps/web/prisma/schema.prisma
- tRPC routers: apps/web/lib/trpc/routers/

CURRENT STATE:
- MockInstance model exists for mock servers
- No support for external environments (Sandbox/UAT)
- Partners cannot point tests at real vendor APIs

TASK:
1. Add Environment model to Prisma schema with these fields:
   - id (cuid)
   - projectId (relation to Project)
   - name (string, e.g., "Production Sandbox", "UAT")
   - type (enum: MOCK, SANDBOX, UAT, PRODUCTION)
   - baseUrl (string, nullable for MOCK type)
   - authType (enum: NONE, API_KEY, OAUTH2, BASIC)
   - credentials (Json, encrypted at rest - store schema for different auth types)
   - headers (Json, additional headers to include)
   - isDefault (boolean)
   - isActive (boolean)
   - createdAt, updatedAt

2. Add EnvironmentType enum: MOCK, SANDBOX, UAT, PRODUCTION

3. Add AuthType enum: NONE, API_KEY, OAUTH2, BASIC

4. Add relation from Project to Environment (one-to-many)

5. Create migration file

6. Create tRPC router for environments at apps/web/lib/trpc/routers/environment.ts:
   - list: Get all environments for a project
   - create: Add new environment
   - update: Modify environment
   - delete: Remove environment
   - setDefault: Mark as default environment
   - testConnection: Verify environment is reachable

7. Ensure credentials are never returned in list/get responses (only indicate if set)

EXPECTED OUTPUT:
- Updated prisma/schema.prisma with Environment model
- New migration file
- New environment.ts tRPC router with full CRUD
- Updated apps/web/lib/trpc/routers/index.ts to include environment router

SECURITY REQUIREMENTS:
- Credentials must use protectedProcedure
- All queries must be scoped to user's org via project.orgId
- Credentials should be encrypted (use existing encryption utils or create new)
```

---

### P0.2: Environment Switcher UI

```
CONTEXT:
Integration Copilot needs a UI for vendors to configure environments and for both vendors/partners to switch between them when running tests.

PROJECT STRUCTURE:
- Next.js 15 with App Router
- UI components: apps/web/components/ui/ (shadcn-based)
- Project pages: apps/web/app/(portal)/projects/[id]/
- Partner pages: apps/web/app/partner/

CURRENT STATE:
- Environment model exists (from P0.1)
- No UI to manage environments
- Tests page has no environment selector

TASK:
1. Create environment management UI for vendor portal:
   
   File: apps/web/app/(portal)/projects/[id]/environments/page.tsx
   - List all environments with status indicators
   - "Add Environment" button opens dialog
   - Edit/Delete actions per environment
   - "Test Connection" button with loading state
   - Visual indicator for default environment
   
   File: apps/web/components/environments/environment-form.tsx
   - Form for creating/editing environments
   - Dynamic fields based on authType selection:
     * NONE: No additional fields
     * API_KEY: apiKey field, headerName field (default: X-API-Key)
     * OAUTH2: clientId, clientSecret, tokenUrl, scopes
     * BASIC: username, password
   - BaseUrl field with URL validation
   - Custom headers as key-value pairs
   - Save/Cancel buttons

2. Create environment selector component:
   
   File: apps/web/components/environments/environment-selector.tsx
   - Dropdown showing available environments
   - Icons for environment type (mock=🔧, sandbox=🧪, uat=✅, prod=🚀)
   - Shows "Mock (Built-in)" as always-available option
   - Persist selection to localStorage per project
   - Emit onChange event for parent components

3. Add environment selector to tests page:
   - apps/web/app/(portal)/projects/[id]/tests/page.tsx
   - apps/web/app/partner/tests/page.tsx
   - Display above test list
   - Selected environment affects test execution

4. Update project tabs layout to include "Environments" tab:
   - apps/web/app/(portal)/projects/[id]/layout.tsx

DESIGN REQUIREMENTS:
- Match existing "Enterprise Glass" theme (frosted glass cards, indigo accents)
- Use existing Card, Button, Input, Select components from shadcn
- Loading states with Skeleton components
- Toast notifications for success/error

EXPECTED OUTPUT:
- New environments page with full CRUD
- Reusable environment selector component
- Updated tests pages with environment selection
- Updated project layout with Environments tab
```

---

### P0.3: Per-API Test Profiles - Schema & Detection

```
CONTEXT:
Integration Copilot generates 10 categories of golden tests (Authentication, Idempotency, Rate Limiting, etc.). Not all APIs need all test categories - e.g., a read-only Account Summary API doesn't need idempotency tests.

PROJECT STRUCTURE:
- Test categories defined in: packages/mockgen/src/golden-tests.ts
- Spec normalization: packages/spec-engine/src/normalizer.ts
- Prisma schema: apps/web/prisma/schema.prisma

CURRENT STATE:
- 10 test categories, 38 total tests generated for every spec
- No capability detection from specs
- No way to mark categories as N/A per API

TEST CATEGORIES (from golden-tests.ts):
1. Authentication – Valid Credentials
2. Create Resource – Success
3. Idempotency – Duplicate Request
4. Invalid Input – Missing Required Fields
5. Webhook – Signature Verification
6. Rate Limiting – Exceeded
7. Timeout Handling
8. Refund/Reversal – Success
9. Retry Logic – Transient Failure
10. Invalid Parameter – Unsupported Currency

TASK:
1. Add TestProfile model to Prisma schema:
   - id (cuid)
   - specId (relation to Spec)
   - apiGroup (string - e.g., "payments", "accounts", derived from spec paths)
   - categorySettings (Json - map of category to REQUIRED/OPTIONAL/NA/AUTO)
   - detectedCapabilities (Json - auto-detected from spec)
   - createdAt, updatedAt

2. Add TestCategoryStatus enum: REQUIRED, OPTIONAL, NA, AUTO

3. Create capability detection service:
   
   File: packages/spec-engine/src/capability-detector.ts
   
   Detect these capabilities from OpenAPI spec:
   - hasIdempotency: Check for Idempotency-Key header in any operation
   - hasPagination: Check for page/limit/offset/cursor parameters
   - hasWebhooks: Check for x-webhooks or callbacks
   - hasWriteOperations: Check for POST/PUT/PATCH/DELETE methods
   - hasRateLimiting: Check for x-ratelimit headers or 429 responses
   - hasAuth: Check for securitySchemes
   - supportedAuthTypes: Extract auth types from securitySchemes
   
   Export function: detectCapabilities(normalizedSpec: NormalizedSpec): DetectedCapabilities

4. Update normalizer to call capability detection:
   - packages/spec-engine/src/normalizer.ts
   - Add detectedCapabilities to normalization result
   - Group endpoints by first path segment (e.g., /payments/* → "payments")

5. Create mapping from capabilities to default test profile:
   
   File: packages/spec-engine/src/profile-defaults.ts
   
   Example logic:
   - If !hasWriteOperations → Idempotency = NA
   - If !hasWebhooks → Webhook tests = NA
   - If !hasPagination → Pagination tests = NA (future category)
   - Default everything else to AUTO (run if detected, skip if not)

6. Create tRPC router for test profiles:
   
   File: apps/web/lib/trpc/routers/test-profile.ts
   - getBySpec: Get profile for a spec (create default if none)
   - update: Update category settings
   - resetToDefaults: Reset to auto-detected defaults
   - getCategories: List all test categories with descriptions

EXPECTED OUTPUT:
- Updated prisma/schema.prisma with TestProfile model
- New capability-detector.ts in spec-engine
- New profile-defaults.ts in spec-engine
- Updated normalizer.ts with capability detection
- New test-profile.ts tRPC router
- Migration file
```

---

### P0.4: Per-API Test Profiles - Vendor Configuration UI

```
CONTEXT:
Vendors need to configure which test categories apply to each API group. The capability detector provides defaults, but vendors should be able to override.

PROJECT STRUCTURE:
- Spec detail page: apps/web/app/(portal)/projects/[id]/specs/page.tsx
- Existing spec UI shows endpoints and blueprint

CURRENT STATE:
- TestProfile model exists (from P0.3)
- Capability detection implemented
- No UI for vendors to configure profiles

TASK:
1. Create test profile configuration component:
   
   File: apps/web/components/specs/test-profile-config.tsx
   
   UI Requirements:
   - Grouped by API group (e.g., "Payments API", "Accounts API")
   - Each group shows table of test categories
   - Columns: Category Name | Detected | Setting | Description
   - Setting dropdown: Required ✓ | Optional ○ | N/A ✗ | Auto 🔄
   - Visual indicators:
     * Green checkmark for Required
     * Yellow circle for Optional
     * Gray X for N/A
     * Blue arrows for Auto
   - "Detected" column shows what capability detection found
   - Tooltip explaining what each category tests
   - "Reset to Defaults" button per group
   - "Apply to All Groups" bulk action
   - Unsaved changes indicator
   - Save button with loading state

2. Add profile configuration to specs page:
   - apps/web/app/(portal)/projects/[id]/specs/page.tsx
   - Add "Test Profile" section below endpoint list
   - Collapsible by default, expanded on click
   - Show summary: "3 Required, 5 Optional, 2 N/A"

3. Create test category descriptions constant:
   
   File: apps/web/lib/test-categories.ts
   
   Export descriptions and icons for each category:
   ```typescript
   export const TEST_CATEGORIES = {
     AUTHENTICATION: {
       name: 'Authentication',
       description: 'Validates credential handling and token verification',
       icon: '🔐',
       defaultRequired: true,
     },
     IDEMPOTENCY: {
       name: 'Idempotency',
       description: 'Tests duplicate request handling with idempotency keys',
       icon: '🔁',
       applicableWhen: 'Write operations with Idempotency-Key header',
     },
     // ... etc for all 10 categories
   }
   ```

4. Add validation:
   - At least one category must be Required
   - Warn if all categories are N/A
   - Show which categories will run based on current settings

DESIGN REQUIREMENTS:
- Match Enterprise Glass theme
- Use DataTable component if available, otherwise create clean table
- Responsive - works on mobile
- Keyboard accessible (tab through settings)

EXPECTED OUTPUT:
- New test-profile-config.tsx component
- Updated specs page with profile configuration
- New test-categories.ts constants file
- Profile changes persisted via tRPC
```

---

### P0.5: Test Runner Environment Integration

```
CONTEXT:
The test runner needs to execute tests against the selected environment (Mock, Sandbox, or UAT) using the configured credentials.

PROJECT STRUCTURE:
- Test runner: packages/testkit/src/runner.ts
- Golden tests: packages/mockgen/src/golden-tests.ts
- Test execution tRPC: apps/web/lib/trpc/routers/test.ts (if exists) or mock.ts
- Test results storage: TestRun model in Prisma

CURRENT STATE:
- Tests run against mock server only
- Environment model exists
- Test profiles exist with category settings
- No integration between these systems

TASK:
1. Update test runner to accept environment configuration:
   
   File: packages/testkit/src/runner.ts
   
   Update runner interface:
   ```typescript
   interface TestRunnerConfig {
     suiteId: string;
     environment: {
       type: 'MOCK' | 'SANDBOX' | 'UAT' | 'PRODUCTION';
       baseUrl: string;
       auth?: {
         type: 'NONE' | 'API_KEY' | 'OAUTH2' | 'BASIC';
         // credentials injected at runtime
       };
       headers?: Record<string, string>;
     };
     testProfile: {
       categorySettings: Record<string, 'REQUIRED' | 'OPTIONAL' | 'NA' | 'AUTO'>;
       detectedCapabilities: Record<string, boolean>;
     };
     parameterValues?: Record<string, string>; // For parameterized tests (P1.9)
   }
   ```
   
   Implement:
   - Filter test cases by applicable categories (skip NA)
   - Mark OPTIONAL failures as warnings, not failures
   - Apply auth credentials to requests
   - Apply custom headers
   - Handle OAuth2 token refresh if needed

2. Create auth handler for test execution:
   
   File: packages/testkit/src/auth-handler.ts
   
   Implement:
   - getAuthHeaders(authConfig): Returns headers to add to requests
   - refreshOAuthToken(config): Refresh expired OAuth tokens
   - validateCredentials(config): Pre-flight check that creds work

3. Update test execution tRPC endpoint:
   
   File: apps/web/lib/trpc/routers/test.ts (create if doesn't exist)
   
   Endpoints:
   - runTests: Execute tests for a spec
     * Input: specId, environmentId (optional, default to default env)
     * Decrypt environment credentials server-side
     * Call runner with full config
     * Store results in TestRun
     * Return run ID for status polling
   
   - getRunStatus: Poll for completion
     * Input: runId
     * Return: status, progress, results summary
   
   - getRunResults: Get detailed results
     * Input: runId
     * Return: Full test results with per-case details

4. Update golden-tests.ts to support category filtering:
   
   File: packages/mockgen/src/golden-tests.ts
   
   Add category property to each test case:
   ```typescript
   interface GoldenTestCase {
     id: string;
     name: string;
     category: TestCategory;
     // ... existing fields
   }
   ```

5. Create test result aggregation:
   
   File: packages/testkit/src/results.ts
   
   - Aggregate results by category
   - Calculate pass rates
   - Identify blocking failures (REQUIRED category failures)
   - Generate summary for UI

EXPECTED OUTPUT:
- Updated runner.ts with environment support
- New auth-handler.ts for credential handling
- New or updated test.ts tRPC router
- Updated golden-tests.ts with categories
- New results.ts for aggregation
- Tests execute against selected environment
```

---

### P0.6: Trace Visibility Enhancements

```
CONTEXT:
Vendors need visibility into what partners are doing - which endpoints they're hitting, what errors they're getting, and where they're stuck.

PROJECT STRUCTURE:
- Trace model exists in Prisma schema
- Trace storage: packages/validator/src/trace.ts
- Traces page: apps/web/app/(portal)/projects/[id]/traces/page.tsx
- Partner traces: apps/web/app/partner/traces/page.tsx

CURRENT STATE:
- Traces are stored with HMAC verification
- Basic list view exists
- No filtering or aggregation
- Vendors can't easily see partner activity patterns

TASK:
1. Enhance trace storage with analytics fields:
   
   Update Trace model in prisma/schema.prisma:
   - Add: partnerProjectId (relation to PartnerProject, nullable)
   - Add: endpoint (string - extracted from path)
   - Add: statusCode (int)
   - Add: isError (boolean - 4xx/5xx)
   - Add: errorCategory (string, nullable - e.g., "AUTH", "VALIDATION", "RATE_LIMIT")
   - Add: durationMs (int)
   - Add: environmentType (EnvironmentType)

2. Create trace analytics tRPC endpoints:
   
   File: apps/web/lib/trpc/routers/trace.ts (update existing or create)
   
   Endpoints:
   - list: Paginated traces with filters
     * Filter by: partner, endpoint, status, date range, error only
     * Sort by: timestamp, duration, status
   
   - getAnalytics: Aggregated stats
     * Traces per day (chart data)
     * Error rate by endpoint
     * Top errors by category
     * Partner activity heatmap
   
   - getPartnerActivity: Per-partner breakdown
     * Total traces
     * Success rate
     * Last activity
     * Stuck indicators (no activity for 24h after errors)

3. Update vendor traces page:
   
   File: apps/web/app/(portal)/projects/[id]/traces/page.tsx
   
   UI Requirements:
   - Filter bar: Partner selector, endpoint dropdown, status filter, date range
   - Summary cards at top:
     * Total traces (last 7 days)
     * Error rate
     * Active partners
     * Avg response time
   - Traces table with columns:
     * Timestamp
     * Partner (if applicable)
     * Endpoint
     * Status (color coded)
     * Duration
     * Environment
   - Click row to expand details (request/response bodies, redacted)
   - "Export CSV" button

4. Create partner activity dashboard:
   
   File: apps/web/components/traces/partner-activity-panel.tsx
   
   UI Requirements:
   - List of partners with activity indicators
   - Status: 🟢 Active, 🟡 Idle (24h), 🔴 Stuck (errors + idle)
   - Click to filter traces to that partner
   - Quick stats: last trace, success rate, current phase

5. Add trace detail modal:
   
   File: apps/web/components/traces/trace-detail-modal.tsx
   
   - Request details (method, path, headers, body)
   - Response details (status, headers, body)
   - Validation errors (if any)
   - Timeline visualization (request → validation → response)
   - "Copy as cURL" button
   - Link to relevant blueprint section

DESIGN REQUIREMENTS:
- Use existing DataTable patterns
- Charts using Recharts (already available)
- Real-time feel (poll every 30s or use optimistic updates)
- Responsive layout

EXPECTED OUTPUT:
- Updated Trace model with analytics fields
- Migration file
- Enhanced trace.ts tRPC router
- Updated traces page with filtering and analytics
- New partner-activity-panel component
- New trace-detail-modal component
```

---

## P1 - High Impact

### P1.1: Partner Playground - Core Implementation

```
CONTEXT:
The Partner Playground is a key differentiator - it lets partners experiment with API calls without scheduling Zoom calls. They can edit payloads, send requests, and see validation feedback.

PROJECT STRUCTURE:
- Partner portal: apps/web/app/partner/
- Partner layout: apps/web/app/partner/layout.tsx
- Validator: packages/validator/src/validator.ts
- Partner auth: middleware checks for valid partner token

CURRENT STATE:
- Partner portal exists with specs, tests, traces views
- No playground for freeform API testing
- Validator exists but not exposed as playground API

TASK:
1. Create playground page:
   
   File: apps/web/app/partner/playground/page.tsx
   
   Layout:
   ```
   ┌─────────────────────────────────────────────────────┐
   │ Endpoint Selector: [GET /accounts ▼] [Environment ▼]│
   ├──────────────────────┬──────────────────────────────┤
   │ REQUEST              │ RESPONSE                     │
   │ ┌──────────────────┐ │ ┌──────────────────────────┐ │
   │ │ Headers          │ │ │ Status: 200 OK           │ │
   │ │ X-API-Key: ••••  │ │ │ Time: 234ms              │ │
   │ └──────────────────┘ │ ├──────────────────────────┤ │
   │ ┌──────────────────┐ │ │ Response Body            │ │
   │ │ Body (JSON)      │ │ │ {                        │ │
   │ │ {                │ │ │   "accounts": [...]      │ │
   │ │   "accountId":   │ │ │ }                        │ │
   │ │   "..."          │ │ │                          │ │
   │ │ }                │ │ │                          │ │
   │ └──────────────────┘ │ └──────────────────────────┘ │
   │ [Send Request 🚀]    │ [Copy Response] [Save as Test]│
   └──────────────────────┴──────────────────────────────┘
   │ Validation: ✅ Request valid against spec           │
   └─────────────────────────────────────────────────────┘
   ```

2. Create endpoint selector component:
   
   File: apps/web/components/playground/endpoint-selector.tsx
   
   Features:
   - Dropdown grouped by tag/path prefix
   - Search/filter endpoints
   - Shows method badge (GET=green, POST=blue, etc.)
   - On select: Load example request from spec

3. Create request editor component:
   
   File: apps/web/components/playground/request-editor.tsx
   
   Features:
   - JSON editor with syntax highlighting (use Monaco or CodeMirror)
   - Headers editor (key-value pairs)
   - Path parameters with inline editing
   - Query parameters editor
   - Auto-populate from spec examples
   - "Reset to Example" button

4. Create environment selector for playground:
   - Reuse environment-selector.tsx from P0.2
   - Partner can only select environments vendor has enabled for partners
   - Mock is always available

5. Create playground tRPC router:
   
   File: apps/web/lib/trpc/partner/routers/playground.ts
   
   Endpoints:
   - getEndpoints: List available endpoints for partner's project
   - getEndpointDetails: Get spec details, examples, parameters
   - executeRequest: Send request to selected environment
     * Validate against spec first
     * Forward to environment
     * Return response + validation results
     * Store as trace

6. Add playground to partner navigation:
   - Update apps/web/app/partner/layout.tsx
   - Add "Playground" nav item with beaker icon

DEPENDENCIES:
- P0.1 (Environment model)
- P0.2 (Environment selector)

EXPECTED OUTPUT:
- New playground page at /partner/playground
- endpoint-selector.tsx component
- request-editor.tsx component
- playground.ts tRPC router
- Updated partner layout with Playground nav
```

---

### P1.2: Partner Playground - Validation & Response Display

```
CONTEXT:
The playground needs to validate requests against the OpenAPI spec before sending, show detailed validation errors, and display responses with proper formatting.

PROJECT STRUCTURE:
- Validator: packages/validator/src/validator.ts
- Playground page: apps/web/app/partner/playground/page.tsx (from P1.1)

CURRENT STATE:
- Playground core exists (from P1.1)
- Validator package can validate requests/responses
- Need to integrate validation into playground UX

TASK:
1. Create validation display component:
   
   File: apps/web/components/playground/validation-panel.tsx
   
   Features:
   - Real-time validation as user types (debounced 500ms)
   - Status indicator: ✅ Valid | ⚠️ Warnings | ❌ Errors
   - Error list with:
     * Error message
     * JSON path (e.g., "body.amount")
     * Expected vs actual
     * Link to spec definition
   - Click error to highlight in request editor
   - Collapsible for more screen space

2. Create response display component:
   
   File: apps/web/components/playground/response-display.tsx
   
   Features:
   - Status code with color (2xx=green, 4xx=yellow, 5xx=red)
   - Response time in ms
   - Headers collapsible section
   - Body with JSON syntax highlighting
   - Response validation against spec (show if response matches schema)
   - "Copy as JSON" button
   - "Copy as cURL" button (reconstructs the request)
   - "View Raw" toggle

3. Enhance request editor with inline validation:
   
   Update: apps/web/components/playground/request-editor.tsx
   
   Features:
   - Red squiggly underlines on invalid fields
   - Hover for error tooltip
   - Gutter icons for errors/warnings
   - Auto-complete for enum values
   - Type hints from spec (e.g., "string, format: date-time")

4. Create request history component:
   
   File: apps/web/components/playground/request-history.tsx
   
   Features:
   - Last 10 requests in sidebar/drawer
   - Shows: endpoint, status, time, timestamp
   - Click to restore request
   - Clear history button
   - Persist to localStorage per project

5. Add "Save as Test Template" flow:
   
   File: apps/web/components/playground/save-template-dialog.tsx
   
   Features:
   - Dialog to save successful request as test template
   - Name the template
   - Mark fields as parameterized: {{ variable_name }}
   - Preview the template
   - Save to partner's test config

6. Update playground tRPC to include validation:
   
   Update: apps/web/lib/trpc/partner/routers/playground.ts
   
   - validateRequest: Validate request without sending
     * Returns: { valid: boolean, errors: ValidationError[], warnings: ValidationWarning[] }
   
   - Update executeRequest to include validation results in response

DESIGN REQUIREMENTS:
- Use Monaco Editor for JSON editing (react-monaco-editor)
- Smooth animations for validation state changes
- Mobile-friendly - stack panels vertically on small screens

EXPECTED OUTPUT:
- validation-panel.tsx component
- response-display.tsx component
- Updated request-editor.tsx with inline validation
- request-history.tsx component
- save-template-dialog.tsx component
- Updated playground tRPC with validation
```

---

### P1.3: AI Assistant - Backend Infrastructure

```
CONTEXT:
The AI Assistant is the "Zoom call replacement" - it helps partners debug integration issues by understanding their context (test results, traces, spec, annotations).

PROJECT STRUCTURE:
- Partner portal: apps/web/app/partner/
- tRPC partner routers: apps/web/lib/trpc/partner/routers/
- Existing stub: apps/web/components/partner/assistant-panel.tsx (if exists)

CURRENT STATE:
- No AI integration
- Need to build context-aware assistant that can answer questions like "Why is my auth failing?"

TASK:
1. Create AI service configuration:
   
   File: apps/web/lib/ai/config.ts
   
   ```typescript
   export const AI_CONFIG = {
     provider: process.env.AI_PROVIDER || 'anthropic', // or 'openai'
     model: process.env.AI_MODEL || 'claude-3-sonnet-20240229',
     maxTokens: 2000,
     temperature: 0.3, // Lower for more deterministic responses
   };
   ```

2. Create AI client wrapper:
   
   File: apps/web/lib/ai/client.ts
   
   Features:
   - Support both Anthropic and OpenAI APIs
   - Streaming response support
   - Rate limiting (per partner, per project)
   - Usage logging for billing/analytics
   - Error handling with user-friendly messages

3. Create prompt templates:
   
   File: apps/web/lib/ai/prompts.ts
   
   Templates:
   ```typescript
   export const PROMPTS = {
     TROUBLESHOOT_FAILURE: `
       You are an API integration expert helping a partner debug their integration.
       
       Context:
       - API Spec: {{spec_summary}}
       - Recent Test Results: {{test_results}}
       - Latest Trace: {{trace_details}}
       - Relevant Annotations: {{annotations}}
       
       The partner is asking: {{user_question}}
       
       Provide a clear, actionable response that:
       1. Identifies the likely cause
       2. Suggests specific fixes
       3. References relevant spec sections
       4. Includes code examples if helpful
       
       Keep the response concise and actionable.
     `,
     
     EXPLAIN_ENDPOINT: `...`,
     SUGGEST_NEXT_STEPS: `...`,
     INTERPRET_ERROR: `...`,
   };
   ```

4. Create AI tRPC router:
   
   File: apps/web/lib/trpc/partner/routers/ai.ts
   
   Endpoints:
   - chat: Send message, get response
     * Input: { message: string, conversationId?: string }
     * Uses context builder (P1.4) to gather context
     * Streams response if possible
     * Logs usage
   
   - getConversationHistory: Retrieve past messages
     * Input: { conversationId: string, limit: number }
   
   - suggestQuestions: Generate suggested questions based on context
     * Returns: string[] of relevant questions

5. Add conversation storage:
   
   Update prisma/schema.prisma:
   
   ```prisma
   model AIConversation {
     id              String @id @default(cuid())
     partnerProjectId String
     partnerProject  PartnerProject @relation(fields: [partnerProjectId], references: [id])
     messages        AIMessage[]
     createdAt       DateTime @default(now())
     updatedAt       DateTime @updatedAt
   }
   
   model AIMessage {
     id             String @id @default(cuid())
     conversationId String
     conversation   AIConversation @relation(fields: [conversationId], references: [id])
     role           String // 'user' | 'assistant'
     content        String
     contextUsed    Json? // What context was included
     tokensUsed     Int?
     createdAt      DateTime @default(now())
   }
   ```

6. Add rate limiting for AI:
   
   File: apps/web/lib/ai/rate-limiter.ts
   
   - 20 messages per hour per partner
   - 100 messages per day per project
   - Configurable via env vars

EXPECTED OUTPUT:
- AI config and client files
- Prompt templates
- ai.ts tRPC router
- Prisma schema updates with AI models
- Rate limiter
- Migration file
```

---

### P1.4: AI Assistant - Context Builder

```
CONTEXT:
The AI assistant needs rich context to provide useful answers. The context builder gathers relevant information from the partner's integration state.

PROJECT STRUCTURE:
- AI infrastructure from P1.3
- Models: Trace, TestRun, Spec, Blueprint, Annotation (P1.6)

CURRENT STATE:
- AI backend exists (from P1.3)
- Need to build context gathering logic

TASK:
1. Create context builder service:
   
   File: apps/web/lib/ai/context-builder.ts
   
   ```typescript
   interface AssistantContext {
     specSummary: string;
     recentTraces: TraceSummary[];
     latestTestRun: TestRunSummary | null;
     relevantAnnotations: Annotation[];
     currentPhase: PlanPhase;
     commonErrors: ErrorPattern[];
   }
   
   export async function buildContext(
     partnerProjectId: string,
     userMessage: string
   ): Promise<AssistantContext> {
     // 1. Get partner's project and linked spec
     // 2. Analyze user message to determine relevant endpoints
     // 3. Fetch recent traces (last 10, prioritize failures)
     // 4. Fetch latest test run results
     // 5. Find relevant annotations based on:
     //    - Endpoints mentioned in message
     //    - Endpoints with recent failures
     //    - Error codes seen in traces
     // 6. Get current plan phase
     // 7. Aggregate common errors from traces
     
     return context;
   }
   ```

2. Create spec summarizer:
   
   File: apps/web/lib/ai/spec-summarizer.ts
   
   Features:
   - Summarize spec to fit in context window (~2000 tokens)
   - Focus on endpoints relevant to user's question
   - Include auth requirements
   - Include relevant examples
   - Compress but retain key details

3. Create error pattern analyzer:
   
   File: apps/web/lib/ai/error-analyzer.ts
   
   Features:
   - Analyze traces to find common error patterns
   - Categorize errors: AUTH, VALIDATION, RATE_LIMIT, SERVER_ERROR
   - Identify likely root causes
   - Suggest based on annotation knowledge

4. Create relevance scorer:
   
   File: apps/web/lib/ai/relevance.ts
   
   Features:
   - Score endpoints by relevance to user question
   - Use keyword matching + semantic similarity (if embeddings available)
   - Weight recent activity higher
   - Return top 5 most relevant endpoints

5. Create context formatter:
   
   File: apps/web/lib/ai/formatter.ts
   
   Features:
   - Format context into prompt-friendly structure
   - Truncate long responses/bodies
   - Redact sensitive values
   - Use consistent markdown formatting

6. Add context caching:
   
   File: apps/web/lib/ai/cache.ts
   
   - Cache spec summaries (invalidate on spec update)
   - Cache common patterns (TTL 5 minutes)
   - Use Redis if available, fallback to in-memory

EXPECTED OUTPUT:
- context-builder.ts with main buildContext function
- spec-summarizer.ts
- error-analyzer.ts
- relevance.ts
- formatter.ts
- cache.ts
- All integrated and called from AI router
```

---

### P1.5: AI Assistant - Frontend Integration

```
CONTEXT:
Partners need a chat interface to interact with the AI assistant. It should be accessible from anywhere in the partner portal and understand context.

PROJECT STRUCTURE:
- Partner layout: apps/web/app/partner/layout.tsx
- AI backend from P1.3, P1.4

CURRENT STATE:
- AI backend exists
- Context builder exists
- No frontend UI

TASK:
1. Create AI assistant panel component:
   
   File: apps/web/components/partner/ai-assistant-panel.tsx
   
   Features:
   - Slide-out panel from right side
   - Toggle button fixed in bottom-right corner
   - Chat message list with:
     * User messages (right-aligned)
     * Assistant messages (left-aligned, with avatar)
     * Timestamps
     * Loading indicator (typing animation)
   - Input field with send button
   - Suggested questions above input
   - "Clear conversation" option
   - Minimize/maximize toggle
   - Keyboard shortcut: Cmd+K to open

2. Create message components:
   
   File: apps/web/components/partner/ai-message.tsx
   
   Features:
   - Markdown rendering for assistant messages
   - Code blocks with syntax highlighting
   - Copy code button
   - Links to spec sections (clickable, navigate in app)
   - Error messages styled distinctly
   - "Retry" button on failed messages

3. Create suggested questions component:
   
   File: apps/web/components/partner/suggested-questions.tsx
   
   Features:
   - Show 3-4 contextual suggestions
   - Based on:
     * Recent failures
     * Current page context
     * Unanswered questions from traces
   - Click to send question
   - Refresh button

4. Add context-aware suggestions based on current page:
   
   File: apps/web/lib/ai/page-context.ts
   
   ```typescript
   export function getPageSuggestions(pathname: string, pageData: any): string[] {
     if (pathname.includes('/tests')) {
       // Suggest questions about test failures
       return [
         'Why did the authentication test fail?',
         'What should I fix to pass all required tests?',
       ];
     }
     if (pathname.includes('/traces')) {
       // Suggest questions about recent traces
       return [
         'What error am I seeing most often?',
         'How do I fix this 401 error?',
       ];
     }
     // ... etc
   }
   ```

5. Integrate panel into partner layout:
   
   Update: apps/web/app/partner/layout.tsx
   
   - Add AIAssistantPanel component
   - Pass current route for context
   - Manage open/closed state in layout

6. Add streaming response support:
   
   File: apps/web/hooks/useAIChat.ts
   
   ```typescript
   export function useAIChat() {
     // Handle streaming responses
     // Manage conversation state
     // Handle errors gracefully
     // Track usage for rate limit warnings
   }
   ```

7. Add rate limit warning UI:
   - Show remaining messages
   - Warning when approaching limit
   - Clear message when limit reached

DESIGN REQUIREMENTS:
- Match Crystal Ice theme (partner portal)
- Smooth animations for panel open/close
- Mobile-friendly (full screen on mobile)
- Accessible (keyboard navigation, screen reader support)

EXPECTED OUTPUT:
- ai-assistant-panel.tsx with full chat UI
- ai-message.tsx for message rendering
- suggested-questions.tsx component
- page-context.ts for contextual suggestions
- useAIChat.ts hook
- Updated partner layout
```

---

### P1.6: Blueprint Annotations - Schema & API

```
CONTEXT:
Blueprint Annotations are the highest-value feature - they capture tribal knowledge like "OAuth v3 elevated scope required for transactions > $10K" that currently lives in engineers' heads.

PROJECT STRUCTURE:
- Prisma schema: apps/web/prisma/schema.prisma
- Blueprint generation: packages/spec-engine/src/blueprint.ts
- Spec model already exists

CURRENT STATE:
- Blueprints generated from specs
- No annotation layer
- Tribal knowledge shared via Zoom calls

TASK:
1. Add Annotation model to Prisma:
   
   ```prisma
   model Annotation {
     id          String @id @default(cuid())
     specId      String
     spec        Spec @relation(fields: [specId], references: [id], onDelete: Cascade)
     
     // Location in spec
     path        String  // e.g., "/payments" 
     method      String? // e.g., "post" (null for path-level annotations)
     field       String? // e.g., "amount" (null for endpoint-level)
     
     // Annotation content
     type        AnnotationType
     condition   String? // e.g., "amount > 10000"
     message     String  // The actual note
     severity    AnnotationSeverity @default(INFO)
     
     // Metadata
     createdBy   String  // userId
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt
     
     // For AI surfacing
     keywords    String[] // Extracted for search
     errorCodes  String[] // Related error codes this explains
   }
   
   enum AnnotationType {
     AUTH_NOTE      // Authentication requirements
     FIELD_NOTE     // Field-specific guidance
     ERROR_NOTE     // Error explanation
     CONDITION_NOTE // Conditional behavior
     EXAMPLE_NOTE   // Usage examples
     WARNING        // Important gotchas
   }
   
   enum AnnotationSeverity {
     INFO
     WARNING
     CRITICAL
   }
   ```

2. Create annotation tRPC router:
   
   File: apps/web/lib/trpc/routers/annotation.ts
   
   Endpoints:
   - create: Add annotation
     * Validate path/method exist in spec
     * Extract keywords from message
     * Map error codes mentioned
   
   - update: Edit annotation
   
   - delete: Remove annotation
   
   - listBySpec: Get all annotations for a spec
   
   - listByEndpoint: Get annotations for specific path/method
   
   - search: Find annotations by keyword/error code
     * Used by AI assistant to find relevant notes

3. Update blueprint generation to include annotations:
   
   File: packages/spec-engine/src/blueprint.ts
   
   - Add annotations to blueprint output
   - Group by endpoint
   - Include in markdown export
   - Include in JSON export

4. Create annotation suggestion service:
   
   File: apps/web/lib/annotations/suggester.ts
   
   - Analyze common failure patterns (from traces)
   - Suggest annotations vendor should add
   - Example: "12 partners failed with AUTH_SCOPE_INSUFFICIENT on /payments - consider adding an annotation about elevated scopes"

EXPECTED OUTPUT:
- Updated prisma/schema.prisma with Annotation model
- annotation.ts tRPC router
- Updated blueprint.ts with annotation support
- suggester.ts for recommendations
- Migration file
```

---

### P1.7: Blueprint Annotations - Vendor UI

```
CONTEXT:
Vendors need to add and manage annotations through an intuitive interface. Annotations should be easy to add when viewing specs.

PROJECT STRUCTURE:
- Spec page: apps/web/app/(portal)/projects/[id]/specs/page.tsx
- Blueprint display exists

CURRENT STATE:
- Annotation model exists (from P1.6)
- No UI for managing annotations

TASK:
1. Create annotation form component:
   
   File: apps/web/components/annotations/annotation-form.tsx
   
   Features:
   - Type selector (dropdown with icons):
     * 🔐 Auth Note
     * 📝 Field Note
     * ⚠️ Error Note
     * ❓ Condition Note
     * 📖 Example Note
     * ⛔ Warning
   - Location selectors:
     * Path dropdown (populated from spec)
     * Method dropdown (filtered by path)
     * Field dropdown (filtered by method, from schema)
   - Condition field (optional)
   - Message textarea (markdown supported)
   - Severity selector
   - Error codes field (comma-separated)
   - Preview mode

2. Create annotation list component:
   
   File: apps/web/components/annotations/annotation-list.tsx
   
   Features:
   - Grouped by endpoint
   - Expandable cards
   - Edit/Delete actions
   - Filter by type
   - Search by keyword
   - Sort by date/endpoint

3. Create inline annotation display:
   
   File: apps/web/components/annotations/inline-annotation.tsx
   
   Features:
   - Small badge next to annotated fields/endpoints
   - Hover to preview
   - Click to expand full annotation
   - Icon matches annotation type

4. Add annotations section to spec page:
   
   Update: apps/web/app/(portal)/projects/[id]/specs/page.tsx
   
   - Add "Annotations" tab or section
   - Show annotation count in tab: "Annotations (5)"
   - Include "Add Annotation" button
   - Show suggestions from failure patterns

5. Create annotation suggestions panel:
   
   File: apps/web/components/annotations/suggestions-panel.tsx
   
   Features:
   - Show suggested annotations based on:
     * Common partner failures
     * Endpoints without annotations
     * Complex auth requirements
   - "Add Suggestion" button pre-fills form
   - "Dismiss" to hide suggestion

6. Add annotation indicators to endpoint list:
   
   Update spec display to show:
   - Number badge on endpoints with annotations
   - Tooltip preview of annotations
   - Visual emphasis on critical annotations

DESIGN REQUIREMENTS:
- Annotations feel like "helpful notes" not bureaucracy
- Quick to add (minimize clicks)
- Easy to discover existing annotations
- Match Enterprise Glass theme

EXPECTED OUTPUT:
- annotation-form.tsx
- annotation-list.tsx
- inline-annotation.tsx
- suggestions-panel.tsx
- Updated spec page with annotations UI
```

---

### P1.8: Blueprint Annotations - Partner Surface

```
CONTEXT:
Annotations need to surface to partners in the right places - playground hints, test failures, AI responses.

PROJECT STRUCTURE:
- Partner playground: apps/web/app/partner/playground/page.tsx
- AI context builder: apps/web/lib/ai/context-builder.ts
- Partner tests: apps/web/app/partner/tests/page.tsx

CURRENT STATE:
- Annotations exist and vendors can create them
- Partners don't see annotations anywhere

TASK:
1. Surface annotations in playground:
   
   Update: apps/web/components/playground/request-editor.tsx
   
   Features:
   - Show annotation icon next to annotated fields
   - Hover reveals annotation in tooltip
   - Critical annotations shown inline above field
   - Auth notes shown in headers section
   - Example notes shown in "Examples" dropdown

2. Create annotation tooltip component:
   
   File: apps/web/components/annotations/annotation-tooltip.tsx
   
   Features:
   - Rich tooltip with markdown rendering
   - Severity-based styling
   - "See all annotations" link
   - Condition displayed if applicable

3. Surface annotations in test failure details:
   
   Update partner tests page to:
   - When test fails, check for relevant annotations
   - Display annotations that might explain the failure
   - Link error codes to annotation explanations
   - Show "Vendor Note:" section with relevant annotations

4. Integrate annotations into AI context:
   
   Update: apps/web/lib/ai/context-builder.ts
   
   - Fetch annotations relevant to user's question
   - Include in prompt context
   - Prioritize annotations matching error codes in traces
   - AI references annotations in responses

5. Create partner-facing annotation viewer:
   
   File: apps/web/app/partner/annotations/page.tsx
   
   Features:
   - Read-only view of all annotations
   - Organized by endpoint
   - Search by keyword
   - Filter by type
   - Direct links from other pages

6. Add annotation deep links:
   
   File: apps/web/lib/annotations/links.ts
   
   - Generate shareable links to specific annotations
   - AI can include links in responses
   - Links work in partner portal

EXPECTED OUTPUT:
- Updated playground with annotation hints
- annotation-tooltip.tsx component
- Updated partner tests with annotation display
- Updated AI context builder
- Partner annotations page
- Link utilities
```

---

### P1.9: Parameterized Test Templates

```
CONTEXT:
Parameterized tests let vendors define test structure while partners provide their specific values (account IDs, credentials, etc.).

PROJECT STRUCTURE:
- Test runner: packages/testkit/src/runner.ts
- Golden tests: packages/mockgen/src/golden-tests.ts
- Partner tests page: apps/web/app/partner/tests/page.tsx

CURRENT STATE:
- Golden tests exist with fixed values
- No parameterization support
- Partners can't customize test data

TASK:
1. Define template syntax:
   
   File: packages/testkit/src/templates.ts
   
   ```typescript
   // Syntax: {{ variable_name | default_value | description }}
   // Examples:
   // {{ account_id }} - required variable
   // {{ amount | 100.00 }} - with default
   // {{ currency | USD | Three-letter currency code }}
   
   interface TemplateVariable {
     name: string;
     defaultValue?: string;
     description?: string;
     type: 'string' | 'number' | 'boolean' | 'json';
     required: boolean;
   }
   
   export function parseTemplate(template: string): TemplateVariable[];
   export function substituteVariables(template: string, values: Record<string, any>): string;
   export function validateValues(variables: TemplateVariable[], values: Record<string, any>): ValidationResult;
   ```

2. Update golden test generation:
   
   Update: packages/mockgen/src/golden-tests.ts
   
   - Add template field to test cases
   - Define which values should be parameterized
   - Common parameters:
     * `{{ test_account_id }}`
     * `{{ test_api_key }}`
     * `{{ test_amount }}`
     * `{{ webhook_url }}`

3. Add partner test configuration model:
   
   Update prisma/schema.prisma:
   
   ```prisma
   model PartnerTestConfig {
     id               String @id @default(cuid())
     partnerProjectId String @unique
     partnerProject   PartnerProject @relation(fields: [partnerProjectId], references: [id])
     
     // Variable values
     variables        Json // Record<string, any>
     
     createdAt        DateTime @default(now())
     updatedAt        DateTime @updatedAt
   }
   ```

4. Create partner variable configuration UI:
   
   File: apps/web/components/partner/test-config-form.tsx
   
   Features:
   - List all required variables
   - Show description and type
   - Input fields with validation
   - Show which tests use each variable
   - "Save Configuration" button
   - "Reset to Defaults" option

5. Add configuration page for partners:
   
   File: apps/web/app/partner/tests/configure/page.tsx
   
   Features:
   - Variable configuration form
   - Preview of test with values substituted
   - Validation status
   - "Run Tests" button (goes to tests page)

6. Update test runner to use partner values:
   
   Update: packages/testkit/src/runner.ts
   
   - Fetch partner's test config
   - Substitute variables before execution
   - Log which values were used (redacted in traces)
   - Fail clearly if required variables missing

7. Create vendor template management:
   
   File: apps/web/app/(portal)/projects/[id]/tests/templates/page.tsx
   
   Features:
   - View generated test templates
   - Add custom variables
   - Set defaults for partner convenience
   - Preview template rendering

EXPECTED OUTPUT:
- templates.ts with parsing and substitution
- Updated golden-tests.ts with templates
- PartnerTestConfig model in schema
- test-config-form.tsx component
- Partner configuration page
- Updated test runner
- Vendor template management page
```

---

## P2 - Important

### P2.1: OAuth Provider Setup (GitHub/Google)

```
CONTEXT:
Production auth should support OAuth providers beyond the demo credentials.

PROJECT STRUCTURE:
- Auth config: apps/web/lib/auth.ts
- NextAuth configuration

CURRENT STATE:
- Credentials provider for demo
- No OAuth providers

TASK:
1. Add GitHub OAuth provider:
   
   Update: apps/web/lib/auth.ts
   
   - Configure GitHub provider
   - Handle email from GitHub profile
   - Create/link user on first login
   - Handle org membership

2. Add Google OAuth provider:
   - Same pattern as GitHub

3. Update auth UI:
   
   Update: apps/web/app/(auth)/login/page.tsx
   
   - Add "Continue with GitHub" button
   - Add "Continue with Google" button
   - Style consistently with existing theme

4. Add environment variables documentation:
   - GITHUB_CLIENT_ID
   - GITHUB_CLIENT_SECRET
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET

5. Handle account linking:
   - Allow linking multiple OAuth accounts
   - Prevent duplicate accounts

EXPECTED OUTPUT:
- Updated auth.ts with OAuth providers
- Updated login page
- Environment variable documentation
```

---

### P2.2: User Invite Workflow

```
CONTEXT:
Vendors need to invite team members and partners to projects.

PROJECT STRUCTURE:
- Existing User and Membership models
- Email: No current email provider

TASK:
1. Add Invite model:
   
   ```prisma
   model Invite {
     id        String @id @default(cuid())
     email     String
     role      Role
     orgId     String
     org       Organization @relation(fields: [orgId], references: [id])
     projectId String? // Specific project for partners
     token     String @unique
     expiresAt DateTime
     status    InviteStatus @default(PENDING)
     createdBy String
     createdAt DateTime @default(now())
   }
   
   enum InviteStatus {
     PENDING
     ACCEPTED
     EXPIRED
     REVOKED
   }
   ```

2. Create invite tRPC router:
   
   File: apps/web/lib/trpc/routers/invite.ts
   
   Endpoints:
   - create: Generate invite
   - list: Show pending invites
   - revoke: Cancel invite
   - accept: Accept invite (from email link)

3. Create invite UI:
   
   File: apps/web/app/(portal)/settings/team/page.tsx
   
   Features:
   - Current team members list
   - "Invite Member" button
   - Email input with role selector
   - Pending invites list
   - Revoke option

4. Set up email provider (Resend):
   
   File: apps/web/lib/email/send.ts
   
   - Configure Resend client
   - Invite email template
   - Partner invite email template

5. Create accept invite page:
   
   File: apps/web/app/invite/[token]/page.tsx
   
   - Validate token
   - Show invite details
   - Accept button (creates membership)
   - Handle expired/revoked states

EXPECTED OUTPUT:
- Invite model and migration
- invite.ts tRPC router
- Team settings page
- Email configuration
- Accept invite page
```

---

### P2.3: Mock Lifecycle Management

```
CONTEXT:
Mock servers need proper lifecycle management to prevent resource leaks.

PROJECT STRUCTURE:
- Mock manager: apps/web/lib/mock-server-manager.ts
- Mocks page: apps/web/app/(portal)/projects/[id]/mocks/page.tsx

TASK:
1. Create health check cron job:
   
   File: apps/web/app/api/cron/mock-health/route.ts
   
   - Run every 5 minutes (Vercel cron)
   - Check all running mocks
   - Restart unresponsive mocks
   - Log health status

2. Add retention policy:
   
   File: apps/web/lib/mock/retention.ts
   
   - Delete mocks not accessed in 7 days
   - Configurable per project
   - Warning notification before deletion

3. Update mock manager:
   
   Update: apps/web/lib/mock-server-manager.ts
   
   - Track lastAccessedAt
   - Port pooling and reuse
   - Graceful shutdown
   - Memory limits

4. Add health indicators to UI:
   
   Update: apps/web/app/(portal)/projects/[id]/mocks/page.tsx
   
   - Status badge: 🟢 Healthy, 🟡 Degraded, 🔴 Down
   - Last health check time
   - Resource usage (if available)
   - Manual restart button

5. Add bulk controls:
   - Stop all mocks
   - Restart all mocks
   - Delete unused mocks

EXPECTED OUTPUT:
- Cron health check endpoint
- Retention policy logic
- Updated mock manager
- Updated mocks page with health UI
```

---

### P2.4: Golden Test Insights - Per-Case Display

```
CONTEXT:
Partners need to see detailed results for each test case, not just suite-level pass/fail.

PROJECT STRUCTURE:
- Tests page: apps/web/app/(portal)/projects/[id]/tests/page.tsx
- Partner tests: apps/web/app/partner/tests/page.tsx
- Test artifacts: .artifacts/testruns/

TASK:
1. Update test result storage:
   
   Update TestRun model to include per-case results:
   ```prisma
   model TestCase {
     id         String @id @default(cuid())
     testRunId  String
     testRun    TestRun @relation(fields: [testRunId], references: [id])
     name       String
     category   String
     status     TestStatus // PASS, FAIL, SKIP, ERROR
     durationMs Int
     request    Json?
     response   Json?
     error      String?
     assertions Json // { passed: [], failed: [] }
   }
   ```

2. Create per-case display component:
   
   File: apps/web/components/tests/test-case-detail.tsx
   
   Features:
   - Expandable row per test case
   - Status icon with color
   - Duration
   - Request/response viewer
   - Assertion results
   - Error message with stack trace
   - "Copy as cURL" button

3. Add test run history:
   
   File: apps/web/components/tests/test-run-history.tsx
   
   Features:
   - Last 10 runs
   - Click to view details
   - Diff between runs
   - Trend visualization (pass rate over time)

4. Create artifact viewer:
   
   File: apps/web/components/tests/artifact-viewer.tsx
   
   - Browse .artifacts/testruns/
   - View log files
   - Download artifacts
   - Link from test case details

5. Update tests page:
   
   Update both vendor and partner tests pages:
   - Replace suite-level view with per-case view
   - Add filters: status, category
   - Add search by test name
   - Add "Re-run Failed" button

EXPECTED OUTPUT:
- TestCase model and migration
- test-case-detail.tsx component
- test-run-history.tsx component
- artifact-viewer.tsx component
- Updated tests pages
```

---

### P2.5: Slack Integration Wiring

```
CONTEXT:
The Slack connector package exists but isn't wired to application events.

PROJECT STRUCTURE:
- Slack connector: packages/connectors/src/slack.ts
- Event emission points: test runs, phase completion

TASK:
1. Create event emitter system:
   
   File: apps/web/lib/events/emitter.ts
   
   Events:
   - test.completed
   - test.failed
   - phase.completed
   - partner.stuck (idle after errors)
   - report.generated

2. Create Slack notification handler:
   
   File: apps/web/lib/events/handlers/slack.ts
   
   - Subscribe to events
   - Format messages with rich blocks
   - Send via connector

3. Add Slack configuration UI:
   
   File: apps/web/app/(portal)/projects/[id]/settings/integrations/page.tsx
   
   - Webhook URL input
   - Channel selector (if using OAuth)
   - Event toggles (which events to notify)
   - Test notification button

4. Add project integration settings model:
   
   ```prisma
   model ProjectIntegration {
     id        String @id @default(cuid())
     projectId String
     project   Project @relation(fields: [projectId], references: [id])
     type      IntegrationType // SLACK, JIRA
     config    Json
     enabled   Boolean @default(true)
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   }
   ```

5. Wire events to emission points:
   - After test run completes
   - After phase status changes
   - After report generation

EXPECTED OUTPUT:
- Event emitter system
- Slack handler
- Integration settings UI
- ProjectIntegration model
- Event emission in relevant code paths
```

---

### P2.6: Jira Integration Wiring

```
CONTEXT:
The Jira connector exists but isn't wired to create issues from failures.

PROJECT STRUCTURE:
- Jira connector: packages/connectors/src/jira.ts
- Event system from P2.5

TASK:
1. Create Jira issue handler:
   
   File: apps/web/lib/events/handlers/jira.ts
   
   - Subscribe to test.failed event
   - Create issue with failure details
   - Include spec reference
   - Include trace link

2. Add Jira configuration UI:
   
   Update: apps/web/app/(portal)/projects/[id]/settings/integrations/page.tsx
   
   - Jira site URL
   - API token
   - Project key
   - Issue type selector
   - Label configuration

3. Add issue deduplication:
   - Track created issues
   - Don't create duplicate for same failure
   - Update existing issue on re-failure

4. Add issue linking:
   - Store Jira issue link on TestCase
   - Display link in test results
   - "View in Jira" button

EXPECTED OUTPUT:
- Jira handler
- Updated integration settings
- Issue deduplication
- Issue linking UI
```

---

### P2.7: Project Settings Page

```
CONTEXT:
Projects need a centralized settings page for configuration.

PROJECT STRUCTURE:
- Project layout: apps/web/app/(portal)/projects/[id]/layout.tsx

TASK:
1. Create project settings page:
   
   File: apps/web/app/(portal)/projects/[id]/settings/page.tsx
   
   Sections:
   - General (name, description)
   - Environments (link to P0.2)
   - Test Profiles (link to P0.4)
   - Integrations (Slack, Jira)
   - Partner Access (invite settings)
   - Danger Zone (archive, delete)

2. Add settings to project tabs:
   - Update layout.tsx
   - Add Settings tab (gear icon)

3. Create each settings section as component:
   - general-settings.tsx
   - environment-settings.tsx (redirect)
   - test-profile-settings.tsx (redirect)
   - integration-settings.tsx
   - partner-settings.tsx
   - danger-zone.tsx

4. Implement archive project:
   - Soft delete
   - Hide from project list
   - Retain data for recovery

5. Implement delete project:
   - Confirmation dialog
   - Delete all related data
   - Cascade deletes properly

EXPECTED OUTPUT:
- Project settings page
- Settings section components
- Archive/delete functionality
- Updated project layout
```

---

## P3 - Nice to Have

### P3.1: Spec Webhook Receiver

```
CONTEXT:
Allow vendors to push spec updates via webhook for CI/CD integration.

TASK:
1. Create webhook endpoint:
   
   File: apps/web/app/api/webhooks/spec/route.ts
   
   - Accept OpenAPI spec in body
   - Validate webhook signature
   - Update or create spec
   - Trigger mock/test regeneration

2. Generate webhook secrets per project

3. Add webhook configuration UI:
   - Show webhook URL
   - Show/regenerate secret
   - View webhook history

4. Add GitHub Action example for CI integration

EXPECTED OUTPUT:
- Webhook endpoint
- Secret management
- Configuration UI
- CI example documentation
```

---

### P3.2: Failure Pattern Analytics

```
CONTEXT:
Aggregate failures across partners to help vendors identify common issues.

TASK:
1. Create failure aggregation service:
   
   File: apps/web/lib/analytics/failure-patterns.ts
   
   - Group failures by endpoint + error code
   - Count partners affected
   - Track time patterns

2. Create analytics dashboard component:
   
   File: apps/web/components/analytics/failure-patterns-panel.tsx
   
   - Top 10 failure patterns
   - Partners affected count
   - Time series chart
   - "Add Annotation" action

3. Add to project overview page

EXPECTED OUTPUT:
- Failure aggregation service
- Analytics panel component
- Integration with overview
```

---

### P3.3: PDF Report Export

```
CONTEXT:
Generate professional PDF reports for stakeholder sharing.

TASK:
1. Add PDF generation library (puppeteer or @react-pdf/renderer)

2. Create report template:
   
   File: apps/web/lib/reports/pdf-template.tsx
   
   - Company branding
   - Executive summary
   - Test results
   - Charts and graphs
   - Recommendations

3. Add "Export PDF" button to reports page

4. Handle async generation:
   - Queue report generation
   - Notify when ready
   - Download link

EXPECTED OUTPUT:
- PDF generation logic
- Report template
- Export button and flow
```

---

### P3.4: E2E Testing Setup

```
CONTEXT:
Set up end-to-end testing with Playwright for CI/CD.

TASK:
1. Initialize Playwright:
   
   ```bash
   pnpm create playwright --ct
   ```

2. Create test configuration:
   
   File: playwright.config.ts
   
   - Configure base URL
   - Set up auth state
   - Configure reporters

3. Create core journey tests:
   
   Files in tests/e2e/:
   - auth.spec.ts (login, logout)
   - project-crud.spec.ts
   - spec-import.spec.ts
   - test-execution.spec.ts
   - partner-flow.spec.ts

4. Add to CI workflow:
   
   File: .github/workflows/e2e.yml
   
   - Start app with test database
   - Run Playwright tests
   - Upload artifacts on failure

5. Add visual regression:
   - Configure screenshot comparison
   - Set up baseline images

EXPECTED OUTPUT:
- Playwright configuration
- E2E test files
- CI workflow
- Visual regression setup
```

---

## Production Hardening

### PROD.1: Error Boundaries & Logging

```
CONTEXT:
Production needs proper error handling and logging.

TASK:
1. Create error boundary component:
   
   File: apps/web/components/error-boundary.tsx
   
   - Catch React errors
   - Show user-friendly message
   - Log to monitoring service

2. Set up structured logging:
   
   File: apps/web/lib/logger.ts
   
   - Use pino or winston
   - JSON format for parsing
   - Request ID tracking
   - Error serialization

3. Add error monitoring (Sentry):
   
   File: apps/web/lib/monitoring/sentry.ts
   
   - Initialize Sentry
   - Configure source maps
   - Set up error sampling

4. Wrap app in error boundary:
   - Update root layout
   - Add boundary to each major section

5. Add API error handling:
   - Standardize error responses
   - Include error codes
   - Log all errors

EXPECTED OUTPUT:
- Error boundary component
- Logger configuration
- Sentry setup
- Error handling patterns
```

---

### PROD.2: Rate Limiting & Security Headers

```
CONTEXT:
Production needs proper rate limiting and security headers.

TASK:
1. Add rate limiting middleware:
   
   File: apps/web/middleware.ts (update)
   
   - Rate limit by IP
   - Rate limit by user
   - Different limits for different endpoints

2. Add security headers:
   
   File: next.config.js (update)
   
   Headers:
   - Content-Security-Policy
   - X-Frame-Options
   - X-Content-Type-Options
   - Strict-Transport-Security
   - Referrer-Policy

3. Add CORS configuration:
   - Configure allowed origins
   - Handle preflight requests

4. Add CSRF protection:
   - Already handled by tRPC
   - Verify implementation

EXPECTED OUTPUT:
- Rate limiting middleware
- Security headers configuration
- CORS configuration
- Security audit checklist
```

---

### PROD.3: Database Indexing & Optimization

```
CONTEXT:
Optimize database queries for production scale.

TASK:
1. Analyze common queries:
   - Trace listing by project
   - Test runs by spec
   - Annotations by endpoint
   - Partner activity

2. Add indexes:
   
   Update prisma/schema.prisma:
   
   ```prisma
   model Trace {
     // ... existing fields
     
     @@index([projectId, createdAt])
     @@index([partnerProjectId, createdAt])
     @@index([endpoint, statusCode])
   }
   
   model Annotation {
     @@index([specId, path, method])
     @@index([errorCodes])
   }
   
   // ... other models
   ```

3. Add connection pooling:
   - Configure for serverless
   - Use pgbouncer or Prisma Data Proxy

4. Add query logging:
   - Log slow queries (>100ms)
   - Alert on query patterns

EXPECTED OUTPUT:
- Index additions in schema
- Connection pooling configuration
- Query logging setup
- Migration file
```

---

### PROD.4: Health Check Endpoints

```
CONTEXT:
Production deployment needs health check endpoints.

TASK:
1. Create health check endpoint:
   
   File: apps/web/app/api/health/route.ts
   
   Checks:
   - Database connectivity
   - Redis connectivity (if used)
   - External service status
   
   Response:
   ```json
   {
     "status": "healthy",
     "version": "1.0.0",
     "checks": {
       "database": "ok",
       "redis": "ok"
     },
     "timestamp": "2024-01-01T00:00:00Z"
   }
   ```

2. Create readiness endpoint:
   
   File: apps/web/app/api/ready/route.ts
   
   - Check app is ready to receive traffic
   - Used by load balancer

3. Create metrics endpoint (optional):
   
   File: apps/web/app/api/metrics/route.ts
   
   - Prometheus format
   - Request counts
   - Latency histograms
   - Error rates

EXPECTED OUTPUT:
- Health check endpoint
- Readiness endpoint
- Optional metrics endpoint
```

---

### PROD.5: Environment Variable Validation

```
CONTEXT:
Validate all required environment variables at startup.

TASK:
1. Create env validation:
   
   File: apps/web/lib/env.ts
   
   ```typescript
   import { z } from 'zod';
   
   const envSchema = z.object({
     DATABASE_URL: z.string().url(),
     NEXTAUTH_SECRET: z.string().min(32),
     NEXTAUTH_URL: z.string().url(),
     
     // OAuth (optional in dev)
     GITHUB_CLIENT_ID: z.string().optional(),
     GITHUB_CLIENT_SECRET: z.string().optional(),
     
     // AI
     AI_PROVIDER: z.enum(['anthropic', 'openai']).default('anthropic'),
     ANTHROPIC_API_KEY: z.string().optional(),
     OPENAI_API_KEY: z.string().optional(),
     
     // Email
     RESEND_API_KEY: z.string().optional(),
     
     // Feature flags
     ENABLE_AI_ASSISTANT: z.coerce.boolean().default(true),
     ENABLE_SLACK_INTEGRATION: z.coerce.boolean().default(true),
   });
   
   export const env = envSchema.parse(process.env);
   ```

2. Validate on startup:
   - Import in root layout
   - Fail fast with clear error

3. Create .env.example:
   - Document all variables
   - Include descriptions

4. Add runtime validation:
   - Re-validate on config access
   - Log warnings for missing optional vars

EXPECTED OUTPUT:
- env.ts validation file
- Updated .env.example
- Startup validation
```

---

## Execution Order

For optimal development flow, execute prompts in this order:

### Week 1-2: P0 Foundation
1. P0.1 → P0.2 (Environment model + UI)
2. P0.3 → P0.4 (Test profiles schema + UI)
3. P0.5 (Test runner integration)
4. P0.6 (Trace visibility)

### Week 3-4: P1 Partner Experience
5. P1.1 → P1.2 (Playground)
6. P1.3 → P1.4 → P1.5 (AI Assistant)
7. P1.6 → P1.7 → P1.8 (Annotations)
8. P1.9 (Parameterized tests)

### Week 5-6: P2 Production Features
9. P2.1, P2.2 (Auth + invites)
10. P2.3 (Mock lifecycle)
11. P2.4 (Test insights)
12. P2.5, P2.6, P2.7 (Integrations + settings)

### Week 7: Production Hardening
13. PROD.1 → PROD.5 (All production tasks)

### Week 8+: P3 Enhancements
14. P3.1 → P3.4 (As time permits)

---

## Notes for Claude Code

1. **Always run `pnpm prisma generate` after schema changes**
2. **Run `pnpm prisma migrate dev` to create migrations**
3. **Test tRPC routers manually with the UI before moving on**
4. **Use existing UI components from apps/web/components/ui/**
5. **Follow existing code patterns in the codebase**
6. **Add TypeScript types for all new code**
7. **Update ISSUE_TRACKER.md when completing items**
