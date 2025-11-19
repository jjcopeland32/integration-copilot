#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

function parseArgs(argv) {
  const options = {
    suiteId: process.env.SUITE_ID || process.env.SUITE || 'PAYMENTS_BASELINE_v1',
    envKey: process.env.SUITE_ENV_KEY || process.env.ENV_KEY || 'MOCK',
    baseUrl:
      process.env.COPILOT_BASE_URL ||
      process.env.APP_URL ||
      'http://localhost:3000',
    saveArtifacts: Boolean(process.env.SAVE_ARTIFACTS),
    artifactDir: process.env.ARTIFACT_DIR || path.join(process.cwd(), '.artifacts/testruns'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const [flag, inlineValue] = arg.split('=');
    const nextValue = inlineValue ?? argv[i + 1];
    const consumeNext = inlineValue === undefined && nextValue !== undefined && !nextValue.startsWith('--');

    const assign = (setter) => {
      if (nextValue === undefined) return;
      setter(nextValue);
    };

    switch (flag) {
      case '--suite':
      case '--suiteId':
      case '--suite-id':
        assign((value) => {
          options.suiteId = value;
        });
        break;
      case '--env':
      case '--envKey':
        assign((value) => {
          options.envKey = value.toUpperCase();
        });
        break;
      case '--origin':
      case '--base':
      case '--base-url':
        assign((value) => {
          options.baseUrl = value;
        });
        break;
      case '--saveArtifacts':
        options.saveArtifacts = true;
        break;
      case '--artifactDir':
        assign((value) => {
          options.artifactDir = value;
        });
        break;
      default:
        break;
    }

    if (consumeNext && inlineValue === undefined) {
      i += 1;
    }
  }

  return options;
}

async function saveArtifactsIfNeeded(result, artifactDir) {
  await fs.mkdir(artifactDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(artifactDir, `${timestamp}.json`);
  await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`[suite] Artifacts written to ${filePath}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.suiteId) {
    throw new Error('Suite ID is required');
  }

  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const endpoint = `${baseUrl}/api/tests/run`;
  console.log(`[suite] Requesting ${endpoint} (suite=${options.suiteId}, env=${options.envKey})`);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ suiteId: options.suiteId, envKey: options.envKey }),
    });
  } catch (error) {
    throw new Error(`Failed to reach ${endpoint}: ${error.message}`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Non-JSON response from ${endpoint} (status ${response.status})`);
  }

  if (!response.ok) {
    throw new Error(`Suite run failed (${response.status}): ${payload?.error || 'Unknown error'}`);
  }
  if (!payload?.ok) {
    throw new Error(`Suite run returned error: ${payload?.error || 'Unknown error'}`);
  }

  const summary = payload.result?.summary;
  if (summary) {
    console.log(`[suite] ${summary.passed}/${summary.total} passed in ${summary.durationMs ?? 'n/a'}ms`);
  } else {
    console.log('[suite] Suite completed');
  }

  if (options.saveArtifacts && payload.result) {
    await saveArtifactsIfNeeded(payload.result, options.artifactDir);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
