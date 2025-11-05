// tools/seed.ts
// Minimal seed script to create demo org/project/spec, generate a blueprint, mock, and tests.
// Run with: pnpm ts-node tools/seed.ts  (after wiring Prisma & server actions)
// This file is illustrative; adapt calls to your actual server actions / tRPC router.

import 'dotenv/config';

async function main() {
  console.log('Seeding demo data…');
  // Pseudo-interfaces to illustrate the flow; replace with your actual imports.
  const api = {
    orgCreate: async (name: string) => ({ id: 'org_demo' }),
    projectCreate: async (orgId: string, name: string) => ({ id: 'proj_demo' }),
    specImport: async (projectId: string, url: string) => ({ specId: 'spec_demo', version:'1.0.0' }),
    blueprintGen: async (projectId: string, specId: string) => ({ blueprintId: 'bp_demo', markdownUrl: '/docs/bp_demo.md' }),
    mockCreate: async (projectId: string, specId: string) => ({ mockId: 'mock_demo', baseUrl: 'https://mock.local/demo' }),
    testsGenerate: async (projectId: string, playbook: string) => ({ suiteId: 'suite_demo' }),
    testsRun: async (suiteId: string) => ({ runId: 'run_demo', pass: true }),
    reportGenerate: async (projectId: string) => ({ reportId: 'report_demo', url: '/reports/report_demo.pdf' }),
  };

  const org = await api.orgCreate('Demo Org');
  const project = await api.projectCreate(org.id, 'Demo Payments Integration');
  const spec = await api.specImport(project.id, 'https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/examples/v3.0/petstore.yaml');
  const bp = await api.blueprintGen(project.id, spec.specId);
  const mock = await api.mockCreate(project.id, spec.specId);
  const suite = await api.testsGenerate(project.id, 'PAYMENTS_BASELINE');
  const run = await api.testsRun(suite.suiteId);
  const report = await api.reportGenerate(project.id);

  console.log('Seed complete:', { org, project, spec, bp, mock, suite, run, report });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
