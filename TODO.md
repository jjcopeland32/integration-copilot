# Integration Copilot – TODO / Priorities

## 1. Mock Lifecycle & Cleanup
- Reuse/reserve ports per spec to prevent runaway listeners
- Display health/uptime metadata for each running mock
- Surface active mock count + controls on dashboard

## 2. Golden Test Insights
- Provide download links or modal views for failure logs
- Attach failing cases to related plan items + readiness evidence
- Allow exporting suite runs as artifacts

## 3. Plan Board & Scope Configuration
- Let projects enable/disable phases (e.g., optional webhooks/UAT)
- Capture required UAT scenarios & performance benchmarks per project
- Reflect manual evidence uploads alongside telemetry-driven updates

## 4. Telemetry & Reporting
- Replace placeholder dashboard metrics with real aggregates
- Enable readiness report signing/download workflows
- Add per-phase/status summaries to `/reports` list cards

## 5. SDK & Spec Automation
- Accept SDK/webhook-delivered OpenAPI updates per project
- Refresh mocks/tests automatically when a spec changes
- Alert on spec drift between versions

## 6. AI & UX Enhancements
- Add an AI assistant that summarizes test/plan/report status per project
- Provide troubleshooting suggestions when suites fail (based on traces)
- Improve in-app guidance (empty states, contextual tips, toasts)
