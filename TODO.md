# Integration Copilot – TODO / Priorities

## 1. Mock Lifecycle & Cleanup
- Add delete/reset actions for `MockInstance`s (UI + tRPC)
- Reuse/reserve ports per spec to prevent runaway listeners
- Display health/uptime metadata for each running mock

## 2. Golden Test Insights
- Persist per-case results/artifacts and surface them in `/tests`
- Provide download links or modal views for failure logs
- Attach failing cases to related plan items + readiness evidence

## 3. Telemetry & Evidence Loop
- Emit trace rows automatically for mock/test traffic
- Auto-advance `PlanItem` status when criteria are met
- Recompute readiness metrics (pass rate, risks) after each run

## 4. Dashboard & Reporting
- Replace placeholder dashboard metrics with real aggregates
- Enable readiness report signing/download workflows
- Surface recent mock/test activity on the dashboard

## 5. Spec & SDK Automation
- Accept SDK/webhook-delivered OpenAPI updates per project
- Refresh mocks/tests automatically when a spec changes
- Alert on spec drift between versions

## 6. Polish & Observability
- Add toast/notification system for long-running actions
- Wire up structured logging + monitoring for mocks/tests
- Improve error messaging when suites fail (link to artifacts)
