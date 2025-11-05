# API Contracts (tRPC-style surface; REST equivalents in parentheses)

## spec.import (POST /api/spec/import)
- Input: { projectId: string, source: 'url' | 'file', url?: string, fileId?: string }
- Output: { specId: string, kind: 'OPENAPI'|'ASYNCAPI'|'JSON_SCHEMA', version: string }

## blueprint.generate (POST /api/blueprint/generate)
- Input: { projectId: string, specId: string, scope: { endpoints?: string[], webhooks?: string[], rules?: Record<string, any> } }
- Output: { blueprintId: string, markdownUrl: string, version: string }

## mock.create (POST /api/mock/create)
- Input: { projectId: string, specId: string, config?: { latencyMs?: number, errorRate?: number } }
- Output: { mockId: string, baseUrl: string }

## tests.generate (POST /api/tests/generate)
- Input: { projectId: string, playbook: 'PAYMENTS_BASELINE'|'FINANCING_BASELINE'|'CUSTOM', options?: any }
- Output: { suiteId: string, cases: TestCase[] }

## tests.run (POST /api/tests/run)
- Input: { suiteId: string, actor: 'VENDOR'|'PARTNER', env?: string }
- Output: { runId: string, pass: boolean, summary: any }

## trace.ingest (POST /api/trace)
- Input: Signed payload { projectId, requestMeta, responseMeta, verdict }
- Output: { ok: true }

## plan.upsert (POST /api/plan/upsert)
- Input: { projectId, items: PlanItemInput[] }
- Output: { ok: true }

## plan.evidence.add (POST /api/plan/evidence)
- Input: { projectId, itemId, evidence: { type: 'screenshot'|'log'|'doc', url, meta? } }
- Output: { ok: true }

## report.generate (POST /api/report/generate)
- Input: { projectId, kind: 'READINESS'|'MIGRATION' }
- Output: { reportId: string, url: string }
